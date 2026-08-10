#!/usr/bin/env python3
"""
Golden tests for whyStopped classification.
Fails (exit code 1) if any expected label/reason does not match.

Run:
  python scripts/run_golden_tests.py
"""

import csv
import os
import sys
from typing import List

# Ensure repo root is on sys.path so "scripts" is importable
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from scripts.fetch_ctgov_oncology_failures import classify_why_stopped
from scripts.ingest_changes import build_ingest_change_report

GOLDEN_PATH = "tests/golden_why_stopped.csv"


def test_ingest_changes(failures: List[str]) -> None:
    previous = [
        {
            "nct_id": "NCT00000001",
            "overall_status": "SUSPENDED",
            "classification_reason": "OPERATIONAL",
            "last_update_post_date": "2026-07-01",
        },
        {
            "nct_id": "NCT00000002",
            "overall_status": "TERMINATED",
            "classification_reason": "SAFETY",
            "last_update_post_date": "2026-07-01",
        },
        {
            "nct_id": "NCT00000003",
            "overall_status": "WITHDRAWN",
            "classification_reason": "OTHER/UNKNOWN",
            "last_update_post_date": "2026-07-01",
        },
    ]
    current = [
        {
            "nct_id": "NCT00000001",
            "overall_status": "TERMINATED",
            "classification_reason": "EFFICACY/FUTILITY",
            "last_update_post_date": "2026-08-01",
        },
        {
            "nct_id": "NCT00000002",
            "overall_status": "TERMINATED",
            "classification_reason": "SAFETY",
            "last_update_post_date": "2026-07-01",
        },
        {
            "nct_id": "NCT00000004",
            "overall_status": "TERMINATED",
            "classification_label": "BIOLOGICAL_FAILURE",
            "classification_reason": "SAFETY",
            "last_update_post_date": "2026-08-02",
        },
    ]
    report = build_ingest_change_report(previous, current, "2026-08-06T00:00:00Z")
    expected = {
        "new_records": 1,
        "new_scientific_signals": 1,
        "updated_records": 1,
        "status_changes": 1,
        "classification_changes": 1,
        "removed_records": 1,
    }
    if report["summary"] != expected:
        failures.append(
            "[Ingest snapshot] Expected "
            f"{expected}, got {report['summary']}"
        )


def main() -> None:
    failures: List[str] = []

    test_ingest_changes(failures)

    with open(GOLDEN_PATH, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader, start=1):
            why = row["why_stopped"]
            exp_label = row["expected_label"].strip()
            exp_reason = row["expected_reason"].strip()

            cls = classify_why_stopped(why)

            if cls.label != exp_label or cls.reason != exp_reason:
                failures.append(
                    f"[Row {i}] WHY='{why}'\n"
                    f"  Expected: {exp_label} / {exp_reason}\n"
                    f"  Got:      {cls.label} / {cls.reason} (conf={cls.confidence}, evidence={cls.matched_evidence})\n"
                )

    if failures:
        print("Golden test failures:\n")
        for msg in failures:
            print(msg)
        sys.exit(1)

    print("Golden tests passed.")


if __name__ == "__main__":
    main()
