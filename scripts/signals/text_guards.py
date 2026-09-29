#!/usr/bin/env python3
"""Does the text say this, or does it say it is NOT this?

Every rule in this repository that reads free text — why a trial stopped, whose data stopped it —
finds words. A word is not a claim: "not due to safety concerns" contains "safety concerns", and
reading it as a safety finding put a statement the sponsor explicitly denied into a paid report
(MISTAKES.md #15). This module is the second, independent reader that asks one question of any
match: is it inside a denial?

It is deliberately a different technique from the one in stop_attribution.affirmed(), which cuts
negated phrases out before matching. That one can be defeated by a phrasing it did not foresee;
this one looks at the words immediately around a match. Both have to be fooled for a denial to
reach a report.
"""
from __future__ import annotations

import re

# A negator that governs what follows it: "not due to X", "no X", "without X", "unrelated to X".
# "was not continued due to safety concerns" must NOT count — there the negation belongs to
# "continued", and safety is the affirmed cause — so a bare "not" earlier in the clause is not
# enough; it has to be attached to the cause.
_GOVERNS = re.compile(
    r"(?:\b(?:not|nor|never)\s+(?:(?:primarily|directly|solely|in\s+any\s+way|any\s+more)\s+)?"
    r"(?:due\s+to|because\s+of|related\s+to|linked\s+to|associated\s+with|attributable\s+to|for|as\s+a\s+result\s+of|"
    r"based\s+on|driven\s+by|caused\s+by|in\s+response\s+to|the\s+result\s+of|a\s+result\s+of|prompted\s+by|motivated\s+by)"
    r"|\b(?:no|without|with\s+no|unrelated\s+to|irrespective\s+of|neither|nor|absence\s+of|free\s+of|rather\s+than|instead\s+of))"
    r"(?:\s+(?:any|new|further|unexpected|major|significant|emerging|particular|specific|human|serious|other|"
    r"the|a|an|of|or|and|reasons?|concerns?|issues?|related|study|drug|product|patient|participant)\b)*\s*$",
    re.I,
)

# A denial after the match: "safety concerns were not identified", "safety was not a factor".
_DENIED_AFTER = re.compile(
    r"^\s*(?:(?:concerns?|issues?|signals?|findings?|events?|reasons?|problems?)\s+)?"
    r"(?:(?:were|was|are|is|has\s+been|have\s+been|had\s+been)\s+)?(?:not|never)\s+(?:been\s+)?"
    r"(?:identified|observed|seen|raised|reported|noted|found|detected|a\s+factor|the\s+reason|a\s+reason|a\s+concern|"
    r"involved|contributing|relevant|an\s+issue|the\s+cause|a\s+cause)\b"
    r"|^\s*(?:(?:were|was)\s+)?(?:none|absent)\b",
    re.I,
)

_CLAUSE_BREAK = re.compile(r"[.;:()]|,|\bbut\b|\bhowever\b|\bwhereas\b|\balthough\b", re.I)


def denied(text: str, start: int, end: int) -> bool:
    """True when the words text[start:end] sit inside a denial in their own clause."""
    before = _CLAUSE_BREAK.split(text[:start])[-1]
    # "no" / "not" inside the match itself ("no evidence of efficacy", "did not meet") is the
    # finding, not a denial of it, so only the words before the match are read here.
    if _GOVERNS.search(before):
        return True
    after = _CLAUSE_BREAK.split(text[end:])[0]
    return bool(_DENIED_AFTER.search(after))


_SAFETY_WORD = re.compile(
    r"\b(?:safety|toxicit(?:y|ies)|toxicolog\w*|adverse\s+(?:events?|reactions?|effects?)|SAEs?|deaths?|fatal\w*|"
    r"hepatotoxicity|liver\s+(?:injury|enzyme)|side[- ]effects?)\b",
    re.I,
)


def affirms_safety(text: str) -> bool:
    """Whether the text states a safety problem anywhere, rather than only denying one."""
    return any(not denied(text, m.start(), m.end()) for m in _SAFETY_WORD.finditer(text or ""))
