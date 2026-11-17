# Classification change, 17 Nov 2026: a partner leaving the study is a support withdrawal

Classifier 2.7.3 → 2.7.4 (`scripts/classification_v2.py`, rule `ops.support`). Decided by the owner after a
clinician-review case (NCT04824937).

**Rule.** "the industrial partner withdrew from the study" and "<Company> pulled out of this trial." name a
cause: a partner or collaborator stopped supporting the study → NON_BIOLOGICAL / SUPPORT_WITHDRAWAL.
A named organisation is read only when the whole text is that one sentence and the name is not a
participant, patient, investigator, site, hospital or the sponsor ("Patient pulled out of the study" stays
Unclear; "the participant withdrew from the trial" keeps its earlier verdict). The classifier reads only the
text: in NCT04824937 Calithera is a collaborator (lead sponsor Massachusetts General Hospital).

**Effect over every stop reason in the database** (15,971 distinct texts): 2 trials change, no others.

| Trial | Text | Before | After |
|---|---|---|---|
| NCT04824937 | Calithera pulled out of this trial. | UNKNOWN / UNSPECIFIED | NON_BIOLOGICAL / SUPPORT_WITHDRAWAL |
| NCT04219046 | the industrial partner withdrew from the study | UNKNOWN / UNSPECIFIED | NON_BIOLOGICAL / SUPPORT_WITHDRAWAL |

Golden cases added to `tests/golden_classification_v2.jsonl` (both sentences, plus two that must not change).
Applies to the data from the next weekly run.
