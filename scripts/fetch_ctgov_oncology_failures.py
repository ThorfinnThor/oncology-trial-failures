#!/usr/bin/env python3
"""
Fetch broad oncology trials (ClinicalTrials.gov API v2) that were SUSPENDED or TERMINATED,
then classify whyStopped reasons to focus on biological failure (efficacy/safety/futility)
and exclude operational failures (recruitment/funding/admin).

Hardening features:
- Separate denial detection for safety vs efficacy
- Causal-cue scoring (due to/because of/futility/endpoint not met)
- Confidence scoring + matched evidence for transparency
- Overrides from overrides.csv
- Golden tests (separate script) to prevent regressions

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
# Keyword banks (tune over time)
# -----------------------------

SAFETY_TERMS = [
    "safety", "adverse event", "adverse events", "serious adverse", "sae", "saes",
    "toxicity", "toxic", "dose limiting", "dlt", "dlts", "intolerable",
    "unacceptable risk", "risk/benefit", "risk benefit", "hepatic", "cardiac",
]

EFFICACY_TERMS = [
    "lack of efficacy", "insufficient efficacy", "no efficacy", "ineffective",
    "no benefit", "failed to meet", "did not meet", "not meet",
    "primary endpoint", "endpoint not met", "end point not met", "end-point not met",
    "futility", "futile", "futility analysis", "interim analysis", "stopping for futility",
]

OPERATIONAL_TERMS = [
    "recruit", "recruitment", "enrollment", "enrolment", "accrual",
    "insufficient accrual", "slow accrual", "low accrual", "poor accrual",
    "unable to enroll", "unable to enrol",

    "funding", "budget", "financial",
    "administrative", "logistical", "site closure", "staffing",
    "regulatory delay", "protocol deviation",

    "sponsor decision",
    "sponsor request", "per sponsor request", "at sponsor request",
    "sponsor-initiated", "sponsor initiated",
    "company decision", "business decision", "strategic decision",
    "portfolio prioritization", "prioritization decision",
    "commercial reasons",
    "covid", "pandemic",
]

# Causal cue patterns: if these appear near a term, confidence increases
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

# Denial cues, used in denial patterns and proximity checks
NEGATION_CUES = [
    "no ", "not ", "without ", "none ", "neither ", "nor ",
    "not due to", "not because of", "not prompted by", "not related to",
    "not associated with", "not attributable to", "unrelated to", "not caused by",
]


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
# Classification helpers
# -----------------------------

def _find_terms(text: str, terms: List[str]) -> List[str]:
    hits = []
    for t in terms:
        if t in text:
            hits.append(t)
    return hits


def _negated_near(text: str, idx: int, window: int = 50) -> bool:
    start = max(0, idx - window)
    context = text[start:idx]
    return any(cue in context for cue in NEGATION_CUES)


def _term_positions(text: str, term: str) -> List[int]:
    # Find all occurrences (simple substring). Good enough for MVP.
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


def _has_unnegated_any(text: str, terms: List[str]) -> bool:
    return any(_has_unnegated_term(text, t) for t in terms if t in text)


def _explicit_denial_flags(text: str) -> Tuple[bool, bool]:
    """
    Returns (denies_safety, denies_efficacy) using stronger regex patterns.
    This avoids the "global denial" bug: safety can be denied while efficacy is asserted.
    """
    denies_safety_patterns = [
        r"\bno\b.*\bsafety\b.*\bconcern",
        r"\bwithout\b.*\bsafety\b.*\bconcern",
        r"\bnot\b.*\bdue to\b.*\bsafety\b",
        r"\bunrelated to\b.*\bsafety\b",
        r"\bnot\b.*\bprompted by\b.*\bsafety\b",
    ]
    denies_efficacy_patterns = [
        r"\bno\b.*\befficacy\b.*\bconcern",
        r"\bwithout\b.*\befficacy\b.*\bconcern",
        r"\bnot\b.*\bdue to\b.*\befficacy\b",
        r"\bunrelated to\b.*\befficacy\b",
        r"\bnot\b.*\bprompted by\b.*\befficacy\b",
        r"\bnot\b.*\bprompted by\b.*\bendpoint\b",
    ]

    # Special combined denial: "not prompted by any safety or efficacy concerns"
    combined = bool(re.search(r"not\b.*prompted by\b.*(safety|efficacy)\b.*(safety|efficacy)\b", text))
    denies_safety = combined or any(re.search(p, text) for p in denies_safety_patterns)
    denies_efficacy = combined or any(re.search(p, text) for p in denies_efficacy_patterns)
    return denies_safety, denies_efficacy


def _causal_near(text: str, idx: int, window: int = 80) -> bool:
    """
    True if a causal cue appears within a window around the term position.
    Also guards against negated causal phrases like "not due to".
    """
    start = max(0, idx - window)
    end = min(len(text), idx + window)
    context = text[start:end]

    for cue_pat in CAUSAL_CUES:
        m = re.search(cue_pat, context)
        if not m:
            continue
        cue_start_global = start + m.start()
        # If the cue itself is negated nearby (e.g. "not due to"), treat as not causal
        if _negated_near(text, cue_start_global, window=25):
            continue
        return True
    return False


def _score_dimension(text: str, terms: List[str], denies_dim: bool) -> Tuple[int, List[str]]:
    """
    Scores a dimension (safety or efficacy).
    Returns (score, evidence_snippets).
    """
    score = 0
    evidence = []

    # Hard penalty if explicitly denied
    if denies_dim:
        score -= 3
        evidence.append("explicit_denial")

    # Term hits
    any_unnegated = False
    for t in terms:
        if t not in text:
            continue
        for idx in _term_positions(text, t):
            if _negated_near(text, idx):
                continue
            any_unnegated = True

            # Base weight for unnegated mention
            score += 1
            evidence.append(f"term:{t}")

            # Bonus if causal cue near
            if _causal_near(text, idx):
                score += 2
                evidence.append(f"causal_near:{t}")

    # Extra efficacy cues that are strong
    if "primary endpoint" in text and ("not met" in text or "failed" in text or "did not meet" in text):
        if not denies_dim:
            score += 3
            evidence.append("endpoint_not_met_phrase")

    # Futility is strong
    if "futility" in text and not denies_dim and _has_unnegated_term(text, "futility"):
        score += 3
        evidence.append("futility_phrase")

    return score, evidence


def classify_why_stopped(why_stopped: Optional[str]) -> Classification:
    txt = normalize_text(why_stopped)
    if not txt:
        return Classification("UNCLEAR", "OTHER/UNKNOWN", "LOW", "")

    denies_safety, denies_efficacy = _explicit_denial_flags(txt)

    # Operational detection: presence and whether it is itself negated (rare)
    operational_hits = _find_terms(txt, OPERATIONAL_TERMS)
    operational_present = len(operational_hits) > 0

    safety_score, safety_evidence = _score_dimension(txt, SAFETY_TERMS, denies_safety)
    efficacy_score, efficacy_evidence = _score_dimension(txt, EFFICACY_TERMS, denies_efficacy)

    # If operational is present, it should reduce "weak" biological assertions
    if operational_present:
        safety_score -= 1
        efficacy_score -= 1

    # Decide best biological dimension
    best_dim = "SAFETY" if safety_score >= efficacy_score else "EFFICACY/FUTILITY"
    best_score = max(safety_score, efficacy_score)
    best_evidence = safety_evidence if best_dim == "SAFETY" else efficacy_evidence

    # Strong rule: explicit denial + sponsor request / operational => NON_BIOLOGICAL
    if operational_present and (denies_safety and denies_efficacy):
        return Classification(
            "NON_BIOLOGICAL",
            "OPERATIONAL",
            "HIGH",
            "operational:" + "|".join(operational_hits) + ";denial:both"
        )

    # High confidence biological failure
    if best_score >= 4:
        return Classification(
            "BIOLOGICAL_FAILURE",
            best_dim,
            "HIGH",
            "score=" + str(best_score) + ";" + ",".join(best_evidence[:12])
        )

    # Medium confidence biological failure: acceptable only if NOT operational
    if best_score >= 2 and not operational_present:
        return Classification(
            "BIOLOGICAL_FAILURE",
            best_dim,
            "MEDIUM",
            "score=" + str(best_score) + ";" + ",".join(best_evidence[:12])
        )

    # Operational dominates if present (and no strong bio signal)
    if operational_present:
        return Classification(
            "NON_BIOLOGICAL",
            "OPERATIONAL",
            "HIGH",
            "operational:" + "|".join(operational_hits)
        )

    # Otherwise unclear
    return Classification(
        "UNCLEAR",
        "OTHER/UNKNOWN",
        "LOW",
        "safety_score=" + str(safety_score) + ";efficacy_score=" + str(efficacy_score)
    )


# -----------------------------
# Overrides
# -----------------------------

def load_overrides(path: str) -> Dict[str, Classification]:
    """
    overrides.csv format:
      nct_id,override_label,override_reason,override_confidence,notes
    """
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

    classification = classify_why_stopped(why_stopped)

    return {
        "nct_id": nct_id,
        "brief_title": brief_title,
        "overall_status": overall_status,
        "why_stopped": why_stopped,
        "classification_label": classification.label,
        "classification_reason": classification.reason,
        "classification_confidence": classification.confidence,
        "classification_evidence": classification.matched_evidence,

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

            # Apply override if present
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

    # For MVP, keep only HIGH and MEDIUM confidence biological failures
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
