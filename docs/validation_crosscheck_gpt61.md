# Cross-check of the held-out validation with a second model family

Annotator: GPT-6.1 Sol (High), OpenAI GPT · labelled 2026-11-07 · 600 texts, blind to the classifier and to the published reference labels, same written guidelines.

## Why

The published reference labels came from Claude Opus and Claude Sonnet with a Claude Opus adjudicator, and the classifier rules were written in Claude sessions. If both share a blind spot, the published precision cannot show it. A model from another family labelling the same texts can.

## Agreement with the published reference labels

| | Agreement |
| --- | ---: |
| Outcome | 89.3% (536/600) |
| Outcome + primary reason | 87.0% (522/600) |
| Biological cause yes/no | 98.2% (589/600) |

## The published estimates under either reference

Same sample, same weighting, same bootstrap; only the reference labels differ.

| Metric | Published reference (Claude) | Cross-check reference (GPT) | 95% CI (cross-check) |
| --- | ---: | ---: | ---: |
| Biological-failure precision | 95.5% | 91.0% | 86.0%–95.5% |
| Biological-failure recall | 95.3% | 95.8% | 91.6%–99.0% |
| Biological-cause precision (incl. mixed) | 96.0% | 92.4% | 88.0%–96.3% |
| Precision of asserted outcomes | 84.3% | 83.7% | 79.9%–87.4% |
| Outcome accuracy, all eligible records | 82.2% | 82.4% | 78.9%–85.9% |

Neither reference is clinical ground truth. Where they differ, the true value is not known until the disputed texts below have been decided by a person.

## Disputed: biological or not (11 texts, 11 awaiting clinician review)

| Sample | Stop reason | Published reference | Cross-check | Classifier | Status |
| --- | --- | --- | --- | --- | --- |
| HV-0002 | Sirolimus usage discontinued since black box warning | BIOLOGICAL_FAILURE | NON_BIOLOGICAL | BIOLOGICAL_FAILURE | AWAITING_CLINICIAN_REVIEW |
| HV-0056 | possible lack of efficacy | BIOLOGICAL_FAILURE | UNKNOWN | BIOLOGICAL_FAILURE | AWAITING_CLINICIAN_REVIEW |
| HV-0067 | unexpected histological findings | BIOLOGICAL_FAILURE | UNKNOWN | BIOLOGICAL_FAILURE | AWAITING_CLINICIAN_REVIEW |
| HV-0082 | Preset pharmacokinetic stopping criteria met at lower doses than expected. | BIOLOGICAL_FAILURE | UNKNOWN | BIOLOGICAL_FAILURE | AWAITING_CLINICIAN_REVIEW |
| HV-0109 | The decision is based on a change in the benefit risk assessment of this drug for the lupus population targeted in this study. | BIOLOGICAL_FAILURE | UNKNOWN | BIOLOGICAL_FAILURE | AWAITING_CLINICIAN_REVIEW |
| HV-0118 | Interim analysis suggested a trend favoring ecallantide; observed response rate to placebo was substantially higher than described in medical literature. | BIOLOGICAL_FAILURE | UNKNOWN | BIOLOGICAL_FAILURE | AWAITING_CLINICIAN_REVIEW |
| HV-0136 | Terminated due to nonclinical findings | BIOLOGICAL_FAILURE | UNKNOWN | BIOLOGICAL_FAILURE | AWAITING_CLINICIAN_REVIEW |
| HV-0478 | The INHIBIT Trials IDSMB, in a letter dated 05-18-22, recommended, given the slow enrollment, that the INHIBIT Trials be discontinued due to futility. | NON_BIOLOGICAL | MIXED_CAUSES | MIXED_CAUSES | AWAITING_CLINICIAN_REVIEW |
| HV-0492 | Removal of Adrénaline lots for safety reasons. | NON_BIOLOGICAL | BIOLOGICAL_FAILURE | MIXED_CAUSES | AWAITING_CLINICIAN_REVIEW |
| HV-0508 | The patient passed before treatment could be started | NON_FAILURE_TRANSITION | BIOLOGICAL_FAILURE | UNKNOWN | AWAITING_CLINICIAN_REVIEW |
| HV-0575 | Response rate in placebo group for primary outcome was 100% on interim analysis. | BIOLOGICAL_FAILURE | UNKNOWN | UNKNOWN | AWAITING_CLINICIAN_REVIEW |

To record a reviewer's decision, add it to `validation/crosscheck_gpt61/decisions.json` and re-run: `{"HV-0056": {"status": "DECIDED", "verdict": {"outcome": "UNKNOWN", "primary_reason": "UNSPECIFIED", "reviewer": "clinician", "decided_at": "YYYY-MM-DD"}}}`. Decisions are kept across runs.

The other disagreements are between non-biological classes (e.g. not initiated vs. recruitment, cause not stated vs. unknown) and do not affect the biological rates.

Reproduce: `python scripts/crosscheck_heldout_v2.py`
