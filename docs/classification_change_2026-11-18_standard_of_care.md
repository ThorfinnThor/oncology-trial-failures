# Classification change, 18 Nov 2026: a changed standard of care is a design cause, not a business decision

Classifier 2.7.4 → 2.7.5 (`scripts/classification_v2.py`, rules `v275.practice_changed` and `v275.practice_changed_recruitment`). Decided by the owner after a clinician-review case (NCT04684979).

**Rule.** A new standard of care, a new approval or a changed treatment landscape or practice that makes the study obsolete is NON_BIOLOGICAL / PROTOCOL_FEASIBILITY. It is BUSINESS_STRATEGY only when the text gives a business reason (competition, strategy, portfolio, development plan). When the text says the change stopped enrolment, it is RECRUITMENT. A study replaced because of the change stays a replacement. This is what `validation/LABELING_GUIDELINES.md`, the earlier audit (`docs/classification_audit.md`: "standard of care changed, making the study design obsolete" under design) and the general protocol rule already said; 62 narrow patterns written in earlier rounds had put the same situation under business instead.

**How.** The 62 patterns moved out of the business rules unchanged: 56 into `v275.practice_changed` (PROTOCOL_FEASIBILITY), 6 into `v275.practice_changed_recruitment` (RECRUITMENT). Patterns that state a business reason ("competitive landscape", "strategic consideration", "clinical development plan") stay business. Matches of the new rules go through `text_guards.denied()` and ignore "has not changed". One supply pattern added ("the manufacturer … is no longer supplying the IP"), so a text naming both a new standard of care and a stopped supply carries both.

**Reviewed index.** 13 of the changed texts had an entry in `data/classification_reviewed_reasons_v2.json` with derivation `V2_RULE_WITH_AUDIT_CONFIRMATION`: the earlier audit confirmed only the coarse label (non-biological, operational), and the specific reason was the rule output of the time. No person decided business for them, and none is in `classification_manual_decisions_v2.csv`. Their outcome is unchanged; their reason fields were updated to the 2.7.5 output (marked † below).

**Effect over every stop reason in the database** (with the reviewed index, as the weekly run applies it): 58 trials change, all within NON_BIOLOGICAL. No trial changes outcome, so no biological-failure count changes.

## NON_BIOLOGICAL/BUSINESS_STRATEGY → NON_BIOLOGICAL/PROTOCOL_FEASIBILITY (48)

| Trial | Text | After |
|---|---|---|
| NCT04251715 | change in standard-of-care systemic therapy | PROTOCOL_FEASIBILITY |
| NCT04419181 | Change in the landscape of current treatment of early stage breast cancer. Larger clinical trials answering similar questions are expected to result in the next few years. | PROTOCOL_FEASIBILITY |
| NCT03304717 | Results from other clinical trials on AGS established baricitinib as standard of care treatment. Thanks to the knowledge gained in the clinical treatment of AGS, a clinical trial around the effects of RTI in AGS is no longer relevant at this time. | PROTOCOL_FEASIBILITY |
| NCT03145558 † | Landscape changed and the study population is no longer suitable for the study treatment. | PROTOCOL_FEASIBILITY |
| NCT06007508 | Study intervention was adopted as standard of care. | PROTOCOL_FEASIBILITY |
| NCT06142461 | Change in landscape of HPV treatment | PROTOCOL_FEASIBILITY |
| NCT03533946 † | New standard of care for study participant population | PROTOCOL_FEASIBILITY |
| NCT05474690 | The new treatment plan for HER2 positive breast cancer has entered the diagnosis and treatment guide. The treatment plan ECHP-THP in this study is not the optimal treatment plan, therefore this study was terminated. | PROTOCOL_FEASIBILITY |
| NCT06018116 | Results of EV302 study do not make it feasible to complete a study in second line avelumab immunotherapy. The new standard of care make this study not pertinent. | PROTOCOL_FEASIBILITY |
| NCT04894994 † | Change in clinical landscape | PROTOCOL_FEASIBILITY |
| NCT04684979 | The landscape of treatment for patients targeted for enrollment has significantly changed since the protocol was written and approved, and the research treatment is no longer the best option for this population. | PROTOCOL_FEASIBILITY |
| NCT04099888 † | Recent results from a Phase 3 study are expected to change the standard of care for patients with inoperable CCA, rendering the RELEASE study challenging to complete and potentially inadequate for NDA approval. | PROTOCOL_FEASIBILITY |
| NCT04088760 | Post-transplant cyclophosphamide and abatacept can be used as standard-of-care approaches to GVHD prevention in the HLA mismatched donor-recipient setting and are simpler to use since study enrollment is not required. | PROTOCOL_FEASIBILITY |
| NCT02710396 † | Frontline pembrolizumab approved in NSCLC as monotherapy and in combination with chemotherapy representing a new standard of care. | PROTOCOL_FEASIBILITY |
| NCT05420077 | The landscape of the study area changed, making it impossible to continue the study. | PROTOCOL_FEASIBILITY |
| NCT03152929 † | Standards of care changed at the institution so that PEC procedures were no longer common or preferred as a method of pain control for breast surgery. | PROTOCOL_FEASIBILITY |
| NCT05408026 | Study withdrawn, trial therapy deemed no longer novel and there was a lack of site interest. | PROTOCOL_FEASIBILITY |
| NCT04306692 † | clomiphene citrate is no longer being considered as standard treatment for polycystic ovary syndrome | PROTOCOL_FEASIBILITY |
| NCT03053700 | During study new treatments were available, which may be more effective than proposed study treatment. | PROTOCOL_FEASIBILITY |
| NCT03924245 † | Change in participant landscape and other treatment availability | PROTOCOL_FEASIBILITY |
| NCT04414631 | Aim to enroll 120 patients deemed not sufficient to show a difference in the primary outcome measure. Standard of care treatment recently changed in Switzerland adding further heterogeneity to trial population when including future participants. | PROTOCOL_FEASIBILITY |
| NCT03066453 | new treatment that changes the management of the disease | PROTOCOL_FEASIBILITY |
| NCT04947371 | The standard of care of adjuvant therapy for liver cancer was changed. | PROTOCOL_FEASIBILITY |
| NCT02497638 | Drug intervention no longer relevant for the proposed population | PROTOCOL_FEASIBILITY |
| NCT00570258 † | FDA approved higher dose of study drug. Dose used in protocol lower than SOC - enrollment stopped, those on treatment were given option to opt out. | PROTOCOL_FEASIBILITY |
| NCT02882711 | Increasing off-label practice of IV ketamine administration for treatment-resistant depression. | PROTOCOL_FEASIBILITY |
| NCT03528876 † | Combination of chemotherapy and Immunotherapy is a new Standard of care | PROTOCOL_FEASIBILITY |
| NCT01898377 | New treatment option introduced for patients with the study indication | PROTOCOL_FEASIBILITY |
| NCT02177773 | FDA approved agent for this indication during enrollment | PROTOCOL_FEASIBILITY |
| NCT02846792 | Immunotherapy approved for NSCLC in the first line setting | PROTOCOL_FEASIBILITY |
| NCT01293539 | IAC is now recognized as part of standard of care treatment options in the US. | PROTOCOL_FEASIBILITY |
| NCT00052715 | prematurely discontinued after results of the EORTC phase-3 study defined the SOC for newly diagnosed GMB pts as RT plus concomitant and adjuvant TMZ | PROTOCOL_FEASIBILITY |
| NCT01882530 | Practice on postoperative pain management changed | PROTOCOL_FEASIBILITY |
| NCT00470548 | Practice patterns with pemetrexed have evolved. | PROTOCOL_FEASIBILITY |
| NCT00774306 | study no longer consistent with current clinical practice | PROTOCOL_FEASIBILITY |
| NCT03266159 | Study withdrawn before active to fully evaluate impact of changing practice in target population. | PROTOCOL_FEASIBILITY |
| NCT02947113 | New studies available with immunotherapy so recruitment is no longer acceptable. | PROTOCOL_FEASIBILITY |
| NCT00564460 | Change of practice pattern. Green light laser | PROTOCOL_FEASIBILITY |
| NCT02099604 | Study objectives were considered as obsolete regarding the new AAD arrival | PROTOCOL_FEASIBILITY |
| NCT00925132 | Change in the number of approved drugs for metastatic melanoma | PROTOCOL_FEASIBILITY |
| NCT01153919 | Approval of several new agents for the treatment of HCV infection would mitigate the future need for interferon HCV treatment | PROTOCOL_FEASIBILITY |
| NCT01364259 | Patterns of practice changed and this technique is no longer used. | PROTOCOL_FEASIBILITY |
| NCT01207765 | changes in practice | PROTOCOL_FEASIBILITY |
| NCT02464631 | In view of recent approval of NS5A inhibitors for treatment of hepatitis C such as Declatasvir and Ledipasvir which have proven better efficacy in the HCV cure | PROTOCOL_FEASIBILITY |
| NCT00154427 | Trial terminated after recruiting 172 patients but without proceeding to the highest dosing cohort as this no longer reflects common clinical practice | PROTOCOL_FEASIBILITY |
| NCT01984255 | standard of care improved combination treatment of ipilimumab plus nivolumab. | PROTOCOL_FEASIBILITY |
| NCT01229553 | protocol was never implemented as procedures became standard of care | PROTOCOL_FEASIBILITY |
| NCT00675272 | Routine use of corticoids became standard therapy | PROTOCOL_FEASIBILITY |

## NON_BIOLOGICAL/BUSINESS_STRATEGY → NON_BIOLOGICAL/RECRUITMENT (5)

| Trial | Text | After |
|---|---|---|
| NCT03341156 | Standard practice change prohibited enrollment | RECRUITMENT |
| NCT04253457 | Standard of Care change impacted recruitment | RECRUITMENT |
| NCT02957032 † | New agents for the same indication impacted on patients' recruitment | RECRUITMENT |
| NCT03787251 | In China, apatinib has been approved as an indication drug for esophageal squamous cell carcinoma, which makes it very difficult for our clinical trial to enroll patients. We regret that we failed to implement the design as planned. | RECRUITMENT |
| NCT02094157 | Change of practice made further recruitment impossible | RECRUITMENT |

## NON_BIOLOGICAL/RECRUITMENT → NON_BIOLOGICAL/RECRUITMENT (4)

| Trial | Text | After |
|---|---|---|
| NCT02781506 | Since the treatment landscape for metastatic kidney cancer changed, patients were not becoming eligible for this trial and therefore, the trial was terminated. | RECRUITMENT + PROTOCOL_FEASIBILITY |
| NCT02305563 † | Business objectives have changed, slow accrual, the standard of care for the patient population changed and we were unable to accrue any longer. | RECRUITMENT + BUSINESS_STRATEGY, PROTOCOL_FEASIBILITY |
| NCT02750514 † | The standard of care for the patient population changed and we were unable to accrue any longer. | RECRUITMENT + PROTOCOL_FEASIBILITY |
| NCT04406064 | The use of steroids to treat COVID prevents the use of VSTs for these patients. The Principal Investigator does not feel the study had an expectation of enrolling patients as the treatment options for COVID have evolved. | RECRUITMENT + PROTOCOL_FEASIBILITY |

## NON_BIOLOGICAL/BUSINESS_STRATEGY → NON_BIOLOGICAL/SUPPLY_MANUFACTURING (1)

| Trial | Text | After |
|---|---|---|
| NCT03145857 | The market approved 68Ga-DOTATATE (NETSPOT(R)) is now approved for public funding in Alberta and is considered standard of care. Furthermore, the manufacturer of the study Investigational Product (IP) is no longer supplying the IP. | SUPPLY_MANUFACTURING + PROTOCOL_FEASIBILITY |

Golden cases added to `tests/golden_classification_v2.jsonl` (11, including business texts that must stay business, a replacement that must stay a replacement and a denial); two older expectations updated to the rule ("approved alternative had better treatment efficacy" → PROTOCOL_FEASIBILITY, "A standard-of-care change impacted recruitment." → RECRUITMENT). The review tool's guidance has the same rule (GUIDE_VERSION 2026-11-18). Applies to the data from the next weekly run.

Not changed here: the older general rule `ops.protocol` already reads "change in standard of care" as PROTOCOL_FEASIBILITY and does not catch "not due to a change in standard of care". That was so before this change; it is a separate fix.
