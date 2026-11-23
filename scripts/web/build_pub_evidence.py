#!/usr/bin/env python3
"""The publication behind each trial whose label comes from its own paper, for the trial pages.

Reads data/pub_evidence_decisions.csv (reviewed, AI-assisted) and writes web/data/pub_evidence.json:
nct_id -> PMID, journal, year, our summary, and whether the paper reports this trial's stop or a
related trial's. Our words only: no paper text is shown (docs/provenance_and_rights.md).
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    src = ROOT / "data/pub_evidence_decisions.csv"
    rows = list(csv.DictReader(open(src, encoding="utf-8"))) if src.exists() else []
    out = {r["nct_id"]: {"pmid": r["pmid"], "journal": r["journal"], "year": r["year"], "summary": r["our_summary"],
                         "about": r["about"]} for r in rows}
    path = ROOT / "web/data/pub_evidence.json"
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}: {len(out)} trials")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
