# Clinician review tool

A blind review page for stop reasons: one trial at a time, the reviewer picks a category, a main
reason and how sure they are, and each answer is saved as it is given.

- **Live page:** https://claude.ai/artifact/DRTJvGrrYc7pSi6W8XFjk9 (private; owner: Schayan)
- **Source:** `stop-reason-review.html` — published with the Artifact tool, capabilities
  `db` + `user` (access rules below).

## Data

| Path | What |
| --- | --- |
| `cases/<case_id>` | One case: `order`, `batch`, `batch_label`, `nct_id`, `why_stopped`, `title`, `status`, `phases`, `conditions`, `interventions`, `registry_url`. Written by the owner only. |
| `reviews/<user id>` | One reviewer: `name`, `role`, `started_at`, `updated_at`. |
| `reviews/<user id>/answers/<case_id>` | One answer: `outcome`, `primary_reason`, `secondary_reasons`, `confidence`, `note`, `saved_at`, `guideline_version`. |

Outcome and reason values are those of `validation/LABELING_GUIDELINES.md`. The page's own
guidance adds notes (16–17 Nov 2026): futility tied only to slow enrolment is Recruitment; a
recall of product lots is Supply / manufacturing; "nobody enrolled" with nothing else is Never
started (also in the guidelines and classifier 2.7.2); the sponsor is who decided, not a cause —
a sponsor's business or development reason is "Sponsor's business / strategy decision", and
"Partner or funder withdrew support" is for someone other than the sponsor.

Reviewers see neither our labels nor each other's answers. The owner sees everyone's progress.

## Inviting a reviewer

Share menu on the page → invite by email as **Editor**. Reviewers from outside the organization
can only save with Editor access, and need a claude.ai account.

## Adding cases, reading answers

Cases and answers are read and written with Claude's `ArtifactData` tool on the page's URL:
a batch of `set` writes to `cases` adds cases (keep `order` unique); a `list` of `reviews`, then
of `reviews/<id>/answers`, reads the answers. Answers for the held-out validation go into
`validation/crosscheck_gpt61/decisions.json`, then `python scripts/crosscheck_heldout_v2.py`.

## Two review modes

Each batch has a document `batches/<batch>` with `mode`:

- `blind` — the reviewer sees the text and chooses outcome, reason and confidence. Used where the
  answers measure our accuracy (the oncology sample, the disputed validation texts): showing our
  label would pull reviewers toward it and flatter the figure.
- `confirm` — the reviewer also sees our label (`labels/<batch>`, one document mapping case id to
  the label shown) and presses **Correct** (Y) or **Not correct** (N), then chooses. About two to
  three times faster; used where the job is checking every label, not measuring
  (`oncology-bio-2026-11`). Answers carry `mode`, `verdict` (`confirmed`, `corrected`, `blind`) and
  `shown_label`.

**Attention checks** in confirm batches: about 1 in 20 cases shows a deliberately wrong label,
drawn only from texts that plainly state efficacy or safety; reviewers are told such checks exist.
Which cases they are is kept in `qa/<batch>`, readable by the owner only — not in this repo.
Our label for every drawn case, frozen at draw time, is kept the same way in `qa/<batch>-labels`
(`build_batch.py` writes it to `<out>/qa_<batch>-labels.json` for loading), so a reviewer cannot
look up our answer here.
A reviewer who confirms a check has not read the case; weigh their confirmations accordingly.

Access rules: `cases`, `batches`, `labels` read interact / write owner · `qa` owner only ·
`reviews` read admin / write owner · `reviews/{self}` read and write interact.

## Batches and order

Cases carry `batch`, `batch_label`, `batch_priority` and a global `order` (priority × 10000 +
position). The page opens at the first unanswered case in that order, so a lower priority number
is finished first; "Later" leaves a case open. Draw a new batch with
`python tools/clinician-review/build_batch.py` (one trial per distinct stop-reason text, seeded,
our labels frozen in `batches/<batch>.json` and never sent to the page), then load
`<out>/cases/*.json` into `cases` with ArtifactData batch writes of up to 50.

## Loaded so far

- `oncology-2026-11` (priority 1, 16 Nov 2026): 150 oncology Phase 2/3 trials — 100 we label
  biological, 50 others by outcome — from 3,775 distinct oncology stop-reason texts.
  Our labels at draw time: `qa/oncology-2026-11-labels` (owner-only).

- `oncology-bio-2026-11` (priority 3, 16 Nov 2026): every other oncology trial we label biological
  — 638 distinct stop-reason texts, all phases and study types, the 100 of the sample excluded.
  With the sample's 100, every biological label in oncology is in front of a clinician.
- `validation-disputed` (priority 2, 16 Nov 2026): the 11 held-out texts where the Claude reference and the
  GPT-6.1 cross-check disagree on biological vs. not (`docs/validation_crosscheck_gpt61.md`).
