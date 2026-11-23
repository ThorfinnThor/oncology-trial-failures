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
NON_RESULT_TYPES = re.compile(r"review|meta-analysis|systematic|editorial|comment|letter", re.I)

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
    xml = _get(f"{EPMC}/{pmcid}/fullTextXML", kind="fulltext")
    if not xml:
        return ""
    try:
        root = ElementTree.fromstring(xml)
    except ElementTree.ParseError:
        return ""
    body = root.find(".//body")
    return " ".join(" ".join(p.itertext()) for p in (body.iter("p") if body is not None else []))


def papers_for(nct: str) -> list[dict]:
    """The trial's own papers, each with how it is linked and its abstract (and OA full text)."""
    papers: dict[str, dict] = {}
    for ref in registry_refs(nct):
        for p in epmc_search(f"EXT_ID:{ref['pmid']} AND SRC:MED", 1):
            papers[p["id"]] = {**p, "link": f"registry_{ref['link'].lower()}"}
    for p in epmc_search(f'"{nct}"'):
        if p.get("id") in papers or nct.lower() not in (p.get("abstractText") or "").lower():
            continue
        types = " ".join((p.get("pubTypeList") or {}).get("pubType") or [])
        if NON_RESULT_TYPES.search(types):
            continue
        papers[p["id"]] = {**p, "link": "nct_in_abstract"}
    return list(papers.values())


def sentences_for(trial: dict) -> list[dict]:
    nct = trial["nct_id"]
    found = []
    for p in papers_for(nct):
        texts = [("abstract", re.sub(r"<[^>]+>", " ", p.get("abstractText") or ""))]
        if p.get("pmcid") and p.get("isOpenAccess") == "Y":
            texts.append(("full_text", full_text(p["pmcid"])))
        for where, text in texts:
            for s in SPLIT.split(" ".join(text.split())):
                if len(s) > 900 or not TRIAL_STOP.search(s) or (PATIENT_STOP.search(s) and not WHOLE_TRIAL.search(s)):
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


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--sample", type=int, default=100, help="random no-cause trials to probe (0 = all)")
    ap.add_argument("--seed", type=int, default=20261123)
    ap.add_argument("--nct", nargs="*", default=[])
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()
    rows = list(csv.DictReader(open(ROOT / "data/all_stopped_trials.csv", encoding="utf-8")))
    trials = [r for r in rows if r["classification_final_outcome"] in NO_CAUSE and (not args.nct or r["nct_id"] in args.nct)]
    if args.sample and not args.nct:
        trials = random.Random(args.seed).sample(trials, min(args.sample, len(trials)))
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        results = list(pool.map(lambda t: (t, _safe(t)), trials))
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
    (args.out / "summary.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines), file=sys.stderr)
    return 0


def _safe(trial: dict) -> tuple[list[dict], int, str]:
    try:
        n = len(papers_for(trial["nct_id"]))
        return (sentences_for(trial) if n else []), n, ""
    except Exception as exc:  # one failed trial must not end the probe
        print(f"  {trial['nct_id']}: {exc}", file=sys.stderr)
        return [], 0, str(exc)


if __name__ == "__main__":
    raise SystemExit(main())
