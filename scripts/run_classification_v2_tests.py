#!/usr/bin/env python3
"""Fast regression tests for Classification V2 and ingest integration."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, Iterable

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.fetch_ctgov_oncology_failures import extract_record
from scripts.enrich_classification_context_v2 import proposal_for
from scripts.ingest_changes import build_ingest_change_report
from scripts.import_classification_review_batch_v2 import validate_semantics
from scripts.reclassify_dataset_v2 import classify_rows
from scripts.classification_review_dispositions_v2 import (
    augment_review_queue,
    review_disposition,
)

try:
    from classification_v2 import (
        CLASSIFIER_VERSION,
        classify_reason_v2,
        classify_with_v2_fallback,
        load_reviewed_reason_index,
    )
except ImportError:
    from scripts.classification_v2 import (
        CLASSIFIER_VERSION,
        classify_reason_v2,
        classify_with_v2_fallback,
        load_reviewed_reason_index,
    )


def load_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def main() -> None:
    failures = []
    cases = list(load_jsonl(Path("tests/golden_classification_v2.jsonl")))
    for index, case in enumerate(cases, start=1):
        result = classify_reason_v2(case["why_stopped"])
        actual = (result.outcome, result.primary_reason, result.needs_review)
        expected = (case["outcome"], case["primary_reason"], case["needs_review"])
        if actual != expected:
            failures.append(
                f"Case {index}: {case['why_stopped']!r}\n"
                f"  expected {expected}\n  actual   {actual}\n"
                f"  evidence {result.evidence_string()}"
            )
        if result.evidence and any(not item.quote.strip() for item in result.evidence):
            failures.append(f"Case {index}: empty evidence quote")

    disposition_cases = (
        ("", "UNKNOWN", "UNSPECIFIED", "MISSING_STOP_REASON"),
        (
            "See detailed description",
            "UNKNOWN",
            "UNSPECIFIED",
            "PLACEHOLDER_WITHOUT_EXPLICIT_SOURCE_CAUSE",
        ),
        ("Study terminated", "UNKNOWN", "UNSPECIFIED", "STATUS_OR_ACTION_WITHOUT_CAUSE"),
        (
            "Sponsor decision, not related to safety",
            "UNKNOWN",
            "UNSPECIFIED",
            "NEGATED_SIGNAL_WITHOUT_AFFIRMATIVE_CAUSE",
        ),
        (
            "Interim analysis",
            "UNKNOWN",
            "UNSPECIFIED",
            "ANALYSIS_OR_REVIEW_WITHOUT_RESULT",
        ),
        (
            "Administrative reasons",
            "UNKNOWN",
            "UNSPECIFIED",
            "GENERIC_CAUSE_CATEGORY_WITHOUT_DETAIL",
        ),
        (
            "Awaiting additional information",
            "UNKNOWN",
            "UNSPECIFIED",
            "PROVISIONAL_OR_FUTURE_PLAN",
        ),
        (
            "Reason wording cannot support a direct cause",
            "UNKNOWN",
            "UNSPECIFIED",
            "OTHER_AMBIGUOUS_TEXT",
        ),
        (
            "This is a duplicate ClinicalTrials.gov registration",
            "UNKNOWN",
            "UNSPECIFIED",
            "REGISTRY_OR_REPORTING_ADMIN_TEXT",
        ),
        (
            "Efficacy evaluation was discussed",
            "UNKNOWN",
            "UNSPECIFIED",
            "DOMAIN_MENTION_WITHOUT_DIRECTIONAL_RESULT",
        ),
        (
            "The development program was discontinued after review",
            "UNKNOWN",
            "UNSPECIFIED",
            "PROGRAM_ACTION_WITHOUT_UNDERLYING_CAUSE",
        ),
        (
            "The development program was discontinued after a meeting",
            "UNKNOWN",
            "UNSPECIFIED",
            "PROGRAM_ACTION_WITHOUT_UNDERLYING_CAUSE",
        ),
        (
            "Participants were lost to follow-up",
            "UNKNOWN",
            "UNSPECIFIED",
            "RETENTION_OR_FOLLOW_UP_LIMITATION",
        ),
        (
            "Insufficient data were available",
            "UNKNOWN",
            "UNSPECIFIED",
            "INSUFFICIENT_OR_LOW_QUALITY_DATA",
        ),
        ("Unclear note", "UNKNOWN", "UNSPECIFIED", "ABBREVIATION_OR_FRAGMENT"),
        (
            "The local institution requested administrative closure",
            "UNKNOWN",
            "UNSPECIFIED",
            "SITE_OR_INSTITUTION_ADMIN_TEXT",
        ),
        (
            "Part B was complete and Part C was discussed",
            "UNKNOWN",
            "UNSPECIFIED",
            "COMPLETION_OR_TRANSITION_CONTEXT_UNCLEAR",
        ),
        (
            "The work stopped due to exceptional circumstances",
            "UNKNOWN",
            "UNSPECIFIED",
            "EXPLICIT_BUT_UNMAPPED_CAUSE",
        ),
        ("Two causes", "MIXED_CAUSES", "MULTIPLE", "MULTIPLE_EXPLICIT_CAUSES"),
        (
            "Unfavorable benefit-risk profile",
            "BIOLOGICAL_FAILURE",
            "BIOLOGICAL_UNSPECIFIED",
            "BIOLOGICAL_DOMAIN_UNSPECIFIED",
        ),
    )
    disposition_queue = []
    for index, (text, outcome, primary, expected) in enumerate(disposition_cases):
        item = {
            "classification_text_hash": f"{index:020x}",
            "why_stopped": text,
            "record_count": index + 1,
            "suggested_outcome_v2": outcome,
            "suggested_primary_reason_v2": primary,
            "evidence": "",
        }
        actual, _ = review_disposition(item)
        if actual != expected:
            failures.append(
                f"Review disposition for {text!r}: expected {expected}, got {actual}"
            )
        disposition_queue.append(item)
    augmented_queue, disposition_summary = augment_review_queue(disposition_queue)
    if len(augmented_queue) != len(disposition_queue):
        failures.append("Review disposition augmentation lost queue groups")
    if sum(disposition_summary["disposition_group_counts"].values()) != len(disposition_queue):
        failures.append("Review disposition group counts do not sum to the queue size")
    if sum(disposition_summary["disposition_record_counts"].values()) != sum(
        item["record_count"] for item in disposition_queue
    ):
        failures.append("Review disposition record counts do not sum to the queue records")

    reviewed = load_reviewed_reason_index("data/classification_reviewed_reasons_v2.json")
    reviewed_result = classify_reason_v2("Slow accrual", reviewed)
    if not reviewed_result.evidence or reviewed_result.evidence[0].rule_id != "reviewed.exact_reason":
        failures.append("Reviewed exact reason did not override the rule classifier")

    unresolved_legacy = {
        classify_reason_v2("Difficulty in recruiting").normalized_text_hash: {
            "outcome": "UNKNOWN",
            "primary_reason": "UNSPECIFIED",
            "needs_review": True,
            "v2_derivation": "V2_UNRESOLVED_LEGACY_OPERATIONAL",
            "example_text": "Difficulty in recruiting",
        }
    }
    upgraded_result = classify_reason_v2("Difficulty in recruiting", unresolved_legacy)
    if upgraded_result.primary_reason != "RECRUITMENT" or upgraded_result.needs_review:
        failures.append("Unresolved legacy cache entry blocked a specific V2 rule")

    unclear_legacy = {
        classify_reason_v2("Portfolio reprioritization").normalized_text_hash: {
            "outcome": "UNKNOWN",
            "primary_reason": "UNSPECIFIED",
            "needs_review": True,
            "v2_derivation": "AUDIT_LEGACY_MAPPING",
            "example_text": "Portfolio reprioritization",
        }
    }
    upgraded_unclear = classify_reason_v2("Portfolio reprioritization", unclear_legacy)
    if upgraded_unclear.primary_reason != "BUSINESS_STRATEGY" or upgraded_unclear.needs_review:
        failures.append("Unresolved legacy UNKNOWN cache entry blocked a specific V2 rule")

    manual_review = {
        classify_reason_v2("Portfolio reprioritization").normalized_text_hash: {
            "outcome": "UNKNOWN",
            "primary_reason": "UNSPECIFIED",
            "needs_review": True,
            "v2_derivation": "MANUAL_V2_DECISION",
            "example_text": "Portfolio reprioritization",
        }
    }
    retained_manual_review = classify_reason_v2(
        "Portfolio reprioritization", manual_review
    )
    if not retained_manual_review.needs_review:
        failures.append("A manual V2 review decision lost precedence")

    fallback = classify_with_v2_fallback(
        "See detailed description",
        "",
        "The study was terminated due to unacceptable toxicity. No further participants were enrolled.",
    )
    if fallback.primary_reason != "SAFETY" or fallback.needs_review:
        failures.append(f"Description fallback failed: {fallback}")

    overlapping_efficacy = classify_reason_v2(
        "The trial was terminated due to lack of efficacy at the interim analysis."
    )
    if overlapping_efficacy.confidence != "HIGH":
        failures.append(
            "A direct high-confidence efficacy cause was downgraded by an "
            "overlapping medium-confidence rule"
        )

    fallback_row = {
        "nct_id": "NCT00000002",
        "why_stopped": "See detailed description",
        **fallback.as_record_fields(),
        "classification_source": "DESCRIPTION_FALLBACK",
    }
    fallback_row["classification_version"] = "2.1.0"
    fallback_migrated, _, _ = classify_rows([fallback_row], {})
    if (
        fallback_migrated[0]["classification_primary_reason_v2"] != "SAFETY"
        or fallback_migrated[0]["classification_version"] != CLASSIFIER_VERSION
        or fallback_migrated[0]["classification_source"] != "DESCRIPTION_FALLBACK"
        or fallback_migrated[0]["classification_resolution_status"] != "RESOLVED"
        or fallback_migrated[0]["classification_final_category"] != "SAFETY"
    ):
        failures.append("Snapshot migration did not revalidate a description fallback")

    decision_rows, _, _ = classify_rows(
        [{"nct_id": "NCT00000010", "why_stopped": "Sponsor decision"}],
        {},
    )
    decision_row = decision_rows[0]
    if (
        decision_row["classification_resolution_status"] != "RESOLVED"
        or decision_row["classification_final_outcome"] != "CAUSE_NOT_STATED"
        or decision_row["classification_final_category"]
        != "DECISION_WITHOUT_STATED_CAUSE"
        or not decision_row["classification_final_explanation"]
    ):
        failures.append("An actor-only decision did not receive its terminal category")

    manual_row = {
        "nct_id": "NCT00000003",
        "why_stopped": "Sponsor decision",
        "classification_label": "BIOLOGICAL_FAILURE",
        "classification_reason": "SAFETY",
        "classification_confidence": "HIGH",
        "classification_evidence": "Manually verified primary source",
        "classification_outcome_v2": "BIOLOGICAL_FAILURE",
        "classification_primary_reason_v2": "SAFETY",
        "classification_secondary_reasons_v2": "",
        "classification_needs_review": False,
        "classification_version": CLASSIFIER_VERSION,
        "classification_text_hash": "manual",
        "classification_source": "MANUAL_NCT_OVERRIDE",
    }
    manual_migrated, _, _ = classify_rows([manual_row], {})
    if manual_migrated[0]["classification_primary_reason_v2"] != "SAFETY":
        failures.append("Snapshot migration overwrote a manual NCT override")

    no_fallback = classify_with_v2_fallback(
        "Sponsor decision",
        "",
        "Background safety monitoring was performed throughout the study.",
    )
    if (
        no_fallback.outcome != "CAUSE_NOT_STATED"
        or no_fallback.primary_reason != "DECISION_WITHOUT_STATED_CAUSE"
    ):
        failures.append(f"Non-placeholder text was incorrectly augmented: {no_fallback}")

    fallback_proposal = proposal_for(
        {
            "nct_id": "NCT00000004",
            "why_stopped": "See detailed description",
        },
        {
            "statusModule": {"whyStopped": "See detailed description"},
            "descriptionModule": {
                "detailedDescription": (
                    "The study was terminated due to unacceptable toxicity. "
                    "No further participants were enrolled."
                )
            },
        },
        {},
    )
    if (
        not fallback_proposal
        or fallback_proposal["proposed_primary_reason_v2"] != "SAFETY"
    ):
        failures.append(f"Context enrichment did not propose the explicit cause: {fallback_proposal}")

    nonplaceholder_proposal = proposal_for(
        {"nct_id": "NCT00000005", "why_stopped": "Sponsor decision"},
        {
            "statusModule": {"whyStopped": "Sponsor decision"},
            "descriptionModule": {
                "detailedDescription": "The study was terminated due to unacceptable toxicity."
            },
        },
        {},
    )
    if nonplaceholder_proposal is not None:
        failures.append("Context enrichment mined a non-placeholder reason")

    generic_treatment_proposal = proposal_for(
        {"nct_id": "NCT00000006", "why_stopped": ""},
        {
            "statusModule": {"whyStopped": ""},
            "descriptionModule": {
                "detailedDescription": (
                    "Participants will continue study treatment until disease progression, "
                    "unacceptable toxicity, consent withdrawal, or refusal of treatment."
                )
            },
        },
        {},
    )
    if generic_treatment_proposal is not None:
        failures.append("Context enrichment treated generic discontinuation criteria as a cause")

    individual_discontinuation_proposal = proposal_for(
        {"nct_id": "NCT00000008", "why_stopped": ""},
        {
            "statusModule": {"whyStopped": ""},
            "descriptionModule": {
                "detailedDescription": (
                    "The primary outcome records whether a subject discontinued the study "
                    "due to a related adverse event."
                )
            },
        },
        {},
    )
    if individual_discontinuation_proposal is not None:
        failures.append("Context enrichment treated an individual discontinuation as study closure")

    medication_discontinuation_proposal = proposal_for(
        {"nct_id": "NCT00000009", "why_stopped": ""},
        {
            "statusModule": {"whyStopped": ""},
            "descriptionModule": {
                "detailedDescription": (
                    "Study medication will be discontinued because of intolerable side effects."
                )
            },
        },
        {},
    )
    if medication_discontinuation_proposal is not None:
        failures.append("Context enrichment treated medication discontinuation as study closure")

    blank_direct_proposal = proposal_for(
        {"nct_id": "NCT00000007", "why_stopped": ""},
        {
            "statusModule": {"whyStopped": ""},
            "descriptionModule": {
                "detailedDescription": "The study was terminated early due to slow enrollment."
            },
        },
        {},
    )
    if (
        not blank_direct_proposal
        or blank_direct_proposal["proposed_primary_reason_v2"] != "RECRUITMENT"
    ):
        failures.append(
            f"Context enrichment missed a direct blank-reason cause: {blank_direct_proposal}"
        )

    synthetic = {
        "protocolSection": {
            "identificationModule": {"nctId": "NCT00000001", "briefTitle": "Synthetic test"},
            "statusModule": {
                "overallStatus": "TERMINATED",
                "whyStopped": "Terminated due to lack of efficacy.",
                "lastUpdatePostDateStruct": {"date": "2026-08-23"},
            },
            "designModule": {"studyType": "INTERVENTIONAL", "phases": ["PHASE2"]},
            "armsInterventionsModule": {
                "interventions": [{"name": "Test drug", "type": "DRUG"}]
            },
            "conditionsModule": {"conditions": ["Cancer"]},
            "sponsorCollaboratorsModule": {"leadSponsor": {"name": "Test sponsor"}},
        }
    }
    extracted = extract_record(synthetic)
    required_fields = {
        "classification_outcome_v2",
        "classification_primary_reason_v2",
        "classification_secondary_reasons_v2",
        "classification_needs_review",
        "classification_version",
        "classification_text_hash",
        "classification_source",
    }
    missing_fields = sorted(required_fields - set(extracted))
    if missing_fields or extracted.get("classification_reason") != "EFFICACY/FUTILITY":
        failures.append(
            f"Ingest extraction did not emit V2 fields: missing={missing_fields}, row={extracted}"
        )

    change_report = build_ingest_change_report(
        [{"nct_id": "NCT00000001", "classification_version": "1"}],
        [extracted],
        "2026-08-23T00:00:00Z",
    )
    if change_report["summary"]["classification_changes"] != 1:
        failures.append(f"V2 change was absent from ingest report: {change_report['summary']}")

    try:
        validate_semantics("UNKNOWN", "UNSPECIFIED", False)
        failures.append("Manual-decision validation accepted an unreviewed UNKNOWN outcome")
    except ValueError:
        pass
    try:
        validate_semantics("UNKNOWN", "UNSPECIFIED", True)
    except ValueError as exc:
        failures.append(f"Manual-decision validation rejected a valid review state: {exc}")
    try:
        validate_semantics(
            "CAUSE_NOT_STATED", "DECISION_WITHOUT_STATED_CAUSE", False
        )
    except ValueError as exc:
        failures.append(f"Manual-decision validation rejected a decision-only state: {exc}")
    try:
        validate_semantics(
            "CAUSE_NOT_STATED", "DECISION_WITHOUT_STATED_CAUSE", True
        )
        failures.append("Manual-decision validation accepted a review-gated decision-only state")
    except ValueError:
        pass
    try:
        validate_semantics(
            "CAUSE_NOT_STATED", "PROGRAM_ACTION_WITHOUT_STATED_CAUSE", False
        )
    except ValueError as exc:
        failures.append(f"Manual-decision validation rejected a program-action state: {exc}")

    if failures:
        print("Classification V2 test failures:\n")
        print("\n\n".join(failures))
        sys.exit(1)
    print(f"Classification V2 tests passed ({len(cases)} semantic cases).")


if __name__ == "__main__":
    main()
