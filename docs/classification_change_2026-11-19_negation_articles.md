# Classification change, 19 Nov 2026: a denial with an article is still a denial

Classifier 2.7.6 → 2.7.7 (`scripts/classification_v2.py`, `_is_negated`). CLAUDE.md rule 1.

**Gap.** The negation check accepted "not due to safety concerns" but not "not due to **a** change in
standard of care", "not due to **the** lack of efficacy" or "not due to **an** adverse event": an article
after "not due to" hid the denial. Probes showed it would have read "not due to the lack of efficacy" as
BIOLOGICAL_FAILURE and added SAFETY to "Terminated, not due to an adverse event but because of slow
accrual".

**Fix.** Articles (a, an, the) are allowed between the negator and the matched cause, and every match now
also goes through the shared denial reader `scripts/signals/text_guards.denied()` as a second,
independent check.

**Effect over every stop reason in the database** (with the reviewed index): 1 text, 2 trials.

| Trials | Text | Before | After |
|---|---|---|---|
| NCT00514813, NCT00450333 | The termination of the study is not linked to a product recall or result of any safety signal. Rather it was sponsor's commercial decision to withdraw the MA | NON_BIOLOGICAL / SUPPLY_MANUFACTURING | NON_BIOLOGICAL / BUSINESS_STRATEGY |

No biological label changes: the dangerous phrasings did not occur in the current data; they are now
golden cases so they cannot appear later. Golden cases added (4).
