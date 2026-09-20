#!/usr/bin/env python3
"""Publish the brief catalogue for the website.

The briefs themselves live in the licensed release; this writes the public index the
/briefs pages render from: one entry per brief with its headline rate, the comparison it
is measured against, the cohort table and a short preview of the stopped trials. The full
trial list stays in the PDF and the dataset.

Reads product/briefs/*.facts.json, writes web/data/briefs_index.json.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRIEFS = ROOT / "product/briefs"
OUT = ROOT / "web/data/briefs_index.json"
PREVIEW_TRIALS = 5


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def main() -> int:
    entries = []
    for facts_path in sorted(BRIEFS.glob("brief_*.facts.json")):
        f = json.loads(facts_path.read_text())
        seg, win = f["segment_stats"], f["window"]
        stem = facts_path.name.replace(".facts.json", "")
        trials = f.get("trials", [])
        entries.append({
            # Area-qualified: the same class name exists in more than one area.
            "slug": f'{slugify(win.get("area", "Oncology"))}-{slugify(f["segment"])}',
            "file_stem": stem,
            "segment": f["segment"],
            "area": win.get("area", "Oncology"),
            "phases": win["phases"],
            "start_from": win["start_from"],
            "start_to": win["start_to"],
            "rate": seg["rate"],
            "closed": seg["closed"],
            "trials_in_segment": seg["trials"],
            "biological_stops": seg["biological_stops"],
            "efficacy_stops": seg["efficacy_stops"],
            "safety_stops": seg["safety_stops"],
            # Exclusive parts that sum to biological_stops, and how mature the segment is:
            # a rate over few closed trials is a provisional number, and the page says so.
            "stops_efficacy_only": seg["stops_efficacy_only"],
            "stops_safety_only": seg["stops_safety_only"],
            "stops_efficacy_and_safety": seg["stops_efficacy_and_safety"],
            "stops_benefit_risk_only": seg["stops_benefit_risk_only"],
            "closed_share": seg["closed_share"],
            "ci95": seg["ci95"],
            "reference_label": f["reference_label"],
            "reference_rate": f["reference_stats"]["rate"],
            "reference_closed": f["reference_stats"]["closed"],
            "reference_stops": f["reference_stats"]["biological_stops"],
            "baseline_rate": f["baseline_stats"]["rate"],
            "baseline_closed": f["baseline_stats"]["closed"],
            "baseline_stops": f["baseline_stats"]["biological_stops"],
            "cohorts": [{k: c[k] for k in ("cohort", "biological_stops", "closed", "rate", "ci95")} for c in f["cohorts"]],
            "trial_count": len(trials),
            "trials_preview": trials[:PREVIEW_TRIALS],
            "has_pdf": (BRIEFS / f"{stem}.pdf").exists(),
            "generated_at_utc": f["generated_at_utc"],
        })

    # Highest rate first: a reader scanning the index is looking for the outliers.
    entries.sort(key=lambda e: (-e["rate"], e["segment"]))
    areas = sorted({e["area"] for e in entries})
    OUT.write_text(json.dumps({
        "schema_version": 1,
        "brief_count": len(entries),
        "areas": areas,
        "definition": "Share of closed trials (completed or terminated) in the segment that were terminated "
                      "for an efficacy, safety or benefit-risk reason recorded in the registry, with a 95% Wilson interval.",
        "briefs": entries,
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(entries)} briefs across {', '.join(areas)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
