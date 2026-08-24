#!/usr/bin/env python3
"""Explain why each Classification V2 review group remains unresolved.

The disposition is not a replacement classification. It gives every grouped
review item an explicit, reproducible reason for remaining review-gated and is
rebuilt for each ingest snapshot.
"""

from __future__ import annotations

import re
from collections import Counter
from typing import Any, Dict, Iterable, List, Mapping, Tuple

try:
    from classification_v2 import (
        CLASSIFIER_VERSION,
        OUTCOME_MIXED,
        REASON_BIO_UNSPECIFIED,
        is_placeholder_reason,
        normalize_reason,
    )
except ImportError:
    from scripts.classification_v2 import (
        CLASSIFIER_VERSION,
        OUTCOME_MIXED,
        REASON_BIO_UNSPECIFIED,
        is_placeholder_reason,
        normalize_reason,
    )


DISPOSITION_NOTES = {
    "MISSING_STOP_REASON": (
        "ClinicalTrials.gov supplies no stop-reason text. No semantic cause can "
        "be asserted without another explicit primary-source statement."
    ),
    "PLACEHOLDER_WITHOUT_EXPLICIT_SOURCE_CAUSE": (
        "The stop-reason field is a placeholder and the checked registry "
        "description did not provide a direct high-confidence causal sentence."
    ),
    "MULTIPLE_EXPLICIT_CAUSES": (
        "The text states causes from more than one semantic domain. The causes "
        "are preserved and require adjudication instead of forced precedence."
    ),
    "BIOLOGICAL_DOMAIN_UNSPECIFIED": (
        "The text indicates an unfavorable biological or benefit-risk result but "
        "does not support a reliable efficacy-versus-safety distinction."
    ),
    "GENERIC_ACTOR_OR_DECISION_ONLY": (
        "The text identifies who acted or that a decision was made, but does not "
        "state the underlying causal reason."
    ),
    "STATUS_OR_ACTION_WITHOUT_CAUSE": (
        "The text reports a stop, withdrawal, closure, or status change without "
        "an affirmative causal explanation."
    ),
    "NEGATED_SIGNAL_WITHOUT_AFFIRMATIVE_CAUSE": (
        "The text says what did not cause the stop, such as no safety concern, "
        "but does not state what did cause it."
    ),
    "ANALYSIS_OR_REVIEW_WITHOUT_RESULT": (
        "The text mentions analysis, review, data, or a committee without a "
        "directional result that supports a causal category."
    ),
    "GENERIC_CAUSE_CATEGORY_WITHOUT_DETAIL": (
        "The text names only a broad category such as administrative or business "
        "reasons and was intentionally retained for review by the semantic audit."
    ),
    "PROVISIONAL_OR_FUTURE_PLAN": (
        "The text describes a pending, temporary, or future state rather than a "
        "completed causal finding."
    ),
    "REGISTRY_OR_REPORTING_ADMIN_TEXT": (
        "The wording concerns registration, duplicate-record handling, reporting, "
        "or another registry-administration action rather than the study-level cause."
    ),
    "DOMAIN_MENTION_WITHOUT_DIRECTIONAL_RESULT": (
        "The text mentions a medical or scientific domain such as safety or efficacy "
        "but does not state an adverse directional result that caused the stop."
    ),
    "PROGRAM_ACTION_WITHOUT_UNDERLYING_CAUSE": (
        "The text states that a study or development program ended, but the underlying "
        "medical, operational, regulatory, or strategic cause is not supplied."
    ),
    "RETENTION_OR_FOLLOW_UP_LIMITATION": (
        "The text describes follow-up, retention, withdrawal, or data-collection "
        "limitations without enough causal detail for a supported V2 category."
    ),
    "INSUFFICIENT_OR_LOW_QUALITY_DATA": (
        "The text reports insufficient or low-quality data, but does not establish "
        "whether the underlying cause was recruitment, feasibility, efficacy, or another domain."
    ),
    "SITE_OR_INSTITUTION_ADMIN_TEXT": (
        "The wording describes a site, department, institution, or local administrative "
        "action but does not state a supported underlying causal domain."
    ),
    "COMPLETION_OR_TRANSITION_CONTEXT_UNCLEAR": (
        "The text refers to completion, a study part, follow-on activity, or a transition, "
        "but does not establish whether this was a planned milestone or a failure cause."
    ),
    "EXPLICIT_BUT_UNMAPPED_CAUSE": (
        "The text contains an explicit causal connector, but the stated cause is too "
        "ambiguous or outside the supported taxonomy for a reliable classification."
    ),
    "ABBREVIATION_OR_FRAGMENT": (
        "The available wording is an abbreviation or short fragment that does not "
        "contain a complete, affirmative causal statement."
    ),
    "OTHER_AMBIGUOUS_TEXT": (
        "The available wording is ambiguous, incomplete, or not a direct causal "
        "statement under the conservative V2 evidence policy."
    ),
}


ACTOR_ONLY = re.compile(
    r"^(?:per |at the request of )?(?:the )?"
    r"(?:sponsor|company|business|corporate|strategic|administrative|management|"
    r"investigator|principal investigator|pi|funder|board|committee|dmc|dsmb|idmc)"
    r"(?:'s)?\s+(?:decision|request|reasons?|recommendation|discretion|choice)\.?$"
)
STATUS_ONLY = re.compile(
    r"^(?:the )?(?:study|trial|program|programme|development|compound|substance|"
    r"research|enrollment|enrolment|recruitment|accrual)?\s*"
    r"(?:was |is |has been )?(?:terminated|stopped|halted|closed|discontinued|"
    r"withdrawn|cancelled|canceled|abandoned|finished|not completed)\.?$"
)
GENERIC_CATEGORY = re.compile(
    r"^(?:due to )?(?:unspecified )?(?:administrative|business|corporate|strategic|"
    r"operational|scientific|ethical|management) (?:reason|reasons|decision|"
    r"consideration|considerations|issue|issues|change|changes)\.?$"
)
NEGATED_CAUSE = re.compile(
    r"\b(?:not due to|not related to|unrelated to|not based on|not driven by|"
    r"not linked to|not prompted by|no)\b[^.;:]{0,100}"
    r"\b(?:safety|efficacy|tolerability|risk[- /:]?benefit|benefit[- /:]?risk|"
    r"adverse events?|regulatory)\b"
)
ANALYSIS_WITHOUT_RESULT = re.compile(
    r"\b(?:interim analysis|analysis|analyses|data review|safety review|efficacy "
    r"review|results? review|review of (?:the )?(?:available )?data|dmc|dsmb|idmc|"
    r"committee recommendation|preliminary results?|available data)\b"
)
PROVISIONAL = re.compile(
    r"\b(?:pending|awaiting|under discussion|being considered|considering|"
    r"temporarily|temporary hold|deferred|reevaluating|re-evaluating|to be "
    r"determined|tbd)\b"
)
REGISTRY_OR_REPORTING = re.compile(
    r"\b(?:clinicaltrials\.gov|trial registration|registry (?:entry|record)|duplicate "
    r"(?:entry|record|registration)|registration (?:error|mistake)|entered in error|"
    r"reporting (?:error|issue)|submission discarded)\b"
)
DOMAIN_MENTION = re.compile(
    r"\b(?:efficacy|effectiveness|safety|tolerability|toxicity|futility|"
    r"benefit\s*[- /:]\s*risk|risk\s*[- /:]\s*benefit)\b"
)
PROGRAM_ACTION = re.compile(
    r"\b(?:study|trial|program|programme|development|compound|asset)\b[^.;:]{0,100}"
    r"\b(?:terminated|discontinued|stopped|closed|halted|withdrawn|cancelled|"
    r"canceled|abandoned|ended)\b|"
    r"\b(?:terminated|discontinued|stopped|closed|halted|withdrawn|cancelled|"
    r"canceled|abandoned|ended)\b[^.;:]{0,100}\b(?:study|trial|program|programme|"
    r"development|compound|asset)\b"
)
RETENTION_OR_FOLLOW_UP = re.compile(
    r"\b(?:follow[- ]?up|retention|lost to follow[- ]?up|drop[- ]?out|withdrawal "
    r"rate|participant withdrawal|patient withdrawal|compliance)\b"
)
INSUFFICIENT_DATA = re.compile(
    r"\b(?:insufficient|inadequate|limited|poor|lack of|not enough)\b[^.;:]{0,90}"
    r"\b(?:data|information|evidence|data quality|sample|cases?|events?)\b"
)
SITE_OR_INSTITUTION_ADMIN = re.compile(
    r"\b(?:site|center|centre|institution|department|faculty|research office|local team)\b"
    r"[^.;:]{0,120}\b(?:administrative|decision|request|closed|closure|withdrew|"
    r"withdrawal|stopped|terminated|unable to continue)\b|"
    r"\b(?:administrative|decision|request|closed|closure|withdrew|withdrawal|"
    r"stopped|terminated|unable to continue)\b[^.;:]{0,120}"
    r"\b(?:site|center|centre|institution|department|faculty|research office|local team)\b"
)
COMPLETION_OR_TRANSITION = re.compile(
    r"\b(?:completed|completion|complete|end of (?:the )?(?:study|trial)|"
    r"part [a-z0-9]+|phase [1234][ab]?|follow[- ]?on|continuation study|"
    r"extension study|transition(?:ed|ing)?)\b"
)
CAUSAL_CONNECTOR = re.compile(
    r"\b(?:due to|because of|as a result of|resulting from|owing to|secondary to)\b"
)


def review_disposition(group: Mapping[str, Any]) -> Tuple[str, str]:
    """Return a deterministic disposition code and review priority."""

    outcome = str(group.get("suggested_outcome_v2") or "")
    primary = str(group.get("suggested_primary_reason_v2") or "")
    text = normalize_reason(group.get("why_stopped"))
    evidence = str(group.get("evidence") or "")

    if outcome == OUTCOME_MIXED:
        return "MULTIPLE_EXPLICIT_CAUSES", "HIGH"
    if primary == REASON_BIO_UNSPECIFIED:
        return "BIOLOGICAL_DOMAIN_UNSPECIFIED", "HIGH"
    if not text:
        return "MISSING_STOP_REASON", "LOW"
    if is_placeholder_reason(text):
        return "PLACEHOLDER_WITHOUT_EXPLICIT_SOURCE_CAUSE", "LOW"
    if GENERIC_CATEGORY.search(text):
        return "GENERIC_CAUSE_CATEGORY_WITHOUT_DETAIL", "LOW"
    if ACTOR_ONLY.search(text):
        return "GENERIC_ACTOR_OR_DECISION_ONLY", "LOW"
    if NEGATED_CAUSE.search(text):
        return "NEGATED_SIGNAL_WITHOUT_AFFIRMATIVE_CAUSE", "MEDIUM"
    if ANALYSIS_WITHOUT_RESULT.search(text):
        return "ANALYSIS_OR_REVIEW_WITHOUT_RESULT", "MEDIUM"
    if PROVISIONAL.search(text):
        return "PROVISIONAL_OR_FUTURE_PLAN", "MEDIUM"
    if "unknown.action_without_cause" in evidence or STATUS_ONLY.search(text):
        return "STATUS_OR_ACTION_WITHOUT_CAUSE", "LOW"
    if REGISTRY_OR_REPORTING.search(text):
        return "REGISTRY_OR_REPORTING_ADMIN_TEXT", "LOW"
    if DOMAIN_MENTION.search(text):
        return "DOMAIN_MENTION_WITHOUT_DIRECTIONAL_RESULT", "HIGH"
    if RETENTION_OR_FOLLOW_UP.search(text):
        return "RETENTION_OR_FOLLOW_UP_LIMITATION", "MEDIUM"
    if INSUFFICIENT_DATA.search(text):
        return "INSUFFICIENT_OR_LOW_QUALITY_DATA", "HIGH"
    if SITE_OR_INSTITUTION_ADMIN.search(text):
        return "SITE_OR_INSTITUTION_ADMIN_TEXT", "MEDIUM"
    if COMPLETION_OR_TRANSITION.search(text):
        return "COMPLETION_OR_TRANSITION_CONTEXT_UNCLEAR", "MEDIUM"
    if CAUSAL_CONNECTOR.search(text):
        return "EXPLICIT_BUT_UNMAPPED_CAUSE", "HIGH"
    if PROGRAM_ACTION.search(text):
        return "PROGRAM_ACTION_WITHOUT_UNDERLYING_CAUSE", "MEDIUM"
    if len(text) <= 32 or len(text.split()) <= 3:
        return "ABBREVIATION_OR_FRAGMENT", "MEDIUM"
    return "OTHER_AMBIGUOUS_TEXT", "HIGH"


def augment_review_queue(
    queue: Iterable[Mapping[str, Any]],
) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, int]]]:
    """Add exactly one documented disposition to every grouped queue item."""

    output: List[Dict[str, Any]] = []
    disposition_groups: Counter[str] = Counter()
    disposition_records: Counter[str] = Counter()
    priority_groups: Counter[str] = Counter()
    priority_records: Counter[str] = Counter()
    seen_hashes = set()

    for source in queue:
        item = dict(source)
        digest = str(item.get("classification_text_hash") or "")
        if not digest or digest in seen_hashes:
            raise ValueError(f"Missing or duplicate review-group hash: {digest!r}")
        seen_hashes.add(digest)
        disposition, priority = review_disposition(item)
        if disposition not in DISPOSITION_NOTES:
            raise ValueError(f"Undocumented review disposition: {disposition}")
        record_count = int(item.get("record_count") or 0)
        item["review_disposition"] = disposition
        item["review_priority"] = priority
        item["review_disposition_note"] = DISPOSITION_NOTES[disposition]
        output.append(item)
        disposition_groups[disposition] += 1
        disposition_records[disposition] += record_count
        priority_groups[priority] += 1
        priority_records[priority] += record_count

    summary = {
        "disposition_group_counts": dict(disposition_groups.most_common()),
        "disposition_record_counts": dict(disposition_records.most_common()),
        "priority_group_counts": dict(priority_groups.most_common()),
        "priority_record_counts": dict(priority_records.most_common()),
    }
    return output, summary


def build_disposition_payload(
    queue: List[Dict[str, Any]], summary: Mapping[str, Mapping[str, int]]
) -> Dict[str, Any]:
    return {
        "schema_version": 1,
        "classifier_version": CLASSIFIER_VERSION,
        "review_group_count": len(queue),
        "review_record_count": sum(int(item["record_count"]) for item in queue),
        **summary,
        "disposition_notes": DISPOSITION_NOTES,
        "groups": queue,
    }
