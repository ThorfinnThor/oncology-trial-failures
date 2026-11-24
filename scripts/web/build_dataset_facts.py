#!/usr/bin/env python3
"""Facts for the dataset product pages (/datasets): sizes, coverage and sample files of this release.

Small and public: web/data/dataset_facts.json. Rebuilt by the weekly run after the samples, so a
dataset page never states last month's size or links a sample that is gone.
"""
from __future__ import annotations

import collections
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    meta = json.loads((ROOT / "web/public/dataset_meta.json").read_text())
    rows = list(csv.DictReader(open(ROOT / "data/all_stopped_trials.csv", encoding="utf-8")))
    # Registry start dates include placeholders (1900, 2099); keep plausible years only.
    this_year = int((meta.get("version") or "2026")[:4])
    years = sorted(y for y in (r["start_date"][:4] for r in rows if (r.get("start_date") or "")[:4].isdigit())
                   if 1980 <= int(y) <= this_year + 1)
    outcomes = collections.Counter(r["classification_final_outcome"] for r in rows)
    statuses = collections.Counter(r["overall_status"] for r in rows)
    endpoints = json.loads((ROOT / "web/public/trial_endpoints.json").read_text())
    verdicts = collections.Counter(t.get("verdict") for t in endpoints.get("trials", {}).values())
    signals = json.loads((ROOT / "web/data/product_summary.json").read_text())
    labels_dir = ROOT / "web/public/samples/labels"
    more_path = ROOT / "web/data/product_summary_more_areas.json"
    more = json.loads(more_path.read_text()) if more_path.exists() else {}
    drugs_path = ROOT / "data/trial_drugs.csv"
    drug_rows = list(csv.DictReader(open(drugs_path, encoding="utf-8"))) if drugs_path.exists() else []
    resolution = collections.Counter(r["drug_resolution"] for r in drug_rows)

    def count(path: Path) -> int:
        return sum(1 for _ in csv.DictReader(open(path, encoding="utf-8"))) if path.exists() else 0

    facts = {
        "release": meta.get("version"),
        "source_updated": (meta.get("all") or {}).get("max_last_update_post_date"),
        "stop_reasons": {
            "trials": len(rows),
            "by_status": dict(statuses),
            "by_outcome": dict(outcomes),
            "disease_areas": len({r["disease_area"] for r in rows if r.get("disease_area")}),
            "start_year_min": years[0] if years else None,
            "start_year_max": years[-1] if years else None,
            "classifier_version": rows[0].get("classification_version") if rows else None,
            "sample_rows": count(labels_dir / "stop_reason_labels_sample.csv"),
        },
        "endpoints": {
            "stopped_trials_read": sum(verdicts.values()),
            "by_verdict": {k: v for k, v in verdicts.items() if k},
            "read_on": endpoints.get("read_on"),
            "sample_rows": count(labels_dir / "endpoint_labels_sample.csv"),
        },
        "signals": {
            "trials": signals.get("trial_count"),
            "columns": signals.get("signals_column_count"),
            "unique_assets": signals.get("unique_assets"),
            "target_gene_share": signals.get("trials_with_focus_target_gene"),
            "sample_file": signals.get("sample_file"),
            "sample_readme_file": signals.get("sample_readme_file"),
            "sample_rows": signals.get("sample_record_count"),
            "mechanism_share": signals.get("trials_with_focus_mechanism"),
        },
        "signals_more": {
            "trials": more.get("trial_count"),
            "by_disease_area": more.get("by_disease_area"),
            "columns": more.get("signals_column_count"),
            "unique_assets": more.get("unique_assets"),
            "resolved_drug_share": more.get("trials_with_resolved_focus_asset"),
            "mechanism_share": more.get("trials_with_focus_mechanism"),
            "target_gene_share": more.get("trials_with_focus_target_gene"),
            "sample_file": more.get("sample_file"),
            "sample_readme_file": more.get("sample_readme_file"),
            "sample_rows": more.get("sample_record_count"),
        },
        "drugs": {
            "trials": len(drug_rows),
            "by_resolution": dict(resolution),
        },
    }
    out = ROOT / "web/data/dataset_facts.json"
    out.write_text(json.dumps(facts, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)}: {facts['stop_reasons']['trials']} trials, release {facts['release']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
