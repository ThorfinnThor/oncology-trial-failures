#!/usr/bin/env python3
"""Build an exact-text decision index from the completed semantic audit."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

try:
    from classification_v2 import (
        CLASSIFIER_VERSION,
        OUTCOME_BIOLOGICAL,
        OUTCOME_NON_BIOLOGICAL,
        OUTCOME_UNKNOWN,
        REASON_EFFICACY,
        REASON_OPERATIONAL_OTHER,
        REASON_REGULATORY,
        REASON_SAFETY,
        REASON_UNSPECIFIED,
        classify_reason_v2,
        normalize_reason,
        text_hash,
    )
except ImportError:
    from scripts.classification_v2 import (
        CLASSIFIER_VERSION,
        OUTCOME_BIOLOGICAL,
        OUTCOME_NON_BIOLOGICAL,
        OUTCOME_UNKNOWN,
        REASON_EFFICACY,
        REASON_OPERATIONAL_OTHER,
        REASON_REGULATORY,
        REASON_SAFETY,
        REASON_UNSPECIFIED,
        classify_reason_v2,
        normalize_reason,
        text_hash,
    )


def load_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def load_manual_decisions(path: Path) -> Iterable[Dict[str, Any]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def to_v2(
    label: str,
    reason: str,
    text: str,
) -> Tuple[str, str, List[str], bool, str]:
    rule_result = classify_reason_v2(text)
    if rule_result.needs_review and rule_result.evidence:
        return (
            rule_result.outcome,
            rule_result.primary_reason,
            list(rule_result.secondary_reasons),
            True,
            "V2_REVIEW_GUARD_OVERRIDES_LEGACY",
        )
    if (
        not rule_result.needs_review
        and rule_result.legacy_label == label
        and rule_result.legacy_reason == reason
    ):
        return (
            rule_result.outcome,
            rule_result.primary_reason,
            list(rule_result.secondary_reasons),
            False,
            "V2_RULE_WITH_AUDIT_CONFIRMATION",
        )
    if label == "BIOLOGICAL_FAILURE" and reason == "SAFETY":
        return OUTCOME_BIOLOGICAL, REASON_SAFETY, [], False, "AUDIT_LEGACY_MAPPING"
    if label == "BIOLOGICAL_FAILURE" and reason == "EFFICACY/FUTILITY":
        return OUTCOME_BIOLOGICAL, REASON_EFFICACY, [], False, "AUDIT_LEGACY_MAPPING"
    if label == "NON_BIOLOGICAL" and reason == "REGULATORY":
        return OUTCOME_NON_BIOLOGICAL, REASON_REGULATORY, [], False, "AUDIT_LEGACY_MAPPING"
    if label == "NON_BIOLOGICAL" and reason == "OPERATIONAL":
        return (
            OUTCOME_UNKNOWN,
            REASON_UNSPECIFIED,
            [],
            True,
            "V2_UNRESOLVED_LEGACY_OPERATIONAL",
        )
    return OUTCOME_UNKNOWN, REASON_UNSPECIFIED, [], True, "AUDIT_LEGACY_MAPPING"


def build(
    rows: Iterable[Dict[str, Any]],
    manual_decisions: Iterable[Dict[str, Any]] = (),
) -> Dict[str, Any]:
    groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    excluded_review = 0
    for row in rows:
        normalized = normalize_reason(row.get("why_stopped"))
        if not normalized:
            continue
        if row.get("audit_result") == "REVIEW":
            excluded_review += 1
            groups[text_hash(normalized)].append({**row, "_review": True, "_normalized": normalized})
            continue
        groups[text_hash(normalized)].append({**row, "_review": False, "_normalized": normalized})

    entries: Dict[str, Any] = {}
    conflicts: List[Dict[str, Any]] = []
    for digest, members in sorted(groups.items()):
        if any(member["_review"] for member in members):
            continue
        decisions = {
            (str(member.get("expected_label")), str(member.get("expected_reason")))
            for member in members
        }
        if len(decisions) != 1:
            conflicts.append(
                {
                    "text_hash": digest,
                    "example_text": members[0]["why_stopped"],
                    "decisions": sorted([list(item) for item in decisions]),
                    "nct_ids": [member["nct_id"] for member in members],
                }
            )
            continue
        label, reason = next(iter(decisions))
        outcome, primary, secondary, needs_review, derivation = to_v2(
            label,
            reason,
            members[0]["why_stopped"],
        )
        provenance = Counter(member["audit_result"] for member in members)
        entries[digest] = {
            "normalized_text": members[0]["_normalized"],
            "example_text": members[0]["why_stopped"],
            "outcome": outcome,
            "primary_reason": primary,
            "secondary_reasons": secondary,
            "needs_review": needs_review,
            "v2_derivation": derivation,
            "legacy_label": label,
            "legacy_reason": reason,
            "reviewed_record_count": len(members),
            "nct_ids": [member["nct_id"] for member in members],
            "provenance": dict(provenance),
        }

    manual_entry_count = 0
    for decision in manual_decisions:
        if str(decision.get("decision_status") or "").strip().upper() != "APPROVED":
            continue
        text = str(decision.get("why_stopped") or "").strip()
        normalized = normalize_reason(text)
        if not normalized:
            raise ValueError("An approved manual decision has an empty why_stopped value")
        outcome = str(decision.get("outcome") or "").strip().upper()
        primary = str(decision.get("primary_reason") or "").strip().upper()
        if not outcome or not primary:
            raise ValueError(f"Approved manual decision is incomplete: {text!r}")
        secondary = [
            value.strip().upper()
            for value in str(decision.get("secondary_reasons") or "").split(";")
            if value.strip()
        ]
        needs_review = str(decision.get("needs_review") or "").strip().lower() in {
            "1",
            "true",
            "yes",
        }
        digest = text_hash(normalized)
        entries[digest] = {
            "normalized_text": normalized,
            "example_text": text,
            "outcome": outcome,
            "primary_reason": primary,
            "secondary_reasons": secondary,
            "needs_review": needs_review,
            "v2_derivation": "MANUAL_V2_DECISION",
            "reviewed_record_count": 0,
            "nct_ids": [],
            "provenance": {"MANUAL_V2_DECISION": 1},
            "reviewer_notes": str(decision.get("reviewer_notes") or "").strip(),
            "reviewed_at": str(decision.get("reviewed_at") or "").strip(),
        }
        manual_entry_count += 1

    return {
        "schema_version": 1,
        "classifier_version": CLASSIFIER_VERSION,
        "normalization": "NFKC, lowercase, whitespace collapse, URL/NCT placeholders",
        "entry_count": len(entries),
        "manual_entry_count": manual_entry_count,
        "review_rows_excluded": excluded_review,
        "conflict_count": len(conflicts),
        "conflicts": conflicts,
        "entries": entries,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gold", default="tests/classification_gold_v2.jsonl")
    parser.add_argument(
        "--manual-decisions",
        default="data/classification_manual_decisions_v2.csv",
    )
    parser.add_argument("--output", default="data/classification_reviewed_reasons_v2.json")
    args = parser.parse_args()
    payload = build(
        load_jsonl(Path(args.gold)),
        load_manual_decisions(Path(args.manual_decisions)),
    )
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Wrote {payload['entry_count']} reviewed reasons; "
        f"excluded {payload['review_rows_excluded']} review rows and "
        f"{payload['conflict_count']} conflicting reason groups"
    )


if __name__ == "__main__":
    main()
