#!/usr/bin/env python3
"""Propose or apply conservative description fallbacks for unresolved records."""

from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import requests

try:
    from classification_v2 import (
        classification_source,
        classify_with_v2_fallback,
        is_placeholder_reason,
        load_reviewed_reason_index,
    )
except ImportError:
    from scripts.classification_v2 import (
        classification_source,
        classify_with_v2_fallback,
        is_placeholder_reason,
        load_reviewed_reason_index,
    )


API_URL = "https://clinicaltrials.gov/api/v2/studies"
FIELDS = "NCTId,WhyStopped,BriefSummary,DetailedDescription"


def chunks(values: List[str], size: int) -> Iterable[List[str]]:
    for offset in range(0, len(values), size):
        yield values[offset : offset + size]


def request_batch(
    session: requests.Session,
    nct_ids: List[str],
    retries: int = 6,
) -> Dict[str, Dict[str, Any]]:
    params = {
        "query.term": "AREA[NCTId](" + " OR ".join(nct_ids) + ")",
        "fields": FIELDS,
        "pageSize": str(len(nct_ids)),
        "format": "json",
    }
    backoff = 1.0
    for attempt in range(retries):
        response = session.get(API_URL, params=params, timeout=90)
        if response.status_code == 200:
            output: Dict[str, Dict[str, Any]] = {}
            for study in response.json().get("studies", []):
                protocol = study.get("protocolSection") or {}
                identification = protocol.get("identificationModule") or {}
                nct_id = str(identification.get("nctId") or "").upper()
                if nct_id:
                    output[nct_id] = protocol
            return output
        if response.status_code not in {429, 500, 502, 503, 504}:
            raise RuntimeError(
                f"ClinicalTrials.gov returned HTTP {response.status_code}: "
                f"{response.text[:500]}"
            )
        if attempt + 1 < retries:
            time.sleep(backoff)
            backoff = min(backoff * 2.0, 30.0)
    raise RuntimeError("ClinicalTrials.gov request failed after repeated retries")


def proposal_for(
    row: Dict[str, Any],
    protocol: Dict[str, Any],
    reviewed_index: Dict[str, Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    status = protocol.get("statusModule") or {}
    description = protocol.get("descriptionModule") or {}
    registry_reason = status.get("whyStopped")
    if not is_placeholder_reason(registry_reason):
        return None
    result = classify_with_v2_fallback(
        registry_reason,
        description.get("briefSummary"),
        description.get("detailedDescription"),
        reviewed_index,
    )
    if result.needs_review or result.confidence != "HIGH":
        return None
    if classification_source(result) != "DESCRIPTION_FALLBACK":
        return None
    return {
        "nct_id": str(row.get("nct_id") or "").upper(),
        "why_stopped": row.get("why_stopped") or "",
        "registry_why_stopped": registry_reason or "",
        "proposed_outcome_v2": result.outcome,
        "proposed_primary_reason_v2": result.primary_reason,
        "proposed_secondary_reasons_v2": list(result.secondary_reasons),
        "classification_evidence": result.evidence_string(),
        "record_fields": {
            **result.as_record_fields(),
            "classification_source": "DESCRIPTION_FALLBACK",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/all_stopped_trials.json")
    parser.add_argument(
        "--reviewed-index", default="data/classification_reviewed_reasons_v2.json"
    )
    parser.add_argument(
        "--proposals", default="data/classification_context_proposals_v2.json"
    )
    parser.add_argument("--batch-size", type=int, default=25)
    parser.add_argument("--write", action="store_true")
    parser.add_argument(
        "--apply-existing",
        action="store_true",
        help="Apply the already reviewed proposal file without another API request",
    )
    args = parser.parse_args()

    rows = json.loads(Path(args.input).read_text(encoding="utf-8"))
    if args.apply_existing:
        payload = json.loads(Path(args.proposals).read_text(encoding="utf-8"))
        proposals = payload.get("proposals", [])
        fields_by_id: Dict[str, Dict[str, Any]] = {}
        for proposal in proposals:
            nct_id = str(proposal.get("nct_id") or "").upper()
            fields = proposal.get("record_fields") or {}
            if not nct_id or fields.get("classification_source") != "DESCRIPTION_FALLBACK":
                raise ValueError(f"Invalid context proposal for {nct_id or '<missing ID>'}")
            fields_by_id[nct_id] = fields
        known_ids = {str(row.get("nct_id") or "").upper() for row in rows}
        unknown_ids = sorted(set(fields_by_id) - known_ids)
        if unknown_ids:
            raise ValueError(f"Proposal IDs are absent from the snapshot: {unknown_ids[:10]}")
        updated = [
            {**row, **fields_by_id.get(str(row.get("nct_id") or "").upper(), {})}
            for row in rows
        ]
        Path(args.input).write_text(
            json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"Applied {len(fields_by_id)} reviewed context proposals")
        return

    reviewed_index = load_reviewed_reason_index(args.reviewed_index)
    targets = [
        row
        for row in rows
        if row.get("classification_needs_review") is True
        and is_placeholder_reason(row.get("why_stopped"))
    ]
    by_id = {str(row.get("nct_id") or "").upper(): row for row in targets}
    contexts: Dict[str, Dict[str, Any]] = {}
    session = requests.Session()
    ids = sorted(value for value in by_id if value)
    for batch_number, batch in enumerate(chunks(ids, args.batch_size), start=1):
        contexts.update(request_batch(session, batch))
        if batch_number % 10 == 0:
            print(f"Fetched context for {min(batch_number * args.batch_size, len(ids))}/{len(ids)} IDs")
        time.sleep(0.1)

    proposals = []
    for nct_id in ids:
        protocol = contexts.get(nct_id)
        if not protocol:
            continue
        proposal = proposal_for(by_id[nct_id], protocol, reviewed_index)
        if proposal:
            proposals.append(proposal)

    output = {
        "schema_version": 1,
        "target_count": len(targets),
        "registry_record_count": len(contexts),
        "missing_registry_count": len(ids) - len(contexts),
        "proposal_count": len(proposals),
        "proposals": proposals,
    }
    Path(args.proposals).write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    if args.write:
        fields_by_id = {
            proposal["nct_id"]: proposal["record_fields"] for proposal in proposals
        }
        updated = [{**row, **fields_by_id.get(str(row.get("nct_id") or "").upper(), {})} for row in rows]
        Path(args.input).write_text(
            json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    mode = "applied" if args.write else "proposed"
    print(
        f"Context enrichment {mode}: {len(targets)} targets, "
        f"{len(contexts)} registry records, {len(proposals)} high-confidence fallbacks"
    )


if __name__ == "__main__":
    main()
