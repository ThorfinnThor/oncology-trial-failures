#!/usr/bin/env python3
"""Fetch the trial universe used as denominator for discontinuation rates.

Universe: interventional Phase 2 / Phase 3 trials (including Phase 1/2 and 2/3)
on ClinicalTrials.gov with a start date from 2010, all statuses, all therapeutic
areas. Fetched per start-year slice so pages are deterministic and resumable
(each page is cached by the shared HTTP cache).

Each study becomes a compact record with: status, dates (incl. date types),
phases, design, enrollment, sponsor class, conditions/MeSH, disease areas,
arms and interventions, and — for stopped trials — the Classification V2 result
(taken from the canonical snapshot when present, otherwise computed with the same
classifier and reviewed-reason index).

Output: .cache/universe/universe_v1.jsonl.gz (not committed; large)
"""
from __future__ import annotations

import argparse
import gzip
import json
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.classification_v2 import classification_source, classify_reason_v2, load_reviewed_reason_index  # noqa: E402
from scripts.fetch_ctgov_oncology_failures import assign_disease_areas  # noqa: E402
from scripts.signals.http_cache import get_json  # noqa: E402

API = "https://clinicaltrials.gov/api/v2/studies"
OUT = ROOT / ".cache/universe/universe_v1.jsonl.gz"
YEAR_DIR = ROOT / ".cache/universe/years"
REFRESH_DAYS = 6  # re-fetch a year slice when its file is older than this
SNAPSHOT = ROOT / "data/all_stopped_trials.json"
REVIEWED = ROOT / "data/classification_reviewed_reasons_v2.json"
START_YEAR = 2010
STOPPED = {"TERMINATED", "SUSPENDED", "WITHDRAWN"}
FIELDS = ",".join([
    "protocolSection.identificationModule.nctId",
    "protocolSection.identificationModule.briefTitle",
    "protocolSection.statusModule",
    "protocolSection.sponsorCollaboratorsModule",
    "protocolSection.designModule",
    "protocolSection.armsInterventionsModule",
    "protocolSection.conditionsModule",
    "derivedSection.conditionBrowseModule.meshes",
    "hasResults",
])


def year_slices(end_year: int):
    for y in range(START_YEAR, end_year + 1):
        yield y, f"{y}-01-01", f"{y}-12-31"


def fetch_slice(start: str, end: str, max_pages: int = 50):
    adv = (f"AREA[StudyType]INTERVENTIONAL AND AREA[StartDate]RANGE[{start},{end}] "
           "AND (AREA[Phase]PHASE2 OR AREA[Phase]PHASE3)")
    token, pages = None, 0
    while pages < max_pages:
        params = {"filter.advanced": adv, "fields": FIELDS, "pageSize": 1000, "format": "json"}
        if token:
            params["pageToken"] = token
        # Page tokens are stable for an unchanged query within a day; salt the cache by date.
        body = get_json("ctgov", API, params, cache=False, timeout=120, retries=5) or {}
        for study in body.get("studies") or []:
            yield study
        token = body.get("nextPageToken")
        pages += 1
        if not token:
            break


def _date(status: dict, key: str) -> tuple[str | None, str | None]:
    struct = status.get(key) or {}
    return struct.get("date"), struct.get("type")


def compact(study: dict, snapshot: dict, reviewed: dict) -> dict:
    ps = study.get("protocolSection") or {}
    ident, status = ps.get("identificationModule") or {}, ps.get("statusModule") or {}
    design, spons = ps.get("designModule") or {}, ps.get("sponsorCollaboratorsModule") or {}
    conds = (ps.get("conditionsModule") or {}).get("conditions") or []
    mesh = [m.get("term") for m in ((study.get("derivedSection") or {}).get("conditionBrowseModule") or {}).get("meshes") or [] if m.get("term")]
    area, areas = assign_disease_areas(conds, mesh)
    nct = ident.get("nctId")
    overall = status.get("overallStatus")
    start, start_type = _date(status, "startDateStruct")
    pcd, pcd_type = _date(status, "primaryCompletionDateStruct")
    cd, cd_type = _date(status, "completionDateStruct")
    rec = {
        "nct_id": nct,
        "brief_title": ident.get("briefTitle"),
        "overall_status": overall,
        "why_stopped": status.get("whyStopped") or "",
        "start_date": start, "start_date_type": start_type,
        "primary_completion_date": pcd, "primary_completion_date_type": pcd_type,
        "completion_date": cd, "completion_date_type": cd_type,
        "last_update_post_date": (status.get("lastUpdatePostDateStruct") or {}).get("date"),
        "phases": design.get("phases") or [],
        "allocation": (design.get("designInfo") or {}).get("allocation"),
        "enrollment_count": (design.get("enrollmentInfo") or {}).get("count"),
        "enrollment_type": (design.get("enrollmentInfo") or {}).get("type"),
        "lead_sponsor": (spons.get("leadSponsor") or {}).get("name"),
        "lead_sponsor_class": (spons.get("leadSponsor") or {}).get("class"),
        "conditions": conds, "mesh_terms": mesh,
        "disease_area": area, "disease_areas_matched": areas,
        "has_results": study.get("hasResults"),
        "arms_interventions": ps.get("armsInterventionsModule") or {},
    }
    # Stop timing from documented registry fields. For TERMINATED trials sponsors record the actual
    # primary completion date when the study stops; otherwise fall back to the last update posting.
    if overall in STOPPED:
        if pcd and pcd_type == "ACTUAL":
            rec["stop_date_estimate"], rec["stop_date_basis"] = pcd, "PRIMARY_COMPLETION_ACTUAL"
        else:
            rec["stop_date_estimate"], rec["stop_date_basis"] = rec["last_update_post_date"], "LAST_UPDATE_POSTED"
    if overall in STOPPED:
        snap = snapshot.get(nct)
        if snap:
            rec.update({
                "classification_outcome_v2": snap.get("classification_outcome_v2"),
                "classification_primary_reason_v2": snap.get("classification_primary_reason_v2"),
                "classification_secondary_reasons_v2": snap.get("classification_secondary_reasons_v2") or "",
                "classification_source": snap.get("classification_source"),
                "classification_origin": "CANONICAL_SNAPSHOT",
            })
        else:
            result = classify_reason_v2(rec["why_stopped"], reviewed)
            fields = result.as_record_fields()
            rec.update({
                "classification_outcome_v2": fields.get("classification_outcome_v2"),
                "classification_primary_reason_v2": fields.get("classification_primary_reason_v2"),
                "classification_secondary_reasons_v2": fields.get("classification_secondary_reasons_v2") or "",
                "classification_source": classification_source(result),
                "classification_origin": "UNIVERSE_CLASSIFIED",
            })
    return rec


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-seconds", type=float, default=3000)
    ap.add_argument("--end-year", type=int, default=date.today().year)
    args = ap.parse_args()
    started = time.monotonic()
    snapshot = {r["nct_id"]: r for r in json.loads(SNAPSHOT.read_text())}
    reviewed = load_reviewed_reason_index(str(REVIEWED))
    YEAR_DIR.mkdir(parents=True, exist_ok=True)

    for year, start, end in year_slices(args.end_year):
        path = YEAR_DIR / f"{year}.jsonl.gz"
        if path.exists() and (time.time() - path.stat().st_mtime) < REFRESH_DAYS * 86400:
            continue
        if time.monotonic() - started > args.max_seconds:
            print("time budget reached; completed years are kept, re-run to continue", flush=True)
            return 3
        tmp = path.with_name(path.name + ".tmp")
        count = 0
        with gzip.open(tmp, "wt", encoding="utf-8") as fh:
            for study in fetch_slice(start, end):
                rec = compact(study, snapshot, reviewed)
                if rec["nct_id"]:
                    fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
                    count += 1
        tmp.replace(path)
        print(f"{year}: {count} trials ({time.monotonic() - started:.0f}s)", flush=True)

    seen, n_stopped, origin = set(), 0, {}
    with gzip.open(OUT.with_name(OUT.name + ".tmp"), "wt", encoding="utf-8") as out:
        for year, _, _ in year_slices(args.end_year):
            with gzip.open(YEAR_DIR / f"{year}.jsonl.gz", "rt", encoding="utf-8") as fh:
                for line in fh:
                    rec = json.loads(line)
                    if rec["nct_id"] in seen:
                        continue
                    seen.add(rec["nct_id"])
                    out.write(line)
                    if rec["overall_status"] in STOPPED:
                        n_stopped += 1
                        origin[rec["classification_origin"]] = origin.get(rec["classification_origin"], 0) + 1
    OUT.with_name(OUT.name + ".tmp").replace(OUT)
    print(json.dumps({"trials": len(seen), "stopped": n_stopped, "classification_origin": origin}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
