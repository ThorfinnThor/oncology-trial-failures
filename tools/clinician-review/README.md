# Clinician review tool

A blind review page for stop reasons: one trial at a time, the reviewer picks a category, a main
reason and how sure they are, and each answer is saved as it is given.

- **Live page:** https://claude.ai/artifact/DRTJvGrrYc7pSi6W8XFjk9 (private; owner: Schayan)
- **Source:** `stop-reason-review.html` — published with the Artifact tool, capabilities
  `db` + `user`, access rules:
  `cases` read interact / write owner · `reviews` read admin / write owner ·
  `reviews/{self}` read and write interact.

## Data

| Path | What |
| --- | --- |
| `cases/<case_id>` | One case: `order`, `batch`, `batch_label`, `nct_id`, `why_stopped`, `title`, `status`, `phases`, `conditions`, `interventions`, `registry_url`. Written by the owner only. |
| `reviews/<user id>` | One reviewer: `name`, `role`, `started_at`, `updated_at`. |
| `reviews/<user id>/answers/<case_id>` | One answer: `outcome`, `primary_reason`, `secondary_reasons`, `confidence`, `note`, `saved_at`, `guideline_version`. |

Outcome and reason values are those of `validation/LABELING_GUIDELINES.md`. The page's own
guidance adds two notes (16 Nov 2026): futility tied only to slow enrolment is Recruitment; a
recall of product lots is Supply / manufacturing.

Reviewers see neither our labels nor each other's answers. The owner sees everyone's progress.

## Inviting a reviewer

Share menu on the page → invite by email as **Editor**. Reviewers from outside the organization
can only save with Editor access, and need a claude.ai account.

## Adding cases, reading answers

Cases and answers are read and written with Claude's `ArtifactData` tool on the page's URL:
a batch of `set` writes to `cases` adds cases (keep `order` unique); a `list` of `reviews`, then
of `reviews/<id>/answers`, reads the answers. Answers for the held-out validation go into
`validation/crosscheck_gpt61/decisions.json`, then `python scripts/crosscheck_heldout_v2.py`.

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
  `batches/oncology-2026-11.json` holds our labels at draw time.

- `oncology-bio-2026-11` (priority 3, 16 Nov 2026): every other oncology trial we label biological
  — 638 distinct stop-reason texts, all phases and study types, the 100 of the sample excluded.
  With the sample's 100, every biological label in oncology is in front of a clinician.
- `validation-disputed` (priority 2, 16 Nov 2026): the 11 held-out texts where the Claude reference and the
  GPT-6.1 cross-check disagree on biological vs. not (`docs/validation_crosscheck_gpt61.md`).
