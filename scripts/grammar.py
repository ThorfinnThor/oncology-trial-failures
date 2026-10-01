"""Last line of defence for counts in generated documents: "1 stops" -> "1 stop".

Every sentence should already choose its own singular (count() / plural() in the builders), and
scripts/check_generated_text.py fails the weekly publish when one does not. That check once held
back a whole release — every correction from an external review — over "The 1 stops came from"
in one brief. A count that happens to be 1 in this week's data must not be able to do that, so
both builders pass their finished HTML through this. The check still runs on what comes out.
"""
from __future__ import annotations

import re

NOUNS = {"stops": "stop", "trials": "trial", "molecules": "molecule", "sponsors": "sponsor",
         "programmes": "programme", "cohorts": "cohort", "studies": "study", "terminations": "termination",
         "chapters": "chapter", "drugs": "drug", "events": "event", "patients": "patient", "reports": "report"}
_ADJ = r"(?:further |closed |completed |other |more |stopped |distinct |experimental |terminated |independent |sponsor[–-]asset )*"
_ONE = re.compile(r"(?<![\d.,])\b1 (" + _ADJ + r")(" + "|".join(NOUNS) + r")\b")


def singular_ones(text: str) -> str:
    return _ONE.sub(lambda m: f"1 {m.group(1)}{NOUNS[m.group(2)]}", text)
