#!/usr/bin/env python3
"""The other way a drug fails: it finishes the trial and misses.

A discontinuation rate only sees trials that were stopped. In oncology that is most of how a
programme dies. In metabolic disease and hepatology it is almost none of it — 28 biological stops
in 1,637 closed endocrine trials — because those fields run big outcome trials to the end and
then report that the drug did not beat placebo. That failure is invisible to every number this
site publishes, and it is the failure buyers in those fields are asking about.

It is not invisible in the registry. A sponsor who posts results also posts the analysis behind
each primary outcome, and that record carries the p-value and the sponsor's own statement of what
the test was for. This reads that, and nothing else: no re-analysis, no inference from the
abstract, no judgement about whether the endpoint was the right one.

What counts as a miss, deliberately narrowly:

  * only outcome measures the sponsor typed PRIMARY;
  * only analyses the sponsor typed SUPERIORITY — a non-inferiority test that fails to reject is
    not the same event and is recorded separately, never counted;
  * only analyses comparing at least two groups, because a within-arm change over baseline is not
    a comparison;
  * a p-value that parses, against a 0.05 threshold. "<0.001" is significant, ">0.05" and an
    explicit "NS" are not, anything else is left unread rather than guessed at.

A trial where every qualifying analysis came back non-significant is MISSED. Where all were
significant, MET. Where they disagree — co-primaries that split — MIXED, and it is reported as
its own thing rather than folded into either, because the registry does not say whether the
design needed both.

What this is not: MET is not approval, and MISSED is not a verdict on the molecule. It is the
sponsor's own posted comparison, read back.

Output: .cache/universe/endpoint_outcomes.jsonl.gz (one row per trial that posted results)
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.http_cache import get_json  # noqa: E402

API = "https://clinicaltrials.gov/api/v2/studies"
OUT = ROOT / ".cache/universe/endpoint_outcomes.jsonl.gz"
YEAR_DIR = ROOT / ".cache/universe/results_years"
REFRESH_DAYS = 6
START_YEAR = 2010
ALPHA = 0.05
FIELDS = ",".join([
    "protocolSection.identificationModule.nctId",
    "protocolSection.statusModule.overallStatus",
    "resultsSection.outcomeMeasuresModule",
])

# "p<0.001", "P = .03", "0.0506", ">0.999", "NS". The registry is free text here.
NUMBER = re.compile(r"^\s*(?P<op>[<>=≤≥]{0,2})\s*(?P<num>\.\d+|\d+(?:\.\d+)?)\s*$")
NOT_SIGNIFICANT = re.compile(r"^\s*(ns|n\.?s\.?|not significant|non[- ]significant)\s*$", re.I)


def parse_p(raw: object) -> tuple[float | None, str | None]:
    """(value, operator) with the operator kept: "<0.001" and "0.001" are not the same claim."""
    if raw is None:
        return (None, None)
    text = str(raw).strip()
    if not text:
        return (None, None)
    if NOT_SIGNIFICANT.match(text):
        return (1.0, ">")  # the sponsor said it outright
    text = re.sub(r"^p\s*(?=[<>=≤≥.\d])", "", text, flags=re.I).strip()
    text = text.replace("≤", "<=").replace("≥", ">=")
    m = NUMBER.match(text)
    if not m:
        return (None, None)
    try:
        value = float(m.group("num"))
    except ValueError:
        return (None, None)
    if not (0.0 <= value <= 1.0):
        return (None, None)
    op = m.group("op") or "="
    return (value, op)


def significant(value: float, op: str, alpha: float = ALPHA) -> bool | None:
    """None where the record does not settle it — "<0.1" says nothing about 0.05."""
    if op in ("<", "<="):
        return True if value <= alpha else None
    if op in (">", ">="):
        return False if value >= alpha else None
    return value < alpha


def read_analyses(outcomes: list[dict]) -> dict:
    """Every primary superiority comparison in one trial, and what each one says."""
    considered, skipped = [], {"non_inferiority": 0, "one_group": 0, "unparsable_p": 0, "no_p": 0}
    for outcome in outcomes:
        if (outcome.get("type") or "").upper() != "PRIMARY":
            continue
        for analysis in outcome.get("analyses") or []:
            kind = (analysis.get("nonInferiorityType") or "").upper()
            if kind and kind != "SUPERIORITY":
                skipped["non_inferiority"] += 1
                continue
            if len(analysis.get("groupIds") or []) < 2:
                skipped["one_group"] += 1
                continue
            raw = analysis.get("pValue")
            if raw is None:
                skipped["no_p"] += 1
                continue
            value, op = parse_p(raw)
            if value is None:
                skipped["unparsable_p"] += 1
                continue
            verdict = significant(value, op)
            if verdict is None:
                skipped["unparsable_p"] += 1
                continue
            considered.append({
                "outcome": (outcome.get("title") or "")[:200],
                "p": f"{op}{value:g}" if op != "=" else f"{value:g}",
                "significant": verdict,
            })
    return {"considered": considered, "skipped": skipped}


def verdict_of(considered: list[dict]) -> str:
    if not considered:
        return "UNREADABLE"
    flags = {row["significant"] for row in considered}
    if flags == {True}:
        return "MET"
    if flags == {False}:
        return "MISSED"
    return "MIXED"


def row_for(study: dict) -> dict | None:
    protocol = study.get("protocolSection") or {}
    nct = ((protocol.get("identificationModule") or {}).get("nctId") or "").strip()
    if not nct:
        return None
    outcomes = ((study.get("resultsSection") or {}).get("outcomeMeasuresModule") or {}).get("outcomeMeasures") or []
    if not outcomes:
        return None
    read = read_analyses(outcomes)
    return {
        "nct_id": nct,
        "overall_status": (protocol.get("statusModule") or {}).get("overallStatus"),
        "primary_outcomes": sum(1 for o in outcomes if (o.get("type") or "").upper() == "PRIMARY"),
        "endpoint_verdict": verdict_of(read["considered"]),
        "analyses": read["considered"],
        "not_read": read["skipped"],
        "alpha": ALPHA,
    }


def load_verdicts() -> dict[str, dict]:
    """What the registry says about each trial's primary endpoint, or {} if it has not been read.

    Empty rather than an error on purpose: the fetch is a separate step with its own time budget,
    and a package built before it has run should lose a section, not fail to build.
    """
    if not OUT.exists():
        return {}
    out: dict[str, dict] = {}
    with gzip.open(OUT, "rt", encoding="utf-8") as fh:
        for line in fh:
            row = json.loads(line)
            out[row["nct_id"]] = row
    return out


def fetch_slice(start: str, end: str, max_pages: int = 200):
    adv = (f"AREA[StudyType]INTERVENTIONAL AND AREA[StartDate]RANGE[{start},{end}] "
           "AND (AREA[Phase]PHASE2 OR AREA[Phase]PHASE3) "
           "AND AREA[ResultsFirstPostDate]RANGE[MIN,MAX]")
    token, pages = None, 0
    while pages < max_pages:
        params = {"filter.advanced": adv, "fields": FIELDS, "pageSize": 100, "format": "json"}
        if token:
            params["pageToken"] = token
        body = get_json("ctgov", API, params, cache=False, timeout=120, retries=5) or {}
        for study in body.get("studies") or []:
            yield study
        token = body.get("nextPageToken")
        pages += 1
        if not token:
            break


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-seconds", type=float, default=1200)
    ap.add_argument("--end-year", type=int, default=date.today().year)
    ap.add_argument("--start-year", type=int, default=START_YEAR)
    args = ap.parse_args()
    started = time.monotonic()
    YEAR_DIR.mkdir(parents=True, exist_ok=True)

    for year in range(args.start_year, args.end_year + 1):
        path = YEAR_DIR / f"{year}.jsonl.gz"
        if path.exists() and (time.time() - path.stat().st_mtime) < REFRESH_DAYS * 86400:
            continue
        if time.monotonic() - started > args.max_seconds:
            print("time budget reached; completed years are kept, re-run to continue", flush=True)
            return 3
        tmp = path.with_name(path.name + ".tmp")
        count = 0
        with gzip.open(tmp, "wt", encoding="utf-8") as fh:
            for study in fetch_slice(f"{year}-01-01", f"{year}-12-31"):
                row = row_for(study)
                if row:
                    fh.write(json.dumps(row, ensure_ascii=False) + "\n")
                    count += 1
        tmp.replace(path)
        print(f"{year}: {count} trials with posted outcomes ({time.monotonic() - started:.0f}s)", flush=True)

    seen, tally = set(), {}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(OUT.with_name(OUT.name + ".tmp"), "wt", encoding="utf-8") as out:
        for year in range(args.start_year, args.end_year + 1):
            path = YEAR_DIR / f"{year}.jsonl.gz"
            if not path.exists():
                continue
            with gzip.open(path, "rt", encoding="utf-8") as fh:
                for line in fh:
                    row = json.loads(line)
                    if row["nct_id"] in seen:
                        continue
                    seen.add(row["nct_id"])
                    out.write(line)
                    tally[row["endpoint_verdict"]] = tally.get(row["endpoint_verdict"], 0) + 1
    OUT.with_name(OUT.name + ".tmp").replace(OUT)
    print(json.dumps({"trials": len(seen), "verdicts": tally}, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
