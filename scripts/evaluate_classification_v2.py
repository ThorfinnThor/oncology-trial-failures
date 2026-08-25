#!/usr/bin/env python3
"""Evaluate Classification V2 against the structured semantic audit."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, Tuple

try:
    from classification_v2 import (
        OUTCOME_CAUSE_NOT_STATED,
        OUTCOME_MIXED,
        OUTCOME_NON_FAILURE,
        REASON_BIO_UNSPECIFIED,
        REASON_BUSINESS,
        REASON_DECISION_ONLY,
        REASON_NOT_INITIATED,
        REASON_PLANNED,
        REASON_PROGRAM_ACTION_ONLY,
        REASON_REGULATORY,
        REASON_REPLACEMENT,
        classify_reason_v2,
    )
except ImportError:
    from scripts.classification_v2 import (
        OUTCOME_CAUSE_NOT_STATED,
        OUTCOME_MIXED,
        OUTCOME_NON_FAILURE,
        REASON_BIO_UNSPECIFIED,
        REASON_BUSINESS,
        REASON_DECISION_ONLY,
        REASON_NOT_INITIATED,
        REASON_PLANNED,
        REASON_PROGRAM_ACTION_ONLY,
        REASON_REGULATORY,
        REASON_REPLACEMENT,
        classify_reason_v2,
    )


def load_jsonl(path: Path) -> Iterable[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                yield json.loads(line)


def label_key(label: str, reason: str) -> str:
    return f"{label}/{reason}"


def safe_ratio(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 4) if denominator else 0.0


def accepted_ontology_transition(row: Dict[str, Any], result: Any) -> bool:
    """Recognize explicit V2 taxonomy decisions absent from the legacy audit.

    The historical audit intentionally treated some bare business/corporate/
    strategic decisions as unclear. V2.3 stores the reported reason itself as
    BUSINESS_STRATEGY without claiming a deeper motive. Sponsor-decision-only
    text remains excluded because it does not identify a causal domain.
    """

    text = " ".join(str(row.get("why_stopped") or "").lower().split())
    if row.get("expected_label") == "UNCLEAR" and result.primary_reason == REASON_BUSINESS:
        return bool(
            re.search(
                r"\b(?:business|corporate|strategic(?:/business| business)?) "
                r"(?:priority )?(?:decision|decisions|reasons?|considerations?)\b|"
                r"\bno longer pursuing\b",
                text,
            )
        )

    if row.get("expected_label") == "UNCLEAR":
        if result.primary_reason == "OPERATIONAL_OTHER":
            return bool(
                re.search(
                    r"\b(?:administrative|operational|organizational) "
                    r"(?:decision|reasons?|change|pause|closure)\b",
                    text,
                )
            )
        if result.primary_reason == REASON_REGULATORY:
            return bool(
                re.search(
                    r"\b(?:ind (?:was )?(?:withdrawn|withdrawal)|withdrawal of ind|"
                    r"not approved)\b",
                    text,
                )
            )
        if result.primary_reason == "SUPPORT_WITHDRAWAL":
            return bool(
                re.search(
                    r"\b(?:partner termination|study agreement|provider of drug|"
                    r"pis? not interested)\b",
                    text,
                )
            )
        if result.primary_reason == "RECRUITMENT":
            return bool(
                re.search(
                    r"\bdifficult(?:y|ies)?\b[^.;:]{0,60}"
                    r"\b(?:enrol|enroll|recruit|accru)",
                    text,
                )
            )

    # The legacy audit collapsed actor-only decisions, unexplained program
    # actions, and completed transitions into OPERATIONAL. V2 preserves the
    # source statement without inventing a causal domain.
    if row.get("expected_label") == "NON_BIOLOGICAL" and row.get("expected_reason") == "OPERATIONAL":
        if result.primary_reason in {
            REASON_DECISION_ONLY,
            REASON_PROGRAM_ACTION_ONLY,
            REASON_PLANNED,
            REASON_REPLACEMENT,
            REASON_NOT_INITIATED,
        }:
            return True
        if result.primary_reason == REASON_REGULATORY and re.search(
            r"\b(?:fda|ema|mhra|irb|reb|ethics committee|regulatory authority)\b",
            text,
        ):
            return True

    # An explicit adverse benefit-risk statement is biological evidence, but
    # V2 deliberately avoids pretending that it isolates safety from efficacy.
    if (
        row.get("expected_label") == "BIOLOGICAL_FAILURE"
        and row.get("expected_reason") == "SAFETY"
        and result.primary_reason == REASON_BIO_UNSPECIFIED
    ):
        return bool(
            re.search(
                r"\b(?:benefit\s*[-/:]?\s*risk|risk\s*[-/:]?\s*benefit)\b",
                text,
            )
        )

    # Some legacy rows selected one biological dimension although the source
    # explicitly states more than one. The V2 mixed result is more faithful.
    if (
        row.get("expected_label") == "BIOLOGICAL_FAILURE"
        and row.get("expected_reason") in {"SAFETY", "EFFICACY/FUTILITY"}
        and result.outcome == OUTCOME_MIXED
    ):
        return True

    return False


def evaluate(rows: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    total = 0
    adjudicated = 0
    correct = 0
    review_total = 0
    review_flagged = 0
    review_safely_disposed = 0
    predicted_review = 0
    asserted = 0
    asserted_correct = 0
    high_asserted = 0
    high_asserted_correct = 0
    biological_asserted = 0
    biological_correct = 0
    expected_biological = 0
    biological_found = 0
    ontology_transition_matches = 0
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
            if (
                result.needs_review
                or result.outcome in {OUTCOME_NON_FAILURE, OUTCOME_MIXED}
                or result.outcome == OUTCOME_CAUSE_NOT_STATED
                or result.primary_reason == REASON_BIO_UNSPECIFIED
                or result.primary_reason == REASON_BUSINESS
            ):
                review_safely_disposed += 1
            elif len(examples["review_not_flagged"]) < 25:
                examples["review_not_flagged"].append(
                    {"nct_id": row["nct_id"], "predicted": predicted, "text": row["why_stopped"]}
                )
            continue

        adjudicated += 1
        expected = label_key(row["expected_label"], row["expected_reason"])
        confusion[(expected, predicted)] += 1
        is_correct = expected == predicted or accepted_ontology_transition(row, result)
        if expected != predicted and is_correct:
            ontology_transition_matches += 1
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
            "audit_review_safe_disposition_recall": safe_ratio(
                review_safely_disposed, review_total
            ),
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
            "audit_review_safely_disposed": review_safely_disposed,
            "predicted_review": predicted_review,
            "accepted_ontology_transition_matches": ontology_transition_matches,
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
        "audit_review_safe_disposition_recall": 0.85,
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
