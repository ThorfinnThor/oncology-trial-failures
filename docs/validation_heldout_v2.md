# Held-out validation — Classification V2

Generated: 2026-09-15T13:59:42Z · Dataset `2026-09-14` · Classifier `2.7.0`

## Summary

| Metric (eligible population, weighted) | Estimate | 95% CI |
| --- | ---: | ---: |
| Precision of asserted outcomes | 84.3% | 80.4%–88.0% |
| Precision of asserted outcome + primary reason | 78.2% | 73.6%–82.4% |
| Asserted records without material disagreement¹ | 88.4% | 85.1%–91.3% |
| Biological-cause precision (incl. mixed)² | 96.0% | 92.5%–98.7% |
| Biological-cause recall (incl. mixed)² | 97.2% | 93.4%–100.0% |
| Biological-failure precision | 95.5% | 91.6%–98.7% |
| Biological-failure recall | 95.3% | 91.3%–98.3% |
| Outcome accuracy, all eligible records | 82.2% | 78.5%–85.6% |

¹ Exact outcome + primary reason, or only a convention difference between `NON_BIOLOGICAL` with secondary causes and `MIXED_CAUSES` (or `BIOLOGICAL_FAILURE` vs `MIXED_CAUSES`) where the stated causes and the biological domain agree.  
² A record carries a biological cause if its outcome is `BIOLOGICAL_FAILURE`, or `MIXED_CAUSES` with an efficacy, safety or unspecified-biological reason.

## Design

- **Sample:** 600 unique stop-reason texts, stratified by predicted V2 outcome, fixed seed `20260915` (`scripts/build_heldout_validation_sample_v2.py`).
- **Held out:** 4,159 text hashes used for writing, auditing or adjudicating the rules were excluded (reviewed-reason index, 4,000-record audit gold set, golden tests, manual decisions, Open Targets adjudications), as well as 6,302 records classified by exact reviewed text and 2,162 records without stop-reason text.
- **Eligible population:** 13,729 of 23,766 records (rule-classified records whose text was never used for tuning).
- **Reference labels:** two independent LLM annotators (different model families) labelled every text blind — without classifier output — using written guidelines (`validation/LABELING_GUIDELINES.md`). Disagreements on outcome or primary reason were resolved by a third, independent LLM adjudicator.
- **Inter-annotator agreement:** outcome 93.8% (Cohen's κ 0.92); outcome + primary reason 90.7%; 56 adjudicated.
- **Weighting:** per-stratum results are scaled to the eligible record population; intervals from a 2,000-sample stratified bootstrap. Per-stratum intervals are Wilson score intervals.

## Precision by predicted outcome

| Predicted outcome | Eligible records | Sampled texts | Outcome precision | Outcome + primary reason |
| --- | ---: | ---: | ---: | ---: |
| `BIOLOGICAL_FAILURE` | 1,654 | 150 | 96.0% (91.5%–98.2%) | 92.7% (87.3%–95.9%) |
| `CAUSE_NOT_STATED` | 882 | 60 | 81.7% (70.1%–89.4%) | 78.3% (66.4%–86.9%) |
| `MIXED_CAUSES` | 157 | 40 | 42.5% (28.5%–57.8%) | 42.5% (28.5%–57.8%) |
| `NON_BIOLOGICAL` | 9,004 | 200 | 83.5% (77.7%–88.0%) | 75.5% (69.1%–80.9%) |
| `NON_FAILURE_TRANSITION` | 942 | 50 | 78.0% (64.8%–87.2%) | 76.0% (62.6%–85.7%) |
| `UNKNOWN` | 1,090 | 100 | 54.0% (44.3%–63.4%) | 54.0% (44.3%–63.4%) |

## Confusion (sample counts, predicted → reference)

| Predicted \ Reference | `BIOLOGICAL_FAILURE` | `NON_BIOLOGICAL` | `MIXED_CAUSES` | `NON_FAILURE_TRANSITION` | `CAUSE_NOT_STATED` | `UNKNOWN` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `BIOLOGICAL_FAILURE` | 144 | 2 | 2 | 0 | 0 | 2 |
| `NON_BIOLOGICAL` | 0 | 167 | 25 | 5 | 1 | 3 |
| `MIXED_CAUSES` | 8 | 11 | 17 | 4 | 0 | 0 |
| `NON_FAILURE_TRANSITION` | 0 | 7 | 1 | 39 | 1 | 2 |
| `CAUSE_NOT_STATED` | 1 | 4 | 0 | 4 | 49 | 2 |
| `UNKNOWN` | 2 | 18 | 2 | 12 | 11 | 54 |

## Limitations

- Reference labels are LLM-adjudicated, not expert-curated. They are independent of the classifier, but not a clinical ground truth.
- The registry stop-reason text is the only evidence; the true cause may differ from what the sponsor recorded.
- Records resolved via exact reviewed text and records without stop-reason text are outside this estimate.
- The `UNKNOWN` stratum measures how often a resolvable reason was left unresolved (conservatism), not a false claim.

Reproduce: `python scripts/build_heldout_validation_sample_v2.py && python scripts/evaluate_heldout_validation_v2.py`
