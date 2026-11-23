# Classification change 23 Nov 2026: per-trial labels from the trial's own publication

From the weekly run of 30 Nov 2026, 9 trials whose registry text gives no cause take their label from a reviewed sentence in the trial's own paper (`classification_source = PUBLICATION_REVIEWED`, confidence MEDIUM). Decisions: `data/pub_evidence_decisions.csv`; rejected: `data/pub_evidence_rejected.csv` (2); method: `docs/pub_evidence_probe_2026-11-23.md`, `docs/pub_weekly.md`.

Reviewed with AI assistance (Claude), not by a clinician. The label's evidence and the trial page carry the PMID and **our summary**, never the paper's words (`docs/provenance_and_rights.md`).

## Guideline: a trial stopped because of a related trial

A trial stopped because another trial **of the same intervention** showed a stated result (futility, inferior outcomes, harm) is labelled by that result: biological. This is how the rules already read registry text (`v261.efficacy_explicit`: "lack of efficacy in a separate/related trial", "failure of ... another trial"). Such decisions carry the evidence rule `pub.related_trial` (3 of 9), so they can be counted apart, like programme-level SEC filings. A result **without its direction** ("in consideration of the results of trial X") stays not established (rule 5).

## Transitions (final outcome)

| From | To | Trials |
|---|---|---|
| UNRESOLVED | BIOLOGICAL_FAILURE | 7 |
| UNRESOLVED | MIXED_CAUSES | 1 |
| CAUSE_NOT_STATED | BIOLOGICAL_FAILURE | 1 |

Biological labels: 2,462 → 2,470 (the MIXED_CAUSES trial counts as biological through its SAFETY and EFFICACY_FUTILITY secondaries).

## Every changed trial

| Trial | Registry stop reason | Before | After | About | Publication | Our summary |
|---|---|---|---|---|---|---|
| [NCT00265382](https://clinicaltrials.gov/study/NCT00265382) | Please see Detailed Description for termination reason. | UNRESOLVED / UNRESOLVED_PLACEHOLDER_WITHOUT_EXPLICIT_SOURCE_CAUSE | BIOLOGICAL_FAILURE / EFFICACY_FUTILITY | RELATED_TRIAL | [PMID 24111983](https://pubmed.ncbi.nlm.nih.gov/24111983/), Journal of child and adolescent psychopharmacology 2013 | The companion randomised trial of the same drug was stopped for futility at its planned interim analysis, and this study was stopped with it. |
| [NCT00321100](https://clinicaltrials.gov/study/NCT00321100) | Enrollment closed 10/15/2008 based on data about KRAS. | UNRESOLVED / UNRESOLVED_OTHER_AMBIGUOUS_TEXT | BIOLOGICAL_FAILURE / EFFICACY_FUTILITY | RELATED_TRIAL | [PMID 22294255](https://pubmed.ncbi.nlm.nih.gov/22294255/), Journal of gastrointestinal cancer 2012 | Stopped after other trials reported worse outcomes when the two antibodies were combined; the authors conclude the combination is detrimental. |
| [NCT01204333](https://clinicaltrials.gov/study/NCT01204333) | (none) | UNRESOLVED / UNRESOLVED_MISSING_STOP_REASON | BIOLOGICAL_FAILURE / EFFICACY_FUTILITY | THIS_TRIAL | [PMID 32421159](https://pubmed.ncbi.nlm.nih.gov/32421159/), JAMA neurology 2020 | Halted for futility after the first interim analysis. |
| [NCT01523171](https://clinicaltrials.gov/study/NCT01523171) | (none) | UNRESOLVED / UNRESOLVED_MISSING_STOP_REASON | BIOLOGICAL_FAILURE / SAFETY | RELATED_TRIAL | [PMID 28602585](https://pubmed.ncbi.nlm.nih.gov/28602585/), The Lancet. Haematology 2017 | Terminated after suspected cases of Wernicke's encephalopathy in other trials of the same drug. |
| [NCT01856257](https://clinicaltrials.gov/study/NCT01856257) | Safety: Stopping rule not met. | UNRESOLVED / UNRESOLVED_DOMAIN_MENTION_WITHOUT_DIRECTIONAL_RESULT | BIOLOGICAL_FAILURE / EFFICACY_FUTILITY | THIS_TRIAL | [PMID 32558199](https://pubmed.ncbi.nlm.nih.gov/32558199/), American journal of transplantation : official journal of the American Society of Transplantation and the American Society of Transplant Surgeons 2020 | Halted early because of graft rejection in the treatment groups. |
| [NCT01870726](https://clinicaltrials.gov/study/NCT01870726) | (none) | UNRESOLVED / UNRESOLVED_MISSING_STOP_REASON | BIOLOGICAL_FAILURE / EFFICACY_FUTILITY | THIS_TRIAL | [PMID 31776899](https://pubmed.ncbi.nlm.nih.gov/31776899/), Journal of neuro-oncology 2020 | Enrolment halted after a pre-planned futility analysis showed limited activity of the drug. |
| [NCT02138825](https://clinicaltrials.gov/study/NCT02138825) | Study terminated per recommendation of iDMC. On iDMC request, protocol amended to include 4-month safety follow-up for patients after withdrawal of riociguat. | UNRESOLVED / UNRESOLVED_ANALYSIS_OR_REVIEW_WITHOUT_RESULT | MIXED_CAUSES / MULTIPLE (SAFETY; EFFICACY_FUTILITY) | THIS_TRIAL | [PMID 31416769](https://pubmed.ncbi.nlm.nih.gov/31416769/), The Lancet. Respiratory medicine 2019 | Terminated at the data monitoring committee's request because of more serious adverse events and deaths with the drug, and no sign of efficacy. |
| [NCT02434549](https://clinicaltrials.gov/study/NCT02434549) | Based on efficacy results from interim analysis | UNRESOLVED / UNRESOLVED_ANALYSIS_OR_REVIEW_WITHOUT_RESULT | BIOLOGICAL_FAILURE / EFFICACY_FUTILITY | THIS_TRIAL | [PMID 34484101](https://pubmed.ncbi.nlm.nih.gov/34484101/), Frontiers in neurology 2021 | Stopped at the interim analysis for futility (low probability of a positive primary outcome). |
| [NCT03604445](https://clinicaltrials.gov/study/NCT03604445) | Sponsor decision | CAUSE_NOT_STATED / DECISION_WITHOUT_STATED_CAUSE | BIOLOGICAL_FAILURE / EFFICACY_FUTILITY | THIS_TRIAL | [PMID 39617530](https://pubmed.ncbi.nlm.nih.gov/39617530/), ESMO open 2024 | Terminated early for minimal antitumour activity and a narrow therapeutic range, although tolerable. |

## Second batch (23 Nov, weekly queue of 23 Nov)

9 trials from the first weekly search: 3 accepted, 6 rejected (sentences about participants, protocol rules, a mouse experiment, a hypothetical). The filter was tightened the same day (`NOT_TRIAL_STOP`, protocol papers excluded); all 12 accepted cases still pass it.

| Trial | Registry stop reason | Before | After | Publication | Our summary |
|---|---|---|---|---|---|
| [NCT02277132](https://clinicaltrials.gov/study/NCT02277132) | Results of interim analysis | UNRESOLVED / UNRESOLVED_ANALYSIS_OR_REVIEW_WITHOUT_RESULT | MIXED_CAUSES / MULTIPLE (SAFETY; EFFICACY_FUTILITY) | [PMID 32585017](https://pubmed.ncbi.nlm.nih.gov/32585017/), JAMA network open 2020 | Stopped early for a safety concern (pulmonary hypertension in newborns in the treatment group) while benefit on the primary outcome had become unlikely. |
| [NCT03954314](https://clinicaltrials.gov/study/NCT03954314) | Upon the Data Safety Monitoring Board review of the interim analysis (75% of participants have finished their follow-up) on November 17, 2023, they made a recommendation to stop recruitment into the trial. | UNRESOLVED / UNRESOLVED_ANALYSIS_OR_REVIEW_WITHOUT_RESULT | BIOLOGICAL_FAILURE / SAFETY | [PMID 38587333](https://pubmed.ncbi.nlm.nih.gov/38587333/), Circulation 2024 | Stopped for safety after the data and safety monitoring board recommended termination at the last planned interim analysis. |
| [NCT01567540](https://clinicaltrials.gov/study/NCT01567540) | New treatments available, which prevents additional recruitment. | UNRESOLVED / UNRESOLVED_OTHER_AMBIGUOUS_TEXT | NON_BIOLOGICAL / RECRUITMENT | [PMID 27137491](https://pubmed.ncbi.nlm.nih.gov/27137491/), EMBO molecular medicine 2016 | Terminated early after a new treatment for the same infection was approved, which, as the registry says, stopped further recruitment. |
