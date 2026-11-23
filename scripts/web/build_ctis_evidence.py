#!/usr/bin/env python3
"""The EU register record behind each trial whose label comes from CTIS, for the trial pages.

Reads data/ctis_evidence_decisions.csv (reviewed, AI-assisted) and writes web/data/ctis_evidence.json:
nct_id -> CTIS number, the coded early-termination category, the member states, our summary.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    src = ROOT / "data/ctis_evidence_decisions.csv"
    rows = list(csv.DictReader(open(src, encoding="utf-8"))) if src.exists() else []
    out = {r["nct_id"]: {"ctis_id": r["ctis_id"], "categories": r["categories"], "countries": r["countries"],
                         "summary": r["our_summary"]} for r in rows}
    path = ROOT / "web/data/ctis_evidence.json"
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}: {len(out)} trials")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
