# Weekly publication search and how its passages are reviewed

Since 23 Nov 2026 the weekly run (`update-data.yml`, step "Search publications for no-cause trials")
runs `scripts/sources/pub_stop_evidence.py --weekly --max-seconds 2400`. It never changes a label.
Probe and method: `docs/pub_evidence_probe_2026-11-23.md`.

## What it searches

Trials labelled CAUSE_NOT_STATED or UNRESOLVED, within a 40-minute budget (Europe PMC is slow, so the
backlog of ~5,400 trials takes several weeks):

1. never searched, or the stop text changed (ledger `data/pub_searched.csv`); terminated and suspended
   trials first, the most recently updated first; withdrawn trials last and only through the
   registry's own references;
2. then trials searched 180 or more days ago whose registry entry changed in the last four years
   (results papers often come years after the stop).

A failed search is not recorded and is retried the next week. The ledger was seeded on 23 Nov with
the 197 trials of the probe; 11 of them are in the review queue.

## What happens to a passage

Trials with a sentence saying the trial itself stopped go to `data/pub_pending_review.json` and the
owner gets a mail "New publication passages to review" (NCT ID, PMID, journal, the rules' suggestion).
**The queue and the mail carry no paper text:** abstracts and full texts belong to publishers or
authors and the repository is public (`docs/provenance_and_rights.md`). They stay pending until a
decision is recorded in `data/pub_evidence_decisions.csv` (accepted) or
`data/pub_evidence_rejected.csv` (not accepted, with the reason).

## How to review

Ask in a session on this repository: "review the pending publication passages". Then:

1. `python scripts/sources/pub_stop_evidence.py --show NCT...` prints each trial's sentences from its
   papers, with PMID and how the paper is linked.
2. **Is it the trial's own paper?** `registry_result` and `registry_derived` are linked by the
   registry; `nct_in_abstract` is weaker (a secondary analysis or a protocol paper can name the NCT ID).
   Read the paper's title.
3. **Does the sentence state why this trial stopped?** Futility at an interim analysis, harm in the
   treatment arm, poor accrual. "Terminated early" alone is not a cause (rule 5: not established).
4. **Stopped because of a related trial's results:** if the other trial tested the same intervention
   and the paper says what it showed (futility, inferior outcomes, harm), label it by that result and
   set `about = RELATED_TRIAL` (as the rules already do for registry text). Without the direction
   ("in consideration of the results of trial X"), not accepted.
5. A decision row: `nct_id, outcome, primary_reason, secondary_reasons, pmid, link, our_summary,
   decided_by, decided_at`. `our_summary` is a short paraphrase in our words, never the paper's
   sentence. Accepted rows are listed with their transitions in a dated
   `docs/classification_change_*.md` and in the commit message (CLAUDE.md rule 3).

Accepted decisions are applied by `scripts/reclassify_dataset_v2.py` in the weekly run (source
`PUBLICATION_REVIEWED`; a SEC decision wins where both exist) and shown on the trial page as "What
the trial's publication reports" (`scripts/web/build_pub_evidence.py`). First 9 on 23 Nov:
`docs/classification_change_2026-11-23_publications.md`.
