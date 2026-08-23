#!/usr/bin/env python3
"""Export high-leverage grouped V2 review decisions to a compact CSV batch."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any, Dict, List


FIELDS = (
    "priority",
    "record_count",
    "classification_text_hash",
    "why_stopped",
    "example_nct_ids",
    "current_v1_labels",
    "suggested_outcome_v2",
    "suggested_primary_reason_v2",
    "reviewer_outcome",
    "reviewer_primary_reason",
    "reviewer_secondary_reasons",
    "reviewer_needs_review",
    "decision_status",
    "reviewer_notes",
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--queue", default="data/classification_review_queue_v2.json")
    parser.add_argument("--output", default="data/classification_review_batch_v2.csv")
    parser.add_argument("--limit", type=int, default=200)
    parser.add_argument("--offset", type=int, default=0)
    parser.add_argument("--include-empty", action="store_true")
    args = parser.parse_args()

    queue = json.loads(Path(args.queue).read_text(encoding="utf-8"))
    candidates: List[Dict[str, Any]] = [
        item
        for item in queue
        if args.include_empty or str(item.get("why_stopped") or "").strip()
    ]
    selected = candidates[args.offset : args.offset + args.limit]
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS, lineterminator="\n")
        writer.writeheader()
        for index, item in enumerate(selected, start=args.offset + 1):
            writer.writerow(
                {
                    "priority": index,
                    "record_count": item.get("record_count", 0),
                    "classification_text_hash": item.get("classification_text_hash", ""),
                    "why_stopped": item.get("why_stopped", ""),
                    "example_nct_ids": "; ".join(item.get("nct_ids", [])[:12]),
                    "current_v1_labels": json.dumps(
                        item.get("current_v1_labels", {}),
                        ensure_ascii=False,
                        sort_keys=True,
                    ),
                    "suggested_outcome_v2": item.get("suggested_outcome_v2", ""),
                    "suggested_primary_reason_v2": item.get(
                        "suggested_primary_reason_v2", ""
                    ),
                    "reviewer_outcome": "",
                    "reviewer_primary_reason": "",
                    "reviewer_secondary_reasons": "",
                    "reviewer_needs_review": "",
                    "decision_status": "",
                    "reviewer_notes": "",
                }
            )
    covered = sum(int(item.get("record_count") or 0) for item in selected)
    print(
        f"Wrote {len(selected)} grouped reasons covering {covered} records to {output}"
    )


if __name__ == "__main__":
    main()
