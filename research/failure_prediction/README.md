# Can a model predict which trials will fail? A feasibility study

**Question.** Can a model built from information available on the day a Phase 2/3 trial starts predict
whether it will fail on biology better than a simple base rate?

**Answer, in short.**
- **Whether a trial will miss or meet its primary endpoint:** no model beat the phase × disease-area
  base rate. That rate already separates fairly well (AUC 0.71) and is well calibrated. Logistic
  regression and gradient boosting with design, modality, sponsor and failure-history features were
  significantly *worse* (AUC 0.66–0.69).
- **Whether a closed trial was stopped early for efficacy, futility or safety:** a model clearly beat
  the base rate (AUC 0.64 against 0.56, gain +0.08, 95 % CI +0.07 to +0.10). It is still a weak
  predictor in absolute terms. Its riskiest 10 % stop for biology at 7.1 %, against 3.4 % overall.

The base rate is the product: phase and disease area, refreshed from the database. The failure
history of a target, molecule or sponsor does carry signal on its own (single-feature AUC
0.62–0.66), but in this data most of that signal is already in phase and area.

## Data

`.cache/universe/universe_resolved_v1.jsonl.gz` holds 94,153 Phase 2, 2/3 and 3 trials (Phase 1/2
included) from ClinicalTrials.gov, with stop classifications and resolved drug targets. The
endpoint verdicts come from `.cache/universe/endpoint_outcomes.jsonl.gz` (reader version 2). The
cache dates from late September 2026.

### Labels

| Task | 1 | 0 | Excluded |
| --- | --- | --- | --- |
| **A** fails on biology | stopped (terminated or suspended) for efficacy, futility or safety, or every primary comparison missed | primary endpoint met | still running, withdrawn, non-biological stops, no readable result, split verdicts |
| **A_endpoint** | primary endpoint missed | primary endpoint met | everything without a readable posted result |
| **B** biological stop | stopped for efficacy, futility or safety | any other closed trial | running, withdrawn |

A and A_endpoint are scored on **randomized trials only**. Meeting an endpoint needs a between-group
comparison, so a single-arm trial can only ever enter task A as a failure. Scoring all trials lets
design act as a proxy for the label (`A_all` in `results.json`).

**Known at.** For a stop, the date is the stop-date estimate. For an endpoint verdict, it is the
primary completion date plus 12 months, the deadline for posting results.

### Features: only what was known at the start

- phase, disease area, sponsor class, modality of the experimental drug
- randomized, placebo arm, active comparator, number of conditions, interventions and experimental
  components, whether the drug resolved to a target, start year
- **history as of the start date:** earlier trials with the same target gene, the same molecule and
  the same lead sponsor, with their failure counts and smoothed failure rate. Only outcomes that
  were knowable before this trial started are counted.
- crowding: how many trials with the same target had started before

**Excluded on purpose:**
- enrollment count, because it is the actual number for closed trials, and stopped trials enrol
  fewer
- the stop reason, dates after the start, and whether results were posted

**One leak this study cannot close:** registry entries can be edited after the start. Design and
intervention fields are rarely edited, but they are read from today's record. The registry's
version history would close this.

## Method: walk-forward backtest

For each test year Y from 2014 to 2021:
- **Train on** trials that started before Y *and* whose outcome was knowable before 1 January Y.
- **Test on** trials that started in Y, with their eventual outcome.

The test window ends at 2021 so that most outcomes have resolved.

**Models:**
- **baseline:** failure rate by phase × disease area from the training years, shrunk toward the phase rate
- **logistic:** one-hot encoded categories and standardized numbers, L2 regularization
- **boosting:** sklearn `HistGradientBoostingClassifier`
- **lean:** a logistic adjustment of the baseline by target, molecule and sponsor history only

Results are pooled over all test years. The AUC gain over the baseline comes with a bootstrap 95 %
interval over 1,000 resamples.

## Results

| Task | Test trials | Failure rate | Baseline AUC | Logistic | Boosting | Lean | Best gain vs baseline (95 % CI) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| A, randomized | 3,666 | 54.9 % | **0.712** | 0.686 | 0.691 | 0.687 | −0.021 (−0.034 to −0.007) |
| A_endpoint, randomized | 3,055 | 45.9 % | **0.707** | 0.656 | 0.683 | 0.681 | −0.024 (−0.041 to −0.008) |
| B, all closed | 28,505 | 3.4 % | 0.555 | **0.639** | 0.632 | 0.586 | **+0.084 (+0.065 to +0.103)** |

**Calibration, task A.** The baseline's quintiles are predicted 27 / 40 / 50 / 64 / 76 % and observed
30 / 43 / 53 / 71 / 78 %. The models are overconfident at the top, predicting 90 % where 72 % was
observed.

**Phase dominates task A.** Randomized Phase 3 trials fail in 40 % of cases, Phase 2 in 71 %.
Sponsor class matters too: industry trials fail in 47 %, academic trials in 77 %. Part of that gap
is about which trials post readable results.

**What carries the gain in task B** (`importance.py`): the AUC drop when each input group is shuffled.
The model trains on starts before 2019 and tests on 2019–2021, AUC 0.61.

| Input | AUC drop |
| --- | ---: |
| sponsor history | +0.029 |
| drug resolved to a target (a defined experimental drug) | +0.024 |
| sponsor class | +0.020 |
| molecule history | +0.011 |
| target history, design, phase, area | ≤ +0.003 |

Biological stops cluster in industry trials of defined experimental drugs, and in sponsors and
molecules that have stopped before. Academic trials mostly stop for recruitment. That is a real
pattern, but it describes *who* runs a trial more than *which biology* fails.

## What this means for the product

1. **Sell the base rate, not a black box.** "Phase 2 in your area fails on its primary endpoint
   in about X % of trials, and here are the earlier failures with your target" is honest,
   calibrated, and as good as anything built here.
2. **A stop-risk flag is possible, not a precise score.** A model can put the riskiest trials at
   about twice the base rate of biological stops. That is useful for screening a portfolio, not
   for calling a single trial.
3. **What would have to change for a real model:**
   - read the record as it stood at the start (registry version history), so features like
     planned enrollment become usable
   - add outcome data beyond the registry: publications and press releases for trials that posted
     nothing readable, which is most of them (14,867 completed trials have no readable verdict)
   - add better biology features, e.g. genetic evidence for the target–indication pair (Open
     Targets), which the literature finds to be the strongest single predictor of success

## Reproduce

```bash
uv venv mlenv && VIRTUAL_ENV=mlenv uv pip install numpy pandas scikit-learn
mlenv/bin/python research/failure_prediction/build_dataset.py .cache/universe trials.pkl
mlenv/bin/python research/failure_prediction/backtest.py trials.pkl research/failure_prediction/results.json
cd research/failure_prediction && ../../mlenv/bin/python importance.py   # expects trials.pkl here
```

`results.json` holds per-year metrics, calibration bins and single-feature AUCs for every task.
