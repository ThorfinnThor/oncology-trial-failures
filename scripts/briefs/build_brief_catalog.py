#!/usr/bin/env python3
"""Build a catalogue of benchmark briefs for every mechanism class with enough data.

Runs the brief generator for each class (standalone, and combined with PD-(L)1 where that
combination has enough closed trials). Briefs are written to product/briefs/ as HTML.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.briefs.build_brief import main as build_one  # noqa: E402
from scripts.universe.benchmarks import load, select, summarize  # noqa: E402
from scripts.universe.mechanism_classes import CLASSES  # noqa: E402

MIN_CLOSED = 20
MIN_STOPS = 3


def main() -> int:
    start = (2015, 2024)
    phases = ["2", "3"]
    rows = load("Oncology")
    base = select(rows, phases=phases, start=start)
    window = ["--start", f"{start[0]}:{start[1]}"]
    jobs: list[tuple[str, list[str]]] = []
    for name in CLASSES:
        s = summarize(select(base, klass=name))
        if s["closed"] >= MIN_CLOSED and s["biological_stops"] >= MIN_STOPS:
            jobs.append((name, ["--class", name, *window]))
        combo = summarize(select(base, klass=name, with_class="PD-(L)1"))
        if name != "PD-(L)1" and combo["closed"] >= MIN_CLOSED and combo["biological_stops"] >= MIN_STOPS:
            jobs.append((f"{name} + PD-(L)1", ["--class", name, "--with-class", "PD-(L)1", *window]))

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
