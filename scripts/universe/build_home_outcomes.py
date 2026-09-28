#!/usr/bin/env python3
"""The four ways a trial ends, with one real record each, for the home page.

A visitor should see in five seconds that "stopped" and "failed" are different questions, and that
the site answers both: a trial stopped for efficacy, one stopped for safety, one that ran to the end
and missed its primary endpoint, one that ran to the end and met it. Each comes with its count and
one real, recent, industry-sponsored example carrying the evidence it was read from.

The examples are chosen by rule, not by hand, so they change with the data and can never be a
curated flattering case: the most recent Phase 3 industry trial whose evidence fits on a card.

Output: web/data/home_outcomes.json
"""
from __future__ import annotations

import gzip
import re
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.universe.endpoint_outcomes import evidence_of, load_verdicts, read_on, results_url  # noqa: E402

STOPPED = ROOT / "web/public/all_stopped_trials.json"
UNIVERSE = ROOT / ".cache/universe/universe_resolved_v1.jsonl.gz"
OUT = ROOT / "web/data/home_outcomes.json"
MAX_OUTCOME = 90     # an endpoint title longer than this does not fit on a card
MAX_REASON = 240


def shorten(text: str, limit: int) -> str:
    text = " ".join((text or "").split())
    return text if len(text) <= limit else text[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def load_universe() -> dict[str, dict]:
    if not UNIVERSE.exists():
        return {}
    out = {}
    with gzip.open(UNIVERSE, "rt", encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            out[r["nct_id"]] = r
    return out


def drugs_of(u: dict | None, fallback: str = "") -> str:
    if u:
        names = []
        for i in u.get("interventions") or []:
            if i.get("role") != "EXPERIMENTAL_ARM":
                continue
            for c in i.get("components") or []:
                # Only what resolved to a molecule: an arm label ("Open label - AL001") is not a drug.
                name = c.get("name") if c.get("status") == "RESOLVED" else None
                name = name.capitalize() if name and name.isupper() else name
                if name and name.lower() not in {n.lower() for n in names}:
                    names.append(name)
        if names:
            return ", ".join(names[:3])
    # Registry arm text: "2.0 mg OPT-302" is OPT-302.
    return shorten(re.sub(r"^\s*\d+(?:\.\d+)?\s*(?:mg|µg|mcg|g|ml)\b\s*", "", fallback.split(";")[0], flags=re.I), 60)


def phase_of(raw: object) -> str:
    text = " ".join(raw) if isinstance(raw, list) else str(raw or "")
    return "Phase 3" if "3" in text else "Phase 2" if "2" in text else ""


def fits(ev: dict) -> bool:
    if ev.get("statement"):
        return len(ev["statement"]["text"]) <= 220
    lines = ev.get("lines") or []
    return bool(lines) and len(lines[0].split(" — ")[0]) <= MAX_OUTCOME


def evidence_text(ev: dict) -> str:
    if ev.get("statement"):
        return f"“{ev['statement']['text']}”"
    # The card has room for the endpoint, the number and the bar; the method is on the results tab.
    return shorten(re.sub(r"\s*Method: .*$", "", ev["lines"][0]), 230)


def main() -> int:
    verdicts = load_verdicts()
    universe = load_universe()
    stopped = json.loads(STOPPED.read_text())

    def industry(nct: str) -> bool:
        return (universe.get(nct) or {}).get("lead_sponsor_class") == "INDUSTRY"

    def when(r: dict) -> str:
        return r.get("primary_completion_date") or r.get("completion_date") or r.get("start_date") or ""

    # Stopped, by the stop-reason classification the site already publishes.
    def stopped_example(reason: str, prefer_posted: bool, must=None):
        pool = [r for r in stopped
                if r.get("classification_primary_reason_v2") == reason
                and r.get("classification_outcome_v2") == "BIOLOGICAL_FAILURE"
                and r.get("overall_status") == "TERMINATED"
                and "3" in str(r.get("phases") or "")
                and industry(r["nct_id"])
                and 30 <= len(" ".join((r.get("why_stopped") or "").split())) <= MAX_REASON
                and (must is None or must.search(r.get("why_stopped") or ""))]
        pool.sort(key=lambda r: (bool(prefer_posted and evidence_of(verdicts.get(r["nct_id"]))), when(r)), reverse=True)
        if not pool:
            return None
        r = pool[0]
        ev = evidence_of(verdicts.get(r["nct_id"]))
        return {
            "nct_id": r["nct_id"],
            "sponsor": r.get("lead_sponsor"),
            "phase": phase_of(r.get("phases")),
            "drugs": drugs_of(universe.get(r["nct_id"]), r.get("intervention_names") or ""),
            "evidence": f"“{shorten(r.get('why_stopped') or '', MAX_REASON)}”",
            "evidence_source": "the sponsor's stop reason",
            "posted": (evidence_text(ev) if ev and fits(ev) else None),
            "href": f"/trial/{r['nct_id']}",
            "external": False,
        }

    # Completed, by the posted primary result.
    completed = {n: v for n, v in verdicts.items() if v.get("overall_status") == "COMPLETED"}
    tally = {"MISSED": 0, "MET": 0, "MIXED": 0}
    for v in completed.values():
        if v["endpoint_verdict"] in tally:
            tally[v["endpoint_verdict"]] += 1

    def completed_example(verdict: str):
        pool = []
        for nct, v in completed.items():
            u = universe.get(nct)
            if v["endpoint_verdict"] != verdict or not u or u.get("lead_sponsor_class") != "INDUSTRY":
                continue
            if "PHASE3" not in (u.get("phases") or []):
                continue
            ev = evidence_of(v)
            if ev and fits(ev):
                pool.append((u.get("primary_completion_date") or "", nct, u, ev))
        if not pool:
            return None
        _, nct, u, ev = max(pool)
        return {
            "nct_id": nct,
            "sponsor": u.get("lead_sponsor"),
            "phase": "Phase 3",
            "drugs": drugs_of(u),
            "evidence": evidence_text(ev),
            "evidence_source": "the sponsor's statement" if ev.get("statement") else "the sponsor's posted comparison",
            "posted": None,
            "href": results_url(nct),
            "external": True,
        }

    reasons = {}
    for r in stopped:
        if r.get("classification_outcome_v2") == "BIOLOGICAL_FAILURE":
            key = r.get("classification_primary_reason_v2")
            reasons[key] = reasons.get(key, 0) + 1

    out = {
        "read_on": read_on(),
        "readable_completed": sum(tally.values()),
        "cards": [
            {"key": "stopped_efficacy", "status": "Stopped", "label": "Efficacy or futility",
             "count": reasons.get("EFFICACY_FUTILITY", 0), "count_label": "stopped trials",
             "example": stopped_example("EFFICACY_FUTILITY", prefer_posted=True)},
            {"key": "stopped_safety", "status": "Stopped", "label": "Safety",
             "count": reasons.get("SAFETY", 0), "count_label": "stopped trials",
             "example": stopped_example("SAFETY", prefer_posted=False,
                                        must=re.compile(r"safety|toxicit|adverse|death|mortality", re.I))},
            {"key": "completed_missed", "status": "Completed", "label": "Primary endpoint missed",
             "count": tally["MISSED"], "count_label": "completed trials",
             "example": completed_example("MISSED")},
            {"key": "completed_met", "status": "Completed", "label": "Primary endpoint met",
             "count": tally["MET"], "count_label": "completed trials",
             "example": completed_example("MET")},
        ],
    }
    if not verdicts:
        print("no endpoint outcomes read yet; leaving", OUT.name, "as it is")
        return 0
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    for c in out["cards"]:
        ex = c["example"] or {}
        print(f"{c['status']:9} {c['label']:26} {c['count']:>6}  {ex.get('nct_id')}  {ex.get('sponsor')}  {ex.get('drugs')}")
        print(f"          {ex.get('evidence')}")
        if ex.get("posted"):
            print(f"          posted: {ex['posted']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
