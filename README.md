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

## Manual run
Go to Actions → "Update oncology trial failure data" → Run workflow.
