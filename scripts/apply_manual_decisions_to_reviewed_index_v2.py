#!/usr/bin/env python3
"""Merge approved manual V2 decisions into the existing reviewed-reason index."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

try:
    from classification_v2 import normalize_reason, text_hash
except ImportError:
    from scripts.classification_v2 import normalize_reason, text_hash


ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manual-decisions",
        type=Path,
        default=ROOT / "data" / "classification_manual_decisions_v2.csv",
    )
    parser.add_argument(
        "--index",
        type=Path,
        default=ROOT / "data" / "classification_reviewed_reasons_v2.json",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=ROOT / "data" / "all_stopped_trials.json",
    )
    args = parser.parse_args()

    payload = json.loads(args.index.read_text(encoding="utf-8"))
    entries = payload["entries"]
    data_rows = json.loads(args.data.read_text(encoding="utf-8"))
    nct_ids_by_hash: dict[str, list[str]] = {}
    for row in data_rows:
        digest = text_hash(normalize_reason(row.get("why_stopped")))
        nct_ids_by_hash.setdefault(digest, []).append(str(row.get("nct_id") or ""))

    applied = 0
    with args.manual_decisions.open("r", encoding="utf-8", newline="") as handle:
        for decision in csv.DictReader(handle):
            if str(decision.get("decision_status") or "").strip().upper() != "APPROVED":
                continue
            text = str(decision.get("why_stopped") or "").strip()
            normalized = normalize_reason(text)
            digest = text_hash(normalized)
            secondary = [
                value.strip().upper()
                for value in str(decision.get("secondary_reasons") or "").split(";")
                if value.strip()
            ]
            entries[digest] = {
                "normalized_text": normalized,
                "example_text": text,
                "outcome": str(decision.get("outcome") or "").strip().upper(),
                "primary_reason": str(decision.get("primary_reason") or "").strip().upper(),
                "secondary_reasons": secondary,
                "needs_review": str(decision.get("needs_review") or "").strip().lower()
                in {"1", "true", "yes"},
                "v2_derivation": "MANUAL_V2_DECISION",
                "reviewed_record_count": len(nct_ids_by_hash.get(digest, [])),
                "nct_ids": [value for value in nct_ids_by_hash.get(digest, []) if value],
                "provenance": {"MANUAL_V2_DECISION": 1},
                "reviewer_notes": str(decision.get("reviewer_notes") or "").strip(),
                "reviewed_at": str(decision.get("reviewed_at") or "").strip(),
            }
            applied += 1

    payload["entry_count"] = len(entries)
    payload["manual_entry_count"] = sum(
        entry.get("v2_derivation") == "MANUAL_V2_DECISION" for entry in entries.values()
    )
    args.index.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(
        f"Applied {applied} approved decisions; index now contains "
        f"{payload['entry_count']} entries ({payload['manual_entry_count']} manual)."
    )


if __name__ == "__main__":
    main()
