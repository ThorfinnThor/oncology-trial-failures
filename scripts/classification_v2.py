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


CLASSIFIER_VERSION = "2.4.0"

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
        r"\bno evidence of (?:meaningful |clinical |anti[- ]?(?:tumou?r|cancer) )?(?:activity|benefit|response|treatment effect)\b",
        r"\black of (?:clear |sufficient |convincing )?evidence of (?:meaningful |clinical |anti[- ]?(?:tumou?r|cancer) )?(?:efficacy|activity|benefit|response|treatment effect)\b",
        r"\black of (?:evidence of )?(?:clinical )?benefit\b",
        r"\bno objective response\b",
        r"\black of objective response\b",
        r"\bpoor response to treatment\b",
        r"\blimited (?:anti[- ]?tumou?r )?activity\b",
        r"\black of improved efficacy\b",
        r"\bbenefit (?:was |is )?not significant\b",
        r"^(?:due to )?efficacy concerns?\.?$",
        r"\bnegative results? from (?:an? |the |other )?(?:\d+ )?(?:study|studies|trial|trials)\b",
        r"\bevidence (?:showed|shows|demonstrated|indicated) [^.]{0,100}\b(?:was |is )?not effective (?:against|for|in)\b",
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
        r"\bevidence (?:showed|shows|demonstrated|indicated) [^.]{0,100}\b(?:was |is )?not effective (?:against|for|in)\b",
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
        r"\black of (?:observed |demonstrated |significant )?efficacy\b",
        r"\b(?:did not|failed to) demonstrate non[- ]?inferiority\b",
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
        r"\b(?:study|trial|drug|treatment|intervention|compound) did not demonstrate (?:the )?(?:required |expected |sufficient )?efficacy\b",
        r"\b(?:efficacy|study|trial) failed to meet (?:the |its )?(?:primary |secondary )?(?:efficacy )?end[- ]?point\b",
        r"\bdid not meet (?:the )?(?:prespecified |pre[- ]?specified )?(?:response|efficacy) criteria to continue\b",
        r"\b(?:did not meet|failed to meet) (?:the )?efficacy goals?\b",
        r"\black of (?:primary )?(?:clinical )?outcome efficacy\b",
        r"\b(?:very )?low probability of (?:the )?(?:study|trial)? ?meeting (?:the )?(?:primary |secondary )?(?:efficacy )?end[- ]?points?\b",
        r"\b(?:study|trial|drug|treatment|intervention|compound|parent stud(?:y|ies)) did not demonstrate (?:any )?(?:clinical )?efficacy (?:on|in|for|against)\b",
        r"\b(?:study|trial|drug|treatment|intervention|compound) did not achieve (?:its |the )?(?:key |co[- ]?primary |primary |secondary )?(?:efficacy )?end[- ]?points?\b",
        r"\b(?:study|trial|parent stud(?:y|ies)) did not meet (?:any of )?(?:its |their |the )?(?:key |co[- ]?primary |primary |secondary )?(?:efficacy )?end[- ]?points?\b",
        r"\b(?:primary |secondary )?end[- ]?points? (?:was |were )?not attained\b",
        r"\b(?:primary |secondary )?end[- ]?points? did not reach (?:statistical )?significance\b",
        r"\b(?:primary |secondary )?end[- ]?point showed no (?:statistically )?significant difference\b",
        r"\b(?:results?|analysis|data) did not show (?:any |a )?(?:statistically |clinically )?significant difference between\b",
        r"\b(?:drug|treatment|intervention|compound) (?:was |is )?not superior to placebo\b",
        r"\bno (?:additional |clear |measurable |meaningful )?benefit (?:was |is )?(?:seen|observed|demonstrated|identified)\b",
        r"\b(?:initial|preliminary|interim) results? did not show (?:any |a )?(?:clear |clinical |meaningful )?benefit\b",
        r"\b(?:insufficient|minimal|limited|low|poor) (?:antiviral |clinical |therapeutic )?(?:activity|response|response rate) (?:was |were )?(?:observed|seen|found)?\b",
        r"\b(?:low|poor) response rates?\b",
        r"^inefficacy\.?$",
        r"^inefficien(?:cy|t) of treatment\.?$",
        r"\bnot enough (?:confirmed )?responses? to continue (?:the )?(?:study|trial|treatment)\b",
        r"\b(?:unable|unlikely) to demonstrate improved (?:overall |progression[- ]?free )?survival\b",
        r"\b(?:low|very low) (?:predictive )?probability of (?:the )?(?:study|trial)? ?(?:meeting|achieving)\b[^.;:]{0,100}\b(?:benefit|response|end[- ]?point)\b",
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
        r"\b(?:was |were )?unlikely to meet (?:its |their |the )?(?:pre[- ]?specified |prespecified |primary |secondary )*(?:efficacy )?end[- ]?points?\b",
        r"\b(?:did not|failed to) meet (?:its |their |the )?(?:pre[- ]?determined |predetermined |pre[- ]?specified |prespecified )?(?:primary |secondary )?(?:efficacy )?end[- ]?points?\b",
        r"\b(?:did not|failed to) achieve (?:statistical )?significance (?:for|on|in) (?:its |their |the )?(?:primary |secondary )?(?:efficacy )?end[- ]?points?\b",
        r"\bfailure of [^.]{0,120}\b(?:study|trial) to meet (?:its |their |the )?(?:primary |secondary )?(?:efficacy )?end[- ]?points?\b",
        r"\bfailure to meet (?:its |their |the )?(?:pre[- ]?specified |prespecified )?(?:primary |secondary )?(?:efficacy )?end[- ]?points?\b",
        r"\b(?:study|trial|phase [1234])\b[^.;:]{0,80}\bdid not demonstrate (?:any )?(?:clinical )?efficacy (?:on|in|for|against)\b",
        r"\b(?:study|trial|phase [1234])\b[^.;:]{0,80}\bdid not meet (?:any of )?(?:its |their |the )?(?:key |co[- ]?primary |primary |secondary )?(?:efficacy )?end[- ]?points?\b",
        r"\b(?:study|trial) (?:was |is )?(?:determined to be )?ineffective\b",
        r"\befficacy (?:was |is )?(?:lower|less) than (?:anticipated|expected|planned)\b",
        r"\befficacy (?:rates?|results?) (?:did |do |does )?not show (?:a )?(?:large|meaningful|significant) enough difference\b",
        r"\befficacy (?:was |is )?not (?:seen|observed|demonstrated)\b",
        r"\b(?:insufficient|inadequate) level of efficacy\b",
        r"\b(?:drug|treatment|intervention|compound|vaccine) did not meet (?:its |the )?(?:targeted |required |expected )?(?:antiviral |clinical |therapeutic )?response\b",
        r"\bhas not demonstrated (?:any )?(?:clinical )?efficacy in (?:its |the )?primary (?:goal|objective)\b",
        r"\b(?:biological|clinical|therapeutic) effect\b[^.;:]{0,80}\bnot sufficient to warrant further development\b",
        r"\b(?:inability|unable) to demonstrate (?:a |any )?(?:clinical |meaningful )?benefit\b",
        r"\bdue to (?:a )?(?:poor|low|insufficient) (?:clinical |objective )?response\b",
        r"\b(?:low|poor) likelihood of (?:clinical |therapeutic )?benefit\b",
        r"\b(?:less|fewer) than \d+ (?:of (?:the )?first \d+ )?(?:patients?|participants?|subjects?) (?:showed|demonstrated|had|achieved)\b[^.;:]{0,80}\bresponse\b",
        r"\black of (?:a )?(?:biological|pharmacological|therapeutic|clinical) (?:efficacy|effect|activity|response|signal)\b",
        r"\black of (?:a )?(?:significant |promising |clear )?(?:signal of )?efficacy\b",
        r"\black of (?:a )?mechanistic signal\b",
        r"\black of (?:significant |clinically meaningful )?(?:impact|improvement|change) (?:on|in) (?:the )?(?:expected |primary |secondary )?(?:outcomes?|end[- ]?points?|outcome measures?)\b",
        r"\bresults? failed to achieve (?:the )?(?:anticipated|expected|required) (?:effect|benefit|response|outcome)\b",
        r"\bpredicted efficacious doses? (?:cannot|could not|can't|couldn't) be achieved\b",
        r"\b(?:primary |secondary )?efficacy parameter\b[^.;:]{0,100}\bfailed to demonstrate (?:a )?(?:statistically )?significant difference\b",
        r"\b(?:study|trial|treatment|drug|intervention) failed to demonstrate efficacy\b",
        r"\blow likelihood of demonstrating (?:a |any )?(?:clinical |meaningful |significant )?benefit\b",
        r"\b(?:low|poor) (?:overall )?response rate\b",
        r"\bnegative results? of (?:the |a |an )?(?:sister|parent|related|preceding) (?:study|trial)\b[^.;:]{0,120}\b(?:low|poor|insufficient|lack of|no) (?:overall )?(?:response|efficacy|activity|benefit)\b",
        r"\b(?:low|suboptimal|poor|insufficient) (?:clinical |objective )?response\b",
        r"\blow confidence of (?:a )?(?:clinical |meaningful )?benefit\b",
        r"\bhigh levels? of treatment failure\b",
        r"\binadequate separation on (?:the )?(?:primary |secondary )?(?:efficacy )?end[- ]?point\b",
        r"\babsence of (?:a )?demonstration of efficacy\b",
        r"\bnegative results? of (?:the )?(?:phase [1234][ab]? )?(?:study|trial)\b",
        r"\bfailure to meet (?:the )?pre[- ]?specified criteria for efficacy\b",
        r"\b(?:did not|failed to|not) achiev(?:e|ing) (?:the )?(?:primary |secondary )?(?:study )?outcome\b",
        r"\b(?:drug|treatment|compound|clinical) (?:has |had )?not demonstrated (?:a )?(?:clinical )?profile sufficient to (?:move|proceed|advance) forward\b",
        r"\bnegative results? in (?:other |similar |related )?(?:studies|trials) (?:using|of|with)\b",
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
        r"\b(?:unfavou?rable|unacceptable|poor) toxicity profile\b",
        r"^(?:animal |preclinical |renal |hepatic |liver )?toxicity findings?\.?$",
        r"^(?:renal |hepatic |liver )?toxicity(?: in phase [1234])?\.?$",
        r"^safety issues? \(toxicity\)\.?$",
        r"^(?:new |emerging )?(?:cardiac |hepatic |liver |preclinical )?safety (?:signal|signals|finding|findings|concern|concerns|issue|issues)\.?$",
        r"\b(?:new|emerging|adverse) (?:hepatic |liver |cardiac )?safety signals?\b",
        r"\b(?:clinical study )?terminated due to preclinical safety findings?\b",
        r"\b(?:new |recent )?preclinical (?:toxicology|safety) findings?\b",
        r"\b(?:dose[- ]limiting toxicit(?:y|ies)|dlts?)\b[^.;:]{0,50}\b(?:at|on) (?:the )?(?:lowest|first|starting) dose(?: level)?\b",
        r"\b(?:no|not) safe and tolerable dosing (?:was |could be )?identified\b",
        r"\b(?:safe|tolerable) dose (?:was |could be )?not identified\b",
        r"\b(?:poor|insufficient|inadequate|unacceptable) tolerability\b",
        r"\btolerability findings?\b[^.;:]{0,100}\b(?:continuation|dosing|dose escalation) (?:was |is )?(?:not possible|unable|inappropriate)\b",
        r"\b(?:higher|increased|excess|significantly higher) (?:rate of |incidence of )?(?:all[- ]cause |overall |cardiovascular |cv )?mortality\b",
        r"\btrend towards higher mortality in (?:the )?(?:treatment|intervention|experimental) group\b",
        r"\b(?:due to|because of|following) (?:a )?(?:fatal occurrence|fatal event|death)\b",
        r"\b(?:several|multiple|recurrent) intracranial hemorrhages?\b",
        r"\b(?:abnormal|elevated) liver (?:biochemical )?tests?\b",
        r"\bhepatotoxicity\b",
        r"\b(?:imbalance|increase) of (?:serious |severe |opportunistic )+(?:infections?|adverse events?)\b",
        r"\b(?:increased|higher) (?:wound |serious |severe |opportunistic )?infection rate\b",
        r"\b(?:study |protocol )?stopping criteri(?:a|on) (?:were |was )?met\b[^.;:]{0,120}\b(?:sae|serious adverse event|related to the study intervention)\b",
        r"\bpotential harm\b[^.;:]{0,100}\b(?:outweighs?|exceeds?) (?:the )?benefit\b",
        r"\brisk of [^.]{0,100}\b(?:procedure|treatment|intervention)\b[^.;:]{0,100}\b(?:sae|serious adverse event|safety)\b",
        r"\b(?:toxicology|toxicity) studies?\b[^.;:]{0,100}\b(?:concern|risk|termination|terminated|stop|stopped)\b",
        r"\b(?:due to|because of) (?:an? |the )?(?:new |emerging |observed )?safety (?:concern|concerns|issue|issues|problem|problems|reason|reasons)\b",
        r"\b(?:safety issue|safety issues|safety problem|safety problems)\s*:\s*[^.;:]{0,160}\b(?:terminated|stopped|halted|discontinued)\b",
        r"\b(?:based on|because of|due to) (?:the )?observed safety profile\b[^.;:]{0,140}\b(?:terminated|stopped|halted|discontinued|closed)\b",
        r"\badverse findings? from (?:a |the )?(?:nonclinical|preclinical) carcinogenicity studies?\b",
        r"\b(?:obvious|marked|clinically significant) adverse reactions?\b",
        r"\bserious (?:hepatic |liver )?events? related to (?:the )?(?:drug|treatment|intervention|study product)\b",
        r"\b(?:liver |hepatic )?transaminitis\b",
        r"\b(?:brainstem|hepatic|cardiac|neurologic) toxicity(?:/encephalopathy)?\b",
        r"\b(?:autoimmune|hematologic|haematologic|ocular|renal|pulmonary|neurological|neurologic) toxicity\b",
        r"\b(?:systemic )?drug levels?\b[^.;:]{0,100}\b(?:exceed|above|higher than)\b[^.;:]{0,80}\btoxicology\b",
        r"\bcranial nerve pals(?:y|ies)\b",
        r"\bhigh incidence of (?:a |the )?(?:neurological|neurologic) complications?\b",
        r"\b(?:multiple|several) (?:patients|participants|subjects) reporting (?:pain|burning)\b",
        r"\bnew (?:preclinical|nonclinical) findings? in (?:a )?(?:chronic )?toxicology stud(?:y|ies)\b",
        r"\bsafety results? from (?:an? |the )?(?:other|another) (?:study|trial)\b",
        r"\b(?:higher|increased) rate of deaths?\b",
        r"\bfatal infections?\b",
        r"\brepeated elevated (?:liver )?transaminase levels?\b",
        r"\bhigh discontinuation rates?\b[^.;:]{0,100}\b(?:tolerability|hypersensitivity|adverse)\b",
        r"\b(?:increased|higher) risk of secondary malignanc(?:y|ies)\b",
        r"\bimbalance in [^.]{0,100}(?:cancer|malignancy|death|mortality) events?\b",
        r"\b(?:increase|increased|higher) in mortality\b",
        r"\b(?:formation|development|occurrence) of (?:injection[- ]site )?(?:skin )?nodules?\b",
        r"\bconcerns? about (?:a )?(?:drug[- ]drug )?interaction between\b",
    ),

    # Concrete external oversight action.  Mere regulatory strategy or a
    # regulator mention does not match these patterns.
    _rule(
        "reg.external_action",
        REASON_REGULATORY,
        "HIGH",
        r"^(?:the )?(?:ind|cta) (?:was |has been )?withdrawn\.?$",
        r"^(?:other\s*[-:]\s*)?protocol moved to disapproved\.?$",
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
        r"\b(?:irb|reb|ethics committee) approval (?:was |is |has been )?(?:not obtained|not received|not granted|withdrawn|expired|lapsed|denied)\b",
        r"\b(?:could not|couldn't|did not|didn't|failed to|failure to) (?:obtain|receive|get) (?:the )?(?:irb|reb|ethics committee|fda|health canada|competent authority|regulatory authority) approval\b",
        r"\b(?:not|never) (?:irb|reb|ethics committee) approved\b",
        r"\b(?:irb|reb|ethics committee) (?:not approved|never approved|approval never received|application expired|process never completed)\b",
        r"\bno (?:favourable |favorable )?(?:opinion|approval) (?:was )?obtained from (?:the )?(?:irb|reb|ethics committee|competent authority|regulatory authority)\b",
        r"\b(?:not approved|not authorized|not authorised) by (?:the )?(?:irb|reb|ethics committee|cofepris|competent authority|regulatory authority)\b",
        r"\b(?:ind|regulatory) (?:application )?(?:was |is )?(?:not approved|not obtained|denied)\b",
        r"\b(?:fda|health canada|competent authority|regulatory authority) (?:did not|didn't) (?:approve|provide approval|give permission)\b",
        r"\b(?:fda|health authority|competent authority|regulatory authority) (?:prohibited|blocked|did not allow)\b",
        r"\b(?:fda|irb|reb|ethics committee|competent authority|regulatory authority) requested (?:us |the sponsor )?to stop\b",
        r"\b(?:regulatory|ethical|ethics|irb|reb) approval (?:has |had )?(?:expired|lapsed|been withdrawn)\b",
        r"\b(?:gcp|good clinical practice) (?:issue|issues|violation|violations|non[- ]compliance)\b",
        r"\bdue to (?:government |regulatory )?(?:regulation|regulations|regulatory reasons?)\b",
        r"^regulatory reasons?\.?$",
        r"\b(?:local |national )?(?:drug|health|competent|regulatory) authority (?:did not|didn't) (?:approve|authorize|authorise|give permission)\b",
        r"\b(?:audit panel|irb|reb|ethics committee) terminated (?:the )?(?:irb |ethics )?approval\b",
        r"\b(?:delay|delays) in (?:the )?approval of (?:the )?(?:study |trial )?protocol by (?:the )?(?:irb|reb|ethics committee|ethics committees|competent authority|regulatory authority)\b",
        r"\b(?:delay|delays) in (?:irb|reb|ethics committee|competent authority|regulatory authority) approval\b",
        r"\bawaiting (?:the )?(?:irb|reb|ethics committee|fda|competent authority|regulatory authority) approval\b",
        r"\b(?:could not|couldn't|cannot|can't|inability to) get (?:the )?(?:irb|reb|ethics committee|fda|competent authority|regulatory authority) approval\b",
        r"\bcontinuing (?:irb|reb|ethics committee) review was not submitted\b",
        r"\b(?:irb|reb|ethics committee) (?:has |had )?no active (?:approval|status)\b",
        r"\bfailed to pass (?:the )?(?:irb|reb|ethics committee|ministry of science and technology|competent authority|regulatory authority) review\b",
        r"\b(?:could not|couldn't|cannot|can't) obtain (?:an? |the )?(?:ide|ind)\b",
        r"\b(?:irb|reb|ethics committee|competent authority|regulatory authority) approval\b[^.;:]{0,100}\b(?:could not|couldn't|cannot|can't) be obtained\b",
        r"\b(?:study|trial|clinical research )?protocol failed to obtain approval from (?:the )?(?:irb|reb|ethics committee|competent authority|regulatory authority)\b",
        r"\black of (?:the )?(?:irb|reb|ethics committee|ethical|regulatory) approval\b",
        r"\black of approval of data exportation from (?:the )?(?:office of )?human genetic resource administration\b",
        r"\bchanges? in (?:ema|fda|mhra|health canada|regulatory authority) guidelines?\b",
        r"\b(?:fda|ema|mhra|health canada|regulatory authority) constraints?\b[^.;:]{0,120}\b(?:could not|cannot|can't|unable to|not be able to) (?:conduct|continue|complete)\b",
        r"\b(?:study|trial|protocol) (?:was |has been )?never submitted to (?:the )?(?:irb|reb|ethics committee)\b",
        r"\b(?:significant |prolonged )?delays? in receiving (?:the )?(?:local |national )?(?:irb|reb|ethics|regulatory) approval\b",
        r"\b(?:national|local) (?:policy|guidelines?) (?:of|for|on|regarding) (?:medications?|drugs?|vaccines?|treatments?)\b",
        r"\b(?:acip|national immunization|national immunisation) guidelines?\b[^.;:]{0,100}\b(?:halt|stop|discontinue|prevent)\w*\b",
        r"\b(?:mhra|fda|ema|health canada|regulatory authority) (?:cta |ind |nda |maa )?(?:was )?(?:rejected|denied)\b",
        r"\b(?:irb|reb|ethics committee) withheld (?:the )?(?:study|trial|data|approval)\b[^.;:]{0,100}\b(?:inadequate|missing|insufficient) (?:supporting )?documentation\b",
        r"\b(?:excessive|significant|prolonged) delays?\b[^.;:]{0,120}\bobtaining approval from (?:the )?(?:fda|ema|mhra|health canada|regulatory authority)\b",
        r"\bdelay(?:s|ed)? in (?:the )?approval of (?:the )?(?:study |trial )?protocol by (?:an? |the |a number of )?(?:irb|reb|ethics committee|ethics committees|ethics commitee|ethics commitees)\b",
    ),

    # Operational causes.  Actor/action-only phrases such as "Sponsor
    # decision" are intentionally absent.
    _rule(
        "ops.recruitment",
        REASON_RECRUITMENT,
        "HIGH",
        r"\b(?:slow|low|poor|insufficient|inadequate|lack of) (?:patient |participant |subject |study |trial |case )?(?:accruals?|enrolments?|enrollments?|recruitment)\b",
        r"^accrual factor\.?$",
        r"\b(?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment) (?:was |is |has been )?(?:low|poor|slow|insufficient|inadequate|unsuccessful)\b",
        r"\b(?:failed|unsuccessful) (?:patient |participant |subject )?recruitment (?:efforts?)?\b",
        r"\bfailure of (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
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
        r"\b(?:recruitment|enrolment|enrollment|accrual) of [^.;:]{0,120}\b(?:was |is )?(?:substantially |considerably |significantly |much )?(?:lower|slower) than (?:anticipated|expected|planned)\b",
        r"\b(?:recruitment|enrolment|enrollment|accrual)\b[^.;:]{0,100}\b(?:was |is )?(?:substantially |considerably |significantly |much )?(?:lower|slower) than (?:anticipated|expected|planned)\b",
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
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:has been |had been |was |is )?(?:very )?(?:slow|poor|difficult|challenging|insufficient|inadequate|too low)\b",
        r"\b(?:poor|slow|difficult|challenging) recruiting\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:pace|rate) (?:has been |had been |was |is )?(?:far )?(?:below|under) (?:the )?(?:goal|target)\b",
        r"\b(?:under[- ]?enrolment|under[- ]?enrollment|non[- ]?accrual)\b",
        r"\b(?:low|slow|poor|insufficient|inadequate|difficult) (?:patient |participant |subject |study )?(?:acrual|recruiment|recruitement|recrutiment|recruitmentc|enrollement|enrollem?ent)\b",
        r"\b(?:lack of|lck of) (?:patient |participant |subject )?(?:enrolment|enrollment)\b",
        r"\b(?:enrolment|enrollment|recruitment) (?:was |is )?(?:difficult|challenging|not achieved|not acheived|below goal)\b",
        r"\b(?:inability|unable) to complete (?:the )?(?:enrolment|enrollment|recruitment)\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:issue|issues|barrier|barriers|obstacle|obstacles|defect)\b",
        r"\b(?:problem|problems|challenge|challenges|difficulty|difficulties|obstacle|obstacles) (?:with|in|of|for) (?:the )?(?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:was |is |became |has become )?(?:too slow|stalled|troubled)\b",
        r"\b(?:loss|lack) of (?:timely )?(?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:enrolment|enrollment|recruitment) underperformance\b",
        r"\blow levels? of (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"^0 (?:accrual|enrolment|enrollment|recruitment)\.?$",
        r"\bno (?:patient |participant |subject )?(?:accrual|enrolment|enrollment) in (?:the |this )?(?:study|trial)\b",
        r"\b(?:too slow|slow) (?:of )?(?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitmentc|recreuitment)\b",
        r"\b(?:difficulty|difficulties) (?:to|for) (?:the )?(?:enrolment|enrollment|recruitment) of (?:patients|participants|subjects)\b",
        r"\b(?:could not|couldn't|cannot|can't|can not|not able to) (?:adequately |successfully )?(?:accrue|enrol|enroll|recruit)\b",
        r"\b(?:could not|couldn't|cannot|can't|can not|not able to) meet (?:the )?(?:accrual|enrolment|enrollment|recruitment) (?:goal|goals|target|targets|objective|objectives|deadline|deadlines)\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:goal|goals|target|targets|objective|objectives) (?:was |were )?(?:not met|not achieved|not reached|not attainable|not achievable)\b",
        r"\b(?:did not|didn't|failed to) meet (?:the )?(?:target )?(?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment) (?:goal|goals|target|targets|objective|objectives|deadline|deadlines)?\b",
        r"\b(?:did not|didn't|failed to) (?:reach|achieve) (?:the )?(?:target )?(?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment) (?:goal|goals|target|targets|objective|objectives)?\b",
        r"\b(?:adequate|target|required|planned|sufficient) (?:patient |participant |subject )?(?:numbers? (?:were )?)?(?:was |were )?not (?:enrolled|recruited|accrued|reached|achieved)\b",
        r"\b(?:inadequate|dissatisfactory|unsatisfactory) (?:rate of )?(?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) rate (?:was |is |remained |remaining )?(?:too |very )?(?:low|slow|poor|inadequate)\b",
        r"\b(?:poorly|badly) recruiting\b",
        r"\b(?:bad|poor) recruitment(?: of (?:suitable |eligible )?(?:patients|participants|subjects))?\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:was |is )?(?:suboptimal|not optimized|not optimised)\b",
        r"\b(?:full|adequate|sufficient) recruitment (?:was |is )?no longer expected\b",
        r"\b(?:challenges?|difficulty|difficulties) (?:in|with) meeting (?:the )?(?:accrual|enrolment|enrollment|recruitment) (?:goal|goals|target|targets|objective|objectives)\b",
        r"\b(?:difficult|difficulty|difficulties|challenging) (?:with |in |of |to )?(?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment|recruiting)\b",
        r"\b(?:lack|absence) of (?:patient |participant |subject )?(?:recruitment|enrolment|enrollment) in (?:the |this )?(?:study|trial)\b",
        r"\bno (?:patient |participant |subject )?(?:enrolments?|enrollments?|recruitment|accruals?)\b",
        r"\b(?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment) (?:was |is )?(?:below|less than) (?:the )?(?:study )?(?:goal|target)\b",
        r"\b(?:less than|fewer than|<)\s*\d+%? (?:of )?(?:the )?(?:planned |target )?(?:patients|participants|subjects)? ?(?:were )?(?:accrued|enrolled|recruited)\b",
        r"\b(?:too few|not enough|insufficient number of) (?:eligible |evaluable |qualified |interested )?(?:patients|participants|subjects) (?:were |could be )?(?:accrued|enrolled|recruited|identified)\b",
        r"\b(?:paucity|decline|decrease|lack) of (?:available |eligible |qualified |interested )?(?:patients|participants|subjects)\b",
        r"\b(?:screen fail|screen failure) rate (?:was |is )?(?:too |very )?high\b",
        r"\bdifficulty finding (?:the )?(?:required |suitable |eligible )?(?:patient|participant|subject) population\b",
        r"\b(?:target|planned|required) number of (?:patients|participants|subjects) (?:was |were )?not (?:reached|met|achieved|enrolled|recruited|accrued)\b",
        r"[<]\s*\d+\s*%\s*(?:participant |patient |subject )?accrual\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) goals?\b[^.;:]{0,60}\b(?:not achievable|not attainable|no longer feasible|could not be met)\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) goals? could not be met within (?:a )?(?:timely|reasonable|planned) (?:manner|time|timeframe|period)\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) limitations?\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) of evaluable (?:patients|participants|subjects) (?:was |is )?too low\b",
        r"\bclosed to (?:accrual|enrolment|enrollment|recruitment) before all \d+ planned (?:patients|participants|subjects) were (?:enrolled|recruited|accrued)\b",
        r"\bcould only (?:enrol|enroll|recruit|accrue) \d+ (?:patients|participants|subjects) in (?:nearly |approximately |about )?\d+ (?:years?|months?)\b",
        r"\b(?:did not|didn't|could not|couldn't) recruit any (?:patients|participants|subjects)\b",
        r"\bdidn'?t (?:enrol|enroll|recruit|accrue) enough (?:patients|participants|subjects)\b",
        r"\bdifficult(?:y|ies) to (?:enrol|enroll|recruit|accrue) (?:on time )?(?:the )?(?:required |planned |target )?(?:patient|participant|subject) population\b",
        r"\b(?:early closure|early termination|study termination) due to (?:the )?(?:rare|small|limited) (?:patient|participant|subject) population\b",
        r"\bdue to (?:a )?lack of (?:a )?suitable (?:patient|participant|subject) population\b",
        r"\bdue to poor (?:clinical )?(?:study |trial )?accrual\b",
        r"\bdue to unmet (?:accrual|enrolment|enrollment|recruitment)(?:/randomi[sz]ation)? goals?\b",
        r"\b(?:unable to|inability to|could not|couldn't|cannot|can't) meet (?:the )?(?:patient |participant |subject )?(?:enrolment|enrollment|recruitment|accrual) goals?\b",
        r"\b(?:adequate|expected|required|target|estimated|sufficient) (?:number of )?(?:eligible |evaluable )?(?:patients|participants|subjects) (?:could not|couldn't|cannot|can't) be (?:reached|included|obtained|accomplished|enrolled|recruited|accrued)\b",
        r"\b(?:unable to|inability to|could not|couldn't|cannot|can't) (?:find|identify|obtain|locate) (?:any |enough |the )?(?:eligible |evaluable |qualifying |appropriate )?(?:patients|participants|subjects|patient population|subject population)\b",
        r"\b(?:cohort|patients|participants|subjects) (?:could not|couldn't|cannot|can't) be (?:enrolled|recruited|accrued)\b",
        r"\b(?:participants|subjects|patients) were unable to be (?:enrolled|recruited|accrued)\b",
        r"\b(?:inability|unable) to reach (?:the )?(?:estimated|required|target|planned|adequate) sample size\b",
        r"\b(?:number|amount) of needed (?:patients|participants|subjects) (?:could not|couldn't|cannot|can't) be obtained\b",
        r"\b(?:patient|participant|subject) target (?:could not|couldn't|cannot|can't) be reached within (?:the )?(?:planned|required) (?:timeframe|period|time)\b",
        r"\black of (?:adequate |sufficient |successful )?(?:accrual|acrual|accural|acurral|recrual|recruitment|recruitement|enrolment|enrollment)\b",
        r"\black of (?:available |eligible |qualified |suitable |potential )?(?:study )?(?:patients|participants|subjects|enrollees|volunteers|patient population|study population)\b",
        r"\black of (?:patient|participant|subject) (?:interest|inclusion|participation)\b",
        r"\black of (?:patient|participant|subject)s? to recruit\b",
        r"\b(?:low|slow|poor|insufficient|inadequate) \(?\d+\)? (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:low|slow|poor|insufficient|inadequate) \(?0\)? (?:accrual|enrolment|enrollment|recruitment)\b",
        r"\binsufficient (?:recrutement|recruiment|recruitement|enrollement)\b",
        r"\b(?:inclusion|enrolment|enrollment|recruitment) delays?\b",
        r"\bprolonged (?:enrolment|enrollment|recruitment) timelines?\b",
        r"\bdifficult(?:y|ies) (?:for|with|in) (?:patient |participant |subject )?(?:enrolment|enrollment|recruitment)\b",
        r"\b(?:patient|participant|subject) registration did not proceed as expected\b",
        r"\b(?:very )?small (?:eligible |eligibility )?(?:patient |participant |subject )?(?:numbers?|population)\b[^.;:]{0,100}\b(?:enrolment|enrollment|recruitment|accrual|feasible)\b",
        r"\bavailability of eligible (?:patients|participants|subjects)\b[^.;:]{0,100}\b(?:enrolment|enrollment|recruitment) competition\b",
        r"\bdifficult(?:y|ies) (?:in|with) obtaining consent\b",
        r"\b(?:insufficient|limited|lack of) (?:research )?(?:institution|site|center|centre) participation\b[^.;:]{0,100}\b(?:patient |participant |subject )?(?:enrolment|enrollment|recruitment)\b",
        r"\b(?:limited|small) population of (?:research )?(?:patients|participants|subjects)\b",
        r"\bdue to (?:fewer|less) (?:eligible )?(?:patients|participants|subjects)\b",
        r"\b(?:ongoing )?vaccination efforts?\b[^.;:]{0,100}\b(?:enrolment|enrollment|recruitment) (?:is |was )?(?:low|poor|not feasible|infeasible)\b",
        r"\bspecific (?:inclusion|eligibility) criteria\b[^.;:]{0,100}\bno (?:more |additional )?(?:patients|participants|subjects) could be (?:enrolled|recruited|included)\b",
        r"\bstringent (?:inclusion|exclusion|eligibility) criteria\b[^.;:]{0,100}\b(?:not feasible|infeasible|recruitment)\b",
        r"\b(?:slow|low|poor) initial (?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:slow|low|poor) rate of (?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:slow|low|poor) rate of (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment|enrollement)\b",
        r"\blower (?:eligible )?(?:patient|participant|subject) numbers?\b",
        r"\bpersistent decline in (?:patient |participant |subject )?(?:accrual|enrolment|enrollment|recruitment)\b",
        r"\b(?:hard|difficult) to (?:obtain|get) (?:an? )?informed consents?\b",
        r"\b(?:impossible|not possible|unable) to recruit (?:further |additional )?(?:patients|participants|subjects)\b",
        r"\b(?:strict|tight|restrictive|overly restrictive) (?:inclusion|exclusion|eligibility)(?: and exclusion)? criteria\b[^.;:]{0,120}\b(?:enrol|enroll|recruit|consent|feasible|feasibility)\b",
        r"\b(?:too few|not enough) (?:eligible )?(?:patients|participants|subjects|cases)\b",
        r"\blow rate of randomi[sz]ed (?:patients|participants|subjects)\b",
        r"\b(?:lengthy|prolonged) (?:accrual|enrolment|enrollment|recruitment) period\b",
        r"\b(?:low|poor) (?:patient |participant |subject )?recrcuitment\b",
        r"\brecruitment default\b",
        r"\bdifficult(?:y|ies) (?:in|on|with)?\s*(?:recruting|recruiting|enrolling|accruing)(?: (?:patients|participants|subjects))?\b",
        r"\babsence of (?:patient'?s? |participant'?s? |subject'?s? )?(?:recruitment|enrolment|enrollment)\b",
    ),
    _rule(
        "ops.funding",
        REASON_FUNDING,
        "HIGH",
        r"\b(?:lack|loss|shortage) of (?:funding|funds|budget|financial resources)\b",
        r"\babsence of (?:the )?(?:necessary |sufficient )?(?:funding|funds|budget|financial support)\b",
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
        r"\b(?:funding|funds|grant funding) (?:was |were |has been |had been )?(?:rescinded|denied|eliminated|sequestered|paused|dropped|closed|compromised)\b",
        r"\b(?:funding|funds|grant funding) (?:ran out|lapsed|never materialized)\b",
        r"\b(?:lapse|expiry|cessation|shortfall) (?:in|of) (?:grant )?funding\b",
        r"\b(?:never received|never attained|hadn't got|hasn't got|failed to obtain|fail(?:ed)? of applying for) (?:the )?funding\b",
        r"\b(?:funding|grant funding) (?:cycle|term) (?:was |has |had )?(?:completed|ended|expired)\b",
        r"\blimited funding\b",
        r"\blacking? (?:of )?funding\b",
        r"\b(?:funding|grant funding) (?:was |is )?(?:never )?(?:attained|acquired)\b",
        r"\b(?:fail|failure|failed) (?:of|in|when) applying (?:for )?(?:the )?funding\b",
        r"\b(?:lock|lask) of funding\b",
        r"\b(?:loss|discontinuation|termination|expiration|expiry|withdrawal|cancellation|end) of (?:the )?(?:study |project |trial |grant )?(?:funding|financing|financial support)\b",
        r"\b(?:study |project |trial |grant )?(?:funding|financing|financial support) (?:was |were |has been |had been )?(?:terminated|discontinued|withdrawn|cancelled|canceled|exhausted|removed|pulled|suspended|stopped|ended|expired|unavailable)\b",
        r"\b(?:funding|funds|financing|financial support) (?:is |are |was |were |became |has become )?(?:no longer available|unavailable|insufficient|inadequate|exhausted)\b",
        r"\b(?:funding|financial|financing|budgetary) (?:problem|problems|difficulty|difficulties|issue|issues|constraints?|limitations?|shortage|shortages|hardships?)\b",
        r"\b(?:due to|because of) (?:a |the )?(?:financial|financing|budgetary) (?:problem|problems|difficulty|difficulties|issue|issues|constraints?|limitations?|shortage|shortages|hardships?|decision)\b",
        r"\b(?:budget|study budget) (?:was |is )?(?:insufficient|inadequate|exceeded|exhausted)\b",
        r"\b(?:budgetary|financial) constraints?\b",
        r"\b(?:could not|couldn't|cannot|can't|can not|unable to|failed to|failure to) (?:obtain|secure|identify|arrange|acquire) (?:the )?(?:necessary |adequate |additional |appropriate )?(?:funding|funds|financing|financial support)\b",
        r"\b(?:funding|grant) (?:was |is )?(?:not approved|not obtained|not acquired|not secured|not funded|not procured|not received|not established)\b",
        r"\b(?:grant|grant proposal) (?:was |is )?(?:not approved|not obtained|not funded|denied)\b",
        r"\b(?:funder|funding agency|funding source|grantor|sponsor) (?:has |had )?(?:terminated|discontinued|withdrew|withdrawn|pulled|halted|stopped|cancelled|canceled) (?:the )?(?:study |project |trial )?(?:funding|financial support|fiscal support|support)\b",
        r"\b(?:funder|funding agency|funding source|grantor) (?:is |was )?no longer (?:providing|supporting|funding)\b",
        r"\b(?:funding|grant funding|funding source|funding period) (?:was |is |has been )?(?:complete|completed|ended|expired)\b",
        r"\b(?:funding|budget) (?:decision|termination|expiration|limitations?|restrictions?)\b",
        r"\bfinancial (?:decision|difficulties|problems|constraints?|limitations?|hardships?)\b",
        r"\b(?:funds|funding) no longer available\b",
        r"\b(?:funds|funding) for (?:the |this )?(?:study|trial|project) (?:have |has )?(?:expired|ended|been spent)\b",
        r"\bbudget (?:was |is )?not sufficient to (?:cover|complete|continue|conduct|support)\b",
        r"\b(?:high|increased|excessive) (?:study |trial |project )?budget\b[^.;:]{0,120}\b(?:terminate|stop|discontinue|affect|prevent)\b",
        r"\b(?:could not|couldn't|cannot|can't) fulfill (?:the )?financial (?:responsibility|obligations?)\b",
        r"\b(?:did not|didn't) get enough (?:fund|funding|financial support)\b",
        r"\b(?:failed|failure) to achi(?:e|)ve funding\b",
        r"\b(?:unable to|could not|couldn't|cannot|can't) secure (?:the )?(?:necessary |adequate |sufficient )?financial resources\b",
        r"\b(?:sponsor|company|institution) (?:could not|couldn't|cannot|can't) fund\b",
        r"\bsufficient funding (?:could not|couldn't|cannot|can't) be secured\b",
        r"\black of (?:adequate |appropriate |continued |additional |public |vc )?(?:finance|financing|funds|funding|financial support)\b",
        r"\black of financial funding\b",
        r"\bfinancial funding (?:was |is )?(?:unavailable|insufficient|withdrawn|exhausted)\b",
        r"\breduced funding\b",
        r"\bstructural financial deficit\b",
        r"\b(?:grant |study |project )?funding cuts?\b",
        r"\bdue to (?:the )?(?:lack of |no )funds\b",
        r"\b(?:sponsor|company|investigator|pi)\b[^.;:]{0,100}\b(?:not interested|unable to continue)\b[^.;:]{0,100}\bfinancial reasons?\b",
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
        r"\b(?:study |investigational )?(?:drug|product|imp|medication|agent|material|materials|reagent|reagents|placebo) (?:supply )?(?:became |is |was |were |has become )?(?:unavailable|not available|no longer available|insufficient|inadequate|disrupted|interrupted)\b",
        r"\b(?:study |investigational )?(?:drug|product|imp|medication|agent|material|placebo) availability (?:issue|issues|problem|problems)\b",
        r"\b(?:insufficient|inadequate|lack of|shortage of) (?:suitable |available |reliable )?(?:study |investigational )?(?:drug|product|imp|medication|agent|material|materials|reagent|reagents|placebo) supply\b",
        r"\b(?:withdrawal|discontinuation|termination|expiration|expiry|interruption|shortage) of (?:the )?(?:study |investigational )?(?:drug|product|imp|medication|agent|material|materials|reagent|reagents|placebo) supply\b",
        r"\b(?:supply|production|manufacturing) of (?:the )?(?:study |investigational )?(?:drug|product|imp|medication|agent|material|reagent|placebo) (?:was |is )?(?:discontinued|terminated|stopped|halted|suspended|delayed|disrupted|interrupted)\b",
        r"\b(?:supply|production|manufacturing) (?:was |is |has been )?(?:discontinued|terminated|stopped|halted|suspended|delayed|disrupted|interrupted)\b",
        r"\b(?:manufacturer|company|sponsor|supplier|collaborator) (?:can|could|will|would) no longer supply\b",
        r"\b(?:manufacturer|company|sponsor|supplier|collaborator) (?:stopped|ceased|discontinued|withdrew) (?:the )?(?:study |investigational )?(?:drug|product|imp|medication|agent|material|placebo)? ?supply\b",
        r"\b(?:could not|couldn't|cannot|can't|can not|unable to|failed to) (?:obtain|secure|procure|produce|manufacture|supply) (?:an? |the )?(?:adequate |sufficient |suitable |study |investigational )*(?:drug|product|imp|medication|agent|material|materials|reagent|reagents|placebo|supply)\b",
        r"\b(?:problem|problems|issue|issues|difficulty|difficulties) (?:with|in) (?:the )?(?:drug|product|imp|medication|agent|material|placebo)? ?supply\b",
        r"\bplacebo (?:cannot|could not|can't|couldn't) be (?:prepared|produced|manufactured|obtained)\b",
        r"\b(?:study |investigational )?(?:drug|product|imp|medication|agent|material|placebo) (?:is |was )?no longer being (?:manufactured|produced|supplied)\b",
        r"\bdelay in (?:the )?availability of (?:the )?(?:study |investigational )?(?:drug|product|imp|medication|agent|material|placebo)\b",
        r"\bdifficult(?:y|ies) (?:in|with) (?:the )?(?:production|manufacturing|procurement) of (?:the )?(?:study |investigational )?(?:drug|product|imp|medication|agent|material|reagents?|placebo)\b",
        r"\bdifficult(?:y|ies) with (?:the )?availability of [^.]{0,80}(?:reagents?|materials?) for manufacturing\b",
        r"\bexpiry of (?:the )?(?:study |experimental |investigational )?(?:drug|product|treatment|medication|agent|material|placebo)\b",
        r"\b(?:drug|product|imp|medication|agent|material|placebo) supply\b[^.;:]{0,80}\b(?:outdated|expired|delayed)\b",
        r"\b(?:national|global|local) shortage of (?:the )?(?:study |investigational )?(?:drug|product|imp|medication|agent|material|placebo)\b",
        r"\b(?:unable to|inability to|could not|couldn't|cannot|can't) (?:obtain|access|provide|deliver|re[- ]?supply) (?:the )?(?:study |investigational )?(?:drug|product|imp|medication|agent|treatment|material|placebo)\b",
        r"\b(?:study |investigational )?(?:drug|product|imp|medication|agent|treatment) (?:could not|couldn't|cannot|can't) be (?:delivered|provided|re[- ]?supplied|produced|manufactured|obtained)\b",
        r"\black of (?:access to |availability of |available |adequate |reliable )?(?:the )?(?:study |investigational |clinical )?(?:drug|product|imp|medication|agent|treatment|material|materials|substance|vaccine supplies?)\b",
        r"\bcannot get enough [^.]{0,80}\bto manufacture (?:the )?(?:study |investigational )?(?:drug|product|imp|medication|agent|treatment)\b",
        r"\b(?:durability|stability) of (?:the )?(?:study |investigational )?(?:drug|product|imp|medication|agent|treatment) (?:could not|couldn't|cannot|can't) be (?:guaranteed|established)\b",
        r"\b(?:study |investigational )?(?:drug|product|treatment) (?:was |is )?discontinued by (?:the )?(?:supplier|manufacturer)\b",
        r"\bdiscontinuation of (?:the )?(?:study |investigational )?(?:drug product|drug|product|treatment) by (?:the )?(?:investigational drug )?(?:supplier|manufacturer)\b",
        r"\b(?:end|expiry|expiration) of (?:the )?validity of (?:the )?(?:study |investigational )?(?:drug|product|vaccine|peptide|material)\b",
        r"\b(?:long|prolonged) .{0,40}manufacturing timeline\b[^.;:]{0,120}\b(?:closed|stopped|terminated|discontinued)\b",
        r"\b(?:closed|stopped|terminated|discontinued)\b[^.;:]{0,120}\bdue to (?:the )?(?:long|prolonged) .{0,40}manufacturing timeline\b",
        r"\binterruption in (?:the )?(?:study |investigational )?(?:drug|product|medication|material) supply\b",
        r"\b(?:national|nationwide|global|local|ongoing) shortage of [^.]{0,100}\b",
        r"\b(?:delay|delays|complication|complications)\b[^.;:]{0,100}\bavailability of (?:the )?.{0,100}(?:drug|product|solution|material|medication)\b",
        r"\b(?:limitation|limitations|constraint|constraints) of (?:the )?(?:production|manufacturing) capacity\b",
        r"^(?:due to )?supply constraints?\b",
        r"\bmanufacturing (?:site )?(?:malfunction|failure)\b[^.;:]{0,120}\b(?:contamination|tablets?|product|drug)\b",
        r"\b(?:medical devices?|study devices?)\b[^.;:]{0,100}\bno longer available\b[^.;:]{0,120}\bdiscontinuation of production\b",
        r"\b(?:expiry|expiration) of (?:the )?(?:blinded )?placebo\b",
        r"\binsufficient supply of (?:the )?(?:study |investigational )?(?:drug|product|medication|material)\b",
        r"\b(?:impossible|not possible|unable) to obtain (?:a )?suitable placebo[- ]?(?:inhaler|device)?\b",
        r"\bimpossibility of obtaining (?:a )?suitable placebo[- ]?(?:inhaler|device)?\b",
        r"\bcancellation of (?:the )?supply of [^.]{0,100}\bby (?:the )?(?:collaborator|supplier|manufacturer|sponsor)\b",
        r"\bdifficult(?:y|ies) in (?:the )?procurement of (?:an? |the )?(?:adequate |sufficient )?supply of (?:the )?(?:study |treatment |investigational )?(?:drug|product|agent|medication)\b",
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
        r"\b(?:phd |doctoral |graduate )?(?:candidate|student) left (?:the )?(?:institution|university|department|program|programme)\b",
        r"\bresident graduated\b[^.;:]{0,100}\bnever carried (?:the study|it) to fruition\b",
        r"\bresident (?:who was )?tasked with coordinating (?:the |this )?(?:study|trial)\b[^.;:]{0,80}\bno longer able\b",
        r"\bresearcher left before data collection could be completed\b",
        r"\bchange to (?:the )?investigator(?:'s)? research affiliation and (?:other )?employment\b",
        r"\b(?:departure|loss|relocation|retirement) of (?:the )?(?:principal investigator|co[- ]?investigator|investigator|pi|research coordinator|study personnel)\b",
        r"\b(?:principal investigator|co[- ]?investigator|investigator|pi|research coordinator|study personnel) (?:has |had )?(?:left|departed|relocated|retired|transferred)\b",
        r"\b(?:all |the )?(?:investigators|co[- ]?investigators|study personnel|research staff) (?:have |had )?(?:left|departed|relocated|transferred)\b",
        r"\b(?:critical |necessary |required |research |support )?(?:staff|staffing|personnel) (?:was |were |is |are )?(?:not available|unavailable|insufficient|inadequate)\b",
        r"\b(?:did not have|lack of|without) (?:the )?(?:necessary |required |sufficient |adequate )?(?:research |support |study )?(?:staff|staffing|personnel)\b",
        r"\b(?:staffing|personnel) changes?\b",
        r"\b(?:change|changes) in (?:the )?(?:available )?resources? for (?:the )?(?:study )?procedures?\b",
        r"\b(?:lack|loss|shortage|limitation|limitations) of (?:the )?(?:sufficient |adequate |available )?(?:study |research )?resources?\b",
        r"\b(?:insufficient|inadequate|limited) (?:study |research )?resources? (?:to|for)\b",
        r"\bresource limitations?\b",
        r"\b(?:principal investigator|investigator|pi) (?:is |was |will be )?(?:deceased|on sabbatical|participating in (?:a )?visiting scholar program)\b",
        r"\bdeath of (?:the )?(?:principal investigator|investigator|pi)\b",
        r"\b(?:actually )?limited personnel res+ources?\b",
        r"\b(?:principal investigator|investigator|pi|grant holder) transferred to (?:a )?(?:new|another) institution\b",
        r"\b(?:study )?investigator is no longer following (?:the |these )?(?:patients|participants|subjects)\b",
        r"\bdue to (?:a )?shift in (?:the )?(?:primary )?responsibilities\b[^.;:]{0,120}\b(?:principal investigator|investigator|pi)\b",
        r"\bchanges? in (?:the )?(?:study|trial) personnel\b[^.;:]{0,120}\b(?:leaving|departing|left|departed)\b",
        r"\b(?:research |study )?staffs? (?:was |were |is |are )?(?:unable|not able) to continue\b",
        r"\b(?:researcher|investigator|principal investigator|pi) changed jobs?\b",
        r"\b(?:student )?pi\b[^.;:]{0,100}\b(?:graduation|graduate)\b[^.;:]{0,100}\b(?:cannot|could not|unable to) complete\b",
        r"\b(?:principal investigator|investigator|pi)\b[^.;:]{0,100}\b(?:departure|left|medical illness|stroke)\b[^.;:]{0,100}\b(?:unable|inability|cannot|could not)\b",
        r"\black of (?:appropriate |fixed |available |sufficient )?(?:faculty|research personnel|study personnel|human resources|human ressources)\b",
        r"\b(?:principal investigator|investigator|pi)(?:'s)? (?:change|move) to private practice\b",
        r"\black of (?:principal investigator|investigator|pi) time\b",
        r"\bunavailability of (?:the )?(?:orthopedic |orthopaedic |study |research )?(?:surgeon|physician|clinician|investigator)\b",
        r"\b(?:additional|changed|change in) responsibilities of (?:the )?(?:principal investigator|investigator|pi|research coordinator)\b",
        r"\bno study oversight\b[^.;:]{0,100}\bchanges? in (?:the )?(?:study )?personnel\b",
    ),
    _rule(
        "ops.business",
        REASON_BUSINESS,
        "HIGH",
        r"^(?:an? |the )?(?:internal )?(?:business|corporate) decision(?: by| on behalf of)?(?: the)?(?: sponsor| company)?\.?$",
        r"^(?:due to )?(?:an? |the )?(?:internal )?company decision\.?$",
        r"^(?:due to )?(?:an? |the )?(?:sponsor )?business decision\.?$",
        r"^(?:an? |the )?strategic(?:/business| business)? decision\.?$",
        r"^(?:the )?strategy review\.?$",
        r"^(?:company |corporate |sponsor )?strategic (?:decision|reasons?|considerations?)\.?$",
        r"\bstrategic(?: business)? decision to (?:discontinue|terminate|stop|halt|close|withdraw)\b",
        r"\bstrategic business decision\b",
        r"\bstrategic decision by (?:the )?sponsor\b",
        r"\b(?:company|business|corporate) decision to (?:discontinue|terminate|stop|halt|close|withdraw|cancel) (?:the |this )?(?:study|trial|program|programme|development program)\b",
        r"\b(?:study|trial|program|programme|development program) (?:is |was |is being |was being )?(?:discontinued|terminated|stopped|halted|closed|withdrawn|cancelled|canceled) (?:solely )?(?:due to|because of|for|based on|from) (?:an? |the )?(?:sponsor )?(?:business|corporate|company) (?:decision|perspective|reasons?)\b",
        r"\b(?:due to|because of|for|based on|following) (?:an? |the )?(?:internal )?(?:company|business|corporate) decision\b",
        r"\b(?:due to|because of|for|based on|following) (?:an? |the )?(?:business|corporate) (?:reason|reasons|consideration|considerations)\b",
        r"\b(?:due to|because of|for|based on|following|as a result of) (?:an? |the )?(?:company |corporate |sponsor )?strategic (?:decision|reasons?|considerations?)\b",
        r"\b(?:sponsor|company) (?:has )?(?:made|took) (?:an? |the )?strategic decision\b",
        r"\ba strategic decision was made to (?:discontinue|terminate|stop|halt|close|withdraw)\b",
        r"\b(?:business|corporate) decision based on (?:the )?(?:re[- ]?)?prioriti[sz]ation of (?:the |its |their |our )?(?:internal )?[^.;:]{0,80}\b(?:pipeline|portfolio|programs?|programmes?|assets?|projects?)\b",
        r"\b(?:business|corporate) decision\b[^.;:]{0,120}\bdue to (?:a |an |the )?(?:portfolio|pipeline|program|programme|asset|project) reprioriti[sz]ation\b",
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
        r"\b(?:company|sponsor) changed (?:its |the )?(?:business |product development |clinical development |development |r&d |research and development )?strategy\b",
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
        r"\b(?:sponsor|company)(?:'s)? (?:product |clinical |drug |research and development |r&d )?development strategy (?:change|changed|adjustment|revised|reprioriti[sz](?:ed|ation))\b",
        r"\b(?:development|commercial|business) strategy (?:change|changed|adjustment|revised|reprioriti[sz](?:ed|ation))\b",
        r"\bre[- ]?evaluation of (?:the )?(?:clinical |product |drug )?development strategy\b",
        r"\balternate development strategy\b",
        r"\bstrategic prioriti[sz]ation and realignment of (?:the )?(?:research and development |r&d )?portfolio\b",
        r"\bstrategic development reprioriti[sz]ation\b",
        r"\badjustment to (?:the )?(?:company|sponsor)(?:'s)? (?:product |clinical |drug )?development strategy\b",
        r"\b(?:due to|because of|for|as a result of|based on) (?:an? |the )?(?:internal |strategic |corporate )?(?:business|commercial|corporate) (?:reason|reasons|consideration|considerations)\b",
        r"^(?:an? )?(?:internal |strategic |corporate )?(?:business|commercial|corporate) (?:reason|reasons|consideration|considerations)(?:[.;:].*)?$",
        r"\b(?:business|corporate|company) decision\b[^.;:]{0,140}\b(?:not due to|not related to|unrelated to|not based on|no)\b[^.;:]{0,80}\b(?:safety|efficacy)\b",
        r"\b(?:business|corporate|company) decision\.\s*(?:the (?:termination|closure|decision) (?:was |is )?)?(?:not due to|not related to|unrelated to|not based on)\b[^.;:]{0,100}\b(?:safety|efficacy)\b",
        r"\b(?:business|corporate|company) decision\b[^.]{0,180}\.\s*(?:there (?:were|was|are|is) |with )?no (?:new )?(?:safety|efficacy) concerns?\b",
        r"\b(?:business|corporate|commercial) reasons? (?:unrelated|not related) to (?:safety|efficacy)\b",
        r"\bstrategic business reasons?\b",
        r"\bbroader portfolio assessment\b",
        r"\bprioriti[sz]ation of other pipeline assets\b",
        r"\bstrategic decision (?:was )?(?:unrelated|not related) to (?:safety|efficacy)\b",
        r"\bstrategic reasons?\b[^.;:]{0,100}\bnot based on (?:any )?(?:safety|efficacy)\b",
        r"\b(?:corporate|company) changes?\b[^.;:]{0,100}\bnot related to (?:any )?(?:safety|efficacy)\b",
        r"\b(?:company|sponsor) decision\b[^.;:]{0,100}\bnot related to (?:any )?(?:safety|efficacy)\b",
        r"\b(?:early )?discontinuation based on (?:a )?strategic sponsor decision\b",
        r"\bstrategic decision (?:was )?made to (?:discontinue|terminate|stop|halt|not further execute) (?:the )?(?:study|trial|program|programme)\b[^.]{0,180}\bnot (?:based on|driven by|due to|related to) (?:any )?safety\b",
        r"^(?:business|corporate) decision[;,:() -]+no (?:new )?(?:safety|efficacy) concerns?\b",
        r"\b(?:business|corporate) decision\b[^.;:]{0,80}\bnot driven by (?:any )?safety concerns?\b",
        r"\b(?:portfolio|pipeline|program|programme) re[- ]prioriti[sz]ation\b",
        r"\b(?:sponsor|company|corporate) strategic priorit(?:y|ies) adjustment\b",
        r"\badjustment of (?:our |the )?(?:company|sponsor)(?:'s)? research and development strategy\b",
        r"\b(?:company|sponsor) (?:is |was )?(?:being )?taken over by another (?:pharma|company)\b[^.;:]{0,160}\bdifferent (?:ideas|plans|strategy)\b",
        r"\b(?:decision (?:was |is )?(?:made )?to|decided to) prioriti[sz]e other (?:pipeline )?(?:programs|programmes|assets|projects|studies|trials)\b",
        r"\bportfolio review\b[^.;:]{0,100}\bre[- ]prioriti[sz]ation\b",
        r"\b(?:business|corporate|company) decision\b[^.]{0,220}\b(?:not due to|not related to|unrelated to|not based on|not driven by|no)\b[^.;:]{0,100}\b(?:safety|efficacy)\b",
        r"\bnon[- ]?safety related business prioritization decisions?\b",
        r"\bstrategic resource allocation decisions?\b",
        r"\bprioriti[sz]ation of other (?:sponsor |company )?(?:programs|programmes|assets|projects|studies|trials)\b",
        r"\bprioriti[sz](?:ed|es) other (?:pipeline )?(?:programs|programmes|assets|projects|studies|trials)\b",
        r"\b(?:sponsor|company) (?:is |was )?not (?:further )?developing (?:the )?(?:drug|product|compound|asset|program|programme)\b",
        r"\b(?:internal )?decision to prioriti[sz]e (?:the |its )?(?:development )?pipeline\b",
        r"\bchanges? in (?:the )?(?:company|corporate) structure and investment\b",
        r"\bchanges? in (?:the )?(?:sponsor|company)(?:'s)? research strategy\b",
        r"\bfocus resources on (?:a )?(?:larger|controlled|different|new) (?:study|trial|program|programme)\b",
        r"\binternal re[- ]?prioriti[sz]ation\b",
        r"\bmodification of (?:the )?(?:company|corporate|sponsor) strategy\b",
        r"\breallocation of resources\b",
        r"\badjustment and change of (?:the )?(?:company|sponsor)(?:'s)? (?:research and development |r&d )?strategy\b",
        r"\badjustment of (?:the )?(?:company|sponsor)(?:'s)? development plan\b",
        r"\b(?:current |ongoing )?re[- ]?organi[sz]ation at (?:the )?(?:sponsor|company)\b",
        r"\bdecision (?:by|of) (?:the )?(?:company|sponsor) not to pursue (?:the )?development of\b",
        r"\b(?:company|sponsor)(?:'s)? (?:project|product|portfolio) adjustment\b",
        r"\bshifting priorities\b",
        r"\bchanges? in (?:its|their) research strategy\b",
        r"\bfocus resources on (?:a )?(?:(?:larger|controlled|different|new) ){1,2}(?:study|trial|program|programme)\b",
        r"\bchange in (?:the )?(?:company|corporate) governance\b",
        r"\bchange in (?:the )?(?:company|sponsor)(?:'s)? research target\b",
        r"\bportfolio[- ]level review of (?:the )?(?:company|sponsor)(?:'s)? .{0,80}pipeline\b",
        r"\b(?:divisional|departmental|corporate|company) re[- ]?organi[sz]ation\b",
        r"\b(?:loss|expiry|expiration) of (?:the )?(?:drug |product )?patent\b",
        r"\b(?:company|sponsor) (?:shut down|shutdown|ceasing all operations|ceased all operations)\b",
        r"\bprioriti[sz]e (?:another|a different) .{0,60}\b(?:drug|compound|inhibitor|asset|program|programme)\b",
        r"\bredirection of (?:the )?.{0,80}\bdevelopment plan\b",
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
        r"^(?:change|changes) (?:in|to|of) (?:the )?(?:study |trial |protocol )?design\.?$",
        r"^(?:design|study design|trial design|methodological|methodology) (?:problem|problems|issue|issues|limitations?)\.?$",
        r"\b(?:current |existing )?(?:study|trial) design (?:could not|couldn't|cannot|can't|does not|did not) support\b",
        r"\b(?:study|trial) design limitations?\b",
        r"\b(?:protocol|study design) (?:was |is )?not reflective of clinical reality\b",
        r"\b(?:continuing|continuation) (?:the )?(?:study|trial) (?:was |is )?(?:deemed |considered )?(?:not feasible|unfeasible|infeasible)\b",
        r"\b(?:study|trial) (?:was |is )?(?:deemed |determined )?(?:not feasible|unfeasible|infeasible) (?:at|in) (?:the |our )?(?:site|center|centre)\b",
        r"\b(?:challenges?|problems?|issues?) with feasibility\b",
        r"\b(?:assessment|measurement|method|procedure|technology|device) (?:was |is )?(?:technically )?not feasible\b",
        r"\bdata (?:could not|cannot) be interpreted\b",
        r"\b(?:study )?methodology (?:requires?|needed) re[- ]?evaluation\b",
        r"\b(?:primary )?end[- ]?point measure (?:was |is )?not obtainable\b",
        r"\b(?:research question|study|trial|protocol) became obsolete\b",
        r"\b(?:procedure|treatment|intervention) (?:has |had )?become (?:the )?standard of care\b",
        r"\bprotocol (?:was |is )?no longer necessary\b",
        r"\b(?:adjustment|change|revision|redesign) of (?:the )?(?:study|trial|protocol) design\b",
        r"\b(?:decision to|decided to) (?:change|revise|redesign) (?:the )?(?:study|trial|protocol) design\b",
        r"\b(?:study|trial|protocol) design (?:was |is )?no longer (?:appropriate|suitable|viable)\b",
        r"\b(?:concern|concerns|challenge|challenges|constraint|constraints) (?:regarding|with|of) (?:the )?(?:study|trial|protocol) design\b",
        r"\b(?:change|changes) in (?:the )?(?:study )?protocol\b",
        r"\b(?:change|changes) in (?:the )?(?:hospital|institutional) protocol\b",
        r"\b(?:continuation|continuing) of (?:the )?(?:study|trial) (?:cannot|could not|can't|couldn't) serve (?:a )?scientific purpose\b",
        r"\bfeasibility of (?:the )?(?:clinical )?(?:study|trial) (?:could not|couldn't|cannot|can't) be confirmed\b",
        r"\b(?:study|trial) (?:could not|couldn't|cannot|can't) be implemented at (?:the )?(?:site|center|centre)\b",
        r"\b(?:unable|inability) to reliably (?:assess|measure)\b[^.;:]{0,120}\b(?:outcome|end[- ]?point|level|levels|effectiveness|efficacy)\b",
        r"\b(?:lack of )?(?:clinical )?(?:study |trial )?feasibility (?:for|to|of) (?:completion|complete|accrue|recruit|conduct)\b",
        r"\black of (?:clinical )?viability\b",
        r"\b(?:measure|measurement|endpoint) (?:was |is )?not (?:appropriate|reliable|valid)\b",
        r"\b(?:impossible|not possible|infeasible) to (?:complete|finish|end|conduct) (?:the )?(?:study|trial) with (?:only )?(?:\d+|one|two) (?:site|center|centre)s?\b",
        r"\breconsideration of (?:the )?use of .{0,120}\bas (?:an? )?(?:adjuvant|treatment|therapy|intervention)\b",
        r"\b(?:change|changes) in (?:the )?(?:care|treatment) setting\b[^.;:]{0,100}\b(?:enrolment|enrollment|recruitment|feasible|limited)\b",
        r"\b(?:enrolment|enrollment|recruitment) (?:was |is )?(?:limited|restricted|infeasible)\b[^.;:]{0,100}\bdue to (?:a )?(?:change|changes) in (?:the )?(?:care|treatment) setting\b",
        r"\bevolving scientific knowledge\b[^.;:]{0,140}\b(?:less relevant|obsolete|no longer relevant)\b",
        r"\bchanges? in (?:the )?(?:research objectives?|methodological approach|methodology)\b",
        r"\bintroduction of (?:another|a new) .{0,80}\b(?:drug|inhibitor|treatment|therapy)\b[^.;:]{0,100}\b(?:recruitment|study|trial) (?:was |is )?(?:not feasible|infeasible|obsolete)\b",
        r"\bneed to proceed with procedural changes\b[^.;:]{0,120}\b(?:technical|economic|clinical) feasibility\b",
        r"\b(?:fda|ema|health authority) (?:approval|authorization|authorisation) of .{0,120}\bas (?:a )?first[- ]line treatment\b",
        r"\b(?:non[- ]?feasible|not feasible|infeasible) due to (?:a )?change in (?:the )?clinical practice\b",
        r"\b(?:challenging|changed|evolving) competitive landscape\b",
        r"\b(?:different|new) clinical decision tool (?:became|becoming|is|was) available\b",
        r"\bpublished data\b[^.;:]{0,100}\bnon[- ]?specificity\b[^.;:]{0,100}\b(?:imaging|measurement|assay)\b",
        r"\b(?:confounds?|confounded|confounding)\b[^.;:]{0,120}\b(?:effect|outcome|end[- ]?point|analysis)\b",
        r"\b(?:new|another) overlapping (?:study|trial|protocol)\b",
        r"\b(?:changing|evolving) landscape\b",
    ),
    _rule(
        "ops.support",
        REASON_SUPPORT,
        "HIGH",
        r"\b(?:sponsor|company|partner|collaborator|manufacturer) (?:withdrew|ended|stopped|discontinued|terminated) (?:its )?(?:support|sponsorship|collaboration|drug supply)\b",
        r"\b(?:sponsor|company|partner|collaborator|manufacturer) stopped supplying (?:the )?(?:study )?(?:drug|medication|intervention|product)\b",
        r"\b(?:support|sponsorship|collaboration) (?:was |has been )?(?:withdrawn|ended|terminated|discontinued)\b",
        r"\b(?:partner|sponsor|company) (?:abandoned|ceased) support\b",
        r"\b(?:funder|funders|funding partner)(?:'s)? decision to withdraw (?:the )?(?:financial )?support\b",
        r"\bwithdrawal of sponsor support\b",
        r"\babandon(?:ment)? of (?:the )?partner\b",
        r"\b(?:company|partner|collaborator) withdrew interest\b",
        r"\b(?:sponsor|company|partner|collaborator) (?:is |was |are |were )?unable to continue supporting (?:the |this )?(?:study|trial|program|programme)\b",
        r"\b(?:pharmaceutical |drug )?(?:company|collaborator|partner) pulled support for (?:the |this )?(?:study|trial|program|programme)\b",
        r"\b(?:collaboration|collaboration agreement|partnership) (?:with |between )?[^.;:]{0,100}\b(?:ended|terminated|expired|was discontinued)\b",
        r"\b(?:sponsor|company|partner|collaborator) (?:decided|has decided) not to continue (?:to )?support\b",
        r"\b(?:study |trial )?(?:supporter|partner|collaborator) (?:pulled|withdrew|ended|terminated) (?:its )?support\b",
    ),
    _rule(
        "ops.external",
        REASON_EXTERNAL,
        "HIGH",
        r"\b(?:covid[- ]?19|covid|pandemic) (?:related )?(?:restrictions|disruption|disruptions|impact|issues|challenges)\b",
        r"\b(?:covid[- ]?19|covid|pandemic) (?:caused|forced|led to) .{0,80}(?:site|sites|recruitment|enrollment|trial|study) (?:to )?(?:close|shut down|stop|halt|suspend)\b",
        r"\bsite (?:closure|closures|closed)\b",
        r"\b(?:study |trial )?site (?:was |has been )?closed down\b",
        r"\bsite that administered .{0,100}\bclosed\b[^.;:]{0,120}\balternative site could not be identified\b",
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
        r"\b(?:due to|because of|as a result of|secondary to) (?:the )?(?:coronavirus |sars[- ]?cov[- ]?2 |covid[- ]?19 |covid )?(?:global )?pandemic\b",
        r"\b(?:due to|because of|as a result of|secondary to) (?:the )?(?:coronavirus|covid[- ]?19|covid)(?: outbreak| emergency| situation| restrictions?| lockdown)?\b",
        r"^(?:due to )?(?:the )?(?:global )?(?:covid[- ]?19 |covid |coronavirus )?pandemic (?:conditions?|constraints?|situation)?\.?$",
        r"\b(?:covid[- ]?19|covid|coronavirus|pandemic) (?:caused|created|resulted in|led to|seriously affected|impacted|halted|prevented)\b",
        r"\b(?:delays?|restrictions?|constraints?|barriers?|disruptions?|limitations?) (?:caused by|due to|from|related to) (?:the )?(?:covid[- ]?19|covid|coronavirus|pandemic)\b",
        r"\b(?:covid[- ]?19|covid|coronavirus|pandemic)[- ]related (?:delays?|restrictions?|constraints?|barriers?|disruptions?|limitations?|challenges?)\b",
        r"\b(?:current |ongoing )?(?:geopolitical|political) (?:situation|circumstances|conflict|instability)\b",
        r"\b(?:conflict|war) between (?:russia and ukraine|ukraine and russia)\b",
        r"^(?:cov|covid)[- ]?19? (?:pandemic|pandemia|pandmic|lockdown|hold|crisis|epidemic)\.?$",
        r"^(?:cov|covid)[- ]?19? has shut (?:the )?(?:clinic|site|facility) (?:indefinitely)?\.?$",
        r"\b(?:covid|covid[- ]?19|pandemic) (?:closed|shut|halted|interrupted|stopped) (?:the |all )?(?:clinic|facility|site|sites|study|studies|trial|trials|research)\b",
        r"\b(?:covid|covid[- ]?19|pandemic) (?:made|rendered) (?:the )?(?:study |trial )?(?:visits|procedures|research) (?:impossible|infeasible)\b",
        r"\b(?:covid|covid[- ]?19|pandemic) (?:lack|shortage|decline|decrease) of (?:cases|patients|participants|subjects)\b",
        r"\bemerging sars[- ]?cov[- ]?2 variants? impacting susceptibility to (?:the )?(?:study )?(?:drug|treatment|intervention)\b",
        r"\b(?:current |ongoing )?political climate\b",
        r"\b(?:decline|decrease|reduction) (?:in|of) (?:the )?(?:number of )?covid[- ]?19 (?:patients|cases|hospitali[sz]ations)\b",
        r"\bend of (?:the )?(?:arvi|rsv|influenza|flu|respiratory virus) (?:season|epidemic|wave)\b",
        r"\bwaning (?:covid[- ]?19 |coronavirus )?(?:pandemic|epidemic|outbreak)\b",
    ),
    _rule(
        "ops.other",
        REASON_OPERATIONAL_OTHER,
        "MEDIUM",
        r"\b(?:contract|agreement) (?:issue|issues|could not be finalized|was not finalized)\b",
        r"\btechnical (?:issue|issues|problem|problems|failure|failures|infeasibility)\b",
        r"\boperational (?:issue|issues|problem|problems|constraints|reasons)\b",
        r"^(?:logistics|resources)\.?$",
        r"^administrative(?: decision| reasons?)?\.?$",
        r"\btime and resource constraints\b",
        r"\black of resources\b",
        r"\blogistic reasons? not related to (?:safety|efficacy)\b",
        r"\bimplementation issues?\b",
        r"\black of (?:operational )?capabilit(?:y|ies)\b",
        r"\b(?:time|resource) constraints?\b",
        r"\black of ressources\b",
        r"\blimited resources\b",
        r"\badministrative (?:burden|constraints?|challenges?|delay|delays)\b",
        r"\badministrative (?:issue|issues|problem|problems)\b",
        r"\b(?:contract|agreement) (?:ended|expired|terminated|was not executed|not executed|was never completed|never completed)\b",
        r"\b(?:logistic|logistical) and practical reasons?\b",
        r"\b(?:technical )?(?:difficulties|issues|problems) (?:with|in) (?:recording|collecting|measuring)\b",
        r"\b(?:lack of|unable to obtain|could not obtain|couldn't obtain) (?:the |an? )?(?:necessary |dedicated )?(?:[a-z0-9-]+ ){0,4}(?:equipment|device)\b",
        r"\b(?:process|procedural) miscommunications?\b",
        r"\black of (?:operational )?bandwidth\b",
        r"\bdifficult(?:y|ies) in finali[sz]ing (?:the )?(?:contract|agreement)\b",
        r"\b(?:logistical|human|budgetary) considerations?\b",
        r"\b(?:logistic|logistical|clinical logistics) issues?\b",
        r"\bchange of (?:the )?location of (?:the )?laborator(?:y|ies)\b",
        r"\bchange of (?:the )?laborator(?:y|ies) location\b",
        r"\b(?:long|lengthy) process\b[^.;:]{0,100}\b(?:strict|fixed) deadline\b",
        r"\bmedication error with (?:the )?(?:placebo|study drug|investigational product)\b",
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
        r"^(?:the )?(?:primary |secondary |efficacy |safety )?end[- ]?point (?:was |has been )?(?:met|reached|achieved)\.?$",
        r"\bclosed due to (?:the )?achievement of (?:the )?primary (?:study )?end[- ]?point\b",
        r"\b(?:study|trial) (?:met|reached|achieved) (?:its |the )?(?:primary |secondary )?end[- ]?point\b",
        r"\bpre[- ]?specified non[- ]?inferiority criterion (?:was )?met at (?:the )?interim analysis\b",
        r"\b(?:predefined |pre[- ]?specified )?efficacy boundary (?:was )?crossed\b",
        r"\binterim analysis demonstrated significant benefit in (?:the )?intervention arm\b",
        r"\b(?:clinical )?benefit was noted before (?:the )?scheduled completion\b",
        r"\ball (?:patients|participants|subjects) completed (?:the )?primary end[- ]?point assessments?\b",
        r"\bcollected data (?:were |was )?sufficient to perform (?:the )?analysis (?:stated )?for (?:the )?primary end[- ]?point\b",
        r"\b(?:the )?collected data (?:were |was )?sufficient to perform (?:the )?primary end[- ]?point analysis\b",
        r"\bidentified (?:a )?clinically meaningful magnitude of\b[^.;:]{0,120}\b(?:study )?goal\b",
        r"\bprotocol[- ]defined criterion of [^.]{0,100} achieved\b",
        r"\bcompleting (?:the )?(?:study|trial) would provide limited additional information\b[^.;:]{0,120}\bunlikely to change (?:the )?(?:study )?conclusions\b",
        r"\b(?:study|trial)\b[^.;:]{0,100}\bdue to (?:the )?(?:enrolment|enrollment|recruitment) completion\b",
        r"\bprimary end[- ]?point \((?:safety|efficacy)\) (?:was |has been )?(?:met|reached|achieved)\b",
        r"\b(?:study|trial) reached (?:the )?required number of events for evaluation of (?:the )?(?:study )?end[- ]?points?\b",
        r"\ball primary (?:safety |efficacy )?data (?:has |have |had )?been collected and analy[sz]ed\b[^.;:]{0,180}\bno additional (?:beneficial |useful )?(?:safety |efficacy )?information\b",
        r"\bafter completion of (?:the )?dose[- ]?escalation\b[^.;:]{0,160}\b(?:safety|tolerability) profile\b[^.;:]{0,100}\badequately characteri[sz]ed\b",
        r"\bminimum (?:study )?objectives?\b[^.;:]{0,120}\b(?:were |was |have been )?achieved\b[^.;:]{0,160}\bfull completion\b",
        r"\ball (?:patients|participants|subjects) (?:were |are |had been )?past (?:the )?planned primary end[- ]?point\b",
        r"\b(?:strong|positive) primary outcome (?:crossed|crosses) (?:the )?(?:predefined |pre[- ]?specified )?efficacy boundary\b",
        r"\bcompletion of (?:the )?(?:overall )?(?:development |clinical )?(?:program|programme) objectives?\b",
        r"\bsufficient (?:bioavailability|pharmacokinetic|pk) information\b",
        r"\bcompelling efficacy\b[^.;:]{0,160}\b(?:after|following) (?:the )?(?:final )?(?:pre[- ]?specified |prespecified )?interim analysis\b",
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
        r"\b(?:duplicate registration|duplicate (?:study |trial )?record)\b",
        r"\b(?:study|trial|clinical trial) (?:was )?entered in error\b[^.;:]{0,180}\b(?:correct|duplicate|another) (?:entry|record|registration)\b",
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
        r"\bnew (?:study|trial|protocol) (?:was |has been )?(?:developed|written|designed) to replace (?:this |the )?(?:study|trial|protocol)\b",
        r"\b(?:new|modified|simplified) (?:study|trial|protocol) (?:was |has been )?(?:developed|written|designed)\b[^.;:]{0,100}\breplace\b",
        r"\b(?:changing|changed) (?:the )?(?:study|trial) design\b[^.;:]{0,100}\breplace with (?:a )?different protocol\b",
        r"\befficacy signal (?:was |is )?substantial enough to move to (?:a )?larger (?:study|trial)\b",
        r"\bnew registration (?:has been |was |is )?(?:submitted|created) due to (?:a )?redesign of (?:the )?(?:study|trial|protocol)\b",
        r"\bnew (?:study|trial|protocol) (?:is |was |will be )?(?:planned|planed|created|opened) to replace (?:the |this )?(?:current |original )?(?:study|trial|protocol)\b",
        r"\badjustment of (?:the )?(?:study |trial )?protocol\b[^.;:]{0,140}\bnew (?:clinical )?(?:study|trial|protocol) (?:was |has been )?submitted\b",
        r"\b(?:study |trial )?protocol (?:was |has been )?adjusted\b[^.;:]{0,140}\bnew (?:clinical )?(?:study|trial|protocol) (?:was |has been )?submitted\b",
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
        r"\b(?:study|trial) (?:has been |was )?withdrawn prior to (?:patient |participant |subject )?(?:enrolment|enrollment|recruitment)\b",
        r"\b(?:administratively closed|administrative closure) prior to (?:any |patient |participant |subject )?(?:enrolments?|enrollments?|recruitment)\b",
        r"\bclosed without (?:patient |participant |subject )?(?:enrolment|enrollment|recruitment)\b",
        r"\b(?:cancelled|canceled) before (?:the )?first (?:patient|participant|subject) (?:was )?enrolled\b",
        r"\b(?:no|zero) (?:patients|participants|subjects) (?:had been |were )?enrolled\b.{0,100}\b(?:withdrawn|closed|cancelled|canceled|terminated)\b",
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
    r"\bunfavo(?:u)?rable (?:overall )?(?:risk\s*[- /:]\s*benefit|benefit\s*[- /:]\s*risk)(?: profile| ratio| assessment| balance)?\b",
    r"\b(?:risks?|risk profile) (?:exceeded|exceeds|outweighed|outweighs) (?:the )?benefits?\b",
    r"\bbenefit\s*(?:to|[- /:])\s*risk (?:balance|profile|assessment|ratio)? (?:did |does )?not support (?:further )?(?:treatment|continuation|development|the study)\b",
    r"\bbenefits? (?:did not|do not|does not) outweigh (?:the )?risks?\b",
    r"\badverse change in (?:the )?(?:risk\s*[- /:]\s*benefit|benefit\s*[- /:]\s*risk)\b",
    r"\b(?:overall )?profile does not support (?:further )?development\b",
    r"\b(?:early termination|terminated|stopped) (?:for|due to) discouraging results\b",
    r"\b(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:profile |assessment )?no longer supports? (?:further )?development\b",
    r"\b(?:based on|due to) (?:an? )?(?:overall )?(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:profile|assessment|reassessment)\b",
    r"\b(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:profile|balance|ratio) (?:did |does )?not support (?:further )?(?:treatment|continuation|development|the study)\b",
    r"\b(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:profile|balance|ratio) no longer supports? (?:continuing|continuation of) (?:the )?(?:study|studies|trial|trials|program|programme|development)\b",
    r"\b(?:risk profile|risks?)\b[^.;:]{0,100}\bexceeds? (?:the )?benefits?\b",
    r"\bimbalanced (?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) profile\b",
    r"\b(?:tolerability|safety) to benefit ratio\b[^.;:]{0,80}\bnot (?:considered )?favorable\b",
    r"\b(?:reactive metabolites|safety observations?)\b[^.;:]{0,100}\bchanged (?:the )?(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) profile\b",
    r"\b(?:change|alteration|shift) in (?:the )?(?:overall )?(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:profile|balance|ratio)\b",
    r"^(?:due to )?(?:the )?(?:overall )?(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:profile|assessment|reassessment|imbalance)\.?$",
    r"\b(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:profile|balance|ratio) (?:was |is )?(?:negative|unacceptable|unsatisfactory)\b",
    r"\b(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:profile|balance|ratio) (?:was |is )?not favo(?:u)?rable\b",
    r"\b(?:altered|changed|revised) (?:overall )?(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:assessment|profile|balance|ratio)\b",
    r"\bunsatisfactory (?:overall )?(?:benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit) (?:assessment|profile|balance|ratio)\b",
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
        r"\b(?:no|not|never|neither|without|unrelated(?: to)?)\s+"
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
    if re.search(r"\bnot (?:terminated|stopped|halted|suspended|withdrawn|closed|discontinued)\s*$", before):
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
            if rule.rule_id == "ops.supply" and re.search(
                r"\b(?:expiry|expiration) of (?:the )?(?:drug |product )?patent\b",
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
            if (
                rule.rule_id == "ops.business"
                and re.search(r"\bsponsor decision\b", match.group(0))
                and not re.search(
                    r"\b(?:business|corporate|strategic|portfolio|pipeline|"
                    r"reprioriti[sz]|prioriti[sz]|resource allocation|reallocation)\b",
                    text,
                )
            ):
                continue
            if rule.rule_id == "eff.explicit_lack" and re.search(
                r"\bno (?:clinical )?(?:efficacy|activity|benefit|response) data\b",
                text,
            ):
                continue
            if rule.reason == REASON_SAFETY and re.search(
                r"\b(?:unrelated to|not related to|not due to|neither due to|not driven by|not based on)\b"
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
    high_confidence_reasons = {
        item.reason for item in evidence if item.confidence == "HIGH"
    }
    if high_confidence_reasons and all(
        item.confidence == "HIGH" or item.reason in high_confidence_reasons
        for item in evidence
    ):
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
            "V2_REVIEW_GUARD_OVERRIDES_LEGACY",
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
    if (
        any(item.reason == REASON_BUSINESS for item in evidence)
        and any(item.reason != REASON_BUSINESS for item in evidence)
        and re.search(
            r"\b(?:business|corporate|company) decision\b[^.;:]{0,80}"
            r"\bbased on\b[^.;:]{0,100}"
            r"\b(?:lack|failure|failed|insufficient|negative|unfavo(?:u)?rable|"
            r"safety|toxicity|efficacy|futility|benefit[- /:]?risk)\b",
            text,
        )
    ):
        # The corporate wording is only decision framing when the same clause
        # explicitly names the scientific cause on which the decision rests.
        evidence = tuple(item for item in evidence if item.reason != REASON_BUSINESS)
    if (
        any(item.reason == REASON_BUSINESS for item in evidence)
        and any(item.reason != REASON_BUSINESS for item in evidence)
        and not re.search(
            r"\b(?:portfolio|pipeline|resource allocation|reallocation|"
            r"re[- ]?prioriti[sz](?:ation|ed|ing|e)|prioriti[sz](?:ation|ed|ing)|strategic (?:reason|"
            r"reasons|decision|consideration|considerations|realignment)|"
            r"(?:business|corporate|company|development) strategy|"
            r"company governance|development priorities|"
            r"(?:due to|because of|for) (?:an? |the )?(?:business|corporate|"
            r"strategic) (?:decision|reasons?))\b",
            text,
        )
    ):
        # A generic business/corporate decision often introduces the actual
        # reason later in the same statement. Preserve the specific cause and
        # do not manufacture a second independent domain from the framing.
        evidence = tuple(item for item in evidence if item.reason != REASON_BUSINESS)
    if (
        any(item.reason == REASON_BUSINESS for item in evidence)
        and any(item.rule_id == "nonfailure.not_initiated" for item in evidence)
    ):
        # "Stopped before enrollment for strategic reasons" describes the
        # timing plus an explicit business cause. NOT_INITIATED must not become
        # a second causal domain in that construction.
        evidence = tuple(
            item for item in evidence if item.rule_id != "nonfailure.not_initiated"
        )
    unambiguous_never_started = bool(
        re.search(
            r"\b(?:study|trial) (?:was )?never (?:started|initiated|activated|opened)\b|"
            r"\b(?:study|trial) (?:was )?(?:cancelled|canceled) before (?:start|active|activation)\b|"
            r"\b(?:no|zero) (?:patients|participants|subjects) (?:were )?enrolled\b"
            r".{0,100}\badministratively withdrawn\b|"
            r"\b(?:no|zero) (?:patients|participants|subjects) enrolled onto (?:the )?study\b"
            r".{0,100}\badministratively withdrawn\b",
            text,
        )
    )
    if (
        unambiguous_never_started
        and any(item.rule_id == "nonfailure.not_initiated" for item in evidence)
    ):
        evidence = tuple(
            item
            for item in evidence
            if not (
                item.rule_id == "ops.recruitment"
                and re.fullmatch(
                    r"(?:no|zero) (?:human )?(?:patients|participants|subjects) "
                    r"(?:were )?(?:enrolled|recruited|accrued)",
                    normalize_reason(item.quote),
                )
            )
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
            _confidence(evidence, False),
            False,
            evidence,
            digest,
        )

    if biological:
        primary = biological[0]
        return ClassificationV2(
            OUTCOME_BIOLOGICAL,
            primary,
            tuple(biological[1:]),
            _confidence(evidence, False),
            False,
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
