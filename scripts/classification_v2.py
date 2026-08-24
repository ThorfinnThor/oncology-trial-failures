#!/usr/bin/env python3
"""Conservative, evidence-bearing semantic classifier for trial stop reasons.

V2 separates the semantic outcome from the causal reason.  It deliberately
routes mixed, non-failure, content-free, and novel language to review instead
of forcing every stopped study into a single failure bucket.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple


CLASSIFIER_VERSION = "2.1.0"

OUTCOME_BIOLOGICAL = "BIOLOGICAL_FAILURE"
OUTCOME_NON_BIOLOGICAL = "NON_BIOLOGICAL"
OUTCOME_MIXED = "MIXED_CAUSES"
OUTCOME_NON_FAILURE = "NON_FAILURE_TRANSITION"
OUTCOME_UNKNOWN = "UNKNOWN"

REASON_EFFICACY = "EFFICACY_FUTILITY"
REASON_SAFETY = "SAFETY"
REASON_BIO_UNSPECIFIED = "BIOLOGICAL_UNSPECIFIED"
REASON_REGULATORY = "REGULATORY"
REASON_RECRUITMENT = "RECRUITMENT"
REASON_FUNDING = "FUNDING"
REASON_SUPPLY = "SUPPLY_MANUFACTURING"
REASON_STAFFING = "STAFFING_RESOURCES"
REASON_BUSINESS = "BUSINESS_STRATEGY"
REASON_PROTOCOL = "PROTOCOL_FEASIBILITY"
REASON_SUPPORT = "SUPPORT_WITHDRAWAL"
REASON_EXTERNAL = "EXTERNAL_DISRUPTION"
REASON_OPERATIONAL_OTHER = "OPERATIONAL_OTHER"
REASON_PLANNED = "PLANNED_MILESTONE"
REASON_REPLACEMENT = "REPLACEMENT_TRANSITION"
REASON_NOT_INITIATED = "NOT_INITIATED"
REASON_UNSPECIFIED = "UNSPECIFIED"
REASON_MULTIPLE = "MULTIPLE"

BIOLOGICAL_REASONS = {REASON_EFFICACY, REASON_SAFETY, REASON_BIO_UNSPECIFIED}
OPERATIONAL_REASONS = {
    REASON_RECRUITMENT,
    REASON_FUNDING,
    REASON_SUPPLY,
    REASON_STAFFING,
    REASON_BUSINESS,
    REASON_PROTOCOL,
    REASON_SUPPORT,
    REASON_EXTERNAL,
    REASON_OPERATIONAL_OTHER,
}


@dataclass(frozen=True)
class Evidence:
    rule_id: str
    reason: str
    quote: str
    confidence: str


@dataclass(frozen=True)
class ClassificationV2:
    outcome: str
    primary_reason: str
    secondary_reasons: Tuple[str, ...]
    confidence: str
    needs_review: bool
    evidence: Tuple[Evidence, ...]
    normalized_text_hash: str
    version: str = CLASSIFIER_VERSION

    @property
    def legacy_label(self) -> str:
        if self.needs_review:
            return "UNCLEAR"
        if self.outcome == OUTCOME_BIOLOGICAL:
            return "BIOLOGICAL_FAILURE"
        if self.outcome == OUTCOME_NON_BIOLOGICAL:
            return "NON_BIOLOGICAL"
        return "UNCLEAR"

    @property
    def legacy_reason(self) -> str:
        if self.needs_review:
            return "OTHER/UNKNOWN"
        if self.primary_reason == REASON_EFFICACY:
            return "EFFICACY/FUTILITY"
        if self.primary_reason == REASON_SAFETY:
            return "SAFETY"
        if self.primary_reason == REASON_REGULATORY:
            return "REGULATORY"
        if self.primary_reason in OPERATIONAL_REASONS:
            return "OPERATIONAL"
        return "OTHER/UNKNOWN"

    def evidence_string(self) -> str:
        parts = [
            f"v={self.version}",
            f"outcome={self.outcome}",
            f"primary={self.primary_reason}",
        ]
        if self.secondary_reasons:
            parts.append("secondary=" + "|".join(self.secondary_reasons))
        for item in self.evidence[:12]:
            quote = " ".join(item.quote.split())[:180]
            parts.append(f"{item.rule_id}:{quote}")
        return ";".join(parts)[:2000]

    def as_record_fields(self) -> Dict[str, object]:
        return {
            "classification_label": self.legacy_label,
            "classification_reason": self.legacy_reason,
            "classification_confidence": self.confidence,
            "classification_evidence": self.evidence_string(),
            "classification_outcome_v2": self.outcome,
            "classification_primary_reason_v2": self.primary_reason,
            "classification_secondary_reasons_v2": "; ".join(self.secondary_reasons),
            "classification_needs_review": self.needs_review,
            "classification_version": self.version,
            "classification_text_hash": self.normalized_text_hash,
        }


@dataclass(frozen=True)
class Rule:
    rule_id: str
    reason: str
    confidence: str
    patterns: Tuple[str, ...]


def normalize_reason(text: Optional[str]) -> str:
    value = unicodedata.normalize("NFKC", str(text or "")).lower()
    value = value.replace("’", "'").replace("–", "-").replace("—", "-")
    # ClinicalTrials.gov exports occasionally contain Markdown-style escapes
    # (for example ``R\&D`` or ``\<75%``).  They are presentation artifacts,
    # not semantic content.
    value = re.sub(r"\\([&<>])", r"\1", value)
    value = re.sub(r"https?://\S+", " <url> ", value)
    value = re.sub(r"\bNCT\d{8}\b", " <nct> ", value, flags=re.IGNORECASE)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:20]


def load_reviewed_reason_index(path: str) -> Dict[str, Dict[str, Any]]:
    file_path = Path(path)
    if not file_path.exists():
        return {}
    payload = json.loads(file_path.read_text(encoding="utf-8"))
    entries = payload.get("entries", {}) if isinstance(payload, dict) else {}
    if not isinstance(entries, dict):
        raise ValueError(f"Invalid reviewed reason index: {path}")
    return entries


def classification_source(result: ClassificationV2) -> str:
    """Return the provenance label persisted with a V2 classification."""

    rule_ids = {item.rule_id for item in result.evidence}
    if "reviewed.exact_reason" in rule_ids:
        return "REVIEWED_EXACT"
    if "source.description_fallback" in rule_ids:
        return "DESCRIPTION_FALLBACK"
    if result.evidence:
        return "RULE_V2"
    return "UNCLASSIFIED"


def _from_reviewed_entry(
    digest: str,
    entry: Mapping[str, Any],
) -> ClassificationV2:
    outcome = str(entry.get("outcome") or OUTCOME_UNKNOWN)
    primary = str(entry.get("primary_reason") or REASON_UNSPECIFIED)
    secondary = tuple(str(value) for value in entry.get("secondary_reasons", []) if value)
    evidence = (
        Evidence(
            "reviewed.exact_reason",
            primary,
            str(entry.get("example_text") or "Reviewed normalized stop reason"),
            "HIGH",
        ),
    )
    return ClassificationV2(
        outcome,
        primary,
        secondary,
        "LOW" if entry.get("needs_review") else "HIGH",
        bool(entry.get("needs_review")),
        evidence,
        digest,
    )


def _rule(rule_id: str, reason: str, confidence: str, *patterns: str) -> Rule:
    return Rule(rule_id, reason, confidence, tuple(patterns))


@lru_cache(maxsize=None)
def _compiled_pattern(pattern: str) -> re.Pattern[str]:
    """Compile each semantic rule once for the lifetime of the process.

    V2 deliberately uses many narrow patterns instead of a few broad ones.
    Their total now exceeds Python's small global regex cache, so relying on
    ``re.finditer`` with raw strings repeatedly recompiles patterns during a
    full snapshot audit.
    """

    return re.compile(pattern, flags=re.IGNORECASE | re.DOTALL)


RULES: Tuple[Rule, ...] = (
    # Direct negative efficacy / futility evidence.  Interim analysis alone is
    # intentionally absent: the adverse result and dimension must be explicit.
    _rule("eff.futility", REASON_EFFICACY, "HIGH", r"\bfutil(?:ity|e)\b", r"\bfutility boundary\b"),
    _rule(
        "eff.explicit_lack",
        REASON_EFFICACY,
        "HIGH",
        r"\black of (?:clinical |meaningful |sufficient |expected |anti[- ]?(?:tumou?r|cancer) )?(?:efficacy|effectiveness|activity|benefit|response)\b",
        r"\binsufficient (?:clinical |anti[- ]?tumou?r )?(?:efficacy|activity|benefit|response)\b",
        r"\bno (?:meaningful |clinical |anti[- ]?tumou?r )?(?:efficacy|activity|benefit|response|treatment effect)\b",
        r"\blimited (?:clinical |anti[- ]?(?:tumou?r|cancer) )?(?:efficacy|activity|benefit)\b",
        r"\bmodest (?:clinical |anti[- ]?(?:tumou?r|cancer) )?(?:efficacy|activity|benefit)\b",
        r"\bnot providing efficacy\b",
        r"\babsence of (?:clinically significant )?(?:efficacy|activity|benefit|response)\b",
        r"\bno evidence of (?:potential |clinical )?efficacy\b",
        r"\bno evidence for (?:potential |clinical )?efficacy\b",
        r"\black of (?:evidence of )?(?:clinical )?benefit\b",
        r"\bno objective response\b",
        r"\black of objective response\b",
        r"\bpoor response to treatment\b",
        r"\blimited (?:anti[- ]?tumou?r )?activity\b",
        r"\black of improved efficacy\b",
        r"\bbenefit (?:was |is )?not significant\b",
        r"^(?:due to )?efficacy concerns?\.?$",
        r"\bnegative results? from (?:an? |the |other )?(?:\d+ )?(?:study|studies|trial|trials)\b",
    ),
    _rule(
        "eff.endpoint_failure",
        REASON_EFFICACY,
        "HIGH",
        r"\b(?:primary |secondary )?end[- ]?point(?:s)? (?:was |were )?(?:not met|failed|not achieved|not reached)\b",
        r"\b(?:primary |secondary )?end[- ]?point of [^.]{0,100} (?:was |were )?(?:not met|failed|not achieved|not reached)\b",
        r"\b(?:did not|failed to) meet (?:the )?(?:primary |secondary )?end[- ]?point\b",
        r"\bfailed (?:its |the )?(?:primary |secondary )?(?:efficacy )?objective\b",
        r"\b(?:primary |secondary )?objectives? (?:was |were )?(?:not met|failed|not achieved|not reached)\b",
        r"\b(?:study |trial )?did not meet (?:its |the )?(?:primary |secondary )?(?:efficacy )?end[- ]?point\b",
        r"\bunmet (?:primary |secondary )?end[- ]?point\b",
        r"\bfailure to meet (?:its |the )?(?:primary |secondary )?(?:efficacy )?end[- ]?point\b",
        r"\bcriteria for (?:the )?(?:second|next) stage (?:were )?not met\b",
        r"\bcriteria (?:were )?not met for (?:the )?(?:second|next) stage\b",
        r"\bcontinuation criteri(?:a|on) (?:were |was )?not met\b.{0,80}\b(?:efficacy|response|activity|endpoint)\b",
    ),
    _rule(
        "eff.negative_outcome",
        REASON_EFFICACY,
        "MEDIUM",
        r"\bnegative efficacy (?:result|results|outcome|outcomes)\b",
        r"\b(?:did not|failed to) improve (?:pfs|os|survival|response|outcome|outcomes)\b",
        r"\bno (?:statistically )?significant (?:difference|improvement)\b",
        r"\blow probability of (?:meeting|achieving) (?:the )?(?:primary )?end[- ]?point\b",
        r"\bprobability of (?:less than |below )?\d+(?:\.\d+)?%? of (?:meeting|achieving) (?:the )?(?:primary )?end[- ]?point\b",
        r"\bunlikely to (?:meet|achieve) (?:the )?(?:primary )?(?:efficacy )?end[- ]?point\b",
        r"\blow likelihood of (?:meeting|achieving) (?:the )?(?:primary )?(?:efficacy )?(?:end[- ]?point|objective)\b",
        r"\bno signal of (?:clinical )?(?:efficacy|activity)\b",
        r"\btarget engagement (?:did |was )?not translat(?:e|ed) (?:into|to) (?:meaningful )?(?:clinical )?(?:benefit|activity|response)\b",
        r"\b(?:overall )?clinical activity\b.{0,80}\b(?:minimal|insufficient|limited)\b",
        r"\b(?:minimal|insufficient|limited) (?:overall )?clinical activity\b",
        r"\b(?:terminated|stopped|discontinued) (?:based on|following) (?:the )?(?:phase [1234] )?efficacy (?:data|results)\b",
        r"\bdecision to (?:stop|terminate|discontinue) (?:the )?(?:study|trial|program|programme|development) (?:was )?based on (?:the )?(?:phase [1234] )?efficacy (?:data|results)\b",
        r"^(?:lack of )?efficacy\.?$",
        r"\b(?:drug|treatment|intervention|therapy|evidence) (?:was |is )?not effective (?:against|for|in)\b",
        r"\bsufficient evidence of efficacy (?:was )?not met\b",
        r"\b(?:preliminary )?(?:effectiveness|efficacy) data\b.{0,80}\b(?:did not meet|failed to meet) (?:the )?expectations?\b",
        r"\bstopped due to efficacy reasons?\b",
        r"\blow efficacy\b",
        r"\blower than (?:estimated|expected|anticipated) efficacy\b",
        r"\blow likelihood of achieving (?:the )?targeted efficacy\b",
        r"\b(?:did not|didn't|failed to) reach (?:our |the )?(?:primary |secondary )?end[- ]?point\b",
        r"\b(?:study|trial|treatment|program|programme) did not meet (?:the |its )?efficacy objective\b",
        r"\bfailed to show (?:a |any )?(?:clinical |meaningful )?benefit\b",
        r"\bno substantial anti[- ]?tumou?r activity\b",
        r"\black of robust efficacy\b",
        r"\befficacy\b[^.;:]{0,80}\binferior to (?:the )?expected\b",
        r"\b(?:stage [12] )?efficacy criteria (?:were |was )?not met\b",
        r"\b(?:response|activity) criteria (?:were |was )?not met\b",
        r"\bno patients? (?:having|had|showed|showing) (?:a )?significant reduction in disease\b",
        r"\b(?:non[- ]?satisfactory|unsatisfactory) clinical benefit\b",
        r"\bsignal finding\b[^.;:]{0,100}\bdid not meet (?:the )?pre[- ]?specified criteria\b",
        r"\bno (?:pr|cr|partial response|complete response)(?:/| or | and )(?:pr|cr|partial response|complete response)? (?:was |were )?observed\b",
        r"\black of demonstrated clinical activity\b",
        r"\b(?:has |had )?not shown (?:its |the )?expected therapeutic potential\b",
        r"\bdata (?:collected )?(?:did not|does not|do not) support (?:the )?(?:study )?end[- ]?points?\b",
        r"\bsignals? (?:was |were )?insufficiently compelling\b.{0,100}\bjustify continuation\b",
        r"\black of (?:a )?sufficient therapeutic effect\b",
        r"^failed treatment response\.?$",
        r"^treatment ineffective\.?$",
        r"\b(?:did|does) not reveal (?:any )?(?:statistically )?significant difference\b",
        r"\bdid not fulfill (?:the )?criteria (?:set )?for moving into (?:the )?(?:randomi[sz]ed|next|phase [123])\b",
        r"\b(?:treatment|drug|intervention|regimen) (?:was |is )?potentially inferior to\b",
        r"\befficacy (?:did |does )?not meet (?:the )?continuance criteria\b",
        r"\befficacy (?:did |does )?not reach (?:the )?pre[- ]?set\b",
        r"\bno significant clinical benefit\b",
        r"\bresponse outcomes?\b[^.;:]{0,80}\bdid not support continuation\b",
        r"\babsence of (?:an? )?immunological response\b",
        r"\blower (?:anti[- ]?)?tumou?r activity than expected\b",
        r"\bhypothesis\b[^.;:]{0,100}\bwould not be confirmed\b",
        r"\blow likelihood of efficacy\b",
        r"\bobserved response rate (?:did |does )?not meet (?:the )?(?:predefined |prespecified )?threshold\b",
        r"\bunlikely to achieve (?:the )?primary objective\b",
        r"\bno significant differences? in (?:median )?(?:pfs|os|progression[- ]free survival|overall survival)\b",
        r"\b(?:terminated|stopped|discontinued) (?:based on|following) (?:a )?(?:review of )?(?:the )?(?:phase [1234] )?efficacy (?:data|results)\b",
        r"\b(?:non[- ]?response|lack of response) to (?:the )?treatment\b",
        r"\b(?:missed|fell short of) (?:its |the )?(?:primary |secondary )?end[- ]?point\b",
        r"\b(?:primary |secondary )?end[- ]?point did not reach (?:statistical )?significance\b",
        r"\black of (?:an? )?emerging benefit\b",
        r"\black of perceived clinical activity\b",
        r"\b(?:preliminary )?analysis\b[^.;:]{0,100}\bfailed to demonstrate (?:any )?signal of activity\b",
        r"\bresponse rate\b[^.;:]{0,100}\bdid not merit further evaluation\b",
        r"\b(?:drug|treatment|intervention|compound) did not show (?:clinical |meaningful )?activity\b",
        r"\bdid not show (?:a |any )?(?:statistically |clinically )?significant benefit\b",
        r"\bno evidence (?:was )?demonstrated of [^.]{0,100}\bactivity\b",
        r"\black of (?:clinically )?meaningful benefit\b",
        r"\black of (?:study |drug |treatment )?efficacy\b",
        r"\b(?:terminated|stopped|discontinued) based on (?:new )?efficacy data from (?:an?|the|another|other) study\b",
        r"\bdid not provide sufficient efficacy to warrant continuation\b",
        r"\bdid not meet (?:the |its )?(?:primary |secondary )?efficacy objective\b",
        r"\b(?:study|trial|studies|trials) failed to meet (?:their |its |the )?(?:primary |secondary )?objectives?\b",
        r"\bdid not reach (?:the )?expected results? of (?:the )?clinical trial\b",
        r"\b(?:treatment|drug|intervention) (?:will |would |was |is )?not (?:be )?more efficacious than (?:its |the )?comparator\b",
        r"\bnot meeting (?:the |its )?(?:primary |secondary )?end[- ]?point\b",
        r"\bunlikely to achieve (?:its |the )?primary objective\b",
        r"\bdid not meet (?:the )?(?:response|activity) criteria to proceed to (?:the )?(?:stage|phase) [123]\b",
        r"\bdid not meet (?:the )?criteria for continuation after (?:an? )?interim analysis\b",
        r"\befficacy\b[^.;:]{0,80}\b(?:was |is )?less than anticipated\b",
        r"\bno additional benefit (?:was |is )?(?:noted|observed|identified)\b",
        r"\binterim analyses? showed no benefits?\b",
        r"\bdata (?:did|does) not demonstrate (?:a )?clear benefit\b",
        r"\black of substantial evidence for (?:an? )?immune responses?\b",
        r"\bdid not result in sufficient efficacy\b",
        r"\black of significant monotherapy activity\b",
        r"\bhigh rate of disease progression\b",
        r"\blittle evidence of clinical activity\b",
        r"\babsence of significant therapeutic benefit\b",
        r"\bpatient population did not benefit from\b",
        r"\bpredictive probability (?:was )?below \d+(?:\.\d+)?%? for (?:the )?(?:pre[- ]?specified )?end[- ]?point\b",
        r"\black of therapeutic effect\b",
        r"\bbiological activity (?:was |is )?very limited\b",
        r"\befficacy results? (?:were |was )?not in alignment with (?:the )?(?:initially )?set expectations?\b",
        r"\blow likelihood of achieving superiority in (?:the )?efficacy end[- ]?points?\b",
        r"\bno anticipated benefit\b",
        r"^not meeting expected end[- ]?points?\.?$",
        r"\bno expected efficacy (?:was |is )?observed\b",
        r"\boverall clinical benefit\b[^.;:]{0,40}\b(?:was |is )?limited\b",
        r"\b(?:primary |secondary )?end[- ]?point did not meet expectations?\b",
        r"\befficacy (?:was |is )?not evident\b",
        r"\bno signs? of efficacy\b",
        r"^insufficient effectiveness\.?$",
        r"\bno clear benefit (?:of|from|for)\b",
        r"\bpoor efficacy\b",
        r"\bdid not provide (?:a )?positive outcome\b",
        r"\bno obvious advantage compared with\b",
        r"\b(?:response|responses)\b[^.;:]{0,80}\bdid not occur\b",
        r"\btreatment efficacy (?:was |is )?not satisfactory\b",
        r"\black of sufficient clinical benefit\b",
        r"\bdid not meet (?:the )?efficacy end[- ]?point\b",
        r"\black of effect (?:at|in|after) (?:an? )?interim analysis\b",
        r"\bno evidence of promise\b",
        r"\b(?:primary |secondary )?end[- ]?point could no longer be reached\b",
        r"\black of survival benefit\b",
        r"\bno objective responses? (?:were |was )?observed\b",
        r"\bfutilty of (?:the )?(?:treatment|drug|intervention)\b",
        r"\b(?:effect|efficacy)\b[^.;:]{0,80}\bnot as good as (?:pre[- ]?)?expected\b",
        r"\bfailed to demonstrate (?:an? )?improvement in (?:any )?(?:biologic|biological|clinical) end[- ]?point\b",
        r"^negatives? results?\.?$",
        r"\b(?:preliminary )?efficacy\b[^.;:]{0,80}\bnot sufficient to warrant further development\b",
        r"\bmarginal anti[- ]?tumou?r activity\b[^.;:]{0,100}\bnot supporting further development\b",
        r"\bmarginal anti[- ]?tumou?r activity\b[^.;:]{0,100}\bdid not support further development\b",
        r"\black of (?:a )?clinical efficacy signal\b",
        r"\bfailed to demonstrate (?:a )?benefit as (?:an? )?adjunctive treatment\b",
        r"\b(?:level|magnitude) of benefit observed did not justify (?:further )?(?:enrolling|enrolment|enrollment|recruitment|dosing)\b",
        r"\b(?:study|trial) was unlikely to attain (?:a )?positive outcome for (?:the )?efficacy analysis\b",
        r"\binsufficient evidence of efficacy\b",
        r"\b(?:parent|registration) (?:study|studies|trial|trials) did not meet (?:the |their )?(?:primary |secondary )?end[- ]?points?\b",
        r"\bdid not meet (?:the )?(?:primary|secondary)(?:/| or )(?:primary|secondary) end[- ]?points?\b",
        r"\binterim analysis showed no (?:statistical )?significance\b",
        r"\binterim analysis showed (?:that there (?:was|is) )?no difference in (?:the )?primary end[- ]?point\b",
        r"\binterim analysis showed no difference between (?:the )?groups\b",
        r"\binterim analysis showed no (?:survival |clinical )?benefit\b",
        r"\binterim analysis showed (?:that )?(?:the )?(?:study|trial) (?:will|would) not meet (?:the )?(?:interim |primary |secondary )?end[- ]?point\b",
        r"\bparent (?:study|trial) failed to show (?:a )?therapeutic effect\b",
        r"\bdid not reach (?:the )?targeted efficacy level\b",
        r"\b(?:interim )?data analysis showed no effect between (?:the )?treatment groups\b",
        r"\banalysis indicated no difference between (?:the )?(?:placebo|control) and\b",
        r"\bdid not demonstrate (?:a )?meaningful clinical benefit\b",
        r"\bno clear therapeutic effect\b",
        r"\b(?:higher|increased) rate of virological failures?\b",
        r"\b(?:similar|no different) responses? in (?:the )?(?:two|both) arms?\b",
        r"\bdose[- ]finding\b[^.;:]{0,100}\bdid not support further evaluation of (?:efficacy|effectiveness|activity)\b",
    ),

    # Direct adverse safety evidence.  Review/monitoring vocabulary and a bare
    # committee name are deliberately not rules.
    _rule(
        "saf.toxicity",
        REASON_SAFETY,
        "HIGH",
        r"\bunacceptable (?:toxicity|toxicities|tolerability|safety risk)\b",
        r"\bexcessive (?:toxicity|toxicities|adverse events?|infection rate)\b",
        r"\btoo much toxicity\b",
        r"\btoxicity stopping rules? (?:were |was )?(?:met|crossed)\b",
        r"\b(?:due to|because of|following|after observing|experienced|observed|occurrence of|high rate of)\b.{0,45}\bdose[- ]limiting toxicit(?:y|ies)\b",
        r"\b(?:due to|because of|following|after observing|experienced|observed|occurrence of|high rate of)\b.{0,45}\bdlts?\b",
        r"^(?:dose[- ]limiting toxicit(?:y|ies)|dlts?)\.?$",
        r"\bnot tolerable\b",
        r"\bnot well tolerated\b",
        r"\black of tolerability\b",
    ),
    _rule(
        "saf.adverse_events",
        REASON_SAFETY,
        "HIGH",
        r"\b(?:serious |severe |treatment[- ]related )?adverse events?\b",
        r"\btreatment[- ]related deaths?\b",
        r"\bdrug[- ]induced liver injury\b",
        r"\bcarcinogenicity (?:finding|findings|signal|signals)\b",
        r"\bhigh incidence of [^.]{0,100}(?:disease|injury|toxicity|events?)\b",
        r"\bside effects?\b",
        r"\b(?:significant|severe|serious|high|unexpected) (?:toxicity|toxicities)\b",
        r"\b(?:due to|because of|following|after|for) (?:the )?(?:observed )?(?:toxicity|toxicities)\b",
        r"\b(?:toxicity|toxicities) concerns?\b",
        r"^(?:toxicity|toxicities)\.?$",
        r"^(?:toxicity|toxicities) and lack of efficacy\b",
        r"\b(?:significant |severe |serious )?adverse effects?\b",
        r"\black of safety\b",
        r"\b(?:increased|higher) (?:rate|incidence) of (?:local )?injection[- ]site reactions?\b",
        r"\b(?:increased|higher) incidence of cardiovascular events?\b",
        r"\b(?:long[- ]term )?animal toxicology findings?\b",
        r"\bintervention appeared to be associated with increased [^.]{0,80}\b",
        r"\b(?:observation|observations) of pericardial effusions?\b",
        r"\binterim analysis showing safety concerns?\b",
        r"\bincidence of (?:adverse events?|aes?) (?:was |is )?higher than\b",
        r"\b(?:a )?number of known toxicities (?:were )?observed\b",
        r"\btolerabil(?:it|t)y challenges? of (?:the )?(?:combination|treatment|drug|intervention)\b",
    ),
    _rule(
        "saf.explicit",
        REASON_SAFETY,
        "HIGH",
        r"^(?:due to )?safety(?: reasons?| concerns?| issues?)?\.?$",
        r"\b(?:terminated|stopped|halted|suspended|withdrawn|closed) (?:early )?(?:due to|because of|for) (?:an? )?(?:safety concern|safety concerns|safety issue|safety issues|safety reasons?)\b",
        r"\b(?:safety concern|safety concerns|safety issue|safety issues) (?:caused|prompted|led to|resulted in)\b",
        r"\bbecause of (?:the )?(?:safety concern|safety concerns|safety issue|safety issues)\b",
        r"\bbecause of [^.]{0,80}\b(?:safety concern|safety concerns|safety issue|safety issues)\b",
        r"^(?:new )?safety (?:information|concern|concerns|issue|issues|reason|reasons)?\.?$",
        r"\b(?:idmc|dsmb|dmc) recommendation (?:for|due to|because of) safety concerns?\b",
        r"\bsafety (?:issue|issues|concern|concerns)\b.{0,80}\b(?:contribut(?:e|ed|ing)|factor(?:ed)?|prompted|led)\b",
        r"^(?:ae|aes|sae|saes)\.?$",
        r"\b(?:a |the )?safety signal (?:has |had )?(?:emerged|arisen|been identified|been observed)\b",
        r"\bdue to safety findings?\b",
        r"\b(?:protocol )?(?:stopping|halting) criteri(?:a|on) \(?(?:for )?safety\)? (?:were |was )?met\b",
        r"\breactogenicity (?:has )?met (?:the )?(?:study )?halting criteri(?:a|on)\b",
        r"\b(?:terminated|stopped|halted) (?:early )?due to safety concerns? about\b",
        r"\bterminated based on safety results? from (?:an? |the )?(?:other|another) trial\b",
        r"\bdue to potential concerns? about (?:liver|hepatic) safety\b",
        r"\b(?:elevated|increased) (?:liver )?transaminases\b",
        r"\blimited tolerability\b",
        r"\b(?:fda|regulator|regulatory authority) advised (?:of )?(?:a )?(?:possible |potential )?health risk\b",
        r"\bsafety and tolerability concerns?\b",
        r"\b(?:terminated|stopped|halted|discontinued|closed) (?:early )?due to [^.]{0,100}\band safety concerns?\b",
        r"\b(?:terminated|stopped|halted|discontinued|closed) (?:early )?due to new safety data\b",
        r"\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten) (?:dose[- ]limiting toxicity |dose[- ]limiting toxicities |dlt |dlts )?events? occurred\b",
        r"\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten) dlts? (?:had been |were |was )?reported\b",
        r"\b(?:did not|failed to) identify (?:a )?well[- ]tolerated dose\b",
        r"\bsafety results?\b[^.;:]{0,100}\bled (?:to )?(?:the )?(?:early )?termination\b",
        r"^(?:drug|treatment) toxicity\.?$",
        r"\bsafety related to (?:the )?frequency of\b[^.;:]{0,80}\binfections?\b",
        r"\bincreased (?:sae|serious adverse event) occurrence\b",
        r"\bunexpected sudden death on study\b",
        r"\bsusar\b[^.;:]{0,80}\boccurr(?:ed|ing|ence)\b",
        r"^unanticipated toxicit(?:y|ies)\.?$",
        r"\bhigher incidence of [^.]{0,80}toxicity\b",
        r"\bfindings? in (?:the )?preclinical carcinogenicity studies\b",
        r"\ban? ae of safety concern (?:that )?occurred\b",
        r"\b(?:significant )?increase in (?:the )?incidence of [^.]{0,80}\b(?:sae|saes|serious adverse events?)\b",
        r"\bextreme toxicity\b",
        r"\btemporary closure due to (?:a )?safety concern\b",
        r"\bhigh toxicity risk\b",
        r"\bemerging safety observations?\b",
        r"\bunacceptable (?:level of )?(?:relevant )?treatment[- ]related toxicity\b",
        r"\bunacceptable level of (?:relevant )?toxicities\b",
        r"\burgent safety measures?\b",
        r"\b(?:toxicity|tocit+y) stopping rules? (?:have been |were |was )?met\b",
        r"\bdrug[- ]?induced liver injury\b",
        r"\bclosed to accrual\b[^.;:]{0,100}\bdue to safety concerns?\b",
        r"\b(?:dsmb|dmc|idmc)\b[^.;:]{0,100}\bsafety issue\b[^.;:]{0,100}\bincreased mortality\b",
        r"\bunable to safely escalate\b",
        r"\bmanage toxicity\b[^.;:]{0,100}\bfurther (?:enrolment|enrollment|recruitment) inappropriate\b",
        r"\bexcess toxicity\b",
        r"\bsafety risk\b[^.;:]{0,80}\baffect (?:the )?subsequent development\b",
        r"\bdefinitive discontinuation\b[^.;:]{0,100}\bsafety monitoring of death\b",
        r"\bincreased rate of bacterial infections\b",
        r"^interim analysis\s*[-:]\s*toxicity\.?$",
        r"\bhigh incidence of severe radiation pneumonia\b",
        r"^toxicity[.;:]\b",
        r"\btermination because of occurr?ance of toxicity grade [34]\b",
    ),

    # Concrete external oversight action.  Mere regulatory strategy or a
    # regulator mention does not match these patterns.
    _rule(
        "reg.external_action",
        REASON_REGULATORY,
        "HIGH",
        r"\b(?:fda|ema|mhra|health canada|health authority|regulatory authority|regulator|irb|ethics committee) (?:requested|required|ordered|instructed|recommended|mandated) (?:the )?(?:study |trial )?(?:termination|closure|stop|hold|suspension)\b",
        r"\b(?:at the request of|requested by|required by|ordered by|instructed by) (?:the )?(?:fda|ema|mhra|health canada|health authority|regulatory authority|regulator|irb|ethics committee)\b",
        r"\b(?:fda )?(?:partial )?clinical hold\b",
        r"\bplaced on (?:a )?(?:partial )?clinical hold by\b",
        r"\birb (?:closed|terminated|recommended termination|recommended that .{0,40} terminat)\b",
        r"\bethics committee (?:closed|terminated|recommended termination)\b",
        r"\bhgrac (?:filing|approval|review) requirements?\b",
        r"\b(?:fda|ema|mhra|health authority|regulatory authority) (?:withdrew|revoked) (?:the )?(?:approval|authorization|authorisation|drug)\b",
        r"\b(?:irb|ethics committee) did not approve\b",
        r"\bno (?:irb|ethics committee) approval\b",
        r"\b(?:fda|ema|mhra|health authority|regulatory authority|regulator) required (?:the )?(?:sponsor )?to (?:halt|stop|suspend|terminate|withdraw)\b",
        r"\b(?:fda|ema|mhra|health authority|regulatory authority|regulator)[- ]required changes\b",
        r"\b(?:local|national|new) regulations? (?:required|prevented|forced|led to|resulted in)\b",
        r"\b(?:demands?|requirements?) by (?:certain )?(?:national |local )?health authorities\b",
        r"\bimplementation of (?:the )?(?:new )?(?:regulation|regulatory) policy by (?:the )?(?:chinese |national |local )?(?:authority|authorities)\b",
        r"\b(?:revision|change) of (?:the )?(?:local|national) regulations?\b",
        r"\b(?:regulation|regulatory) policy\b.{0,80}\b(?:terminate|stop|withdraw|cancel|discontinue)\w*\b",
        r"\bfwa restriction\b",
        r"\b(?:trial|study) protocol (?:was )?not approved by (?:the )?regulatory authorities\b",
        r"\b(?:regulatory|marketing) approval was not obtained\b",
        r"\b(?:reb|irb|ethics committee) (?:closed|terminated)\b.{0,100}\bincomplete documentation\b",
        r"\b(?:medication|drug|product) (?:was )?removed from (?:the )?(?:u\.s\.|us|united states) market by (?:the )?(?:fda|food and drug administration)\b",
        r"\b(?:irb|reb|ethics committee) disapproval\b",
        r"\bwithdrawn by (?:the )?(?:irb|reb|ethics committee)\b",
        r"\bnot approved by (?:the )?(?:cfda|nmpa|fda|ema|mhra|health authority|regulatory authority)\b",
        r"\bclosed by (?:the )?.{0,40}\b(?:irb|reb|ethics committee)\b.{0,100}\bincomplete documentation\b",
        r"\b(?:fda|ema|mhra|health authority|regulatory authority) withdrew (?:the )?(?:emergency use authorization|eua)\b",
        r"^(?:fda|ema|mhra|health authority|regulatory authority) (?:clinical )?hold\.?$",
        r"^irb study closure\.?$",
        r"\bclosed by (?:the )?(?:irb|reb|ethics committee)\b.{0,100}\bnon[- ]compliance\b",
        r"^closed by (?:the )?(?:irb|reb|ethics committee)(?: on [^.]+)?\.?$",
        r"\b(?:irb|reb|ethics committee) recommend(?:ed|s) (?:the )?(?:study |trial )?(?:termination|closure|stop|suspension)\b",
        r"\bnegative (?:decision|result)\b[^.;:]{0,100}\b(?:irb|reb|ethics committee|cpp)\b[^.;:]{0,100}\bprotocol\b",
        r"\brequirements? of regulatory authorities for additional data to secure marketing approval\b",
        r"\bmedication removed from (?:the )?(?:u\.s\.|us|united states) market by the the (?:fda|food and drug administration)\b",
        r"\bterminated due to (?:the )?(?:fda|ema|mhra) withdrawal of (?:the )?(?:emergency use authorization|eua)\b",
        r"\b(?:study|trial) (?:had to be |was )?terminated due to (?:the )?new (?:european |national |local )?legislation\b",
        r"\b(?:study|trial) is not transitioning to (?:the )?clinical trial regulation\b",
        r"\bin compliance with current legislation\b[^.;:]{0,120}\bfollowing (?:the )?instructions of (?:the )?.{0,80}(?:agency|authority)\b",
        r"\bremoved from (?:the )?market by (?:the )?(?:fda|food and drug administration)\b",
        r"\bdrug development by decision made by (?:the )?(?:fda|ema|mhra|health authority|regulatory authority)\b",
        r"\b(?:fda|ema|mhra) hold due to updated risks?\b",
        r"\bhealth authority request due to\b",
        r"\b(?:fda|ema|mhra) placed (?:the )?(?:study|trial|program|programme)? ?on? ?(?:a )?(?:partial )?hold\b",
        r"\b(?:irb|reb|ethics committee) recommend(?:ed|s|) (?:the )?(?:study |trial )?(?:termination|closure|stop|suspension)\b",
        r"\b(?:fda|ema)(?: and (?:fda|ema))? agreed (?:that )?(?:the )?(?:submitted )?information\b[^.;:]{0,140}\b(?:met|meet|acceptable to meet) (?:the )?requirements? of (?:the )?post[- ]marketing commitment\b",
        r"\b(?:fda|ema)(?: and (?:fda|ema))? agreed (?:that )?(?:the )?(?:submitted )?information\b[^.;:]{0,140}\bacceptable to meet (?:the )?post[- ]marketing commitment\b",
        r"\b(?:market|marketing) denial letter from (?:the )?fda\b",
        r"\bcould not get (?:an? )?approval from (?:the )?(?:department|regulatory|ethics|irb|reb) reviewer\b",
        r"\b(?:study|trial) not approved by (?:the )?(?:irb|reb|ethics committee)\b",
        r"\bsuspended by (?:the )?(?:irb|reb|ethics committee)\b[^.;:]{0,100}\b(?:subsequently )?terminated\b",
        r"\bsponsor noncompliance\b",
        r"\b(?:nda|marketing application)\b[^.;:]{0,120}\bdid not trigger (?:the )?need for (?:a )?(?:pediatric research equity act|prea) study\b",
        r"\b(?:clinical trial|study|trial) (?:was )?never activated\b[^.;:]{0,100}\bnot authori[sz]ed by (?:the )?(?:ca|competent authority|regulatory authority)\b",
        r"\b(?:irb|reb|ethics committee) approval expired\b",
        r"\b(?:ind|clinical trial) approval from (?:the )?fda was rejected\b",
        r"\b(?:order|decision|requirement|verf.gung) (?:from |by )?swissmedic\b",
        r"\bcurrent standard of oversight expected by (?:the )?health canada regulations?\b[^.;:]{0,120}\bnot be possible to achieve\b",
    ),

    # Operational causes.  Actor/action-only phrases such as "Sponsor
    # decision" are intentionally absent.
    _rule(
        "ops.recruitment",
        REASON_RECRUITMENT,
        "HIGH",
        r"\b(?:slow|low|poor|insufficient|inadequate|lack of) (?:patient )?(?:accruals?|enrolments?|enrollments?|recruitment)\b",
        r"^(?:no|zero) (?:accrual|enrolment|enrollment|recruitment)\.?$",
        r"^difficulty in (?:accrual|enrolment|enrollment|recruitment)\.?$",
        r"\b(?:unable|inability|difficulty|difficult|failure|failed) to (?:accrue|enrol|enroll|recruit|identify)\b",
        r"\bdifficult(?:y|ies) (?:in )?(?:accruing|enrolling|enrolling|recruiting) (?:patients|participants|subjects)\b",
        r"\bnot enough (?:eligible )?(?:patients|participants|subjects)\b",
        r"\bno (?:eligible )?(?:patients|participants|subjects) (?:were )?(?:available|enrolled|recruited|identified)\b",
        r"\btoo few (?:patients|participants|subjects)\b",
        r"\b(?:screen|screening) failures?\b",
        r"\bcompeting (?:studies|trials|protocols)\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:was |is )?(?:not feasible|infeasible)\b",
        r"\\?<\s*75% participation\b",
        r"\blow referral rate\b",
        r"\b(?:enrolment|enrollment|recruitment) challenges?\b",
        r"\b(?:subject |patient |participant )?(?:recruitment|enrolment|enrollment) issues?\b",
        r"\b(?:inclusions?|enrolment|enrollment|recruitment) (?:were |was |has been )?(?:slowed|slowed down)\b",
        r"\b(?:recruitment|enrolment|enrollment) target could not be achieved\b",
        r"\b(?:has|had) not enrolled any (?:patients|participants|subjects)\b",
        r"\bproblems? (?:including|enrolling|recruiting) (?:patients|participants|subjects)\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) futility\b",
        r"\bfutility (?:in|of) (?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:lack of|insufficient) (?:the )?(?:eligible )?patient population\b",
        r"\black of (?:eligible )?volunteers?\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:goal|target) (?:was )?not (?:met|reached|achieved)\b",
        r"\bfailure to meet (?:the )?(?:accrual|enrolment|enrollment|recruitment) (?:goals?|targets?)\b",
        r"\b[<]?\s*75% participant accrual\b",
        r"^(?:lack of |no |zero )?(?:eligible )?(?:patients|participants|subjects)\.?$",
        r"^0 (?:patients?|participants?|subjects?)(?: (?:enrolled|recruited|accrued))?\.?$",
        r"^0 (?:patient |participant |subject )?accrual\.?$",
        r"\b(?:low|slow|delayed|limited) inclusion rates?\b",
        r"\b(?:lack of|no|not enough) inclusions?\b",
        r"\btarget number of inclusions? (?:was )?not reached\b",
        r"\b(?:difficulty|difficulties) (?:with|in) (?:patient )?(?:recruitment|enrolment|enrollment)\b",
        r"\b(?:difficulty|difficulties|challenges?) (?:with|in)?\s*(?:recruiting|enrolling|accruing) (?:eligible )?(?:patients|participants|subjects)\b",
        r"\b(?:difficulty|difficulties) (?:recruiting|enrolling|accruing)\b",
        r"\b(?:recruitment|enrolment|enrollment) (?:is |was |has been )?(?:too slow|proceeding too slowly|delayed)\b",
        r"\b(?:delayed|slow) (?:patient )?(?:recruitment|enrolment|enrollment|inclusion)\b",
        r"\b(?:low|insufficient) rate of (?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:no|not enough) (?:eligible )?(?:patient|participant|subject)s? (?:was |were )?enrolled\b",
        r"\b(?:no|zero) patient accruals?\b",
        r"\bno accruals?\b",
        r"^(?:no|not enough) participants?\.?$",
        r"\b(?:did not|failed to) enrol+l?\b",
        r"\blimited (?:patient )?(?:enrolment|enrollment|recruitment)\b",
        r"\b(?:accrual|enrolment|enrollment) rate (?:was |is )?(?:too slow|insufficient|inadequate)\b",
        r"\b(?:patient |participant |subject )?(?:enrolment|enrollment|recruitment) rate (?:is |was )?proceeding too slowly\b",
        r"\bno enough (?:eligible )?(?:patients|participants|subjects)\b",
        r"[<]\s*75\s*% participation\b",
        r"\b(?:recruitment|enrolment|enrollment) (?:difficulty|difficulties|problem|problems|failure)\b",
        r"^(?:difficult|difficulty|difficulties) (?:patient )?(?:recruitment|enrolment|enrollment)\.?$",
        r"\b(?:difficulty|difficulties) in (?:recruiting|enrolling|accruing)\b",
        r"\b(?:recruiting|enrolling|accruing) difficulties\b",
        r"\bnot enough (?:accrual|enrolment|enrollment|recruitment)\b",
        r"\bdelay in (?:accrual|enrolment|enrollment|recruitment)\b",
        r"\bdifficulty of (?:accrual|enrolment|enrollment|recruitment)\b",
        r"^(?:recruitment|enrolment|enrollment)\.?$",
        r"\bissues? with (?:patient |participant |subject )?(?:recruitment|enrolment|enrollment)\b",
        r"\b(?:lower|slower) than anticipated (?:patient |participant |subject )?(?:recruitment|enrolment|enrollment)\b",
        r"\b(?:incomplete|unsuccessful|unsufficient|poor) (?:patient |participant |subject )?(?:recruitment|recruitement|enrolment|enrollment)\b",
        r"\b(?:recruitement|erollment) difficult(?:y|ies)\b",
        r"\bdifficult(?:y|ies)? in recruiting (?:patients|participants|subjects)\b",
        r"\bdifficult to recruit (?:patients|participants|subjects)\b",
        r"\bdifficult in recruiting (?:patients|participants|subjects)\b",
        r"\b(?:lack of|no) (?:the )?eligible patients?\b",
        r"\b(?:lack of|limited) (?:participant|patient|subject) recruitment\b",
        r"\b(?:enrolment|enrollment|recruitment) goals? (?:were |was )?not met\b",
        r"\b(?:enrolment|enrollment|recruitment) goals? (?:were |was )?unable to be reached\b",
        r"\btarget number of (?:patients|participants|subjects) (?:was )?not reached\b",
        r"\bno proper (?:patient|participant|subject) (?:was |is )?found\b",
        r"\blow subject accrual\b",
        r"\b(?:difficulty|difficulties) to recruit (?:patients|participants|subjects)\b",
        r"\b(?:insuffisient|insufficent|insufficient) recruitment\b",
        r"^(?:patient |participant |subject )?accrual (?:was )?not met\.?$",
        r"^no (?:patient|participant|subject) (?:enrolment|enrollment)\.?$",
        r"^(?:patient |participant |subject )?(?:enrolment|enrollment|recruitment) failed\.?$",
        r"^inadequate (?:patient |participant |subject )?(?:enrolment|enrollment|recruitment)\.?$",
        r"\b(?:enrolment|enrollment|recruitment) rate (?:was )?(?:lower|slower) than anticipated\b",
        r"\b(?:target )?sample size (?:was )?not achieved\b",
        r"\b(?:inclusion|accrual) target (?:was )?not met\b",
        r"\btarget (?:enrolment|enrollment|recruitment|accrual) (?:was )?not reached\b",
        r"\black of (?:study |trial )?(?:enrolment|enrollment|recruitment)\b",
        r"\b(?:unable|inability|failed|failure) to meet (?:the )?(?:patient |participant |subject )?(?:enrolment|enrollment|recruitment|accrual) targets?\b",
        r"\b(?:study|trial) (?:was )?closed (?:early )?(?:before|prior to) (?:obtaining|reaching|achieving) (?:the )?target (?:enrolment|enrollment|recruitment|accrual)\b",
        r"\binsufficient (?:patient |participant |subject )?participation\b",
        r"\b(?:difficuty|difficulty) of (?:erollment|enrolment|enrollment|recruitment)\b",
        r"\bdifficult (?:patient |participant |subject )?(?:erollment|enrolment|enrollment|recruitment)\b",
        r"\bdifficulty in (?:patient |participant |subject )?(?:erollment|enrolment|enrollment|recruitment)\b",
        r"\bunable to accrual (?:the )?(?:total|target|planned) number of (?:patients|participants|subjects)\b",
        r"\b(?:patients|participants|subjects) (?:were )?unwilling to be random(?:ly|ized|ised) assigned to (?:a )?placebo\b",
        r"\b(?:patients|participants|subjects) were less likely to participate in randomi[sz]ation\b",
        r"\b(?:patient|participant|subject) withdrawals?\b[^.;:]{0,100}\bwithout adequate power\b",
        r"\b(?:inadequate|insufficient) power\b[^.;:]{0,100}\b(?:withdrawal|lost to follow[- ]?up|attrition)\b",
        r"\b(?:prematurely |early )?terminated due to longer (?:enrolment|enrollment|recruitment) time than (?:was )?anticipated\b",
        r"\b(?:minimal|negligible) (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:failed|failure) to meet (?:the )?inclusion criteria\b",
        r"\bscreened (?:patients|participants|subjects) did not meet (?:the )?inclusion criteria\b",
        r"\bweak (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"\black of qualifying (?:patients|participants|subjects)\b",
        r"\black of qualifying (?:hospitali[sz]ed |eligible )?(?:patients|participants|subjects)\b",
        r"\b(?:slower|lower) than expected (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment) rate\b",
        r"\banticipated insufficiency of (?:the )?sample size\b",
        r"\bfewer than expected (?:patients|participants|subjects|children) enrolled\b",
        r"\brecruitment of (?:the )?(?:patient|participant|subject)s? (?:is |was )?very difficult\b",
        r"\b(?:lower|slower) than expected (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:was |is )?slower than expected\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) process (?:was |is )?slower than expected\b",
        r"\bnot adequate (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"\bnot able to recruit (?:patients|participants|subjects) due to lack of consent\b",
        r"\bhigh rate of (?:patient |participant |subject )?drop[- ]?out\b",
        r"\bchallenges? with recruitment of (?:surgical )?(?:research )?(?:patients|participants|subjects)\b",
    ),
    _rule(
        "ops.funding",
        REASON_FUNDING,
        "HIGH",
        r"\b(?:lack|loss|shortage) of (?:funding|funds|budget|financial resources)\b",
        r"\binsufficient (?:funding|funds|budget)\b",
        r"\b(?:funding|grant|budget) (?:ended|expired|was withdrawn|was not renewed|would not be extended)\b",
        r"\b(?:unable|could not|cannot) to (?:fund|finance)\b",
        r"\bno (?:further )?funding\b",
        r"^(?:due to )?(?:sponsor )?(?:funding|budget)\.?$",
        r"\bfunding (?:was )?(?:pulled|withdrawn|lost)\b",
        r"\bfinancial support (?:was )?(?:pulled|withdrawn|ended|terminated)\b",
        r"\bfunding (?:is |was )?unavailable\b",
        r"\bfunding (?:issue|issues|reason|reasons)\b",
        r"\b(?:end|termination) of funding\b",
        r"\bwithdrawal of funding\b",
        r"\bfunding (?:was )?(?:terminated|discontinued|stopped|completed)\b",
        r"\b(?:break|loss|changes?) in funding\b",
        r"\bfunding (?:not|was not) (?:obtained|secured|received|available|awarded)\b",
        r"\b(?:did not receive|unable to secure|unable to obtain) funding\b",
        r"\b(?:ran|run) out of funding\b",
        r"\bbudget (?:issue|issues|limitations?|constraints?)\b",
        r"\black of (?:future |further )?funding\b",
        r"\bfunding concerns?\b",
        r"\bfinancial (?:issue|issues|constraint|constraints|reasons?)\b",
        r"^not funded\.?$",
        r"\black of financial support\b",
        r"\binstitutional and funding constraints?\b",
        r"\binstitutional and funding constrains?\b",
        r"\binadequate funding\b",
        r"\blost funding\b",
        r"\bfunding (?:withdrawal|loss|changes?)\b",
        r"\bcancell?ation of (?:the )?funding contract\b",
        r"\b(?:sponsor|company|institution|funder) withdrew funding\b",
        r"\b(?:study|trial|project) (?:was |is )?not funded\b",
        r"\b(?:study|trial|project|research) (?:was |is )?no longer funded\b",
        r"\bfunding constraints?\b",
        r"\bend of (?:the )?(?:nih |grant |study |project )?funding\b",
        r"\bfunding (?:ceased|halted)\b",
        r"\b(?:funding|financial) support (?:ceased|discontinued)\b",
        r"\b(?:study|trial|project) never got funded\b",
        r"\b(?:not feasible|unable|impossible) to (?:conduct|continue|complete) (?:the )?(?:study|trial|project) without funding\b",
        r"^funding not renewed\.?$",
        r"\b(?:seeking|awaiting) (?:additional |more |new )?funding\b",
        r"\bfunding exhausted\b",
        r"^never funded\.?$",
        r"\b(?:sponsor|company) (?:does not|doesn't|did not) have enough money to support (?:the|this) (?:study|trial)\b",
        r"\b(?:sponsor|company) (?:have|has|had) not enough money to support (?:the|this) (?:study|trial)\b",
        r"\bdue to financial considerations\b.{0,100}\b(?:unable|cannot|could not) to (?:complete|continue|conduct)\b",
        r"^no financial support\.?$",
        r"^(?:a )?financial problem\.?$",
        r"^budgetary issues?\.?$",
        r"^pending funding\.?$",
        r"^unfunded\.?$",
        r"^insufficient for (?:the )?fund(?:ing)?\.?$",
        r"\bunable to agree on budget terms\b",
        r"^funding cessation\.?$",
        r"\b(?:grant|funding) (?:will |would |was )?not be extended\b",
        r"\b(?:study|trial) no longer had funding\b",
        r"\b(?:sponsor|company) (?:is |was )?(?:undergoing|experiencing) financial hardships?\b",
        r"\b(?:phase [1234][ab]? )?(?:was |is )?paused due to funding limitations?\b",
        r"\bbudget for (?:the |this )?(?:study|trial) was withdrawn\b",
        r"\bhalt in funding\b",
        r"\bfinal cost of (?:the )?(?:study )?medication (?:was )?significantly greater than (?:the )?initial estimate\b",
        r"\bfunding for (?:the |this )?(?:study|trial) ended\b",
        r"\bterminated due to funding ending\b",
    ),
    _rule(
        "ops.supply",
        REASON_SUPPLY,
        "HIGH",
        r"\b(?:drug|study drug|study agent|medication|investigational product|product|device|devices|equipment|formulation) (?:was |is )?(?:unavailable|no longer available|not available|expired|no longer produced|no longer manufactured|discontinued by the manufacturer)\b",
        r"\b(?:drug|product|material|raw material) supply (?:issue|issues|shortage|shortages|constraint|constraints)\b",
        r"\bmanufactur(?:ing|er) (?:issue|issues|problem|problems|delay|delays|stopped|halted|ceased)\b",
        r"\b(?:production|manufacturing) (?:stopped|halted|ceased|unavailable)\b",
        r"\black of (?:study )?drug supply\b",
        r"\b(?:sponsor|company|manufacturer) (?:is |was )?no longer (?:producing|manufacturing|providing) (?:the )?(?:study )?(?:drug|agent|product|device)\b",
        r"\bno (?:treatment |dose |cohort )?slots? (?:were |was )?available\b",
        r"^(?:study )?drugs? (?:is |are |was |were )?unavailable\.?$",
        r"^(?:study )?drug supply\.?$",
        r"^(?:study )?drug (?:availability|shortage)\.?$",
        r"\b(?:study )?drug supply (?:was |is )?(?:no longer available|unavailable|not available|being phased out)\b",
        r"\b(?:distribution|delivery) issue with (?:the )?(?:trial|study) medication\b",
        r"\bdrug manufacturing logistics\b",
        r"\black of access to (?:the )?(?:study )?drug supply\b",
        r"\b(?:suspended|on hold) until (?:the )?(?:study )?drug manufacturing is available\b",
        r"\bpending updates? to (?:the )?(?:study )?drug(?:/manufacturer)? information\b",
        r"\b(?:company|sponsor|manufacturer) (?:was |is )?(?:no longer|longer) providing (?:the )?(?:investigational |study )?(?:product|drug|agent)\b",
        r"\b(?:company|sponsor|manufacturer) (?:could|can) no longer supply (?:the )?(?:investigational |study )?(?:product|drug|agent)\b",
        r"\b(?:sponsor|company) decision related to (?:the )?(?:study )?drug supply\b",
        r"\bexpiration of (?:the )?(?:available )?(?:study )?(?:drug|agent|product)\b",
        r"\bmanufacturer discontinued (?:the )?production of (?:the )?(?:study )?(?:drug|drugs|agent|product)\b",
        r"\b(?:sponsor|manufacturer) (?:withdrew|withdrawal of) (?:the )?(?:supply|supplying) (?:of )?(?:the )?(?:investigational |study )?(?:drug|agent|product)\b",
        r"\bno supply of (?:the )?(?:test substance|investigational |study )?(?:drug|agent|product|substance) (?:was )?provided\b",
        r"\bno supply of (?:the )?test substance (?:was )?provided by (?:the )?sponsor\b",
        r"\b(?:study )?intervention (?:was |is )?(?:not available|unavailable|no longer available)\b",
        r"\bmanufactur(?:ing|e) of (?:the )?(?:car[- ]?t |study |investigational )?(?:product|drug|agent) failed\b",
        r"\b(?:imp|investigational medicinal product) (?:is |was )?(?:being )?re[- ]?worked by (?:the )?manufacturer\b",
        r"\b(?:end|expiration|termination) of (?:a |the )?(?:key )?supply agreement\b",
        r"\black of supply of (?:one of )?(?:the )?(?:investigational |study )?(?:agents?|drugs?|products?)\b",
        r"\bsupply chain issues?\b",
        r"\bno longer able to obtain (?:the )?.{0,60}(?:device|drug|agent|product)\b",
        r"\b(?:study )?drug resupply (?:was )?delayed\b",
        r"\b(?:company|manufacturer|partner) (?:stopped|ceased|discontinued) supplying\b",
        r"\b(?:manufacturer|company) decided to halt manufacturing\b",
        r"\bdiscontinuation of (?:the )?(?:investigational |study )?product supply\b",
        r"\b(?:study )?drug expiration and supply shortage\b",
        r"^manufacturing[- ]related issues?\.?$",
        r"\bgmp deficiencies\b.{0,100}\b(?:fda )?inspection\b",
        r"\bissues? with (?:the )?development and supply of (?:the )?.{0,80}(?:imp|infusion system|delivery system|device|product)\b",
        r"\b(?:sponsor|company|manufacturer) (?:is |was )?phasing out (?:the )?(?:study )?drug supply\b",
        r"\b(?:drug|product|compound) (?:would |will )?no longer be formulated\b",
        r"^(?:product |drug )?manufacturing process improvement\.?$",
        r"\b(?:company|sponsor|manufacturer) did not provide (?:the )?(?:study |investigational )?(?:product|drug|agent)\b",
        r"\bmanufacturer discontinued (?:the )?(?:investigational |study )?(?:drug|product|agent) supply\b",
        r"\b(?:study )?medication (?:is |was )?no longer in production\b",
        r"\b(?:drug|pharmaceutical) company (?:is |was )?no longer making (?:the )?(?:study )?drug\b",
        r"\bmanufacturing shortage of (?:both |the )?.{0,100}\b",
        r"\bpharmaceutical company discontinued (?:the )?study drug\b",
        r"\bappropriate (?:study )?medication supply could not be identified\b",
        r"\bproblems? with (?:the )?manufacture of (?:the )?(?:investigational |study )?(?:drug|product|agent)\b",
        r"\bshelf life of (?:the )?(?:investigational |study )?(?:drug|product|agent) ran out\b",
        r"\bloss of (?:the )?c?gmp facility to manufacture\b",
        r"\b(?:company|sponsor|manufacturer) providing (?:the )?(?:study )?(?:imp|product|drug|agent) was unable to supply further batches\b",
        r"^(?:the )?.{0,80}(?:drug|medication|product|agent) (?:is |was )?unavailable (?:at |in )?(?:this |the )?time\.?$",
        r"^dexmedetomidine (?:is |was )?unavailable (?:at |in )?(?:this |the )?time\.?$",
    ),
    _rule(
        "ops.staffing",
        REASON_STAFFING,
        "HIGH",
        r"\b(?:prior |previous |original )?(?:principal investigator|investigator|pi)\b.{0,45}\b(?:left|departed|moved|retired)\b",
        r"\bno (?:replacement|permanent|available) (?:principal investigator|investigator|pi)\b",
        r"\b(?:staff|staffing|personnel) (?:shortage|shortages|issue|issues|unavailable|insufficient)\b",
        r"\binsufficient (?:staff|staffing|personnel|resources)\b",
        r"\b(?:principal investigator|investigator|pi) changed institutions?\b",
        r"\b(?:principal investigator|investigator|pi) (?:is |was )?no longer at (?:the )?institution\b",
        r"\b(?:principal investigator|investigator|pi) (?:leaving|left|departed from|relocated from) (?:the )?(?:institution|site)\b",
        r"\b(?:principal investigator|investigator|pi) (?:departure|transition|relocated)\b",
        r"\b(?:suspended|on hold) to identify (?:a )?permanent (?:principal investigator|investigator|pi)\b",
        r"\bshortage of (?:research (?:and|or) analytical )?(?:staff|staffing|personnel)\b",
        r"\b(?:principal investigator|investigator|pi) did not have (?:the )?(?:necessary|required|sufficient) staffing resources\b",
        r"^(?:lack of staff|site staffing)\.?$",
        r"\b(?:principal investigator|investigator|pi) (?:is |was )?(?:leaving|on sabbatical)\b",
        r"\b(?:principal investigator|investigator|pi) (?:passed away|died)\b",
        r"\b(?:burden|burdensome) to (?:the )?(?:faculty|staff|personnel)\b",
        r"\bchanges? in departmental staff\b",
        r"^lack of (?:study |research |support )?personnel\.?$",
        r"\b(?:study|trial) (?:was )?halted prematurely due to staffing\b",
        r"^lack of support staff\.?$",
        r"^(?:understaffed|understaffing)\.?$",
        r"\bunable to hire (?:research )?staff\b",
        r"\bpersonnel limitations?\b",
        r"\bchanges? in personnel\b",
        r"\b(?:principal investigator|investigator|pi) transferred to another institution\b",
        r"\b(?:investigators?|principal investigators?|pis?) changed jobs?\b",
        r"\b(?:investigators?|principal investigators?|pis?) (?:are |were )?no longer affiliated with (?:the )?institution\b",
        r"\b(?:student|resident|researcher) performing (?:the )?(?:study|trial) left\b",
        r"\bresident graduated\b[^.;:]{0,100}\bnever carried (?:the study|it) to fruition\b",
        r"\bresident (?:who was )?tasked with coordinating (?:the |this )?(?:study|trial)\b[^.;:]{0,80}\bno longer able\b",
        r"\bresearcher left before data collection could be completed\b",
        r"\bchange to (?:the )?investigator(?:'s)? research affiliation and (?:other )?employment\b",
    ),
    _rule(
        "ops.business",
        REASON_BUSINESS,
        "HIGH",
        r"\b(?:business|corporate|company|r&d|research and development|development|portfolio|program|programme) (?:strategy|objectives?|priorities) (?:changed|adjusted|shifted|were changed|have changed)\b",
        r"\b(?:portfolio|program|programme|pipeline) reprioriti[sz]ation\b",
        r"\bportfolio prioritization\b",
        r"\bstrategic portfolio decision to reallocate resources\b",
        r"\bprioriti[sz]e (?:our |the )?(?:efforts|resources)\b",
        r"\bstrategic (?:realignment|reorientation)\b",
        r"\bbusiness realignment\b",
        r"\bcompany (?:closure|insolvency|bankruptcy)\b",
        r"\bresources? (?:were )?(?:redirected|reallocated|refocused)\b",
        r"^(?:the )?(?:company|corporate|r&d) strategy\.?$",
        r"\b(?:company|r&d|research and development|development) strategy (?:has been |was |is )?(?:adjusted|changed)\b",
        r"\b(?:company|sponsor) changed (?:its |the )?(?:business |development |r&d |research and development )?strategy\b",
        r"\b(?:sponsor |company |corporate |development |r\s*\\?&\s*d )?strategy adjustment\b",
        r"\b(?:sponsor |company |corporate )?(?:business |development |r\s*\\?&\s*d )?priorities (?:changed|shifted|were changed|have changed)\b",
        r"\b(?:business|development|r\s*\\?&\s*d) priorities\b",
        r"\bcorporate policy adjustments?\b",
        r"\badjustment of (?:the )?(?:company |corporate |development |study |r\s*\\?&\s*d )?strategy\b",
        r"\bchange in (?:the )?(?:clinical )?development (?:program|programme|strategy)\b",
        r"\b(?:sponsor|company) insolvency\b",
        r"\bprogram (?:was )?(?:suspended and )?divested\b",
        r"\b(?:corporate|company|sponsor) strategic adjustment\b",
        r"\bchange in (?:clinical |company |corporate )?strategy\b",
        r"\bchange in (?:the )?sponsor prioritization\b",
        r"\b(?:project|program|programme) discontinued to prioritize other\b",
        r"\b(?:sponsor|company) (?:has )?adjusted (?:its )?r&d strategy\b",
        r"\b(?:sponsor|company)(?:'s)? r&d strategy (?:is |was |has been )?adjusted\b",
        r"\bchanges? in (?:the )?(?:company|corporate|sponsor|development) priorities\b",
        r"\b(?:shifting|changing) organizational priorities\b",
        r"\borganizational priorities (?:shifted|changed)\b",
        r"\b(?:sponsor|company) changed (?:the |its )?(?:product |clinical )?development plan\b",
        r"\b(?:change|modification) (?:in|to|of) (?:the )?(?:clinical )?development plan\b",
        r"\bdevelopment plan change\b",
        r"\bbusiness objectives? (?:has |have |had )?changed\b",
        r"\b(?:changing|changed) (?:the )?trial strategy\b",
        r"\bno longer pursuing (?:the )?(?:development of (?:the )?)?(?:indication|program|programme)\b",
        r"\b(?:sponsor|company) decision to deprioriti[sz]e (?:the )?(?:program|programme|asset|indication)\b",
        r"\bcommercial reasons?\b",
        r"\bdecision to out[- ]license (?:the )?(?:compound|asset|drug|program|programme)\b",
        r"\bfollowing an internal review of (?:the )?company(?:'s)? (?:current )?research and development portfolio\b",
        r"\bprogram priority (?:for execution )?(?:of )?(?:this |the )?(?:clinical )?trial changed\b",
        r"\bfocus(?:ing)? on (?:the )?studies which can enable registration\b",
        r"\bfiled (?:for )?chapter 11 bankruptcy\b",
        r"\bfiled (?:for )?chapter 11\b",
        r"\bbankruptcy of (?:the )?(?:company|sponsor|partner)\b",
        r"\bcompany (?:was )?dissolved\b",
        r"\binternal reprioriti[sz]ation of resources\b",
        r"\bstrategic priorities\b",
        r"\bprioriti[sz](?:e|ing) other (?:programs|programmes|projects|studies|trials)\b",
        r"\badjustment of (?:the )?(?:company|sponsor|applicant)(?:'s)? (?:research and development |r&d )?strategy\b",
        r"\bfocus resources on (?:the )?(?:studies|trials|programs|programmes|projects)\b",
        r"\b(?:drug|development|clinical) (?:program|programme|asset) (?:was |has been )?(?:sold|acquired)\b",
        r"\b(?:rights|asset) (?:were |was |have been |has been )?acquired\b.{0,100}\b(?:terminated|stopped|discontinued)\b",
        r"\b(?:entire )?(?:drug |clinical |development )?(?:program|programme|asset) (?:was |has been )?sold to another company\b",
        r"\b(?:entire )?(?:drug |clinical |development )?(?:program|programme)\b[^.;:]{0,80}\b(?:was |has been )?sold to another company\b",
        r"^change company strategy\.?$",
        r"\b(?:sponsor|company) decided not to continue development of (?:certain )?(?:treatment |drug )?(?:combinations?|programs?|programmes?)\b",
        r"\bclosure of (?:this |the )?(?:combination therapy |development )?(?:program|programme) is unrelated to any safety\b",
        r"\bno longer pursuing (?:the )?.{0,60}\bindications?\b",
        r"\bindication (?:is |was )?no longer under evaluation\b",
        r"\b(?:nci|sponsor|company|organization|organisation) moving in (?:a )?different direction\b",
        r"\bprioriti[sz]e (?:the )?(?:enrolment|enrollment|recruitment) in (?:a )?(?:randomi[sz]ed )?(?:phase [1234] )?(?:study|trial)\b",
        r"\b(?:company|sponsor) (?:has )?acquired (?:the )?rights? to\b[^.;:]{0,120}\b(?:terminated|stopped|discontinued)\b",
        r"\bcommercial decision to withdraw (?:the )?(?:ma|marketing authorization|marketing authorisation)\b",
        r"\bhas acquired (?:the )?rights? to\b[^.;:]{0,120}\band (?:has )?(?:terminated|stopped|discontinued)\b",
        r"\badjustment of (?:the )?clinical research and development strategy\b",
        r"\bresource optimi[sz]ation and (?:the )?product(?:'s)? development change\b",
        r"\bstrategic corporate pivot to focus on\b",
        r"\bre[- ]?prioriti[sz]ation of (?:the )?(?:whole )?(?:pipeline|portfolio|program|programme)\b",
        r"\bchanges? in (?:the )?corporate business environment\b",
        r"\bstrategic business/portfolio decision\b",
        r"\boptimi[sz]e (?:the )?(?:existing )?research pipeline\b",
        r"\bdecision to modify (?:the )?(?:drug|clinical|product) development plan\b",
        r"\bterminated to focus on (?:a )?comparable (?:study|trial)\b",
        r"\breconsideration of (?:the )?development strategy\b",
        r"\bprioriti[sz]e (?:a )?different (?:combination|combo) (?:study|trial)\b",
        r"\blicensing agreement granting exclusive rights? of (?:research|development|manufacture|marketing)\b",
        r"\b(?:sponsor|company) has deprioriti[sz]ed (?:its |the )?.{0,80}(?:program|programme|asset|indication)\b",
        r"\bchanges? in organi[sz]ational priorities\b",
        r"\bchange in (?:the )?sponsor(?:'s)? corporate strategy\b",
        r"\bprioriti[sz]e combination treatment approaches\b",
    ),
    _rule(
        "ops.protocol",
        REASON_PROTOCOL,
        "MEDIUM",
        r"\b(?:study|trial|protocol) (?:was |is )?(?:not feasible|infeasible|obsolete|outdated)\b",
        r"\b(?:limited|poor|insufficient) feasibility\b",
        r"\bnot implemented\b",
        r"\b(?:pending|awaiting) (?:a )?(?:protocol )?amendment(?: approval)?\b",
        r"\b(?:protocol )?amendment (?:needed|required|pending|to add|to use)\b",
        r"\b(?:eligibility|protocol|study design) revisions?\b",
        r"^(?:lack of )?feasibility(?: issues?)?\.?$",
        r"\bprotocol (?:modification|redesign|violation|violations)\b",
        r"\bchange in (?:the )?study design\b",
        r"\bstudy redesign\b",
        r"\b(?:outdated|obsolete) (?:study |trial )?design\b",
        r"\bstandard of care (?:has |had )?(?:changed|evolved)\b",
        r"\bchanging standard of care\b",
        r"\b(?:pending|awaiting) (?:protocol|icf) (?:changes?|revision)\b",
        r"\b(?:study )?protocol (?:will be|is being|was) changed\b",
        r"\b(?:pilot )?feasibility end[- ]?points? (?:were |was )?not met\b",
        r"\b(?:did not|failed to) meet (?:the )?(?:pilot )?feasibility end[- ]?points?\b",
        r"\b(?:did not|does not) meet (?:the )?requirements? of (?:a )?randomi[sz]ed trials?\b",
        r"\binability to meet (?:the )?protocol objectives?\b",
        r"\bdetermined (?:to be )?not feasible\b",
        r"\bstandard of care .{0,80}(?:updated|revised|now includes?)\b",
        r"\b(?:treatment|therapeutic|competitive) landscape (?:has |had )?(?:changed|evolved)\b",
        r"\bavailability of (?:new|other) (?:and )?(?:more )?promising therapeutic agents?\b",
        r"\bno longer (?:clinically )?(?:relevant|needed|feasible|impactful)\b.{0,100}\b(?:standard of care|treatment|landscape|design)\b",
        r"\bmodifications? to (?:the )?(?:trial|study|protocol) design\b",
        r"\b(?:trial|study|protocol) design (?:amendment|modification|revision)\b",
        r"\b(?:protocol|study protocol) needs? to be changed\b",
        r"\b(?:inapplicability|invalidity|unsuitability) of (?:the )?(?:primary )?outcome measure\b",
        r"^(?:low feasibility|protocol change|revised study design|optimization of protocol|protocol redundancy)\.?$",
        r"\b(?:study|trial) (?:turned out |was |is )?no longer feasible\b",
        r"\brationale (?:was |is )?obsolete\b",
        r"\bno longer relevant considering (?:the )?(?:recent )?implementation of (?:the |our )?(?:current |new )?(?:national )?healthcare system\b",
        r"\b(?:recent )?change in (?:the )?(?:treatment|therapeutic|competitive) landscape\b",
        r"^not feasible\.?$",
        r"\bwithdrawn due to (?:a )?protocol amendment\b",
        r"\b(?:need|needs|needed) to (?:revise|redesign) (?:the )?(?:study|trial|protocol)\b",
        r"\bmajor protocol revisions?\b",
        r"\b(?:device|study|trial|protocol) design modifications?\b",
        r"\b(?:study )?drug\b[^.;:]{0,100}\bonly be mixed in (?:a )?solvent\b[^.;:]{0,120}\bwould not allow\b",
        r"\bstandard of care changed\b[^.;:]{0,140}\b(?:procedure|treatment|intervention)s? (?:were |was )?no longer (?:common|preferred|used)\b",
        r"\bnew (?:medications|therapies|treatments) with improved response (?:were )?released\b",
        r"\brecent advances in (?:the )?treatment\b[^.;:]{0,140}\bnew (?:treatments?|therapies) (?:being |were |have been )?approved\b",
        r"\bnew clinical (?:study|trial) results?\b[^.;:]{0,140}\b(?:current |this )?(?:study|trial) would not be informative\b",
        r"\b(?:study|trial) (?:was |is )?not appropriate for demonstrating therapeutic benefit\b",
        r"\bstandard clinical practice\b[^.;:]{0,120}\b(?:issue|issues|problem|problems) for (?:the )?use of\b",
        r"\bprotocol feasibility given (?:the )?rapid evolution of medical practice\b",
        r"\bfeedback from (?:the |our )?(?:study )?participants on (?:the )?taste\b[^.;:]{0,100}\boptimi[sz]ation is necessary\b",
        r"\b(?:patient|participant|subject) feedback on (?:the )?taste\b[^.;:]{0,100}\boptimi[sz]ation is necessary\b",
        r"\b(?:evolving|changes? in|changes? to) (?:the )?(?:current )?standard of care\b",
        r"\bdue to (?:a |the )?change (?:on|in|to) (?:the )?standard of care\b",
        r"\bcommercial availability of (?:the )?.{0,100}\b(?:drug|medication|treatment|therapy)\b",
        r"\bchange in surgical practice and (?:the )?.{0,80}treatment\b",
        r"\b(?:standard|approved) .{0,80}treatment\b[^.;:]{0,140}\bpotential benefit of (?:the |this )?(?:present )?intervention is under re[- ]?evaluation\b",
    ),
    _rule(
        "ops.support",
        REASON_SUPPORT,
        "HIGH",
        r"\b(?:sponsor|company|partner|collaborator|manufacturer) (?:withdrew|ended|stopped|discontinued|terminated) (?:its )?(?:support|sponsorship|collaboration|drug supply)\b",
        r"\b(?:support|sponsorship|collaboration) (?:was |has been )?(?:withdrawn|ended|terminated|discontinued)\b",
        r"\b(?:partner|sponsor|company) (?:abandoned|ceased) support\b",
        r"\b(?:funder|funders|funding partner)(?:'s)? decision to withdraw (?:the )?(?:financial )?support\b",
        r"\bwithdrawal of sponsor support\b",
        r"\babandon(?:ment)? of (?:the )?partner\b",
        r"\b(?:company|partner|collaborator) withdrew interest\b",
        r"\b(?:sponsor|company|partner|collaborator) (?:is |was |are |were )?unable to continue supporting (?:the |this )?(?:study|trial|program|programme)\b",
        r"\b(?:pharmaceutical |drug )?(?:company|collaborator|partner) pulled support for (?:the |this )?(?:study|trial|program|programme)\b",
    ),
    _rule(
        "ops.external",
        REASON_EXTERNAL,
        "HIGH",
        r"\b(?:covid[- ]?19|covid|pandemic) (?:related )?(?:restrictions|disruption|disruptions|impact|issues|challenges)\b",
        r"\b(?:covid[- ]?19|covid|pandemic) (?:caused|forced|led to) .{0,80}(?:site|sites|recruitment|enrollment|trial|study) (?:to )?(?:close|shut down|stop|halt|suspend)\b",
        r"\bsite (?:closure|closures|closed)\b",
        r"\blogistical (?:issue|issues|problem|problems|constraints|challenges)\b",
        r"^(?:due to )?(?:covid[- ]?19|covid|covid 19|covid[- ]?19 pandemic|covid[- ]?19 epidemic|pandemic)(?: outbreak| epidemic| situation)?\.?$",
        r"\b(?:coronavirus|covid[- ]?19|covid) outbreak\b",
        r"\bcoronavirus\s*\(covid[- ]?19\) outbreak\b",
        r"\bdue to (?:the )?covid[- ]?19 (?:epidemic|pandemic)(?: situation)?\b",
        r"\bcovid(?:[- ]?19)? pandemic\b",
        r"\b(?:withdrawn|terminated|stopped|cancelled|canceled) due to covid[- ]?19?\b",
        r"\b(?:covid[- ]?19 |covid |pandemic )?(?:wave|pandemic|epidemic) (?:has |had )?(?:passed|ended|was over)\b",
        r"\b(?:pandemic|covid[- ]?19 pandemic) was over\b",
        r"\bpandemic of covid[- ]?19 was over\b",
        r"\b(?:limited|declining|lower|low|reduced) (?:number of )?(?:new )?covid[- ]?19 (?:cases|hospitalizations|hospitalisations)\b",
        r"\bdisruption due to covid[- ]?19\b",
        r"^coronavirus pandemic\.?$",
        r"\bterminated because of covid[- ]?19 pandemics?\b",
    ),
    _rule(
        "ops.other",
        REASON_OPERATIONAL_OTHER,
        "MEDIUM",
        r"\b(?:contract|agreement) (?:issue|issues|could not be finalized|was not finalized)\b",
        r"\btechnical (?:issue|issues|problem|problems|failure|failures|infeasibility)\b",
        r"\boperational (?:issue|issues|problem|problems|constraints|reasons)\b",
        r"^(?:logistics|resources)\.?$",
        r"\btime and resource constraints\b",
        r"\black of resources\b",
        r"\blogistic reasons? not related to (?:safety|efficacy)\b",
        r"\bimplementation issues?\b",
        r"\black of (?:operational )?capabilit(?:y|ies)\b",
        r"\b(?:time|resource) constraints?\b",
        r"\black of ressources\b",
    ),

    # Explicit successful/planned transitions.  These are not legacy failure
    # buckets and are always retained as V2-only semantics.
    _rule(
        "nonfailure.milestone",
        REASON_PLANNED,
        "HIGH",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:goal|target) (?:was |has been )?(?:met|reached|achieved)\b",
        r"\b(?:study |trial )?(?:objectives?|goals?) (?:were |was |have been )?(?:met|completed|achieved)\b",
        r"\bprimary end[- ]?point (?:was |has been )?(?:met|achieved)\b",
        r"\b(?:mtd|maximum tolerated dose|rp2d|recommended phase 2 dose) (?:was |has been )?(?:identified|determined|established)\b",
        r"\bproof of concept (?:was |has been )?(?:achieved|established)\b",
        r"\bsufficient data (?:were |was )?(?:collected|available|obtained)\b",
        r"\badministratively complete\b",
        r"\bend of (?:the )?inclusion period\b",
        r"\b(?:study|trial) (?:was )?concluded as planned\b",
        r"\b(?:phase [1234][ab]?|part [a-z0-9]+) (?:was |has been )?completed as planned\b",
        r"\bend of (?:the )?initial phase of (?:a )?multi[- ]phase protocol\b",
        r"^(?:scheduled interim monitoring|pending interim analysis)\.?$",
        r"\b(?:study|trial) (?:has |had )?reached (?:the )?(?:accrual|enrolment|enrollment|recruitment) goal\b",
        r"\b(?:inclusion|enrolment|enrollment|recruitment) period (?:was |is |has been )?completed\b",
        r"\bfeasibility pilot (?:was |has been )?completed\b",
        r"\bcompletion of (?:the )?follow[- ]?up period\b",
        r"\bsufficient (?:long[- ]?term )?clinical data (?:were |was |has been )?collected\b",
        r"\bas a result of marketing approval\b.{0,120}\b(?:study|trial) was terminated\b",
        r"^(?:the )?indications? (?:has |have |had )?been approved for marketing\.?$",
        r"^(?:the )?(?:study |trial )?(?:has |had )?achieved (?:the )?proof of concept\.?$",
        r"^(?:the )?(?:study |trial )?achieve(?:d)? (?:the )?proof of concept\.?$",
        r"\bcore study activities (?:are |were |have been )?complete\b.{0,100}\bscientific goals? (?:of the study )?(?:have been |were )?met\b",
        r"\bsufficient data (?:was |were )?accrued to assess (?:the )?(?:study )?hypotheses\b",
        r"\bend of (?:the )?study (?:was |has been )?reached as defined in (?:the )?protocol\b",
        r"\bmain objective of (?:the |this )?(?:study|trial) (?:has been |was )?achieved\b",
        r"\b(?:study|trial) (?:was |has been )?fully enrolled and completed after (?:the )?last (?:patient|participant|subject) completed\b",
        r"\bmain study (?:was |has been )?completed\b.{0,120}\bsufficient (?:safety )?data (?:has been |had been |was |were )?(?:generated|collected|obtained)\b",
        r"\b(?:meeting|met) (?:the )?(?:enrolment|enrollment|recruitment) targets? and (?:the )?(?:primary )?objectives?\b.{0,120}\bsufficient data\b",
        r"\bobjective of (?:the |this )?(?:study|trial) (?:was |has been )?achieved after (?:an? )?interim analysis\b",
        r"\b(?:study|trial) completed (?:the )?required elements?\b",
        r"\bsufficient data (?:had been |has been |was |were )?collected to meet (?:the )?objectives?\b",
        r"\bsufficient data (?:had been |has been |was |were )?obtained\b.{0,100}\bnot proceed with (?:the )?(?:part|phase)\b",
        r"\breached (?:the )?scientific goals?\b[^.;:]{0,140}\bfurther recruitment would not further advance\b",
        r"\bscientific goals? (?:were |was |have been )?reached\b[^.;:]{0,140}\bfurther recruitment would not (?:further )?advance\b",
        r"\badditional follow[- ]?up visits? (?:do|does|would) not further contribute to (?:the )?(?:efficacy|safety|study) data\b",
        r"\bprimary outcome (?:was |has been )?met\b",
        r"\bcollected data (?:were |was )?sufficient to perform (?:the )?analysis (?:stated )?for (?:the )?primary end[- ]?point\b",
        r"\b(?:the )?collected data (?:were |was )?sufficient to perform (?:the )?primary end[- ]?point analysis\b",
        r"\bidentified (?:a )?clinically meaningful magnitude of\b[^.;:]{0,120}\b(?:study )?goal\b",
        r"\bprotocol[- ]defined criterion of [^.]{0,100} achieved\b",
        r"\bcompleting (?:the )?(?:study|trial) would provide limited additional information\b[^.;:]{0,120}\bunlikely to change (?:the )?(?:study )?conclusions\b",
        r"\b(?:study|trial)\b[^.;:]{0,100}\bdue to (?:the )?(?:enrolment|enrollment|recruitment) completion\b",
    ),
    _rule(
        "nonfailure.replacement",
        REASON_REPLACEMENT,
        "MEDIUM",
        r"\b(?:replaced|superseded) by (?:a )?(?:new|another|alternative|different) (?:study|trial|protocol)\b",
        r"\btransitioned? (?:the |all |last )?(?:participant|participants|patient|patients|subjects?) to (?:a |an )?(?:new|another|alternative) (?:study|trial|protocol)\b",
        r"\b(?:new|another|alternative) (?:study|trial|protocol) (?:was |has been )?(?:opened|activated)\b.{0,100}\b(?:original|this) (?:study|trial)\b",
        r"\b(?:participants|patients|subjects) (?:have been |were |are )?moved to (?:a )?continuation (?:study|trial|protocol)\b",
        r"\breplaced with (?:a |an )?(?:new|another|alternative|different) (?:clinical )?(?:study|trial|protocol)\b",
        r"\b(?:study|trial) (?:has been |was )?incorporated into (?:the |a |an )?.{0,80}(?:study|trial|protocol)\b",
        r"\b(?:different|another|replacement) (?:study|trial|protocol) will be conducted\b",
        r"\b(?:sponsor|company) (?:has )?designed another (?:study|trial|protocol)\b.{0,80}\breplace\b",
        r"\bnew registration (?:has been |was )?re[- ]?applied for\b",
        r"\b(?:patients|participants|subjects) (?:are |were |will be )?followed (?:up )?in (?:the |a |an )?.{0,80}(?:study|trial|protocol)\b",
        r"\b(?:study|trial) (?:was |has been )?redeveloped into (?:a )?new protocol\b",
        r"\bnew protocol (?:will |is going to )?start with (?:an? )?improved product\b",
        r"\b(?:patients|participants|subjects) to be followed (?:up )?in (?:the |a |an )?.{0,80}(?:study|trial|protocol)\b",
        r"\b(?:patients|participants|subjects)\b[^.;:]{0,100}\b(?:have been |were |are )?moved to (?:a )?continuation (?:study|trial|protocol)\b",
        r"\b(?:last |all )?(?:participant|participants|patient|patients|subjects?) transitioned to (?:an? )?alternative (?:study|trial|protocol)\b",
        r"\bwill be conducted as (?:a )?different (?:study|trial) with different sponsorship\b",
        r"\b(?:participants|patients|subjects) were either transitioned to (?:a )?post[- ]trial access program or another .{0,80}(?:study|trial)\b",
        r"\b(?:participants|patients|subjects) were transitioned to (?:a )?post[- ]trial access program or another .{0,80}(?:study|trial)\b",
        r"\bstopped to initiate (?:a )?new .{0,100}(?:study|trial)\b",
        r"\bstopped (?:this |the )?(?:study|trial) to initiate (?:a )?new .{0,100}(?:study|trial)\b",
        r"\b(?:part|phase|cohort) [a-z0-9]+ of (?:the )?(?:study|trial) (?:was )?replaced by\b",
        r"\binitiated (?:a )?new randomi[sz]ed (?:study|trial)\b",
        r"\bprotocol underwent significant revisions\b[^.;:]{0,140}\bopen as (?:a )?new (?:study|trial)\b",
        r"\bno need for (?:a )?pilot (?:study|trial)\b.{0,100}\bnew (?:study|trial) will be opened\b",
    ),
    _rule(
        "nonfailure.not_initiated",
        REASON_NOT_INITIATED,
        "HIGH",
        r"^(?:the )?(?:study|trial|project|research project|clinical trial) (?:was |has been )?(?:never |not )?(?:started|initiated|activated|opened)\.?$",
        r"^(?:study|trial) never (?:started|initiated|opened)\.?$",
        r"\b(?:study|trial) (?:was )?never opened to (?:accrual|enrolment|enrollment|recruitment)\b",
        r"^(?:never|not) (?:started|initiated|opened)\.?$",
        r"\b(?:cancelled|canceled|withdrawn|halted|stopped) (?:(?:early|prematurely),? )?(?:before|prior to) (?:the )?(?:enrolment|enrollment) of (?:the |its )?(?:first|any) (?:patient|participant|subject)s?\b",
        r"\b(?:cancelled|canceled|withdrawn|halted|stopped) (?:(?:early|prematurely),? )?before (?:enrolling|recruiting|accruing) (?:its |the )?(?:first|any) (?:patients|participants|subjects|patient|participant|subject)\b",
        r"\b(?:cancelled|canceled|withdrawn) before any (?:patients|participants|subjects) were (?:enrolled|recruited|accrued)\b",
        r"\b(?:cancelled|canceled|withdrawn) before (?:patient |participant |subject )?(?:enrolment|enrollment|recruitment)\b",
        r"\b(?:no|zero) (?:human )?(?:patients|participants|subjects) (?:were )?enrolled\b.{0,80}\b(?:never|not) (?:started|initiated)\b",
        r"^(?:study|trial )?enrollment not initiated\.?$",
        r"\bstudy (?:was )?not activated\b",
        r"^(?:the )?(?:study|trial|project) did not start\.?$",
        r"\b(?:study|trial|project) (?:has been |was )?(?:cancelled|canceled)\b.{0,60}\b(?:has |had )?not been initiated\b",
        r"\b(?:study|trial|research) (?:has |had )?not actually been conducted\b",
        r"\b(?:clinical )?trials? not conducted\b",
        r"\b(?:study|trial) never officially began\b",
        r"\b(?:company|sponsor) (?:currently )?(?:does not|doesn't|did not) have plans to conduct (?:the|this) (?:study|trial)\b",
        r"\bclinical phase of (?:the )?study\b.{0,80}\bnever initiated\b",
        r"\b(?:inclusions?|enrolment|enrollment|recruitment) terminated before (?:the )?first inclusion\b",
    ),
)


ACTION_ONLY_PATTERNS: Tuple[str, ...] = (
    r"^(?:the )?(?:study |trial )?(?:was )?(?:terminated|stopped|closed|withdrawn|suspended)?\s*(?:per |at |by )?(?:the )?(?:sponsor|company|pi|investigator|board|committee)(?:'s)? (?:decision|request)\.?$",
    r"^(?:sponsor|company|business|strategic|administrative|investigator|pi) (?:decision|request|reasons?)\.?$",
    r"^(?:the )?(?:sponsor|company) decided to (?:terminate|stop|close|withdraw|suspend) (?:the )?(?:study|trial|program|programme)\.?$",
    r"^(?:dmc|dsmb|idmc|board|committee) recommendation\.?$",
    r"^(?:study|trial|program|programme|development|enrollment|recruitment) (?:terminated|stopped|halted|closed|discontinued|not initiated|not opened)\.?$",
)

BIOLOGICAL_UNSPECIFIED_PATTERNS: Tuple[str, ...] = (
    r"\bunfavo(?:u)?rable (?:overall )?(?:risk[- /]?benefit|benefit[- /]?risk)(?: profile| ratio| assessment| balance)?\b",
    r"\b(?:risks?|risk profile) (?:exceeded|exceeds|outweighed|outweighs) (?:the )?benefits?\b",
    r"\bbenefits? (?:did not|do not|does not) outweigh (?:the )?risks?\b",
    r"\badverse change in (?:the )?(?:risk[- /]?benefit|benefit[- /]?risk)\b",
    r"\b(?:overall )?profile does not support (?:further )?development\b",
    r"\b(?:early termination|terminated|stopped) (?:for|due to) discouraging results\b",
    r"\b(?:benefit[- /]?risk|risk[- /]?benefit) (?:profile |assessment )?no longer supports? (?:further )?development\b",
    r"\b(?:based on|due to) (?:an? )?(?:benefit[- /]?risk|risk[- /]?benefit) (?:assessment|reassessment)\b",
    r"\b(?:benefit[- /]?risk|risk[- /]?benefit) (?:profile|balance|ratio) (?:did |does )?not support (?:further )?(?:treatment|continuation|development)\b",
    r"\bimbalanced (?:benefit[- /]?risk|risk[- /]?benefit) profile\b",
    r"\b(?:tolerability|safety) to benefit ratio\b[^.;:]{0,80}\bnot (?:considered )?favorable\b",
    r"\b(?:reactive metabolites|safety observations?)\b[^.;:]{0,100}\bchanged (?:the )?(?:benefit[- /]?risk|risk[- /]?benefit) profile\b",
)

def _clause_bounds(text: str, start: int, end: int) -> Tuple[int, int]:
    left = max(text.rfind(".", 0, start), text.rfind(";", 0, start), text.rfind(":", 0, start))
    rights = [pos for pos in (text.find(".", end), text.find(";", end), text.find(":", end)) if pos >= 0]
    right = min(rights) if rights else len(text)
    return left + 1, right


def _is_negated(text: str, start: int, end: int, reason: Optional[str] = None) -> bool:
    left, right = _clause_bounds(text, start, end)
    clause = text[left:right]
    local_start = start - left
    before = clause[max(0, local_start - 90):local_start]
    local_end = local_start + (end - start)
    after = clause[local_end:min(len(clause), local_end + 80)]
    if re.search(
        r"\b(?:no|not|never|without|unrelated(?: to)?)\s+"
        r"(?:(?:being|prematurely|early|directly|primarily|specifically)\s+)*"
        r"(?:(?:due to|because of|related to|prompted by|based on)\s+)?"
        r"(?:(?:any|new|observed|identified|additional)\s+)?$",
        before,
    ):
        return True
    if re.search(r"\bno (?:evidence|signal) of\s*$", before):
        return True
    if reason in BIOLOGICAL_REASONS and re.search(
        r"\bno\b[^.;:]{0,100}(?:,|and|or|/)\s*$",
        before,
    ):
        return True
    if reason in BIOLOGICAL_REASONS and re.search(
        r"\b(?:was|were|is|are|did|does|do|has|have) not\s+"
        r"(?:a |the )?(?:cause|reason|factor|driver|concern)|"
        r"\b(?:did|does|do|was|were) not\s+"
        r"(?:cause|contribute|prompt|drive|lead|result)",
        after,
    ):
        return True
    if re.search(r"\bnot (?:terminated|stopped|halted|suspended|withdrawn|closed)\s*$", before):
        return True
    if re.search(
        r"\bnot\b.{0,55}\b(?:due to|because of|related to|prompted by|based on)\b"
        r"[^.;:]{0,100}(?:,|and|or|/)\s*$",
        before,
    ):
        return True
    return False


def _find_rule_evidence(text: str, rule: Rule) -> List[Evidence]:
    found: List[Evidence] = []
    for pattern in rule.patterns:
        for match in _compiled_pattern(pattern).finditer(text):
            affirmative_efficacy_lack = (
                rule.reason == REASON_EFFICACY
                and re.match(
                    r"^no (?:evidence of )?(?:clinical )?"
                    r"(?:efficacy|activity|benefit|response|objective response|treatment effect|signal)",
                    match.group(0),
                )
            )
            if not affirmative_efficacy_lack and _is_negated(
                text,
                match.start(),
                match.end(),
                rule.reason,
            ):
                continue
            if rule.rule_id == "eff.futility" and re.search(
                r"\b(?:(?:accrual|enrolment|enrollment|recruitment) futility|"
                r"futility (?:in|of) (?:accrual|enrolment|enrollment|recruitment)|"
                r"financial futility)\b",
                text,
            ):
                continue
            if rule.rule_id == "eff.futility" and re.search(
                r"\b(?:change|changing) in (?:the )?(?:treatment|therapeutic|competitive) "
                r"landscape\b[^.;:]{0,100}\b(?:make|makes|made|render|renders|rendered) "
                r"(?:the )?(?:study|trial) futile\b",
                text,
            ):
                continue
            if rule.rule_id == "eff.explicit_lack" and re.search(
                r"\bno response (?:from|by) (?:the )?"
                r"(?:pi|principal investigator|investigator|site|sponsor|irb|team|institution)\b",
                text,
            ):
                continue
            if rule.rule_id == "eff.explicit_lack" and re.search(
                r"\bno response (?:from|to|regarding|about) (?:an? |the )?"
                r"(?:(?:initial|expiry|follow[- ]?up) )?"
                r"(?:letter|email|communication|coverage|insurance|approval|authorization|authorisation)\b",
                text,
            ):
                continue
            if rule.rule_id == "eff.explicit_lack" and re.search(
                r"\bno (?:clinical )?activity (?:since|for) (?:an? |the )?"
                r"(?:year|month|week|day|long time)\b",
                text,
            ):
                continue
            if rule.rule_id == "eff.explicit_lack" and re.search(
                r"\bno efficacy\b.{0,35}\b(?:concern|concerns|issue|issues|factored|impact)\b",
                text,
            ):
                continue
            if rule.rule_id == "eff.explicit_lack" and re.search(
                r"\bno benefit[- /]?risk impact\b",
                text,
            ):
                continue
            if rule.rule_id == "eff.explicit_lack" and re.search(
                r"\bno (?:clinical )?(?:efficacy|activity|benefit|response) data\b",
                text,
            ):
                continue
            if rule.reason == REASON_SAFETY and re.search(
                r"\b(?:unrelated to|not related to|not due to|not driven by|not based on)\b"
                r"[^.;:]{0,45}\bsafety\b",
                match.group(0),
            ):
                continue
            if rule.reason in BIOLOGICAL_REASONS and re.search(
                r"\b(?:did|does|do|was|were|is|are|has|have) not\b[^.;:]{0,35}"
                r"\b(?:contribut\w*|factor\w*|prompt\w*|driv\w*|lead\w*|"
                r"result(?:ed|ing)?\s+(?:in|from))\b",
                match.group(0),
            ):
                continue
            if rule.rule_id == "saf.adverse_events" and re.search(
                r"\bno participants? (?:experiences?|experienced)\b.{0,100}\badverse events?\b"
                r"(?:.{0,40}\bto report\b)?",
                text,
            ):
                continue
            if rule.rule_id == "saf.toxicity" and re.search(
                r"\b(?:taste|flavo(?:u)?r|pill burden|capsules? per day)\b[^.;:]{0,100}"
                r"\bnot well tolerated\b|"
                r"\bnot well tolerated\b[^.;:]{0,100}"
                r"\b(?:taste|flavo(?:u)?r|pill burden|capsules? per day)\b",
                text,
            ):
                continue
            if rule.rule_id == "saf.adverse_events" and re.search(
                r"\b(?:potential|possible|theoretical) (?:adverse events?|side effects?)\b",
                text,
            ):
                continue
            found.append(Evidence(rule.rule_id, rule.reason, match.group(0), rule.confidence))
    return found


def _confidence(evidence: Sequence[Evidence], needs_review: bool) -> str:
    if not evidence:
        return "LOW"
    if needs_review:
        return "LOW"
    if all(item.confidence == "HIGH" for item in evidence):
        return "HIGH"
    return "MEDIUM"


def _dedupe_evidence(items: Iterable[Evidence]) -> Tuple[Evidence, ...]:
    seen = set()
    output: List[Evidence] = []
    for item in items:
        key = (item.rule_id, item.reason, normalize_reason(item.quote))
        if key in seen:
            continue
        seen.add(key)
        output.append(item)
    return tuple(output)


def classify_reason_v2(
    why_stopped: Optional[str],
    reviewed_index: Optional[Mapping[str, Mapping[str, Any]]] = None,
) -> ClassificationV2:
    text = normalize_reason(why_stopped)
    digest = text_hash(text)
    if reviewed_index and digest in reviewed_index:
        reviewed_entry = reviewed_index[digest]
        # A legacy operational audit row could confirm that a record was
        # non-biological without identifying a V2 cause.  Those rows are
        # deliberately marked unresolved and must not freeze later, more
        # specific V2 rules.  All actual adjudications retain precedence.
        unresolved_legacy_derivations = {
            "V2_UNRESOLVED_LEGACY_OPERATIONAL",
            "AUDIT_LEGACY_MAPPING",
        }
        if not (
            reviewed_entry.get("needs_review")
            and reviewed_entry.get("v2_derivation") in unresolved_legacy_derivations
        ):
            return _from_reviewed_entry(digest, reviewed_entry)
    if not text:
        return ClassificationV2(
            OUTCOME_UNKNOWN,
            REASON_UNSPECIFIED,
            (),
            "LOW",
            True,
            (),
            digest,
        )

    evidence = _dedupe_evidence(
        item for rule in RULES for item in _find_rule_evidence(text, rule)
    )
    if re.search(r"\black of safety and (?:lack of )?efficacy\b", text):
        evidence = _dedupe_evidence(
            (
                *evidence,
                Evidence("bio.coordinated_safety", REASON_SAFETY, "lack of safety", "HIGH"),
                Evidence("bio.coordinated_efficacy", REASON_EFFICACY, "lack of efficacy", "HIGH"),
            )
        )
    if re.search(r"\black of tolerability and (?:lack of )?efficacy\b", text):
        evidence = _dedupe_evidence(
            (
                *evidence,
                Evidence("bio.coordinated_tolerability", REASON_SAFETY, "lack of tolerability", "HIGH"),
                Evidence("bio.coordinated_efficacy", REASON_EFFICACY, "lack of efficacy", "HIGH"),
            )
        )
    reasons: List[str] = []
    for item in evidence:
        if item.reason not in reasons:
            reasons.append(item.reason)

    unspecified_bio = []
    for pattern in BIOLOGICAL_UNSPECIFIED_PATTERNS:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE | re.DOTALL):
            if not _is_negated(text, match.start(), match.end(), REASON_BIO_UNSPECIFIED):
                unspecified_bio.append(
                    Evidence("bio.unspecified_risk_benefit", REASON_BIO_UNSPECIFIED, match.group(0), "MEDIUM")
                )
    if unspecified_bio and not ({REASON_SAFETY, REASON_EFFICACY} & set(reasons)):
        reasons.append(REASON_BIO_UNSPECIFIED)
        evidence = _dedupe_evidence((*evidence, *unspecified_bio))

    reason_set = set(reasons)
    biological = [reason for reason in reasons if reason in BIOLOGICAL_REASONS]
    operational = [reason for reason in reasons if reason in OPERATIONAL_REASONS]
    regulatory = REASON_REGULATORY in reason_set
    non_failure = [
        reason
        for reason in reasons
        if reason in {REASON_PLANNED, REASON_REPLACEMENT, REASON_NOT_INITIATED}
    ]

    domains = sum(bool(group) for group in (biological, operational, [REASON_REGULATORY] if regulatory else [], non_failure))
    multiple_bio = len(set(biological) & {REASON_SAFETY, REASON_EFFICACY}) > 1

    if non_failure and domains == 1:
        primary = non_failure[0]
        secondary = tuple(non_failure[1:])
        return ClassificationV2(
            OUTCOME_NON_FAILURE,
            primary,
            secondary,
            _confidence(evidence, False),
            False,
            evidence,
            digest,
        )

    if domains > 1 or multiple_bio:
        return ClassificationV2(
            OUTCOME_MIXED,
            REASON_MULTIPLE,
            tuple(reasons),
            "LOW",
            True,
            evidence,
            digest,
        )

    if biological:
        primary = biological[0]
        needs_review = primary == REASON_BIO_UNSPECIFIED
        return ClassificationV2(
            OUTCOME_BIOLOGICAL,
            primary,
            tuple(biological[1:]),
            _confidence(evidence, needs_review),
            needs_review,
            evidence,
            digest,
        )

    if regulatory:
        return ClassificationV2(
            OUTCOME_NON_BIOLOGICAL,
            REASON_REGULATORY,
            (),
            _confidence(evidence, False),
            False,
            evidence,
            digest,
        )

    if operational:
        return ClassificationV2(
            OUTCOME_NON_BIOLOGICAL,
            operational[0],
            tuple(operational[1:]),
            _confidence(evidence, False),
            False,
            evidence,
            digest,
        )

    action_only = any(re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL) for pattern in ACTION_ONLY_PATTERNS)
    action_evidence: Tuple[Evidence, ...] = ()
    if action_only:
        action_evidence = (
            Evidence("unknown.action_without_cause", REASON_UNSPECIFIED, text, "HIGH"),
        )
    return ClassificationV2(
        OUTCOME_UNKNOWN,
        REASON_UNSPECIFIED,
        (),
        "LOW",
        True,
        action_evidence,
        digest,
    )


def classify_with_v2_fallback(
    why_stopped: Optional[str],
    brief_summary: Optional[str],
    detailed_description: Optional[str],
    reviewed_index: Optional[Mapping[str, Mapping[str, Any]]] = None,
) -> ClassificationV2:
    """Use description text only for explicit placeholder stop reasons.

    Broad fallback mining can import unrelated safety/efficacy background into
    the causal statement.  V2 therefore augments only known placeholders and
    keeps the result review-gated unless the extracted text contains a direct,
    high-confidence cause.
    """

    base = classify_reason_v2(why_stopped, reviewed_index)
    text = normalize_reason(why_stopped)
    if not is_placeholder_reason(text):
        return base

    description = normalize_reason(detailed_description or brief_summary)
    if not description:
        return base
    snippets = re.split(r"(?<=[.;])\s+", description)
    study_scope = (
        r"(?:study|trial|clinical program|clinical programme|development program|"
        r"development programme|enrolment|enrollment|recruitment|accrual|dosing)"
    )
    stop_action = r"(?:terminat|stopp|halt|suspend|withdraw|discontinu|clos|cancel)\w*"
    causal_link = (
        r"(?:due to|because of|as a result of|based on|following|citing|"
        r"on (?:the )?recommendation of)"
    )
    direct_cause_patterns = (
        rf"\b{study_scope}\b[^.;:]{{0,100}}\b{stop_action}\b[^.;:]{{0,180}}\b{causal_link}\b",
        rf"\b{stop_action}\b[^.;:]{{0,100}}\b{study_scope}\b[^.;:]{{0,180}}\b{causal_link}\b",
        rf"\b{causal_link}\b[^.;:]{{0,180}}\b{study_scope}\b[^.;:]{{0,100}}\b{stop_action}\b",
        rf"\b{study_scope}\b[^.;:]{{0,100}}\b{stop_action}\b[^.;:]{{0,180}}\b(?:for|after)\b",
    )
    individual_stop = re.compile(
        r"\b(?:patient|participant|subject|you)\b[^.;:]{0,45}"
        r"\b(?:discontinu|withdraw|stopp|come off)\w*\b"
    )
    product_stop = re.compile(
        r"\b(?:study|trial) (?:drug|medication|treatment|therapy)\b[^.;:]{0,80}"
        r"\b(?:discontinu|withdraw|stopp)\w*\b|"
        r"\b(?:discontinu|withdraw|stopp)\w*\b[^.;:]{0,80}"
        r"\b(?:study|trial) (?:drug|medication|treatment|therapy)\b"
    )
    candidates = [
        snippet
        for snippet in snippets
        if any(re.search(pattern, snippet) for pattern in direct_cause_patterns)
        and not individual_stop.search(snippet)
        and not product_stop.search(snippet)
    ]
    if not candidates:
        return base
    candidate = " ".join(candidates[:3])[:1200]
    augmented = classify_reason_v2(candidate)
    if augmented.needs_review or augmented.confidence != "HIGH":
        return base
    extra = Evidence("source.description_fallback", augmented.primary_reason, candidate, "HIGH")
    return ClassificationV2(
        augmented.outcome,
        augmented.primary_reason,
        augmented.secondary_reasons,
        augmented.confidence,
        augmented.needs_review,
        _dedupe_evidence((*augmented.evidence, extra)),
        augmented.normalized_text_hash,
    )


def is_placeholder_reason(why_stopped: Optional[str]) -> bool:
    """Return whether registry text explicitly requires a description fallback."""

    text = normalize_reason(why_stopped)
    return (
        not text
        or text in {"reason not provided", "not provided", "unknown", "n/a"}
        or "see detailed description" in text
        or "see termination reason in detailed description" in text
    )
