# Discontinuation benchmarks — methodology

Benchmarks put each biological stop in context: how often trials in a comparable group stopped for
efficacy, safety or benefit–risk reasons.

## Universe (denominator)

- ClinicalTrials.gov interventional trials with Phase 2 or Phase 3 (Phase 1/2 counts as Phase 2,
  Phase 2/3 as Phase 3), start date from 2010, all statuses (`scripts/universe/fetch_universe.py`).
- Disease area uses the same mapping as the stopped-trial dataset; benchmarks default to oncology.
- Stopped trials carry the Classification V2 result from the canonical snapshot, or the same
  classifier with the reviewed-reason index for trials outside the snapshot window.

## Entity resolution

- Offline index of clinical-stage ChEMBL molecules (max phase ≥ 0.5) with synonyms, mechanisms and
  targets (`scripts/universe/chembl_index.py`).
- Exact normalized matching of component names, registry other names, parenthetical aliases and
  cleaned forms; common regimen acronyms (FOLFOX, R-CHOP, …) are expanded; several matching molecules
  = AMBIGUOUS, none = UNRESOLVED (`scripts/universe/resolve.py`).
- Modality from the ChEMBL molecule type plus name rules for ADCs, cell therapies and vaccines.
- Resolution rates are published per release in `resolution_report.json`.

## Definitions

| Term | Definition |
| --- | --- |
| Closed trial | Status COMPLETED or TERMINATED. WITHDRAWN (never enrolled), SUSPENDED, UNKNOWN and ongoing trials are excluded. |
| Biological stop | TERMINATED with outcome BIOLOGICAL_FAILURE, or MIXED_CAUSES including efficacy, safety or unspecified biological cause. |
| Discontinuation rate | Biological stops ÷ closed trials, with a 95% Wilson interval. |
| Lower bound | Biological stops ÷ all trials that were not withdrawn (assumes every open trial completes). |
| Segment | Target or gene of any experimental-arm drug; combination partners may sit in experimental or backbone arms. |
| Stop date estimate | Actual primary completion date for stopped trials; last update posting when unavailable (basis recorded). |

Default start window ends four years before the current year so most trials have had time to close.

## What the rate is not

- **Not a failure rate.** Trials that completed and missed their endpoints are not detected; the rate
  measures early discontinuation for biological reasons reported in the registry.
- **Not causal.** Stop reasons are sponsor-reported and can be incomplete.
- **Trial-level, not program-level.** A program discontinued after a completed pivotal trial may show
  no stopped trials.
- Rates among closed trials can be inflated for recent cohorts because early stops close sooner than
  completions; use older start windows and the lower bound for recent cohorts.

## Reproduce

```bash
python scripts/universe/run_universe_tests.py
python scripts/universe/fetch_universe.py
python scripts/universe/chembl_index.py
python scripts/universe/resolve.py
python scripts/universe/benchmarks.py --tables --genes TIGIT --with-genes PDCD1,CD274 --compare-with-genes PDCD1,CD274 --start 2015:2024
```
