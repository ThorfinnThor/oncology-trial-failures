# Classification change 23 Nov 2026: per-trial labels from the EU register (CTIS)

From the next weekly run, 13 trials whose registry text gives no cause take their label from what the EU Clinical Trials Information System records (`classification_source = CTIS_REVIEWED`, confidence MEDIUM): the coded early-termination category per member state and, where the termination is coded only as "Sponsor Decision", a safety-coded halt that was never lifted. Decisions: `data/ctis_evidence_decisions.csv`; 13 rejected with reasons: `data/ctis_evidence_rejected.csv`; rules: `docs/ctis_weekly.md`; probe: `docs/eu_register_probe_2026-11-23.md`.

Reviewed with AI assistance (Claude), not by a clinician. The evidence carries the CTIS number, the categories and our summary; no sponsor text.

## Transitions (final outcome)

| From | To | Trials |
|---|---|---|
| CAUSE_NOT_STATED | BIOLOGICAL_FAILURE | 6 |
| UNRESOLVED | NON_BIOLOGICAL | 4 |
| UNRESOLVED | BIOLOGICAL_FAILURE | 2 |
| CAUSE_NOT_STATED | MIXED_CAUSES | 1 |

By cause: SAFETY 8, SAFETY + RECRUITMENT (MIXED_CAUSES) 1, BUSINESS_STRATEGY 2, RECRUITMENT 2. With the 9 publication decisions of the same day, biological labels go from 2,462 to 2,478 (validator on a simulated run).

## Every changed trial

| Trial | Registry stop reason | Before | After | CTIS | Recorded | Our summary |
|---|---|---|---|---|---|---|
| [NCT05159388](https://clinicaltrials.gov/study/NCT05159388) | Sponsor decision to terminate during Phase 1 | CAUSE_NOT_STATED / DECISION_WITHOUT_STATED_CAUSE | BIOLOGICAL_FAILURE / SAFETY | [2023-510046-25-00](https://euclinicaltrials.eu/ctis-public/view/2023-510046-25-00) | Safety Related (early termination); safety-related halt; Belgium, France; halt Belgium, Spain | Ended early for safety-related reasons, recorded by the sponsor in the EU register after a safety-related halt. |
| [NCT05856526](https://clinicaltrials.gov/study/NCT05856526) | (none) | UNRESOLVED / UNRESOLVED_MISSING_STOP_REASON | NON_BIOLOGICAL / RECRUITMENT | [2022-501104-10-00](https://euclinicaltrials.eu/ctis-public/view/2022-501104-10-00) | Feasibility (recruitment issues, etc); Belgium, Spain (Austria, Czechia: Sponsor Decision) | Ended for feasibility (recruitment) reasons in two of four EU countries; the others give no reason. |
| [NCT05900050](https://clinicaltrials.gov/study/NCT05900050) | Sponsor Decision | CAUSE_NOT_STATED / DECISION_WITHOUT_STATED_CAUSE | BIOLOGICAL_FAILURE / SAFETY | [2024-513706-56-00](https://euclinicaltrials.eu/ctis-public/view/2024-513706-56-00) | Safety Related (early termination); urgent safety measure; France, Germany, Spain, Hungary, Italy (Belgium: Sponsor Decision) | Ended early for safety-related reasons in five of six EU countries, after an urgent safety measure. |
| [NCT06055075](https://clinicaltrials.gov/study/NCT06055075) | The study was terminated prematurely because the Sponsor decided not to pursue the development of forimtamig. | UNRESOLVED / UNRESOLVED_PROGRAM_ACTION_WITHOUT_UNDERLYING_CAUSE | NON_BIOLOGICAL / BUSINESS_STRATEGY | [2023-503689-21-00](https://euclinicaltrials.eu/ctis-public/view/2023-503689-21-00) | Reprioritisation of Trial; Denmark, Germany, Italy (France, Spain: Sponsor Decision) | Ended as a reprioritisation; the registry adds that the sponsor stopped developing the drug. |
| [NCT06142383](https://clinicaltrials.gov/study/NCT06142383) | Sponsor Decision | CAUSE_NOT_STATED / DECISION_WITHOUT_STATED_CAUSE | BIOLOGICAL_FAILURE / SAFETY | [2023-504678-39-00](https://euclinicaltrials.eu/ctis-public/view/2023-504678-39-00) | Safety-related halt in every country, never lifted; urgent safety measure; then early termination; Bulgaria, Czechia, France, Germany, Hungary, Italy, Portugal, Slovakia, Spain | Recruitment and dosing were halted for safety-related reasons in every EU country, with an urgent safety measure, and the trial was ended without restarting. |
| [NCT06488716](https://clinicaltrials.gov/study/NCT06488716) | Following a thorough review of safety data, preliminary efficacy data and an evaluation of overall risk-benefit, Sponsor made the decision to end the study. | UNRESOLVED / UNRESOLVED_BIOLOGICAL_DOMAIN_UNSPECIFIED | BIOLOGICAL_FAILURE / SAFETY | [2024-513391-17-00](https://euclinicaltrials.eu/ctis-public/view/2024-513391-17-00) | Safety-related halt (related grade 5 event, stopping criteria met); Spain; ended France, Italy, Spain | Halted after a treatment-related fatal adverse event met the protocol stopping criteria, then ended; the registry cites the safety review and the overall benefit-risk. |
| [NCT06509906](https://clinicaltrials.gov/study/NCT06509906) | Sponsor Decision | CAUSE_NOT_STATED / DECISION_WITHOUT_STATED_CAUSE | BIOLOGICAL_FAILURE / SAFETY | [2024-514155-15-00](https://euclinicaltrials.eu/ctis-public/view/2024-514155-15-00) | Safety Related (early termination); halt on the safety committee's recommendation; Spain | Halted on the safety committee's advice after poor tolerance and febrile neutropenia in the first participants on the combination, then ended for safety-related reasons. |
| [NCT06528093](https://clinicaltrials.gov/study/NCT06528093) | (none) | UNRESOLVED / UNRESOLVED_MISSING_STOP_REASON | BIOLOGICAL_FAILURE / SAFETY | [2023-508998-85-00](https://euclinicaltrials.eu/ctis-public/view/2023-508998-85-00) | Safety Related (early termination); Belgium, France, Germany, Spain | Ended early for safety-related reasons in every EU country. |
| [NCT06607484](https://clinicaltrials.gov/study/NCT06607484) | Sponsor decision | CAUSE_NOT_STATED / DECISION_WITHOUT_STATED_CAUSE | BIOLOGICAL_FAILURE / SAFETY | [2023-507753-15-00](https://euclinicaltrials.eu/ctis-public/view/2023-507753-15-00) | Safety-related recruitment halt, never lifted; then early termination; Austria | Recruitment was halted for safety-related reasons and the trial was ended without restarting. |
| [NCT06679582](https://clinicaltrials.gov/study/NCT06679582) | Terminated Early | UNRESOLVED / UNRESOLVED_ABBREVIATION_OR_FRAGMENT | NON_BIOLOGICAL / BUSINESS_STRATEGY | [2023-506240-16-00](https://euclinicaltrials.eu/ctis-public/view/2023-506240-16-00) | Reprioritisation of Trial; Austria, Denmark, France, Germany, Italy, Netherlands, Spain | Ended as a reprioritisation in every EU country. |
| [NCT06716853](https://clinicaltrials.gov/study/NCT06716853) | Persistent challenges have been encountered in patient recruitment, difficulty in identifying a sufficient number of eligible subjects. The decision to terminate the study was not based on any safety concerns. Benefit-risk profile of IP unchanged. | UNRESOLVED / UNRESOLVED_NEGATED_SIGNAL_WITHOUT_AFFIRMATIVE_CAUSE | NON_BIOLOGICAL / RECRUITMENT | [2024-512898-27-00](https://euclinicaltrials.eu/ctis-public/view/2024-512898-27-00) | Feasibility (recruitment issues, etc); Italy | Ended for feasibility (recruitment) reasons, matching the registry text on persistent recruitment problems. |
| [NCT06882746](https://clinicaltrials.gov/study/NCT06882746) | Sponsor decision | CAUSE_NOT_STATED / DECISION_WITHOUT_STATED_CAUSE | MIXED_CAUSES / MULTIPLE (SAFETY; RECRUITMENT) | [2024-519301-36-00](https://euclinicaltrials.eu/ctis-public/view/2024-519301-36-00) | Feasibility (early termination); safety-related halt, never lifted; Germany, Spain | Halted for safety-related reasons, then ended for feasibility (recruitment) reasons; both are recorded in the EU register. |
| [NCT06987968](https://clinicaltrials.gov/study/NCT06987968) | Sponsor decision | CAUSE_NOT_STATED / DECISION_WITHOUT_STATED_CAUSE | BIOLOGICAL_FAILURE / SAFETY | [2025-521029-34-00](https://euclinicaltrials.eu/ctis-public/view/2025-521029-34-00) | Safety Related (early termination); urgent safety measure; Belgium, France, Germany, Spain | Ended early for safety-related reasons in every EU country, after an urgent safety measure. |

## Not accepted

| Trial | Why |
|---|---|
| NCT02615184 | "Study Related" with a halt over lab-test (IVDR) compliance; no cause for the termination itself. |
| NCT04222972 | Only an urgent safety measure, content not public; the registry text already gives a business reason (a rule gap, see TODO). |
| NCT05171049 | "Sponsor Decision" everywhere; the benefit-risk flag on the halt comes without a reason. |
| NCT05386550 | Only an urgent safety measure, content not public. |
| NCT05462990 | "Sponsor Decision"; the halt justification refers to an attached document that is not public. |
| NCT05492500 | "Sponsor Decision" and an urgent safety measure whose content is not public. |
| NCT05839600 | A study-management hold for a planned analysis; termination "Sponsor Decision". |
| NCT05999357 | "Medicinal Product Related" in one country without detail; the registry says development stopped. |
| NCT06032546 | Feasibility in one of five countries; the others "Sponsor Decision". |
| NCT06084689 | Feasibility in France, but the registry says development of the molecule stopped; the two do not agree. |
| NCT06139328 | Halt to reduce the burden and await interim results; "Sponsor Decision". Not established (rule 5). |
| NCT06515002 | "Sponsor Decision"; the benefit-risk flag on the halt comes without a reason. |
| NCT06716190 | "Medicinal Product Related" in one country without detail. |

## Found on the way: two rule gaps (not fixed here)

- NCT04222972: "organizational and commercial decisions that led to the discontinuation of pralsetinib's global marketing and development" is read as a programme action without cause; it states a business cause.
- NCT06716853: "Persistent challenges ... in patient recruitment ... not based on any safety concerns" is read as UNRESOLVED (negated signal); it states recruitment. The CTIS decision above labels this trial; the rule still misreads the text for others.
Both go through CLAUDE.md rule 4 (golden case first, then the rule) in a separate change.
