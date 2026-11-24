"""Feasibility study, step 1: one row per Phase 2/3 trial with a label, the date the label became
knowable, and features known when the trial started.

Label (task A, "fails on biology"):
  1 = stopped early (terminated/suspended) for efficacy, futility or safety, or completed/stopped
      with every primary comparison missed (endpoint reader verdict MISSED)
  0 = primary endpoint met (verdict MET)
  excluded = everything else (still running, withdrawn, stopped for non-biological reasons,
      no readable result, split verdicts)
Label (task B, "biological stop among closed trials"): 1 = biological stop, 0 = any other closed
  trial (completed, or terminated/suspended for another reason). Withdrawn trials never started.

known_at: stop date estimate for stops; primary completion + 12 months for endpoint verdicts
  (results are due within a year of primary completion).
"""
from __future__ import annotations

import gzip
import json
import sys
from pathlib import Path

import pandas as pd

CACHE = Path(sys.argv[1])
OUT = Path(sys.argv[2])

BIO_SECONDARY = ("EFFICACY_FUTILITY", "SAFETY", "BIOLOGICAL_UNSPECIFIED")
CLOSED = {"COMPLETED", "TERMINATED", "SUSPENDED"}


def month(value: str | None) -> pd.Timestamp | None:
    if not value:
        return None
    try:
        return pd.Timestamp(value[:7] + "-01") if len(value) >= 7 else pd.Timestamp(value[:4] + "-07-01")
    except ValueError:
        return None


def is_bio_stop(r: dict) -> bool:
    if r.get("overall_status") not in ("TERMINATED", "SUSPENDED"):
        return False
    out = r.get("classification_outcome_v2")
    if out == "BIOLOGICAL_FAILURE":
        return True
    if out == "MIXED_CAUSES":
        sec = r.get("classification_secondary_reasons_v2") or ""
        return any(s in sec for s in BIO_SECONDARY)
    return False


def phase_key(phases: list[str]) -> str:
    p = set(phases or [])
    if p == {"PHASE1", "PHASE2"}:
        return "1/2"
    if p == {"PHASE2", "PHASE3"}:
        return "2/3"
    if p == {"PHASE3"}:
        return "3"
    return "2"


def main() -> None:
    verdicts = {}
    with gzip.open(CACHE / "endpoint_outcomes.jsonl.gz", "rt") as fh:
        for line in fh:
            r = json.loads(line)
            verdicts[r["nct_id"]] = r.get("endpoint_verdict")

    rows = []
    with gzip.open(CACHE / "universe_resolved_v1.jsonl.gz", "rt") as fh:
        for line in fh:
            r = json.loads(line)
            start = month(r.get("start_date"))
            if start is None:
                continue
            status = r.get("overall_status")
            verdict = verdicts.get(r["nct_id"])
            bio = is_bio_stop(r)
            pcd = month(r.get("primary_completion_date"))
            stop = month(r.get("stop_date_estimate")) or pcd

            label_a, known_a, source_a = None, None, None
            if bio:
                label_a, known_a, source_a = 1, stop, "stop"
            elif verdict == "MISSED" and pcd is not None:
                label_a, known_a, source_a = 1, pcd + pd.DateOffset(months=12), "endpoint"
            elif verdict == "MET" and pcd is not None:
                label_a, known_a, source_a = 0, pcd + pd.DateOffset(months=12), "endpoint"

            label_b, known_b = None, None
            if status in CLOSED and (r.get("primary_completion_date_type") == "ACTUAL" or bio):
                label_b = 1 if bio else 0
                known_b = stop if bio else pcd

            arms = {a for i in r.get("interventions") or [] for a in i.get("arm_types") or []}
            modalities = r.get("focus_modalities") or []
            rows.append({
                "nct_id": r["nct_id"],
                "start": start,
                "start_year": start.year,
                "phase": phase_key(r.get("phases")),
                "area": r.get("disease_area") or "Other",
                "sponsor": r.get("lead_sponsor") or "",
                "sponsor_class": r.get("lead_sponsor_class") or "UNKNOWN",
                "randomized": int(r.get("allocation") == "RANDOMIZED"),
                "placebo_arm": int("PLACEBO_COMPARATOR" in arms),
                "active_comparator": int("ACTIVE_COMPARATOR" in arms),
                "n_conditions": len(r.get("conditions") or []),
                "n_interventions": len(r.get("interventions") or []),
                "n_experimental": r.get("experimental_components_total") or 0,
                "resolved_share": (r.get("experimental_components_resolved") or 0)
                / max(1, r.get("experimental_components_total") or 0),
                "modality": modalities[0] if modalities else "Unknown",
                "targets": sorted(set(r.get("experimental_target_genes") or [])),
                "molecules": sorted(set(r.get("experimental_chembl_ids") or [])),
                "label_a": label_a,
                "source_a": source_a,
                "known_a": known_a,
                "label_b": label_b,
                "known_b": known_b,
            })
    df = pd.DataFrame(rows)
    df.to_pickle(OUT)
    a = df[df.label_a.notna()]
    b = df[df.label_b.notna()]
    print(f"trials {len(df):,}; task A labelled {len(a):,} (fail rate {a.label_a.mean():.3f}); "
          f"task B labelled {len(b):,} (bio-stop rate {b.label_b.mean():.3f})")
    print(a.groupby("start_year").label_a.agg(["count", "mean"]).tail(18).to_string())


main()
