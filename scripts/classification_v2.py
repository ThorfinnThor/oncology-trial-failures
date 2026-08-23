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
        r"\black of (?:clinical |meaningful |anti[- ]?tumou?r )?(?:efficacy|effectiveness|activity|benefit|response)\b",
        r"\binsufficient (?:clinical |anti[- ]?tumou?r )?(?:efficacy|activity|benefit|response)\b",
        r"\bno (?:meaningful |clinical |anti[- ]?tumou?r )?(?:efficacy|activity|benefit|response|treatment effect)\b",
        r"\blimited (?:clinical |anti[- ]?tumou?r )?(?:efficacy|activity|benefit)\b",
        r"\bnot providing efficacy\b",
        r"\babsence of (?:clinically significant )?(?:efficacy|activity|benefit|response)\b",
        r"\black of (?:evidence of )?(?:clinical )?benefit\b",
        r"\bno objective response\b",
        r"\black of objective response\b",
        r"\bpoor response to treatment\b",
        r"\blimited (?:anti[- ]?tumou?r )?activity\b",
        r"\black of improved efficacy\b",
        r"\bbenefit (?:was |is )?not significant\b",
        r"^(?:due to )?efficacy concerns?\.?$",
        r"\bnegative results? from (?:an? |the |other )?(?:study|studies|trial|trials)\b",
    ),
    _rule(
        "eff.endpoint_failure",
        REASON_EFFICACY,
        "HIGH",
        r"\b(?:primary |secondary )?end[- ]?point(?:s)? (?:was |were )?(?:not met|failed|not achieved|not reached)\b",
        r"\b(?:did not|failed to) meet (?:the )?(?:primary |secondary )?end[- ]?point\b",
        r"\bfailed (?:its |the )?(?:primary |secondary )?(?:efficacy )?objective\b",
        r"\b(?:primary |secondary )?objectives? (?:was |were )?(?:not met|failed|not achieved|not reached)\b",
        r"\bcriteria for (?:the )?(?:second|next) stage (?:were )?not met\b",
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
        r"\bunlikely to (?:meet|achieve) (?:the )?(?:primary )?(?:efficacy )?end[- ]?point\b",
        r"\blow likelihood of (?:meeting|achieving) (?:the )?(?:primary )?(?:efficacy )?(?:end[- ]?point|objective)\b",
        r"\bno signal of (?:clinical )?(?:efficacy|activity)\b",
        r"\btarget engagement (?:did |was )?not translat(?:e|ed) (?:into|to) (?:meaningful )?(?:clinical )?(?:benefit|activity|response)\b",
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
        r"\bdose[- ]limiting toxicit(?:y|ies)\b",
        r"\bdlts?\b",
        r"\bnot tolerable\b",
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
        r"\b(?:significant |severe |serious |high )?(?:toxicity|toxicities)\b",
        r"\b(?:significant |severe |serious )?adverse effects?\b",
        r"\black of safety\b",
    ),
    _rule(
        "saf.explicit",
        REASON_SAFETY,
        "HIGH",
        r"^(?:due to )?safety(?: reasons?| concerns?| issues?)?\.?$",
        r"\b(?:terminated|stopped|halted|suspended|withdrawn) (?:early )?(?:due to|because of|for) (?:an? )?(?:safety concern|safety concerns|safety issue|safety issues|safety reasons?)\b",
        r"\b(?:safety concern|safety concerns|safety issue|safety issues) (?:caused|prompted|led to|resulted in)\b",
        r"\bbecause of (?:the )?(?:safety concern|safety concerns|safety issue|safety issues)\b",
        r"\bbecause of [^.]{0,80}\b(?:safety concern|safety concerns|safety issue|safety issues)\b",
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
        r"\b(?:lack of|insufficient) (?:the )?(?:eligible )?patient population\b",
        r"\black of (?:eligible )?volunteers?\b",
        r"\b(?:accrual|enrolment|enrollment|recruitment) (?:goal|target) (?:was )?not (?:met|reached|achieved)\b",
        r"\bfailure to meet (?:the )?(?:accrual|enrolment|enrollment|recruitment) (?:goals?|targets?)\b",
        r"\b[<]?\s*75% participant accrual\b",
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
        r"\black of (?:future |further )?funding\b",
        r"\bfunding concerns?\b",
        r"\bfinancial (?:issue|issues|constraint|constraints|reasons?)\b",
        r"^not funded\.?$",
        r"\black of financial support\b",
        r"\binstitutional and funding constraints?\b",
    ),
    _rule(
        "ops.supply",
        REASON_SUPPLY,
        "HIGH",
        r"\b(?:drug|study drug|study agent|medication|investigational product|product|device|equipment|formulation) (?:was |is )?(?:unavailable|no longer available|not available|expired|no longer produced|no longer manufactured|discontinued by the manufacturer)\b",
        r"\b(?:drug|product|material|raw material) supply (?:issue|issues|shortage|shortages|constraint|constraints)\b",
        r"\bmanufactur(?:ing|er) (?:issue|issues|problem|problems|delay|delays|stopped|halted|ceased)\b",
        r"\b(?:production|manufacturing) (?:stopped|halted|ceased|unavailable)\b",
        r"\black of (?:study )?drug supply\b",
        r"\b(?:sponsor|company|manufacturer) (?:is |was )?no longer (?:producing|manufacturing|providing) (?:the )?(?:study )?(?:drug|agent|product|device)\b",
        r"\bno (?:treatment |dose |cohort )?slots? (?:were |was )?available\b",
        r"^(?:study )?drugs? (?:is |are |was |were )?unavailable\.?$",
        r"^(?:study )?drug supply\.?$",
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
    ),
    _rule(
        "ops.business",
        REASON_BUSINESS,
        "HIGH",
        r"\b(?:business|commercial|strategic|corporate) reasons?\b",
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
        r"\b(?:outdated|obsolete) (?:study |trial )?design\b",
        r"\bstandard of care (?:has |had )?(?:changed|evolved)\b",
        r"\bchanging standard of care\b",
        r"\bstandard of care .{0,80}(?:updated|revised|now includes?)\b",
        r"\b(?:treatment|therapeutic|competitive) landscape (?:has |had )?(?:changed|evolved)\b",
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
    ),
    _rule(
        "ops.external",
        REASON_EXTERNAL,
        "HIGH",
        r"\b(?:covid[- ]?19|covid|pandemic) (?:related )?(?:restrictions|disruption|disruptions|impact|issues|challenges)\b",
        r"\b(?:covid[- ]?19|covid|pandemic) (?:caused|forced|led to) .{0,80}(?:site|sites|recruitment|enrollment|trial|study) (?:to )?(?:close|shut down|stop|halt|suspend)\b",
        r"\bsite (?:closure|closures|closed)\b",
        r"\blogistical (?:issue|issues|problem|problems|constraints|challenges)\b",
    ),
    _rule(
        "ops.other",
        REASON_OPERATIONAL_OTHER,
        "MEDIUM",
        r"\b(?:contract|agreement) (?:issue|issues|could not be finalized|was not finalized)\b",
        r"\btechnical (?:issue|issues|problem|problems|failure|failures|infeasibility)\b",
        r"\boperational (?:issue|issues|problem|problems|constraints|reasons)\b",
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
    ),
    _rule(
        "nonfailure.replacement",
        REASON_REPLACEMENT,
        "MEDIUM",
        r"\b(?:replaced|superseded) by (?:a )?(?:new|another|alternative) (?:study|trial|protocol)\b",
        r"\btransitioned? (?:the |all |last )?(?:participant|participants|patient|patients|subjects?) to (?:a |an )?(?:new|another|alternative) (?:study|trial|protocol)\b",
        r"\b(?:new|another|alternative) (?:study|trial|protocol) (?:was |has been )?(?:opened|activated)\b.{0,100}\b(?:original|this) (?:study|trial)\b",
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
)

EXPLICIT_NEGATIONS: Tuple[str, ...] = (
    r"\bnot due to\b",
    r"\bnot (?:\w+\s+){0,5}(?:due to|because of|related to|prompted by)\b",
    r"\bnot because of\b",
    r"\bnot related to\b",
    r"\bunrelated to\b",
    r"\bnot prompted by\b",
    r"\bwithout (?:any )?\b",
    r"\bno (?:new )?(?:safety|efficacy) (?:concern|concerns|issue|issues|signal|signals)\b",
    r"\b(?:safety|efficacy) (?:profile )?(?:remained|was) (?:unchanged|acceptable|manageable|favorable|favourable)\b",
    r"\bwell[- ]tolerated\b",
    r"\bno (?:observed |treatment[- ]related |related )?(?:dlts?|saes?|deaths?|toxicities|adverse events?)\b",
)


def _clause_bounds(text: str, start: int, end: int) -> Tuple[int, int]:
    left = max(text.rfind(".", 0, start), text.rfind(";", 0, start), text.rfind(":", 0, start))
    rights = [pos for pos in (text.find(".", end), text.find(";", end), text.find(":", end)) if pos >= 0]
    right = min(rights) if rights else len(text)
    return left + 1, right


def _is_negated(text: str, start: int, end: int) -> bool:
    left, right = _clause_bounds(text, start, end)
    clause = text[left:right]
    local_start = start - left
    before = clause[max(0, local_start - 90):local_start]
    nearby = clause[max(0, local_start - 100):min(len(clause), local_start + (end - start) + 55)]
    if re.search(r"\b(?:no|not|never|without)\s+(?:directly\s+)?(?:due to|because of|related to|prompted by)?\s*$", before):
        return True
    return any(re.search(pattern, nearby) for pattern in EXPLICIT_NEGATIONS)


def _find_rule_evidence(text: str, rule: Rule) -> List[Evidence]:
    found: List[Evidence] = []
    for pattern in rule.patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE | re.DOTALL):
            if _is_negated(text, match.start(), match.end()):
                continue
            if rule.rule_id == "eff.futility" and re.search(
                r"\b(?:accrual|enrolment|enrollment|recruitment) futility\b",
                text,
            ):
                continue
            if rule.rule_id == "eff.explicit_lack" and re.search(
                r"\bno response (?:from|by) (?:the )?"
                r"(?:pi|principal investigator|investigator|site|sponsor|irb|team|institution)\b",
                text,
            ):
                continue
            if rule.rule_id == "saf.adverse_events" and re.search(
                r"\bno participant experiences?\b.{0,100}\badverse events?\b"
                r".{0,40}\bto report\b",
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
        return _from_reviewed_entry(digest, reviewed_index[digest])
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
    reasons: List[str] = []
    for item in evidence:
        if item.reason not in reasons:
            reasons.append(item.reason)

    unspecified_bio = []
    for pattern in BIOLOGICAL_UNSPECIFIED_PATTERNS:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE | re.DOTALL):
            if not _is_negated(text, match.start(), match.end()):
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
    non_failure = [reason for reason in reasons if reason in {REASON_PLANNED, REASON_REPLACEMENT}]

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
