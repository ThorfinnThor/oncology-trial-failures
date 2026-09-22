#!/usr/bin/env python3
"""What we know about every mechanism class, not only the ones with a published brief.

A brief is published where enough trials have closed to put a rate on them. That is a decision
about statistics. Whether we can tell a buyer which molecules failed against their target is a
different question entirely, and it was being answered by the first: the asset check compared
against the packages, the packages came from the briefs, and so a CD19 developer — with 355 CD19
trials and 26 terminations in the dataset — was told nothing in our data looked like their asset.

This file is the answer to the second question for every class we track. Where a rate is
publishable it says so and names the package; where it is not, it still says how many trials
closed, how many stopped, and which molecules were behind them. "Too few to put a rate on, here
are the four" is a real answer. "Nothing looks like it" was not.

  python scripts/signals/build_class_signatures.py   ->  web/data/private/class_signatures.json
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.stop_attribution import signature  # noqa: E402
from scripts.universe.discontinuation_rates import load, select, summarize  # noqa: E402
from scripts.universe.mechanism_classes import CURATED_AREAS, classes_of  # noqa: E402

CATALOGUE = ROOT / "web/data/evidence_catalogue.json"
OUT = ROOT / "web/data/private/class_signatures.json"
AREAS = CURATED_AREAS
PHASES = ("2", "3")
START = (2015, 2024)
MARKER = ("Server-side only. This file is imported by the API route that delivers a paid "
          "package; it must never be imported from a page component, or the bundler will "
          "ship it to the browser.")


def packages_by_cohort() -> dict[tuple[str, str], str]:
    """Which class already has a package, so the check can offer one where there is one."""
    if not CATALOGUE.exists():
        return {}
    catalogue = json.loads(CATALOGUE.read_text())
    return {(p["area"], p["cohort"]): p["slug"] for p in catalogue.get("packages", [])}


def build() -> dict:
    sold = packages_by_cohort()
    classes: list[dict] = []

    for area in AREAS:
        rows = load(area=area)
        if not rows:
            print(f"  {area}: no trials", file=sys.stderr)
            continue
        for name in sorted(classes_of(area)):
            cohort = select(rows, klass=name, phases=PHASES, start=START)
            if not cohort:
                continue
            stats = summarize(cohort)
            stops = [r for r in cohort if r["_bio"]]
            sig = signature(stops, area=area, klass=name)
            assets = [{k: a.get(k) for k in ("asset", "modalities", "target_genes", "mechanisms", "trial_count")}
                      for a in sig.get("assets") or []]
            # A class with no resolvable molecule behind a stop is kept, with an empty list.
            # "We track TROP-2: 246 trials, four terminated, none for a biological reason we can
            # read" is an answer. Dropping the class turns it into "nothing looks like it", which
            # is the failure this file exists to fix.
            classes.append({
                "area": area,
                "cohort": name,
                "slug": sold.get((area, name)),
                "counts": {
                    "total_in_cohort": stats["trials"],
                    "closed": stats["closed"],
                    "stopped": stats["biological_stops"],
                    "still_open": stats["trials"] - stats["closed"],
                    "unreadable_terminations": stats.get("unresolved_terminations") or 0,
                },
                "headline": {
                    # A rate is only quoted where one was published. Elsewhere the counts stand on
                    # their own, and the page says why there is no rate rather than inventing one.
                    "rate": stats["rate"] if sold.get((area, name)) else None,
                    "ci95": stats.get("ci95") if sold.get((area, name)) else None,
                },
                "failed_assets": assets,
                "genes": sorted(classes_of(area).get(name) or []),
            })

    return {"schema_version": 1, "note": MARKER, "window": {"phases": list(PHASES), "start": list(START)},
            "class_count": len(classes), "sold_count": sum(1 for c in classes if c["slug"]), "classes": classes}


def main() -> int:
    started = time.time()
    payload = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    size = OUT.stat().st_size / 1024
    print(f"wrote {OUT.relative_to(ROOT)}: {payload['class_count']} classes "
          f"({payload['sold_count']} with a package), {size:.0f} KB, in {time.time() - started:.0f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
