#!/usr/bin/env python3
"""Build a catalogue of discontinuation-rate briefs for every mechanism class with enough data.

Runs the brief generator for each class (standalone, and combined with PD-(L)1 where that
combination has enough closed trials). Briefs are written to product/briefs/ as HTML.
"""
from __future__ import annotations

import argparse
import re
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.briefs.build_brief import main as build_one  # noqa: E402
from scripts.universe.discontinuation_rates import load, select, summarize  # noqa: E402
from scripts.universe.mechanism_classes import COMBINATION_PARTNER, classes_of  # noqa: E402
from scripts.universe.multiplicity import benjamini_yekutieli, binom_sf  # noqa: E402

MANIFEST = ROOT / "product/briefs/manifest.json"


def record_manifest(area: str, stems: list[str]) -> None:
    """What this area's catalogue contains now, replacing whatever it contained before.

    A class that is renamed, split or dropped leaves its brief behind on disk. The index reads
    the manifest rather than the directory, so a stale file cannot reappear on the site. We
    also try to delete it, because a tidy release directory is worth having — but the build
    must not depend on being allowed to.
    """
    manifest = {}
    if MANIFEST.exists():
        try:
            manifest = json.loads(MANIFEST.read_text())
        except json.JSONDecodeError:
            manifest = {}
    manifest[area] = sorted(stems)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False, sort_keys=True) + "\n")

    keep = {stem for stems_ in manifest.values() for stem in stems_}
    area_prefix = f"brief_{re.sub(r'[^a-z0-9]+', '-', area.lower()).strip('-')}_"
    for path in sorted(MANIFEST.parent.glob("brief_*")):
        stem = path.name.split(".")[0]
        if not stem.startswith(area_prefix) or stem in keep:
            continue
        try:
            path.unlink()
            print(f"  removed stale {path.name}")
        except OSError:
            print(f"  stale, left on disk (not deletable here): {path.name}")

MIN_CLOSED = 20
MIN_STOPS = 3
# A small segment is worth a brief when its interval clears the area baseline outright AND the
# stops came from several independent sponsor-asset programmes. Counting records would keep the
# wrong things: one sponsor abandoning five trials of one molecule is one decision, while four
# trials stopped by three different sponsors is three. Tau (7 stops, 4 programmes) and BACE /
# gamma-secretase (4 of 4 closed trials, 3 sponsors) are the clearest findings in the data and a
# raw stop threshold drops the second.
SMALL_BUT_CERTAIN_STOPS = 3
SMALL_BUT_CERTAIN_PROGRAMMES = 3


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
    # Scored against the same like-for-like baseline the briefs use: trials whose drug resolved
    # to a target, since a class segment can only ever contain those.
    baseline_rate = summarize([r for r in base if r["_genes"]])["rate"]

    def worth_a_brief(s: dict) -> bool:
        if s["closed"] >= MIN_CLOSED and s["biological_stops"] >= MIN_STOPS:
            return True
        return (s["biological_stops"] >= SMALL_BUT_CERTAIN_STOPS
                and s["stop_programmes"] >= SMALL_BUT_CERTAIN_PROGRAMMES
                and s["ci95"][0] > baseline_rate)
    # Every class this area could have produced a brief for is one test in one family. The
    # q-value each brief prints is computed over that whole family, not over the ones that
    # happened to clear the publication threshold — otherwise the correction would be applied
    # to a set already filtered for being extreme, which is the selection effect it exists to
    # measure. Yekutieli because a class and that class combined with a partner share trials.
    candidates: list[tuple[str, list[str], dict]] = []
    for name in classes_of(args.area):
        candidates.append((name, ["--class", name, *window], summarize(select(base, klass=name))))
        if partner and name != partner:
            candidates.append((f"{name} + {partner}", ["--class", name, "--with-class", partner, *window],
                               summarize(select(base, klass=name, with_class=partner))))
    ps = [binom_sf(c[2]["biological_stops"], c[2]["closed"], baseline_rate) if c[2]["closed"] else 1.0
          for c in candidates]
    qs = benjamini_yekutieli(ps)
    family_size = len(candidates)

    jobs: list[tuple[str, list[str]]] = []
    for (label, job_args, stats), q in zip(candidates, qs):
        if worth_a_brief(stats):
            jobs.append((label, [*job_args, "--q-value", f"{q:.6g}", "--family-size", str(family_size)]))

    # One process, one universe load: building 40+ briefs as subprocesses re-read the
    # whole universe each time and exhausted memory when run in parallel.
    for label, job_args in jobs:
        code = build_one(job_args)
        if code:
            print(f"skipped {label} (exit {code})", file=sys.stderr)
    slug = lambda v: re.sub(r"[^a-z0-9]+", "-", (v or "").lower()).strip("-")
    area_slug = slug(args.area)
    window_slug = f"{start[0]}-{start[1]}"
    record_manifest(args.area, [f"brief_{area_slug}_{slug(label)}_{window_slug}" for label, _ in jobs])
    print(f"built {len(jobs)} briefs: {', '.join(n for n, _ in jobs)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
