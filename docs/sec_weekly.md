# Weekly SEC search and how its passages are reviewed

Since 23 Nov 2026 the weekly run (`update-data.yml`, step "Search SEC filings for new no-cause
trials") runs `scripts/sources/sec_stop_evidence.py --weekly`. It never changes a label.

## What it searches

A trial labelled CAUSE_NOT_STATED or UNRESOLVED whose lead sponsor is an SEC registrant (by name,
or through `data/sec_sponsor_map.csv`), when one of these holds:

- it is not in the ledger `data/sec_searched.csv` (a new trial, or a sponsor newly mapped);
- its stop text changed since it was searched (`text_hash`);
- its search window was still open when it was last searched, and that was 28 or more days ago.
  The window runs from 900 days before to 270 days after the registry's last update
  (`window_end`), because the filing that explains a stop often comes a quarter or two later.

The ledger was seeded with the 1,535 trials searched on 22 Nov (832 + 710, less those whose label
changed since). The filing cache `.cache/sec` is kept between runs with the enrichment cache.

## What happens to a passage

Trials whose best passage scores 4 or more go to `data/sec_pending_review.json` and the owner gets a
mail, "New SEC passages to review", with the sentence and the filing for each new one. They stay
pending until a decision is recorded:

- **accepted** → a row in `data/sec_evidence_decisions.csv` (the label then comes from the filing,
  source `SEC_FILING_REVIEWED`, from the next run on);
- **not accepted** → a row in `data/sec_evidence_rejected.csv` with the reason.

A decided trial is never proposed again. If the EDGAR search fails, the owner is mailed and the
run carries on.

## How to review (a Claude Code session, or a person)

Ask in a session on this repository: "review the pending SEC passages". For each trial in
`data/sec_pending_review.json`, open the filing, then decide by the same rules as the review of
22 Nov (`docs/sec_evidence_review_2026-11-22.md`, CLAUDE.md):

1. **Is the filing about this trial, its drug's programme, or another trial?** Another trial or drug
   of the same company is not accepted. That was the most common miss (31 of 101).
2. **Does it state a cause?** "Based on the interim analysis" or "emerging data" without what the data
   showed is not a cause: not accepted (rule 5, not established).
3. **A programme stop** is accepted only if this trial was running at the time and the filing gives
   the cause. Record `filing_about = PROGRAMME`.
4. **The quote** in the decision must contain the cause and name the drug or the trial. No exhibit
   headers.
5. Accepted rows are listed with their transitions in a dated `docs/classification_change_*.md` and
   in the commit message (CLAUDE.md rule 3). `decided_by` says who reviewed. "Claude (AI-assisted
   review)" is shown on the trial page as "reviewed with AI assistance, not by a clinician".

After deciding, run `python scripts/sources/sec_stop_evidence.py --weekly --out /tmp/sec` once (or
wait for Monday): decided trials leave the pending file.
