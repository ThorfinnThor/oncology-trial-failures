#!/usr/bin/env python3
"""
Fetch broad oncology trials (ClinicalTrials.gov API v2) that were SUSPENDED or TERMINATED,
then classify whyStopped reasons to focus on biological failure (efficacy/safety/futility)
and exclude operational failures (recruitment/funding/admin).

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

# Broad oncology terms for query.cond. We run each term and union by NCT ID.
ONCOLOGY_TERMS = [
    "cancer",
    "neoplasm",
    "tumor",
    "malignancy",
    "oncology",
]

# Keep the dataset bounded for an MVP.
# You can increase later once everything works.
MAX_STUDIES_TOTAL = int(os.getenv("MAX_STUDIES_TOTAL", "20000"))

# Only keep studies updated since this date to avoid pulling huge historical volumes at first.
# Uses Essie syntax via query.term as documented in examples. :contentReference[oaicite:1]{index=1}
LAST_UPDATE_FROM = os.getenv("LAST_UPDATE_FROM", "2015-01-01")

PAGE_SIZE = int(os.getenv("PAGE_SIZE", "100"))

# Sleep to respect rate limits. BioMCP notes ~50 requests/min per IP as a practical limit. :contentReference[oaicite:2]{index=2}
SLEEP_SECONDS = float(os.getenv("SLEEP_SECONDS", "1.3"))

TIMEOUT = 60


@dataclass(frozen=True)
class Classification:
    label: str  # BIOLOGICAL_FAILURE | NON_BIOLOGICAL | UNCLEAR
    reason: str  # EFFICACY/FUTILITY | SAFETY | OPERATIONAL | OTHER/UNKNOWN


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
    # Collapse whitespace
    return re.sub(r"\s+", " ", s).strip().lower()


# Keywords: conservative baseline. Tune over time.
BIO_EFFICACY = [
    "lack of efficacy", "insufficient efficacy", "no efficacy", "not efficacious",
    "did not meet", "failed to meet", "primary endpoint", "endpoint was not met",
    "futility", "futile", "no benefit", "ineffective", "efficacy concerns",
]
BIO_SAFETY = [
    "safety", "adverse event", "adverse events", "toxicity", "toxic",
    "serious adverse", "unacceptable risk", "risk/benefit", "risk benefit",
    "safety concern", "safety concerns", "dose limiting", "intolerable",
]
NON_BIO_OPERATIONAL = [
    "recruit", "recruitment", "enrollment", "enrolment", "accrual", "insufficient accrual",
    "slow accrual", "low accrual", "poor accrual", "unable to enroll", "unable to enrol",
    "funding", "budget", "financial", "administrative", "business decision",
    "strategic decision", "logistical", "site closure", "staffing", "covid",
    "pandemic", "regulatory delay", "protocol deviation", "sponsor decision",
]


def classify_why_stopped(why_stopped: Optional[str]) -> Classification:
    txt = normalize_text(why_stopped)

    if not txt:
        return Classification(label="UNCLEAR", reason="OTHER/UNKNOWN")

    # First exclude clearly operational reasons
    for k in NON_BIO_OPERATIONAL:
        if k in txt:
            return Classification(label="NON_BIOLOGICAL", reason="OPERATIONAL")

    # Safety signal
    for k in BIO_SAFETY:
        if k in txt:
            return Classification(label="BIOLOGICAL_FAILURE", reason="SAFETY")

    # Efficacy/futility signal
    for k in BIO_EFFICACY:
        if k in txt:
            return Classification(label="BIOLOGICAL_FAILURE", reason="EFFICACY/FUTILITY")

    # Otherwise unknown/ambiguous
    return Classification(label="UNCLEAR", reason="OTHER/UNKNOWN")


def request_with_retries(session: requests.Session, url: str, params: Dict[str, Any]) -> Dict[str, Any]:
    backoff = 2.0
    for attempt in range(1, 7):
        resp = session.get(url, params=params, timeout=TIMEOUT)
        if resp.status_code == 200:
            return resp.json()

        # 429 or transient 5xx: retry with backoff
        if resp.status_code in (429, 500, 502, 503, 504):
            time.sleep(backoff)
            backoff = min(backoff * 2.0, 60.0)
            continue

        # Other errors: raise
        raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:500]}")
    raise RuntimeError("Exceeded retries due to repeated throttling or server errors.")


def iter_studies_for_term(session: requests.Session, term: str) -> Iterable[Dict[str, Any]]:
    """
    Generator over studies for one oncology term.
    Uses:
      - query.cond for condition matching
      - filter.overallStatus for TERMINATED/SUSPENDED
      - query.term for LastUpdatePostDate range (Essie syntax)
      - sort for recency
      - pagination with nextPageToken/pageToken :contentReference[oaicite:3]{index=3}
    """
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
        studies = data.get("studies", [])
        for st in studies:
            yield st

        page_token = data.get("nextPageToken")
        if not page_token:
            break

        time.sleep(SLEEP_SECONDS)


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

    # Deep-link to the study on the website:
    url = f"https://clinicaltrials.gov/study/{nct_id}" if nct_id else ""

    classification = classify_why_stopped(why_stopped)

    record = {
        "nct_id": nct_id,
        "brief_title": brief_title,
        "overall_status": overall_status,
        "why_stopped": why_stopped,
        "classification_label": classification.label,
        "classification_reason": classification.reason,
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
    return record


def is_drug_or_biologic(record: Dict[str, Any]) -> bool:
    types = normalize_text(record.get("intervention_types"))
    # ClinicalTrials.gov intervention types are enumerated; we check for these two.
    return ("drug" in types) or ("biological" in types)


def is_interventional(record: Dict[str, Any]) -> bool:
    return normalize_text(record.get("study_type")) == "interventional"


def write_csv(path: str, rows: List[Dict[str, Any]]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not rows:
        # still write header for stability
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

            # Keep the scope aligned with your goal:
            # - interventional trials
            # - drug/biologic interventions
            if not is_interventional(record):
                continue
            if not is_drug_or_biologic(record):
                continue

            all_records.append(record)

            if len(all_records) >= MAX_STUDIES_TOTAL:
                break

        if len(all_records) >= MAX_STUDIES_TOTAL:
            break

    # Sort by last update date desc (string ISO date sorts correctly)
    all_records.sort(key=lambda r: r.get("last_update_post_date") or "", reverse=True)

    biological_only = [
        r for r in all_records
        if r.get("classification_label") == "BIOLOGICAL_FAILURE"
    ]

    # Output
    write_csv("data/all_oncology_stopped_trials.csv", all_records)
    write_csv("data/biological_failure_oncology_trials.csv", biological_only)
    write_json("data/all_oncology_stopped_trials.json", all_records)
    write_json("data/biological_failure_oncology_trials.json", biological_only)

    print(f"Total interventional drug/biologic stopped oncology trials: {len(all_records)}")
    print(f"Biological failures (efficacy/safety): {len(biological_only)}")


if __name__ == "__main__":
    main()
