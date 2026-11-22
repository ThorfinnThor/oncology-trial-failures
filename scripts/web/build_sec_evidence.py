#!/usr/bin/env python3
"""The SEC filing behind each trial whose label comes from it, for the trial pages.

Reads data/sec_evidence_decisions.csv (reviewed, AI-assisted) and writes web/data/sec_evidence.json:
nct_id -> form, filing date, link, the sentence the label rests on, and whether the filing speaks of
this trial or of the drug's programme. Small and public; filings are public documents.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    src = ROOT / "data/sec_evidence_decisions.csv"
    rows = list(csv.DictReader(open(src, encoding="utf-8"))) if src.exists() else []
    out = {r["nct_id"]: {"form": r["source_form"], "filed": r["source_filed"], "url": r["source_url"],
                         "quote": r["quote"], "about": r["filing_about"], "note": r["note"]} for r in rows}
    path = ROOT / "web/data/sec_evidence.json"
    path.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}: {len(out)} trials")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
