#!/usr/bin/env python3
"""Validate Classification V2 invariants across the canonical snapshot."""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Set

try:
    from classification_v2 import (
        BIOLOGICAL_REASONS,
        CLASSIFIER_VERSION,
        OPERATIONAL_REASONS,
        OUTCOME_BIOLOGICAL,
        OUTCOME_MIXED,
        OUTCOME_NON_BIOLOGICAL,
        OUTCOME_NON_FAILURE,
        OUTCOME_UNKNOWN,
        REASON_BIO_UNSPECIFIED,
        REASON_MULTIPLE,
        REASON_NOT_INITIATED,
        REASON_PLANNED,
        REASON_REGULATORY,
        REASON_REPLACEMENT,
        REASON_UNSPECIFIED,
        load_reviewed_reason_index,
    )
    from reclassify_dataset_v2 import classify_rows
    from classification_review_dispositions_v2 import DISPOSITION_NOTES
except ImportError:
    from scripts.classification_v2 import (
        BIOLOGICAL_REASONS,
        CLASSIFIER_VERSION,
        OPERATIONAL_REASONS,
        OUTCOME_BIOLOGICAL,
        OUTCOME_MIXED,
        OUTCOME_NON_BIOLOGICAL,
        OUTCOME_NON_FAILURE,
        OUTCOME_UNKNOWN,
        REASON_BIO_UNSPECIFIED,
        REASON_MULTIPLE,
        REASON_NOT_INITIATED,
        REASON_PLANNED,
        REASON_REGULATORY,
        REASON_REPLACEMENT,
        REASON_UNSPECIFIED,
        load_reviewed_reason_index,
    )
    from scripts.reclassify_dataset_v2 import classify_rows
    from scripts.classification_review_dispositions_v2 import DISPOSITION_NOTES


ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PUBLIC = ROOT / "web" / "public"

ALLOWED_OUTCOMES = {
    OUTCOME_BIOLOGICAL,
    OUTCOME_NON_BIOLOGICAL,
    OUTCOME_MIXED,
    OUTCOME_NON_FAILURE,
    OUTCOME_UNKNOWN,
}
ALLOWED_REASONS = {
    *BIOLOGICAL_REASONS,
    *OPERATIONAL_REASONS,
    REASON_REGULATORY,
    REASON_MULTIPLE,
    REASON_NOT_INITIATED,
    REASON_PLANNED,
    REASON_REPLACEMENT,
    REASON_UNSPECIFIED,
}
ALLOWED_SOURCES = {
    "REVIEWED_EXACT",
    "RULE_V2",
    "UNCLASSIFIED",
    "DESCRIPTION_FALLBACK",
    "MANUAL_NCT_OVERRIDE",
}
V2_COMPARE_FIELDS = (
    "classification_label",
    "classification_reason",
    "classification_confidence",
    "classification_evidence",
    "classification_outcome_v2",
    "classification_primary_reason_v2",
    "classification_secondary_reasons_v2",
    "classification_needs_review",
    "classification_version",
    "classification_text_hash",
    "classification_source",
)


def load_rows(path: Path) -> List[Dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise ValueError(f"{path} must contain a JSON array")
    return payload


def ids(rows: Iterable[Dict[str, Any]]) -> Set[str]:
    return {str(row.get("nct_id") or "").upper() for row in rows}


def csv_row_count(path: Path) -> int:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return sum(1 for _ in csv.DictReader(handle))


def main() -> None:
    failures: List[str] = []
    all_rows = load_rows(DATA / "all_stopped_trials.json")
    bio_rows = load_rows(DATA / "biological_failure_trials.json")
    oncology_rows = load_rows(DATA / "all_oncology_stopped_trials.json")
    bio_oncology_rows = load_rows(DATA / "biological_failure_oncology_trials.json")

    all_ids = ids(all_rows)
    if len(all_ids) != len(all_rows) or "" in all_ids:
        failures.append("Canonical data contains a missing or duplicate NCT ID")

    for row in all_rows:
        nct_id = str(row.get("nct_id") or "<missing>")
        outcome = row.get("classification_outcome_v2")
        reason = row.get("classification_primary_reason_v2")
        source = row.get("classification_source")
        review = row.get("classification_needs_review")
        digest = str(row.get("classification_text_hash") or "")
        if outcome not in ALLOWED_OUTCOMES:
            failures.append(f"{nct_id}: invalid V2 outcome {outcome!r}")
        if reason not in ALLOWED_REASONS:
            failures.append(f"{nct_id}: invalid V2 reason {reason!r}")
        if source not in ALLOWED_SOURCES:
            failures.append(f"{nct_id}: invalid V2 source {source!r}")
        if not isinstance(review, bool):
            failures.append(f"{nct_id}: classification_needs_review is not boolean")
        if row.get("classification_version") != CLASSIFIER_VERSION:
            failures.append(f"{nct_id}: stale classification version")
        if not re.fullmatch(r"[0-9a-f]{20}", digest):
            failures.append(f"{nct_id}: invalid classification text hash")
        if review and (
            row.get("classification_label") != "UNCLEAR"
            or row.get("classification_reason") != "OTHER/UNKNOWN"
        ):
            failures.append(f"{nct_id}: review-gated row asserts a legacy category")
        if source == "UNCLASSIFIED" and not review:
            failures.append(f"{nct_id}: unclassified row is not review-gated")
        if outcome in {OUTCOME_UNKNOWN, OUTCOME_MIXED} and not review:
            failures.append(f"{nct_id}: uncertain V2 outcome is not review-gated")
        if reason == REASON_BIO_UNSPECIFIED and not review:
            failures.append(f"{nct_id}: unspecified biological reason is not review-gated")
        if outcome == OUTCOME_BIOLOGICAL and reason not in BIOLOGICAL_REASONS:
            failures.append(f"{nct_id}: biological outcome has non-biological reason")
        if outcome == OUTCOME_NON_BIOLOGICAL and reason not in {
            *OPERATIONAL_REASONS,
            REASON_REGULATORY,
        }:
            failures.append(f"{nct_id}: non-biological outcome has incompatible reason")
        if len(failures) >= 50:
            break

    expected_bio_ids = {
        str(row["nct_id"]).upper()
        for row in all_rows
        if row.get("classification_label") == "BIOLOGICAL_FAILURE"
        and row.get("classification_needs_review") is False
    }
    expected_oncology_ids = {
        str(row["nct_id"]).upper()
        for row in all_rows
        if row.get("disease_area") == "Oncology"
        or "Oncology" in str(row.get("disease_areas_matched") or "").split("; ")
    }
    if ids(bio_rows) != expected_bio_ids:
        failures.append("Biological subset does not match canonical V2 classifications")
    if ids(oncology_rows) != expected_oncology_ids:
        failures.append("Oncology subset does not match canonical disease-area fields")
    if ids(bio_oncology_rows) != expected_bio_ids.intersection(expected_oncology_ids):
        failures.append("Biological oncology subset is inconsistent")

    for stem, rows in (
        ("all_stopped_trials", all_rows),
        ("biological_failure_trials", bio_rows),
        ("all_oncology_stopped_trials", oncology_rows),
        ("biological_failure_oncology_trials", bio_oncology_rows),
    ):
        if csv_row_count(DATA / f"{stem}.csv") != len(rows):
            failures.append(f"{stem}.csv row count differs from JSON")

    reviewed = load_reviewed_reason_index(
        str(DATA / "classification_reviewed_reasons_v2.json")
    )
    rerun, report, rerun_queue = classify_rows(all_rows, reviewed)
    for before, after in zip(all_rows, rerun):
        changed = [field for field in V2_COMPARE_FIELDS if before.get(field) != after.get(field)]
        if changed:
            failures.append(
                f"{before.get('nct_id')}: classification is not idempotent ({', '.join(changed)})"
            )
            if len(failures) >= 50:
                break
    if sum(report["outcomes"].values()) != len(all_rows):
        failures.append("Reclassification report outcome counts do not sum to total")

    context_payload = json.loads(
        (DATA / "classification_context_proposals_v2.json").read_text(encoding="utf-8")
    )
    context_proposals = context_payload.get("proposals", [])
    if not isinstance(context_proposals, list):
        failures.append("Context proposal artifact proposals must be a JSON array")
        context_proposals = []
    if context_payload.get("proposal_count") != len(context_proposals):
        failures.append("Context proposal count does not match its artifact")
    rows_by_id = {
        str(row.get("nct_id") or "").upper(): row for row in all_rows
    }
    context_ids = [
        str(proposal.get("nct_id") or "").upper()
        for proposal in context_proposals
    ]
    if len(context_ids) != len(set(context_ids)) or "" in context_ids:
        failures.append("Context proposal artifact contains a missing or duplicate NCT ID")
    for proposal, nct_id in zip(context_proposals, context_ids):
        fields = proposal.get("record_fields") or {}
        canonical = rows_by_id.get(nct_id)
        if canonical is None:
            failures.append(f"{nct_id}: context proposal is absent from canonical data")
            break
        if (
            fields.get("classification_source") != "DESCRIPTION_FALLBACK"
            or fields.get("classification_version") != CLASSIFIER_VERSION
            or fields.get("classification_confidence") != "HIGH"
            or fields.get("classification_needs_review") is not False
        ):
            failures.append(f"{nct_id}: context proposal is stale or not high-confidence")
            break
        changed = [
            field for field in V2_COMPARE_FIELDS
            if fields.get(field) != canonical.get(field)
        ]
        if changed:
            failures.append(
                f"{nct_id}: context proposal differs from canonical data "
                f"({', '.join(changed)})"
            )
            break

    queue = load_rows(DATA / "classification_review_queue_v2.json")
    dispositions = json.loads(
        (DATA / "classification_review_dispositions_v2.json").read_text(encoding="utf-8")
    )
    stored_report = json.loads(
        (DATA / "classification_v2_reclassification_report.json").read_text(encoding="utf-8")
    )
    disposition_groups = dispositions.get("groups", [])
    if not isinstance(disposition_groups, list):
        failures.append("Review-disposition artifact groups must be a JSON array")
        disposition_groups = []
    queue_hashes = [str(item.get("classification_text_hash") or "") for item in queue]
    disposition_hashes = [
        str(item.get("classification_text_hash") or "") for item in disposition_groups
    ]
    rerun_hashes = [str(item.get("classification_text_hash") or "") for item in rerun_queue]
    if len(queue_hashes) != len(set(queue_hashes)) or "" in queue_hashes:
        failures.append("Stored review queue contains a missing or duplicate group hash")
    if queue_hashes != disposition_hashes:
        failures.append("Review queue and disposition artifact group order/hashes differ")
    if queue_hashes != rerun_hashes:
        failures.append("Stored review queue differs from a fresh canonical reclassification")
    for item in queue:
        disposition = str(item.get("review_disposition") or "")
        if disposition not in DISPOSITION_NOTES:
            failures.append(
                f"{item.get('classification_text_hash')}: undocumented review disposition"
            )
            break
        if item.get("review_disposition_note") != DISPOSITION_NOTES[disposition]:
            failures.append(
                f"{item.get('classification_text_hash')}: stale review disposition note"
            )
            break
        if item.get("review_priority") not in {"HIGH", "MEDIUM", "LOW"}:
            failures.append(
                f"{item.get('classification_text_hash')}: invalid review priority"
            )
            break
    queue_record_count = sum(int(item.get("record_count") or 0) for item in queue)
    if dispositions.get("review_group_count") != len(queue):
        failures.append("Disposition group count differs from the review queue")
    if dispositions.get("review_record_count") != queue_record_count:
        failures.append("Disposition record count differs from the review queue")
    if stored_report.get("review_unique_reason_count") != len(queue):
        failures.append("Reclassification report group count differs from the review queue")
    if stored_report.get("review_record_count") != queue_record_count:
        failures.append("Reclassification report record count differs from the review queue")
    for dimension in ("disposition", "priority"):
        group_key = f"{dimension}_group_counts"
        record_key = f"{dimension}_record_counts"
        group_counts = dispositions.get(group_key, {})
        record_counts = dispositions.get(record_key, {})
        if sum(group_counts.values()) != len(queue):
            failures.append(f"{group_key} does not sum to the review queue")
        if sum(record_counts.values()) != queue_record_count:
            failures.append(f"{record_key} does not sum to review records")
        if group_counts != stored_report.get(group_key):
            failures.append(f"{group_key} differs between disposition artifact and report")
        if record_counts != stored_report.get(record_key):
            failures.append(f"{record_key} differs between disposition artifact and report")

    leaked = sorted((PUBLIC / "data").glob("classification_*"))
    if leaked:
        failures.append(
            "Internal classification artifacts are public: "
            + ", ".join(path.name for path in leaked)
        )

    if failures:
        print("Classification V2 snapshot validation failed:\n")
        print("\n".join(f"- {failure}" for failure in failures))
        sys.exit(1)
    print(
        "Classification V2 snapshot valid: "
        f"{len(all_rows):,} canonical records, {len(bio_rows):,} biological signals, "
        f"{len(oncology_rows):,} oncology records."
    )


if __name__ == "__main__":
    main()
