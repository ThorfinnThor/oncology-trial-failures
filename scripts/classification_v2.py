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
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple


CLASSIFIER_VERSION = "2.0.0"

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
        r"\bnot providing efficacy\b",
        r"\babsence of (?:clinically significant )?(?:efficacy|activity|benefit|response)\b",
        r"\bno evidence of (?:potential |clinical )?efficacy\b",
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
        r"^(?:ae|aes|sae|saes)\.?$",
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
    ),
    _rule(
        "nonfailure.replacement",
        REASON_REPLACEMENT,
        "MEDIUM",
        r"\b(?:replaced|superseded) by (?:a )?(?:new|another|alternative|different) (?:study|trial|protocol)\b",
        r"\btransitioned? (?:the |all |last )?(?:participant|participants|patient|patients|subjects?) to (?:a |an )?(?:new|another|alternative) (?:study|trial|protocol)\b",
        r"\b(?:new|another|alternative) (?:study|trial|protocol) (?:was |has been )?(?:opened|activated)\b.{0,100}\b(?:original|this) (?:study|trial)\b",
        r"\b(?:participants|patients|subjects) (?:have been |were |are )?moved to (?:a )?continuation (?:study|trial|protocol)\b",
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
        for match in re.finditer(pattern, text, flags=re.IGNORECASE | re.DOTALL):
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
            if rule.rule_id == "saf.adverse_events" and re.search(
                r"\bno participants? (?:experiences?|experienced)\b.{0,100}\badverse events?\b"
                r"(?:.{0,40}\bto report\b)?",
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
        if reviewed_entry.get("v2_derivation") != "V2_UNRESOLVED_LEGACY_OPERATIONAL":
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
    placeholder = (
        not text
        or text in {"reason not provided", "not provided", "unknown", "n/a"}
        or "see detailed description" in text
        or "see termination reason in detailed description" in text
    )
    if not placeholder:
        return base

    description = normalize_reason(detailed_description or brief_summary)
    if not description:
        return base
    snippets = re.split(r"(?<=[.;])\s+", description)
    stop_cues = re.compile(r"\b(?:terminat|stopp|halt|suspend|withdraw|discontinu|clos)\w*\b")
    candidates = [snippet for snippet in snippets if stop_cues.search(snippet)]
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
