#!/usr/bin/env python3
"""Reclassify a stopped-trial snapshot with Classification V2.

The default mode is a dry run that writes only a report and a grouped review
queue.  ``--write`` updates the canonical JSON/CSV and biological subset.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any, Dict, Iterable, List

try:
    from classification_v2 import (
        CLASSIFIER_VERSION,
        classification_source,
        classify_reason_v2,
        classify_with_v2_fallback,
        load_reviewed_reason_index,
    )
    from classification_review_dispositions_v2 import (
        augment_review_queue,
        build_disposition_payload,
    )
except ImportError:
    from scripts.classification_v2 import (
        CLASSIFIER_VERSION,
        classification_source,
        classify_reason_v2,
        classify_with_v2_fallback,
        load_reviewed_reason_index,
    )
    from scripts.classification_review_dispositions_v2 import (
        augment_review_queue,
        build_disposition_payload,
    )


V2_FIELDS = (
    "classification_outcome_v2",
    "classification_primary_reason_v2",
    "classification_secondary_reasons_v2",
    "classification_needs_review",
    "classification_version",
    "classification_text_hash",
    "classification_source",
)

PRESERVED_SOURCES = {"MANUAL_NCT_OVERRIDE", "DESCRIPTION_FALLBACK"}


def revalidate_description_fallback(
    row: Dict[str, Any],
    reviewed_index: Dict[str, Dict[str, Any]],
) -> Dict[str, Any] | None:
    """Re-run a stored source snippet before carrying it across V2 versions."""

    evidence = str(row.get("classification_evidence") or "")
    marker = "source.description_fallback:"
    if marker not in evidence:
        return None
    candidate = evidence.split(marker, 1)[1].strip()
    if not candidate:
        return None
    result = classify_with_v2_fallback(
        row.get("why_stopped"),
        "",
        candidate,
        reviewed_index,
    )
    if (
        result.needs_review
        or result.confidence != "HIGH"
        or classification_source(result) != "DESCRIPTION_FALLBACK"
        or result.outcome != row.get("classification_outcome_v2")
        or result.primary_reason != row.get("classification_primary_reason_v2")
    ):
        return None
    fields = result.as_record_fields()
    fields["classification_source"] = "DESCRIPTION_FALLBACK"
    return fields


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_csv(path: Path, rows: List[Dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    fieldnames: List[str] = []
    seen = set()
    for row in rows:
        for key in row:
            if key not in seen:
                seen.add(key)
                fieldnames.append(key)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def classify_rows(
    rows: Iterable[Dict[str, Any]],
    reviewed_index: Dict[str, Dict[str, Any]],
) -> tuple[List[Dict[str, Any]], Dict[str, Any], List[Dict[str, Any]]]:
    output: List[Dict[str, Any]] = []
    transitions: Counter[str] = Counter()
    outcomes: Counter[str] = Counter()
    primary_reasons: Counter[str] = Counter()
    sources: Counter[str] = Counter()
    confidence: Counter[str] = Counter()
    review_groups: Dict[str, Dict[str, Any]] = {}

    for row in rows:
        old_key = f"{row.get('classification_label', '')}/{row.get('classification_reason', '')}"
        existing_source = str(row.get("classification_source") or "").upper()
        preserve_existing = (
            existing_source in PRESERVED_SOURCES
            and row.get("classification_version") == CLASSIFIER_VERSION
        )
        revalidated_fallback = None
        if existing_source == "DESCRIPTION_FALLBACK" and not preserve_existing:
            revalidated_fallback = revalidate_description_fallback(row, reviewed_index)
        if revalidated_fallback is not None:
            fields = revalidated_fallback
            source = "DESCRIPTION_FALLBACK"
            outcome = str(fields["classification_outcome_v2"])
            primary_reason = str(fields["classification_primary_reason_v2"])
            needs_review = bool(fields["classification_needs_review"])
            confidence_value = str(fields["classification_confidence"])
            evidence_string = str(fields["classification_evidence"])
            text_digest = str(fields["classification_text_hash"])
            secondary_reasons = [
                value.strip()
                for value in str(fields["classification_secondary_reasons_v2"]).split(";")
                if value.strip()
            ]
        elif preserve_existing:
            fields = {key: row.get(key) for key in V2_FIELDS}
            fields.update(
                {
                    "classification_label": row.get("classification_label"),
                    "classification_reason": row.get("classification_reason"),
                    "classification_confidence": row.get("classification_confidence"),
                    "classification_evidence": row.get("classification_evidence"),
                }
            )
            source = existing_source
            outcome = str(row.get("classification_outcome_v2") or "UNKNOWN")
            primary_reason = str(
                row.get("classification_primary_reason_v2") or "UNSPECIFIED"
            )
            needs_review = bool(row.get("classification_needs_review"))
            confidence_value = str(row.get("classification_confidence") or "LOW")
            evidence_string = str(row.get("classification_evidence") or "")
            text_digest = str(row.get("classification_text_hash") or "")
            secondary_reasons = [
                value.strip()
                for value in str(
                    row.get("classification_secondary_reasons_v2") or ""
                ).split(";")
                if value.strip()
            ]
        else:
            result = classify_reason_v2(row.get("why_stopped"), reviewed_index)
            fields = result.as_record_fields()
            source = classification_source(result)
            fields["classification_source"] = source
            outcome = result.outcome
            primary_reason = result.primary_reason
            needs_review = result.needs_review
            confidence_value = result.confidence
            evidence_string = result.evidence_string()
            text_digest = result.normalized_text_hash
            secondary_reasons = list(result.secondary_reasons)
        updated = {**row, **fields}
        output.append(updated)

        new_key = (
            f"{updated.get('classification_label', '')}/"
            f"{updated.get('classification_reason', '')}"
        )
        transitions[f"{old_key} -> {new_key}"] += 1
        outcomes[outcome] += 1
        primary_reasons[primary_reason] += 1
        sources[source] += 1
        confidence[confidence_value] += 1

        if needs_review:
            digest = text_digest
            group = review_groups.setdefault(
                digest,
                {
                    "classification_text_hash": digest,
                    "why_stopped": row.get("why_stopped") or "",
                    "record_count": 0,
                    "nct_ids": [],
                    "current_v1_labels": Counter(),
                    "suggested_outcome_v2": outcome,
                    "suggested_primary_reason_v2": primary_reason,
                    "suggested_secondary_reasons_v2": secondary_reasons,
                    "evidence": evidence_string,
                },
            )
            group["record_count"] += 1
            group["nct_ids"].append(row.get("nct_id"))
            group["current_v1_labels"][old_key] += 1

    queue: List[Dict[str, Any]] = []
    for group in review_groups.values():
        group["current_v1_labels"] = dict(group["current_v1_labels"].most_common())
        queue.append(group)
    queue.sort(key=lambda item: (-item["record_count"], item["classification_text_hash"]))
    queue, disposition_summary = augment_review_queue(queue)

    report = {
        "schema_version": 1,
        "classifier_version": CLASSIFIER_VERSION,
        "record_count": len(output),
        "review_record_count": sum(item["record_count"] for item in queue),
        "review_unique_reason_count": len(queue),
        "reviewed_reason_index_count": len(reviewed_index),
        "outcomes": dict(outcomes.most_common()),
        "primary_reasons": dict(primary_reasons.most_common()),
        "sources": dict(sources.most_common()),
        "confidence": dict(confidence.most_common()),
        **disposition_summary,
        "legacy_transitions": dict(transitions.most_common()),
    }
    return output, report, queue


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/all_stopped_trials.json")
    parser.add_argument("--reviewed-index", default="data/classification_reviewed_reasons_v2.json")
    parser.add_argument("--report", default="data/classification_v2_reclassification_report.json")
    parser.add_argument("--review-queue", default="data/classification_review_queue_v2.json")
    parser.add_argument(
        "--review-dispositions",
        default="data/classification_review_dispositions_v2.json",
    )
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()

    input_path = Path(args.input)
    rows = json.loads(input_path.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise ValueError(f"{input_path} must contain a JSON array")
    reviewed_index = load_reviewed_reason_index(args.reviewed_index)
    updated, report, queue = classify_rows(rows, reviewed_index)
    write_json(Path(args.report), report)
    write_json(Path(args.review_queue), queue)
    disposition_summary = {
        key: report[key]
        for key in (
            "disposition_group_counts",
            "disposition_record_counts",
            "priority_group_counts",
            "priority_record_counts",
        )
    }
    write_json(
        Path(args.review_dispositions),
        build_disposition_payload(queue, disposition_summary),
    )

    if args.write:
        write_json(input_path, updated)
        write_csv(input_path.with_suffix(".csv"), updated)
        biological = [
            row
            for row in updated
            if row.get("classification_label") == "BIOLOGICAL_FAILURE"
            and row.get("classification_needs_review") is False
        ]
        write_json(Path("data/biological_failure_trials.json"), biological)
        write_csv(Path("data/biological_failure_trials.csv"), biological)
        oncology = [
            row
            for row in updated
            if row.get("disease_area") == "Oncology"
            or "Oncology" in str(row.get("disease_areas_matched") or "").split("; ")
        ]
        biological_oncology = [
            row for row in oncology if row.get("classification_label") == "BIOLOGICAL_FAILURE"
        ]
        write_json(Path("data/all_oncology_stopped_trials.json"), oncology)
        write_csv(Path("data/all_oncology_stopped_trials.csv"), oncology)
        write_json(Path("data/biological_failure_oncology_trials.json"), biological_oncology)
        write_csv(Path("data/biological_failure_oncology_trials.csv"), biological_oncology)

    mode = "updated canonical data" if args.write else "dry run"
    print(
        f"Classification V2 {mode}: {len(updated)} records; "
        f"{report['review_record_count']} records / {report['review_unique_reason_count']} "
        "unique reasons require review"
    )


if __name__ == "__main__":
    main()
