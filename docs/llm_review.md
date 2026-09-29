# Independent review of stop reasons

A language model reads the stop reasons as a second, independent reader next to the rules in
`scripts/classification_v2.py` and `scripts/signals/stop_attribution.py`. Code:
`scripts/review/llm_review.py`; tests: `scripts/review/run_review_tests.py`.

## Why

A one-time review of 3,979 stop reasons (September 2026) found that the rules

- attributed about 4% of biological stops to the wrong source ("this trial's own data" vs.
  another trial or a programme decision),
- left 26% of clear stop reasons "not established",
- counted 15 stops as the drug failing that were not, and missed 67 that were.

All of these were corrected by hand (`data/classification_manual_decisions_v2.csv`,
`data/attribution_reviewed.json`). This review keeps it that way for new and changed stop reasons.

## What it does, and what it may change

| | |
|---|---|
| Every week | reads every stop reason that has never been read (new trials, changed text) |
| Every 28 days | reads again every stop reason that feeds a rate or a report (~3,400) |
| Attribution, rules say "not established" | the model's confident reading is shown |
| Attribution, rules and model disagree | "not established" is shown — a disputed claim is not printed as fact |
| Attribution decided by a person, golden cases | never changed |
| Outcome (was it the drug?) | **never changed automatically** — it moves published rates. Disagreements are listed in `data/llm_review/outcome_disagreements.md` |

Every change to `data/attribution_reviewed.json` changes the fingerprint the text-reader gate
checks, so each run's effect is written to `data/attribution_changes.md` and every generated
document is checked again before anything is published.

## Turning it on

1. console.anthropic.com → API Keys → create a key. Settings → Limits: set a monthly spend limit
   (for example $10).
2. GitHub → repository → Settings → Secrets and variables → Actions → **Secrets** →
   New repository secret: `ANTHROPIC_API_KEY`.
3. Optional, same page → **Variables**: `REVIEW_MODEL` (default `claude-sonnet-5-5`; also
   `claude-haiku-4-5-20251001` or `claude-opus-5-5`) and `REVIEW_MAX_USD` (cap per run, default 15).
4. Run the workflow "Update trial failure data". The first run reads all ~15,000 distinct stop
   reasons (about $5 with Sonnet 5.5); runs that exceed the cap continue the next week.

Without the secret the step reports "not set", sends nothing and changes nothing.

## Cost (Message Batches API, September 2026 prices)

| Model | First full read | Monthly re-read | Weekly new reasons |
|---|---|---|---|
| claude-haiku-4-5-20251001 | ~$2.70 | ~$0.70 | cents |
| claude-sonnet-5-5 (default) | ~$5.30 | ~$1.40 | cents |
| claude-opus-5-5 | ~$10.60 | ~$2.80 | cents |

Estimates err high; the actual cost of each run is written to `data/llm_review/state.json` and
`data/llm_review/last_run.md`.
