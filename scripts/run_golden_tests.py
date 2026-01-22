#!/usr/bin/env python3
"""
Golden tests for whyStopped classification.
Fails (exit code 1) if any expected label/reason does not match.

Run:
  python scripts/run_golden_tests.py
"""

import csv
import sys
from typing import List, Tuple

# Import classify_why_stopped from the fetch script (keeps dependencies minimal)
from scripts.fetch_ctgov_oncology_failures import classify_why_stopped, normalize_text


GOLDEN_PATH = "tests/golden_why_stopped.csv"


def main() -> None:
    failures: List[str] = []

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
