#!/usr/bin/env python3
"""Benchmark the current V2 classifications against the pinned Open Targets labels."""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import re
import shutil
import subprocess
import unicodedata
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OPEN_TARGETS_COMMIT = "2c6c46871b025d47c494f0cfc2235dcf2cadc1fd"
OPEN_TARGETS_SHA256 = "d7e384b6eecfa72e42e5688ce914fc73e4bc7f83357d11caa921ce5f3df57b14"
OPEN_TARGETS_URL = (
    "https://huggingface.co/datasets/opentargets/clinical_trial_reason_to_stop/"
    f"resolve/{OPEN_TARGETS_COMMIT}/data.json"
)

ANCHOR_RULES = {
    "Negative": {
        "description": "V2 outcome is biological failure and category is efficacy/futility or biological unspecified.",
        "allowed_outcomes": {"BIOLOGICAL_FAILURE"},
        "allowed_categories": {"EFFICACY_FUTILITY", "BIOLOGICAL_UNSPECIFIED"},
    },
    "Safety_Sideeffects": {
        "description": "V2 final category is safety.",
        "allowed_outcomes": None,
        "allowed_categories": {"SAFETY"},
    },
    "Insufficient_Enrollment": {
        "description": "V2 final category is recruitment.",
        "allowed_outcomes": None,
        "allowed_categories": {"RECRUITMENT"},
    },
    "Regulatory": {
        "description": "V2 final category is regulatory.",
        "allowed_outcomes": None,
        "allowed_categories": {"REGULATORY"},
    },
    "Covid19": {
        "description": "V2 final category is external disruption.",
        "allowed_outcomes": None,
        "allowed_categories": {"EXTERNAL_DISRUPTION"},
    },
    "Study_Staff_Moved": {
        "description": "V2 final category is staffing/resources.",
        "allowed_outcomes": None,
        "allowed_categories": {"STAFFING_RESOURCES"},
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--ours",
        type=Path,
        default=ROOT / "data" / "all_stopped_trials.json",
        help="Current Clinical Trial Failures JSON export.",
    )
    parser.add_argument(
        "--open-targets-file",
        type=Path,
        help="Optional local copy of the pinned Open Targets JSONL file.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "data" / "benchmarks" / "opentargets_v2_baseline.json",
    )
    parser.add_argument(
        "--disagreements",
        type=Path,
        default=ROOT / "data" / "benchmarks" / "opentargets_v2_disagreements.csv",
    )
    parser.add_argument(
        "--markdown",
        type=Path,
        default=ROOT / "docs" / "opentargets_v2_baseline.md",
    )
    return parser.parse_args()


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def stable_generated_at(output: Path, ours_sha: str, external_sha: str) -> str:
    if output.exists():
        try:
            previous = json.loads(output.read_text(encoding="utf-8"))
            previous_ours = previous.get("clinical_trial_failures_snapshot", {}).get("sha256")
            previous_external = previous.get("open_targets_snapshot", {}).get("sha256")
            if previous_ours == ours_sha and previous_external == external_sha:
                return str(previous["generated_at"])
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            pass
    return datetime.now(timezone.utc).isoformat()


def load_open_targets(path: Path | None) -> tuple[list[dict[str, Any]], str]:
    if path:
        payload = path.read_bytes()
    elif shutil.which("curl"):
        result = subprocess.run(
            [
                "curl",
                "--fail",
                "--silent",
                "--show-error",
                "--location",
                "--max-time",
                "60",
                OPEN_TARGETS_URL,
            ],
            check=True,
            capture_output=True,
        )
        payload = result.stdout
    else:
        request = urllib.request.Request(
            OPEN_TARGETS_URL,
            headers={"User-Agent": "clinicaltrialfailures-benchmark/1.0"},
        )
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = response.read()

    actual_sha = sha256_bytes(payload)
    if actual_sha != OPEN_TARGETS_SHA256:
        raise ValueError(
            "Open Targets checksum mismatch: "
            f"expected {OPEN_TARGETS_SHA256}, received {actual_sha}"
        )

    rows = [json.loads(line) for line in payload.decode("utf-8").splitlines() if line.strip()]
    return rows, actual_sha


def normalize_reason(value: Any) -> str:
    text = html.unescape(str(value or ""))
    text = unicodedata.normalize("NFKC", text)
    text = text.replace("Ê", " ").replace("\u00a0", " ")
    text = text.replace("‘", "'").replace("’", "'")
    text = text.replace("“", '"').replace("”", '"')
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def text_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:20]


def percent(numerator: int, denominator: int) -> float | None:
    if not denominator:
        return None
    return round(numerator / denominator * 100, 1)


def row_pair(row: dict[str, Any]) -> tuple[str, str]:
    return (
        str(row.get("classification_final_outcome") or "<blank>"),
        str(row.get("classification_final_category") or "<blank>"),
    )


def anchor_agrees(rule: dict[str, Any], row: dict[str, Any]) -> bool:
    outcome, category = row_pair(row)
    allowed_outcomes = rule["allowed_outcomes"]
    allowed_categories = rule["allowed_categories"]
    return (
        (allowed_outcomes is None or outcome in allowed_outcomes)
        and (allowed_categories is None or category in allowed_categories)
    )


def build_markdown(report: dict[str, Any]) -> str:
    overlap = report["exact_normalized_overlap"]
    anchors = report["comparable_anchor_agreement"]
    biological = report["broad_biological_agreement"]
    ours = report["clinical_trial_failures_snapshot"]
    external = report["open_targets_snapshot"]

    anchor_rows = "\n".join(
        f"| `{label}` | {metrics['comparisons']} | {metrics['any_agreements']} | "
        f"{metrics['any_agreement_rate']}% |"
        for label, metrics in anchors.items()
    )

    return f"""# Open Targets benchmark baseline

Generated: {report['generated_at']}

Clinical Trial Failures snapshot: `{ours['sha256']}`

Classifier versions: {', '.join(f'`{key}` ({value:,})' for key, value in ours['classification_versions'].items())}

Open Targets commit: [`{external['commit']}`]({external['commit_url']})

## Purpose

This report establishes the pre-automation V2 benchmark against the public Open Targets `clinical_trial_reason_to_stop` dataset. It is a conservative external plausibility check, not a ground-truth evaluation. The taxonomies differ and Open Targets does not provide NCT IDs.

## Snapshot

| Dataset | Rows | Rows/texts with a stop reason | Identifier |
| --- | ---: | ---: | --- |
| Clinical Trial Failures V2 | {ours['rows']:,} | {ours['rows_with_stop_reason']:,} | NCT ID included |
| Open Targets | {external['rows']:,} | {external['unique_normalized_texts']:,} unique normalized texts | No NCT ID |

## Exact normalized-text overlap

| Metric | Result |
| --- | ---: |
| Open Targets rows matched | {overlap['open_targets_rows_matched']:,} / {external['rows']:,} ({overlap['open_targets_row_match_rate']}%) |
| Unique Open Targets texts matched | {overlap['unique_open_targets_texts_matched']:,} / {external['unique_normalized_texts']:,} ({overlap['unique_open_targets_text_match_rate']}%) |
| Clinical Trial Failures NCT records sharing a matched text | {overlap['unique_our_nct_ids_matched']:,} / {ours['rows']:,} ({overlap['our_dataset_candidate_match_rate']}%) |
| Matched Open Targets rows with multiple possible NCT records | {overlap['matched_open_targets_rows_with_multiple_our_trials']:,} |

The NCT-record count is a candidate overlap, not a trial-level join. Generic stop reasons can occur in multiple records and Open Targets does not expose the original NCT ID.

## Comparable anchors

Each unique normalized text contributes at most one comparison per Open Targets label. "Any agreement" means that at least one Clinical Trial Failures record with the same text satisfies the narrow mapping defined in the benchmark script.

| Open Targets label | Comparable texts | Any agreements | Agreement rate |
| --- | ---: | ---: | ---: |
{anchor_rows}

For the broader biological question, Open Targets `Negative` or `Safety_Sideeffects` agrees with V2 `BIOLOGICAL_FAILURE` or `MIXED_CAUSES` for **{biological['agreements']}/{biological['comparisons']} texts ({biological['agreement_rate']}%)**.

## Interpretation

- High recruitment and COVID-19 agreement supports the core normalization and cause rules.
- Lower narrow agreement for biological labels partly reflects V2's separation of efficacy, safety, biological-unspecified, and mixed causes.
- Lower regulatory agreement partly reflects V2 review gating: a committee or regulator action without a directional cause is not automatically treated as the underlying stop reason.
- Broad Open Targets labels such as `Business_Administrative`, `Study_Design`, `Logistics_Resources`, and `Invalid_Reason` are intentionally not assigned a single agreement score because they map to several V2 categories.

## Manual follow-up

A manual screen of the broad biological disagreements and the clearest non-biological anchor conflicts identified six high-priority V2 audit candidates. They are recorded in `data/benchmarks/opentargets_v2_manual_review_candidates.csv`. These are review candidates, not accepted Open Targets corrections, and no V2 label is changed by this benchmark.

The full list of narrow anchor conflicts is available in `data/benchmarks/opentargets_v2_disagreements.csv`. It contains text hashes and NCT IDs rather than republishing external stop-reason text.

## Method

1. Pin the Open Targets dataset to commit `{external['commit']}` and verify SHA-256 `{external['sha256']}`.
2. Decode HTML entities, normalize Unicode, replace the source `Ê` spacing artifact, lowercase, remove punctuation, and collapse whitespace.
3. Match only identical normalized reason strings. No fuzzy matches are included.
4. Compare labels at the unique-text level to avoid overweighting repeated generic stop reasons.
5. Keep disagreement details text-free in the committed CSV; use the included NCT IDs to inspect source language in the local dataset.

## Limitations

- Open Targets has no NCT IDs, so exact trial-level overlap cannot be established.
- The classification systems are many-to-many rather than equivalent.
- Open Targets may reflect older registry text while V2 uses the current repository snapshot.
- This benchmark measures agreement with an external annotation set, not medical or causal correctness.
- Fuzzy matching is excluded from the baseline to avoid false overlap.

## Reproduce

```bash
python3 scripts/benchmark_opentargets_v2.py
```

For an already downloaded pinned file:

```bash
python3 scripts/benchmark_opentargets_v2.py --open-targets-file /path/to/data.json
```
"""


def main() -> None:
    args = parse_args()
    open_targets, open_targets_sha = load_open_targets(args.open_targets_file)
    ours = json.loads(args.ours.read_text(encoding="utf-8"))

    ours_by_text: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in ours:
        key = normalize_reason(row.get("why_stopped"))
        if key:
            ours_by_text[key].append(row)

    open_targets_by_text: dict[str, dict[str, Any]] = {}
    open_targets_label_counts: Counter[str] = Counter()
    for row in open_targets:
        key = normalize_reason(row.get("text"))
        item = open_targets_by_text.setdefault(key, {"row_count": 0, "labels": set()})
        item["row_count"] += 1
        labels = row.get("label_descriptions") or []
        item["labels"].update(labels)
        open_targets_label_counts.update(labels)

    matched_keys = set(open_targets_by_text).intersection(ours_by_text)
    matched_open_targets_rows = sum(open_targets_by_text[key]["row_count"] for key in matched_keys)
    matched_our_ids = {
        row.get("nct_id")
        for key in matched_keys
        for row in ours_by_text[key]
        if row.get("nct_id")
    }
    multi_match_rows = sum(
        open_targets_by_text[key]["row_count"]
        for key in matched_keys
        if len(ours_by_text[key]) > 1
    )

    crosswalk: dict[str, Counter[str]] = defaultdict(Counter)
    disagreements: list[dict[str, str]] = []
    anchors: dict[str, dict[str, Any]] = {}

    for label, rule in ANCHOR_RULES.items():
        comparison_keys = sorted(
            key for key in matched_keys if label in open_targets_by_text[key]["labels"]
        )
        any_agreements = 0
        unanimous_agreements = 0
        for key in comparison_keys:
            matched_rows = ours_by_text[key]
            results = [anchor_agrees(rule, row) for row in matched_rows]
            if any(results):
                any_agreements += 1
            if all(results):
                unanimous_agreements += 1
            if not any(results):
                pairs = sorted({"/".join(row_pair(row)) for row in matched_rows})
                disagreements.append(
                    {
                        "open_targets_label": label,
                        "normalized_text_hash": text_hash(key),
                        "sample_nct_ids": ";".join(
                            str(row.get("nct_id")) for row in matched_rows[:5] if row.get("nct_id")
                        ),
                        "our_classifications": ";".join(pairs),
                        "matching_our_records": str(len(matched_rows)),
                    }
                )
        anchors[label] = {
            "mapping": rule["description"],
            "comparisons": len(comparison_keys),
            "any_agreements": any_agreements,
            "any_agreement_rate": percent(any_agreements, len(comparison_keys)),
            "unanimous_agreements": unanimous_agreements,
            "unanimous_agreement_rate": percent(unanimous_agreements, len(comparison_keys)),
        }

    for key in sorted(matched_keys):
        pairs = {"/".join(row_pair(row)) for row in ours_by_text[key]}
        for label in open_targets_by_text[key]["labels"]:
            for pair in pairs:
                crosswalk[label][pair] += 1

    biological_keys = {
        key
        for key in matched_keys
        if open_targets_by_text[key]["labels"].intersection({"Negative", "Safety_Sideeffects"})
    }
    broad_biological_agreements = sum(
        1
        for key in biological_keys
        if any(
            row_pair(row)[0] in {"BIOLOGICAL_FAILURE", "MIXED_CAUSES"}
            for row in ours_by_text[key]
        )
    )

    version_counts = Counter(str(row.get("classification_version") or "<blank>") for row in ours)
    outcome_counts = Counter(str(row.get("classification_final_outcome") or "<blank>") for row in ours)
    category_counts = Counter(str(row.get("classification_final_category") or "<blank>") for row in ours)
    ours_sha = sha256_file(args.ours)

    report = {
        "schema_version": "1.0",
        "generated_at": stable_generated_at(args.output, ours_sha, open_targets_sha),
        "clinical_trial_failures_snapshot": {
            "path": display_path(args.ours),
            "sha256": ours_sha,
            "rows": len(ours),
            "rows_with_stop_reason": sum(bool(normalize_reason(row.get("why_stopped"))) for row in ours),
            "latest_registry_update": max(
                (str(row.get("last_update_post_date") or "") for row in ours),
                default="",
            ),
            "classification_versions": dict(sorted(version_counts.items())),
            "final_outcome_counts": dict(outcome_counts.most_common()),
            "final_category_counts": dict(category_counts.most_common()),
        },
        "open_targets_snapshot": {
            "dataset": "opentargets/clinical_trial_reason_to_stop",
            "dataset_url": "https://huggingface.co/datasets/opentargets/clinical_trial_reason_to_stop",
            "commit": OPEN_TARGETS_COMMIT,
            "commit_url": (
                "https://huggingface.co/datasets/opentargets/clinical_trial_reason_to_stop/"
                f"commit/{OPEN_TARGETS_COMMIT}"
            ),
            "download_url": OPEN_TARGETS_URL,
            "sha256": open_targets_sha,
            "license": "Apache-2.0",
            "rows": len(open_targets),
            "unique_normalized_texts": len(open_targets_by_text),
            "duplicate_rows": len(open_targets) - len(open_targets_by_text),
            "label_counts": dict(open_targets_label_counts.most_common()),
        },
        "methodology": {
            "match_unit": "unique normalized stop-reason text",
            "matching": "exact only",
            "normalization": [
                "HTML entity decoding",
                "Unicode NFKC",
                "source spacing artifact replacement",
                "lowercase",
                "punctuation removal",
                "whitespace collapse",
            ],
            "fuzzy_matching_included": False,
            "taxonomy_relationship": "many-to-many",
        },
        "exact_normalized_overlap": {
            "open_targets_rows_matched": matched_open_targets_rows,
            "open_targets_row_match_rate": percent(matched_open_targets_rows, len(open_targets)),
            "unique_open_targets_texts_matched": len(matched_keys),
            "unique_open_targets_text_match_rate": percent(len(matched_keys), len(open_targets_by_text)),
            "unique_our_nct_ids_matched": len(matched_our_ids),
            "our_dataset_candidate_match_rate": percent(len(matched_our_ids), len(ours)),
            "matched_open_targets_rows_with_multiple_our_trials": multi_match_rows,
        },
        "comparable_anchor_agreement": anchors,
        "broad_biological_agreement": {
            "open_targets_labels": ["Negative", "Safety_Sideeffects"],
            "accepted_v2_outcomes": ["BIOLOGICAL_FAILURE", "MIXED_CAUSES"],
            "comparisons": len(biological_keys),
            "agreements": broad_biological_agreements,
            "agreement_rate": percent(broad_biological_agreements, len(biological_keys)),
        },
        "unique_text_crosswalk": {
            label: dict(sorted(counts.items(), key=lambda item: (-item[1], item[0])))
            for label, counts in sorted(crosswalk.items())
        },
        "disagreement_rows": len(disagreements),
        "manual_review_candidates_file": "data/benchmarks/opentargets_v2_manual_review_candidates.csv",
        "limitations": [
            "Open Targets does not provide NCT IDs, so this is not a trial-level join.",
            "Repeated generic stop reasons can map one external text to multiple NCT records.",
            "The taxonomies are many-to-many and broad labels are not ground truth for V2.",
            "Open Targets may contain older registry wording than the current V2 snapshot.",
            "The conservative baseline excludes fuzzy matches.",
        ],
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.disagreements.parent.mkdir(parents=True, exist_ok=True)
    args.markdown.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    args.markdown.write_text(build_markdown(report), encoding="utf-8")

    with args.disagreements.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "open_targets_label",
                "normalized_text_hash",
                "sample_nct_ids",
                "our_classifications",
                "matching_our_records",
            ],
            lineterminator="\n",
        )
        writer.writeheader()
        writer.writerows(sorted(disagreements, key=lambda row: (row["open_targets_label"], row["normalized_text_hash"])))

    print(
        json.dumps(
            {
                "output": str(args.output),
                "disagreements": str(args.disagreements),
                "markdown": str(args.markdown),
                "unique_text_overlap_rate": report["exact_normalized_overlap"]["unique_open_targets_text_match_rate"],
                "broad_biological_agreement_rate": report["broad_biological_agreement"]["agreement_rate"],
                "disagreement_rows": len(disagreements),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
