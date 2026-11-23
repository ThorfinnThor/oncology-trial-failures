# Weekly EU register (CTIS) search and how its records are reviewed

Since 23 Nov 2026 the weekly run (`update-data.yml`, step "Search the EU register (CTIS) for no-cause
trials", after the newsletter) runs `scripts/sources/ctis_stop_evidence.py --weekly`. It never changes
a label. Probe: `docs/eu_register_probe_2026-11-23.md`.

## What it checks

Every trial labelled CAUSE_NOT_STATED or UNRESOLVED: does it list a CTIS number (EU Clinical Trials
Regulation, since 2023) as a secondary ID on ClinicalTrials.gov, and what does CTIS record?
- per member state, the coded early-termination reason;
- temporary halts, their coded reasons and whether the halt changes the benefit–risk balance;
- urgent safety measures.

Ledger `data/ctis_searched.csv`. Checked again: a CTIS trial that has not ended, every 28 days; a trial
without a CTIS number whose registry entry changed in the last two years, every 90 days (sponsors add
secondary IDs late); any trial whose stop text changed. Seeded on 23 Nov with all 5,642 no-cause
trials: 96 list a CTIS number, 26 went to review.

## What goes to review

A trial whose record holds anything beyond the default "Sponsor Decision", a benefit–risk flag on a
halt, or an urgent safety measure. It waits in `data/ctis_pending_review.json` (categories, countries,
flags, the rules' suggestion; no sponsor text) until a decision lands in
`data/ctis_evidence_decisions.csv` or `data/ctis_evidence_rejected.csv`. The owner is mailed "New EU
register (CTIS) records to review"; a failed search is mailed too and retried the next week.

## How to review

Ask in a session: "review the pending CTIS records". `python scripts/sources/ctis_stop_evidence.py --show
NCT...` prints each record, with the sponsor's justification for halts.

1. **Safety Related (Clinical or Pre-Clinical Results)** as the early-termination category → SAFETY,
   biological. If only some member states say so and the others say "Sponsor Decision", read the halt
   justifications: accept when they name the safety finding or no state contradicts it.
2. **Reprioritisation of Trial** → BUSINESS_STRATEGY. **Feasibility (recruitment issues, etc)** →
   RECRUITMENT, unless the justification names another feasibility problem.
3. **A halt with the benefit–risk flag but category "Sponsor Decision"** is not enough on its own: the
   flag has been set for halts "to reduce the burden of the trial". Accept only when the justification
   names the safety or efficacy finding.
4. **Medicinal Product Related**, **Study Related**: read the justification; without a cause, not
   established (rule 5).
5. A decision row: `nct_id, outcome, primary_reason, secondary_reasons, ctis_id, categories, countries,
   our_summary, decided_by, decided_at`; `our_summary` in our words. Accepted rows go into a dated
   `docs/classification_change_*.md` and the commit message (CLAUDE.md rule 3).

Accepted decisions are applied by `scripts/reclassify_dataset_v2.py` (source `CTIS_REVIEWED`, after a
SEC filing or a publication for the same trial) and shown on the trial page as "What the EU trial
register records" (`scripts/web/build_ctis_evidence.py`).
