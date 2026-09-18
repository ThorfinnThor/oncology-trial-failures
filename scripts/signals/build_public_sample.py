#!/usr/bin/env python3
"""Build the free evaluation sample and the public product summary for /data.

The sample is a stratified 100-record extract (industry-sponsored, drug-resolved
signals across efficacy, safety and mixed causes) served only after the sample
request form. The summary contains aggregate counts for marketing copy.
"""
from __future__ import annotations

import csv
import hashlib
import json
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PRODUCT = ROOT / "product"
SAMPLE_DIR = ROOT / "web/public/samples"
SUMMARY = ROOT / "web/data/product_summary.json"
QUOTAS = {"EFFICACY_FUTILITY": 55, "SAFETY": 30, "MULTIPLE": 10, "BIOLOGICAL_UNSPECIFIED": 5}
# The sample ships every column of the licensed CSV plus the SEC ticker, so an evaluator
# sees exactly what they would receive. Order follows the licensed file.
LICENSED_COLUMNS = ["nct_id", "brief_title", "phases", "overall_status", "failure_outcome", "failure_primary_reason",
                    "failure_secondary_reasons", "why_stopped", "sponsor_group", "lead_sponsor_raw", "sponsor_class_ctgov",
                    "is_industry", "focus_assets", "focus_asset_ids", "focus_research_codes", "focus_mechanisms",
                    "focus_targets", "focus_target_genes", "focus_max_phase_chembl", "focus_pharmacologic_classes",
                    "publication_count", "focus_includes_non_us_marketed", "conditions", "enrollment_count",
                    "enrollment_type", "start_date", "primary_completion_date", "last_update_post_date", "registry_url"]
COLUMNS = LICENSED_COLUMNS[:9] + ["sponsor_ticker"] + LICENSED_COLUMNS[9:]

README = """Oncology Failure Signals - evaluation sample
{count} of {total} records, dataset {version}.

Sources: ClinicalTrials.gov (U.S. National Library of Medicine); RxNorm and RxClass (NLM);
ChEMBL (EMBL-EBI, CC BY-SA 3.0); NCI Thesaurus (NCI); PubMed (NCBI); SEC EDGAR.
Classifications, linkages and derived fields by Clinical Trial Failures.

Evaluation use only. Data are analytical research signals, not clinical or investment advice.
Full dataset and licensing: https://clinicaltrialfailures.com/data-licensing
"""


def _stats(label: str, seg: dict) -> dict:
    return {"label": label, "rate": seg["rate"], "stops": seg["biological_stops"], "closed": seg["closed"], "ci95": seg["ci95"]}


def featured_benchmark(bench: dict) -> dict | None:
    """The segment whose discontinuation rate is highest among those whose 95% interval clears the
    oncology baseline, so the example on the licensing page is never a small-sample artefact."""
    baseline = bench["baseline"]
    window = bench["window"]
    phases = "/".join(window["phases"])
    cands = [s for s in bench["segments"]
             if s["dimension"] in ("mechanism_class", "mechanism_class_with_pd1")
             and s["closed"] >= 30 and s["biological_stops"] >= 5 and s["ci95"][0] > baseline["rate"]]
    if not cands:
        return None
    best = max(cands, key=lambda s: s["rate"])
    out = {"segment": _stats(best["segment"], best),
           "baseline": _stats(f"All oncology Phase {phases}", baseline)}
    if best["dimension"] == "mechanism_class_with_pd1":
        pd1 = next((s for s in bench["segments"]
                    if s["dimension"] == "mechanism_class" and s["segment"] == "PD-(L)1"), None)
        if pd1:
            out["reference"] = _stats("All PD-(L)1 trials", pd1)
    return out


def main() -> int:
    rows = [json.loads(l) for l in (PRODUCT / "oncology_failure_signals_v1.jsonl").read_text().splitlines() if l.strip()]
    meta = json.loads((PRODUCT / "oncology_failure_signals_v1_meta.json").read_text())
    rng = random.Random(20260915)
    pool = [r for r in rows if r["is_industry"] and r["focus_asset_ids"]]
    sample = []
    for reason, n in QUOTAS.items():
        cands = sorted([r for r in pool if r["failure_primary_reason"] == reason], key=lambda r: r["nct_id"])
        sample += rng.sample(cands, min(n, len(cands)))
    sample.sort(key=lambda r: r["nct_id"])

    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256("".join(r["nct_id"] for r in sample).encode()).hexdigest()[:16]
    name = f"oncology-failure-signals-sample-{meta['dataset_version']}-{digest}.csv"
    for old in SAMPLE_DIR.glob("oncology-failure-signals-sample-*.csv"):
        if old.name != name:
            try:
                old.unlink()
            except OSError:
                old.write_text("")  # cannot delete in some environments; emptied files are excluded from deploy
    # No comment preamble: a leading "#" line makes Excel and Numbers treat the whole file as one
    # column. Provenance ships in a sibling README. utf-8-sig so Excel renders "TGF-beta" correctly.
    with open(SAMPLE_DIR / name, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        for r in sample:
            out = {k: r.get(k) for k in COLUMNS}
            out["sponsor_ticker"] = (r.get("sponsor_issuer_sec") or {}).get("ticker")
            w.writerow({k: "; ".join(map(str, v)) if isinstance(v, list) else v for k, v in out.items()})
    readme_name = name.replace(".csv", "-README.txt")
    for old in SAMPLE_DIR.glob("oncology-failure-signals-sample-*-README.txt"):
        if old.name != readme_name:
            try:
                old.unlink()
            except OSError:
                old.write_text("")
    (SAMPLE_DIR / readme_name).write_text(
        README.format(count=len(sample), total=meta["trial_count"], version=meta["dataset_version"]), encoding="utf-8")

    summary = {k: meta[k] for k in ["product", "product_version", "dataset_version", "trial_count", "industry_trial_count",
                                     "industry_phase2_3_trial_count", "by_primary_reason", "trials_with_resolved_focus_asset",
                                     "trials_with_focus_target_gene", "trials_with_pubmed_publication", "industry_trials_with_sec_issuer",
                                     "unique_assets", "assets_with_repeated_safety_signal", "assets_with_repeated_efficacy_signal"]}
    bench_path = PRODUCT / "benchmarks/oncology_benchmarks_v1.json"
    if bench_path.exists():
        bench = json.loads(bench_path.read_text())
        classes = [s for s in bench["segments"] if s["dimension"] == "mechanism_class"]
        summary["benchmarks"] = {
            "segments": len(bench["segments"]),
            "mechanism_classes": len(classes),
            "universe_closed_trials": bench["baseline"]["closed"],
            "baseline_rate": bench["baseline"]["rate"],
            "window": bench["window"],
        }
        featured = featured_benchmark(bench)
        if featured:
            summary["featured_benchmark"] = featured
    briefs = sorted((PRODUCT / "briefs").glob("brief_*.html")) if (PRODUCT / "briefs").exists() else []
    summary["brief_count"] = len(briefs)
    summary["sample_file"] = f"/samples/{name}"
    summary["sample_record_count"] = len(sample)
    summary["sample_columns"] = COLUMNS
    summary["sample_readme_file"] = f"/samples/{readme_name}"
    csv_path = PRODUCT / "oncology_failure_signals_v1.csv"
    if csv_path.exists():
        with open(csv_path, newline="", encoding="utf-8") as fh:
            summary["signals_column_count"] = len(next(csv.reader(fh)))
    SUMMARY.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
