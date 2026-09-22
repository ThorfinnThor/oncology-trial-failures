#!/usr/bin/env python3
"""The exact path from the trial universe to every published denominator.

A denominator is only worth something if the customer can see how it was built. This walks
the filter cascade one step at a time and records what each step removed, for every disease
area we publish rates for, and reconciles the stopped-trial dataset against the rate
numerator so the two products' headline counts can be tied together.

Writes web/data/cohort_flow.json.
"""
from __future__ import annotations

import csv
import gzip
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.universe.discontinuation_rates import (  # noqa: E402
    UNIVERSE, areas_of, is_bio_stop, phase_groups,
)
from scripts.universe.mechanism_classes import CURATED_AREAS  # noqa: E402

OUT = ROOT / "web/data/cohort_flow.json"
SIGNALS = ROOT / "product/oncology_failure_signals_v1.csv"
AREAS = list(CURATED_AREAS)
WINDOW = (2015, 2024)
PHASES = {"2", "3"}


def flow(records: list[dict], area: str) -> dict:
    """One row per filter, each stating what it keeps and why it exists."""
    steps = []

    def step(label, kept, note):
        steps.append({"step": label, "trials": len(kept), "note": note})
        return kept

    universe = records
    steps.append({"step": "Interventional Phase 2/3 trials registered since 2010", "trials": len(universe),
                  "note": "Every eligible ClinicalTrials.gov record — the registry, not every trial ever run."})
    tagged = step(f"Tagged {area}", [r for r in universe if area in areas_of(r)],
                  "Disease area is a multi-label tag from conditions and MeSH terms, not an exclusive bucket.")
    if area != "Oncology":
        tagged = step("Excluding trials also tagged Oncology", [r for r in tagged if "Oncology" not in areas_of(r)],
                      "Cancer trials appear under most areas (brain metastases, lung cancer); counting them "
                      "in another area's rate would measure oncology.")
    ph = step("Phase 2 or Phase 3", [r for r in tagged if phase_groups(r.get("phases")) & PHASES],
              "Phase 1/2 counts as Phase 2; Phase 2/3 counts as Phase 3.")
    win = step(f"Started {WINDOW[0]}–{WINDOW[1]}", [r for r in ph if r.get("start_date")
                                                     and WINDOW[0] <= int(r["start_date"][:4]) <= WINDOW[1]],
               "Start date, not registration date. The window ends three years back so trials have had time to close.")
    closed = step("Closed: completed or terminated", [r for r in win if r.get("overall_status") in ("COMPLETED", "TERMINATED")],
                  "The rate's denominator. Withdrawn (never enrolled), suspended, ongoing and unknown-status "
                  "trials are excluded because their outcome is not yet observed.")
    bio = step("Terminated for an efficacy, safety or benefit–risk reason", [r for r in closed if is_bio_stop(r)],
               "The rate's numerator, from the registry's own stop-reason text.")
    resolved = [r for r in closed if r.get("experimental_target_genes")]
    terminated = [r for r in win if r.get("overall_status") == "TERMINATED"]
    unreadable = [r for r in terminated if r.get("classification_outcome_v2") in ("CAUSE_NOT_STATED", "UNKNOWN")]
    return {
        "area": area,
        "steps": steps,
        "closed": len(closed),
        "biological_stops": len(bio),
        "rate": len(bio) / len(closed) if closed else None,
        "aside": {
            "closed_with_resolved_target": len(resolved),
            "closed_with_resolved_target_stops": sum(1 for r in resolved if is_bio_stop(r)),
            "terminated_any_reason": len(terminated),
            "terminated_with_no_readable_cause": len(unreadable),
            "still_open_or_unknown": len(win) - len(closed),
        },
    }


def signals_reconciliation(records: list[dict]) -> dict | None:
    """Why the stopped-trial dataset says ~990 and the oncology rate says 338."""
    if not SIGNALS.exists():
        return None
    rows = list(csv.DictReader(open(SIGNALS, encoding="utf-8")))
    onc_stops = [r for r in records if "Oncology" in areas_of(r) and is_bio_stop(r)]
    in_window = [r for r in onc_stops if r.get("start_date") and WINDOW[0] <= int(r["start_date"][:4]) <= WINDOW[1]]
    return {
        "dataset_rows": len(rows),
        "note": "The two products count different things and both counts are correct.",
        "steps": [
            {"step": "Oncology trials in the stopped-trial dataset", "trials": len(rows),
             "note": "Every phase, every start year — the dataset is a catalogue of stopped trials."},
            {"step": "…restricted to Phase 2 or 3 registered since 2010", "trials": len(onc_stops),
             "note": "Phase 1 and Phase 4 trials, and trials predating the universe, drop out: a rate needs a "
                     "denominator and the universe only carries Phase 2/3 since 2010."},
            {"step": f"…started {WINDOW[0]}–{WINDOW[1]}", "trials": len(in_window),
             "note": "The rate's window. This is the numerator behind the oncology headline."},
        ],
    }


def main() -> int:
    records = []
    with gzip.open(UNIVERSE, "rt", encoding="utf-8") as fh:
        for line in fh:
            records.append(json.loads(line))
    payload = {
        "schema_version": 1,
        "universe_trials": len(records),
        "window": {"start_from": WINDOW[0], "start_to": WINDOW[1], "phases": sorted(PHASES)},
        "areas": [flow(records, a) for a in AREAS],
        "signals_reconciliation": signals_reconciliation(records),
        "source": "ClinicalTrials.gov, via the weekly build. 'Every eligible record' means every "
                  "ClinicalTrials.gov registration meeting these filters — not every trial ever conducted.",
    }
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    for a in payload["areas"]:
        print(f"  {a['area']}: {a['biological_stops']}/{a['closed']} = {a['rate'] * 100:.2f}%")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
