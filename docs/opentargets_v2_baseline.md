# Open Targets benchmark baseline

Generated: 2026-08-26T18:00:26.870713+00:00

Clinical Trial Failures snapshot: `6b082ffa452549eecf673de0a93fcad1bed5bf1d8b61438c30a62e3c73bc96a7`

Classifier versions: `2.7.0` (23,617)

Open Targets commit: [`2c6c46871b025d47c494f0cfc2235dcf2cadc1fd`](https://huggingface.co/datasets/opentargets/clinical_trial_reason_to_stop/commit/2c6c46871b025d47c494f0cfc2235dcf2cadc1fd)

## Purpose

This report establishes the pre-automation V2 benchmark against the public Open Targets `clinical_trial_reason_to_stop` dataset. It is a conservative external plausibility check, not a ground-truth evaluation. The taxonomies differ and Open Targets does not provide NCT IDs.

## Snapshot

| Dataset | Rows | Rows/texts with a stop reason | Identifier |
| --- | ---: | ---: | --- |
| Clinical Trial Failures V2 | 23,617 | 21,480 | NCT ID included |
| Open Targets | 3,747 | 3,488 unique normalized texts | No NCT ID |

## Exact normalized-text overlap

| Metric | Result |
| --- | ---: |
| Open Targets rows matched | 1,598 / 3,747 (42.6%) |
| Unique Open Targets texts matched | 1,411 / 3,488 (40.5%) |
| Clinical Trial Failures NCT records sharing a matched text | 6,263 / 23,617 (26.5%) |
| Matched Open Targets rows with multiple possible NCT records | 539 |

The NCT-record count is a candidate overlap, not a trial-level join. Generic stop reasons can occur in multiple records and Open Targets does not expose the original NCT ID.

## Comparable anchors

Each unique normalized text contributes at most one comparison per Open Targets label. "Any agreement" means that at least one Clinical Trial Failures record with the same text satisfies the narrow mapping defined in the benchmark script.

| Open Targets label | Comparable texts | Any agreements | Agreement rate |
| --- | ---: | ---: | ---: |
| `Negative` | 138 | 101 | 73.2% |
| `Safety_Sideeffects` | 86 | 66 | 76.7% |
| `Insufficient_Enrollment` | 446 | 413 | 92.6% |
| `Regulatory` | 40 | 25 | 62.5% |
| `Covid19` | 12 | 12 | 100.0% |
| `Study_Staff_Moved` | 59 | 47 | 79.7% |

For the broader biological question, Open Targets `Negative` or `Safety_Sideeffects` agrees with V2 `BIOLOGICAL_FAILURE` or `MIXED_CAUSES` for **184/210 texts (87.6%)**.

## Interpretation

- High recruitment and COVID-19 agreement supports the core normalization and cause rules.
- Lower narrow agreement for biological labels partly reflects V2's separation of efficacy, safety, biological-unspecified, and mixed causes.
- Lower regulatory agreement partly reflects V2 review gating: a committee or regulator action without a directional cause is not automatically treated as the underlying stop reason.
- Broad Open Targets labels such as `Business_Administrative`, `Study_Design`, `Logistics_Resources`, and `Invalid_Reason` are intentionally not assigned a single agreement score because they map to several V2 categories.

## Manual follow-up

A manual screen of the broad biological disagreements and the clearest non-biological anchor conflicts identified six high-priority V2 audit candidates. They are recorded in `data/benchmarks/opentargets_v2_manual_review_candidates.csv`. These are review candidates, not accepted Open Targets corrections, and no V2 label is changed by this benchmark.

The full list of narrow anchor conflicts is available in `data/benchmarks/opentargets_v2_disagreements.csv`. It contains text hashes and NCT IDs rather than republishing external stop-reason text.

## Method

1. Pin the Open Targets dataset to commit `2c6c46871b025d47c494f0cfc2235dcf2cadc1fd` and verify SHA-256 `d7e384b6eecfa72e42e5688ce914fc73e4bc7f83357d11caa921ce5f3df57b14`.
2. Decode HTML entities, normalize Unicode, replace the source `Ê` spacing artifact, lowercase, remove punctuation, and collapse whitespace.
3. Match only identical normalized reason strings. No fuzzy matches are included.
4. Compare labels at the unique-text level to avoid overweighting repeated generic stop reasons.
5. Keep disagreement details text-free in the committed CSV; use the included NCT IDs to inspect source language in the local dataset.

## Limitations

- Open Targets has no NCT IDs, so exact trial-level overlap cannot be established.
- The classification systems are many-to-many rather than equivalent.
- Open Targets may reflect older registry text while V2 uses the current repository snapshot.
- This benchmark measures agreement with an external annotation set, not medical or causal correctness.
- Fuzzy matching is excluded from the baseline to avoid false overlap.

## Reproduce

```bash
python3 scripts/benchmark_opentargets_v2.py
```

For an already downloaded pinned file:

```bash
python3 scripts/benchmark_opentargets_v2.py --open-targets-file /path/to/data.json
```
