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

**Round 2: genetic evidence from Open Targets.** It is a real, independent effect, but it does not
move the prediction. Outside oncology, trials whose target has genetic evidence for the indication
fail less often, odds ratio about 0.6–0.7 after controlling for phase and area. In oncology there is
no effect, because germline genetics says little about tumours. Added to the base rate, the AUC
gain is +0.001 overall and +0.003 to +0.004 on mapped trials, and neither is distinguishable from
zero. Section "Round 2" has the numbers.

**The record as it stood at the start** is not done. ClinicalTrials.gov's version history is served
only to browsers, and the monthly AACT snapshots need an account. See "Not done".

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

## Round 2: genetic evidence (Open Targets)

`fetch_opentargets.py` queries the public Open Targets Platform GraphQL API (release 26.09):
- **Mapping:** MeSH condition terms map to disease IDs, and target genes map to Ensembl IDs.
- **Scores:** for each (disease, target) pair, including indirect ontology evidence, the script
  reads the datatype scores. Only datatypes that do not encode clinical outcomes are used:
  genetic association, somatic mutation, animal model, affected pathway and RNA expression. The
  `known_drug` datatype is excluded, because it is built from trial outcomes and would leak them.
- **Coverage:** 1,204 of 2,348 MeSH terms and 1,410 of 1,579 genes mapped. 14,202 of 24,392
  labelled trials with a target have a mapped pair, and 4,191 of those have genetic evidence.

**Effect.** Fail and miss rates, randomized trials with a mapped pair:

| | With genetic evidence | Without |
| --- | ---: | ---: |
| Task A, Phase 2 | 63 % (n = 217) | 73 % (n = 528) |
| Task A, Phase 3 | 28 % (n = 500) | 42 % (n = 755) |
| A_endpoint (missed), Phase 3 | 23 % (n = 471) | 33 % (n = 653) |
| Task B (biological stop), Phase 3 | 2.3 % (n = 1,608) | 4.0 % (n = 2,985) |

The crude odds ratio for task A is 0.51. Within phase × area strata (Mantel–Haenszel) it is 0.70.
Split by area, it is 0.63 outside oncology and 1.07 in oncology. Part of the crude effect is area:
82 % of endocrine and metabolic trials have genetic evidence, and only 17 % of them fail.

**Prediction.** `genetics_backtest.py` uses the same walk-forward design. The model is the base
rate's logit (cross-fitted on the training rows) plus three inputs: mapped, genetic evidence, and
genetic evidence outside oncology.

| Task | Baseline AUC | + genetics | Gain (95 % CI) | Gain on mapped trials (95 % CI) |
| --- | ---: | ---: | --- | --- |
| A, randomized | 0.712 | 0.713 | +0.000 (−0.003 to +0.004) | +0.003 (−0.006 to +0.012) |
| A_endpoint | 0.707 | 0.708 | +0.001 (−0.002 to +0.004) | +0.004 (−0.004 to +0.012) |
| B, biological stop | 0.555 | 0.579 | **+0.024 (+0.013 to +0.037)** | +0.009 (−0.007 to +0.024) |

The full models in `backtest.py`, with the Open Targets columns added (`results_ot.json`), stay below
the baseline on task A (0.69). Genetic evidence on its own reaches AUC 0.54 in task A.

**Why a real effect barely moves AUC.** The input is yes or no, it applies to about a third of
trials, and its effect (OR about 0.6) is smaller than the gap between phases. It shifts
probabilities, which is worth showing to a user, but it reorders few trials. The evidence is also
today's, not what was known at each trial's start. That can only flatter the result, and it still
adds nothing measurable.

## Not done: the record as it stood at the start

- **Version history:** ClinicalTrials.gov keeps every version of a record. The site serves the
  history to browsers and refuses scripted requests (403), so it was not used.
- **AACT monthly snapshots:** CTTI keeps a permanent full copy of the registry for each month,
  but downloading it needs an AACT account.

With either source, the planned enrollment, the primary outcome as first registered, masking and
the number of sites could be read as they were on the start date. Planned enrollment is the
feature the literature rates most useful after phase and area.

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
   - genetic evidence was tried in round 2. It is a real effect worth showing next to the base rate
     ("targets with genetic support fail about a third less often outside oncology"), but it does
     not improve ranking

## Reproduce

```bash
uv venv mlenv && VIRTUAL_ENV=mlenv uv pip install numpy pandas scikit-learn
mlenv/bin/python research/failure_prediction/build_dataset.py .cache/universe trials.pkl
mlenv/bin/python research/failure_prediction/backtest.py trials.pkl research/failure_prediction/results.json
cd research/failure_prediction && ../../mlenv/bin/python importance.py   # expects trials.pkl here
```

Round 2 needs `truststore` and `requests` in the same environment:

```bash
mlenv/bin/python research/failure_prediction/fetch_opentargets.py .cache/universe/universe_resolved_v1.jsonl.gz trials.pkl ot_cache
mlenv/bin/python research/failure_prediction/backtest.py trials.pkl results_ot.json ot_cache/trial_features.json
mlenv/bin/python research/failure_prediction/genetics_backtest.py trials.pkl ot_cache/trial_features.json results_genetics.json
```

`results.json` holds per-year metrics, calibration bins and single-feature AUCs for every task.
