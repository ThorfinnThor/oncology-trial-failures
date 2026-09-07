#!/usr/bin/env python3
"""Build a deterministic change report between two stopped-trial snapshots."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


TRACKED_FIELDS = (
    "brief_title",
    "overall_status",
    "why_stopped",
    "classification_label",
    "classification_reason",
    "classification_confidence",
    "classification_outcome_v2",
    "classification_primary_reason_v2",
    "classification_secondary_reasons_v2",
    "classification_needs_review",
    "classification_version",
    "disease_area",
    "phases",
    "lead_sponsor",
    "conditions",
    "intervention_names",
    "last_update_post_date",
)


def _text(value: Any) -> str:
    if value is None:
        return ""
    return " ".join(str(value).split())


def _bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in {"1", "true", "yes"}


def _by_nct(rows: Iterable[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    result: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        nct_id = _text(row.get("nct_id")).upper()
        if nct_id:
            result[nct_id] = row
    return result


def _max_update(rows: Iterable[Dict[str, Any]]) -> str:
    values = [_text(row.get("last_update_post_date"))[:10] for row in rows]
    valid = [value for value in values if len(value) == 10]
    return max(valid, default="")


def _compact(row: Dict[str, Any]) -> Dict[str, Any]:
    why = _text(row.get("why_stopped"))
    return {
        "nct_id": _text(row.get("nct_id")).upper(),
        "brief_title": _text(row.get("brief_title")),
        "overall_status": _text(row.get("overall_status")).upper(),
        "why_stopped": why,
        "classification_label": _text(row.get("classification_label")).upper(),
        "classification_reason": _text(row.get("classification_reason")).upper(),
        "classification_confidence": _text(row.get("classification_confidence")).upper(),
        "classification_outcome_v2": _text(row.get("classification_outcome_v2")).upper(),
        "classification_primary_reason_v2": _text(
            row.get("classification_primary_reason_v2")
        ).upper(),
        "classification_secondary_reasons_v2": _text(
            row.get("classification_secondary_reasons_v2")
        ).upper(),
        "classification_needs_review": _bool(row.get("classification_needs_review")),
        "classification_version": _text(row.get("classification_version")),
        "disease_area": _text(row.get("disease_area")) or "Other",
        "phases": _text(row.get("phases")),
        "lead_sponsor": _text(row.get("lead_sponsor")),
        "conditions": _text(row.get("conditions")),
        "intervention_names": _text(row.get("intervention_names")),
        "last_update_post_date": _text(row.get("last_update_post_date"))[:10],
        "url": _text(row.get("url")),
    }


def _sort_records(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return sorted(
        records,
        key=lambda row: (
            row.get("last_update_post_date") or "",
            row.get("nct_id") or "",
        ),
        reverse=True,
    )


def build_ingest_change_report(
    previous_rows: Optional[List[Dict[str, Any]]],
    current_rows: List[Dict[str, Any]],
    generated_at_utc: Optional[str] = None,
) -> Dict[str, Any]:
    """Compare current data with the repository snapshot present before ingest.

    A new record means that an NCT ID is newly present in the stopped-trial
    dataset. It does not imply that the NCT ID was newly registered.
    """

    has_previous_snapshot = previous_rows is not None
    previous = _by_nct(previous_rows or [])
    current = _by_nct(current_rows)

    new_ids = sorted(set(current) - set(previous)) if has_previous_snapshot else []
    removed_ids = sorted(set(previous) - set(current)) if has_previous_snapshot else []
    shared_ids = sorted(set(previous) & set(current)) if has_previous_snapshot else []

    new_records = _sort_records([_compact(current[nct_id]) for nct_id in new_ids])
    removed_records = _sort_records([_compact(previous[nct_id]) for nct_id in removed_ids])
    updated_records: List[Dict[str, Any]] = []
    status_changes: List[Dict[str, Any]] = []
    classification_changes: List[Dict[str, Any]] = []

    for nct_id in shared_ids:
        old = previous[nct_id]
        new = current[nct_id]
        changed_fields = [
            field for field in TRACKED_FIELDS if _text(old.get(field)) != _text(new.get(field))
        ]
        if not changed_fields:
            continue

        item = _compact(new)
        item["changed_fields"] = changed_fields
        updated_records.append(item)

        if "overall_status" in changed_fields:
            status_item = dict(item)
            status_item["previous_status"] = _text(old.get("overall_status")).upper()
            status_changes.append(status_item)

        classification_fields = {
            "classification_label",
            "classification_reason",
            "classification_confidence",
            "classification_outcome_v2",
            "classification_primary_reason_v2",
            "classification_secondary_reasons_v2",
            "classification_needs_review",
            "classification_version",
        }
        if classification_fields.intersection(changed_fields):
            classification_item = dict(item)
            classification_item["previous_classification_label"] = _text(
                old.get("classification_label")
            ).upper()
            classification_item["previous_classification_reason"] = _text(
                old.get("classification_reason")
            ).upper()
            classification_changes.append(classification_item)

    updated_records = _sort_records(updated_records)
    status_changes = _sort_records(status_changes)
    classification_changes = _sort_records(classification_changes)
    new_scientific = sum(
        1
        for row in new_records
        if row.get("classification_reason") in {"EFFICACY/FUTILITY", "SAFETY"}
        or row.get("classification_label") == "BIOLOGICAL_FAILURE"
    )

    generated_at = generated_at_utc or datetime.now(timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%SZ"
    )
    return {
        "schema_version": 1,
        "generated_at_utc": generated_at,
        "has_previous_snapshot": has_previous_snapshot,
        "definition": (
            "New records are NCT IDs present in the current stopped-trial dataset "
            "but absent from the immediately preceding ingest snapshot."
        ),
        "previous": {
            "record_count": len(previous),
            "max_last_update_post_date": _max_update(previous.values()),
        },
        "current": {
            "record_count": len(current),
            "max_last_update_post_date": _max_update(current.values()),
        },
        "summary": {
            "new_records": len(new_records),
            "new_scientific_signals": new_scientific,
            "updated_records": len(updated_records),
            "status_changes": len(status_changes),
            "classification_changes": len(classification_changes),
            "removed_records": len(removed_records),
        },
        "new_records": new_records,
        "updated_records": updated_records,
        "status_changes": status_changes,
        "classification_changes": classification_changes,
        "removed_records": removed_records,
    }


def load_snapshot(path: Path) -> List[Dict[str, Any]]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
        raise ValueError(f"{path} must contain a JSON array of records")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--previous", type=Path,
        help="Saved pre-ingest snapshot; omit only for an initial ingest without a baseline",
    )
    parser.add_argument("--current", type=Path, default=Path("data/all_stopped_trials.json"))
    parser.add_argument("--output", type=Path, default=Path("data/ingest_changes.json"))
    args = parser.parse_args()
    inputs = [args.current] + ([args.previous] if args.previous is not None else [])
    if args.output.resolve() in {path.resolve() for path in inputs}:
        raise ValueError("Report output must not overwrite an input snapshot")
    previous = load_snapshot(args.previous) if args.previous is not None else None
    report = build_ingest_change_report(previous, load_snapshot(args.current))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote final ingest changes to {args.output}: {report['summary']}")


if __name__ == "__main__":
    main()
