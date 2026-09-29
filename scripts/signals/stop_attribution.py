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

import hashlib
import json
from pathlib import Path

from scripts.signals.text_guards import denied

# Bump whenever a pattern below changes. The weekly run compares every stop's verdict with last
# week's: the same text read by the same rules must give the same verdict, and a change of rules
# must be declared here, where the diff is then printed for review. See check_text_readers.py.
RULES_VERSION = "2026-09-29.2"

# Verdicts read by a person or by the independent review model, keyed by the stop reason's text.
# They take precedence over the patterns: a reviewed verdict is the answer, the patterns are the
# fallback for text nobody has reviewed yet. A changed stop reason has a new key, so a verdict
# never outlives the sentence it was given for. See scripts/review/llm_review.py.
REVIEWED_PATH = Path(__file__).resolve().parents[2] / "data" / "attribution_reviewed.json"

REVIEWED_EVIDENCE = {
    "own_data": "the stop reason describes this trial's own result",
    "programme_cascade": "the stop reason points to another trial, a programme decision or outside evidence",
}


def reviewed_key(text: str) -> str:
    return hashlib.sha1(" ".join((text or "").lower().split()).encode("utf-8")).hexdigest()[:16]


def _load_reviewed() -> dict:
    try:
        return json.loads(REVIEWED_PATH.read_text(encoding="utf-8")).get("entries", {})
    except (FileNotFoundError, ValueError):
        return {}


REVIEWED = _load_reviewed()


def effective_version() -> str:
    """RULES_VERSION plus a fingerprint of the reviewed verdicts: both decide what a text reads as."""
    try:
        digest = hashlib.sha1(REVIEWED_PATH.read_bytes()).hexdigest()[:10]
    except FileNotFoundError:
        digest = "none"
    return f"{RULES_VERSION}+reviewed:{digest}"


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
    (r"\b(?:halt|discontinu|terminat|stop|end)\w*\s+(?:the\s+)?(?:further\s+)?(?:\S+\s+){0,2}?(?:clinical\s+)?"
     r"development\s+(?:of\b|program|programme)", "the development programme ended"),
    # A sister, related, similar or unrelated trial, or evidence from outside: somebody else's data.
    # Only descriptive words may sit between the qualifier and "study": "prior to study start" and
    # "related to study drug supply" are not references to another trial.
    (r"\b(?:an?other|sister|related|affiliated|similar|companion|unrelated|recent|published|previous|prior|parallel)\s+"
     r"(?:(?:clinical|phase\s+(?:\d|i{1,3}|iv)\w*|ongoing|completed|multicent(?:er|re)|randomi[sz]ed|placebo[- ]controlled|"
     r"efficacy|pivotal|large|hepatocellular|\w+-\w+)\s+){0,2}(?:stud(?:y|ies)|trials?)\b", "refers to another study"),
    (r"\b(?:external|published)\s+(?:evidence|data(?!\s+(?:and\s+safety\s+)?monitoring)|results?|literature)\b|"
     r"\bevidence\s+(?:from\s+(?:other|another|larger|published|recent|similar)|showed|shows|has\s+shown)\b",
     "cites evidence from outside this trial"),
    (r"\ba\s+phase\s+(?:\d|i{1,3}|iv)\w*\s+(?:stud(?:y|ies)|trials?)\s+(?:recently\s+)?(?:reported|showed|demonstrated|found)\b",
     "cites results from other studies"),
    # Preclinical or animal findings are not this trial's data, however much they matter.
    (r"\b(?:pre-?clinical|non-?clinical|animal)\s+(?:[\w-]+\s+){0,3}?(?:findings?|data|toxicit\w*|toxicolog\w*|stud(?:y|ies)|results?|signals?)\b",
     "preclinical findings outside this trial"),
    (r"\b(?:\d+|two|three|four|several|both)\s+(?:large\s+|other\s+)?(?:phase\s+(?:\d|i{1,3}|iv)\w*\s+)?"
     r"(?:studies|trials)\s+(?:showed|show|have\s+shown|demonstrated|failed|did\s+not)\b", "cites results from other studies"),
    # "due to study A8241021 showing …": a study named as the cause is not this one. A study named as
    # the subject ("Study SPR001-203 did not meet its endpoints") usually is, so the cause word is required.
    (r"\b(?:due\s+to|because(?:\s+of)?|after|following)\s+(?:the\s+)?(?:core\s+|parent\s+|pivotal\s+)?"
     r"(?:stud(?:y|ies)|trials?)\s+(?:[A-Z]{1,6}\d{3,}[\w-]*|\d{3,}[\w-]*)\s+(?:showing|showed|shows|demonstrat\w+|indicat\w+|did\s+not|failed)\b",
     "cites another study"),
    (r"\bstrategic\s+(?:business\s+|portfolio\s+)?(?:decision|reasons?|review|prioriti[sz]ation)\b", "a portfolio decision"),
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
    # Eligibility criteria are not an endpoint: "patients not meeting inclusion criteria" is recruitment.
    (r"\b(?:did\s+not|failed\s+to|does\s+not)\s+meet\s+(?:(?!inclusion|exclusion|eligib|entry|enrol|screening|admission)[\w/-]+\s+){0,6}?(?:end\s?points?|objectives?|criteri(?:a|on))\b",
     "missed its endpoint"),
    (r"\bend\s?points?\s+(?:(?:was|were|had)\s+)?(?:not|never)\s+(?:been\s+)?(?:met|achieved|reached)\b", "missed its endpoint"),
    (r"\b(?:very\s+)?low\s+probability\b", "this trial's probability of success"),
    (r"\bnot\s+meeting\s+(?:(?!inclusion|exclusion|eligib|entry|enrol|screening|admission)[\w/-]+\s+){0,6}?(?:end\s?points?|objectives?|criteri(?:a|on))\b", "missed its endpoint"),
    (r"\b(?:occurrence|incidence|number|rate|frequency)\s+of\s+(?:[\w-]+\s+){0,3}?(?:adverse\s+(?:events?|reactions?)|AEs?|SAEs?|toxicit(?:y|ies))\b",
     "an event in this trial"),
    (r"\b(?:due\s+to|because\s+of)\s+(?:the\s+|an?\s+)?(?:[\w-]+\s+){0,3}?(?:adverse\s+(?:events?|reactions?)|AEs?|SAEs?|toxicit(?:y|ies)|"
     r"dose[- ]limiting\s+toxicit\w*|intolerab\w*|lack\s+of\s+tolerability)\b", "an event in this trial"),
    (r"^\s*(?:toxicity|toxicities|adverse\s+events?|AEs?|SAEs?)\.?\s*$", "an event in this trial"),
    (r"\b(?:low|poor|insufficient|inadequate|disappointing|limited)\s+(?:overall\s+)?(?:response\s+rates?|responses?|clinical\s+benefit|therapeutic\s+effects?)\b",
     "efficacy observed in this trial"),
    (r"\babsence\s+of\s+(?:demonstration\s+of\s+|evidence\s+of\s+)?(?:efficacy|benefit|activity|response|therapeutic\s+effect)\b",
     "efficacy observed in this trial"),
    (r"\bno\s+(?:apparent\s+|clear\s+|significant\s+|meaningful\s+)?(?:therapeutic|clinical|treatment)\s+(?:effects?|benefit|efficacy)\b",
     "efficacy observed in this trial"),
    (r"\b(?:was|were|is|proved|found)\s+(?:to\s+be\s+)?(?:not\s+(?:effective|efficacious)|ineffective)\b", "efficacy observed in this trial"),
    (r"\befficacy\s+(?:was\s+|were\s+)?not\s+(?:met|shown|demonstrated|established)\b", "efficacy observed in this trial"),
    (r"\b(?:did\s+not|failed\s+to)\s+(?:improve|show)\b", "a result in this trial"),
    (r"\b(?:treatment[- ]related|serious\s+adverse)\b", "an event in this trial"),
    (r"\b(?:observed|seen|reported|occurred)\s+in\s+(?:this|the)\s+(?:stud|trial|patients?)", "an observation in this trial"),
    (r"\b(?:risk[:\s/-]*benefit|benefit[:\s/-]*risk)\b", "this trial's benefit-risk assessment"),
    (r"\b(?:lack|insufficient|limited|no)\s+(?:of\s+)?(?:evidence\s+of\s+)?(?:clinical\s+|robust\s+|sufficient\s+)?"
     r"(?:efficacy|activity|benefit(?![-/:\s]*risk)|response)\b",
     "efficacy observed in this trial"),
    (r"\bprobability\s+of\s+success\b", "this trial's probability of success"),
    (r"\b(?:did\s+not|failed\s+to)\s+(?:achieve|reach|demonstrate)\b", "a result in this trial"),
    # Generic safety language counts as this trial's own only because any outward reference
    # would already have matched a cascade pattern, and cascade wins.
    (r"\bsafety\s+(?:concerns?|signals?|findings?|issues?|reasons?)\b", "safety in this trial"),
    # "stage 2 efficacy criteria not met", "the futility boundary was crossed" in other words.
    (r"\b(?:efficacy|response|activity|go)\s+(?:criteri(?:a|on)|thresholds?|boundar(?:y|ies)|endpoints?|rules?)\s+"
     r"(?:(?:was|were|had)\s+)?(?:not|never)\s+(?:been\s+)?(?:met|reached|achieved|fulfilled)\b",
     "efficacy criteria not met in this trial"),
]

# What a stop reason says it was NOT. "Stopped due to sponsor decision (efficacy criteria not
# met); not due to safety concerns" names safety only to rule it out, and matching the word would
# attribute the stop to a safety finding the sponsor explicitly denies. Negated phrases are cut
# out before either list is read.
NEGATED_PATTERNS = [
    # "not due to / not because of / not related to / not for / not based on ... <up to the next clause>".
    # The span stops at a comma or at "but": "not based on safety concerns, but due to insufficient
    # efficacy" rules out safety and still says efficacy.
    r"\b(?:not|nor|never)\s+(?:(?:primarily|directly|in\s+any\s+way)\s+)?"
    r"(?:due\s+to|because\s+of|related\s+to|linked\s+to|associated\s+with|for|as\s+a\s+result\s+of|"
    r"based\s+on|driven\s+by|caused\s+by|in\s+response\s+to|the\s+result\s+of|a\s+result\s+of)\b(?:(?!\bbut\b)[^.;:(),])*",
    r"\bunrelated\s+to\b(?:(?!\bbut\b)[^.;:(),])*",
    r"\b(?:without|with\s+no)\s+(?:any\s+)?(?:new\s+)?(?:safety|efficacy)\s+(?:concerns?|signals?|issues?|findings?)\b",
    r"\bno\s+(?:new\s+)?(?:unexpected\s+)?safety\s+(?:concerns?|signals?|issues?|findings?|reasons?)\b"
    r"(?:\s+(?:were|was|have\s+been|has\s+been)\s+(?:identified|observed|seen|raised|reported))?",
    r"\b(?:there\s+(?:were|was|are|is)\s+)?no\s+(?:new\s+)?(?:serious\s+adverse|treatment[- ]related)\b(?:(?!\bbut\b)[^.;:(),])*",
]
# A comparison names another study without making it the cause: "the safety profile was consistent
# with previous studies", "deviated from results of previous clinical trials".
NEGATED_PATTERNS += [
    r"\b(?:(?:consistent|in\s+keeping|comparable)\s+with|similar\s+to)\s+(?:the\s+|that\s+(?:of|in|seen\s+in)\s+)?(?:previous|prior|past|other|earlier|published|\w+)\s+"
    r"(?:(?!\bbut\b)[^.;:(),])*",
    r"\b(?:deviat\w*|differ\w*)\s+(?:\w+\s+){0,2}?from\s+(?:the\s+)?(?:results?\s+of\s+)?(?:previous|prior|past|other|earlier|published)"
    r"(?:(?!\bbut\b)[^.;:(),])*",
]
NEGATED_RE = [re.compile(p, re.I) for p in NEGATED_PATTERNS]


def affirmed(text: str) -> str:
    """The stop reason with everything it rules out removed."""
    for rx in NEGATED_RE:
        text = rx.sub(" ", text)
    return text

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
    scan = affirmed(text.replace(own_nct, "") if own_nct else text)
    # Two independent readers must agree that a match is affirmed: affirmed() has already cut the
    # negated phrases out of `scan`, and denied() looks at the words around each match in the
    # original text. A hit counts only when it survives both.
    raw = text.replace(own_nct, "") if own_nct else text

    def affirmed_hit(rx) -> bool:
        return bool(rx.search(scan)) and any(not denied(raw, m.start(), m.end()) for m in rx.finditer(raw))

    cascade_hits = list(dict.fromkeys(why for rx, why in CASCADE_RE if affirmed_hit(rx)))
    own_hits = list(dict.fromkeys(why for rx, why in OWN_RE if affirmed_hit(rx)))
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

    rule_verdict = verdict
    reviewed = REVIEWED.get(reviewed_key(text))
    if reviewed and reviewed.get("attribution") in (OWN_DATA, CASCADE, UNCLEAR):
        verdict, basis = reviewed["attribution"], "reviewed"
        label = REVIEWED_EVIDENCE.get(verdict)
        own_hits = [label] if verdict == OWN_DATA else []
        cascade_hits = [label] if verdict == CASCADE else []
        if verdict == UNCLEAR:
            own_hits, cascade_hits = [], []

    return {
        "nct_id": record.get("nct_id"),
        "attribution": verdict,
        "rule_attribution": rule_verdict,
        "reviewed_by": (reviewed or {}).get("source") if basis == "reviewed" else None,
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


# ---------------------------------------------------------------------------
# What the stops actually are, once you stop counting registry rows
# ---------------------------------------------------------------------------
#
# "Tau: 70% of closed trials stopped early" invites one question from anyone competent, and
# the answer ends the conversation: seven records are not seven experiments. They are four
# molecules. AbbVie did not independently discover three times that tilavonemab does not work
# — it discovered that once and closed three studies.
#
# The molecule count is the number that survives that question, so it should be the number we
# lead with. It also carries more information than the rate: four anti-tau antibodies from
# four sponsors failing across two indications says something specific about a therapeutic
# hypothesis. Four trials of one molecule does not.

# Modality names as they read in a sentence. Unknown modalities fall back to the raw label,
# which is ugly but never wrong.
MODALITY_PLURAL = {
    "Antibody": "monoclonal antibodies",
    "Small molecule": "small molecules",
    "Protein": "engineered proteins",
    "Peptide": "peptides",
    "Oligonucleotide": "oligonucleotides",
    "Cell therapy": "cell therapies",
    "Gene therapy": "gene therapies",
    "Vaccine": "vaccines",
    "Enzyme": "enzymes",
}
MODALITY_SINGULAR = {
    "Antibody": "a monoclonal antibody",
    "Small molecule": "a small molecule",
    "Protein": "an engineered protein",
    "Peptide": "a peptide",
    "Oligonucleotide": "an oligonucleotide",
    "Cell therapy": "a cell therapy",
    "Gene therapy": "a gene therapy",
    "Vaccine": "a vaccine",
    "Enzyme": "an enzyme",
}


def _title(name: str) -> str:
    """Registry drug names arrive shouting. Bintrafusp alfa, not BINTRAFUSP ALFA."""
    if not name:
        return name
    return name.title() if name.isupper() else name


def failed_assets(stops: list[dict], area: str | None = None, klass: str | None = None) -> list[dict]:
    """One entry per distinct molecule behind the stops, not per registry record.

    When a class is given, only the drugs that put a trial in that class count. Otherwise a
    combination inflates the molecule count with its partners: the eleven TGF-beta + PD-(L)1
    stops involve bintrafusp alfa and nisevokitug, plus whatever each was combined with, and
    the partners are not what failed as TGF-beta agents.

    A trial whose drug could not be resolved counts as its own molecule. That overstates how
    many distinct molecules failed, which is the safe direction: it never makes the evidence
    look more concentrated than it is.
    """
    from scripts.universe.mechanism_classes import classes_for  # local: avoids a cycle at import

    groups: dict[str, dict] = {}
    for r in stops:
        picked = []
        for i in r.get("interventions") or []:
            if i.get("role") != "EXPERIMENTAL_ARM":
                continue
            for c in i.get("components") or []:
                if not c.get("entity_id"):
                    continue
                if klass:
                    genes = set(c.get("target_genes") or [])
                    if klass not in classes_for(genes, area):
                        continue
                picked.append(c)
        if not picked:
            # Nothing resolved, or nothing in the class: the trial is its own molecule.
            key = f"unresolved:{r.get('nct_id')}"
            entry = groups.setdefault(key, {"asset": None, "modalities": set(), "sponsors": set(),
                                            "trials": [], "resolved": False, "genes": set(), "mechanisms": set()})
            entry["trials"].append(r.get("nct_id"))
            entry["sponsors"].add(r.get("_sponsor_group") or r.get("lead_sponsor") or "unknown sponsor")
            continue
        for c in picked:
            entry = groups.setdefault(c["entity_id"], {"asset": None, "modalities": set(), "sponsors": set(),
                                                       "trials": [], "resolved": True, "genes": set(),
                                                       "mechanisms": set()})
            entry["genes"].update(c.get("target_genes") or [])
            entry["mechanisms"].update(c.get("mechanisms") or [])
            if not entry["asset"]:
                entry["asset"] = _title(c.get("name") or c.get("label") or "")
            if c.get("modality"):
                entry["modalities"].add(c["modality"])
            entry["sponsors"].add(r.get("_sponsor_group") or r.get("lead_sponsor") or "unknown sponsor")
            if r.get("nct_id") not in entry["trials"]:
                entry["trials"].append(r.get("nct_id"))

    out = []
    for entry in groups.values():
        out.append({
            "asset": entry["asset"] or "unidentified drug",
            "resolved": entry["resolved"],
            "modalities": sorted(entry["modalities"]),
            "target_genes": sorted(entry["genes"]),
            "mechanisms": sorted(entry["mechanisms"]),
            "sponsors": sorted(entry["sponsors"]),
            "trials": sorted(entry["trials"]),
            "trial_count": len(entry["trials"]),
        })
    return sorted(out, key=lambda a: (-a["trial_count"], a["asset"]))


def _join(items: list[str], limit: int = 4) -> str:
    items = list(items)
    if len(items) > limit:
        return ", ".join(items[:limit]) + f" and {len(items) - limit} more"
    if len(items) > 1:
        return ", ".join(items[:-1]) + " and " + items[-1]
    return items[0] if items else ""


def signature(stops: list[dict], area: str | None = None, klass: str | None = None) -> dict:
    """The one sentence to lead with, and the parts it is built from."""
    assets = failed_assets(stops, area=area, klass=klass)
    n_stops = len(stops)
    n_assets = len(assets)
    sponsors = sorted({s for a in assets for s in a["sponsors"]})
    mods = sorted({m for a in assets for m in a["modalities"]})
    unresolved = sum(1 for a in assets if not a["resolved"])
    # Only claim a shared modality when every molecule we could identify shares it, and there
    # is more than one of them — "all antibodies" about a single drug says nothing.
    resolved_assets = [a for a in assets if a["resolved"]]
    shared = (mods[0] if len(mods) == 1 and len(resolved_assets) > 1 and not unresolved else None)

    names = _join([a["asset"] for a in assets if a["resolved"]])
    if n_assets == 0:
        sentence = "No stops in this cohort."
    elif n_assets == 1:
        a = assets[0]
        mod = MODALITY_SINGULAR.get(a["modalities"][0], a["modalities"][0].lower()) if a["modalities"] else None
        sentence = (f"{n_stops} stopped trials, all of one molecule"
                    + (f", {a['asset']}" if a["resolved"] else "")
                    + (f" ({mod})" if mod else "") + ".")
    elif shared:
        sentence = (f"{n_stops} stopped trials, but {n_assets} molecules — "
                    f"all {MODALITY_PLURAL.get(shared, shared.lower() + 's')}: {names}.")
    else:
        # Modalities are only worth naming when they are shared. Listing a mix reads as noise
        # and forces bad plurals out of labels like "ADC" and "Bispecific antibody".
        sentence = (f"{n_stops} stopped trials across {n_assets} molecules"
                    + (f": {names}." if names else "."))
    if unresolved:
        sentence += (f" {unresolved} of the stopped trials had no drug we could resolve and each counts as its own "
                     f"molecule here, so the true number may be lower.")

    return {
        "stops": n_stops,
        "molecules": n_assets,
        "molecules_unresolved": unresolved,
        "sponsors": len(sponsors),
        "shared_modality": shared,
        "modalities": mods,
        "assets": assets,
        "sentence": sentence,
        "headline": (f"{n_assets} molecules stopped early"
                     + (f", all {MODALITY_PLURAL.get(shared, shared.lower() + 's')}" if shared else "")
                     if n_assets != 1 else
                     f"one molecule stopped early across {n_stops} trials"),
    }
