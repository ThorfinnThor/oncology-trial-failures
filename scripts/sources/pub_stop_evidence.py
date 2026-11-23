#!/usr/bin/env python3
"""Find what a trial's own publication says about why it stopped, for trials whose registry stop
reason names no cause (CAUSE_NOT_STATED / UNRESOLVED).

Which papers count as the trial's own:
  * the references ClinicalTrials.gov lists for the trial with type RESULT (the sponsor's results
    paper) or DERIVED (PubMed lists this NCT ID as the paper's trial registration);
  * papers found in Europe PMC whose abstract names the NCT ID, unless they are reviews or
    meta-analyses (which name many trials).
A paper's sentence counts only if it says that the trial (study, accrual, enrolment) was stopped,
closed or terminated; sentences about patients discontinuing treatment are not about the trial.
The rules' reading of the sentence is attached as a suggestion and ranks it, but does not filter:
the reviewer decides the cause. Like the SEC search it proposes, never labels.

Rights (docs/provenance_and_rights.md): abstracts and full texts are read here and shown to the
reviewer, but no paper text goes into an export or onto a page; a decision carries the PMID/PMCID
and the label only.

  python scripts/sources/pub_stop_evidence.py --out <dir> --sample 100 [--seed N] [--nct NCT...]
  python scripts/sources/pub_stop_evidence.py --weekly --out <dir> [--max-seconds 2700]
  python scripts/sources/pub_stop_evidence.py --show NCT...        (the sentences, for the reviewer)

--weekly searches what is due within a time budget: a no-cause trial not yet in the ledger
data/pub_searched.csv or whose stop text changed (terminated and suspended trials first, the most
recently updated first), and trials searched more than 180 days ago whose registry entry changed in
the last four years (papers come years after a stop). Trials with a sentence wait in
data/pub_pending_review.json until a decision lands in data/pub_evidence_decisions.csv (accepted) or
data/pub_evidence_rejected.csv. The pending file holds PMIDs, where the sentence is and the rules'
suggestion, never the paper's words (public repository); --show prints the sentences from the
papers for the review. docs/pub_weekly.md says how to review.

Writes <dir>/pub_evidence.json and <dir>/summary.txt. Cached under .cache/pub/.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import random
import re
import sys
import threading
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from datetime import date, timedelta
from typing import Optional
from xml.etree import ElementTree

import requests

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
import classification_v2 as clf  # noqa: E402

CACHE = ROOT / ".cache" / "pub"
UA = "ClinicalTrialFailures research contact@clinicaltrialfailures.com"
CTGOV = "https://clinicaltrials.gov/api/v2/studies/{nct}"
EPMC = "https://www.ebi.ac.uk/europepmc/webservices/rest"
NO_CAUSE = {"CAUSE_NOT_STATED", "UNRESOLVED"}
SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z(\[])")
NCT = re.compile(r"\bNCT\d{8}\b", re.I)
# The trial itself stopping: "the trial was terminated", "accrual was closed early", "closed
# prematurely", "stopped early for futility", "enrolment was halted".
TRIAL_STOP = re.compile(
    r"\b(trial|study|accrual|enrol(?:l)?ment|recruitment|randomi[sz]ation)\b[^.;]{0,90}?\b("
    r"terminat\w*|clos(?:ed|ure)|stopp(?:ed|ing)|halt\w*|suspend\w*|discontinu\w*|ended)\b"
    r"|\b(terminat\w*|clos(?:ed|ure)|stopp(?:ed|ing)|halt\w*|ended)\b[^.;]{0,25}\b(early|prematurely|before)\b"
    r"|\bearly (termination|closure|stopping)\b", re.I)
# A patient leaving ("one patient ... was discontinued from the study") is not the trial stopping.
PATIENT_STOP = re.compile(r"\b(patients?|participants?|subjects?)\b[^.;]{0,80}\b(discontinu\w*|withdr[ae]w\w*)"
                          r"|\b(discontinued|withdrawn|removed) from (?:the )?(?:study|trial)\b", re.I)
WHOLE_TRIAL = re.compile(r"\b(the|this|our) (trial|study)\b[^.;]{0,60}\b(terminat|stopp|halt|clos|discontinu|suspend)", re.I)
# Sentences that use the words without saying the trial stopped (review of 23 Nov 2026: 6 of 9 hits):
# a time point ("until study termination"), a participant's drugs being stopped, a rate of patients
# discontinuing, protocol rules and plans ("should", "will", "must"), animal experiments.
NOT_TRIAL_STOP = re.compile(
    r"\b(?:until|at|before|after|by) (?:the )?(?:time of (?:the )?)?(?:study|trial) (?:termination|completion|end|closure)\b"
    r"|\bdue to (?:the )?(?:early )?(?:study|trial) closure\b|\b(?:primary |main )?reasons? for (?:study )?discontinuation\b"
    r"|\bled to (?:study )?discontinuation\b|\bparticipants? (?:who )?discontinued the (?:trial|study)\b"
    r"|\bearly[- ]termination visit\b|\bstudy (?:drug|treatment)s? (?:(?:was|were|will be|is|are) )?(?:permanently )?discontinu"
    r"|\b(?:drug|treatment) discontinuation\b|\bresult(?:ing|ed)? in (?:study )?(?:drug )?discontinuation\b"
    r"|\brates? of (?:study )?discontinuation\b|\b(?:mice|mouse|murine|rats?|xenografts?)\b"
    r"|\b(?:should|could|would|might|must|will|can) (?:\w+ )?(?:pause|lead|be|result|stop|terminat|discontinu)"
    r"|\bwill (?:occur|take place)\b|\bunscheduled visits?\b"
    r"|\bto allow (?:for )?(?:early )?(?:discontinuation|stopping|termination)\b|\b(?:designed|devised) (?:to|a)\b"
    r"|\bif (?:they|it|there|the|a|any)\b", re.I)
NON_RESULT_TYPES = re.compile(r"review|meta-analysis|systematic|editorial|comment|letter|protocol", re.I)

_rate = threading.Lock()
_last = [0.0]


def _get(url: str, params: Optional[dict] = None, kind: str = "doc", spacing: float = 0.2) -> str:
    key = hashlib.sha256((url + json.dumps(params or {}, sort_keys=True)).encode()).hexdigest()[:32]
    path = CACHE / kind / f"{key}.txt.gz"
    if path.exists():
        return gzip.decompress(path.read_bytes()).decode("utf-8")
    err: Exception = RuntimeError("no attempt")
    for attempt in range(5):
        with _rate:
            wait = spacing - (time.time() - _last[0])
            if wait > 0:
                time.sleep(wait)
            _last[0] = time.time()
        try:
            r = requests.get(url, params=params, timeout=40, headers={"User-Agent": UA})
            if r.status_code == 200:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(gzip.compress(r.text.encode("utf-8")))
                return r.text
            if r.status_code == 404:
                return ""
            err = RuntimeError(f"HTTP {r.status_code}")
        except requests.RequestException as exc:
            err = exc
        time.sleep(2 * (attempt + 1))
    raise err


def registry_refs(nct: str) -> list[dict]:
    body = _get(CTGOV.format(nct=nct), {"fields": "NCTId,ReferencesModule"}, kind="ctgov")
    refs = (((json.loads(body) if body else {}).get("protocolSection") or {}).get("referencesModule") or {}).get("references") or []
    return [{"pmid": r["pmid"], "link": r.get("type")} for r in refs if r.get("pmid") and r.get("type") in ("RESULT", "DERIVED")]


def epmc_search(query: str, page_size: int = 25) -> list[dict]:
    body = _get(f"{EPMC}/search", {"query": query, "format": "json", "resultType": "core", "pageSize": page_size},
                kind="epmc")
    return ((json.loads(body) if body else {}).get("resultList") or {}).get("result") or []


def full_text(pmcid: str) -> str:
    """The open-access body text, or "" when it cannot be fetched: the abstract is still read, so an
    outage of the full-text service costs a passage, not the whole trial."""
    try:
        xml = _get(f"{EPMC}/{pmcid}/fullTextXML", kind="fulltext")
    except Exception as exc:
        print(f"  full text {pmcid} not fetched: {exc}", file=sys.stderr)
        return ""
    if not xml:
        return ""
    try:
        root = ElementTree.fromstring(xml)
    except ElementTree.ParseError:
        return ""
    body = root.find(".//body")
    return " ".join(" ".join(p.itertext()) for p in (body.iter("p") if body is not None else []))


def papers_for(nct: str, search_text: bool = True) -> list[dict]:
    """The trial's own papers, each with how it is linked and its abstract (and OA full text).
    search_text=False looks only at the registry's own references (fast; used for withdrawn trials,
    which never enrolled and almost never have a paper)."""
    papers: dict[str, dict] = {}
    for ref in registry_refs(nct):
        for p in epmc_search(f"EXT_ID:{ref['pmid']} AND SRC:MED", 1):
            types = " ".join((p.get("pubTypeList") or {}).get("pubType") or [])
            if re.search(r"protocol", types + " " + (p.get("title") or ""), re.I):
                continue  # a protocol paper describes the stopping rules, not the stop
            papers[p["id"]] = {**p, "link": f"registry_{ref['link'].lower()}"}
    for p in (epmc_search(f'"{nct}"') if search_text else []):
        if p.get("id") in papers or nct.lower() not in (p.get("abstractText") or "").lower():
            continue
        types = " ".join((p.get("pubTypeList") or {}).get("pubType") or [])
        if NON_RESULT_TYPES.search(types):
            continue
        papers[p["id"]] = {**p, "link": "nct_in_abstract"}
    return list(papers.values())


def sentences_for(trial: dict, papers: Optional[list[dict]] = None) -> list[dict]:
    nct = trial["nct_id"]
    found = []
    for p in (papers_for(nct) if papers is None else papers):
        texts = [("abstract", re.sub(r"<[^>]+>", " ", p.get("abstractText") or ""))]
        if p.get("pmcid") and p.get("isOpenAccess") == "Y":
            texts.append(("full_text", full_text(p["pmcid"])))
        for where, text in texts:
            for s in SPLIT.split(" ".join(text.split())):
                if len(s) > 900 or not TRIAL_STOP.search(s) or NOT_TRIAL_STOP.search(s) \
                        or (PATIENT_STOP.search(s) and not WHOLE_TRIAL.search(s)):
                    continue
                if {m.lower() for m in NCT.findall(s)} - {nct.lower()}:
                    continue  # another trial
                # The rules' reading is a suggestion for the reviewer, not a filter: a sentence the rules
                # cannot read ("halted early because of rejection in the treatment groups") is still the
                # paper saying why. It only ranks lower.
                verdict = clf.classify_reason_v2(s)
                read = verdict.outcome not in ("UNKNOWN", "CAUSE_NOT_STATED", "UNRESOLVED")
                score = {"registry_result": 3, "registry_derived": 2, "nct_in_abstract": 2}[p["link"]] + \
                    (where == "abstract") + 2 * read
                found.append({"pmid": p.get("pmid"), "pmcid": p.get("pmcid"), "doi": p.get("doi"), "title": p.get("title"),
                              "journal": (p.get("journalInfo") or {}).get("journal", {}).get("title"),
                              "year": p.get("pubYear"), "link": p["link"], "where": where, "sentence": s, "score": score,
                              "suggested": {"outcome": verdict.outcome, "primary_reason": verdict.primary_reason,
                                            "secondary_reasons": list(verdict.secondary_reasons)}})
    best: dict[str, dict] = {}
    for f in sorted(found, key=lambda f: -f["score"]):
        best.setdefault(f["sentence"].lower()[:200], f)
    return sorted(best.values(), key=lambda f: -f["score"])[:3]


LEDGER = ROOT / "data/pub_searched.csv"
LEDGER_FIELDS = ["nct_id", "text_hash", "searched_on", "papers", "best_score"]
PENDING = ROOT / "data/pub_pending_review.json"
DECISIONS = ROOT / "data/pub_evidence_decisions.csv"
REJECTED = ROOT / "data/pub_evidence_rejected.csv"
RECHECK_DAYS = 180


def _csv_by_nct(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8", newline="") as handle:
        return {r["nct_id"].strip().upper(): r for r in csv.DictReader(handle) if r.get("nct_id")}


def stop_hash(why: str) -> str:
    return clf.text_hash(clf.normalize_reason(why))


def due_order(trials: list[dict], ledger: dict[str, dict], today: date) -> list[dict]:
    """What a weekly run should search, most useful first: never searched (terminated and
    suspended before withdrawn, recently updated first), then rechecks."""
    new, recheck = [], []
    four_years_ago = (today - timedelta(days=4 * 365)).isoformat()
    for t in trials:
        seen = ledger.get(t["nct_id"].upper())
        if seen is None or seen["text_hash"] != stop_hash(t["why_stopped"]):
            new.append(t)
        elif (today - date.fromisoformat(seen["searched_on"])).days >= RECHECK_DAYS \
                and (t.get("last_update_post_date") or "") >= four_years_ago:
            recheck.append(t)
    new.sort(key=lambda t: (t["overall_status"] == "WITHDRAWN", -int(re.sub(r"\D", "", t.get("last_update_post_date") or "0") or 0)))
    return new + recheck


def pending_entry(t: dict, ps: list[dict], found_on: str) -> dict:
    """A trial waiting for review, without the paper's words."""
    return {"nct_id": t["nct_id"], "brief_title": t["brief_title"], "lead_sponsor": t["lead_sponsor"],
            "why_stopped": t["why_stopped"], "label_now": t["label_now"], "found_on": found_on,
            "passages": [{"pmid": p["pmid"], "pmcid": p["pmcid"], "doi": p["doi"], "journal": p["journal"],
                          "year": p["year"], "link": p["link"], "where": p["where"], "score": p["score"],
                          "suggested": p["suggested"]} for p in ps]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path)
    ap.add_argument("--sample", type=int, default=100, help="random no-cause trials to probe (0 = all)")
    ap.add_argument("--seed", type=int, default=20261123)
    ap.add_argument("--nct", nargs="*", default=[])
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--weekly", action="store_true", help="search what is due, update the ledger and the review queue")
    ap.add_argument("--max-seconds", type=int, default=2700, help="time budget of a weekly run")
    ap.add_argument("--show", nargs="+", metavar="NCT", help="print the sentences of these trials' papers")
    ap.add_argument("--merge-from", type=Path, metavar="DIR",
                    help="merge a ledger and review queue saved in DIR into the current ones (backlog runs)")
    args = ap.parse_args()
    if args.merge_from:
        return merge_from(args.merge_from)
    rows = list(csv.DictReader(open(ROOT / "data/all_stopped_trials.csv", encoding="utf-8")))
    by_id = {r["nct_id"]: r for r in rows}
    if args.show:
        for nct in args.show:
            t = by_id[nct]
            print(f"\n{nct} | {t['brief_title']} | {t['overall_status']} | registry: {t['why_stopped']!r}")
            try:
                found = sentences_for(t, papers_for(nct, search_text=t["overall_status"] != "WITHDRAWN"))
            except Exception as exc:
                print(f"  not fetched: {exc}")
                continue
            for p in found:
                print(f"  PMID {p['pmid']} ({p['journal']} {p['year']}, {p['link']}, {p['where']}), rules: "
                      f"{p['suggested']['outcome']}/{p['suggested']['primary_reason']}\n    {p['sentence']}")
        return 0
    if args.out is None:
        ap.error("--out is required")
    today = date.today()
    trials = [r for r in rows if r["classification_final_outcome"] in NO_CAUSE and (not args.nct or r["nct_id"] in args.nct)]
    ledger = _csv_by_nct(LEDGER) if args.weekly else {}
    if args.weekly:
        trials = due_order(trials, ledger, today)
    elif args.sample and not args.nct:
        trials = random.Random(args.seed).sample(trials, min(args.sample, len(trials)))
    deadline = time.time() + args.max_seconds if args.weekly else float("inf")
    results = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        step = args.workers * 4
        for i in range(0, len(trials), step):
            if time.time() > deadline:
                break
            chunk = trials[i:i + step]
            results += list(zip(chunk, pool.map(_safe, chunk)))
    out, stats = [], Counter()
    for t, (ps, n_papers, err) in results:
        stats["searched"] += 1
        stats["with_paper"] += n_papers > 0
        stats["errors"] += bool(err)
        if ps:
            stats["with_sentence"] += 1
            stats["suggested_" + ps[0]["suggested"]["outcome"]] += 1
            stats["rules_read_a_cause"] += ps[0]["suggested"]["outcome"] not in ("UNKNOWN", "CAUSE_NOT_STATED", "UNRESOLVED")
            out.append({"nct_id": t["nct_id"], "brief_title": t["brief_title"], "lead_sponsor": t["lead_sponsor"],
                        "why_stopped": t["why_stopped"], "overall_status": t["overall_status"], "phases": t["phases"],
                        "conditions": t["conditions"], "intervention_names": t["intervention_names"],
                        "registry_url": t["url"], "label_now": {"outcome": t["classification_final_outcome"],
                                                                 "primary_reason": t["classification_final_category"]},
                        "papers_found": n_papers, "passages": ps})
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "pub_evidence.json").write_text(json.dumps({"stats": dict(stats), "trials": out}, indent=1,
                                                           ensure_ascii=False) + "\n", encoding="utf-8")
    lines = [f"{k}: {v}" for k, v in sorted(stats.items())]
    if args.weekly:
        lines = update_weekly(results, out, ledger, today, len(trials), args.out) + lines
    (args.out / "summary.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines), file=sys.stderr)
    return 0


def merge_from(src: Path) -> int:
    """Fold another run's ledger and queue into the current files: per trial the later search wins,
    and nothing already decided stays in the queue. Lets the backlog workflow commit on top of
    whatever the weekly run committed meanwhile."""
    ledger = _csv_by_nct(LEDGER)
    for key, row in _csv_by_nct(src / LEDGER.name).items():
        if key not in ledger or row["searched_on"] >= ledger[key]["searched_on"]:
            ledger[key] = row
    with LEDGER.open("w", encoding="utf-8", newline="") as handle:
        w = csv.DictWriter(handle, fieldnames=LEDGER_FIELDS, lineterminator="\n")
        w.writeheader()
        w.writerows(sorted(ledger.values(), key=lambda x: x["nct_id"]))
    decided = set(_csv_by_nct(DECISIONS)) | set(_csv_by_nct(REJECTED))
    pending: dict[str, dict] = {}
    for path in (PENDING, src / PENDING.name):
        if path.exists():
            for t in json.loads(path.read_text())["trials"]:
                pending.setdefault(t["nct_id"].upper(), t)
    pending = {k: v for k, v in pending.items() if k not in decided}
    PENDING.write_text(json.dumps({"updated": date.today().isoformat(), "pending": len(pending),
                                   "trials": sorted(pending.values(), key=lambda t: (t["found_on"], t["nct_id"]))},
                                  indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"merged: {len(ledger)} trials in the ledger, {len(pending)} waiting for review", file=sys.stderr)
    return 0


def update_weekly(results, out, ledger, today, due, out_dir: Path) -> list[str]:
    for t, (ps, n_papers, err) in results:
        if err:
            continue  # a failed search is retried next week
        ledger[t["nct_id"].upper()] = {"nct_id": t["nct_id"], "text_hash": stop_hash(t["why_stopped"]),
                                       "searched_on": today.isoformat(), "papers": str(n_papers),
                                       "best_score": str(ps[0]["score"]) if ps else "0"}
    with LEDGER.open("w", encoding="utf-8", newline="") as handle:
        w = csv.DictWriter(handle, fieldnames=LEDGER_FIELDS, lineterminator="\n")
        w.writeheader()
        w.writerows(sorted(ledger.values(), key=lambda x: x["nct_id"]))
    decided = set(_csv_by_nct(DECISIONS)) | set(_csv_by_nct(REJECTED))
    pending = {t["nct_id"].upper(): t for t in (json.loads(PENDING.read_text())["trials"] if PENDING.exists() else [])}
    new = [t for t in out if t["nct_id"].upper() not in decided and t["nct_id"].upper() not in pending]
    for t in out:
        key = t["nct_id"].upper()
        if key not in decided:
            pending[key] = pending_entry(t, t["passages"], pending.get(key, {}).get("found_on", today.isoformat()))
    pending = {k: v for k, v in pending.items() if k not in decided}
    PENDING.write_text(json.dumps({"updated": today.isoformat(), "pending": len(pending),
                                   "trials": sorted(pending.values(), key=lambda t: (t["found_on"], t["nct_id"]))},
                                  indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    left = due - len(results)
    lines = [f"Publication search {today.isoformat()}: {len(results)} trials searched ({left} still due), "
             f"{len(out)} with a sentence about the stop, {len(new)} new for review, {len(pending)} waiting "
             "in total (data/pub_pending_review.json)."]
    for t in new:
        p = t["passages"][0]
        lines.append(f"- {t['nct_id']} ({t['lead_sponsor']}): PMID {p['pmid']} ({p['journal']} {p['year']}); "
                     f"rules read {p['suggested']['outcome']}/{p['suggested']['primary_reason']}")
    if pending:
        lines.append("\nTo review: open a Claude Code session on the repository and ask it to review the pending "
                     "publication passages (docs/pub_weekly.md). Nothing changes a label before that review.")
    (out_dir / "new_count").write_text(str(len(new)), encoding="utf-8")
    return lines


def _safe(trial: dict) -> tuple[list[dict], int, str]:
    try:
        papers = papers_for(trial["nct_id"], search_text=trial["overall_status"] != "WITHDRAWN")
        return (sentences_for(trial, papers) if papers else []), len(papers), ""
    except Exception as exc:  # one failed trial must not end the probe
        print(f"  {trial['nct_id']}: {exc}", file=sys.stderr)
        return [], 0, str(exc)


if __name__ == "__main__":
    raise SystemExit(main())
