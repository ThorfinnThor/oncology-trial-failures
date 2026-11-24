#!/usr/bin/env python3
"""The evaluation sample and public summary of Failure Signals for the seven areas after oncology.

Reads product/failure_signals_more_areas_v1.{jsonl,csv,_meta.json} (build_oncology_failure_signals.py
--scope more-areas) and writes:
  web/public/samples/failure-signals-seven-areas-sample-<release>-<digest>.csv (+ -README.txt)
      up to 8 trials per area (56), industry-sponsored with a resolved drug where possible,
      every column of the licensed file plus the sponsor's ticker
  web/data/product_summary_more_areas.json
      aggregate counts and coverage for the dataset and pricing pages
Without the product files it leaves the previous files as they are.
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
SUMMARY = ROOT / "web/data/product_summary_more_areas.json"
PER_AREA = 8
PREFIX = "failure-signals-seven-areas-sample"

README = """Clinical Trial Failure Signals, seven more areas - evaluation sample
{count} of {total} records ({per_area} per area), dataset {version}.

Areas: Infectious Disease, Neurology, Gastroenterology & Hepatology, Immunology & Autoimmune,
Cardiovascular, Endocrine & Metabolic, Respiratory (the trial's primary disease area).

Sources: ClinicalTrials.gov (U.S. National Library of Medicine); RxNorm and RxClass (NLM);
ChEMBL (EMBL-EBI, CC BY-SA 3.0); NCI Thesaurus (NCI); PubMed (NCBI); SEC EDGAR.
Classifications, linkages and derived fields by Clinical Trial Failures.

Drug resolution is lower than in oncology (see the coverage figures on the dataset page).
Evaluation use only. Data are analytical research signals, not clinical or investment advice.
Full dataset and licensing: https://clinicaltrialfailures.com/pricing
"""


def main() -> int:
    jsonl = PRODUCT / "failure_signals_more_areas_v1.jsonl"
    meta_path = PRODUCT / "failure_signals_more_areas_v1_meta.json"
    csv_path = PRODUCT / "failure_signals_more_areas_v1.csv"
    if not (jsonl.exists() and meta_path.exists() and csv_path.exists()):
        print("no seven-area product in product/; sample and summary left as they are")
        return 0
    rows = [json.loads(line) for line in jsonl.read_text().splitlines() if line.strip()]
    meta = json.loads(meta_path.read_text())
    with open(csv_path, newline="", encoding="utf-8") as fh:
        licensed = next(csv.reader(fh))
    columns = licensed[:licensed.index("lead_sponsor_raw")] + ["sponsor_ticker"] + licensed[licensed.index("lead_sponsor_raw"):]

    rng = random.Random(20261124)
    sample = []
    for area in sorted({r.get("disease_area") for r in rows if r.get("disease_area")}):
        in_area = sorted((r for r in rows if r.get("disease_area") == area), key=lambda r: r["nct_id"])
        best = [r for r in in_area if r["is_industry"] and r["focus_asset_ids"]]
        rest = [r for r in in_area if r not in best]
        pick = rng.sample(best, min(PER_AREA, len(best)))
        pick += rng.sample(rest, min(PER_AREA - len(pick), len(rest)))
        sample += pick
    sample.sort(key=lambda r: (r.get("disease_area") or "", r["nct_id"]))

    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256("".join(r["nct_id"] for r in sample).encode()).hexdigest()[:16]
    name = f"{PREFIX}-{meta['dataset_version']}-{digest}.csv"
    readme_name = name.replace(".csv", "-README.txt")
    for old in list(SAMPLE_DIR.glob(f"{PREFIX}-*.csv")) + list(SAMPLE_DIR.glob(f"{PREFIX}-*-README.txt")):
        if old.name not in (name, readme_name):
            old.unlink()
    with open(SAMPLE_DIR / name, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=columns)
        w.writeheader()
        for r in sample:
            out = {k: r.get(k) for k in columns}
            out["sponsor_ticker"] = (r.get("sponsor_issuer_sec") or {}).get("ticker")
            w.writerow({k: "; ".join(map(str, v)) if isinstance(v, list) else v for k, v in out.items()})
    (SAMPLE_DIR / readme_name).write_text(
        README.format(count=len(sample), total=meta["trial_count"], per_area=PER_AREA, version=meta["dataset_version"]),
        encoding="utf-8")

    keys = ["product", "product_version", "dataset_version", "trial_count", "by_disease_area", "industry_trial_count",
            "by_primary_reason", "unique_assets", "experimental_arm_drug_resolution_rate", "trials_with_resolved_focus_asset",
            "trials_with_focus_asset_or_research_code", "trials_with_focus_mechanism", "trials_with_focus_target_gene",
            "trials_with_pubmed_publication", "industry_trials_with_sec_issuer"]
    summary = {k: meta.get(k) for k in keys}
    summary.update({"signals_column_count": len(licensed), "sample_file": f"/samples/{name}",
                    "sample_readme_file": f"/samples/{readme_name}", "sample_record_count": len(sample)})
    SUMMARY.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({k: summary[k] for k in ("trial_count", "sample_record_count", "sample_file")}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
