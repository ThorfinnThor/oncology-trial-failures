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
COLUMNS = ["nct_id", "brief_title", "phases", "overall_status", "failure_outcome", "failure_primary_reason", "failure_secondary_reasons",
           "why_stopped", "sponsor_group", "sponsor_ticker", "focus_assets", "focus_asset_ids", "focus_research_codes", "focus_mechanisms",
           "focus_target_genes", "focus_max_phase_chembl", "conditions", "enrollment_count", "start_date", "last_update_post_date",
           "publication_count", "registry_url"]


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
    with open(SAMPLE_DIR / name, "w", newline="", encoding="utf-8") as fh:
        fh.write(f"# Oncology Failure Signals — evaluation sample ({len(sample)} of {meta['trial_count']} records), dataset {meta['dataset_version']}\n")
        fh.write("# Sources: ClinicalTrials.gov; RxNorm/RxClass (NLM); ChEMBL (EMBL-EBI, CC BY-SA 3.0); PubMed (NCBI); SEC EDGAR. Derived fields by ClinicalTrialFailures.\n")
        fh.write("# Evaluation use only. Full dataset and licensing: https://clinicaltrialfailures.com/data-licensing\n")
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        for r in sample:
            out = {k: r.get(k) for k in COLUMNS}
            out["sponsor_ticker"] = (r.get("sponsor_issuer_sec") or {}).get("ticker")
            w.writerow({k: "; ".join(map(str, v)) if isinstance(v, list) else v for k, v in out.items()})

    summary = {k: meta[k] for k in ["product", "product_version", "dataset_version", "trial_count", "industry_trial_count",
                                     "industry_phase2_3_trial_count", "by_primary_reason", "trials_with_resolved_focus_asset",
                                     "trials_with_focus_target_gene", "trials_with_pubmed_publication", "industry_trials_with_sec_issuer",
                                     "unique_assets", "assets_with_repeated_safety_signal", "assets_with_repeated_efficacy_signal"]}
    summary["sample_file"] = f"/samples/{name}"
    summary["sample_record_count"] = len(sample)
    SUMMARY.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
