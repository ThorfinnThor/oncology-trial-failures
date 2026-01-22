#!/usr/bin/env python3
"""
Fetch broad oncology trials (ClinicalTrials.gov API v2) that were SUSPENDED or TERMINATED,
then classify whyStopped reasons to focus on biological failure (efficacy/safety/futility)
and exclude operational failures (recruitment/funding/admin).

Hardening features:
- Clause-aware negation (prevents cross-clause negation bleed)
- Clause-based explicit denial flags (safety vs efficacy handled separately)
- Weighted phrase scoring (fixes short reasons like "Efficacy concerns." and "Insufficient efficacy.")
- Causal-cue scoring (due to/because of/futility/endpoint not met)
- Confidence + evidence columns for transparency
- Overrides from overrides.csv

Outputs:
- data/all_oncology_stopped_trials.csv
- data/biological_failure_oncology_trials.csv
- data/all_oncology_stopped_trials.json
- data/biological_failure_oncology_trials.json
"""

from __future__ import annotations

import csv
import json
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import requests


BASE_URL = "https://clinicaltrials.gov/api/v2/studies"

ONCOLOGY_TERMS = ["cancer", "neoplasm", "tumor", "malignancy", "oncology"]

MAX_STUDIES_TOTAL = int(os.getenv("MAX_STUDIES_TOTAL", "20000"))
LAST_UPDATE_FROM = os.getenv("LAST_UPDATE_FROM", "2015-01-01")
PAGE_SIZE = int(os.getenv("PAGE_SIZE", "100"))
SLEEP_SECONDS = float(os.getenv("SLEEP_SECONDS", "1.3"))
TIMEOUT = 60

OVERRIDES_PATH = os.getenv("OVERRIDES_PATH", "overrides.csv")


@dataclass(frozen=True)
class Classification:
    label: str          # BIOLOGICAL_FAILURE | NON_BIOLOGICAL | UNCLEAR
    reason: str         # SAFETY | EFFICACY/FUTILITY | OPERATIONAL | OTHER/UNKNOWN
    confidence: str     # HIGH | MEDIUM | LOW
    matched_evidence: str


def get_nested(d: Dict[str, Any], path: List[str], default=None):
    cur: Any = d
    for key in path:
        if not isinstance(cur, dict) or key not in cur:
            return default
        cur = cur[key]
    return cur


def normalize_text(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s).strip().lower()


# -----------------------------
# Keyword banks (expanded)
# -----------------------------

SAFETY_TERMS = [
    "safety",
    "safety concern", "safety concerns",
    "safety issue", "safety issues",
    "adverse event", "adverse events",
    "adverse effect", "adverse effects",
    "serious adverse",
    "sae", "saes",
    "toxicity", "toxic",
    "unacceptable toxicity",
    "dose limiting", "dlt", "dlts",
    "intolerable",
    "unacceptable risk",
    "risk/benefit", "risk benefit", "risk-benefit",
    "safety profile",
]

EFFICACY_TERMS = [
    "efficacy concern", "efficacy concerns",
    "lack of efficacy",
    "insufficient efficacy",
    "no efficacy",
    "ineffective",
    "no benefit",
    "no signal of activity",
    "no signal of efficacy",
    "no activity",
    "unmet primary endpoint",
    "unmet endpoint",
    "failed to meet",
    "did not meet",
    "primary endpoint",
    "endpoint not met",
    "end point not met",
    "end-point not met",
    "futility",
    "futile",
    "futility analysis",
    "interim analysis",
    "stopping for futility",
    "unmet primary",
    "unmet endpoint(s)",
]

OPERATIONAL_TERMS = [
    "recruit", "recruitment",
    "enrollment", "enrolment",
    "accrual",
    "insufficient accrual",
    "slow accrual", "low accrual", "poor accrual",
    "unable to enroll", "unable to enrol",

    "funding", "budget", "financial",
    "administrative", "logistical",
    "site closure", "staffing",
    "regulatory delay", "protocol deviation",

    "sponsor decision",
    "sponsor request", "per sponsor request", "at sponsor request",
    "sponsor-initiated", "sponsor initiated",
    "company decision", "business decision", "strategic decision",
    "strategic reasons",
    "portfolio prioritization", "prioritization decision",
    "commercial reasons",
    "external environment", "changes in the external environment",

    "development has been halted",
    "development was halted",
    "program halted",
    "programme halted",
    "development halted",
    "industrial development",
    "no longer pursuing",

    "covid", "pandemic",
]

# Weighted phrases: these should trigger BIO failure even when short.
# UPDATED: added "insufficient efficacy" and a few similar phrases so they pass the MEDIUM threshold.
EFFICACY_WEIGHTS: Dict[str, int] = {
    "efficacy concerns": 2,
    "efficacy concern": 2,

    "lack of efficacy": 3,
    "insufficient efficacy": 3,   # NEW FIX
    "no efficacy": 3,             # sensible
    "ineffective": 2,             # sensible
    "no benefit": 2,              # sensible

    "unmet primary endpoint": 3,
    "unmet endpoint": 2,

    "endpoint not met": 3,
    "did not meet": 3,
    "failed to meet": 3,

    "futility": 3,
    "futility analysis": 3,

    "no signal of activity": 3,
    "no signal of efficacy": 3,
    "no activity": 2,
}

SAFETY_WEIGHTS: Dict[str, int] = {
    "safety concerns": 2,
    "safety concern": 2,
    "safety issues": 2,
    "safety issue": 2,
    "adverse event": 2,
    "adverse events": 2,
    "adverse effect": 2,
    "adverse effects": 2,
    "serious adverse": 3,
    "toxicity": 2,
    "unacceptable toxicity": 3,
    "unacceptable risk": 3,
    "risk/benefit": 2,
    "risk benefit": 2,
    "risk-benefit": 2,
    "safety profile": 2,
}

CAUSAL_CUES = [
    r"\bdue to\b",
    r"\bbecause of\b",
    r"\bsecondary to\b",
    r"\bas a result of\b",
    r"\bresulting from\b",
    r"\bprompted by\b",
    r"\bdriven by\b",
    r"\brelated to\b",
]

NEGATION_CUES = [
    "no ",
    "not ",
    "without ",
    "none ",
    "neither ",
    "nor ",
    "not due to",
    "not because of",
    "not prompted by",
    "not related to",
    "not associated with",
    "not attributable to",
    "unrelated to",
    "not caused by",
]


# -----------------------------
# HTTP helpers
# -----------------------------

def request_with_retries(session: requests.Session, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    backoff = 2.0
    for _ in range(1, 7):
        resp = session.get(url, params=params, timeout=TIMEOUT)
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code in (429, 500, 502, 503, 504):
            time.sleep(backoff)
            backoff = min(backoff * 2.0, 60.0)
            continue
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:500]}")
    raise RuntimeError("Exceeded retries due to repeated throttling or server errors.")


def iter_studies_for_term(session: requests.Session, term: str) -> Iterable[Dict[str, Any]]:
    params: Dict[str, Any] = {
        "query.cond": term,
        "filter.overallStatus": "TERMINATED,SUSPENDED",
        "query.term": f"AREA[LastUpdatePostDate]RANGE[{LAST_UPDATE_FROM},MAX]",
        "sort": "LastUpdatePostDate:desc",
        "pageSize": str(PAGE_SIZE),
        "format": "json",
        "countTotal": "true",
    }

    page_token: Optional[str] = None
    while True:
        if page_token:
            params["pageToken"] = page_token
        else:
            params.pop("pageToken", None)

        data = request_with_retries(session, BASE_URL, params)
        for st in data.get("studies", []):
            yield st

        page_token = data.get("nextPageToken")
        if not page_token:
            break
        time.sleep(SLEEP_SECONDS)


# -----------------------------
# Clause-aware helpers
# -----------------------------

def _clause_start(text: str, idx: int) -> int:
    last_dot = text.rfind(".", 0, idx)
    last_semi = text.rfind(";", 0, idx)
    last_colon = text.rfind(":", 0, idx)
    start = max(last_dot, last_semi, last_colon)
    return 0 if start == -1 else start + 1


def _negated_near(text: str, idx: int, window: int = 50) -> bool:
    clause_start = _clause_start(text, idx)
    start = max(clause_start, idx - window)
    context = text[start:idx]
    return any(cue in context for cue in NEGATION_CUES)


def _term_positions(text: str, term: str) -> List[int]:
    positions = []
    start = 0
    while True:
        i = text.find(term, start)
        if i == -1:
            break
        positions.append(i)
        start = i + len(term)
    return positions


def _has_unnegated_term(text: str, term: str) -> bool:
    for idx in _term_positions(text, term):
        if not _negated_near(text, idx):
            return True
    return False


def _find_terms(text: str, terms: List[str]) -> List[str]:
    return [t for t in terms if t in text]


def _explicit_denial_flags(text: str) -> Tuple[bool, bool]:
    clauses = [c.strip() for c in re.split(r"[.;:]", text) if c.strip()]

    denies_safety = False
    denies_efficacy = False

    for clause in clauses:
        # Combined denial in same clause
        if ("not" in clause or "no " in clause or "without" in clause or "unrelated" in clause):
            if ("safety" in clause and "efficacy" in clause and ("concern" in clause or "signal" in clause)):
                denies_safety = True
                denies_efficacy = True

        # Safety denial cues
        if "safety" in clause or "risk benefit" in clause or "risk/benefit" in clause or "risk-benefit" in clause:
            if (("no " in clause and ("concern" in clause or "signal" in clause)) or
                ("without" in clause and "concern" in clause) or
                ("not due to" in clause) or
                ("not prompted by" in clause) or
                ("unrelated to" in clause)):
                denies_safety = True

            # Safety/risk-benefit unchanged => denial of safety causality
            if ("safety profile" in clause or "risk benefit" in clause or "risk/benefit" in clause or "risk-benefit" in clause):
                if ("unchanged" in clause or "remained unchanged" in clause or "no change" in clause):
                    denies_safety = True

        # Efficacy denial cues
        if "efficacy" in clause or "endpoint" in clause:
            if (("no " in clause and ("concern" in clause or "signal" in clause)) or
                ("without" in clause and "concern" in clause) or
                ("not due to" in clause) or
                ("not prompted by" in clause) or
                ("unrelated to" in clause)):
                denies_efficacy = True

    return denies_safety, denies_efficacy


def _causal_near(text: str, idx: int, window: int = 90) -> bool:
    clause_start = _clause_start(text, idx)
    start = max(clause_start, idx - window)
    end = min(len(text), idx + window)
    context = text[start:end]

    for cue_pat in CAUSAL_CUES:
        m = re.search(cue_pat, context)
        if not m:
            continue
        cue_start_global = start + m.start()
        if _negated_near(text, cue_start_global, window=25):
            continue
        return True
    return False


def _score_dimension(
    text: str,
    terms: List[str],
    denies_dim: bool,
    dim_name: str,
    weights: Dict[str, int],
) -> Tuple[int, List[str]]:
    score = 0
    evidence: List[str] = []

    if denies_dim:
        score -= 3
        evidence.append(f"{dim_name}:explicit_denial")

    for t in terms:
        if t not in text:
            continue
        weight = weights.get(t, 1)
        for idx in _term_positions(text, t):
            if _negated_near(text, idx):
                continue
            score += weight
            evidence.append(f"{dim_name}:term:{t}(w={weight})")
            if _causal_near(text, idx):
                score += 2
                evidence.append(f"{dim_name}:causal_near:{t}")

    if dim_name == "eff":
        if "primary endpoint" in text and ("not met" in text or "failed" in text or "did not meet" in text):
            if not denies_dim:
                score += 3
                evidence.append("eff:endpoint_not_met_phrase")

        if "futility" in text and not denies_dim and _has_unnegated_term(text, "futility"):
            score += 3
            evidence.append("eff:futility_phrase")

    return score, evidence


def classify_why_stopped(why_stopped: Optional[str]) -> Classification:
    txt = normalize_text(why_stopped)
    if not txt:
        return Classification("UNCLEAR", "OTHER/UNKNOWN", "LOW", "")

    denies_safety, denies_efficacy = _explicit_denial_flags(txt)

    operational_hits = _find_terms(txt, OPERATIONAL_TERMS)
    operational_present = len(operational_hits) > 0

    safety_score, safety_ev = _score_dimension(txt, SAFETY_TERMS, denies_safety, "saf", SAFETY_WEIGHTS)
    efficacy_score, efficacy_ev = _score_dimension(txt, EFFICACY_TERMS, denies_efficacy, "eff", EFFICACY_WEIGHTS)

    if operational_present:
        safety_score -= 1
        efficacy_score -= 1

    best_dim = "SAFETY" if safety_score >= efficacy_score else "EFFICACY/FUTILITY"
    best_score = max(safety_score, efficacy_score)
    best_ev = safety_ev if best_dim == "SAFETY" else efficacy_ev

    if operational_present and denies_safety and denies_efficacy:
        return Classification(
            "NON_BIOLOGICAL",
            "OPERATIONAL",
            "HIGH",
            "operational:" + "|".join(operational_hits) + ";denial:both"
        )

    if operational_present and denies_safety and best_dim == "SAFETY" and best_score < 5:
        return Classification(
            "NON_BIOLOGICAL",
            "OPERATIONAL",
            "HIGH",
            "operational:" + "|".join(operational_hits) + ";denial:safety"
        )

    # With weighted phrases, these thresholds behave well:
    # - HIGH >= 6
    # - MEDIUM >= 2 (no operational present)
    if best_score >= 6:
        return Classification(
            "BIOLOGICAL_FAILURE",
            best_dim,
            "HIGH",
            f"score={best_score};" + ",".join(best_ev[:14])
        )

    if best_score >= 2 and not operational_present:
        return Classification(
            "BIOLOGICAL_FAILURE",
            best_dim,
            "MEDIUM",
            f"score={best_score};" + ",".join(best_ev[:14])
        )

    if operational_present:
        return Classification(
            "NON_BIOLOGICAL",
            "OPERATIONAL",
            "HIGH",
            "operational:" + "|".join(operational_hits)
        )

    return Classification(
        "UNCLEAR",
        "OTHER/UNKNOWN",
        "LOW",
        f"safety_score={safety_score};efficacy_score={efficacy_score}"
    )


# -----------------------------
# Overrides
# -----------------------------

def load_overrides(path: str) -> Dict[str, Classification]:
    overrides: Dict[str, Classification] = {}
    if not os.path.exists(path):
        return overrides

    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            nct = (row.get("nct_id") or "").strip()
            if not nct:
                continue
            label = (row.get("override_label") or "").strip() or "UNCLEAR"
            reason = (row.get("override_reason") or "").strip() or "OTHER/UNKNOWN"
            conf = (row.get("override_confidence") or "").strip() or "LOW"
            notes = (row.get("notes") or "").strip()
            overrides[nct] = Classification(label, reason, conf, f"override:{notes}")
    return overrides


# -----------------------------
# Extraction & output
# -----------------------------

def extract_record(study: Dict[str, Any]) -> Dict[str, Any]:
    protocol = study.get("protocolSection", {}) or {}

    nct_id = get_nested(protocol, ["identificationModule", "nctId"], "")
    brief_title = get_nested(protocol, ["identificationModule", "briefTitle"], "") \
        or get_nested(protocol, ["identificationModule", "officialTitle"], "")

    overall_status = get_nested(protocol, ["statusModule", "overallStatus"], "")
    why_stopped = get_nested(protocol, ["statusModule", "whyStopped"], "")

    conditions = get_nested(protocol, ["conditionsModule", "conditions"], []) or []
    if not isinstance(conditions, list):
        conditions = []

    sponsor = get_nested(protocol, ["sponsorCollaboratorsModule", "leadSponsor", "name"], "")
    collaborators = get_nested(protocol, ["sponsorCollaboratorsModule", "collaborators"], []) or []
    collaborator_names = []
    if isinstance(collaborators, list):
        for c in collaborators:
            if isinstance(c, dict) and c.get("name"):
                collaborator_names.append(c["name"])

    study_type = get_nested(protocol, ["designModule", "studyType"], "")

    phases = get_nested(protocol, ["designModule", "phases"], []) or []
    if not isinstance(phases, list):
        phases = [phases] if phases else []

    interventions = get_nested(protocol, ["armsInterventionsModule", "interventions"], []) or []
    if not isinstance(interventions, list):
        interventions = []

    intervention_names: List[str] = []
    intervention_types: List[str] = []
    for intr in interventions:
        if not isinstance(intr, dict):
            continue
        name = intr.get("name")
        itype = intr.get("type")
        if name:
            intervention_names.append(str(name))
        if itype:
            intervention_types.append(str(itype))

    start_date = get_nested(protocol, ["statusModule", "startDateStruct", "date"], "")
    completion_date = get_nested(protocol, ["statusModule", "completionDateStruct", "date"], "")
    primary_completion_date = get_nested(protocol, ["statusModule", "primaryCompletionDateStruct", "date"], "")
    last_update = get_nested(protocol, ["statusModule", "lastUpdatePostDateStruct", "date"], "")

    url = f"https://clinicaltrials.gov/study/{nct_id}" if nct_id else ""

    cls = classify_why_stopped(why_stopped)

    return {
        "nct_id": nct_id,
        "brief_title": brief_title,
        "overall_status": overall_status,
        "why_stopped": why_stopped,

        "classification_label": cls.label,
        "classification_reason": cls.reason,
        "classification_confidence": cls.confidence,
        "classification_evidence": cls.matched_evidence,

        "study_type": study_type,
        "phases": "; ".join([p for p in phases if p]),
        "lead_sponsor": sponsor,
        "collaborators": "; ".join(collaborator_names),
        "conditions": "; ".join([c for c in conditions if c]),
        "intervention_names": "; ".join([n for n in intervention_names if n]),
        "intervention_types": "; ".join([t for t in intervention_types if t]),
        "start_date": start_date,
        "primary_completion_date": primary_completion_date,
        "completion_date": completion_date,
        "last_update_post_date": last_update,
        "url": url,
    }


def is_drug_or_biologic(record: Dict[str, Any]) -> bool:
    types = normalize_text(record.get("intervention_types"))
    return ("drug" in types) or ("biological" in types)


def is_interventional(record: Dict[str, Any]) -> bool:
    return normalize_text(record.get("study_type")) == "interventional"


def write_csv(path: str, rows: List[Dict[str, Any]]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not rows:
        with open(path, "w", newline="", encoding="utf-8") as f:
            f.write("")
        return
    fieldnames = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for r in rows:
            w.writerow(r)


def write_json(path: str, rows: List[Dict[str, Any]]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)


def main() -> None:
    overrides = load_overrides(OVERRIDES_PATH)

    session = requests.Session()
    seen: Set[str] = set()
    all_records: List[Dict[str, Any]] = []

    for term in ONCOLOGY_TERMS:
        for study in iter_studies_for_term(session, term):
            record = extract_record(study)
            nct = record.get("nct_id") or ""
            if not nct or nct in seen:
                continue
            seen.add(nct)

            if not is_interventional(record):
                continue
            if not is_drug_or_biologic(record):
                continue

            if nct in overrides:
                ov = overrides[nct]
                record["classification_label"] = ov.label
                record["classification_reason"] = ov.reason
                record["classification_confidence"] = ov.confidence
                record["classification_evidence"] = ov.matched_evidence

            all_records.append(record)

            if len(all_records) >= MAX_STUDIES_TOTAL:
                break

        if len(all_records) >= MAX_STUDIES_TOTAL:
            break

    all_records.sort(key=lambda r: r.get("last_update_post_date") or "", reverse=True)

    biological_only = [
        r for r in all_records
        if r.get("classification_label") == "BIOLOGICAL_FAILURE"
        and r.get("classification_confidence") in ("HIGH", "MEDIUM")
    ]

    write_csv("data/all_oncology_stopped_trials.csv", all_records)
    write_csv("data/biological_failure_oncology_trials.csv", biological_only)
    write_json("data/all_oncology_stopped_trials.json", all_records)
    write_json("data/biological_failure_oncology_trials.json", biological_only)

    print(f"Total interventional drug/biologic stopped oncology trials: {len(all_records)}")
    print(f"Biological failures (HIGH/MEDIUM): {len(biological_only)}")


if __name__ == "__main__":
    main()
