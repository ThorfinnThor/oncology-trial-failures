#!/usr/bin/env python3
"""The other way a drug fails: it finishes the trial and misses.

A discontinuation rate only sees trials that were stopped. In oncology that is most of how a
programme dies. In metabolic disease and hepatology it is almost none of it — 28 biological stops
in 1,637 closed endocrine trials — because those fields run big outcome trials to the end and
then report that the drug did not beat placebo. That failure is invisible to every number this
site publishes, and it is the failure buyers in those fields are asking about.

It is not invisible in the registry. A sponsor who posts results also posts the analysis behind
each primary outcome, and that record carries the p-value and the sponsor's own statement of what
the test was for. This reads that, and nothing else: no re-analysis, no inference from the
abstract, no judgement about whether the endpoint was the right one.

Two kinds of evidence, in this order:

  1. The sponsor says so. A sentence in the posted results — the limitations section, an
     analysis comment, the outcome description — stating that this trial did not meet its
     primary endpoint. It wins over the statistics, because the sponsor knows the multiplicity
     rule and we do not. Sentences about another study ("after Study X-301 failed to meet its
     primary endpoint"), about individual patients, or phrased as a condition are not read.
     Only misses are taken from prose: "the primary endpoint was met" is written far more often
     as a rule ("…was met if the lower bound…") than as a result.

  2. The sponsor's posted comparison, read against the sponsor's own threshold:

     * only outcome measures the sponsor typed PRIMARY;
     * only analyses that are not non-inferiority or equivalence tests — typed SUPERIORITY, or
       the older registry answer "not a non-inferiority or equivalence analysis"
       (SUPERIORITY_OR_OTHER). A failed non-inferiority test is a different event and is never
       counted;
     * only analyses comparing at least two groups, because a within-arm change over baseline
       is not a comparison;
     * no Bayesian analyses: a posterior probability in the p-value field is not a p-value;
     * the threshold is the one the sponsor wrote down ("one-sided alpha 0.10", "Bonferroni-
       corrected 0.025", "threshold for significance ≤ 0.0125") where there is one. Where the
       sponsor only says the test was one-sided, a p below 0.025 is significant and one of 0.2
       or more is not; in between it depends on a number we do not have, so it is left unread.
       Otherwise 0.05;
     * with no p-value, a two-sided 95% confidence interval for a difference or a ratio that
       includes no effect (0 or 1) is non-significant, and one that excludes it is significant.

A trial where every qualifying analysis came back non-significant is MISSED. Where all were
significant, MET. Where they disagree — co-primaries or doses that split — MIXED, reported as its
own thing rather than folded into either, because the registry does not say whether the design
needed both.

What this is not: MET is not approval, and does not check that the effect went the right way.
MISSED is not a verdict on the molecule — a trial can miss because of the dose, the population,
the endpoint or the comparator. It is the sponsor's own posted result, read back, with the
sentence or the numbers it was read from kept next to it.

Output: .cache/universe/endpoint_outcomes.jsonl.gz (one row per trial that posted results)
"""
from __future__ import annotations

import argparse
import gzip
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.signals.http_cache import get_json  # noqa: E402

API = "https://clinicaltrials.gov/api/v2/studies"
OUT = ROOT / ".cache/universe/endpoint_outcomes.jsonl.gz"
# The year slices hold rows already read, not raw registry records, so a change to the reading
# has to invalidate them: the version is in the directory name.
READER_VERSION = 2
YEAR_DIR = ROOT / f".cache/universe/results_years_v{READER_VERSION}"
REFRESH_DAYS = 6
START_YEAR = 2010
ALPHA = 0.05
ONE_SIDED_SURE = 0.025   # significant at any one-sided threshold a sponsor would use
ONE_SIDED_NEVER = 0.2    # not significant at any one-sided threshold a sponsor would use
FIELDS = ",".join([
    "protocolSection.identificationModule.nctId",
    "protocolSection.statusModule.overallStatus",
    "resultsSection.outcomeMeasuresModule",
    "resultsSection.moreInfoModule.limitationsAndCaveats",
])
COMPARISON_TYPES = {"SUPERIORITY", "SUPERIORITY_OR_OTHER", "SUPERIORITY_OR_OTHER_LEGACY"}
COMMENT_FIELDS = ("pValueComment", "statisticalComment", "nonInferiorityComment", "groupDescription",
                  "estimateComment", "otherAnalysisDescription")

# "p<0.001", "P = .03", "0.0506", ">0.999", "NS". The registry is free text here.
NUMBER = re.compile(r"^\s*(?P<op>[<>=≤≥]{0,2})\s*(?P<num>\.\d+|\d+(?:\.\d+)?)\s*$")
NOT_SIGNIFICANT = re.compile(r"^\s*(ns|n\.?s\.?|not significant|non[- ]significant)\s*$", re.I)


def parse_p(raw: object) -> tuple[float | None, str | None]:
    """(value, operator) with the operator kept: "<0.001" and "0.001" are not the same claim."""
    if raw is None:
        return (None, None)
    text = str(raw).strip()
    if not text:
        return (None, None)
    if NOT_SIGNIFICANT.match(text):
        return (1.0, ">")  # the sponsor said it outright
    text = re.sub(r"^p\s*(?=[<>=≤≥.\d])", "", text, flags=re.I).strip()
    text = text.replace("≤", "<=").replace("≥", ">=")
    m = NUMBER.match(text)
    if not m:
        return (None, None)
    try:
        value = float(m.group("num"))
    except ValueError:
        return (None, None)
    if not (0.0 <= value <= 1.0):
        return (None, None)
    op = m.group("op") or "="
    return (value, op)


def significant(value: float, op: str, alpha: float = ALPHA) -> bool | None:
    """None where the record does not settle it — "<0.1" says nothing about 0.05."""
    if op in ("<", "<="):
        return True if value <= alpha else None
    if op in (">", ">="):
        return False if value >= alpha else None
    return value < alpha


# ---------------------------------------------------------------------------
# The sponsor's own threshold.
# ---------------------------------------------------------------------------

_NUM = r"(0?\.\d+|\d+(?:\.\d+)?\s*%)"
_THRESHOLD = [
    re.compile(
        r"(?:alpha|α|significance level|level of significance|type i error(?: rate)?|significance threshold|"
        r"threshold for (?:statistical )?significance|nominal level|significant at|tested at|evaluated at|"
        r"performed at|conducted at|carried out at)\s*(?:level|rate)?\s*"
        r"(?:of|was|is|=|:|at|set at|set to|<|≤)?\s*(?:the|a|an)?\s*(?:one|1|two|2)?[- ]?(?:sided|tailed)?\s*"
        r"(?:alpha|α|significance)?\s*(?:level)?\s*(?:of|=|:)?\s*(?:p\s*[<=≤]\s*)?" + _NUM, re.I),
    re.compile(_NUM + r"\s*(?:one|1|two|2)?[- ]?(?:sided|tailed)?\s*"
               r"(?:alpha|α|significance level|level of significance|level|type i error)", re.I),
]
_ONE_SIDED = re.compile(r"\b(?:one|1)[- ](?:sided|tailed)\b", re.I)
_BAYES = re.compile(r"bayes|posterior", re.I)
# Older records answered one question — "is this a non-inferiority or equivalence analysis?" — and
# sponsors answered it wrongly often enough to matter: an HIV switch trial with a 12% margin filed
# as "superiority or other". Where the words say non-inferiority, the words win.
_NI_WORDS = re.compile(r"non-?\s?inferior|noninferior|equivalen|\bmargin\b|\bNI\b|worse than", re.I)


def _as_fraction(text: str) -> float | None:
    text = text.strip()
    try:
        value = float(text[:-1].strip()) / 100 if text.endswith("%") else float(text)
    except ValueError:
        return None
    return value if 0.0005 <= value <= 0.3 else None


def _clean(text: str) -> str:
    """Registry free text arrives with Markdown escapes ("\\[HR\\]", "\\<0.05") and ragged spacing."""
    return " ".join(re.sub(r"\\([\[\]<>*_()#~`])", r"\1", text or "").split())


def _analysis_text(analysis: dict) -> str:
    parts = [analysis.get(k) or "" for k in COMMENT_FIELDS] + [analysis.get("statisticalMethod") or ""]
    return _clean(" ".join(parts))


def stated_threshold(analysis: dict) -> dict:
    """What the sponsor wrote about the bar this comparison had to clear.

    Returns the thresholds named, whether the test was one-sided, and the words they came from,
    so the reader of a package can see the rule as well as the result.
    """
    text = _analysis_text(analysis)
    values, excerpt = set(), ""
    for pattern in _THRESHOLD:
        for m in pattern.finditer(text):
            value = _as_fraction(m.group(1))
            if value is None:
                continue
            values.add(round(value, 5))
            if not excerpt:
                excerpt = _sentence_around(text, m.start(), m.end())
    one_sided = bool(_ONE_SIDED.search(text))
    if one_sided and not excerpt:
        m = _ONE_SIDED.search(text)
        excerpt = _sentence_around(text, m.start(), m.end())
    return {"values": sorted(values), "one_sided": one_sided, "excerpt": excerpt}


def _sentence_around(text: str, start: int, end: int, limit: int = 220) -> str:
    stop = text.rfind(". ", 0, start)
    left = 0 if stop == -1 else stop + 2
    right = text.find(". ", end)
    right = len(text) if right == -1 else right + 1
    sentence = text[left:right].strip()
    if len(sentence) > limit:
        cut = max(0, start - left - 80)
        sentence = ("…" if cut else "") + sentence[cut:cut + limit].rsplit(" ", 1)[0] + "…"
    return sentence


def judge_p(value: float, op: str, rule: dict) -> tuple[bool | None, float | None, str]:
    """(significant, threshold used, basis). None where the record does not settle it."""
    if rule["values"]:
        lo, hi = min(rule["values"]), max(rule["values"])
        if op == "=" and value in (lo, hi):
            # "p = 0.0167" against "0.0167 significance level" is decided by rounding.
            return None, None, "stated"
        below, above = significant(value, op, lo), significant(value, op, hi)
        if below is True:
            return True, lo, "stated"
        if above is False:
            return False, hi, "stated"
        return None, None, "stated"
    if rule["one_sided"]:
        if significant(value, op, ONE_SIDED_SURE) is True:
            return True, ONE_SIDED_SURE, "one_sided"
        if significant(value, op, ONE_SIDED_NEVER) is False:
            return False, ONE_SIDED_NEVER, "one_sided"
        return None, None, "one_sided"
    return significant(value, op, ALPHA), ALPHA, "default"


# ---------------------------------------------------------------------------
# A confidence interval, where the sponsor posted no p-value.
# ---------------------------------------------------------------------------

# A primary outcome that counts adverse events or measures drug levels is not a test of whether
# the drug worked. "No difference in adverse events" is not a missed endpoint, and a prevention
# trial whose endpoint is an adverse event is left unread rather than guessed at.
_NOT_EFFICACY = re.compile(
    r"adverse (?:event|effect|reaction)|\b(?:TE|TR|ir|imm?)?AEs?\b|\bSAEs?\b|\bAESIs?\b|leading to (?:treatment |study (?:drug )?)?discontinuation|safety|tolerab|toxicit|dose[- ]limiting|\bDLTs?\b|"
    r"laboratory abnormal|vital sign|\bC ?max\b|pharmacokinetic|\bT ?max\b|half[- ]life|trough concentration|"
    r"bioavailab", re.I)

_RATIO = re.compile(r"ratio|\b(hr|or|rr|gmr|irr)\b", re.I)
_DIFFERENCE = re.compile(r"difference|\brd\b", re.I)


def _num(raw: object) -> float | None:
    try:
        return float(str(raw).strip())
    except (TypeError, ValueError):
        return None


def estimate_of(analysis: dict) -> dict | None:
    kind = (analysis.get("paramType") or "").strip()
    value = _num(analysis.get("paramValue"))
    if not kind and value is None:
        return None
    return {"type": kind or None, "value": value, "ci_pct": _num(analysis.get("ciPctValue")),
            "ci_sides": analysis.get("ciNumSides"),
            "lower": _num(analysis.get("ciLowerLimit")), "upper": _num(analysis.get("ciUpperLimit"))}


def judge_ci(analysis: dict) -> bool | None:
    """A two-sided 95% interval against no effect. None for anything else."""
    est = estimate_of(analysis)
    if not est or est["ci_sides"] != "TWO_SIDED" or est["ci_pct"] != 95:
        return None
    if est["lower"] is None or est["upper"] is None or est["lower"] > est["upper"]:
        return None
    kind = est["type"] or ""
    if _RATIO.search(kind) and not _DIFFERENCE.search(kind):
        null = 1.0
    elif _DIFFERENCE.search(kind) and not _RATIO.search(kind):
        null = 0.0
    else:
        return None
    if est["lower"] == null or est["upper"] == null:
        return None  # on the boundary: the rounding decides, not the data
    return not (est["lower"] < null < est["upper"])


def read_analyses(outcomes: list[dict]) -> dict:
    """Every primary between-group comparison in one trial, what each one says, and why."""
    considered = []
    skipped = {"non_inferiority": 0, "one_group": 0, "unparsable_p": 0, "no_p": 0, "bayesian": 0,
               "threshold_unclear": 0, "safety_or_pk_outcome": 0}
    for outcome in outcomes:
        if (outcome.get("type") or "").upper() != "PRIMARY":
            continue
        if _NOT_EFFICACY.search(outcome.get("title") or ""):
            skipped["safety_or_pk_outcome"] += len(outcome.get("analyses") or [])
            continue
        for analysis in outcome.get("analyses") or []:
            kind = (analysis.get("nonInferiorityType") or "").upper()
            if kind and kind not in COMPARISON_TYPES:
                skipped["non_inferiority"] += 1
                continue
            if len(analysis.get("groupIds") or []) < 2:
                skipped["one_group"] += 1
                continue
            if _NI_WORDS.search(" ".join([_analysis_text(analysis), outcome.get("title") or ""])):
                skipped["non_inferiority"] += 1
                continue
            if _BAYES.search(" ".join([_analysis_text(analysis), analysis.get("paramType") or ""])):
                skipped["bayesian"] += 1
                continue
            rule = stated_threshold(analysis)
            raw = analysis.get("pValue")
            value, op = parse_p(raw) if raw is not None else (None, None)
            if value is not None:
                verdict, threshold, basis = judge_p(value, op, rule)
                if verdict is None:
                    skipped["threshold_unclear" if basis != "default" else "unparsable_p"] += 1
                    continue
                shown_p = f"{op}{value:g}" if op != "=" else f"{value:g}"
            else:
                # Only a 95% interval stands in for 0.05: against any other stated bar it does not.
                verdict = judge_ci(analysis) if not rule["values"] or rule["values"] == [ALPHA] else None
                if verdict is None:
                    skipped["no_p" if raw is None else "unparsable_p"] += 1
                    continue
                threshold, basis, shown_p = ALPHA, "ci", None
            considered.append({
                "outcome": (outcome.get("title") or "")[:200],
                "p": shown_p,
                "significant": verdict,
                "threshold": threshold,
                "threshold_basis": basis,
                "one_sided": rule["one_sided"],
                "rule_excerpt": rule["excerpt"] or None,
                "method": (analysis.get("statisticalMethod") or "").strip()[:80] or None,
                "estimate": estimate_of(analysis),
            })
    if skipped["non_inferiority"] and considered:
        # A trial built around a non-inferiority question posts its superiority tests as the next
        # step of the hierarchy ("…and then superiority, p = 1.00"). Reading those alone turns a
        # trial that met its primary aim into a miss, so the whole trial is left unread.
        skipped["non_inferiority_design"] = len(considered)
        considered = []
    return {"considered": considered, "skipped": skipped}


def verdict_of(considered: list[dict]) -> str:
    if not considered:
        return "UNREADABLE"
    flags = {row["significant"] for row in considered}
    if flags == {True}:
        return "MET"
    if flags == {False}:
        return "MISSED"
    return "MIXED"


# ---------------------------------------------------------------------------
# The sponsor saying it in words.
# ---------------------------------------------------------------------------

_MISS = re.compile(
    r"primary (?:efficacy |study )?(?:end ?-?point|objective|outcome|hypothesis)s?(?: of (?:the|this) (?:study|trial))?"
    r" (?:was|were|has|had|have)? ?(?:not|n't) (?:been )?(?:met|achieved|reached|demonstrated|attained)"
    r"|did not (?:meet|achieve|reach|attain) (?:its|the|their|any of the|either)?\s*(?:pre-?specified |primary |co-?primary )*"
    r"(?:efficacy )?(?:end ?-?point|objective)"
    r"|fail(?:ed|s)? to (?:meet|achieve|reach|demonstrate)[^.]{0,60}primary"
    r"|not (?:meet|achieve)[^.]{0,30}primary (?:end ?-?point|objective)", re.I)
_OTHER_NCT = re.compile(r"NCT\d{8}", re.I)
_OTHER_STUDY = re.compile(r"\b(?:parent|previous|prior|other|another|earlier|companion|pivotal|core|feeder|sister|"
                          r"lead-in|original)\s+(?:study|studies|trial|trials)\b", re.I)
# Case-sensitive on purpose: "Study CAIN457C2303 did not meet…" is someone else's study,
# "the study did not meet…" is this one.
_STUDY_CODE = re.compile(r"\b(?:[Ss]tudy|[Tt]rial)\s+[A-Z0-9]*\d[A-Z0-9-]*|\b[A-Z][A-Z0-9]+-[A-Z0-9-]*\d{2,}")
# "It failed to meet its primary endpoint" after a sentence about another study is about that study.
_PRONOUN_START = re.compile(r"^(?:it|they|this|that|the latter|the former)\b(?!\s+(?:study|trial))", re.I)
# "did not reach its primary objective; didn't accrue enough patients" is an enrolment failure
# described as a miss: there was no answer, not a negative one.
_NO_ANSWER = re.compile(r"\b(?:enough|insufficient|sufficient|low|poor|slow|lack of)\b[^.]{0,40}"
                        r"\b(?:accru|enrol|recruit|patients|participants|subjects|events|data)"
                        r"|\b(?:accru|enrol|recruit)\w*[^.]{0,30}\b(?:enough|insufficient|low|poor|slow)\b", re.I)
_PER_PATIENT = re.compile(r"\b(?:patients?|participants?|subjects?|pts|eyes|who|individuals?)\b", re.I)
_CONDITIONAL = re.compile(r"\b(?:if|whether|unless|would|will|could|should)\b", re.I)


def _sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", _clean(text)) if s.strip()]


def statement_in(text: str, nct: str) -> str | None:
    """The first sentence in which the sponsor says this trial missed, or None."""
    sentences = _sentences(text)
    for i, sentence in enumerate(sentences):
        m = _MISS.search(sentence)
        if not m:
            continue
        if _NO_ANSWER.search(sentence):
            continue
        if i and _PRONOUN_START.search(sentence):
            previous = sentences[i - 1]
            if _OTHER_NCT.search(previous) or _OTHER_STUDY.search(previous) or _STUDY_CODE.search(previous):
                continue
        before = sentence[:m.start()]
        if any(x.upper() != nct.upper() for x in _OTHER_NCT.findall(sentence)):
            continue
        if _OTHER_STUDY.search(sentence) or _STUDY_CODE.search(sentence):
            continue
        if _PER_PATIENT.search(before) or _CONDITIONAL.search(before):
            continue
        return sentence[:300] + ("…" if len(sentence) > 300 else "")
    return None


def sponsor_statement(study: dict, nct: str) -> dict | None:
    results = study.get("resultsSection") or {}
    places = [("limitations and caveats",
               ((results.get("moreInfoModule") or {}).get("limitationsAndCaveats") or {}).get("description"))]
    for outcome in (results.get("outcomeMeasuresModule") or {}).get("outcomeMeasures") or []:
        if (outcome.get("type") or "").upper() != "PRIMARY":
            continue
        places.append(("primary outcome description", outcome.get("description")))
        for analysis in outcome.get("analyses") or []:
            for key in COMMENT_FIELDS:
                places.append(("primary analysis comment", analysis.get(key)))
    for where, text in places:
        found = statement_in(text or "", nct)
        if found:
            return {"text": found, "where": where}
    return None


def row_for(study: dict) -> dict | None:
    protocol = study.get("protocolSection") or {}
    nct = ((protocol.get("identificationModule") or {}).get("nctId") or "").strip()
    if not nct:
        return None
    outcomes = ((study.get("resultsSection") or {}).get("outcomeMeasuresModule") or {}).get("outcomeMeasures") or []
    if not outcomes:
        return None
    read = read_analyses(outcomes)
    statistical = verdict_of(read["considered"])
    said = sponsor_statement(study, nct)
    return {
        "nct_id": nct,
        "overall_status": (protocol.get("statusModule") or {}).get("overallStatus"),
        "primary_outcomes": sum(1 for o in outcomes if (o.get("type") or "").upper() == "PRIMARY"),
        # The sponsor's sentence wins: it knows the multiplicity rule, the co-primary logic and
        # the single-arm bar, none of which the posted numbers carry.
        "endpoint_verdict": "MISSED" if said else statistical,
        "basis": "sponsor_statement" if said else ("posted_analysis" if read["considered"] else None),
        "statistical_verdict": statistical,
        "sponsor_statement": said,
        "analyses": read["considered"],
        "not_read": read["skipped"],
        "alpha": ALPHA,
        "reader_version": READER_VERSION,
    }


def load_verdicts() -> dict[str, dict]:
    """What the registry says about each trial's primary endpoint, or {} if it has not been read.

    Empty rather than an error on purpose: the fetch is a separate step with its own time budget,
    and a package built before it has run should lose a section, not fail to build.
    """
    if not OUT.exists():
        return {}
    out: dict[str, dict] = {}
    with gzip.open(OUT, "rt", encoding="utf-8") as fh:
        for line in fh:
            row = json.loads(line)
            out[row["nct_id"]] = row
    return out


# ---------------------------------------------------------------------------
# What a reader needs to check a verdict without opening the registry: the sentence or the
# numbers it was read from, in words. Packages and trial pages print these lines as they are.
# ---------------------------------------------------------------------------

def results_url(nct: str) -> str:
    return f"https://clinicaltrials.gov/study/{nct}?tab=results"


def _fmt(x: float | None) -> str:
    if x is None:
        return "?"
    return f"{x:g}" if abs(x) < 1e6 else f"{x:.3g}"


def evidence_line(analysis: dict) -> str:
    """One analysis as a sentence: the endpoint, the number, the bar it was held to."""
    est = analysis.get("estimate") or {}
    outcome = (analysis.get("outcome") or "Primary outcome").strip()
    verdict = "significant" if analysis.get("significant") else "not significant"
    if analysis.get("threshold_basis") == "ci":
        return (f"{outcome} — {est.get('type') or 'estimate'} {_fmt(est.get('value'))} "
                f"(95% CI {_fmt(est.get('lower'))} to {_fmt(est.get('upper'))}): the interval "
                + ("excludes" if analysis.get("significant") else "includes") + " no effect, so " + verdict + ".")
    bar = analysis.get("threshold")
    basis = analysis.get("threshold_basis")
    p = analysis.get("p")
    if basis == "stated":
        head = f"{outcome} — p {p} against the sponsor's stated threshold of {_fmt(bar)}: {verdict}."
    elif basis == "one_sided":
        head = (f"{outcome} — one-sided p {p}, no threshold stated; "
                + ("below 0.025, so significant at any one-sided threshold in use." if analysis.get("significant")
                   else "0.2 or above, so not significant at any one-sided threshold in use."))
    else:
        head = f"{outcome} — p {p} against 0.05: {verdict}."
    parts = [head]
    if est.get("type") and est.get("value") is not None and est.get("lower") is not None:
        parts.append(f"{est['type']} {_fmt(est['value'])} ({_fmt(est.get('ci_pct'))}% CI "
                     f"{_fmt(est.get('lower'))} to {_fmt(est.get('upper'))}).")
    if analysis.get("method"):
        parts.append(f"Method: {analysis['method']}.")
    return " ".join(parts)


def evidence_of(row: dict | None, limit: int = 4) -> dict | None:
    """The public, self-contained record of one trial's primary result, or None if unread."""
    if not row or row.get("endpoint_verdict") not in ("MISSED", "MET", "MIXED"):
        return None
    analyses = row.get("analyses") or []
    # Lead with what decided the verdict: for a miss the non-significant comparisons.
    if row["endpoint_verdict"] == "MISSED":
        analyses = [a for a in analyses if not a.get("significant")] or analyses
    return {
        "verdict": row["endpoint_verdict"],
        "basis": row.get("basis"),
        "statement": row.get("sponsor_statement"),
        "statistical_verdict": row.get("statistical_verdict"),
        "lines": [evidence_line(a) for a in analyses[:limit]],
        "more": max(0, len(analyses) - limit),
        "rules": sorted({a["rule_excerpt"] for a in analyses[:limit] if a.get("rule_excerpt")})[:2],
        "results_url": results_url(row["nct_id"]),
        "reader_version": row.get("reader_version"),
    }


def read_on() -> str | None:
    """The day the registry was read, for the "read on" line next to every verdict."""
    if not OUT.exists():
        return None
    return date.fromtimestamp(OUT.stat().st_mtime).isoformat()


# ---------------------------------------------------------------------------
# The evidence gap: finished, and nothing posted. Not a failure and not a violation — many trials
# are not covered by the US posting rule, and some have a certified delay — but it is the part
# of the question that the registry cannot answer, and a buyer should see how large it is.
# ---------------------------------------------------------------------------

GAP_MONTHS = 13  # the US rule allows twelve months after primary completion; one more for QC


def _months_ago(yyyy_mm: str | None, today: date) -> int | None:
    if not yyyy_mm or len(yyyy_mm) < 7:
        return None
    try:
        year, month = int(yyyy_mm[:4]), int(yyyy_mm[5:7])
    except ValueError:
        return None
    return (today.year - year) * 12 + (today.month - month)


def disclosure_gap(rows: list[dict], today: date | None = None) -> dict:
    """Completed trials whose primary completion is more than GAP_MONTHS behind us, and how many
    of those have posted no results. Only an actual primary completion date counts."""
    today = today or date.today()
    due = [r for r in rows
           if r.get("overall_status") == "COMPLETED"
           and (r.get("primary_completion_date_type") or "ACTUAL") == "ACTUAL"
           and (_months_ago(r.get("primary_completion_date") or r.get("completion_date"), today) or 0) > GAP_MONTHS]
    silent = [r for r in due if not r.get("has_results")]
    return {
        "due": len(due),
        "not_posted": len(silent),
        "not_posted_industry": sum(1 for r in silent if r.get("lead_sponsor_class") == "INDUSTRY"),
        "months": GAP_MONTHS,
    }


def fetch_slice(start: str, end: str, max_pages: int = 200):
    adv = (f"AREA[StudyType]INTERVENTIONAL AND AREA[StartDate]RANGE[{start},{end}] "
           "AND (AREA[Phase]PHASE2 OR AREA[Phase]PHASE3) "
           "AND AREA[ResultsFirstPostDate]RANGE[MIN,MAX]")
    token, pages = None, 0
    while pages < max_pages:
        # 1,000 a page: a full re-read after a reader change is ~27 pages a year slice instead of
        # ~270, which is what keeps it inside one weekly run's time budget.
        params = {"filter.advanced": adv, "fields": FIELDS, "pageSize": 1000, "format": "json"}
        if token:
            params["pageToken"] = token
        body = get_json("ctgov", API, params, cache=False, timeout=120, retries=5) or {}
        for study in body.get("studies") or []:
            yield study
        token = body.get("nextPageToken")
        pages += 1
        if not token:
            break


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-seconds", type=float, default=1200)
    ap.add_argument("--end-year", type=int, default=date.today().year)
    ap.add_argument("--start-year", type=int, default=START_YEAR)
    args = ap.parse_args()
    started = time.monotonic()
    YEAR_DIR.mkdir(parents=True, exist_ok=True)

    for year in range(args.start_year, args.end_year + 1):
        path = YEAR_DIR / f"{year}.jsonl.gz"
        if path.exists() and (time.time() - path.stat().st_mtime) < REFRESH_DAYS * 86400:
            continue
        if time.monotonic() - started > args.max_seconds:
            print("time budget reached; completed years are kept, re-run to continue", flush=True)
            return 3
        tmp = path.with_name(path.name + ".tmp")
        count = 0
        with gzip.open(tmp, "wt", encoding="utf-8") as fh:
            for study in fetch_slice(f"{year}-01-01", f"{year}-12-31"):
                row = row_for(study)
                if row:
                    fh.write(json.dumps(row, ensure_ascii=False) + "\n")
                    count += 1
        tmp.replace(path)
        print(f"{year}: {count} trials with posted outcomes ({time.monotonic() - started:.0f}s)", flush=True)

    seen, tally = set(), {}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(OUT.with_name(OUT.name + ".tmp"), "wt", encoding="utf-8") as out:
        for year in range(args.start_year, args.end_year + 1):
            path = YEAR_DIR / f"{year}.jsonl.gz"
            if not path.exists():
                continue
            with gzip.open(path, "rt", encoding="utf-8") as fh:
                for line in fh:
                    row = json.loads(line)
                    if row["nct_id"] in seen:
                        continue
                    seen.add(row["nct_id"])
                    out.write(line)
                    tally[row["endpoint_verdict"]] = tally.get(row["endpoint_verdict"], 0) + 1
    OUT.with_name(OUT.name + ".tmp").replace(OUT)
    print(json.dumps({"trials": len(seen), "verdicts": tally}, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
