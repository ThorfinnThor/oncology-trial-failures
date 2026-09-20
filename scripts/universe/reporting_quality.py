#!/usr/bin/env python3
"""How reporting behaviour, not biology, moves the discontinuation rate.

The metric rewards sponsors who write down why they stopped. A sponsor who files "futility"
lands in the numerator; one who files "business decision" or files nothing does not, even
where the underlying circumstances were the same. That is not a claim about honesty — it is
a claim about vocabulary, and it is measurable.

It matters because the effect is large and unevenly distributed. In oncology Phase 2/3,
27.8% of industry terminations state no cause the classifier can read, against 13.8% of
academic ones, so an industry-versus-academic comparison of rates is substantially a
comparison of disclosure practice. Individual sponsors range from under a fifth to every
single termination.

This is also why the product publishes no sponsor league table.

Writes web/data/reporting_quality.json.
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.universe.discontinuation_rates import UNRESOLVED_TERMINATIONS, load, select, summarize  # noqa: E402

OUT = ROOT / "web/data/reporting_quality.json"
AREAS = ["Oncology", "Neurology", "Immunology & Autoimmune"]
WINDOW = (2015, 2024)
PHASES = ["2", "3"]
MIN_TERMINATIONS = 25  # below this a sponsor's share is noise, and naming them would be unfair


def unreadable(r: dict) -> bool:
    return r.get("classification_outcome_v2") in UNRESOLVED_TERMINATIONS


def split(rows: list[dict], keyfn) -> list[dict]:
    groups: dict[object, list[dict]] = defaultdict(list)
    for r in rows:
        groups[keyfn(r)].append(r)
    out = []
    for key, rs in groups.items():
        if key is None or len(rs) < 30:
            continue
        n_un = sum(1 for r in rs if unreadable(r))
        out.append({"group": str(key), "terminations": len(rs), "unreadable": n_un,
                    "unreadable_share": n_un / len(rs)})
    return sorted(out, key=lambda d: -d["terminations"])


def area_block(area: str) -> dict:
    base = select(load(area), phases=PHASES, start=WINDOW)
    term = [r for r in base if r.get("overall_status") == "TERMINATED"]
    industry = [r for r in base if r.get("lead_sponsor_class") == "INDUSTRY"]
    other = [r for r in base if r.get("lead_sponsor_class") != "INDUSTRY"]

    # Named sponsors, but only where there is enough to say something, and reported as a
    # disclosure statistic - never as a ranking of who fails most.
    by_sponsor = []
    groups: dict[str, list[dict]] = defaultdict(list)
    for r in term:
        if r.get("lead_sponsor_class") == "INDUSTRY":
            groups[r["_sponsor_group"]].append(r)
    for name, rs in groups.items():
        if len(rs) < MIN_TERMINATIONS:
            continue
        n_un = sum(1 for r in rs if unreadable(r))
        by_sponsor.append({"sponsor_group": name, "terminations": len(rs), "unreadable": n_un,
                           "unreadable_share": n_un / len(rs)})
    by_sponsor.sort(key=lambda d: -d["unreadable_share"])

    def band(rows):
        s = summarize(rows)
        return {"closed": s["closed"], "biological_stops": s["biological_stops"], "rate": s["rate"],
                "unresolved_terminations": s["unresolved_terminations"],
                "rate_if_all_unresolved_were_biological": s["rate_if_all_unresolved_were_biological"]}

    return {
        "area": area,
        "terminations": len(term),
        "unreadable": sum(1 for r in term if unreadable(r)),
        "by_sponsor_class": split(term, lambda r: r.get("lead_sponsor_class")),
        "by_start_era": split(term, lambda r: "2015–2019" if (r["_start_year"] or 0) <= 2019 else "2020–2024"),
        "by_phase": split(term, lambda r: "Phase 3" if "3" in r["_phase"] else "Phase 2"),
        "by_sponsor_group": by_sponsor,
        "consequence": {"industry": band(industry), "non_industry": band(other)},
    }


def main() -> int:
    payload = {
        "schema_version": 1,
        "window": {"start_from": WINDOW[0], "start_to": WINDOW[1], "phases": PHASES},
        "definition": "An 'unreadable' termination is one where the registry's stop-reason field names no cause the "
                      "classifier can resolve — it is empty, or it says only that a decision was taken. Such a trial "
                      "stays in the denominator and never enters the numerator, so a sponsor or cohort that discloses "
                      "less will show a lower rate for reasons that have nothing to do with the drug.",
        "not_a_ranking": "These are disclosure statistics. A high unreadable share is not evidence of concealment, and a "
                         "low discontinuation rate next to a high unreadable share is not evidence of a better drug. "
                         "No sponsor league table is published from this product for exactly this reason.",
        "min_terminations_to_name_a_sponsor": MIN_TERMINATIONS,
        "areas": [area_block(a) for a in AREAS],
    }
    OUT.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
    for a in payload["areas"]:
        cls = {g["group"]: g["unreadable_share"] for g in a["by_sponsor_class"]}
        ind = cls.get("INDUSTRY")
        oth = cls.get("OTHER")
        print(f"  {a['area']}: {a['unreadable']}/{a['terminations']} unreadable"
              + (f" · industry {ind * 100:.1f}% vs academic {oth * 100:.1f}%" if ind and oth else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
