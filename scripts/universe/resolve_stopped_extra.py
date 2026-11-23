#!/usr/bin/env python3
"""Resolve the drugs of stopped trials the trial universe does not cover.

The universe (fetch_universe.py) holds interventional Phase 2/3 trials started 2010 or later: the
denominator of the discontinuation rates, which must not change. About half of the stopped trials
in data/all_stopped_trials.csv fall outside it (Phase 1, Phase 4, earlier starts, other study
types). This fetches exactly those trials from ClinicalTrials.gov, in batches of 100 IDs, builds the
same compact record and runs the same resolver (rule 8: tested vs background), and writes them to a
separate file that only export_trial_drugs.py reads. Rates, cohorts and briefs never see it.

  python scripts/universe/resolve_stopped_extra.py [--max-seconds 1200]

Output: .cache/universe/stopped_extra_resolved.jsonl.gz (kept with the weekly cache; a trial already
in it is not fetched again unless its record is older than REFRESH_DAYS).
"""
from __future__ import annotations

import argparse
import csv
import gzip
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.classification_v2 import load_reviewed_reason_index  # noqa: E402
from scripts.signals.http_cache import get_json  # noqa: E402
from scripts.universe.fetch_universe import API, FIELDS, REVIEWED, SNAPSHOT, compact  # noqa: E402

UNIVERSE = ROOT / ".cache/universe/universe_v1.jsonl.gz"
OUT = ROOT / ".cache/universe/stopped_extra_resolved.jsonl.gz"
STOPPED = ROOT / "data/all_stopped_trials.csv"
BATCH = 100
REFRESH_DAYS = 30


def load_existing() -> dict[str, dict]:
    if not OUT.exists():
        return {}
    with gzip.open(OUT, "rt", encoding="utf-8") as fh:
        return {r["nct_id"]: r for r in map(json.loads, fh)}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-seconds", type=float, default=1200)
    args = ap.parse_args()
    started = time.monotonic()
    if not UNIVERSE.exists():
        print("universe missing; run fetch_universe.py first")
        return 0
    with gzip.open(UNIVERSE, "rt", encoding="utf-8") as fh:
        in_universe = {json.loads(line)["nct_id"] for line in fh}
    stopped = [r["nct_id"] for r in csv.DictReader(open(STOPPED, encoding="utf-8"))]
    existing = load_existing()
    now = datetime.now(timezone.utc)
    fresh = {n for n, r in existing.items()
             if (now - datetime.fromisoformat(r.get("resolved_at", "2000-01-01T00:00:00+00:00"))).days < REFRESH_DAYS}
    wanted = [n for n in stopped if n not in in_universe and n not in fresh]
    print(f"{len(stopped)} stopped trials, {len(in_universe & set(stopped))} in the universe, "
          f"{len(existing)} already resolved here, {len(wanted)} to fetch", flush=True)

    from scripts.universe.chembl_index import load as load_chembl
    from scripts.universe.ncit_index import load as load_ncit
    from scripts.universe.resolve import Resolver, resolve_trial
    resolver = Resolver(load_chembl(), load_ncit())
    snapshot = {r["nct_id"]: r for r in json.loads(SNAPSHOT.read_text())}
    reviewed = load_reviewed_reason_index(str(REVIEWED))
    done = 0
    for i in range(0, len(wanted), BATCH):
        if time.monotonic() - started > args.max_seconds:
            print("time budget reached; resolved trials are kept, the next run continues", flush=True)
            break
        ids = wanted[i:i + BATCH]
        body = get_json("ctgov", API, {"filter.ids": ",".join(ids), "fields": FIELDS, "pageSize": BATCH})
        for study in (body or {}).get("studies") or []:
            rec = compact(study, snapshot, reviewed)
            if not rec.get("nct_id"):
                continue
            rec = resolve_trial(rec, resolver)
            rec["resolved_at"] = now.isoformat()
            existing[rec["nct_id"]] = rec
            done += 1
    tmp = OUT.with_name(OUT.name + ".tmp")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(tmp, "wt", encoding="utf-8") as fh:
        for rec in existing.values():
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
    tmp.replace(OUT)
    print(json.dumps({"fetched_and_resolved": done, "total_in_file": len(existing),
                      "still_to_fetch": max(0, len(wanted) - done)}), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
