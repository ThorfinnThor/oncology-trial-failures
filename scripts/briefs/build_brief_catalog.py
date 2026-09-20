#!/usr/bin/env python3
"""Build a catalogue of discontinuation-rate briefs for every mechanism class with enough data.

Runs the brief generator for each class (standalone, and combined with PD-(L)1 where that
combination has enough closed trials). Briefs are written to product/briefs/ as HTML.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.briefs.build_brief import main as build_one  # noqa: E402
from scripts.universe.discontinuation_rates import load, select, summarize  # noqa: E402
from scripts.universe.mechanism_classes import COMBINATION_PARTNER, classes_of  # noqa: E402

MIN_CLOSED = 20
MIN_STOPS = 3
# A small segment is worth a brief when its interval clears the area baseline outright: tau
# is 7 stops in 10 closed trials (39.7-89.2% against a 5.9% baseline) and the size rule alone
# would drop the clearest finding in the data.
SMALL_BUT_CERTAIN_STOPS = 5


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--area", default="Oncology")
    args = ap.parse_args()
    start = (2015, 2024)
    phases = ["2", "3"]
    rows = load(args.area)
    base = select(rows, phases=phases, start=start)
    window = ["--start", f"{start[0]}:{start[1]}", "--area", args.area]
    partner = COMBINATION_PARTNER.get(args.area)
    baseline_rate = summarize(base)["rate"]

    def worth_a_brief(s: dict) -> bool:
        if s["closed"] >= MIN_CLOSED and s["biological_stops"] >= MIN_STOPS:
            return True
        return s["biological_stops"] >= SMALL_BUT_CERTAIN_STOPS and s["ci95"][0] > baseline_rate
    jobs: list[tuple[str, list[str]]] = []
    for name in classes_of(args.area):
        s = summarize(select(base, klass=name))
        if worth_a_brief(s):
            jobs.append((name, ["--class", name, *window]))
        if not partner or name == partner:
            continue
        combo = summarize(select(base, klass=name, with_class=partner))
        if worth_a_brief(combo):
            jobs.append((f"{name} + {partner}", ["--class", name, "--with-class", partner, *window]))

    # One process, one universe load: building 40+ briefs as subprocesses re-read the
    # whole universe each time and exhausted memory when run in parallel.
    for label, job_args in jobs:
        code = build_one(job_args)
        if code:
            print(f"skipped {label} (exit {code})", file=sys.stderr)
    print(f"built {len(jobs)} briefs: {', '.join(n for n, _ in jobs)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
