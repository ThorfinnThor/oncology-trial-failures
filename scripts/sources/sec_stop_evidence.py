#!/usr/bin/env python3
"""Find what the sponsor told its investors about a trial whose registry stop reason names no cause.

For stopped trials labelled CAUSE_NOT_STATED or UNRESOLVED whose lead sponsor is an SEC registrant,
this searches the sponsor's own filings (8-K and its press-release exhibits, 10-Q, 10-K, 6-K, 20-F)
around the stop for a passage that (a) names the drug tested, (b) says it was stopped, close to the
drug's name, and (c) identifies this trial or indication (trial acronym, NCT ID or condition).

It proposes; it never labels. Every passage goes to review (tools/clinician-review, batch mode
"evidence") because a filing often speaks about a programme, another trial of the same drug, or
nothing more than costs. A probe of 150 trials on 22 Nov 2026 found an identity-matched passage
for 15 and a usable reason for about 6. CLAUDE.md applies: a word is not a claim (hypothetical
"may", "could" and cost sentences are dropped), and a filing passage is read with the same rules
and text_guards.denied() as a registry text.

  python scripts/sources/sec_stop_evidence.py --out <dir> [--limit N] [--nct NCT...]

Writes <dir>/sec_evidence.json (one entry per trial with passages, ranked). Cached under
.cache/sec/ so reruns only fetch what is new. EDGAR asks for a descriptive User-Agent with a
contact address and at most 10 requests a second; this stays near 6.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import html
import json
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import requests

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
import classification_v2 as clf  # noqa: E402
from scripts.signals.external_sources import sec_issuer  # noqa: E402

CACHE = ROOT / ".cache" / "sec"
UA = "ClinicalTrialFailures research contact@clinicaltrialfailures.com"
FTS = "https://efts.sec.gov/LATEST/search-index"
FORMS = "8-K,10-Q,10-K,6-K,20-F"
NO_CAUSE = {"CAUSE_NOT_STATED", "UNRESOLVED"}

# Words that make an intervention name useless as a search term.
GENERIC = re.compile(r"\b(placebo|saline|standard of care|best supportive care|observation|vehicle|"
                     r"lymphodepletion|investigator'?s choice|usual care)\b", re.I)
DOSE = re.compile(r"\b(\d+(\.\d+)?\s*(mg|mcg|µg|g|ml|mg/kg|iu)|oral|tablets?|capsules?|injection|injectable|"
                  r"infusion|nasal spray|monotherapy|combination|emulsion|subcutaneous|intravenous|iv|sc)\b", re.I)
STOP = re.compile(r"\b(discontinu\w*|terminat\w*|halt\w*|stopp(?:ed|ing)|suspend\w*|futil\w*|did not meet|"
                  r"failed to (?:meet|show|demonstrate|achieve)|wind(?:ing)? down|deprioriti[sz]\w*|"
                  r"close[sd]? (?:enrol|recruit)\w*|no longer (?:pursu|develop)\w*)\b", re.I)
# A sentence about what might happen, or about money, is not a report that something was stopped.
HYPOTHETICAL = re.compile(r"\b(may|might|could|would|if|should|risks?|uncertain\w*|no assurance|cannot assure|"
                          r"there can be no)\b", re.I)
MONEY = re.compile(r"\b(expenses?|costs?|impairment|revenues?|reimbursement|accru\w*|charges?|write-?off)\b", re.I)
AE_DISCONTINUATION = re.compile(r"\b(no (?:treatment[- ]related |drug[- ]related )?discontinuations?|"
                                r"discontinuations? (?:due to|because of)|discontinued (?:treatment|study drug) due to)\b", re.I)
REASON_CUE = re.compile(r"\b(fail\w*|did not meet|futil\w*|efficacy|safety|toxicit\w*|adverse|death|"
                        r"benefit|risk|priorit\w*|strateg\w*|resources?|portfolio|commercial|business|"
                        r"enrol\w*|recruit\w*|funding|interim analysis|topline|top-line|results?)\b", re.I)
CASCADE = re.compile(r"\b(program(?:me)?|development|all (?:\w+ )?(?:studies|trials))\b[^.]{0,80}"
                     r"\b(discontinu\w*|terminat\w*|suspend\w*)\b|\bfollowing (?:the )?(?:outcome|results?)\b", re.I)
NCT = re.compile(r"\bNCT\d{8}\b", re.I)
COMMON_CAPS = {"PHASE", "STUDY", "TRIAL", "SAFETY", "EFFICACY", "WITH", "AND", "THE", "FOR", "FROM", "THAT", "THIS",
               "PATIENTS", "VERSUS", "COMBINATION", "OPEN", "LABEL", "MULTICENTER", "RANDOMIZED", "DOUBLE", "BLIND",
               "PLACEBO", "CONTROLLED", "EXTENSION", "TREATMENT", "THERAPY", "HEALTHY", "SUBJECTS", "PARTICIPANTS"}
COND_STOP = {"cancer", "disease", "disorder", "syndrome", "patients", "healthy", "volunteers", "carcinoma", "tumor",
             "tumors", "tumours", "neoplasms", "chronic", "acute", "advanced", "metastatic", "solid", "infection",
             "infections", "failure", "type", "adult", "adults", "children", "pediatric", "primary", "secondary",
             "cell", "cells", "small", "non-small", "study", "subjects", "positive", "negative", "stage", "high", "risk"}

_last = [0.0]
_rate = threading.Lock()


def _get(url: str, params: Optional[dict] = None, kind: str = "doc") -> str:
    """A search answer (JSON) or a filing's plain text. Filings are cached as gzipped text, not HTML:
    a 10-K is megabytes of markup."""
    key = hashlib.sha256((url + json.dumps(params or {}, sort_keys=True)).encode()).hexdigest()[:32]
    path = CACHE / kind / f"{key}.txt.gz"
    if path.exists():
        return gzip.decompress(path.read_bytes()).decode("utf-8")
    legacy = CACHE / kind / f"{key}.txt"
    if legacy.exists():
        body = legacy.read_text(encoding="utf-8")
        body = text_of(body) if kind == "doc" else body
        path.write_bytes(gzip.compress(body.encode("utf-8")))
        legacy.unlink()
        return body
    err: Exception = RuntimeError("no attempt")
    for attempt in range(4):
        with _rate:  # one request start every 0.13 s across threads: under EDGAR's 10 per second
            wait = 0.13 - (time.time() - _last[0])
            if wait > 0:
                time.sleep(wait)
            _last[0] = time.time()
        try:
            r = requests.get(url, params=params, timeout=40, headers={"User-Agent": UA})
            if r.status_code == 200:
                body = text_of(r.text) if kind == "doc" else r.text
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(gzip.compress(body.encode("utf-8")))
                return body
            err = RuntimeError(f"HTTP {r.status_code}")
        except requests.RequestException as exc:
            err = exc
        time.sleep(2 * (attempt + 1))
    raise err


def text_of(doc: str) -> str:
    doc = re.sub(r"(?is)<(script|style|head)[^>]*>.*?</\1>", " ", doc)
    doc = re.sub(r"(?s)<[^>]+>", " ", doc)
    text = html.unescape(doc).replace("\u2019", "'").replace("\u2018", "'")
    return re.sub(r"\s+", " ", text).strip()


def drug_terms(interventions: str) -> list[str]:
    """Searchable names of the drug tested: the first listed intervention (registries list the
    experimental drug first) with its aliases, plus research codes from the others. Comparators and
    backbone (paclitaxel, pembrolizumab next to a code) are not searched: a filing about them is about
    another trial (CLAUDE.md rule 8). No type prefixes, no doses."""
    out: list[str] = []
    for pos, raw in enumerate(interventions.split(";")):
        raw = re.sub(r"^\s*(drug|biological|device|genetic|other|procedure|radiation)\s*:\s*", "", raw, flags=re.I)
        if not raw.strip() or GENERIC.search(raw):
            continue
        # Research codes inside longer names ("KYV-101 anti-CD19 CAR-T cell therapy" -> KYV-101).
        codes = re.findall(r"\b(?:[A-Z]{2,}-\d{2,}[A-Z0-9-]*|[A-Z]{2,}\d{3,}[A-Z0-9-]*)\b", raw)
        if pos > 0 and out:
            parts = codes  # later interventions: research codes only
        else:
            parts = [raw] + re.findall(r"\(([^)]+)\)", raw) + codes
        for p in parts:
            p = re.sub(r"\([^)]*\)", " ", p)
            p = DOSE.sub(" ", p)
            p = re.sub(r"\s+", " ", p).strip(" ,-+/")
            if len(p) >= 4 and p.lower() not in {t.lower() for t in out} and len(p.split()) <= 4:
                out.append(p)
    # Research codes (with digits) first: they rarely mean anything else.
    out.sort(key=lambda t: (not re.search(r"\d", t), len(t)))
    return out[:4]


def identity_terms(title: str, conditions: str, nct: str) -> dict[str, set[str]]:
    strong = {w.lower() for w in re.findall(r"\b[A-Z][A-Z0-9-]{3,}\b", title or "") if w not in COMMON_CAPS
              and not re.search(r"\d{3,}", w)}  # acronyms such as EMBARK, EVOKE-03, not drug codes
    strong.add(nct.lower())
    weak = set()
    for cond in (conditions or "").split(";"):
        for w in re.findall(r"[A-Za-z][A-Za-z'-]{3,}", cond.replace("\u2019", "'")):
            w = re.sub(r"'s$", "", w.lower())
            if w not in COND_STOP and len(w) >= 4:
                weak.add(w)
    return {"strong": strong, "weak": weak}


def _near(sentence: str, term: str, limit: int = 160) -> bool:
    low = sentence.lower()
    drug_at = [m.start() for m in re.finditer(re.escape(term.lower()), low)]
    stop_at = [m.start() for m in STOP.finditer(sentence)]
    return any(abs(a - b) <= limit for a in drug_at for b in stop_at)


def passages_for(trial: dict, cik: str) -> list[dict]:
    drugs = drug_terms(trial["intervention_names"])
    anchor = (trial.get("last_update_post_date") or trial.get("primary_completion_date") or "")[:7]
    if not drugs or not re.fullmatch(r"\d{4}-\d{2}", anchor):
        return []
    a = date(int(anchor[:4]), int(anchor[5:7]), 1)
    start, end = a - timedelta(days=900), min(a + timedelta(days=270), date.today())
    ident = identity_terms(trial["brief_title"], trial["conditions"], trial["nct_id"])
    # A drug code in the trial's own title identifies a first-in-human or single-asset study weakly.
    ident["weak"] |= {d.lower() for d in drugs if re.search(r"\d", d) and d.lower() in (trial["brief_title"] or "").lower()}
    acronyms = sorted(t for t in ident["strong"] if not t.startswith("nct"))
    found: list[dict] = []
    seen_docs: set[str] = set()
    queries = [(d, f'"{d}" "{acr}"') for d in drugs[:2] for acr in acronyms[:1]] + [(d, f'"{d}"') for d in drugs]
    for d, q in queries:
        if found and '" "' not in q and any(p["identity_strong"] for p in found):
            continue  # the trial's acronym already led to it
        try:
            body = json.loads(_get(FTS, {"q": q, "ciks": cik, "forms": FORMS, "dateRange": "custom",
                                         "startdt": start.isoformat(), "enddt": end.isoformat()}, kind="search"))
        except Exception as exc:  # one failed search must not end the run
            print(f"  search failed {trial['nct_id']} {q!r}: {exc}", file=sys.stderr)
            continue
        hits = body.get("hits", {}).get("hits", [])
        # Press releases first: that is where a company says what it stopped and why.
        hits.sort(key=lambda h: (h["_source"].get("file_type") != "EX-99.1", h["_source"].get("form") not in ("8-K", "6-K"),
                                 -h.get("_score", 0)))
        for h in hits[:6]:
            src = h["_source"]
            adsh, fn = h["_id"].split(":")
            url = f"https://www.sec.gov/Archives/edgar/data/{int(src['ciks'][0])}/{adsh.replace('-', '')}/{fn}"
            if url in seen_docs:
                continue
            seen_docs.add(url)
            try:
                sents = re.split(r"(?<=[.!?])\s+(?=[A-Z“\"])", _get(url))
            except Exception:
                continue
            for i, s in enumerate(sents):
                if len(s) > 700 or d.lower() not in s.lower() or not STOP.search(s) or not _near(s, d):
                    continue
                if HYPOTHETICAL.search(s) or MONEY.search(s) or AE_DISCONTINUATION.search(s):
                    continue
                window = " ".join(sents[max(0, i - 1): i + 3])[:1400]
                low = window.lower()
                other_ncts = {m.lower() for m in NCT.findall(window)} - {trial["nct_id"].lower()}
                if other_ncts:
                    continue  # the passage names another trial
                strong = sorted(t for t in ident["strong"] if re.search(r"\b" + re.escape(t) + r"\b", low))
                weak = sorted(t for t in ident["weak"] if re.search(r"\b" + re.escape(t) + r"\b", low))
                if not strong and not weak:
                    continue
                verdict = clf.classify_reason_v2(window)
                score = 3 * bool(strong) + bool(weak) + 2 * bool(REASON_CUE.search(window)) + \
                    (src.get("file_type") == "EX-99.1") + (verdict.outcome not in ("UNKNOWN", "CAUSE_NOT_STATED"))
                found.append({
                    "form": src.get("form"), "file_type": src.get("file_type"), "filed": src.get("file_date"),
                    "url": url, "drug": d, "identity_strong": strong, "identity_weak": weak,
                    "sentence": s.strip(), "window": window.strip(), "score": score,
                    "programme_level": bool(CASCADE.search(window)),
                    "suggested": {"outcome": verdict.outcome, "primary_reason": verdict.primary_reason,
                                  "secondary_reasons": list(verdict.secondary_reasons)},
                })
    # One passage per sentence, best first.
    best: dict[str, dict] = {}
    for p in sorted(found, key=lambda p: -p["score"]):
        best.setdefault(p["sentence"].lower()[:200], p)
    return sorted(best.values(), key=lambda p: (-p["score"], p["filed"] or ""))[:3]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--nct", nargs="*", default=[])
    ap.add_argument("--min-score", type=int, default=4, help="drop trials whose best passage scores lower")
    ap.add_argument("--workers", type=int, default=6)
    args = ap.parse_args()
    rows = list(csv.DictReader(open(ROOT / "data/all_stopped_trials.csv", encoding="utf-8")))
    trials = [r for r in rows if r["classification_final_outcome"] in NO_CAUSE and (not args.nct or r["nct_id"] in args.nct)]
    issuers = {}
    cands = []
    for r in trials:
        name = r["lead_sponsor"]
        if name not in issuers:
            issuers[name] = sec_issuer(name)
        if issuers[name]:
            cands.append((r, issuers[name]))
    if args.limit:
        cands = cands[: args.limit]
    print(f"{len(trials)} no-cause trials, {len(cands)} with an SEC-registered sponsor", file=sys.stderr)
    out = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        found = list(pool.map(lambda pair: passages_for(pair[0], pair[1]["cik"]), cands))
    for n, ((r, iss), ps) in enumerate(zip(cands, found), 1):
        if ps and ps[0]["score"] >= args.min_score:
            out.append({"nct_id": r["nct_id"], "brief_title": r["brief_title"], "lead_sponsor": r["lead_sponsor"],
                        "ticker": iss["ticker"], "cik": iss["cik"], "why_stopped": r["why_stopped"],
                        "overall_status": r["overall_status"], "phases": r["phases"], "conditions": r["conditions"],
                        "intervention_names": r["intervention_names"], "registry_url": r["url"],
                        "label_now": {"outcome": r["classification_final_outcome"], "primary_reason": r["classification_final_category"]},
                        "passages": ps})
        if n % 25 == 0:
            print(f"  {n}/{len(cands)} searched, {len(out)} with evidence", file=sys.stderr)
    args.out.mkdir(parents=True, exist_ok=True)
    (args.out / "sec_evidence.json").write_text(json.dumps({"searched": len(cands), "with_evidence": len(out),
                                                             "generated": date.today().isoformat(), "trials": out},
                                                            indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(out)} of {len(cands)} trials have evidence; wrote {args.out / 'sec_evidence.json'}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
