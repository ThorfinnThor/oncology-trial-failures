# Working rules for this repository

## Rules that read free text

Anything that turns registry text into a verdict a customer reads — `scripts/signals/stop_attribution.py`,
the classification rules, the endpoint reader — follows these rules. MISTAKES.md #15 is why.

1. **A word is not a claim.** Every pattern must survive the text saying the opposite: "not due to
   safety concerns", "no safety concern", "safety was not a factor", "rather than efficacy". Matches
   go through `scripts/signals/text_guards.denied()`.
2. **Run it over the real corpus before committing.** `python scripts/signals/check_text_readers.py`
   must pass. It reads every stop reason in the database, not a sample.
3. **Declare every rule change.** Changing a pattern in `stop_attribution.py` means bumping
   `RULES_VERSION`, running the check, and reading `data/attribution_changes.md` — every changed verdict
   with its sentence — before pushing. Summarise the transitions in the commit message.
4. **Every wrong verdict becomes a golden case.** When a customer or the owner finds one, add the real
   sentence and the correct verdict to `scripts/signals/fixtures/attribution_golden.json` first, then fix
   the rule until it passes.
5. **When unsure, say "not established".** A conservative "unclear" costs nothing; a confident wrong
   verdict in a paid report costs the business.
6. **Reviewed verdicts beat patterns.** `data/attribution_reviewed.json` and the APPROVED rows in
   `data/classification_manual_decisions_v2.csv` are decisions, not suggestions. The review model
   (`docs/llm_review.md`) may add to the first where the rules are silent or disputed; it never
   changes an outcome and never overwrites a person's decision.
7. **Never assume a threshold.** A posted result is called met or missed only against a threshold the
   record states, one its posted interval implies, or where every conventional threshold agrees
   (`endpoint_outcomes.judge_unstated`). A p-value its own interval contradicts is not read. Everything
   else is "not assessable" and listed with the reason. MISTAKES.md #17.
8. **The drug tested is the difference between the arms.** What the control arm also received is
   background (`shared_backbone`), and background never puts a trial into a mechanism cohort. Show it
   next to the drugs tested, never inside them.

