#!/usr/bin/env python3
"""Was this trial stopped by its own data, or by a decision taken somewhere else?

This is the distinction a diligence buyer is actually paying for, and no rate carries it.
TGF-beta + PD-(L)1 reads 11 stops in 44 closed trials. Read the eleven and they are not
eleven independent verdicts on the mechanism: six trials stopped on their own data — a
treatment-related death, two IDMC reviews, a futility call, a worsening benefit-risk ratio —
and five were closed because bintrafusp alfa or NIS793 had already failed elsewhere. "Two
molecules failed and the trials around them were cleared" is a different claim about the
mechanism from "eleven trials failed", and only one of them is true.

Two signals, deliberately kept separate so the reader can see which fired:

  textual    the registry text points outward: to another study, to a programme or
             development decision, to a halt issued elsewhere, or to a named other trial.
  structural several trials of the same sponsor-asset programme stopped close together in
             time. One decision, several records, whatever the text says.

Attribution is conservative. "unclear" is a real answer and stays in the output: a stop with
no outward reference and no sibling is called own_data only when the text actually describes
this trial's own finding.
"""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, datetime

OWN_DATA = "own_data"
CASCADE = "programme_cascade"
UNCLEAR = "unclear"

# The text points somewhere other than this trial.
CASCADE_PATTERNS = [
    (r"\b(?:an|the)?other\s+(?:stud(?:y|ies)|trials?|arms?)\b", "refers to another study"),
    (r"\bin\s+other\s+(?:stud(?:y|ies)|trials?)\b", "refers to other studies"),
    (r"\bbased\s+on\s+(?:the\s+)?(?:results?|data|findings?|recommendations?)\s+(?:of|from)\s+"
     r"(?!this\b|the\s+interim|the\s+planned|an\s+interim)", "cites results from elsewhere"),
    (r"\bfollowing\s+(?:the\s+)?(?:results?|halt|discontinuation|termination|decision|information)\b",
     "follows a decision taken elsewhere"),
    (r"\b(?:clinical\s+)?development\s+(?:of\s+\S+\s+)?(?:was|has been|is being|were)\s+"
     r"(?:\w+\s+){0,2}?(?:halted|discontinued|stopped|terminated|ceased)\b", "the development programme ended"),
    (r"\b(?:program|programme|portfolio)\b[^.]{0,60}\b(?:halt|discontinu|terminat|stopp)\w*", "a programme decision"),
    (r"\b(?:treatment|dosing)\s+halt\b|\bhalt\s+of\s+[^.]{0,40}?\b(?:treatment|dosing|development)\b",
     "a treatment halt issued elsewhere"),
    # Handled separately in attribute(): a trial quoting its own NCT id points at itself.
    (r"\bNCT\d{8}\b", "names another registry record"),
    (r"\bstrategic\s+(?:business\s+)?(?:decision|reasons?|review|prioriti[sz]ation)\b", "a portfolio decision"),
    # A named upstream trial. "As the feeder study was stopped for futility" describes somebody
    # else's futility, and without this the word "futility" would claim it for this trial.
    (r"\b(?:feeder|parent|preceding|lead[- ]?in|companion|source|pivotal|main)\s+(?:stud(?:y|ies)|trials?|protocols?)\b",
     "cites an upstream study"),
    (r"\bfollowing\s+the\s+(?:placebo[- ]controlled|double[- ]blind|randomi[sz]ed|blinded)\b",
     "follows the controlled part of another study"),
]

# The text describes something observed in THIS trial.
OWN_PATTERNS = [
    (r"\b(?:interim|planned)\s+analysis\b", "its own interim analysis"),
    (r"\b(?:I?DMC|DSMB|data\s+(?:and\s+safety\s+)?monitoring\s+(?:committee|board))\b", "its own monitoring committee"),
    (r"\bfutility\b", "futility in this trial"),
    (r"\b(?:did\s+not|failed\s+to)\s+meet\s+(?:its\s+)?(?:primary\s+)?(?:endpoint|objective)\b", "missed its endpoint"),
    (r"\b(?:treatment[- ]related|serious\s+adverse)\b", "an event in this trial"),
    (r"\b(?:observed|seen|reported|occurred)\s+in\s+(?:this|the)\s+(?:stud|trial|patients?)", "an observation in this trial"),
    (r"\b(?:risk[:\s/-]*benefit|benefit[:\s/-]*risk)\b", "this trial's benefit-risk assessment"),
    (r"\b(?:lack|insufficient|limited|no)\s+(?:evidence\s+of\s+)?(?:efficacy|activity|benefit|response)\b",
     "efficacy observed in this trial"),
    (r"\bprobability\s+of\s+success\b", "this trial's probability of success"),
    (r"\b(?:did\s+not|failed\s+to)\s+(?:achieve|reach|demonstrate)\b", "a result in this trial"),
    # Generic safety language counts as this trial's own only because any outward reference
    # would already have matched a cascade pattern, and cascade wins.
    (r"\bsafety\s+(?:concerns?|signals?|findings?|issues?|reasons?)\b", "safety in this trial"),
]

CASCADE_RE = [(re.compile(p, re.I), why) for p, why in CASCADE_PATTERNS]
OWN_RE = [(re.compile(p, re.I), why) for p, why in OWN_PATTERNS]

# Two stops of one sponsor-asset programme within this many days are one decision.
SIBLING_WINDOW_DAYS = 240


def _date(value) -> date | None:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
        try:
            return datetime.strptime(str(value)[:10 if fmt == "%Y-%m-%d" else 7 if fmt == "%Y-%m" else 4], fmt).date()
        except ValueError:
            continue
    return None


def programme_key(r: dict) -> tuple:
    ids = tuple(sorted(r.get("focus_entity_ids") or []))
    sponsor = r.get("_sponsor_group") or r.get("lead_sponsor") or "unknown sponsor"
    return (sponsor, ids if ids else f"unresolved:{r.get('nct_id')}")


def _stop_date(r: dict) -> date | None:
    return _date(r.get("stop_date_estimate")) or _date(r.get("completion_date"))


def siblings(stops: list[dict]) -> dict[str, list[str]]:
    """For each stop, the other stops of the same programme that happened close to it."""
    by_prog: dict[tuple, list[dict]] = defaultdict(list)
    for r in stops:
        by_prog[programme_key(r)].append(r)
    out: dict[str, list[str]] = {}
    for group in by_prog.values():
        for r in group:
            d = _stop_date(r)
            near = []
            for other in group:
                if other["nct_id"] == r["nct_id"]:
                    continue
                od = _stop_date(other)
                if d and od and abs((d - od).days) <= SIBLING_WINDOW_DAYS:
                    near.append(other["nct_id"])
                elif not d or not od:
                    near.append(other["nct_id"])  # same programme, dates unusable: still not independent
            out[r["nct_id"]] = sorted(near)
    return out


def attribute(record: dict, sibling_ncts: list[str] | None = None) -> dict:
    """Classify one stop, keeping the evidence that produced the classification."""
    text = " ".join((record.get("why_stopped") or "").split())
    # A trial that quotes its own registry id is pointing at itself, not elsewhere.
    own_nct = record.get("nct_id") or ""
    scan = text.replace(own_nct, "") if own_nct else text
    cascade_hits = [why for rx, why in CASCADE_RE if rx.search(scan)]
    own_hits = [why for rx, why in OWN_RE if rx.search(scan)]
    sibling_ncts = sibling_ncts or []

    if cascade_hits:
        # An outward reference wins even when the text also describes a finding: the finding
        # being cited is somebody else's.
        verdict, basis = CASCADE, "textual"
    elif own_hits:
        # What the sponsor wrote beats the structural signal. When several trials of one
        # programme stop together, one of them is usually the trial whose data caused it, and
        # calling that one a cascade would invert the story. The concentration statistics
        # already record that the stops are not independent.
        verdict, basis = OWN_DATA, "textual"
    elif sibling_ncts:
        verdict, basis = CASCADE, "structural"
    else:
        verdict, basis = UNCLEAR, None

    return {
        "nct_id": record.get("nct_id"),
        "attribution": verdict,
        "basis": basis,
        "cascade_evidence": cascade_hits,
        "own_data_evidence": own_hits,
        "sibling_stops": sibling_ncts,
        "why_stopped": text,
    }


def attribute_all(stops: list[dict]) -> list[dict]:
    sib = siblings(stops)
    return [attribute(r, sib.get(r["nct_id"], [])) for r in stops]


def summarise(rows: list[dict]) -> dict:
    counts = {OWN_DATA: 0, CASCADE: 0, UNCLEAR: 0}
    for r in rows:
        counts[r["attribution"]] += 1
    return {
        "stops_from_own_data": counts[OWN_DATA],
        "stops_from_programme_cascade": counts[CASCADE],
        "stops_unclear": counts[UNCLEAR],
        "cascade_textual": sum(1 for r in rows if r["attribution"] == CASCADE and r["basis"] == "textual"),
        "cascade_structural": sum(1 for r in rows if r["attribution"] == CASCADE and r["basis"] == "structural"),
    }
