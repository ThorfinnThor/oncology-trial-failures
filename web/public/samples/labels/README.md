# Clinical Trial Failures — why trials stopped (labelled sample)

*Why did a clinical trial stop?* Every terminated, withdrawn or suspended trial on ClinicalTrials.gov, classified from the sponsor's stated reason into biological failure (efficacy, safety) and non-biological causes. This is a sample of the full, weekly-updated dataset at [clinicaltrialfailures.com](https://clinicaltrialfailures.com); validation at [clinicaltrialfailures.com/validation](https://clinicaltrialfailures.com/validation).

**Full dataset, every disease area, weekly updates and clinician-reviewed labels:** [clinicaltrialfailures.com/pricing](https://clinicaltrialfailures.com/pricing) · contact@clinicaltrialfailures.com

Release 2026-11-20 (ClinicalTrials.gov snapshot, imported 2026-11-23). Prepared 2026-11-23.

This sample shows the two kinds of labels we produce, in the format we would deliver. The public sample is under CC BY-NC 4.0; the full, weekly-updated data is licensed commercially (see *Licence*).

| File | Rows | What it is |
| --- | ---: | --- |
| `stop_reason_labels_sample.csv` | 240 | Stopped trials, labelled by **why** they stopped |
| `endpoint_labels_sample.csv` | 120 | Trials labelled by whether the sponsor's **posted primary analysis** met or missed |
| `README.md` | — | Label definitions, columns, method, validation, limits |

Scope: interventional trials, 15 disease areas; phase 2/3. Both samples are drawn with a fixed seed; the stop-reason sample is stratified by outcome and spread across disease areas, so rare classes are over-represented compared with the full data.

---

## 1. Stop-reason labels

The full dataset holds 24,124 trials with status TERMINATED, WITHDRAWN or SUSPENDED on ClinicalTrials.gov, all disease areas, rebuilt every week.

| `label_outcome` | Full dataset | In this sample |
| --- | ---: | ---: |
| `BIOLOGICAL_FAILURE` | 2,462 | 86 |
| `MIXED_CAUSES` | 230 | 20 |
| `NON_BIOLOGICAL` | 14,177 | 70 |
| `NON_FAILURE_TRANSITION` | 1,613 | 20 |
| `CAUSE_NOT_STATED` | 1,999 | 20 |
| `UNRESOLVED` | 3,643 | 24 |

### Label definitions

| `label_outcome` | Meaning | `label_primary_reason` values |
| --- | --- | --- |
| `BIOLOGICAL_FAILURE` | The sponsor's stated reason is about the drug's effect: efficacy/futility, safety, or an explicitly unfavourable benefit–risk | `EFFICACY_FUTILITY` (1,658), `SAFETY` (630), `BIOLOGICAL_UNSPECIFIED` (174) |
| `MIXED_CAUSES` | Several explicit causes, kept together rather than forced into one. Not necessarily biological: check `label_secondary_reasons` for `EFFICACY_FUTILITY`, `SAFETY` or `BIOLOGICAL_UNSPECIFIED` | `MULTIPLE` |
| `NON_BIOLOGICAL` | Stopped for a reason unrelated to the drug's effect | `RECRUITMENT`, `BUSINESS_STRATEGY`, `FUNDING`, `STAFFING_RESOURCES`, `PROTOCOL_FEASIBILITY`, `SUPPLY_MANUFACTURING`, `REGULATORY`, `EXTERNAL_DISRUPTION`, `OPERATIONAL_OTHER`, `SUPPORT_WITHDRAWAL` |
| `NON_FAILURE_TRANSITION` | Not a failure: a planned milestone, a replacement study, or a trial that never started | `PLANNED_MILESTONE`, `REPLACEMENT_TRANSITION`, `NOT_INITIATED` |
| `CAUSE_NOT_STATED` | A decision is stated ("sponsor decision") but no cause | `DECISION_WITHOUT_STATED_CAUSE`, `PROGRAM_ACTION_WITHOUT_STATED_CAUSE` |
| `UNRESOLVED` | No stop reason, or text too ambiguous to label; routed to review instead of guessed | `UNRESOLVED_*` (the suffix says why) |

For a success/failure model, `BIOLOGICAL_FAILURE` is the failure class. The other outcomes are **not** success labels: they say the trial stopped for another reason, or that we cannot tell. We recommend excluding them rather than treating them as negatives.

### Columns — `stop_reason_labels_sample.csv`

| Column | Content | Source |
| --- | --- | --- |
| `nct_id`, `brief_title`, `overall_status`, `phases`, `conditions`, `intervention_names`, `intervention_types`, `lead_sponsor`, `start_date`, `primary_completion_date` | Registry fields as filed | ClinicalTrials.gov |
| `disease_area` | One of 15 areas, derived from conditions and MeSH terms | Ours |
| `why_stopped` | The sponsor's stop reason, verbatim | ClinicalTrials.gov |
| `label_outcome`, `label_primary_reason` | See above | Ours |
| `label_secondary_reasons` | Further explicit causes, separated by `; ` | Ours |
| `label_evidence` | Machine-readable trace: classifier version, outcome, reason, and each rule that fired with the text it matched | Ours |
| `label_basis` | `rule`, `reviewed_decision` (this exact text was decided in an earlier review — AI-assisted, a few by the maintainer — not by clinicians, and the decision is reused), `rule_on_description` (no stop reason; a description sentence was used), `unresolved` | Ours |
| `needs_review` | `True` where the classifier flags the row | Ours |
| `classifier_version` | Version of the rules | Ours |
| `registry_url` | Link to the trial record | ClinicalTrials.gov |

Full dataset by `label_basis`: `rule` 14,054 · `reviewed_decision` 6,446 · `unresolved` 3,526 · `sec_filing` 50 · `rule_on_description` 48.

---

## 2. Endpoint labels (posted primary results)

For trials that posted results on ClinicalTrials.gov, we read the sponsor's own primary superiority comparison: `MET` (every comparison read was significant), `MISSED` (none was, or the sponsor states the primary endpoint was not met), `MIXED` (some were, some not).

- Only outcome measures the sponsor marked PRIMARY; only superiority analyses. Non-inferiority, adverse-event outcomes and Bayesian analyses are not read.
- A result is called met or missed only against a threshold the record states, one its posted interval implies, or where every conventional threshold agrees. Everything else is "not assessable" and left out.
- Only misses are read from prose; "met" is never read from prose.
- `MET` means statistically significant. It does not check the direction of the effect and is not approval. `MISSED` can reflect dose, population, endpoint or comparator, not only the molecule.

This sample: stopped trials that posted results (40 `MET`, 60 `MISSED`, 20 `MIXED`). A stopped trial can still be `MET`, e.g. when stopped early for efficacy — compare `stop_label_outcome`. The same reader runs over completed Phase 2/3 trials; those labels can be included on request.

| Column | Content |
| --- | --- |
| `endpoint_label`, `endpoint_label_basis` | `MET`/`MISSED`/`MIXED`; `posted_analysis` or `sponsor_statement` |
| `sponsor_statement`, `sponsor_statement_location` | The sponsor's own sentence, where the label rests on one |
| `primary_comparisons_read` | Each primary comparison read, `\|\|`-separated: measure, p or interval, the threshold applied and why, effect estimate, method |
| `stop_label_outcome`, `stop_label_primary_reason`, `why_stopped` | The stop-reason label of the same trial |
| `results_url` | The posted results |

---

## 3. How the labels are produced and checked

- A versioned rule-based classifier reads the registry stop reason. Every rule must survive negation ("not due to safety concerns" is not a safety stop). Novel or empty language goes to `UNRESOLVED`.
- Exact stop-reason texts decided in an earlier review (AI-assisted, a few by the maintainer) override the rules.
- Validation: a held-out sample of 600 stop-reason texts never used to build the rules, labelled blind by AI annotators. Biological-failure precision 95.5% (95% CI 91.6%–98.7%), recall 95.3%. Measured on classifier 2.7.0; the labels here come from a later version, whose rule changes are each listed with every label they changed.
- Cross-check by a model from a second model family: 98.2% agreement on biological vs. non-biological; against its labels, biological-failure precision is 91.0%. 0 disputed texts await clinician review.
- Clinician review (first batch): one clinician scientist judged 150 oncology stop reasons blind to our label. Of the 103 we label biological, 101 were confirmed: precision 98.1% (95% CI 93.2%–99.5%); biological yes/no agreed on 148 of 150. One reviewer so far; 24 texts had been discussed with us before they were answered (without them: 125 of 126). Individual clinician verdicts are not part of this sample.
- Full protocol and results: https://clinicaltrialfailures.com/validation

## 4. Limits

- A stop reason is what the sponsor wrote, not independent proof of why a drug failed.
- Safety failures are labelled from stop reasons only; adverse-event outcomes are not analysed.
- Endpoint labels cover results posted on ClinicalTrials.gov; publications are not read.
- `disease_area` is keyword-based.

## Licence

CC BY-NC 4.0: free for non-commercial use, including research and model training, with attribution. Commercial use — in a product, a commercial model or for a company's own pipeline decisions — needs a commercial licence, which also covers the full dataset, weekly updates and the clinician-reviewed labels as review proceeds. Registry fields remain under ClinicalTrials.gov's terms.

Cite: Clinical Trial Failures, https://clinicaltrialfailures.com, Zenodo DOI 10.5281/zenodo.23558833.

Contact: contact@clinicaltrialfailures.com
