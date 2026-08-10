# oncology-trial-failures

# Oncology trial failures (ClinicalTrials.gov)

This repo automatically fetches broad oncology trials from ClinicalTrials.gov API v2 and produces:

- `data/all_oncology_stopped_trials.csv`
- `data/biological_failure_oncology_trials.csv`
- plus JSON equivalents

Biological failures are inferred from the `whyStopped` field using simple keyword rules
(efficacy/futility/safety). Recruitment/funding/admin-like reasons are excluded from
the biological-failure subset.

## How it updates
A GitHub Actions workflow runs weekly (and can be run manually).

Before each fetch overwrites the current dataset, the pipeline compares the new
stopped-trial records with the repository snapshot from the preceding ingest. It
writes `data/ingest_changes.json`, including newly tracked NCT IDs, updated
records, status changes, classification changes, and records no longer present.
The website publishes this file as `web/public/ingest_changes.json` for the
automatic report. "New" means new to the stopped-trial dataset since the prior
ingest, not necessarily newly registered on ClinicalTrials.gov.

## Manual run
Go to Actions → "Update oncology trial failure data" → Run workflow.
