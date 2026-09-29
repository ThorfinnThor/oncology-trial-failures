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
