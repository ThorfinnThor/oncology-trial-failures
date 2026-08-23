#!/usr/bin/env python3
"""Evaluate Classification V2 against the structured semantic audit."""

from __future__ import annotations

import argparse
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple

try:
    from classification_v2 import classify_reason_v2
except ImportError:
    from scripts.classification_v2 import classify_reason_v2


def load_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def label_key(label: str, reason: str) -> str:
    return f"{label}/{reason}"


def safe_ratio(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 4) if denominator else 0.0


def evaluate(rows: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    total = 0
    adjudicated = 0
    correct = 0
    review_total = 0
    review_flagged = 0
    predicted_review = 0
    asserted = 0
    asserted_correct = 0
    high_asserted = 0
    high_asserted_correct = 0
    biological_asserted = 0
    biological_correct = 0
    expected_biological = 0
    biological_found = 0
    confusion: Counter[Tuple[str, str]] = Counter()
    errors_by_expected: Counter[str] = Counter()
    errors_by_predicted: Counter[str] = Counter()
    examples = defaultdict(list)

    for row in rows:
        total += 1
        result = classify_reason_v2(row.get("why_stopped"))
        predicted = label_key(result.legacy_label, result.legacy_reason)
        if result.needs_review:
            predicted_review += 1

        if row["audit_result"] == "REVIEW":
            review_total += 1
            if result.needs_review:
                review_flagged += 1
            elif len(examples["review_not_flagged"]) < 25:
                examples["review_not_flagged"].append(
                    {"nct_id": row["nct_id"], "predicted": predicted, "text": row["why_stopped"]}
                )
            continue

        adjudicated += 1
        expected = label_key(row["expected_label"], row["expected_reason"])
        confusion[(expected, predicted)] += 1
        is_correct = expected == predicted
        if is_correct:
            correct += 1
        else:
            errors_by_expected[expected] += 1
            errors_by_predicted[predicted] += 1
            if len(examples["misclassified"]) < 60:
                examples["misclassified"].append(
                    {
                        "nct_id": row["nct_id"],
                        "expected": expected,
                        "predicted": predicted,
                        "v2_outcome": result.outcome,
                        "v2_primary": result.primary_reason,
                        "needs_review": result.needs_review,
                        "text": row["why_stopped"],
                    }
                )

        if row["expected_label"] == "BIOLOGICAL_FAILURE":
            expected_biological += 1
            if result.legacy_label == "BIOLOGICAL_FAILURE":
                biological_found += 1

        if not result.needs_review:
            asserted += 1
            if is_correct:
                asserted_correct += 1
            if result.confidence == "HIGH":
                high_asserted += 1
                if is_correct:
                    high_asserted_correct += 1
            if result.legacy_label == "BIOLOGICAL_FAILURE":
                biological_asserted += 1
                if row["expected_label"] == "BIOLOGICAL_FAILURE" and row["expected_reason"] == result.legacy_reason:
                    biological_correct += 1

    return {
        "schema_version": 1,
        "records": {
            "total": total,
            "adjudicated": adjudicated,
            "audit_review": review_total,
        },
        "metrics": {
            "legacy_accuracy_all_adjudicated": safe_ratio(correct, adjudicated),
            "assertion_coverage": safe_ratio(asserted, adjudicated),
            "assertion_precision": safe_ratio(asserted_correct, asserted),
            "high_confidence_assertion_precision": safe_ratio(high_asserted_correct, high_asserted),
            "biological_precision": safe_ratio(biological_correct, biological_asserted),
            "biological_recall": safe_ratio(biological_found, expected_biological),
            "audit_review_recall": safe_ratio(review_flagged, review_total),
            "overall_review_rate": safe_ratio(predicted_review, total),
        },
        "counts": {
            "correct": correct,
            "asserted": asserted,
            "asserted_correct": asserted_correct,
            "high_confidence_asserted": high_asserted,
            "high_confidence_asserted_correct": high_asserted_correct,
            "biological_asserted": biological_asserted,
            "biological_correct": biological_correct,
            "expected_biological": expected_biological,
            "biological_found": biological_found,
            "audit_review_flagged": review_flagged,
            "predicted_review": predicted_review,
        },
        "errors_by_expected": dict(errors_by_expected.most_common()),
        "errors_by_predicted": dict(errors_by_predicted.most_common()),
        "confusion": [
            {"expected": expected, "predicted": predicted, "count": count}
            for (expected, predicted), count in confusion.most_common()
        ],
        "examples": dict(examples),
    }


def enforce(report: Dict[str, Any]) -> None:
    metrics = report["metrics"]
    requirements = {
        "assertion_precision": 0.99,
        "high_confidence_assertion_precision": 0.99,
        "biological_precision": 0.98,
        "biological_recall": 0.55,
        "audit_review_recall": 0.85,
    }
    failures = [
        f"{name}={metrics[name]:.4f} < {minimum:.4f}"
        for name, minimum in requirements.items()
        if metrics[name] < minimum
    ]
    if failures:
        raise SystemExit("Quality gate failed: " + "; ".join(failures))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gold", default="tests/classification_gold_v2.jsonl")
    parser.add_argument("--output", default="data/classification_v2_quality.json")
    parser.add_argument("--enforce", action="store_true")
    args = parser.parse_args()

    report = evaluate(load_jsonl(Path(args.gold)))
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["metrics"], indent=2))
    print(f"Wrote quality report to {output}")
    if args.enforce:
        enforce(report)


if __name__ == "__main__":
    main()
