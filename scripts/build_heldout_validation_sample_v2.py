#!/usr/bin/env python3
"""Build a held-out, stratified validation sample for Classification V2.

The sample is designed to measure how the classifier generalises to stop-reason
texts that were NOT used to write, tune, audit or adjudicate the rules:

* unit of sampling = unique normalized stop-reason text (one registry record per text)
* excluded texts:  every text in the reviewed-reason index, the 4,000-record
  audit gold set, the golden unit-test sets, manual decisions and all Open
  Targets disagreement / adjudication artefacts
* excluded records: empty stop reason, classification_source REVIEWED_EXACT
* stratified by V2 outcome with a fixed seed, so the sample is reproducible

The blind labelling file contains ONLY nct_id, sample_id and the raw text.
Classifier output is written to a separate key file and must not be shown to
labellers.
"""
from __future__ import annotations

import argparse
import csv
import json
import random
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.classification_v2 import normalize_reason, text_hash  # noqa: E402

DATASET = ROOT / "data/all_stopped_trials.json"
OUT_DIR = ROOT / "validation"

# Target sample size per V2 outcome (unique texts).
STRATA = {
    "BIOLOGICAL_FAILURE": 150,
    "NON_BIOLOGICAL": 200,
    "CAUSE_NOT_STATED": 60,
    "NON_FAILURE_TRANSITION": 50,
    "MIXED_CAUSES": 40,
    "UNKNOWN": 100,
}
SEED = 20260915


def _hash(text: str) -> str:
    return text_hash(normalize_reason(text))


def contaminated_hashes() -> set[str]:
    hashes: set[str] = set()
    reviewed = json.loads((ROOT / "data/classification_reviewed_reasons_v2.json").read_text())
    hashes.update(reviewed.get("entries", {}).keys())
    for entry in reviewed.get("entries", {}).values():
        if entry.get("normalized_text"):
            hashes.add(text_hash(entry["normalized_text"]))

    for jsonl in ["tests/classification_gold_v2.jsonl", "tests/golden_classification_v2.jsonl"]:
        for line in (ROOT / jsonl).read_text().splitlines():
            if line.strip():
                hashes.add(_hash(json.loads(line).get("why_stopped", "")))

    for path, col in [
        ("tests/golden_why_stopped.csv", "why_stopped"),
        ("data/classification_manual_decisions_v2.csv", "why_stopped"),
    ]:
        with open(ROOT / path, newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                hashes.add(_hash(row.get(col, "")))

    for path in [
        "data/benchmarks/opentargets_v2_disagreements.csv",
        "data/benchmarks/opentargets_v2_full_adjudication.csv",
    ]:
        with open(ROOT / path, newline="", encoding="utf-8") as fh:
            for row in csv.DictReader(fh):
                if row.get("normalized_text_hash"):
                    hashes.add(row["normalized_text_hash"])
    return hashes


def contaminated_ncts() -> set[str]:
    ncts: set[str] = set()
    for line in (ROOT / "tests/classification_gold_v2.jsonl").read_text().splitlines():
        if line.strip():
            ncts.add(json.loads(line).get("nct_id", ""))
    with open(ROOT / "data/benchmarks/opentargets_v2_manual_review_candidates.csv", newline="") as fh:
        ncts.update(row["nct_id"] for row in csv.DictReader(fh))
    return ncts


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=SEED)
    args = parser.parse_args()

    records = json.loads(DATASET.read_text())
    bad_hashes = contaminated_hashes()
    bad_ncts = contaminated_ncts()

    by_text: dict[str, list[dict]] = defaultdict(list)
    excluded = Counter()
    for rec in records:
        text = (rec.get("why_stopped") or "").strip()
        if not text:
            excluded["empty_stop_reason"] += 1
            continue
        if rec.get("classification_source") == "REVIEWED_EXACT":
            excluded["reviewed_exact"] += 1
            continue
        h = _hash(text)
        if h in bad_hashes or rec.get("nct_id") in bad_ncts:
            excluded["tuning_or_audit_overlap"] += 1
            continue
        by_text[h].append(rec)

    rng = random.Random(args.seed)
    population = defaultdict(list)  # outcome -> [(hash, records)]
    for h in sorted(by_text):
        recs = by_text[h]
        outcome = recs[0]["classification_outcome_v2"]
        population[outcome].append((h, recs))

    blind, key = [], []
    for outcome, n in STRATA.items():
        pool = population.get(outcome, [])
        chosen = rng.sample(pool, min(n, len(pool)))
        for h, recs in chosen:
            rec = rng.choice(sorted(recs, key=lambda r: r["nct_id"]))
            sid = f"HV-{len(key) + 1:04d}"
            blind.append({"sample_id": sid, "nct_id": rec["nct_id"], "why_stopped": rec["why_stopped"]})
            key.append({
                "sample_id": sid,
                "nct_id": rec["nct_id"],
                "text_hash": h,
                "stratum": outcome,
                "records_with_same_text": len(recs),
                "predicted_outcome": rec["classification_outcome_v2"],
                "predicted_primary_reason": rec["classification_primary_reason_v2"],
                "predicted_secondary_reasons": rec.get("classification_secondary_reasons_v2", ""),
                "predicted_confidence": rec.get("classification_confidence", ""),
                "classification_source": rec.get("classification_source", ""),
                "classifier_version": rec.get("classification_version", ""),
            })

    # Shuffle blind order so strata are not inferable from position.
    order = list(range(len(blind)))
    rng.shuffle(order)
    blind = [blind[i] for i in order]

    OUT_DIR.mkdir(exist_ok=True)
    (OUT_DIR / "heldout_v2_blind.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in blind))
    (OUT_DIR / "heldout_v2_key.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in key))
    meta = {
        "schema_version": 1,
        "seed": args.seed,
        "dataset_version": json.loads((ROOT / "web/public/dataset_meta.json").read_text()).get("version"),
        "classifier_version": "2.7.0",
        "population_records_total": len(records),
        "excluded_records": dict(excluded),
        "eligible_unique_texts_by_outcome": {k: len(v) for k, v in sorted(population.items())},
        "eligible_records_by_outcome": {k: sum(len(r) for _, r in v) for k, v in sorted(population.items())},
        "sampled_unique_texts_by_outcome": dict(Counter(r["stratum"] for r in key)),
        "contaminated_text_hashes": len(bad_hashes),
    }
    (OUT_DIR / "heldout_v2_sample_meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
