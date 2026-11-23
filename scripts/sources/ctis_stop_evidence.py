#!/usr/bin/env python3
"""What the EU Clinical Trials Information System (CTIS) records about why a trial ended early, for
trials whose registry stop reason names no cause (CAUSE_NOT_STATED / UNRESOLVED).

Linkage: the CTIS number (e.g. 2023-503420-12-00) the trial lists as a secondary ID on
ClinicalTrials.gov. CTIS records, per member state, a coded early-termination reason ("Safety Related
(Clinical or Pre-Clinical Results)", "Reprioritisation of Trial", "Feasibility (recruitment issues,
etc)", "Sponsor Decision", ...), temporary halts with coded reasons and a flag whether the halt
changes the benefit–risk balance, and urgent safety measures. Probe: docs/eu_register_probe_2026-11-23.md.

It proposes, never labels. A trial goes to review when CTIS records anything beyond the default
"Sponsor Decision": the category differs between member states, and the benefit–risk flag on a halt
is set for reasons that are not about the drug, so a person (or an AI-assisted review) decides.
The queue holds the categories and flags (facts recorded by the regulator's system), never the
sponsor's justification text; --show prints that for the reviewer.

  python scripts/sources/ctis_stop_evidence.py --weekly --out <dir> [--max-seconds 1200]
  python scripts/sources/ctis_stop_evidence.py --show NCT...

Ledger data/ctis_searched.csv; queue data/ctis_pending_review.json; decisions
data/ctis_evidence_decisions.csv (accepted) and data/ctis_evidence_rejected.csv. docs/ctis_weekly.md.
"""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "scripts" / "sources"))
import classification_v2 as clf  # noqa: E402
from pub_stop_evidence import _get  # noqa: E402  (cached under .cache/pub, retries, User-Agent)

CTGOV = "https://clinicaltrials.gov/api/v2/studies/{nct}"
CTIS = "https://euclinicaltrials.eu/ctis-public-api/retrieve/{ct}"
CTIS_PAGE = "https://euclinicaltrials.eu/ctis-public/view/{ct}"
CT_NUMBER = re.compile(r"\b20\d{2}-5\d{5}-\d{2}-\d{2}\b")
NO_CAUSE = {"CAUSE_NOT_STATED", "UNRESOLVED"}
DEFAULT = {"sponsor decision"}
LEDGER = ROOT / "data/ctis_searched.csv"
LEDGER_FIELDS = ["nct_id", "text_hash", "searched_on", "ctis_id", "ctis_status", "categories"]
PENDING = ROOT / "data/ctis_pending_review.json"
DECISIONS = ROOT / "data/ctis_evidence_decisions.csv"
REJECTED = ROOT / "data/ctis_evidence_rejected.csv"
RECHECK_OPEN_DAYS = 28      # a CTIS trial that has not ended yet: its end notification may still come
RECHECK_UNLINKED_DAYS = 90  # a trial with no CTIS number: sponsors add secondary IDs late


def _csv_by_nct(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as handle:
        return {r["nct_id"].strip().upper(): r for r in csv.DictReader(handle) if r.get("nct_id")}


def stop_hash(why: str) -> str:
    return clf.text_hash(clf.normalize_reason(why))


def suggestion(categories: list[str]) -> dict:
    """The rules' reading of the CTIS categories: a suggestion for the reviewer, nothing more."""
    low = " ".join(categories).lower()
    if "safety" in low:
        return {"outcome": "BIOLOGICAL_FAILURE", "primary_reason": "SAFETY"}
    if "efficacy" in low:
        return {"outcome": "BIOLOGICAL_FAILURE", "primary_reason": "EFFICACY_FUTILITY"}
    if "reprioriti" in low:
        return {"outcome": "NON_BIOLOGICAL", "primary_reason": "BUSINESS_STRATEGY"}
    if "feasibility" in low or "recruit" in low:
        return {"outcome": "NON_BIOLOGICAL", "primary_reason": "RECRUITMENT"}
    return {"outcome": "UNKNOWN", "primary_reason": "UNSPECIFIED"}


def ctis_ids(nct: str) -> list[str]:
    body = _get(CTGOV.format(nct=nct), {"fields": "NCTId,IdentificationModule"}, kind="ctgov_ids", spacing=0.08)
    ident = ((json.loads(body) if body else {}).get("protocolSection") or {}).get("identificationModule") or {}
    return sorted({m.group(0) for i in ident.get("secondaryIdInfos") or [] for m in [CT_NUMBER.search(i.get("id") or "")] if m})


def ctis_record(ct: str, fresh: bool) -> dict:
    """The CTIS record. A trial that has not ended is fetched again on each due check (fresh)."""
    params = {"asof": date.today().isoformat()} if fresh else None  # a new cache key per day when fresh
    body = _get(CTIS.format(ct=ct), params, kind="ctis", spacing=0.3)
    return json.loads(body) if body else {}


def read_record(ct: str, rec: dict) -> dict:
    ev = rec.get("events") or {}
    terminations = [{"country": e.get("mscName"), "category": (e.get("earlyTerminationReason") or {}).get("name")}
                    for e in ev.get("trialEvents") or [] if e.get("earlyTerminationReason")]
    halts = [{"countries": [m.get("mscCountryName") for m in h.get("mscList") or []],
              "categories": [r.get("name") for r in h.get("reasonList") or []],
              "benefit_risk_changed": bool(h.get("isBenefitRiskBalanceChange")), "date": h.get("haltDate")}
             for h in ev.get("temporaryHaltList") or []]
    usm = len(ev.get("urgentSafetyMeasures") or [])
    cats = [t["category"] for t in terminations if t["category"]] + [c for h in halts for c in h["categories"] if c]
    informative = sorted({c for c in cats if c.lower() not in DEFAULT})
    flagged = any(h["benefit_risk_changed"] for h in halts) or usm > 0
    return {"ctis_id": ct, "status": rec.get("ctStatus"), "terminations": terminations, "halts": halts,
            "urgent_safety_measures": usm, "categories": informative, "benefit_risk_flag": flagged,
            "candidate": bool(informative) or flagged, "suggested": suggestion(informative),
            "url": CTIS_PAGE.format(ct=ct)}


def search(trial: dict, ledger_row: dict | None) -> tuple[list[dict], str]:
    try:
        ids = ctis_ids(trial["nct_id"])
        fresh = bool(ledger_row and ledger_row.get("ctis_status") and ledger_row["ctis_status"] != "Ended")
        return [read_record(ct, ctis_record(ct, fresh)) for ct in ids], ""
    except Exception as exc:  # one failed trial must not end the run; it is retried next week
        print(f"  {trial['nct_id']}: {exc}", file=sys.stderr)
        return [], str(exc)


def due_order(trials: list[dict], ledger: dict[str, dict], today: date) -> list[dict]:
    new, recheck = [], []
    two_years_ago = (today - timedelta(days=730)).isoformat()
    for t in trials:
        seen = ledger.get(t["nct_id"].upper())
        if seen is None or seen["text_hash"] != stop_hash(t["why_stopped"]):
            new.append(t)
            continue
        age = (today - date.fromisoformat(seen["searched_on"])).days
        if seen["ctis_id"] and seen["ctis_status"] != "Ended" and age >= RECHECK_OPEN_DAYS:
            recheck.append(t)
        elif not seen["ctis_id"] and age >= RECHECK_UNLINKED_DAYS and (t.get("last_update_post_date") or "") >= two_years_ago:
            recheck.append(t)
    new.sort(key=lambda t: -int(re.sub(r"\D", "", t.get("last_update_post_date") or "0") or 0))
    return new + recheck


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path)
    ap.add_argument("--weekly", action="store_true")
    ap.add_argument("--nct", nargs="*", default=[])
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--max-seconds", type=int, default=1200)
    ap.add_argument("--show", nargs="+", metavar="NCT")
    args = ap.parse_args()
    rows = list(csv.DictReader(open(ROOT / "data/all_stopped_trials.csv", encoding="utf-8")))
    by_id = {r["nct_id"]: r for r in rows}
    if args.show:
        for nct in args.show:
            t = by_id[nct]
            print(f"\n{nct} | {t['brief_title']} | {t['overall_status']} | registry: {t['why_stopped']!r}")
            for ct in ctis_ids(nct):
                rec = ctis_record(ct, fresh=True)
                r = read_record(ct, rec)
                print(f"  CTIS {ct} ({r['status']}) {r['url']}")
                for x in r["terminations"]:
                    print(f"    early termination, {x['country']}: {x['category']}")
                for h, raw in zip(r["halts"], (rec.get("events") or {}).get("temporaryHaltList") or []):
                    print(f"    halt {h['date']} {h['countries']}: {h['categories']}, benefit-risk changed: "
                          f"{h['benefit_risk_changed']}\n      sponsor: {(raw.get('sponsorJustificationComment') or '')[:600]}")
                if r["urgent_safety_measures"]:
                    print(f"    urgent safety measures: {r['urgent_safety_measures']}")
        return 0
    if args.out is None or not args.weekly:
        ap.error("use --weekly --out <dir>, or --show")
    today = date.today()
    ledger = _csv_by_nct(LEDGER)
    trials = [r for r in rows if r["classification_final_outcome"] in NO_CAUSE and (not args.nct or r["nct_id"] in args.nct)]
    due = due_order(trials, ledger, today)
    deadline = time.time() + args.max_seconds
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        step = args.workers * 10
        for i in range(0, len(due), step):
            if time.time() > deadline:
                break
            chunk = due[i:i + step]
            results += list(zip(chunk, pool.map(lambda t: search(t, ledger.get(t["nct_id"].upper())), chunk)))
    stats = Counter()
    decided = set(_csv_by_nct(DECISIONS)) | set(_csv_by_nct(REJECTED))
    pending = {t["nct_id"].upper(): t for t in (json.loads(PENDING.read_text())["trials"] if PENDING.exists() else [])}
    new = []
    for t, (recs, err) in results:
        stats["searched"] += 1
        if err:
            stats["errors"] += 1
            continue
        stats["linked"] += bool(recs)
        key = t["nct_id"].upper()
        ledger[key] = {"nct_id": t["nct_id"], "text_hash": stop_hash(t["why_stopped"]), "searched_on": today.isoformat(),
                       "ctis_id": ";".join(r["ctis_id"] for r in recs),
                       "ctis_status": ";".join(r["status"] or "" for r in recs),
                       "categories": "; ".join(sorted({c for r in recs for c in r["categories"]}))}
        cands = [r for r in recs if r["candidate"]]
        if cands and key not in decided:
            stats["candidates"] += 1
            if key not in pending:
                new.append(t["nct_id"])
            pending[key] = {"nct_id": t["nct_id"], "brief_title": t["brief_title"], "lead_sponsor": t["lead_sponsor"],
                            "why_stopped": t["why_stopped"],
                            "label_now": {"outcome": t["classification_final_outcome"],
                                          "primary_reason": t["classification_final_category"]},
                            "found_on": pending.get(key, {}).get("found_on", today.isoformat()), "ctis": cands}
    pending = {k: v for k, v in pending.items() if k not in decided}
    with LEDGER.open("w", encoding="utf-8", newline="") as handle:
        w = csv.DictWriter(handle, fieldnames=LEDGER_FIELDS, lineterminator="\n")
        w.writeheader()
        w.writerows(sorted(ledger.values(), key=lambda x: x["nct_id"]))
    PENDING.write_text(json.dumps({"updated": today.isoformat(), "pending": len(pending),
                                   "trials": sorted(pending.values(), key=lambda t: (t["found_on"], t["nct_id"]))},
                                  indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [f"CTIS search {today.isoformat()}: {stats['searched']} trials checked ({len(due) - len(results)} still due), "
             f"{stats['linked']} with a CTIS number, {len(new)} new for review, {len(pending)} waiting in total "
             f"(data/ctis_pending_review.json); {stats['errors']} errors, retried next week."]
    for nct in new:
        p = pending[nct.upper()]
        c = p["ctis"][0]
        lines.append(f"- {nct} ({p['lead_sponsor']}): CTIS {c['ctis_id']}: {', '.join(c['categories']) or 'benefit-risk flag'}; "
                     f"suggested {c['suggested']['outcome']}/{c['suggested']['primary_reason']}")
    if pending:
        lines.append("\nTo review: open a Claude Code session on the repository and ask it to review the pending CTIS "
                     "records (docs/ctis_weekly.md). Nothing changes a label before that review.")
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "summary.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    (args.out / "new_count").write_text(str(len(new)), encoding="utf-8")
    print("\n".join(lines), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
