#!/usr/bin/env python3
"""Read every generated document the way a customer would, and fail on what a customer would notice.

The reports, briefs and the public sample are built from templates and numbers. A template that
meets a number it did not expect prints "1 stops", "None of the 0 completed trials", "NaN%" or an
unfilled {placeholder} — each harmless to a test that checks the numbers and each obvious to a
reader in the first minute. This reads the rendered text of every document and fails the build on
any of them, so it runs before anything is committed (update-data.yml) and on every push
(web-checks.yml).
"""
from __future__ import annotations

import glob
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

CHECKS = [
    (r"\bNaN\b", "NaN"),
    (r"\bundefined\b", "undefined"),
    (r"\bNone\b(?!\s+of\s+the\s+[1-9])", "Python None"),
    (r"\bnull\b", "null"),
    (r"\binf%|\bInfinity\b", "infinity"),
    (r"\b1 (?:stops|trials|molecules|sponsors|programmes|cohorts|studies|terminations|chapters|drugs|events|patients|reports)\b",
     "singular with plural noun"),
    (r"\bof 0 (?:completed|closed) trials\b|\bNone of the 0\b|\b0 of 0\b", "zero rendered as a finding"),
    (r"\{[a-z_]{2,}\}", "unfilled placeholder"),
    (r"\bthe the\b|\ba a\b|\bof of\b|\bto to\b", "doubled word"),
    (r"\(\s*\)", "empty parentheses"),
    (r"%%", "doubled percent sign"),
]
COMPILED = [(re.compile(p), label) for p, label in CHECKS]


def visible_text(markup: str) -> str:
    markup = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>|<!--[\s\S]*?-->", " ", markup)
    return html.unescape(re.sub(r"<[^>]+>", " ", markup))


def documents() -> list[tuple[str, str]]:
    docs = []
    private = ROOT / "web/data/private/evidence_packages.json"
    if private.exists():
        for slug, pkg in json.loads(private.read_text())["packages"].items():
            docs.append((f"report {slug}", pkg.get("html", "")))
    for pattern in ("web/public/briefs/*.html", "web/public/samples/*.html"):
        for path in sorted(glob.glob(str(ROOT / pattern))):
            docs.append((Path(path).relative_to(ROOT).as_posix(), Path(path).read_text(errors="ignore")))
    return docs


def consistency() -> list[str]:
    """The free brief and the paid report on one cohort must state the same numbers.

    A combination report once compared with the whole area while its brief compared with the
    partner's other combinations, so a buyer saw two reference rates for one question.
    """
    cat_path, idx_path = ROOT / "web/data/evidence_catalogue.json", ROOT / "web/data/briefs_index.json"
    if not (cat_path.exists() and idx_path.exists()):
        return []
    reports = {p["brief_stem"]: p for p in json.loads(cat_path.read_text())["packages"] if p.get("brief_stem")}
    out = []
    for b in json.loads(idx_path.read_text())["briefs"]:
        p = reports.get(b["file_stem"])
        if not p:
            continue
        h, c = p["headline"], p["counts"]
        pairs = [("rate", b["rate"], h["rate"]), ("closed trials", b["closed"], c["closed"]),
                 ("stops", b["biological_stops"], c["stopped"]), ("trials", b["trials_in_segment"], c["total_in_cohort"]),
                 ("comparator rate", b.get("reference_rate"), h["comparator_rate"]),
                 ("comparator", b.get("reference_label"), h["comparator_label"])]
        for name, brief_value, report_value in pairs:
            same = (abs(brief_value - report_value) < 1e-9) if isinstance(brief_value, float) and isinstance(report_value, float) \
                else brief_value == report_value
            if not same:
                out.append(f"{b['slug']}: brief and report disagree on {name} — {brief_value} vs {report_value}")
    return out


def main() -> int:
    problems = consistency()
    docs = documents()
    for name, markup in docs:
        text = " ".join(visible_text(markup).split())
        for rx, label in COMPILED:
            for m in rx.finditer(text):
                problems.append(f"{name}: {label} — …{text[max(0, m.start() - 60):m.end() + 40]}…")
    if problems:
        print(f"GENERATED-TEXT CHECK FAILED ({len(problems)}):\n" + "\n".join(problems[:60]))
        return 1
    print(f"generated-text check passed: {len(docs)} documents")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
