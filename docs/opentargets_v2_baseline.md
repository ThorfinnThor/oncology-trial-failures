# Open Targets benchmark baseline

Generated: 2026-08-26T19:34:53.416008+00:00

Clinical Trial Failures snapshot: `c7627dfb0cd46dff82a6421b4214138a95231f63ca403be5782865f31cb2938c`

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

| Open Targets label | Comparable texts | Primary agreements | Primary rate | Primary or secondary cause covered | Coverage rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| `Negative` | 138 | 100 | 72.5% | 108 | 78.3% |
| `Safety_Sideeffects` | 86 | 70 | 81.4% | 78 | 90.7% |
| `Insufficient_Enrollment` | 446 | 416 | 93.3% | 422 | 94.6% |
| `Regulatory` | 40 | 27 | 67.5% | 31 | 77.5% |
| `Covid19` | 12 | 12 | 100.0% | 12 | 100.0% |
| `Study_Staff_Moved` | 59 | 48 | 81.4% | 53 | 89.8% |

The primary rate is the deliberately strict original metric. Cause coverage also accepts the same evidence category when V2 preserves it as a secondary cause in a mixed or more specific classification.

For the broader biological question, Open Targets `Negative` or `Safety_Sideeffects` agrees with V2 `BIOLOGICAL_FAILURE` or `MIXED_CAUSES` for **186/210 texts (88.6%)**.

## Interpretation

- High recruitment and COVID-19 agreement supports the core normalization and cause rules.
- Lower narrow agreement for biological labels partly reflects V2's separation of efficacy, safety, biological-unspecified, and mixed causes.
- Lower regulatory agreement partly reflects V2 review gating: a committee or regulator action without a directional cause is not automatically treated as the underlying stop reason.
- Broad Open Targets labels such as `Business_Administrative`, `Study_Design`, `Logistics_Resources`, and `Invalid_Reason` are intentionally not assigned a single agreement score because they map to several V2 categories.

## Manual follow-up

A manual screen of the broad biological disagreements and the clearest non-biological anchor conflicts identified 6 high-priority V2 audit candidates. All were adjudicated against the complete registry stop statement: 4 classifications were changed and 2 were confirmed or confirmed with additional secondary detail. The decisions and rationales are recorded in `data/benchmarks/opentargets_v2_manual_review_candidates.csv` and persisted as approved V2 decisions before this final benchmark run.

The full list of narrow anchor conflicts is available in `data/benchmarks/opentargets_v2_disagreements.csv`. It contains text hashes and NCT IDs rather than republishing external stop-reason text.

The subsequent full conflict audit reviewed all **115 strict conflict rows**, representing **106 unique normalized stop-reason texts**. It identified **24 text groups** requiring a V2 correction or additional explicit secondary-cause detail. The remaining groups were confirmed as conservative classifications, mixed causes, non-failure transitions, cause-not-stated records, already-covered secondary causes, or taxonomy differences. The complete row-level decision log is stored in `data/benchmarks/opentargets_v2_full_adjudication.csv`.

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
