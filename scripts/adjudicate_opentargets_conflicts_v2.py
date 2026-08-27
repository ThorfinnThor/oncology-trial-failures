#!/usr/bin/env python3
"""Materialize the manual adjudication of the Open Targets V2 conflicts."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

try:
    from benchmark_opentargets_v2 import normalize_reason as benchmark_normalize
    from benchmark_opentargets_v2 import text_hash as benchmark_text_hash
    from classification_v2 import normalize_reason as v2_normalize
    from classification_v2 import text_hash as v2_text_hash
except ImportError:
    from scripts.benchmark_opentargets_v2 import normalize_reason as benchmark_normalize
    from scripts.benchmark_opentargets_v2 import text_hash as benchmark_text_hash
    from scripts.classification_v2 import normalize_reason as v2_normalize
    from scripts.classification_v2 import text_hash as v2_text_hash


ROOT = Path(__file__).resolve().parents[1]
REVIEWED_AT = "2026-08-26"


CORRECTIONS: dict[str, dict[str, Any]] = {
    "015b84d50121f3c78b6b": {
        "outcome": "NON_FAILURE_TRANSITION",
        "primary": "NOT_INITIATED",
        "secondary": [],
        "rationale": "No participant was enrolled. V2 records the explicit pre-enrollment state without inferring recruitment failure.",
    },
    "2f329b1f5b46e336a99c": {
        "outcome": "BIOLOGICAL_FAILURE",
        "primary": "SAFETY",
        "secondary": [],
        "rationale": "The acute-rejection stopping threshold is an explicit adverse clinical safety signal.",
    },
    "467046df1454081a0e51": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "REGULATORY",
        "secondary": ["NOT_INITIATED"],
        "rationale": "IRB withdrawal is the explicit stop action; no enrollment is retained as the study state rather than a recruitment cause.",
    },
    "498dc2cb33800d187511": {
        "outcome": "MIXED_CAUSES",
        "primary": "MULTIPLE",
        "secondary": ["RECRUITMENT", "EFFICACY_FUTILITY", "SAFETY"],
        "rationale": "The text explicitly combines slow accrual, lack of efficacy and tolerability concerns.",
    },
    "4e7202a1c05985281180": {
        "outcome": "MIXED_CAUSES",
        "primary": "MULTIPLE",
        "secondary": ["RECRUITMENT", "EFFICACY_FUTILITY"],
        "rationale": "Slowing enrollment and negative Phase III results are both stated as causes.",
    },
    "5996b21ad06aa63bd4ec": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "RECRUITMENT",
        "secondary": ["REGULATORY"],
        "rationale": "No local enrollment is the substantive cause and the requested IRB closure is retained as a secondary action.",
    },
    "6b0a40d17f4086ecdf88": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "RECRUITMENT",
        "secondary": [],
        "rationale": "Low accrual explicitly prevented the site from meeting the statistical endpoints.",
    },
    "7149e5fb11cea4b40a23": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "FUNDING",
        "secondary": ["STAFFING_RESOURCES"],
        "rationale": "The text explicitly states both missing funding and departure of the resident in charge.",
    },
    "7a0ba7ecc3b7cf8fe906": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "FUNDING",
        "secondary": ["SUPPORT_WITHDRAWAL", "RECRUITMENT"],
        "rationale": "Sponsor support withdrawal remains primary while the explicitly low recruitment is preserved as a secondary cause.",
    },
    "8033ee7b5127c20f4149": {
        "outcome": "NON_FAILURE_TRANSITION",
        "primary": "NOT_INITIATED",
        "secondary": [],
        "rationale": "No subject was recruited. V2 records the explicit pre-enrollment state without inferring recruitment failure.",
    },
    "87c3c04ee99de7a72d4c": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "RECRUITMENT",
        "secondary": [],
        "rationale": "The study closed before its accrual goal because of slow accrual; the unmet goal is not a planned milestone completion.",
    },
    "8d9206f6e363a27864ca": {
        "outcome": "BIOLOGICAL_FAILURE",
        "primary": "SAFETY",
        "secondary": ["REGULATORY"],
        "rationale": "Potential combination toxicities are the medical cause and the FDA recommendation is the secondary regulatory action.",
    },
    "9788ebb0f3f89ab87c25": {
        "outcome": "NON_FAILURE_TRANSITION",
        "primary": "NOT_INITIATED",
        "secondary": [],
        "rationale": "The misspelled source text still explicitly states that enrollment never began.",
    },
    "99f979be5a52b31631a5": {
        "outcome": "NON_FAILURE_TRANSITION",
        "primary": "NOT_INITIATED",
        "secondary": [],
        "rationale": "No subject was enrolled. V2 records the explicit pre-enrollment state without asserting a recruitment cause.",
    },
    "9ff3988354b080198c12": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "SUPPLY_MANUFACTURING",
        "secondary": ["RECRUITMENT"],
        "rationale": "Drug production ceased and recruitment was also explicitly too slow.",
    },
    "a20f5db628aeb4346444": {
        "outcome": "BIOLOGICAL_FAILURE",
        "primary": "SAFETY",
        "secondary": ["REGULATORY"],
        "rationale": "The product-specific waiver was granted because the intervention was likely unsafe; safety is causal and the EMA action is secondary.",
    },
    "a441b979702185bf307a": {
        "outcome": "BIOLOGICAL_FAILURE",
        "primary": "SAFETY",
        "secondary": ["REGULATORY"],
        "rationale": "Safety concerns caused the termination and clinical hold; the hold is a secondary regulatory action.",
    },
    "ba1c3affa251f953b22a": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "RECRUITMENT",
        "secondary": [],
        "rationale": "Only one participant was included, an explicit low-accrual condition in the stop-reason field.",
    },
    "bc27e5037657224e66d2": {
        "outcome": "MIXED_CAUSES",
        "primary": "MULTIPLE",
        "secondary": ["PROTOCOL_FEASIBILITY", "SAFETY"],
        "rationale": "The program ended because of combination feasibility and increased hyperlipasemia risk.",
    },
    "cdd72bd4b0b12c93eee4": {
        "outcome": "NON_FAILURE_TRANSITION",
        "primary": "NOT_INITIATED",
        "secondary": [],
        "rationale": "No patient was recruited. V2 records the explicit pre-enrollment state without inferring recruitment failure.",
    },
    "e1311649ab58afd31d5c": {
        "outcome": "NON_FAILURE_TRANSITION",
        "primary": "NOT_INITIATED",
        "secondary": [],
        "rationale": "The misspelled source text still explicitly states that enrollment never began.",
    },
    "e5a368cedc9f0770bff1": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "RECRUITMENT",
        "secondary": [],
        "rationale": "Arm B is explicitly described as having poor accrual; Arm A reaching its goal does not negate that stop cause.",
    },
    "ecc5dc96c1d5ac426c6c": {
        "outcome": "NON_BIOLOGICAL",
        "primary": "PROTOCOL_FEASIBILITY",
        "secondary": ["RECRUITMENT"],
        "rationale": "Trial-design challenges are primary and constraints on enrolling eligible, consenting participants are explicit secondary evidence.",
    },
    "fd24f71f776a9f74240a": {
        "outcome": "BIOLOGICAL_FAILURE",
        "primary": "SAFETY",
        "secondary": ["REGULATORY"],
        "rationale": "Safety is the stated cause and the FDA hold is the resulting secondary regulatory action.",
    },
}


def current_classification(row: dict[str, Any]) -> str:
    outcome = str(row.get("classification_final_outcome") or "")
    category = str(row.get("classification_final_category") or "")
    secondary = str(row.get("classification_secondary_reasons_v2") or "").strip()
    result = f"{outcome}/{category}"
    return f"{result} + {secondary}" if secondary else result


def target_classification(decision: dict[str, Any]) -> str:
    result = f"{decision['outcome']}/{decision['primary']}"
    secondary = "; ".join(decision["secondary"])
    return f"{result} + {secondary}" if secondary else result


def confirmation(row: dict[str, Any], labels: list[str]) -> tuple[str, str]:
    outcome = str(row.get("classification_final_outcome") or "")
    category = str(row.get("classification_final_category") or "")
    secondary = str(row.get("classification_secondary_reasons_v2") or "")
    if outcome == "UNRESOLVED":
        return (
            "CONFIRMED_CONSERVATIVE",
            "The source does not state a sufficiently directional causal result; V2 correctly avoids inferring the broader external label.",
        )
    if outcome == "MIXED_CAUSES":
        return (
            "CONFIRMED_MIXED",
            "The source states causes from more than one V2 domain; preserving the mixed classification is more specific than a single external label.",
        )
    if outcome == "NON_FAILURE_TRANSITION":
        return (
            "CONFIRMED_NON_FAILURE",
            "The source describes a transfer, replacement or planned transition rather than a causal failure in the external label's sense.",
        )
    if outcome == "CAUSE_NOT_STATED":
        return (
            "CONFIRMED_CAUSE_NOT_STATED",
            "The source reports an actor decision or program action but does not state the underlying cause required for the external label.",
        )
    expected = {
        "Safety_Sideeffects": "SAFETY",
        "Insufficient_Enrollment": "RECRUITMENT",
        "Regulatory": "REGULATORY",
        "Study_Staff_Moved": "STAFFING_RESOURCES",
    }
    if any(expected.get(label) and expected[label] in secondary for label in labels):
        return (
            "CONFIRMED_SECONDARY",
            "V2 already preserves the external concept as a secondary cause while retaining the more directly stated primary cause.",
        )
    return (
        "CONFIRMED_TAXONOMY_DIFFERENCE",
        f"The source supports V2 {outcome}/{category}; the broader external label reflects a different taxonomy or level of causality.",
    )


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--disagreements",
        type=Path,
        default=ROOT / "data" / "benchmarks" / "opentargets_v2_disagreements.csv",
    )
    parser.add_argument(
        "--data",
        type=Path,
        default=ROOT / "data" / "all_stopped_trials.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "data" / "benchmarks" / "opentargets_v2_full_adjudication.csv",
    )
    parser.add_argument(
        "--manual-decisions",
        type=Path,
        default=ROOT / "data" / "classification_manual_decisions_v2.csv",
    )
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    data_rows = json.loads(args.data.read_text(encoding="utf-8"))
    rows_by_nct = {str(row.get("nct_id")): row for row in data_rows}
    rows_by_benchmark_hash: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in data_rows:
        digest = benchmark_text_hash(benchmark_normalize(row.get("why_stopped")))
        rows_by_benchmark_hash[digest].append(row)

    disagreements = list(csv.DictReader(args.disagreements.open("r", encoding="utf-8", newline="")))
    labels_by_hash: dict[str, list[str]] = defaultdict(list)
    for row in disagreements:
        labels_by_hash[row["normalized_text_hash"]].append(row["open_targets_label"])

    adjudications: list[dict[str, Any]] = []
    for conflict in disagreements:
        digest = conflict["normalized_text_hash"]
        sample_id = conflict["sample_nct_ids"].split(";")[0]
        source_row = rows_by_nct[sample_id]
        correction = CORRECTIONS.get(digest)
        if correction:
            status = "CHANGE_V2"
            rationale = correction["rationale"]
            final = target_classification(correction)
        else:
            status, rationale = confirmation(source_row, labels_by_hash[digest])
            final = current_classification(source_row)
        adjudications.append(
            {
                "open_targets_label": conflict["open_targets_label"],
                "normalized_text_hash": digest,
                "sample_nct_ids": conflict["sample_nct_ids"],
                "affected_v2_records": len(rows_by_benchmark_hash[digest]),
                "previous_v2_classification": current_classification(source_row),
                "adjudicated_v2_classification": final,
                "adjudication_status": status,
                "rationale": rationale,
                "reviewed_at": REVIEWED_AT,
            }
        )

    write_csv(
        args.output,
        adjudications,
        [
            "open_targets_label",
            "normalized_text_hash",
            "sample_nct_ids",
            "affected_v2_records",
            "previous_v2_classification",
            "adjudicated_v2_classification",
            "adjudication_status",
            "rationale",
            "reviewed_at",
        ],
    )

    if args.apply:
        manual_rows = list(
            csv.DictReader(args.manual_decisions.open("r", encoding="utf-8", newline=""))
        )
        manual_by_hash = {
            v2_text_hash(v2_normalize(row.get("why_stopped"))): row for row in manual_rows
        }
        for digest, correction in CORRECTIONS.items():
            v2_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
            for row in rows_by_benchmark_hash[digest]:
                v2_groups[str(row.get("classification_text_hash"))].append(row)
            for exact_hash, matching_rows in v2_groups.items():
                example = str(matching_rows[0].get("why_stopped") or "")
                manual_by_hash[exact_hash] = {
                    "why_stopped": example,
                    "outcome": correction["outcome"],
                    "primary_reason": correction["primary"],
                    "secondary_reasons": ";".join(correction["secondary"]),
                    "needs_review": "false",
                    "decision_status": "APPROVED",
                    "reviewer_notes": (
                        f"Open Targets full adjudication {digest}: {correction['rationale']}"
                    ),
                    "reviewed_at": REVIEWED_AT,
                }
        write_csv(
            args.manual_decisions,
            sorted(manual_by_hash.values(), key=lambda row: v2_normalize(row["why_stopped"])),
            [
                "why_stopped",
                "outcome",
                "primary_reason",
                "secondary_reasons",
                "needs_review",
                "decision_status",
                "reviewer_notes",
                "reviewed_at",
            ],
        )

    status_counts = Counter(row["adjudication_status"] for row in adjudications)
    print(
        json.dumps(
            {
                "conflict_rows": len(adjudications),
                "unique_texts": len(labels_by_hash),
                "correction_text_groups": len(CORRECTIONS),
                "status_counts": dict(status_counts.most_common()),
                "manual_decisions_updated": args.apply,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
