"""Feasibility study, step 1c: each trial's registry record as it stood near its start date, from
quarterly AACT flat-file snapshots (January, April, July, October 2017-2021).

Only four tables are read from each snapshot (see aact_remote.py), and only rows for trials in the
universe are kept. Output: one parquet-like pickle per snapshot with the fields below, keyed by
nct_id, plus the snapshot date.
"""
from __future__ import annotations

import csv
import gzip
import io
import json
import re
import sys
import time
from pathlib import Path

import pandas as pd

from aact_remote import open_snapshot

csv.field_size_limit(1 << 30)
UNIVERSE = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)

# id: snapshot date, quarterly from the monthly archive (July 2021 is missing; June is used).
SNAPSHOTS = {
    406: "2017-01-05", 413: "2017-04-03", 370: "2017-07-03", 376: "2017-10-17",
    396: "2018-01-11", 379: "2018-04-01", 415: "2018-07-01", 394: "2018-10-01",
    393: "2019-01-01", 401: "2019-04-01", 403: "2019-07-01", 416: "2019-10-01",
    377: "2020-01-01", 363: "2020-04-01", 399: "2020-07-01", 371: "2020-10-01",
    383: "2021-01-01", 385: "2021-04-01", 418: "2021-06-01", 366: "2021-10-04",
}
SURVIVAL = re.compile(r"\b(overall survival|progression[- ]free|event[- ]free|disease[- ]free|time to progression|survival)\b", re.I)
RESPONSE = re.compile(r"\b(response rate|objective response|overall response|complete response|ORR)\b", re.I)

wanted = set()
with gzip.open(UNIVERSE, "rt") as fh:
    for line in fh:
        wanted.add(json.loads(line)["nct_id"])


def rows(z, name):
    member = next(n for n in z.namelist() if n.endswith(name))
    with z.open(member) as raw:
        reader = csv.DictReader(io.TextIOWrapper(raw, encoding="utf-8", errors="replace"), delimiter="|")
        for r in reader:
            if r.get("nct_id") in wanted:
                yield r


def first(r, *keys):
    for k in keys:
        if r.get(k):
            return r[k]
    return ""


for sid, date in SNAPSHOTS.items():
    target = OUT / f"{date}.pkl"
    if target.exists():
        continue
    t0 = time.time()
    z, remote = open_snapshot(sid)
    rec = {}
    for r in rows(z, "studies.txt"):
        rec[r["nct_id"]] = {
            "status_at": r.get("overall_status", ""),
            "enrollment": pd.to_numeric(r.get("enrollment") or None, errors="coerce"),
            "enrollment_type": (r.get("enrollment_type") or "").upper(),
            "n_arms": pd.to_numeric(r.get("number_of_arms") or None, errors="coerce"),
            "has_dmc": (r.get("has_dmc") or "").lower() in ("t", "true", "yes"),
            "fda_regulated": (r.get("is_fda_regulated") or r.get("is_fda_regulated_drug") or "").lower() in ("t", "true", "yes"),
            "first_received": first(r, "first_received_date", "study_first_submitted_date"),
        }
    for r in rows(z, "designs.txt"):
        d = rec.setdefault(r["nct_id"], {})
        d["masking"] = (r.get("masking") or "").split("(")[0].strip().upper()
        d["intervention_model"] = (r.get("intervention_model") or "").upper()
        d["primary_purpose"] = (r.get("primary_purpose") or "").upper()
    for r in rows(z, "calculated_values.txt"):
        d = rec.setdefault(r["nct_id"], {})
        d["n_facilities"] = pd.to_numeric(r.get("number_of_facilities") or None, errors="coerce")
        d["has_us_facility"] = (r.get("has_us_facility") or "").lower() in ("t", "true")
    for r in rows(z, "design_outcomes.txt"):
        if (r.get("outcome_type") or "").lower() != "primary":
            continue
        d = rec.setdefault(r["nct_id"], {})
        d["n_primary"] = d.get("n_primary", 0) + 1
        text = f"{r.get('measure', '')} {r.get('description', '')}"
        d["primary_survival"] = d.get("primary_survival", False) or bool(SURVIVAL.search(text))
        d["primary_response"] = d.get("primary_response", False) or bool(RESPONSE.search(text))
    df = pd.DataFrame.from_dict(rec, orient="index")
    df.index.name = "nct_id"
    df["snapshot"] = pd.Timestamp(date)
    df.to_pickle(target)
    print(f"{date}: {len(df):,} trials, {remote.transferred/1e6:,.0f} MB transferred, {time.time()-t0:,.0f}s", flush=True)
