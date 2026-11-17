# Classification change, 17 Nov 2026: "nobody enrolled" is not a recruitment cause on its own

Classifier 2.7.1 → 2.7.2 (`scripts/classification_v2.py`, `_ZERO_ENROLMENT` / `_ENROLMENT_ATTEMPTED`). Decided by the owner.

**Rule.** A stop reason saying only that nobody enrolled restates the registry status (WITHDRAWN = stopped before the first participant) and names no cause: NON_FAILURE_TRANSITION / NOT_INITIATED, as `validation/LABELING_GUIDELINES.md` and the reviewed decisions for "No participants enrolled" already had it. RECRUITMENT needs an attempt or a failure in the text. If another cause is named, it decides. Reviewed decisions are unchanged.

**Why.** Before, near-identical texts were split: 274 RECRUITMENT, 141 NOT_INITIATED; and where a text named funding, a PI who left or a business decision next to "no enrollment", RECRUITMENT usually won.

**Effect on the current dataset** (old and new classifier run on the same snapshot): 371 trials change. Biological rates: one trial (NCT05393999, "The drug was found to be ineffective against Omicron … no patients were enrolled") moves from MIXED_CAUSES to BIOLOGICAL_FAILURE / EFFICACY_FUTILITY; nothing leaves the biological class.

| From | To | Trials |
| --- | --- | ---: |
| NON_BIOLOGICAL/RECRUITMENT | NON_FAILURE_TRANSITION/NOT_INITIATED | 276 |
| UNKNOWN/UNSPECIFIED | NON_FAILURE_TRANSITION/NOT_INITIATED | 43 |
| NON_BIOLOGICAL/RECRUITMENT | NON_BIOLOGICAL/FUNDING | 14 |
| NON_BIOLOGICAL/RECRUITMENT | NON_BIOLOGICAL/STAFFING_RESOURCES | 11 |
| NON_BIOLOGICAL/RECRUITMENT | NON_BIOLOGICAL/BUSINESS_STRATEGY | 10 |
| NON_BIOLOGICAL/RECRUITMENT | NON_BIOLOGICAL/EXTERNAL_DISRUPTION | 5 |
| NON_BIOLOGICAL/RECRUITMENT | NON_BIOLOGICAL/PROTOCOL_FEASIBILITY | 4 |
| MIXED_CAUSES/MULTIPLE | NON_BIOLOGICAL/REGULATORY | 3 |
| CAUSE_NOT_STATED/DECISION_WITHOUT_STATED_CAUSE | NON_FAILURE_TRANSITION/NOT_INITIATED | 2 |
| NON_BIOLOGICAL/RECRUITMENT | NON_BIOLOGICAL/SUPPORT_WITHDRAWAL | 1 |
| MIXED_CAUSES/MULTIPLE | BIOLOGICAL_FAILURE/EFFICACY_FUTILITY | 1 |
| NON_BIOLOGICAL/RECRUITMENT | NON_BIOLOGICAL/SUPPLY_MANUFACTURING | 1 |

## Every changed text

Count = trials with that exact text.

### NON_BIOLOGICAL/RECRUITMENT → NON_FAILURE_TRANSITION/NOT_INITIATED (276 trials)

- 14 × No enrollment
- 12 × No recruitment
- 8 × no accrual
- 8 × no enrollment
- 6 × 0 participant accrual
- 5 × No accrual
- 4 × no recruitment
- 4 × No enrollment.
- 3 × 0 participants enrolled
- 3 × 0 accrual
- 3 × No recruitment.
- 3 × 0 patient accrual
- 3 × No participant enrolled
- 3 × no patient accrual
- 2 × No accruals
- 2 × No Enrollment
- 2 × Internal sponsor decision to terminate project prematurely based on a waiver granted by Egypt EDA (Egyptian drug authority). No subjects were enrolled.
- 2 × no patient enrolled
- 2 × Trial cancelled before First Patient First Visit (no patient enrolled)
- 2 × no participant enrolled
- 2 × No Accrual
- 1 × Closed to accrual - no accruals in CTMS
- 1 × The study was withdrawn due to no enrollment
- 1 × Due to a federally mandated, institution-wide pause in research activities under the institution's Federal Wide Assurance (FWA) that occurred during the timeline for this study, recruitment was never initiated and no participants were enrolled.
- 1 × Due to changes in HFpEF treatment landscape, no recruitment activities were initiated and no participants were enrolled.
- 1 × No subjects recruited at this time
- 1 × No participants were enrolled in Phase 2 as Phase I was terminated early due to the lack of a clear signal of robust clinical activity.
- 1 × Due to the sponsor's adjustment of the research and development strategy for this clinical trial, this study was prematurely terminated, and no subjects were recruited for this study
- 1 × No participants were enrolled. Study was withdrawn prior to treatment initiation.
- 1 × The grant intended to support this trial as ultimately not funded. This trial was not initiated,. No patients were enrolled.
- 1 × PI has decided to end study due to changes in Texas law and no participants were enrolled
- 1 × withdrawn, no enrollment
- 1 × No participants enrolled in study
- 1 × No sites were initiated, no sites were activated, no patients were enrolled in this study.
- 1 × Withdrawn prior to study start per sponsor decision. No patients were enrolled.
- 1 × Due to the sponsor's adjustment of the research and development strategy for this clinical trial, this study was prematurely terminated, and no subjects were recruited for this study.
- 1 × Study withdrawn (no participants enrolled) due to resources.
- 1 × Terminated with sponsor-investigator agreement due to extended period without enrollment and the absence of foreseeable participant accrual. No participants were enrolled.
- 1 × No one was enrolled to date and the sponsor requested the study be withdrawn
- 1 × The PBTC lost federal funding and will cease operations in March 2026.PBTC-061 was permanently closed on 10/24/2025 with no patients enrolled.
- 1 × No patients enrolled. Study no longer required due to completion of long term safety study in the EU.
- 1 × no subject accrual
- 1 × The TBS02 study was paused indefinitely. No subjects were enrolled or treated, and the study may resume if circumstances change.
- 1 × The study was terminated early as no patients were enrolled.
- 1 × This study never left the planning stages: there was no IRB application and no participants were enrolled.
- 1 × No participants were enrolled in the trial.
- 1 × The study was withdrawn because no participants enrolled
- 1 × no participants enrolled across sites
- 1 × Study was not initiated; no subjects enrolled. A replacement study will be submitted
- 1 × No patients enrolled in the study.
- 1 × no patient enrolled.
- 1 × study withdrawn, no participants enrolled, changes in the study design planned
- 1 × The study was withdrawn based on business-related matters and there are no new safety concerns related to the trial. No patients were enrolled.
- 1 × PI Request--No Patient Accrual
- 1 × The attendings who were to participate did not want to alter their standard neuroma treatment of neurotomy and TMR, as opposed to dissecting the end of all neuromas before neurotomy. No patients were enrolled in the study.
- 1 × due to the decision of company Top management. No subjects were recruited, none of sites were initiated
- 1 × The drug for this study was not available by the manufacturer. No patients enrolled.
- 1 × 0 enrollment
- 1 × 0 participants recruited
- 1 × Trial withdrawn based on re-prioritization of the clinical development path for tuvusertib. No subjects were enrolled.
- 1 × Update to Program Design - No Participants Enrolled
- 1 × Study was not initiated. No subjects enrolled.
- 1 × no patients enrolled into study
- 1 × PI Decision based on no enrollment
- 1 × leading entity of the clinical trial was replaced, and no patients were enrolled.
- 1 × Study closed before opening to accrual, no participants enrolled
- 1 × Stopped due to no enrollment
- 1 × There were no participants enrolled into Phase 3 portion of the study because the study was prematurely terminated.
- 1 × No subjects enrolled in the study
- 1 × No enrollment, delay with drug availability.
- 1 × Closed by study team, no subjects enrolled.
- 1 × This study was withdrawn due to no enrollment
- 1 × Per PI no participants enrolled
- 1 × Zero participants accrued
- 1 × Sparse/no patient enrollment
- 1 × The study closed to enrollment and follow-up in May 2023. There had been no enrollment since October 2021, and by 2023, the available study product had reached its expiration date. Enrollment targets in Arm B had not been met.
- 1 × Study was not initiated, no participants enrolled.
- 1 × No participant enrollment
- 1 × Study inactivated due to zero accruals
- 1 × After significant delays study was never initiated. No participants enrolled
- 1 × Due to no accrual
- 1 × Request by sponsor due to no enrollment of participants on study
- 1 × No participants were enrolled and the study will not be conducted.
- 1 × No participants were enrolled, the study was inactivated with the IRB on May 15, 2023. The sponsor notified the PI that a Phase II trial had been allowed to proceed by the FDA.
- 1 × no accrual of eligible participants
- 1 × No participants were recruited and the study was deemed not feasible
- 1 × Study will be closed due to zero enrollment.
- 1 × Unfortunately, the economic crisis in Lebanon precluded utilization of available funding to recruit patients at the specified institution. No patients were recruited.
- 1 × Study was closed since no participants were enrolled.
- 1 × 0 participants accrued
- 1 × Study abandoned, no participants enrolled
- 1 × No patients were enrolled in the study
- 1 × Decision was made due to a strategic re-evaluation of pipelines; no patients were enrolled.
- 1 × Submission process abandoned. No patient enrolled.
- 1 × No participant enrolled. Equipment unvailable.
- 1 × Sponsor withdrew study prior to initiation and no participants were enrolled.
- 1 × IRB records show administrative closure on 12/16/21. No subjects enrolled.
- 1 × PI confirmed that while coordination and planning was conducted upon IRB approval, no participants were enrolled into the study
- 1 × The study was closed on 3/8/2021 as per final progress report issued by the IRB on 3/12/2021. No subjects were enrolled in the study following approval. Status changed to "Withdrawn (No Participants Enrolled)" accordingly.
- 1 × No patients were enrolled in this study. The study onset was delayed due to problems with drug acquisition.
- 1 × The project was denied funding and the protocol was subsequently closed. No participants were enrolled.
- 1 × There are no patients enrolled on this study and all efforts are being discontinued.
- 1 × PI terminated study with no subjects enrolled.
- 1 × No patients enrolled. Delay due to optimisation of drug product formulation.
- 1 × There are no patients enrolled on this study and all efforts are being discontinued
- 1 × Principal investigator took a position at another institution. No subjects enrolled.
- 1 × no accrual rate
- 1 × No enrollment because of war in the study country.
- 1 × Internal sponsor decision to terminate project in Crohn's disease due to potential narrow therapeutic window. No subjects were enrolled
- 1 × The Sponsor decided to discontinue this study due to a corporate restructuring intended to prioritize clinical development of select programs. No patients enrolled in this study and no patients received investigational product.
- 1 × No enrollments
- 1 × Funding for the trial was lost so study was ended. No participants were enrolled.
- 1 × Study terminated - no participants were enrolled.
- 1 × No subjects were enrolled in this study, the PI will seek funding and revise the protocol for resubmisson at a later date
- 1 × Study has been open for 8 years with no enrollment. Procedures in 2013 protocol are outdated. Cannot make the radiopharmaceutical on campus anymore.
- 1 × A new study is being designed. No patients were enrolled.
- 1 × study terminated/withdrawn before FPFV (no patients enrolled)
- 1 × No patients enrolled as study did not move to enrollment stage
- 1 × No participants were enrolled in the study.
- 1 × There was no enrolment of participants.Unscheduled Clinical Study Closure - Eisai Network Company Decision, November 12, 2020.
- 1 × Study will not proceed, no participants enrolled.
- 1 × Study not started, no subjects recruited.
- 1 × No participants enrolled in the trial
- 1 × Study was not conducted. No participants were enrolled
- 1 × the project was never initiated and no participants were enrolled, it was closed permanently
- 1 × No recruitment since initiation
- 1 × zero accrual
- 1 × Study will not be completed. No participants were enrolled.
- 1 × No patients were enrolled and global prioritization of pipeline and research strategy
- 1 × The decision to end the study was based on a change in GSK strategy. No subjects were enrolled into the study.
- 1 × No accrual - closed by PRMC
- 1 × No recruitment (Feasibility study).
- 1 × No participants were enrolled as schedule.
- 1 × Study withdrawn; no participants enrolled
- 1 × No patients were enrolled; Senior author (Dr. Melamed) departed institution
- 1 × No patient was recruited, study withdrawn for feasibility reasons.
- 1 × Terminated (due to no accrual)
- 1 × No patients enrolled. Study withdrawn.
- 1 × Closed due to no accrual
- 1 × Study closed with no enrollment.
- 1 × No participants enrolled in study.
- 1 × No patient accrual
- 1 × No patients were enrolled. No data \& no study results to report.
- 1 × While 33 people signed consent, no one was enrolled in the study, because none of these patients developed shoulder pain in the recovery room.
- 1 × Due to no enrollment, Celgene (sponsor) withdrew funding
- 1 × 0 subjects enrolled
- 1 × none enrolled in second arm, therfore no analysis
- 1 × No study population. No subjects enrolled.
- 1 × No subjects were enrolled since the first subject completed the study 08Jun2007
- 1 × Withdrew IRB application, never approved and no subjects enrolled
- 1 × eIRB closed, no patient enrolled
- 1 × No patients enrolled due to change in standard practice
- 1 × Study withdrawn. No participants enrolled.
- 1 × No participants enrolled for more than two years. No plan to continue study.
- 1 × No participant enrolled more than two years. No plan to continue study.
- 1 × No participant enrolled for three years. No plan to continue study.
- 1 × study was never initiated, No participants enrolled
- 1 × No enrollment in study.
- 1 × Due to strict inclusion and exclusion criteria no subjects were enrolled
- 1 × Study was not conducted, no subjects recruited.
- 1 × Year 1 of study completed. No enrollment planned for Year 2 of study.
- 1 × No enrollment in the study
- 1 × Withdrawn due to no accrual
- 1 × No patients were enrolled to trial
- 1 × none participant has been enrolled and recruited during the first year after competent autority autorisation.
- 1 × Withdrawn - no participants enrolled
- 1 × No enrollment and PI requested study termination per IRB system.
- 1 × No participants enrolled, study will not be conducted.
- 1 × Study closed with no enrollment due to unavailability of reagent.
- 1 × At the request of the global principal investigator, no subjects were enrolled in this study at any site.
- 1 × Closed due to no enrollment
- 1 × Study concept was not approved by NCI. Study was never activated. No enrollment
- 1 × Development of JCAR015 has been discontinued. No subjects were enrolled/treated under protocol JCAR015-ALL-001
- 1 × No participants enrolled in this trial could receive the SMO antagonist as a recommended phase 2 dose was not determined by a different, concurrently-run trial.
- 1 × no subject enrolled in nearly 2 years
- 1 × No accrual due to rarity of disease.
- 1 × State of Mass. tightened regulations for making intravenous solutions for research subjects. Study was withdrawn and no participants were enrolled.
- 1 × Study terminated mutually by sponsor \& PI due to no enrollment
- 1 × PI decided not to proceed with this project. No participants were enrolled.
- 1 × No patients have been recruited therefore study has been cancelled
- 1 × No participants enrolled. Changed requirements for studying e-cigarettes.
- 1 × Study D2276C00001 was not started. No patients were enrolled. The sponsor decided to pursue an alternate design.
- 1 × no enrollments
- 1 × No accrual. New study opening with modified technique.
- 1 × No patients were enrolled because the company that pledged the drug does not yet have it available.
- 1 × No subjects enrolled and no ongoing funding.
- 1 × No participants were enrolled. Therefore, we stop this study, prematurely.
- 1 × no recruitment on time
- 1 × No subjects were enrolled and the sponsor suspended support at this time
- 1 × No patient enrollment occurred.
- 1 × lost the recruiting source- no recruitment for the past 18months, PI moving
- 1 × study materials have expired, no patients were enrolled
- 1 × We will focus on other Tamiflu research studies. No subjects were enrolled.
- 1 × No patient accruals
- 1 × no patient accruals
- 1 × This study was cancelled. No subjects were enrolled and no data has been collected
- 1 × Trial had no patients accrued while open
- 1 × Due to no accrual.
- 1 × No patient enrolled on study. Did not get patients in timely fashion. All referrals for study when assessed were not eligible.
- 1 × No accrual.
- 1 × no participant enrollment
- 1 × No subjects enrolled, bio equivalence study, canceled before active.
- 1 × There was no participants enrolled in this clinical trial.
- 1 × The study was terminated due to a need for a reformulation of the study drug. Phase 1 completed, no patients enrolled in Phase 2.

### UNKNOWN/UNSPECIFIED → NON_FAILURE_TRANSITION/NOT_INITIATED (43 trials)

- 11 × No patients enrolled
- 8 × No participants were enrolled
- 6 × No patients enrolled.
- 5 × no patients enrolled
- 2 × No subjects were enrolled
- 2 × No enrolled patients received the second surgery.
- 1 × no patients were included
- 1 × no enrolled prospects
- 1 × No Patients enrolled
- 1 × No participants were recruited
- 1 × none enrolled per PI
- 1 × No patients Enrollment
- 1 × No patient included at target sample sizes
- 1 × no patients were enrolled
- 1 × No subjects were enrolled.

### NON_BIOLOGICAL/RECRUITMENT → NON_BIOLOGICAL/FUNDING (14 trials)

- 1 × The study was withdrawn because the pharmaceutical sponsor withdrew support for the study. No participants were enrolled before termination.
- 1 × Study withdrawn due to lack of funding and the company's decision not to pursue the IND. No participants were enrolled.
- 1 × drug has expired, no enrollments in study. Company pulled funding
- 1 × No recruitment/enrollment and funding expired.
- 1 × Study was never funded nor started, no participants were enrolled
- 1 × No patients enrolled and funding withdrawn
- 1 × No participant enrollment, funding withdrawn.
- 1 × Funding cut, no patients enrolled
- 1 × No funding was received, no subjects were enrolled
- 1 × PI transferred from Georgetown to Johns Hopkins University. No participants enrolled at either site. Funding lapsed.
- 1 × No subjects were enrolled in this study. Funding ran out.
- 1 × Funding withdrawn; no participants enrolled.
- 1 × Funding was not obtained for this study and no participants were enrolled.
- 1 × No patients enrolled and funding has been withdrawn.

### NON_BIOLOGICAL/RECRUITMENT → NON_BIOLOGICAL/STAFFING_RESOURCES (11 trials)

- 1 × PI retired and no recruitment occurred
- 1 × No recruitment occurred and PI retired
- 1 × Lack of resources to complete study objectives. No participants enrolled.
- 1 × PI left institution; no participants were enrolled
- 1 × No Accrual. PI left Institution
- 1 × PI left institution and funding sponsor closed study. Study did not open to accrual, and no participants were enrolled.
- 1 × Project never started - lack of resources and no subjects enrolled
- 1 × No patient enrolled. No study conduct due to lack of human resources.
- 1 × PI leaving the institution, no subjects enrolled since 2019, and no other PI interested in taking it over.
- 1 × No participants enrolled. PI/Sponsor left UPitt. IND withdrawn \& revised protocol submitted through the new institution. New study recruiting under NCT03488667.
- 1 × No participants were enrolled. The PI left the institution.

### NON_BIOLOGICAL/RECRUITMENT → NON_BIOLOGICAL/BUSINESS_STRATEGY (10 trials)

- 2 × Business Decision (no enrollment)
- 1 × Sandoz has decided to withdraw the clinical study due to internal business reasons. No patients were enrolled in any of the participating countries.
- 1 × No patients were enrolled. Study terminated for portfolio reasons.
- 1 × This study was withdrawn due to a strategic business decision; no patients were enrolled.
- 1 × Withdrawn based on business decision, no participants enrolled
- 1 × Business decision (no enrollment)
- 1 × no enrollment, reallocation of resources
- 1 × Withdrawn: Business decision (no enrollment)
- 1 × Business decision. No patients were enrolled

### NON_BIOLOGICAL/RECRUITMENT → NON_BIOLOGICAL/EXTERNAL_DISRUPTION (5 trials)

- 1 × No enrollment due to COVID
- 1 × no enrollment after covid pandemic
- 1 × The pandemic resulted in no enrollments。
- 1 × No enrolment due to Covid-19
- 1 × No participants recruited. Not able to recruit due to COVID 19.

### NON_BIOLOGICAL/RECRUITMENT → NON_BIOLOGICAL/PROTOCOL_FEASIBILITY (4 trials)

- 1 × Trial withdrawn due to substantial protocol amendments invalidating the original design. With no participants enrolled, this aligns with WHO-ICTRP guidelines. Recruitment has ceased, and the revised protocol has been re-registered as NCT07065968.
- 1 × Study closed due to no accruals and change in the standard of care for this population
- 1 × This study was withdrawn for lack of progress. No subjects were recruited.
- 1 × Stopped the study due to feasibility issues, no enrollment has taken place.

### MIXED_CAUSES/MULTIPLE → NON_BIOLOGICAL/REGULATORY (3 trials)

- 1 × IRB approval expired 1/23/2023 and eclipsed the 6 month institutional window where study can be reinitiated via progress report. No enrollment has taken place.
- 1 × Study was withdrawn. Study expired in IRB system and no patients enrolled as per institutional CTMS and IRB systems. Primary and Study Completion Dates reflect date IRB approval expired.
- 1 × No enrollment, IRB closed

### CAUSE_NOT_STATED/DECISION_WITHOUT_STATED_CAUSE → NON_FAILURE_TRANSITION/NOT_INITIATED (2 trials)

- 1 × Sponsor terminated this protocol on Dec17, 2021; no subjects have been enrolled
- 1 × The investigators decided not to perform the study. No participants have been enrolled.

### NON_BIOLOGICAL/RECRUITMENT → NON_BIOLOGICAL/SUPPORT_WITHDRAWAL (1 trials)

- 1 × Study drug supplier withdrew support; no participants were enrolled.

### MIXED_CAUSES/MULTIPLE → BIOLOGICAL_FAILURE/EFFICACY_FUTILITY (1 trials)

- 1 × The drug was found to be ineffective against Omicron, so the study was terminated and no patients were enrolled.

### NON_BIOLOGICAL/RECRUITMENT → NON_BIOLOGICAL/SUPPLY_MANUFACTURING (1 trials)

- 1 × Due to nationwide shortage of Aminophylline. No subjects enrolled.


## Also on 17 Nov (2.7.3): "the sponsor decided" is not a cause next to stated causes

In MIXED_CAUSES, the secondary reasons listed DECISION_WITHOUT_STATED_CAUSE when the text said
"the sponsor decided … due to X and Y", and could list a cause twice. The sponsor is who acted, not
why. Seven trials lose that entry (and one a duplicate); outcome and primary reason do not change
anywhere: NCT05689021, NCT06435845, NCT04642365, NCT04029688, NCT04649060, NCT01981187, NCT01453595.
