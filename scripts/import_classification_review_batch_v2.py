#!/usr/bin/env python3
"""Validate approved grouped reviews and merge them into the V2 decision log."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

try:
    from classification_v2 import (
        BIOLOGICAL_REASONS,
        OPERATIONAL_REASONS,
        OUTCOME_BIOLOGICAL,
        OUTCOME_CAUSE_NOT_STATED,
        OUTCOME_MIXED,
        OUTCOME_NON_BIOLOGICAL,
        OUTCOME_NON_FAILURE,
        OUTCOME_UNKNOWN,
        REASON_BIO_UNSPECIFIED,
        REASON_DECISION_ONLY,
        REASON_PROGRAM_ACTION_ONLY,
        REASON_MULTIPLE,
        REASON_NOT_INITIATED,
        REASON_PLANNED,
        REASON_REGULATORY,
        REASON_REPLACEMENT,
        REASON_UNSPECIFIED,
        normalize_reason,
    )
except ImportError:
    from scripts.classification_v2 import (
        BIOLOGICAL_REASONS,
        OPERATIONAL_REASONS,
        OUTCOME_BIOLOGICAL,
        OUTCOME_CAUSE_NOT_STATED,
        OUTCOME_MIXED,
        OUTCOME_NON_BIOLOGICAL,
        OUTCOME_NON_FAILURE,
        OUTCOME_UNKNOWN,
        REASON_BIO_UNSPECIFIED,
        REASON_DECISION_ONLY,
        REASON_PROGRAM_ACTION_ONLY,
        REASON_MULTIPLE,
        REASON_NOT_INITIATED,
        REASON_PLANNED,
        REASON_REGULATORY,
        REASON_REPLACEMENT,
        REASON_UNSPECIFIED,
        normalize_reason,
    )


DEST_FIELDS = (
    "why_stopped",
    "outcome",
    "primary_reason",
    "secondary_reasons",
    "needs_review",
    "decision_status",
    "reviewer_notes",
    "reviewed_at",
)
ALLOWED_OUTCOMES = {
    OUTCOME_BIOLOGICAL,
    OUTCOME_CAUSE_NOT_STATED,
    OUTCOME_NON_BIOLOGICAL,
    OUTCOME_MIXED,
    OUTCOME_NON_FAILURE,
    OUTCOME_UNKNOWN,
}
ALLOWED_REASONS = {
    *BIOLOGICAL_REASONS,
    *OPERATIONAL_REASONS,
    REASON_REGULATORY,
    REASON_DECISION_ONLY,
    REASON_PROGRAM_ACTION_ONLY,
    REASON_MULTIPLE,
    REASON_NOT_INITIATED,
    REASON_PLANNED,
    REASON_REPLACEMENT,
    REASON_UNSPECIFIED,
}


def read_csv(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def parse_bool(value: Any) -> bool:
    normalized = str(value or "false").strip().lower()
    if normalized not in {"true", "false", "1", "0", "yes", "no"}:
        raise ValueError(f"Invalid boolean value: {value!r}")
    return normalized in {"true", "1", "yes"}


def validate_semantics(outcome: str, primary: str, needs_review: bool) -> None:
    if outcome == OUTCOME_BIOLOGICAL and primary not in BIOLOGICAL_REASONS:
        raise ValueError("Biological outcome requires a biological primary reason")
    if outcome == OUTCOME_NON_BIOLOGICAL and primary not in {
        *OPERATIONAL_REASONS,
        REASON_REGULATORY,
    }:
        raise ValueError("Non-biological outcome has an incompatible primary reason")
    if outcome == OUTCOME_NON_FAILURE and primary not in {
        REASON_NOT_INITIATED,
        REASON_PLANNED,
        REASON_REPLACEMENT,
    }:
        raise ValueError("Non-failure outcome has an incompatible primary reason")
    if outcome == OUTCOME_MIXED and primary != REASON_MULTIPLE:
        raise ValueError("Mixed outcome requires MULTIPLE as its primary reason")
    cause_not_stated_reasons = {
        REASON_DECISION_ONLY,
        REASON_PROGRAM_ACTION_ONLY,
    }
    if outcome == OUTCOME_CAUSE_NOT_STATED and primary not in cause_not_stated_reasons:
        raise ValueError("Cause-not-stated outcome requires a compatible non-causal reason")
    if primary in cause_not_stated_reasons and outcome != OUTCOME_CAUSE_NOT_STATED:
        raise ValueError("Non-causal reason requires the cause-not-stated outcome")
    if outcome == OUTCOME_CAUSE_NOT_STATED and needs_review:
        raise ValueError("Cause-not-stated decisions are terminal classifications")
    if outcome == OUTCOME_UNKNOWN and primary != REASON_UNSPECIFIED:
        raise ValueError("Unknown outcome requires UNSPECIFIED as its primary reason")
    if outcome in {OUTCOME_UNKNOWN, OUTCOME_MIXED} and not needs_review:
        raise ValueError("Unknown and mixed outcomes must remain review-gated")
    if primary == REASON_BIO_UNSPECIFIED and not needs_review:
        raise ValueError("Unspecified biological causes must remain review-gated")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("batch")
    parser.add_argument(
        "--decisions",
        default="data/classification_manual_decisions_v2.csv",
    )
    args = parser.parse_args()

    approved: List[Dict[str, Any]] = []
    for row in read_csv(Path(args.batch)):
        if str(row.get("decision_status") or "").strip().upper() != "APPROVED":
            continue
        text = str(row.get("why_stopped") or "").strip()
        outcome = str(row.get("reviewer_outcome") or "").strip().upper()
        primary = str(row.get("reviewer_primary_reason") or "").strip().upper()
        if not text or outcome not in ALLOWED_OUTCOMES or primary not in ALLOWED_REASONS:
            raise ValueError(f"Invalid approved decision: {row}")
        needs_review = parse_bool(row.get("reviewer_needs_review"))
        validate_semantics(outcome, primary, needs_review)
        approved.append(
            {
                "why_stopped": text,
                "outcome": outcome,
                "primary_reason": primary,
                "secondary_reasons": str(
                    row.get("reviewer_secondary_reasons") or ""
                ).strip().upper(),
                "needs_review": "true" if needs_review else "false",
                "decision_status": "APPROVED",
                "reviewer_notes": str(row.get("reviewer_notes") or "").strip(),
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }
        )

    destination = Path(args.decisions)
    existing = read_csv(destination)
    by_reason = {
        normalize_reason(row.get("why_stopped")): row
        for row in existing
        if normalize_reason(row.get("why_stopped"))
    }
    for row in approved:
        by_reason[normalize_reason(row["why_stopped"])] = row
    with destination.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=DEST_FIELDS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(sorted(by_reason.values(), key=lambda row: normalize_reason(row["why_stopped"])))
    print(f"Merged {len(approved)} approved decisions into {destination}")


if __name__ == "__main__":
    main()
