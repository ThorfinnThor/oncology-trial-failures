# oncology-trial-failures

# Oncology trial failures (ClinicalTrials.gov)

This repo automatically fetches broad oncology trials from ClinicalTrials.gov API v2 and produces:

- `data/all_oncology_stopped_trials.csv`
- `data/biological_failure_oncology_trials.csv`
- plus JSON equivalents

Stopped-trial reasons are classified with the conservative Classification V2
pipeline. V2 stores explicit evidence, separates outcome from causal reason,
preserves mixed and non-failure cases, and routes novel or content-free language
to review instead of forcing a failure bucket. See
[`docs/classification_v2.md`](docs/classification_v2.md).

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
