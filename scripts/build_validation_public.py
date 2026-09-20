#!/usr/bin/env python3
"""Publish the held-out validation detail for the website.

The precision and recall figures were public but the evidence behind them was not:
how the sample was drawn, who annotated it, how disagreements were resolved, the
prevalence of each class and the confusion matrix. A reviewer cannot judge a label
quality claim from two numbers, so this writes the whole thing to web/data.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VALIDATION = ROOT / "validation"
OUT = ROOT / "web/data/validation_v2.json"


def main() -> int:
    metrics = json.loads((VALIDATION / "heldout_v2_metrics.json").read_text())
    sample = json.loads((VALIDATION / "heldout_v2_sample_meta.json").read_text())
    annotation = json.loads((VALIDATION / "heldout_v2_annotation_meta.json").read_text())

    OUT.write_text(json.dumps({
        "schema_version": 1,
        "generated_at_utc": metrics["generated_at_utc"],
        "dataset_version": metrics["dataset_version"],
        "classifier_version": metrics["classifier_version"],
        "sample_size": metrics["sample_size"],
        "population": metrics["population"],
        "sampling": {
            "seed": sample["seed"],
            "excluded_records": sample["excluded_records"],
            "eligible_unique_texts_by_outcome": sample["eligible_unique_texts_by_outcome"],
            "eligible_records_by_outcome": sample["eligible_records_by_outcome"],
            "sampled_unique_texts_by_outcome": sample.get("sampled_unique_texts_by_outcome", {}),
        },
        "annotation": annotation,
        "estimates": metrics["weighted_estimates"],
        "estimates_ci95": metrics["weighted_estimates_ci95"],
        "interval_method": metrics["interval_method"],
        "stratum_weights": metrics["stratum_weights"],
        "sample_counts_unweighted": metrics["sample_counts_unweighted"],
        "per_predicted_outcome": metrics["per_predicted_outcome"],
        "confusion_pred_vs_ref": metrics["confusion_pred_vs_ref"],
        "error_count_outcome_or_primary": metrics["error_count_outcome_or_primary"],
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} (sample {metrics['sample_size']}, classifier {metrics['classifier_version']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
