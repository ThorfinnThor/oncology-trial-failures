# Classification Audit

This document records the manual semantic audit of the `why_stopped` classification in `data/all_oncology_stopped_trials.json`.

## Audit methodology

- Audit unit: batches of 200 records in the file's actual order.
- Primary evidence: `why_stopped`.
- Existing output fields reviewed: `classification_label`, `classification_reason`, `classification_confidence`.
- Manual target classes:
  - `BIOLOGICAL_FAILURE / SAFETY`
  - `BIOLOGICAL_FAILURE / EFFICACY/FUTILITY`
  - `NON_BIOLOGICAL / OPERATIONAL`
  - `NON_BIOLOGICAL / REGULATORY`
  - `UNCLEAR / OTHER/UNKNOWN`
- A generic decision-maker phrase such as `Sponsor decision`, `PI request`, or `Board decision` is **not treated as a causal stop reason by itself**. It remains `OTHER/UNKNOWN` unless the text supplies the actual reason.
- Mixed-cause records are marked as ambiguous when two materially different causal explanations are both explicit.
- Planned or successful milestone stops such as `goal met`, `accrual met`, or completion of a protocol-defined stage are not treated as failures merely because enrollment stopped.

---

## Batch 1 — records 1–200

### Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 122 | 61.0% |
| Definitely misclassified | 68 | 34.0% |
| Ambiguous / multiple plausible causes | 10 | 5.0% |
| Needs change or manual review | 78 | 39.0% |

### Main finding

The dominant error pattern is `UNCLEAR / OTHER/UNKNOWN` where the stop reason is actually clearly operational. This accounts for 51 of the 68 definite errors (75%).

### A. `OTHER/UNKNOWN` that should be `OPERATIONAL`

#### Recruitment / participation

- `NCT04862455` — `<75% participation`
- `NCT06193174` — not enough eligible participants to enroll
- `NCT06408168` — `<75% Participation`
- `NCT03275974` — `<75% participation`
- `NCT05171166` — difficult to enroll participants
- `NCT02738606` — `<75% participation`
- `NCT05454358` — not enough participants
- `NCT05317936` — `<75% participation`
- `NCT03698552` — `<75% participation`
- `NCT06199466` — `<75% participation`

#### Amendment / design / administration

- `NCT04939051` — not implemented
- `NCT03739814` — awaiting amendment to add new cohort
- `NCT05111561` — amendment needed to add new dose level
- `NCT06015880` — amendment pending for dose expansion
- `NCT05432804` — protocol amendment to use placebo
- `NCT04301076` — pending amendment
- `NCT05378763` — no patients enrolled; study redesign under discussion
- `NCT04169074` — standard of care changed, making the study design obsolete
- `NCT05989828` — pending protocol amendment approval
- `NCT06616623` — pending ICF revision
- `NCT05960773` — on hold pending updates to drug/manufacturer information
- `NCT06202066` — pending protocol changes

#### Drug supply / resources / staffing / logistics

- `NCT06802523` — drug supply issues
- `NCT06322576` — study drug no longer produced
- `NCT06865677` — PI left institution before treating participants
- `NCT04163718` — drug no longer available
- `NCT06332079` — devices no longer available after manufacturer stopped production
- `NCT04840472` — suspended until drug manufacturing is available
- `NCT06968195` — awaiting agreement with sponsor
- `NCT06420349` — sponsor phasing out drug supply
- `NCT06217094` — insufficient staff
- `NCT03595683` — drug supply no longer available
- `NCT02282917` — drug manufacturing logistics / lack of access to drug supply
- `NCT05358704` — no slots available
- `NCT06219174` — drugs unavailable

#### Business / strategy

- `NCT04617054` — sponsor business reasons
- `NCT04284488` — company strategy
- `NCT04643405` — company strategy
- `NCT04601857` — strategic considerations, explicitly not safety related
- `NCT05714345` — business reasons
- `NCT06106841` — strategic business reasons
- `NCT06198426` — company development strategy adjusted
- `NCT03055286` — business/strategic reason
- `NCT04294160` — business reasons, explicitly not safety related
- `NCT04123418` — business reasons, explicitly not safety/tolerability related
- `NCT03758417` — strategic realignment, explicitly not safety/efficacy/data-integrity related
- `NCT05313009` — study drug discontinued by manufacturer for business reasons
- `NCT06851442` — business reasons, explicitly not safety/efficacy related
- `NCT06438783` — business reasons, explicitly not safety/efficacy related
- `NCT03924869` — business reasons

#### Other operational

- `NCT05361057` — center conducted a more comprehensive study; original study discontinued

### B. `OPERATIONAL` that should be `OTHER/UNKNOWN`

The following records contain only a decision-maker statement, not the actual causal reason. They should not be treated as operational without additional evidence:

- `NCT05262530` — Sponsor decision
- `NCT04544995` — Sponsor Decision
- `NCT06478862` — Sponsor decision
- `NCT05676749` — Sponsor decision
- `NCT03844750` — Sponsor decision
- `NCT05047536` — Sponsor decision
- `NCT06509906` — Sponsor Decision
- `NCT05998447` — Sponsor decision
- `NCT04009681` — sponsor decision; only explicit extra information is that it was not related to safety

### C. Missed `EFFICACY/FUTILITY`

- `NCT04150029` — development program terminated following negative results from other trials
- `NCT04770272` — planned interim analysis estimated <2.5% probability of meeting the primary endpoint
- `NCT03075527` — criteria for the second stage were not met at interim analysis
- `NCT06162351` — no signal of activity
- `NCT04844073` — sponsor decision based on limited anti-cancer activity

### D. Missed `SAFETY`

- `NCT03225547` — terminated because of side effects (rash)

### E. Missed `REGULATORY`

- `NCT05223036` — FDA Partial Clinical Hold
- `NCT06355908` — suspended for HGRAC filing requirements

### F. Ambiguous / mixed-cause / non-failure cases

- `NCT05554380` — accrual goal reached; appears to be a planned milestone, not an operational failure
- `NCT04616560` — Stage 1 met accrual; appears to be a planned milestone
- `NCT06299761` — preliminary PK limitations plus development complexity/cost; scientific and operational causes are mixed
- `NCT04855253` — accrual met; appears to be a planned milestone
- `NCT03425331` — slow accrual, competing studies, and lack of efficacy all explicitly present
- `NCT03865212` — lack of funding and lack of objective response both explicitly present
- `NCT03708003` — primary endpoint successfully achieved before the board concluded the study
- `NCT06488716` — safety, preliminary efficacy, and overall risk-benefit were jointly considered
- `NCT03042169` — `default inclusion`; likely intended to mean lack of enrollment, but wording is too ambiguous for a confident automatic label
- `NCT05860296` — lack of efficacy and enrollment challenges both explicitly present

### Classifier issues exposed by Batch 1

1. **Generic decision-maker terms are overclassified as operational.** `Sponsor decision`, `sponsor request`, `PI decision`, etc. should not define causality on their own.
2. **Operational terms can suppress explicit biological failure.** A sentence can mention recruitment being stopped *because futility was demonstrated*. Explicit futility/endpoint failure should win over the operational action taken afterward.
3. **Operational vocabulary is incomplete.** Important missing patterns include amendments, `<75% participation`, drug/device availability, manufacturing, staffing, and similar administrative/logistical phrases.
4. **Safety vocabulary is incomplete.** Add `side effect` / `side effects` and likely common variants.
5. **Regulatory matching misses variants.** `FDA Partial Clinical Hold` should match the clinical-hold logic. HGRAC-related filing/approval requirements should also be treated as regulatory when explicitly causal.
6. **`interim analysis` alone is too weak to imply efficacy failure.** An interim analysis may simply be scheduled or pending; the text needs a negative efficacy/futility outcome.
7. **A planned-success / milestone category may be useful.** Examples include `goal met`, `accrual met`, successful primary endpoint completion, or completion of an initial protocol-defined phase.
8. **Generated JSON may not be synchronized with the current classifier code.** Several current code terms appear in records that remain `OTHER/UNKNOWN`, suggesting that the committed data may have been generated with an older classifier revision.

---

## Batch 2 — records 201–400

Batch boundary: record 201 is `NCT05393713`; record 400 is `NCT05604170`.

### Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 109 | 54.5% |
| Definitely misclassified | 77 | 38.5% |
| Ambiguous / multiple plausible causes / non-failure | 14 | 7.0% |
| Needs change or manual review | 91 | 45.5% |

### Main finding

Batch 2 confirms the Batch 1 pattern and makes it stronger. Of the 77 definite errors, 49 (63.6%) are `OTHER/UNKNOWN` records with a clearly operational cause. A second major error class is the inverse: 20 records are labeled `OPERATIONAL` even though the text gives only a decision/action and no causal reason.

### A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 49

#### Business / strategy / program decisions

- `NCT05427396` — change in research and development strategy; explicitly without safety concerns
- `NCT06280196` — regulatory-development landscape made the Phase 3 study unnecessary; study closed to conserve clinical resources
- `NCT06289894` — company R&D strategy adjustment
- `NCT05351697` — company R&D strategy adjustment
- `NCT05496569` — business reasons; explicitly not safety/efficacy related
- `NCT06018506` — company R&D strategy adjustment
- `NCT05938296` — strategy adjustment
- `NCT04024436` — strategic considerations; explicitly not safety related
- `NCT04504916` — business reasons
- `NCT06546553` — strategic considerations; explicitly not safety related
- `NCT06158958` — strategic considerations
- `NCT05513703` — strategic considerations
- `NCT05846646` — change in corporate strategy
- `NCT04702425` — business reasons
- `NCT04240704` — business, strategic, and development considerations; explicitly not safety related
- `NCT04712721` — business reasons
- `NCT04161885` — strategic considerations
- `NCT05976334` — business reasons

#### Funding / support / partner / site / resource causes

- `NCT05918055` — drug company withdrew support
- `NCT05035407` — site stopped because it planned to join a multicenter study of the therapy
- `NCT05180006` — partner Roche abandoned support
- `NCT04779151` — partner GSK abandoned support
- `NCT04276376` — partner Clovis bankruptcy
- `NCT06965881` — sites lacked operational capability to segregate participants
- `NCT06454409` — resources
- `NCT04209790` — no permanent PI available to continue the project
- `NCT03904862` — NCI grant would not be extended
- `NCT05033522` — sponsor unable to fund
- `NCT03868943` — company unable to continue supporting the investigator-sponsored study
- `NCT05756660` — site closure / potential transfer to another PI and institution
- `NCT04136912` — grant ended
- `NCT05199285` — sponsor withdrew support
- `NCT05579769` — principal investigator left institution
- `NCT03417921` — original study suspended because another study was opened

#### Drug / product / manufacturing availability

- `NCT06709131` — product manufacturing process improvement
- `NCT06388902` — drug stability plus global/program considerations
- `NCT03107780` — drug supply issues
- `NCT05400122` — drugs unavailable
- `NCT04874194` — company no longer provided investigational product
- `NCT04511130` — manufacturing timeline made the study impractical
- `NCT04424966` — study drug no longer available
- `NCT04541017` — drug supply issues
- `NCT04328714` — manufacturing facility renovation/reopening required before study product could be supplied

#### Recruitment / participation

- `NCT05065047` — `<75% participation`
- `NCT03396575` — not feasible to accrue because of competing studies
- `NCT03856216` — `<75% participation`
- `NCT03622775` — `<75% participation`

#### Protocol / design

- `NCT06806228` — study protocol will be changed
- `NCT01546571` — study halted to redesign a pivotal trial after interim analysis; no negative efficacy or safety result is stated

### B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 20

Most of these are the same structural false positive seen in Batch 1: the text identifies who made the decision but does not identify why.

- `NCT03284957` — sponsor decision; only says it was not a safety concern
- `NCT05954143` — Sponsor Decision
- `NCT04854499` — sponsor decision to terminate
- `NCT04370509` — collaborating sponsor decision
- `NCT06052852` — sponsor decision
- `NCT05798611` — sponsor decision; only says benefit-risk was not affected
- `NCT04958785` — sponsor decision
- `NCT04982224` — sponsor decision
- `NCT06069778` — sponsor decision
- `NCT04524689` — sponsor decision; only says it was not safety related
- `NCT06523803` — sponsor decision
- `NCT05169489` — Sponsor Decision
- `NCT05859464` — Sponsor Decision
- `NCT03792841` — Sponsor Decision
- `NCT03392064` — enrollment is on hold, but the causal reason for the hold is not supplied
- `NCT06563804` — sponsor decision
- `NCT05155709` — enrollment/program termination is described, but no causal reason for terminating the program is supplied
- `NCT05130866` — sponsor decision; only says it was not safety related
- `NCT04985604` — sponsor decision
- `NCT04659603` — sponsor decision; only says it was not safety related

### C. Missed `EFFICACY/FUTILITY` — 6

- `NCT04955743` — lack of activity of the drugs
- `NCT04396535` — three other studies failed to show benefit for the same agent
- `NCT03770494` — lack of sufficient efficacy
- `NCT04363801` — experimental treatment expected not to be more efficacious than comparator on the primary PFS endpoint
- `NCT03522142` — lack of robust efficacy after review of overall clinical activity
- `NCT05276492` — primary endpoint not met

### D. Missed `SAFETY` — 2

- `NCT04876248` — `AE`; in this context the standard abbreviation for adverse event
- `NCT05525286` — trial terminated after benefit-risk reassessment; termination implies an unfavorable benefit-risk outcome and belongs with biological safety/risk failure under the current taxonomy

### E. Ambiguous / mixed-cause / planned-success / non-failure cases — 14

- `NCT06295549` — `Achieve the proof of concept`; appears to be a successful milestone rather than a failure
- `NCT06304636` — Phase 1 enrollment completed; further development terminated, but no causal reason for ending development is supplied
- `NCT04725331` — Phase I completed, followed by sponsor decision; explicitly not safety related, but the actual reason is absent
- `NCT03979508` — primary biomarker was rarely observed in the first stage; plausibly scientific futility, but no explicit futility/endpoint rule is stated
- `NCT05617040` — Phase 1 completed and the study was then discontinued; explicitly not safety related
- `NCT05252390` — sponsor states that its objectives were achieved; successful milestone, not a failure
- `NCT04539366` — suspended for review of safety data; a review is safety-related but does not itself establish an adverse safety finding
- `NCT04035434` — participants moved to long-term follow-up in another study; appears to be an administrative transition rather than failure
- `NCT05220722` — Phase 1b completed and sponsor chose not to proceed to Phase 2; explicitly not due to safety or data concerns
- `NCT04935229` — Phase 1 completed and sponsor chose not to proceed to Phase 2; explicitly not due to safety or data concerns
- `NCT03590652` — primary endpoint was met; successful completion signal rather than failure
- `NCT01382706` — `Trial not progressing toward scientific goals`; likely scientific futility, but too nonspecific for a confident automatic assignment
- `NCT04799275` — end of the initial phase of a multi-phase protocol; protocol milestone, not evidence of failure
- `NCT05326035` — sponsor cites both `current data` and R&D strategy; the data-based component is unspecified, so biological versus operational causality cannot be separated confidently

### Classifier issues reinforced or newly exposed by Batch 2

1. **Generic sponsor/PI decision terms must not be causal classifiers.** This remains one of the largest systematic false-positive sources.
2. **Program-stage language needs special handling.** `Phase 1 enrollment completed`, `objectives achieved`, `primary endpoint met`, and `end of initial phase` should not be interpreted as failure simply because a later phase was not opened.
3. **Operational vocabulary still misses high-frequency real-world phrasing.** Examples include partner abandonment/bankruptcy, grant expiration, investigator departure, product/manufacturing availability, facility renovation, and explicit R&D/corporate-strategy wording.
4. **Efficacy vocabulary needs broader semantic variants.** Add patterns such as `lack of activity`, `lack of sufficient efficacy`, `lack of robust efficacy`, `not more efficacious`, and `not meeting primary endpoint`.
5. **Safety vocabulary needs abbreviations.** `AE` should be recognized as adverse event when used as the stop reason. Benefit-risk reassessment that causes termination should also be handled explicitly.
6. **An action is not a cause.** `Enrollment hold`, `enrollment terminated`, or `program terminated` should not automatically become operational unless the text explains *why* the action occurred.
7. **Strict regulatory gating remains useful.** `NCT06280196` mentions a changed regulatory-development landscape, but no regulator, hold, authority request, or regulatory action caused the stop; this is better treated as a program/operational decision than `REGULATORY`.
8. **The committed JSON still appears out of sync with the current classifier vocabulary.** Numerous phrases that are now present in the current code remain `OTHER/UNKNOWN` in the generated data, reinforcing the need for a clean regeneration before measuring classifier performance after code changes.

---

## Cumulative status — records 1–400

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 231 | 57.75% |
| Definitely misclassified | 145 | 36.25% |
| Ambiguous / multiple plausible causes / non-failure | 24 | 6.00% |
| Needs change or manual review | 169 | 42.25% |

Across the first 400 records, the dominant remediation priorities are:

1. separate **decision-maker/action language** from actual causal reasons;
2. substantially expand **operational** vocabulary for supply, funding, staffing, partner, manufacturing, amendment, and strategy causes;
3. give explicit **efficacy/futility** and **safety** evidence precedence over incidental operational wording;
4. introduce explicit handling for **planned/successful milestones** so they are not represented as trial failures;
5. regenerate the dataset with a versioned current classifier before using aggregate error rates as a post-fix benchmark.

---

## Batch 3 — records 401–600

Batch boundary: record 401 is `NCT02982694`; record 600 is `NCT05817058`.

### Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 112 | 56.0% |
| Definitely misclassified | 70 | 35.0% |
| Ambiguous / multiple plausible causes / non-failure | 18 | 9.0% |
| Needs change or manual review | 88 | 44.0% |

### Main finding

Batch 3 confirms the pattern from Batches 1 and 2. Of the 70 definite errors, 42 (60.0%) are `OTHER/UNKNOWN` records with a clearly operational cause, while 18 (25.7%) are labeled `OPERATIONAL` even though the text gives only a decision or action and no causal reason. In total, 60 of 70 definite errors (85.7%) remain concentrated at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary.

### A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 42

#### Business / strategy / development program

- `NCT04000529` — business reasons
- `NCT05168202` — business objectives have changed
- `NCT05870748` — strategic business considerations / development deprioritized; explicitly not safety/efficacy related
- `NCT06270082` — limited resources and strategic priorities
- `NCT05588609` — changes in organizational priorities
- `NCT03446040` — business objectives have changed
- `NCT06285097` — strategic business reasons; explicitly not safety/efficacy related
- `NCT04762602` — strategic evaluation of clinical development; no safety concerns
- `NCT04855136` — business objectives have changed
- `NCT05707676` — adjustment of sponsor development strategy
- `NCT06226766` — strategic realignment of clinical-trial priorities
- `NCT03843918` — company strategy caused termination of Phase 2
- `NCT03838367` — business reasons
- `NCT04502082` — sponsor redirected development effort to the pediatric study
- `NCT05662670` — R&D strategy adjustment
- `NCT06016270` — company strategy
- `NCT05577715` — business objectives have changed
- `NCT03149575` — change in clinical development plan
- `NCT04815083` — closure of sponsor's business
- `NCT05490043` — adjustment of investigational-drug development strategy
- `NCT03114319` — business reasons; explicitly not safety related
- `NCT05208177` — R&D strategy adjustment
- `NCT02784795` — business considerations
- `NCT05149807` — R&D strategy adjustment
- `NCT06321068` — company R&D strategy adjustment
- `NCT02900651` — business reasons; explicitly not safety/tolerability related
- `NCT05743036` — change in therapeutic landscape
- `NCT05248789` — strategy adjustment
- `NCT03194646` — change in development program
- `NCT03249792` — business reasons

#### Recruitment / participation / feasibility

- `NCT04216472` — `<75% participation`
- `NCT03948529` — inclusion difficulties
- `NCT07166367` — difficulty enrolling patients with the disease under study
- `NCT03769532` — feasibility
- `NCT05026736` — PI request plus `<75% participation`
- `NCT05623488` — feasibility concerns
- `NCT03579446` — `<75% participation`

#### Protocol / administration / resources / manufacturing

- `NCT05358808` — deficiencies in the study protocol
- `NCT03347617` — principal-investigator transition
- `NCT05834569` — challenges completing the research-registration process
- `NCT03015792` — drug company declined to fund the Phase 2 portion
- `NCT06343376` — manufacturing issues

### B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 18

These records identify a decision-maker or an action, but do not supply the actual causal reason.

- `NCT05961839` — Company decision
- `NCT05445609` — sponsor memo pauses enrollment across vidutolimod studies; actual reason absent
- `NCT02967692` — Sponsor decision
- `NCT04023331` — Sponsor decision
- `NCT05128773` — sponsor decision; only says it was not safety related
- `NCT06175221` — sponsor decision
- `NCT04278144` — Sponsor Decision
- `NCT04630353` — Sponsor decision
- `NCT04418167` — Sponsor decision
- `NCT04887831` — sponsor no longer pursuing the indication; discontinuation action is given, but not the underlying reason
- `NCT05245071` — sponsor decision; not related to safety
- `NCT05633160` — Sponsor Decision
- `NCT05071053` — sponsor decision; not related to safety
- `NCT05883449` — due to sponsor decision
- `NCT07121829` — Sponsor decision
- `NCT05011058` — Sponsor Decision
- `NCT04579679` — Sponsor decision
- `NCT05376345` — per sponsor request

### C. Missed `EFFICACY/FUTILITY` — 6

- `NCT02982694` — interim efficacy was inferior to expected and very unlikely to reverse with full completion
- `NCT06056310` — lack of evidence of efficacy / meaningful clinical benefit; explicitly no major safety concern
- `NCT05678257` — pre-planned analysis concluded that the trial was unlikely to achieve its primary objective of superior PFS
- `NCT03860844` — Stage 2 efficacy criteria not met; explicitly not a safety stop
- `NCT05220098` — terminated due to limited anti-cancer activity
- `NCT05420636` — closed because of low probability of successful outcomes

### D. Missed `SAFETY` — 3

- `NCT05904496` — clinical development stopped because of an imbalanced benefit/risk profile
- `NCT06171789` — overall benefit-risk profile no longer supports continuation
- `NCT06376253` — termination due to lack of tolerability

### E. Missed `REGULATORY` — 1

- `NCT02742883` — `Clinical Hold`

### F. Ambiguous / mixed-cause / planned-success / non-failure cases — 18

- `NCT06516510` — interim data indicate that the study will not adequately inform the development program; no safety issue, but the precise scientific failure is not stated
- `NCT05821777` — decision based jointly on unspecified data and the competitive landscape; biological versus strategic causality cannot be separated
- `NCT03769181` — some cohorts failed pre-planned interim criteria while others fulfilled them and were stopped by sponsor decision
- `NCT03108495` — required number of events for endpoint evaluation had been reached; looks like an event-driven study milestone rather than failure
- `NCT05733351` — study terminated to review safety data; a safety review alone does not establish an adverse safety finding
- `NCT04478266` — termination followed IDMC review of prespecified interim efficacy data and no new safety signal, but the actual negative efficacy result is not explicitly stated
- `NCT06232044` — end of the Phase I portion of the study; protocol milestone, not evidence of failure
- `NCT06639958` — all potential pilot-phase patients had been enrolled; planned milestone
- `NCT00766142` — external evidence of no efficacy in KRAS-mutant disease led to eligibility restriction, followed by very slow inclusion; biological and operational factors coexist
- `NCT03646123` — sponsor believed enough data had been collected to demonstrate safety and efficacy; explicitly not a safety/efficacy concern
- `NCT01703754` — SRC review, dose reductions and sponsor termination of development coexist, but the actual causal reason is not sufficiently explicit
- `NCT04951778` — efficacy endpoint was met, but the dosing regimen was considered unsuitable for further development
- `NCT05328908` — inability to meet protocol objectives; too nonspecific to distinguish efficacy/futility from operational inability
- `NCT04141995` — both low accrual and futility explicitly caused closure
- `NCT06158100` — funding-sponsor decision following review of efficacy data from other trials; the efficacy result/direction itself is not stated
- `NCT05369000` — intended Phase 1/2 trial never progressed to Phase 2; no causal reason for the stage transition is supplied
- `NCT05571293` — study paused to review safety data; review does not itself prove a safety failure
- `NCT04904185` — evaluation of Step A did not support adding pembrolizumab in Step B, but the actual go/no-go criterion is not stated

### Classifier issues reinforced or newly exposed by Batch 3

1. **Decision/action vocabulary still causes structural false positives.** `Sponsor decision`, `sponsor request`, `company decision`, `PI request`, and similar phrases must not define an operational cause by themselves.
2. **`interim analysis` must not independently imply efficacy failure.** Require an explicit negative outcome such as futility, failure to meet a criterion/endpoint, insufficient efficacy, or low probability of success.
3. **`clinical hold` currently collides between `SAFETY` and `REGULATORY`.** Under the audit taxonomy, an explicit clinical hold is regulatory unless the text separately establishes an underlying safety failure. The classifier's precedence and term placement should be corrected accordingly.
4. **Benefit-risk and tolerability language needs explicit biological handling.** `imbalanced benefit/risk`, `benefit-risk profile no longer supports continuation`, and `lack of tolerability` should map to `SAFETY` under the current taxonomy.
5. **Program/portfolio/strategy vocabulary remains incompletely normalized.** R&D realignment, development-strategy changes, organizational priorities, business closure, and therapeutic-landscape changes are operational when explicitly causal.
6. **Action versus cause applies beyond sponsor decisions.** `No longer pursuing an indication`, `program discontinued`, or `enrollment paused` describes what happened; it is not automatically the causal reason.
7. **The committed generated data still appears stale relative to current classifier code.** Multiple terms already present in the current classifier remain `OTHER/UNKNOWN` in the committed JSON, so a clean versioned regeneration is required before post-fix performance measurement.

---

## Cumulative status — records 1–600

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 343 | 57.17% |
| Definitely misclassified | 215 | 35.83% |
| Ambiguous / multiple plausible causes / non-failure | 42 | 7.00% |
| Needs change or manual review | 257 | 42.83% |

Of the 215 definite errors across the first 600 records:

- 142 (66.0%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 47 (21.9%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 17 (7.9%) are missed `EFFICACY/FUTILITY`;
- 6 (2.8%) are missed `SAFETY`;
- 3 (1.4%) are missed `REGULATORY`.

Thus 189 of 215 definite errors (87.9%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

---

## Batch 4 — records 601–800

Batch boundary: record 601 is `NCT00087776`; record 800 is `NCT02467582`.

### Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 119 | 59.5% |
| Definitely misclassified | 68 | 34.0% |
| Ambiguous / multiple plausible causes / non-failure | 13 | 6.5% |
| Needs change or manual review | 81 | 40.5% |

### Main finding

Batch 4 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 68 definite errors, 38 are `OTHER/UNKNOWN` records with a clearly operational cause and 19 are labeled `OPERATIONAL` even though the text supplies only a decision/action and no causal reason. Together these 57 records account for 83.8% of all definite Batch 4 errors.

### A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 38

#### Business / R&D / portfolio / strategy

- `NCT06024174` — business objectives have changed
- `NCT03777124` — sponsor R&D strategy adjusted
- `NCT05054543` — strategic realignment of company development focus
- `NCT05055518` — corporate development-strategy adjustment; explicitly not safety/efficacy related
- `NCT03786926` — strategic evaluation of clinical development
- `NCT04991129` — change in development strategy
- `NCT04102124` — sponsor R&D strategy adjusted
- `NCT05461794` — modification of company strategy
- `NCT05169684` — business objectives have changed
- `NCT04986865` — competitor landscape and strategic consideration
- `NCT05265975` — sponsor R&D strategy adjustment
- `NCT04820023` — changing NSCLC treatment landscape
- `NCT05657418` — company R&D strategy adjustment
- `NCT04034446` — company strategy adjustment
- `NCT04789655` — business objectives have changed
- `NCT00529113` — pursuing other indications
- `NCT04152018` — strategic considerations; explicitly not safety/regulatory driven
- `NCT04735575` — resource optimization and product-development change
- `NCT05192174` — reconsideration of development strategy
- `NCT05038800` — business reasons
- `NCT04237649` — business reasons
- `NCT04856787` — company R&D strategy adjustment
- `NCT03400176` — business reasons

#### Recruitment / participation / feasibility

- `NCT05142904` — subsidy ended and inclusion rate was insufficient
- `NCT04752332` — inability to enroll study participants
- `NCT04503668` — lack of patient population
- `NCT03101748` — `<75% accrued`
- `NCT03537599` — poor accrual

#### Drug/product supply, funding/support, staffing, administration

- `NCT03547999` — drugs unavailable
- `NCT05159050` — drug supply issues
- `NCT04992507` — principal investigator departed sponsoring organization
- `NCT04886986` — collaborator availability
- `NCT03724084` — study agent no longer available
- `NCT05243641` — sponsor withdrew support
- `NCT05366842` — sponsor unable to produce/provide study material
- `NCT03772925` — drug supply issues
- `NCT01720563` — study-drug dosage-form change
- `NCT04252859` — PI leaving institution

### B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 19

These records describe who acted or what was stopped, but do not supply a sufficient causal reason.

- `NCT04259450` — sponsor decision to terminate Phase 2 enrollment
- `NCT05387265` — Sponsor Decision
- `NCT05209152` — sponsor decision; only says unrelated to safety
- `NCT02675452` — sponsor decision; only says unrelated to safety
- `NCT05788926` — sponsor decision; only says unrelated to safety
- `NCT05839600` — Sponsor decision
- `NCT03816839` — sponsor decision; only says not linked to safety
- `NCT05511844` — Sponsor Decision
- `NCT05153330` — no longer pursuing oncology indications; closure action stated, but underlying cause absent
- `NCT04455620` — Sponsor decision
- `NCT05785715` — Sponsor Decision / not safety related
- `NCT05330429` — sponsor decision to terminate
- `NCT06630247` — Company Decision
- `NCT04908111` — sponsor decided to permanently close recruitment
- `NCT05839626` — sponsor decision; only says not safety related
- `NCT04406272` — development program no longer pursued; action stated, underlying cause absent
- `NCT04394624` — sponsor decision; only says not safety related
- `NCT05603572` — enrollment paused; reason absent
- `NCT03742349` — sponsor decision; only says not a safety concern

### C. Missed `EFFICACY/FUTILITY` — 6

- `NCT05879458` — no significant improvement in disease
- `NCT04720417` — no patients had significant reduction in disease
- `NCT05580588` — efficacy was less than anticipated; explicitly no safety issues
- `NCT03712371` — interim study results were not favorable enough to continue enrollment
- `NCT01251965` — nonsatisfactory clinical benefit even at the highest dose
- `NCT01751425` — no additional benefit with addition of ruxolitinib

### D. Missed `SAFETY` — 3

- `NCT06771921` — emerging safety observations and overall benefit-risk assessment caused termination
- `NCT04865419` — trial terminated based on benefit-risk profile assessment
- `NCT03294694` — `Safety Implications`

### E. Inverse biological false positives — 2

- `NCT05714553` — currently `SAFETY`, but the causal reason is pipeline-strategy refinement and the text explicitly says the overall risk-benefit assessment remains positive; should be `OPERATIONAL`
- `NCT06449482` — currently `EFFICACY/FUTILITY`, but `the number of participants ... did not meet expectations` is a recruitment/enrollment problem; should be `OPERATIONAL`

### F. Ambiguous / mixed-cause / planned-success / non-failure cases — 13

- `NCT04239092` — study-design/protocol optimization to further evaluate safety; no explicit adverse safety finding is stated
- `NCT03287817` — unspecified data review plus changing treatment landscape
- `NCT03991741` — feasibility, safety issues, and endpoint failure are all explicit
- `NCT06643117` — continuing the trial was no longer necessary because comparability can be demonstrated from analytical/PK data; non-failure
- `NCT03248492` — last participant transitioned to an alternative study
- `NCT05386550` — program stopped because of the outcome of another Phase III study, but the direction/nature of that outcome is not stated
- `NCT04804709` — FDA withdrew approval while the underlying reason was inability to complete required postmarketing trials; regulatory and operational causality are intertwined
- `NCT02420717` — both low accrual and lack of response
- `NCT02419495` — `Administratively Complete`; likely administrative completion rather than failure
- `NCT05292898` — `Achieve the proof of concept`; successful milestone
- `NCT03505710` — last participant transitioned to an alternative study
- `NCT04861181` — end of inclusion period; likely planned milestone
- `NCT04642365` — recruitment challenges plus low likelihood of achieving targeted efficacy

### Classifier issues reinforced or newly exposed by Batch 4

1. **Efficacy matching needs subject/context control.** Phrases such as `did not meet expectations` must not trigger efficacy unless the unmet item is an efficacy endpoint/criterion. Participant counts failing expectations are operational.
2. **Benefit-risk language needs polarity handling.** An unfavorable/imbalanced benefit-risk assessment can support `SAFETY`; an explicitly positive risk-benefit assessment must negate a safety-failure interpretation.
3. **Program discontinuation is an action layer, not automatically a cause.** `No longer pursuing development`, `program discontinued`, and `enrollment paused` need a separate causal phrase before they become operational.
4. **Operational vocabulary remains incomplete.** Recurrent misses include R&D strategy changes, business reasons, competitor/treatment-landscape changes, investigator departure, collaborator availability, funding/support withdrawal, and drug/study-material availability.
5. **Non-failure/milestone handling is increasingly necessary.** `Achieve the proof of concept`, `End of inclusion period`, `Administratively Complete`, participant transition to another study, and a study becoming unnecessary after sufficient comparability evidence should not be forced into a failure class.
6. **Mixed regulatory/operational cases need explicit policy.** A regulator action may be the immediate trigger while an operational constraint is the underlying reason. The taxonomy should preserve or flag such dual causality rather than rely on one keyword-precedence rule.

---

## Cumulative status — records 1–800

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 462 | 57.75% |
| Definitely misclassified | 283 | 35.38% |
| Ambiguous / multiple plausible causes / non-failure | 55 | 6.88% |
| Needs change or manual review | 338 | 42.25% |

Of the 283 definite errors across the first 800 records:

- 180 (63.6%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 66 (23.3%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 23 (8.1%) are missed `EFFICACY/FUTILITY`;
- 9 (3.2%) are missed `SAFETY`;
- 3 (1.1%) are missed `REGULATORY`;
- 2 (0.7%) are inverse biological false positives.

Thus 246 of 283 definite errors (86.9%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

---

## Batch 5 — records 801–1000

Batch boundary: record 801 is `NCT05447663`; record 1000 is `NCT03727061`.

### Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 113 | 56.5% |
| Definitely misclassified | 64 | 32.0% |
| Ambiguous / multiple plausible causes / non-failure | 23 | 11.5% |
| Needs change or manual review | 87 | 43.5% |

### Main finding

Batch 5 again shows the same structural classifier problem. Of the 64 definite errors, 35 are `OTHER/UNKNOWN → OPERATIONAL` and 21 are `OPERATIONAL → OTHER/UNKNOWN`. These 56 records account for 87.5% of all definite Batch 5 errors.

### A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 35

#### Business / strategy / development

- `NCT04570631` — strategic considerations
- `NCT06214793` — company acquisition followed by leadership decision not to move forward
- `NCT04464798` — business objectives have changed
- `NCT05840510` — business objectives have changed
- `NCT03110107` — business objectives have changed
- `NCT02875223` — business objectives have changed
- `NCT04893759` — company strategy
- `NCT03486067` — business objectives have changed
- `NCT06094296` — business objectives have changed
- `NCT05179239` — development-strategy adjustment
- `NCT02974725` — business reasons
- `NCT04764474` — strategic evaluation of clinical development
- `NCT05609942` — alignment of strategic priorities
- `NCT04556617` — business realignment
- `NCT03038230` — strategic considerations
- `NCT04853329` — business reasons
- `NCT04553692` — strategic corporate pivot
- `NCT04975399` — business objectives have changed
- `NCT05543629` — business objectives have changed
- `NCT05293912` — adjustment of clinical development plan

#### Staffing / supply / manufacturing / funding

- `NCT00195091` — PI left MSKCC
- `NCT02991651` — study drug supply expired; no replacement manufactured
- `NCT05038644` — study drug expired
- `NCT01386710` — PI left institution
- `NCT05355597` — physician left institution
- `NCT05737706` — formulation challenges
- `NCT06281106` — external research funds canceled
- `NCT04239040` — manufacturing issues

#### Recruitment / feasibility / protocol / external environment

- `NCT03286114` — lack of patient population
- `NCT00238355` — competing study at site
- `NCT06001372` — feasibility challenges
- `NCT03492125` — major protocol revisions; replacement study planned
- `NCT04786964` — regional political conflict
- `NCT04450836` — external trial results changed clinical management and made continued inclusion impractical
- `NCT05375708` — pilot findings required major study-design overhaul

### B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 21

- `NCT04427072` — company decision; only adds that it was not safety related
- `NCT03490838` — sponsor decision; Phase II was not initiated, but the causal reason is absent
- `NCT02047500` — company decision to discontinue clinical development; underlying reason absent
- `NCT05618613` — sponsor decision to discontinue development; underlying reason absent
- `NCT04827576` — sponsor decision to terminate study
- `NCT05571969` — Company Decision
- `NCT05494762` — Sponsor decision
- `NCT05374538` — Sponsor decision
- `NCT04301011` — Sponsor decision
- `NCT04006119` — Sponsor Decision
- `NCT04925986` — sponsor decision based on unspecified data from other trials
- `NCT03975387` — Sponsor Decision
- `NCT03690869` — Sponsor Decision
- `NCT04625205` — sponsor decision
- `NCT05695898` — sponsor decision
- `NCT04382898` — sponsor decision
- `NCT04778410` — sponsor decision
- `NCT04101357` — sponsor decision
- `NCT04419389` — sponsor decision
- `NCT05446129` — Company decision
- `NCT05166577` — Sponsor Decision

### C. Missed `EFFICACY/FUTILITY` — 5

- `NCT04171219` — no PR/CR in Stage 1, therefore no progression to Stage 2
- `NCT03596073` — required cytokine induction not observed at interim analysis; continuation not justified
- `NCT05904236` — lack of demonstrated clinical activity
- `NCT04084366` — expected therapeutic potential not shown
- `NCT03520790` — Phase II not pursued due to explicitly stated futility based on another therapeutic trial

### D. Missed `SAFETY` — 1

- `NCT04251065` — unacceptable level of relevant toxicities triggered statistical stopping rules and DSMB-recommended termination

### E. Missed `REGULATORY` — 2

- `NCT04973930` — HHS Office for Human Research Protections FWA restriction plus IRB pause caused suspension
- `NCT03764540` — explicit approval by regulatory authorities made continuation unnecessary

### F. Ambiguous / mixed-cause / planned-success / non-failure cases — 23

- `NCT00635167` — PI closure with final report submitted; likely administrative completion rather than failure
- `NCT03994705` — Phase 1 enrollment completed, followed by discontinuation of further development without a causal reason
- `NCT03456700` — closure based on interim-analysis results, but the direction/nature of the results is not stated
- `NCT04732286` — study completed as pre-specified in the protocol; non-failure
- `NCT04853043` — slow recruitment, funding concerns, and poor response to treatment are all explicit
- `NCT01324635` — Arm A reached its goal while Arm B had poor accrual
- `NCT00640978` — significant adverse effects and futility are both explicit
- `NCT00253318` — toxicity and lack of efficacy are both explicit
- `NCT04435691` — malformed participation wording (`75% > Participants`) prevents confident automatic interpretation
- `NCT04047797` — `Administratively Complete` combined with low participation; completion and operational failure signals are mixed
- `NCT05787496` — program reprioritization plus limited clinical activity
- `NCT04875806` — limited Phase 1 activity plus prioritization of another program
- `NCT04870112` — Part 1 completed, Part 2 was not initiated, with no safety/clinical concerns stated; program-stage/non-failure pattern
- `NCT04485416` — PI discretion plus CAPA review; compliance/quality versus administrative causality is unclear
- `NCT03452592` — indication already approved for marketing; development milestone rather than trial failure
- `NCT02973763` — indication already approved for marketing; development milestone rather than trial failure
- `NCT03127449` — indication already approved for marketing; development milestone rather than trial failure
- `NCT04896658` — FDA withdrawal, lack of enrollment, and availability of safer BCMA therapies are all explicit
- `NCT04108481` — DSMC-directed closure without the underlying safety/futility reason
- `NCT05494866` — lack of efficacy paired with high toxicity
- `NCT04298983` — `Abemaciclib efficacy` supplies no polarity/direction and cannot support a confident efficacy-failure assignment
- `NCT04586270` — safety profile, absence of encouraging anti-tumor activity, and strategic decision are jointly cited
- `NCT05770882` — `overall profile does not support development`, but the relevant dimension is unspecified

### Classifier issues reinforced or newly exposed by Batch 5

1. **Use a two-layer representation: action versus cause.** `Terminated`, `enrollment stopped`, `sponsor decision`, `program discontinued`, or `did not proceed to Phase 2` describe an action/state transition. The causal layer should separately identify `futility`, `toxicity`, `funding`, `poor accrual`, `strategy`, `manufacturing`, or regulatory action.
2. **Multi-cause records should be preserved rather than forcibly flattened.** Safety + efficacy and operational + efficacy combinations recur often enough to justify either multiple cause tags or a dedicated mixed-cause flag.
3. **Operational vocabulary still needs broader coverage.** Acquisition/leadership changes, formulation problems, canceled external research funds, political conflict, clinical-development-plan adjustments, and protocol-overhaul language are recurring misses.
4. **Regulatory logic should distinguish concrete authority actions from regulatory context.** OHRP/FWA restrictions, explicit regulator approvals/withdrawals, clinical holds, and authority requests are concrete regulatory triggers; a changed regulatory landscape by itself is not.
5. **Regulatory success can be a non-failure milestone.** Marketing approval can make continued enrollment unnecessary without indicating scientific or operational failure.
6. **Biological evidence must outrank the operational action it causes.** `Enrollment terminated because of unacceptable toxicity` is `SAFETY`; the enrollment action must not dominate the causal signal.
7. **The non-failure/milestone category is now strongly supported.** Protocol-complete studies, marketing approvals, completed early phases, reached goals, and similar planned/successful outcomes should not be forced into a failure taxonomy.

---

## Cumulative status — records 1–1000

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 575 | 57.5% |
| Definitely misclassified | 347 | 34.7% |
| Ambiguous / multiple plausible causes / non-failure | 78 | 7.8% |
| Needs change or manual review | 425 | 42.5% |

Of the 347 definite errors across the first 1000 records:

- 215 (62.0%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 87 (25.1%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 28 (8.1%) are missed `EFFICACY/FUTILITY`;
- 10 (2.9%) are missed `SAFETY`;
- 5 (1.4%) are missed `REGULATORY`;
- 2 (0.6%) are inverse biological false positives.

Thus 302 of 347 definite errors (87.0%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

---

# Classification Audit — Batch 6

This section is the completed manual semantic audit for records 1001–1200 and is intended to be folded into `docs/classification_audit.md`. It uses the same methodology and taxonomy as Batches 1–5.

Batch boundary: record 1001 is `NCT03387592`; record 1200 is `NCT03099499`.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 112 | 56.0% |
| Definitely misclassified | 69 | 34.5% |
| Ambiguous / multiple plausible causes / non-failure | 19 | 9.5% |
| Needs change or manual review | 88 | 44.0% |

## Main finding

Batch 6 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 69 definite errors, 32 are `OTHER/UNKNOWN` records with a clearly operational cause and 27 are labeled `OPERATIONAL` even though the text supplies only a decision/action and no causal reason. Together these 59 records account for 85.5% of all definite Batch 6 errors. The remaining 10 definite errors are five missed `EFFICACY/FUTILITY` cases, one missed `SAFETY` case, and four missed `REGULATORY` cases.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 32

### Business / R&D / development strategy / treatment landscape

- `NCT04477291` — corporate strategy
- `NCT03893682` — corporate strategy
- `NCT06068868` — strategic considerations
- `NCT01997840` — business priorities
- `NCT06848556` — company operational-strategy adjustment
- `NCT04901988` — study redesign because standard-of-care guidelines changed
- `NCT04804696` — external treatment landscape / new trial evidence made continuation inappropriate
- `NCT05987605` — R&D strategy adjustment
- `NCT06834399` — business-operation strategy adjustment
- `NCT05559541` — development-strategy adjustment
- `NCT04906382` — sponsor reorganization
- `NCT05080842` — sponsor development strategy adjusted
- `NCT04812535` — development stopped because new alternative treatments with high efficacy changed the treatment landscape
- `NCT06191250` — change in standard of care before trial activation
- `NCT03948763` — business reasons
- `NCT04492033` — change of development plan
- `NCT04171141` — strategic considerations; explicitly not safety related
- `NCT05382936` — landscape of similar drugs and evolving standard of care
- `NCT04807972` — strategic considerations
- `NCT05799183` — sponsor R&D strategy adjusted

### Support / supply / resources / staffing

- `NCT05403723` — PI changed institution; continuation depended on approval at the new location
- `NCT04897880` — drug supply
- `NCT04150965` — pharmaceutical support discontinued
- `NCT05096234` — loss of sponsor support
- `NCT01743807` — supplier no longer supported the study or study drug
- `NCT02714439` — PI left the institution
- `NCT04440982` — required resources unavailable
- `NCT03092635` — principal investigator departed the institution

### Recruitment / feasibility / program execution

- `NCT00560118` — slow inclusion / difficulty running the study
- `NCT02780128` — Part 1 goals met, but Part 2 was infeasible because matching therapies were unavailable
- `NCT05348889` — R&D strategy adjustment
- `NCT04871529` — inability to accrue sufficient patients

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 27

These records identify an actor, decision, suspension, or program action but do not provide the actual causal reason.

- `NCT04032847` — sponsor decision
- `NCT05576077` — sponsor decision
- `NCT03997474` — sponsor decision
- `NCT04965753` — sponsor decision
- `NCT05537766` — sponsor decision
- `NCT04268888` — analysis led to recruitment closure, but the relevant result/polarity is not supplied
- `NCT04905407` — sponsor decision
- `NCT04465487` — sponsor decision
- `NCT04502888` — sponsor decision
- `NCT05191667` — enrollment suspended pending sponsor decision; underlying cause absent
- `NCT02657005` — sponsor decision
- `NCT02187848` — sponsor decision; only says it was not safety related
- `NCT04862780` — sponsor decision; only says it was not safety related
- `NCT05241873` — sponsor decision; only says it was not safety related
- `NCT05631574` — no longer pursuing oncology indications; explicitly no safety/efficacy issue, but the actual causal reason is absent
- `NCT04796324` — company decision
- `NCT05497453` — sponsor decision after monotherapy dose escalation; underlying cause absent
- `NCT05295927` — administrative decision only
- `NCT05601219` — internal company decision, explicitly non-safety related; underlying cause absent
- `NCT02672917` — sponsor decision
- `NCT04059484` — sponsor decision; explicitly not linked to safety
- `NCT04074759` — sponsor decision
- `NCT06302140` — sponsor decision
- `NCT05427812` — business decision without the underlying reason
- `NCT04362007` — sponsor decision; explicitly not safety related
- `NCT04979442` — sponsor decision
- `NCT05218096` — sponsor decision

## C. Missed `EFFICACY/FUTILITY` — 5

- `NCT04421222` — lack of improved efficacy
- `NCT05075577` — lack of improved efficacy
- `NCT05436639` — no clear benefit
- `NCT02722512` — lack of substantial evidence for immune responses
- `NCT03371381` — lack of clinical benefit

## D. Missed `SAFETY` — 1

- `NCT05580770` — lack of tolerability

## E. Missed `REGULATORY` — 4

- `NCT05135650` — FDA withdrawal of Emergency Use Authorization caused the stop
- `NCT04289805` — new European legislation on drug studies forced termination
- `NCT03705403` — study did not transition to EU Clinical Trial Regulation (CTR) No 536/2014
- `NCT02736448` — formal official reclassification of LUTATHERA led to early closure of enrollment

## F. Ambiguous / mixed-cause / planned-success / non-failure cases — 19

- `NCT04963270` — halted after review of primary results, but result direction/polarity is not stated
- `NCT04709380` — significant superiority / predefined interim endpoints met; successful planned stop rather than failure
- `NCT02464007` — protocol amended and FDA-approved; procedural/regulatory milestone without a failure cause
- `NCT04158141` — `Permanent Administrative Closure`; action is clear, underlying reason is not
- `NCT03016091` — slow accrual plus dismal results; operational and efficacy causes are both explicit
- `NCT04718675` — lack of safety and futility; mixed `SAFETY` + `EFFICACY/FUTILITY`
- `NCT05241613` — benefit-risk ratio changes; direction and causal dimension are not clear enough for a single label
- `NCT00961571` — unanticipated side effects and futility; mixed `SAFETY` + `EFFICACY/FUTILITY`
- `NCT04999202` — protocol-defined end reached after the last subject; planned completion/non-failure
- `NCT04370834` — randomized data no longer support continuation, but the relevant data dimension is not specified clearly enough to choose efficacy versus safety
- `NCT02413489` — DLBCL/FL cohorts met futility criteria while the MCL cohort stopped for slow recruitment/aggressive disease; mixed biological and operational causality across cohorts
- `NCT05098405` — safety profile adequately characterized after dose escalation; successful milestone rather than safety failure
- `NCT05144009` — benefit-risk profile does not support continuation; biologically negative but insufficient to isolate safety versus efficacy
- `NCT04916236` — lack of safety and efficacy; mixed `SAFETY` + `EFFICACY/FUTILITY`
- `NCT01121588` — commercial supply / rollover study allowed active subjects to continue; transition/non-failure rather than trial failure
- `NCT06012929` — protocol rewrite plus new IND, Scientific Review Committee, and IRB approvals; regulatory and operational process causes are mixed
- `NCT04502446` — participants moved to long-term follow-up study; transition/non-failure
- `NCT04244656` — participants moved to long-term follow-up study; transition/non-failure
- `NCT04438083` — participants moved to long-term follow-up study; transition/non-failure

## Classifier issues reinforced or newly exposed by Batch 6

1. **Strategy/program language remains under-recognized.** Company/corporate/R&D/development strategy, business priorities, development-plan changes, reorganization, competitive/treatment landscape, and standard-of-care changes repeatedly remain `OTHER/UNKNOWN` despite being explicit operational causes.
2. **Decision/action versus cause remains the largest structural false-positive source.** `Sponsor decision`, `company decision`, `business decision`, `administrative decision`, enrollment suspension, and program termination must not become causal labels without an explicit reason.
3. **Support/resources/staffing vocabulary remains incomplete.** Loss of sponsor/pharmaceutical/supplier support, unavailable resources, PI departure, and drug supply require robust operational patterns.
4. **Efficacy semantic coverage needs broader clinical-benefit language.** `Lack of improved efficacy`, `no clear benefit`, `lack of clinical benefit`, and insufficient immune-response evidence should map to `EFFICACY/FUTILITY` when explicitly causal.
5. **Tolerability is a safety signal.** `Lack of tolerability` should map to `SAFETY`.
6. **Regulatory handling needs explicit legal and authorization patterns.** FDA withdrawal of EUA, named EU Clinical Trial Regulation transitions, new legislation, and formal official drug reclassification were missed or mislabeled.
7. **Benefit-risk phrases need semantic gating.** `Benefit-risk does not support continuation` may establish a biological problem but does not by itself uniquely distinguish `SAFETY` from `EFFICACY/FUTILITY`; weaker phrases such as `benefit-risk ratio changes` need even more caution.
8. **The single-label taxonomy cannot represent dual biological causes cleanly.** Phrases such as `side effects and futility` or `lack of safety and efficacy` justify multi-label causes, a mixed-cause flag, or a structured `secondary_cause` field.
9. **Planned completion and transition must be separated from failure.** Protocol-defined end, adequately characterized safety after dose escalation, and transition to long-term follow-up are not failures.
10. **Regulatory versus operational precedence needs an explicit causal test.** If a sponsor takes a regulatory action as a consequence of an internal business decision, operational may remain the primary cause; if an external regulator, law, authorization change, or official classification itself forces termination, `REGULATORY` should win.

---

## Cumulative status — records 1–1200

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 687 | 57.25% |
| Definitely misclassified | 416 | 34.67% |
| Ambiguous / multiple plausible causes / non-failure | 97 | 8.08% |
| Needs change or manual review | 513 | 42.75% |

Of the 416 definite errors across the first 1200 records:

- 247 (59.4%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 114 (27.4%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 33 (7.9%) are missed `EFFICACY/FUTILITY`;
- 11 (2.6%) are missed `SAFETY`;
- 9 (2.2%) are missed `REGULATORY`;
- 2 (0.5%) are inverse biological false positives.

Thus 361 of 416 definite errors (86.8%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

---

# Classification Audit — Batch 7

This section is the completed manual semantic audit for records 1201–1400 and uses the same methodology and taxonomy as Batches 1–6.

Batch boundary: record 1201 is `NCT02525692`; record 1400 is `NCT00863330`.

A final consistency pass applies the earlier audit rule strictly: a phrase such as `sponsor decision`, `company decision`, `business decision`, or a bare `strategic decision` describes a decision/action, not the underlying causal stop reason. Such records remain `OTHER/UNKNOWN` unless a real operational, biological, or regulatory cause is also supplied.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 87 | 43.5% |
| Definitely misclassified | 101 | 50.5% |
| Ambiguous / multiple plausible causes / non-failure | 12 | 6.0% |
| Needs change or manual review | 113 | 56.5% |

## Main finding

Batch 7 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 101 definite errors, 54 are `OTHER/UNKNOWN` records with a clearly operational cause and 30 are labeled `OPERATIONAL` even though the text gives only a decision/action or closure statement without the actual cause. Together these 84 records account for 83.2% of all definite Batch 7 errors.

The remaining 17 definite errors are 11 missed `EFFICACY/FUTILITY` cases, two missed `SAFETY` cases, three missed `REGULATORY` cases, and one inverse biological false positive where a record is labeled `SAFETY` despite the text explicitly identifying a safe RP2D and supplying no safety-failure cause.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 54

- `NCT03485729` — change in sponsor corporate priorities
- `NCT05500508` — required reformulation from IV to capsule; a formulation/development change rather than an observed safety failure
- `NCT04404569` — no rollover study remained to support continued treatment/enrollment
- `NCT06524804` — clinical development strategy adjustment
- `NCT05555251` — business reasons
- `NCT05375084` — business reasons
- `NCT05207722` — business reasons
- `NCT04310592` — business reasons
- `NCT05480865` — business reasons
- `NCT05017103` — drug sponsor stopped supporting the study
- `NCT05846659` — corporate strategy change
- `NCT04515979` — development-strategy modification because the business/development environment changed
- `NCT04582864` — sponsor no longer supporting the drug
- `NCT05831995` — development-strategy change
- `NCT04826198` — treatment availability failure: manufacturer ceased production and access contract expired
- `NCT02867839` — enrollment far below expectation
- `NCT05501912` — R&D strategy adjustment
- `NCT05892653` — R&D strategy adjustment
- `NCT04526509` — change in GSK R&D priorities
- `NCT03145558` — treatment landscape changed and study population no longer suitable
- `NCT02972034` — business reasons
- `NCT05416749` — sponsor development-strategy adjustment
- `NCT04630886` — drug supply issues
- `NCT04258111` — overall development strategy revised; registration research discontinued
- `NCT06048705` — change in GSK R&D priorities
- `NCT05943990` — change in GSK R&D priorities
- `NCT03804424` — drug-formulation change and transition to a new trial
- `NCT04135352` — business reasons
- `NCT04176419` — workforce shortage
- `NCT04840186` — not enough patients
- `NCT05394350` — business reasons
- `NCT04220775` — sponsor stopped developing the drug and supporting studies using it
- `NCT03833427` — business reasons
- `NCT04493619` — business realignment
- `NCT03973918` — NCI moved the brain-cancer program in a different direction
- `NCT02944578` — delivery method needed redesign after patient feedback
- `NCT06147505` — hospital renovation
- `NCT04727632` — FES PET/CT could not feasibly be performed
- `NCT05128786` — study-strategy adjustment
- `NCT03393936` — study-strategy adjustment
- `NCT03960060` — study-strategy adjustment
- `NCT04270864` — Part B infeasible because experimental products were unavailable
- `NCT03240523` — change in development program
- `NCT05814536` — sponsor adjusted study strategy
- `NCT04291664` — standard-of-care change plus future-development considerations
- `NCT04860466` — business objectives changed
- `NCT02097225` — drug supply issues
- `NCT05492045` — drug-development strategy adjustment
- `NCT04952571` — lack of funds
- `NCT04021277` — business reason
- `NCT05764395` — drug unavailable
- `NCT05156905` — company closing clinical-trial operations
- `NCT03220347` — business objectives changed
- `NCT03031821` — manufacturer discontinued production of study drugs

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 30

These records describe a decision, recommendation, administrative action, or termination but do not provide the underlying causal reason. The strict action-versus-cause rule is applied consistently to bare `business decision` and `strategic decision` language.

- `NCT01897441` — only states that the interventional component ended before full enrollment; no causal reason
- `NCT02588261` — IDMC recommendation and enrollment closure are actions; the underlying result is absent
- `NCT04179864` — sponsor decision; only says it was not safety related
- `NCT05999292` — sponsor decision
- `NCT02702492` — sponsor decision
- `NCT03082300` — IDMC recommendation and enrollment closure; underlying cause absent
- `NCT02500927` — IDMC recommendation and enrollment closure; underlying cause absent
- `NCT02192697` — IDMC recommendation and enrollment closure; underlying cause absent
- `NCT05012397` — sponsor decision
- `NCT03710915` — company decision
- `NCT03207867` — sponsor decision
- `NCT04816526` — sponsor decision
- `NCT05315713` — sponsor decision
- `NCT05781360` — internal business decision; exclusions of safety/regulatory do not supply the actual cause
- `NCT02612311` — strategic/business decision only
- `NCT04528836` — business decision only
- `NCT03672643` — business decision; only excludes safety and regulatory causes
- `NCT06448364` — strategic business decision only
- `NCT04762875` — business decision; only excludes safety
- `NCT05265013` — business decision only
- `NCT02610062` — business decision by sponsor
- `NCT03296696` — Amgen business decision
- `NCT02470585` — business decision; only says it was not patient-safety related
- `NCT04690699` — business decision only
- `NCT05744128` — strategic decision only
- `NCT05457842` — company strategic decision only
- `NCT04187404` — strategic decision only
- `NCT04060862` — strategic sponsor decision; no underlying strategic reason is supplied
- `NCT01127178` — strategic decision; only says it was unrelated to safety
- `NCT03541369` — premature discontinuation described as a strategic decision, without the underlying reason

## C. Missed `EFFICACY/FUTILITY` — 11

- `NCT05355753` — high BRD9 degradation did not produce sufficient efficacy
- `NCT03549000` — low likelihood of efficacy after data review
- `NCT01032070` — pre-planned interim analysis met futility for efficacy
- `NCT04939701` — other studies showed lack of significant monotherapy activity
- `NCT01247922` — companion study stopped because the paired trial met futility for efficacy
- `NCT05601466` — did not reach the expected clinical-trial results
- `NCT04937738` — high rate of disease progression in the XELOX arm
- `NCT05601830` — did not reach the expected clinical-trial results
- `NCT03809624` — lack of a meaningful efficacy signal
- `NCT03755154` — limited monotherapy efficacy explicitly drove the subsequent strategic stop
- `NCT03592264` — little evidence of clinical activity

## D. Missed `SAFETY` — 2

- `NCT04323436` — termination caused by lack of tolerability of the combination
- `NCT04139317` — termination caused by lack of tolerability of the combination

## E. Missed `REGULATORY` — 3

- `NCT04340154` — ethics-committee decision caused the stop
- `NCT05032599` — ethics-committee decision caused the stop
- `NCT03753919` — study stopped following instructions of the Spanish Agency for Medicines and Health Products

## F. Inverse biological false positive — `SAFETY` should be `OTHER/UNKNOWN` — 1

- `NCT03769467` — Phase 1B identified a safe RP2D; the subsequent sponsor decision to end development gives no safety-failure cause

## G. Ambiguous / mixed-cause / planned-success / non-failure cases — 12

- `NCT04029688` — insufficient tolerability and efficacy are both explicit; mixed SAFETY + EFFICACY/FUTILITY
- `NCT04214418` — toxicity and lack of efficacy are both explicit; mixed SAFETY + EFFICACY/FUTILITY
- `NCT04421378` — decision jointly references existing data and the competitive landscape; biological versus strategic causality cannot be separated
- `NCT04526795` — `Administratively Complete` is a procedural status, not a causal failure reason
- `NCT04282668` — changing treatment landscape, enrollment difficulty, and little likelihood of clinical benefit are all explicit
- `NCT05588440` — available clinical data and capital requirements jointly drove the stop; scientific and operational causes are mixed
- `NCT04755244` — Phase 1/2 trial never progressed to Phase 2; stage transition is described but no causal failure is supplied
- `NCT02891161` — follow-up ended after planned analyses and manuscripts were completed; looks like planned completion/non-failure
- `NCT01217411` — protocol moved to `Administratively Complete`; procedural closure/non-failure
- `NCT05113342` — Phase 1 enrollment completed, then further development ended without a supplied cause
- `NCT01705483` — decision was based on Phase 1 data, but the result dimension and polarity are not stated
- `NCT03447769` — primary-analysis results and benefit-risk review led to closure, but the failing efficacy/safety dimension is not explicit

## Classifier issues reinforced or newly exposed by Batch 7

1. **Decision/action vocabulary still creates structural false positives.** The action-versus-cause rule must cover not only `sponsor decision` and `company decision`, but also bare `business decision` and `strategic decision`. A decision label is not a causal explanation.
2. **Strategy and business *reasons* remain under-recognized.** Corporate priorities, R&D priorities, development-strategy changes, business objectives, business realignment, program-direction changes, and study-strategy adjustments are operational when they are explicitly causal.
3. **Supply, support, staffing, and feasibility vocabulary remains incomplete.** Drug unavailability, discontinued manufacturing, sponsor support withdrawal, workforce shortage, hospital renovation, imaging infeasibility, and unavailable experimental products repeatedly remain `OTHER/UNKNOWN`.
4. **Efficacy semantic coverage is still too narrow.** `Insufficient efficacy`, `low likelihood of efficacy`, `lack of significant activity`, `did not reach expected results`, `high disease progression`, `lack of a meaningful efficacy signal`, and `little evidence of clinical activity` should map to `EFFICACY/FUTILITY` when explicitly causal.
5. **Explicit tolerability failure must outrank sponsor-action vocabulary.** `Lack of tolerability` is a `SAFETY` cause even when the sentence also says the sponsor decided to terminate.
6. **Regulatory/oversight causes need broader authority matching.** Ethics-committee decisions and explicit instructions from a medicines agency should map to `REGULATORY`.
7. **Safety-review vocabulary must not itself imply safety failure.** A study can complete DLT review, identify a safe RP2D, and then stop for an unrelated sponsor decision. Review of safety data is not equivalent to a safety signal.
8. **Mixed biological causes still exceed the single-label taxonomy.** Stops that explicitly combine toxicity/tolerability with efficacy require a mixed-cause representation or secondary-cause field.
9. **Planned stage completion and administrative closure remain distinct from failure.** `Administratively Complete`, completion of Phase 1 enrollment, and discontinuation after planned analyses/manuscripts should not be forced into a failure cause without additional evidence.
10. **Generated data remains semantically stale relative to the audit rules.** The same recurring phrases are still misclassified across successive batches, reinforcing the need for a versioned classifier fix followed by clean regeneration before measuring post-fix accuracy.

---

## Cumulative status — records 1–1400

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 774 | 55.29% |
| Definitely misclassified | 517 | 36.93% |
| Ambiguous / multiple plausible causes / non-failure | 109 | 7.79% |
| Needs change or manual review | 626 | 44.71% |

Of the 517 definite errors across the first 1400 records:

- 301 (58.2%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 144 (27.9%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 44 (8.5%) are missed `EFFICACY/FUTILITY`;
- 13 (2.5%) are missed `SAFETY`;
- 12 (2.3%) are missed `REGULATORY`;
- 3 (0.6%) are inverse biological false positives.

Thus 445 of 517 definite errors (86.1%) remain variants of the same core problem: separating a real operational cause from a decision-maker/action statement.

---

# Classification Audit — Batch 8

This section is the completed manual semantic audit for records 1401–1600 and uses the same methodology and taxonomy as Batches 1–7.

Batch boundary: record 1401 is `NCT03363659`; record 1600 is `NCT04933617`.

The consistency rule from the earlier batches is applied strictly: a phrase such as `sponsor decision`, `company decision`, `business decision`, `strategic decision`, or `administrative decision` describes an action or decision-maker, not the underlying causal stop reason. Such records remain `OTHER/UNKNOWN` unless a real operational, biological, or regulatory cause is also supplied.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 108 | 54.0% |
| Definitely misclassified | 80 | 40.0% |
| Ambiguous / multiple plausible causes / non-failure | 12 | 6.0% |
| Needs change or manual review | 92 | 46.0% |

## Main finding

Batch 8 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 80 definite errors, 49 are `OTHER/UNKNOWN` records with a clearly operational cause and 23 are labeled `OPERATIONAL` even though the text gives only a decision/action without the actual cause. Together these 72 records account for 90.0% of all definite Batch 8 errors.

The remaining eight definite errors are six missed `EFFICACY/FUTILITY` cases, one missed `SAFETY` case, and one `OPERATIONAL` record that should be `REGULATORY`.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 49

- `NCT04325698` — Pfizer halted its biosimilars programs in China
- `NCT01246869` — PI retired
- `NCT04521621` — business reasons
- `NCT03177187` — discontinuation of IMP production
- `NCT04155424` — pediatric clinical study not feasible
- `NCT04308395` — low blinded event rate; explicitly not safety related
- `NCT02509039` — replaced with another clinical trial
- `NCT03783403` — business objectives changed
- `NCT04945733` — reconsideration of development strategy
- `NCT03735875` — competing trials prevented progression to Phase II
- `NCT05200143` — BMS support withdrawn
- `NCT03884829` — switch to oral formulation
- `NCT05048134` — sponsor R&D strategy adjustment
- `NCT01996098` — slow accrual (`Slow accural`)
- `NCT03284723` — stage of drug development and external competition; explicitly not safety related
- `NCT03644342` — changed treatment landscape made the study no longer viable
- `NCT05966584` — limited number of eligible participants
- `NCT03518320` — business objectives changed
- `NCT04123704` — sponsor terminated due to lack of interest
- `NCT01998035` — PI left institution
- `NCT05849246` — strategy terminated development; explicitly not safety related
- `NCT05569512` — company restructuring ended contracting
- `NCT06206278` — business reason
- `NCT04583488` — PI left institution
- `NCT05084859` — business reasons
- `NCT03355066` — business reasons
- `NCT04152863` — business reasons
- `NCT06297642` — target-research status and company oncology portfolio/layout
- `NCT03127098` — terminated to pursue other studies of the combination
- `NCT05764915` — change in study plan; explicitly not safety related
- `NCT05965505` — protocol/indication expansion moved to a newly submitted clinical-trial protocol
- `NCT04129151` — ganitumab supply discontinued
- `NCT04324840` — business objectives changed
- `NCT03963102` — lack of appropriate personnel / no available PI
- `NCT03978611` — business objectives changed
- `NCT04212221` — shifting liver-cancer landscape plus development-strategy adjustment
- `NCT04109482` — business reasons
- `NCT05360238` — business reasons
- `NCT05583188` — strategic reason
- `NCT05720052` — major protocol revisions
- `NCT06507891` — project situation and strategic-development direction; explicitly non-safety
- `NCT05272813` — major protocol revisions
- `NCT05068856` — R&D strategy adjustment
- `NCT05039944` — company research-strategy adjustment
- `NCT03488225` — competing trials
- `NCT05009953` — internal strategy change; explicitly not safety related
- `NCT02842580` — inclusion rate too slow
- `NCT02096588` — PI left Johns Hopkins
- `NCT03439085` — project delays

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 23

These records identify an actor, decision, request, or administrative action but do not provide the underlying causal reason.

- `NCT04683939` — sponsor decision
- `NCT00807612` — administrative decision only
- `NCT05638334` — sponsor decision
- `NCT02944864` — sponsor request
- `NCT05682170` — sponsor decision
- `NCT04965818` — strategic decision by sponsor
- `NCT03712358` — business decision without an underlying reason
- `NCT04747470` — sponsor decision following an internal safety assessment; no adverse safety finding is stated
- `NCT03530683` — business decision; the text only excludes safety/regulatory causes
- `NCT05996445` — sponsor business decision
- `NCT06102213` — sponsor business decision
- `NCT04946864` — company decision
- `NCT05251727` — business decision
- `NCT04594811` — company strategic decision
- `NCT05028751` — sponsor decision
- `NCT05908396` — company decision
- `NCT04806035` — strategic/business decision
- `NCT04628780` — internal business decision; safety/regulatory causes excluded but no actual cause supplied
- `NCT04198818` — sponsor business decision
- `NCT03671590` — strategic/business decision
- `NCT02314052` — sponsor decision
- `NCT02110563` — sponsor decision
- `NCT05769959` — sponsor decision; explicitly not safety, efficacy, or quality related, but actual cause absent

## C. Missed `EFFICACY/FUTILITY` — 6

- `NCT03716596` — effect of the regimen was not satisfactory
- `NCT05094206` — no in-vivo expansion and no meaningful response to therapy
- `NCT04768881` — lack of sufficient anti-melanoma tumor signal
- `NCT03743246` — absence of significant therapeutic benefit over existing therapies
- `NCT03323398` — efficacy endpoints were not met in either treatment arm
- `NCT04907227` — data did not support the study endpoints

## D. Missed `SAFETY` — 1

- `NCT02978235` — clinical hold and termination due to drug-induced liver injury meeting Hy's Law criteria

## E. `OPERATIONAL` that should be `REGULATORY` — 1

- `NCT04933617` — copanlisib was removed from the market by the FDA and manufacturer; the FDA removal is an explicit external regulatory cause

## F. Ambiguous / mixed-cause / planned-success / non-failure cases — 12

- `NCT05397171` — overall risk-benefit profile caused termination and safety concerns are explicitly excluded, but the failing benefit/efficacy dimension is not stated clearly enough for a confident single label
- `NCT01904253` — interim analysis showed a PFS imbalance and no safety signal, but the direction/polarity of the PFS result is not stated
- `NCT04934670` — protocol-defined Day-60 mortality stopping boundary was met; safety versus efficacy/survival causality is not uniquely resolvable from the text
- `NCT00819169` — subjects rolled over to another protocol; transition/non-failure rather than a supplied failure cause
- `NCT02353143` — unpredictable liver toxicity plus no objective clinical response; mixed `SAFETY` + `EFFICACY/FUTILITY`
- `NCT00522990` — recommended Phase II dose determined; successful planned milestone rather than failure
- `NCT04629781` — additional follow-up would not contribute further efficacy data and patients were not adversely impacted; analytical closure/non-failure
- `NCT01296555` — modest clinical benefit plus limited tolerability; mixed `EFFICACY/FUTILITY` + `SAFETY`
- `NCT02554812` — no further safety/efficacy data were needed and benefiting participants moved to a continuation study; transition/non-failure
- `NCT04408599` — Phase 1 completed, then development focus shifted to a combination trial; stage completion/transition
- `NCT04128696` — sponsor stopped the trial based on assessment of clinical data, but result dimension and polarity are not stated
- `NCT03770455` — early progression plus an incorrect assumption about time from PSA progression to radiographic progression; biological efficacy and study-design causality are not cleanly separable

## Classifier issues reinforced or newly exposed by Batch 8

1. **Decision/action vocabulary remains the dominant false-positive source.** `Sponsor decision`, `company decision`, `business decision`, `strategic decision`, `sponsor request`, and `administrative decision` must not define causality on their own.
2. **Operational strategy/reason vocabulary remains under-recognized.** Business reasons, business-objective changes, R&D/research/development-strategy adjustments, portfolio/layout changes, and treatment-landscape changes are explicit operational causes when they explain why the study stopped.
3. **Personnel, supply, support, and feasibility coverage is still incomplete.** PI departure/retirement, discontinued IMP or study-drug supply, withdrawn sponsor support, limited eligible participants, competing trials, and project delays repeatedly remain `OTHER/UNKNOWN`.
4. **Protocol/design-change vocabulary needs broader operational coverage.** Major protocol revisions, study-plan changes, formulation switches, and migration to a replacement protocol are operational when they directly cause the stop.
5. **Efficacy semantics still miss plain clinical-result language.** No meaningful response, insufficient tumor signal, absence of therapeutic benefit, endpoints not met, and data not supporting endpoints should map to `EFFICACY/FUTILITY` when explicitly causal.
6. **Safety-review language still requires polarity.** An internal safety assessment is not itself a safety failure; an explicit adverse finding such as DILI meeting Hy's Law is.
7. **External regulatory action must outrank internal operational action.** FDA removal from the market is a direct regulatory cause even if a manufacturer is also involved.
8. **Mixed biological causes still exceed the single-label taxonomy.** Stops combining toxicity/tolerability with lack of response/benefit require a mixed-cause representation or secondary-cause field.
9. **Planned milestone and transition cases remain distinct from failure.** RP2D determination, transfer to continuation protocols, and closure after sufficient data collection should not be forced into a failure category.
10. **Generated data remains semantically stale relative to the audit rules.** The same high-frequency phrase families recur as errors through record 1600, supporting a versioned classifier fix and clean regeneration before any post-fix accuracy estimate.

---

## Cumulative status — records 1–1600

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 882 | 55.13% |
| Definitely misclassified | 597 | 37.31% |
| Ambiguous / multiple plausible causes / non-failure | 121 | 7.56% |
| Needs change or manual review | 718 | 44.88% |

Of the 597 definite errors across the first 1600 records:

- 350 (58.6%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 167 (28.0%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 50 (8.4%) are missed `EFFICACY/FUTILITY`;
- 14 (2.3%) are missed `SAFETY`;
- 13 (2.2%) are missed `REGULATORY`;
- 3 (0.5%) are inverse biological false positives.

Thus 517 of 597 definite errors (86.6%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

---

# Classification Audit — Batch 9

This section is the completed manual semantic audit for records 1601–1800 and uses the same methodology and taxonomy as Batches 1–8.

Batch boundary: record 1601 is `NCT02295722`; record 1800 is `NCT03318939`.

The consistency rule is applied strictly: a phrase such as `sponsor decision`, `company decision`, `business decision`, `strategic decision`, `PI decision/request`, or `administrative reasons` describes an action, actor, or underspecified decision layer rather than the underlying causal stop reason. By contrast, explicit business reasons, strategy/development changes, funding/support loss, supply/resource constraints, recruitment failure, protocol/design changes, or other concrete operational causes are treated as `OPERATIONAL`.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 95 | 47.5% |
| Definitely misclassified | 88 | 44.0% |
| Ambiguous / multiple plausible causes / non-failure | 17 | 8.5% |
| Needs change or manual review | 105 | 52.5% |

## Main finding

Batch 9 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 88 definite errors, 45 are `OTHER/UNKNOWN` records with a clearly operational cause and 25 are labeled `OPERATIONAL` even though the text gives only a decision/action or an underspecified program termination without the actual cause. Together these 70 records account for 79.5% of all definite Batch 9 errors.

The remaining 18 definite errors are 13 missed `EFFICACY/FUTILITY` cases, two missed `SAFETY` cases, two missed `REGULATORY` cases, and one inverse biological false positive where an explicit safety negation was incorrectly classified as `SAFETY`.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 45

- `NCT04047303` (record 1605) — business objectives changed
- `NCT02863991` (record 1608) — change in corporate priorities; explicitly not safety related
- `NCT04111107` (record 1609) — PI left the institution and the site could not continue
- `NCT02384954` (record 1610) — change in drug-product development strategy
- `NCT00875004` (record 1622) — only 27 of 300 patients accrued after two years, with changed treatment recommendations
- `NCT05621525` (record 1623) — business reason
- `NCT04119453` (record 1627) — redirection of the rivoceranib development plan
- `NCT03250299` (record 1628) — NCI-mandated termination of the consortium conducting the study
- `NCT03301896` (record 1632) — business reasons
- `NCT03367871` (record 1637) — investigator left the institution
- `NCT04688931` (record 1658) — alternate approach pursued; development redirection
- `NCT03066154` (record 1669) — low inclusion plus investigational-product availability
- `NCT04336982` (record 1670) — business objectives changed
- `NCT05233436` (record 1671) — internal business considerations; explicitly not safety related
- `NCT03416335` (record 1673) — changing development landscape drove program termination
- `NCT04618393` (record 1690) — resource optimization and product-development change
- `NCT03887702` (record 1693) — inability to accrue
- `NCT03562507` (record 1694) — lack of patient population
- `NCT00346632` (record 1696) — suboptimal dosing schedule; protocol/design issue
- `NCT04726332` (record 1701) — business reasons
- `NCT04824352` (record 1702) — alternative randomized trial/design pursued
- `NCT04718610` (record 1704) — heart-rate measurement error
- `NCT03773302` (record 1707) — oncology development of infigratinib was discontinued; explicitly not safety related
- `NCT03579966` (record 1712) — lack of appropriate outcome-measure data
- `NCT02621515` (record 1718) — lengthy METC procedure caused an inclusion rate that was too slow
- `NCT04167137` (record 1723) — business reasons
- `NCT05493501` (record 1724) — corporate changes at EQRx; explicitly not efficacy or safety related
- `NCT04684628` (record 1726) — logistic issues
- `NCT05074992` (record 1728) — support withdrawn by the company supplying the IMP
- `NCT04073615` (record 1729) — development-plan redirection
- `NCT05309512` (record 1731) — differentiated R&D strategy
- `NCT05648006` (record 1734) — strategy adjustment
- `NCT04281420` (record 1736) — study-product development strategy modified
- `NCT04873895` (record 1739) — failure to accrue
- `NCT04211922` (record 1742) — sponsor R&D strategy adjustment
- `NCT06377722` (record 1743) — achieved sample count was below the planned 50; accrual/sample shortfall
- `NCT04429321` (record 1744) — failure to accrue
- `NCT04879017` (record 1751) — sponsor terminated for business reasons
- `NCT03601507` (record 1770) — Novartis withdrew support for the trial
- `NCT05134194` (record 1774) — sponsor R&D strategy adjustment
- `NCT05148533` (record 1779) — company development-strategy adjustment
- `NCT02880410` (record 1780) — failure to enroll
- `NCT06355843` (record 1788) — imaging generator reached end of life and replacement equipment was unavailable for months
- `NCT03927222` (record 1792) — resource shortage
- `NCT04430036` (record 1793) — PI left the institution

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 25

These records identify an actor, decision, closure, or program action but do not supply the underlying causal reason.

- `NCT04822298` (record 1604) — Amgen business decision only
- `NCT02742090` (record 1607) — strategic/business decision only
- `NCT03631641` (record 1611) — sponsor decision
- `NCT04402008` (record 1624) — business decision; only excludes safety
- `NCT02924038` (record 1642) — industry-sponsor decision
- `NCT03291054` (record 1653) — request of the funding sponsor; request/action without a stated cause
- `NCT04915404` (record 1657) — business decision
- `NCT04404361` (record 1660) — decision to close enrollment early; underlying cause absent
- `NCT04319224` (record 1675) — sponsor decision to discontinue study-drug provision after two years; underlying cause absent
- `NCT05631327` (record 1678) — sponsor business decision
- `NCT03919175` (record 1711) — development termination and accrual closure are stated, but the underlying cause is absent
- `NCT03225716` (record 1720) — sponsor decision to end follow-up early
- `NCT05107739` (record 1721) — sponsor decision
- `NCT02718300` (record 1730) — business decision; safety explicitly excluded
- `NCT05328102` (record 1733) — sponsor business decision
- `NCT04681677` (record 1740) — unspecified business decision
- `NCT03915405` (record 1750) — termination based on a business decision
- `NCT05538624` (record 1754) — sponsor decision to close the study
- `NCT03801525` (record 1763) — strategic/business decision
- `NCT05581719` (record 1772) — sponsor decision
- `NCT05050006` (record 1773) — business decision
- `NCT05061537` (record 1781) — business decision; safety explicitly negated
- `NCT04604132` (record 1795) — administrative reasons; safety explicitly negated but no actual cause supplied
- `NCT02540330` (record 1798) — business decision in `why_stopped`; the causal detail is not present there
- `NCT03318939` (record 1800) — strategic business decision; explicitly unrelated to safety

## C. Missed `EFFICACY/FUTILITY` — 13

- `NCT02295722` (record 1601) — no significant benefit sufficient to justify full accrual
- `NCT03451825` (record 1626) — limited activity of avelumab monotherapy caused cancellation of Phase II
- `NCT01670994` (record 1636) — patient population did not benefit from single-agent treatment
- `NCT03621982` (record 1648) — activity signals were insufficiently compelling to justify continuation
- `NCT04172844` (record 1664) — primary endpoint of improved event-free survival was not met
- `NCT05116917` (record 1679) — prespecified interim predictive probability was below 10% for the endpoint
- `NCT03132155` (record 1682) — lack of therapeutic effect
- `NCT05305040` (record 1700) — DSMB explicitly determined futility; no safety concerns
- `NCT02181699` (record 1737) — failed treatment response
- `NCT04458311` (record 1745) — response outcomes to date did not support continuation
- `NCT04633148` (record 1759) — biological activity was very limited and meaningful clinical benefit was considered unlikely
- `NCT03558724` (record 1775) — no clear correlation between fluorescence and tumor grade after dose escalation
- `NCT04925947` (record 1777) — collected data did not support the study endpoints

## D. Missed `SAFETY` — 2

- `NCT00199342` (record 1722) — two dose-limiting toxicities occurred at the initial dose level
- `NCT01199367` (record 1752) — dose escalation failed to identify a well-tolerated dose that permitted Phase II study

## E. Missed `REGULATORY` — 2

- `NCT03502746` (record 1703) — IRB study closure
- `NCT01393119` (record 1761) — FDA Clinical Hold

## F. Inverse biological false positive — `SAFETY` should be `OTHER/UNKNOWN` — 1

- `NCT02663518` (record 1706) — administrative reasons caused termination; the text explicitly says the decision was not due to safety concerns or regulatory requests

## G. Ambiguous / mixed-cause / planned-success / non-failure cases — 17

- `NCT05105412` (record 1602) — DSMB resolution/recommendation without the underlying safety, efficacy, or other basis
- `NCT03448978` (record 1613) — Phase 1 enrollment completed; later development termination has no supplied failure cause
- `NCT02949843` (record 1616) — slow accrual plus IRB closure; operational and regulatory causality are both explicit
- `NCT04221061` (record 1639) — companion treatment trial closed with negative results while the imaging study also had logistical difficulties
- `NCT04161391` (record 1646) — adverse change in risk/benefit does not identify whether the failing dimension is safety, efficacy, or both
- `NCT05609656` (record 1666) — termination followed evaluation of efficacy and safety in four patients, but no negative finding or polarity is stated
- `NCT02902484` (record 1667) — futility and lack of future funding are both explicit; mixed efficacy + operational cause
- `NCT03893019` (record 1697) — risk-benefit assessment was not as expected, but safety versus efficacy cannot be isolated
- `NCT03670069` (record 1709) — slow enrollment and lack of evidence of clinical benefit are both explicit
- `NCT04250597` (record 1717) — maximum tolerated dose was reached, then expansion was omitted by sponsor business decision; milestone/non-failure plus decision-only closure
- `NCT00838578` (record 1738) — protocol-defined interim-analysis results caused termination, but result dimension and polarity are absent
- `NCT01279291` (record 1741) — no acceptable dose could be identified; the text does not distinguish tolerability, efficacy, PK, or a mixed reason
- `NCT04808362` (record 1746) — Phase 1 completed and strategy shifted to a combination study; planned stage completion/transition
- `NCT00779480` (record 1749) — no dose was both tolerable and potentially efficacious; mixed `SAFETY` + `EFFICACY/FUTILITY`
- `NCT02452970` (record 1755) — poor enrollment and adverse-event experience are both explicit; mixed operational + safety cause
- `NCT04243837` (record 1758) — primary objective/endpoint was established, then indication development ended; milestone/non-failure pattern
- `NCT03472560` (record 1789) — no further safety/efficacy data were needed and benefiting participants moved to a continuation study; transition/non-failure

## Classifier issues reinforced or newly exposed by Batch 9

1. **Decision/action vocabulary remains a dominant false-positive source.** `Sponsor decision`, `business decision`, `strategic/business decision`, early enrollment closure, and generic administrative reasons still become `OPERATIONAL` despite lacking the causal layer.
2. **Operational strategy/reason vocabulary remains under-recognized.** Business reasons, business-objective changes, corporate priorities, internal business considerations, R&D/development-strategy adjustments, development-plan redirection, resource optimization, and corporate changes are explicit operational causes when they explain the stop.
3. **Recruitment, support, resource, equipment, and study-execution vocabulary remains incomplete.** Inability to accrue, lack of patient population, IMP availability, sponsor/supplier support withdrawal, equipment end-of-life, resource shortage, measurement error, missing outcome-measure data, and prolonged approval procedures all recur as missed operational causes.
4. **Efficacy semantics still miss direct negative-result language.** No significant benefit, limited activity, insufficiently compelling activity, failed treatment response, lack of therapeutic effect, predictive probability below a futility threshold, primary-endpoint failure, and data not supporting endpoints should map to `EFFICACY/FUTILITY`.
5. **Tolerability and DLT language needs stronger safety handling, while safety negation needs polarity control.** Explicit dose-limiting toxicities and failure to identify a well-tolerated dose are `SAFETY`; `not due to safety concerns` must never create a safety failure.
6. **Concrete oversight actions still need regulatory matching.** IRB closure and FDA Clinical Hold are `REGULATORY`; when a regulatory action coexists with an operational cause such as slow accrual, the record should remain mixed rather than be flattened by keyword precedence.
7. **Review and risk-benefit language needs dimension/polarity gating.** DSMB resolution, evaluation of efficacy/safety, interim-analysis results, and an adverse or unexpected risk-benefit assessment do not by themselves identify a unique safety or efficacy cause unless the negative dimension is stated.
8. **Mixed operational/biological causes remain common enough to require representation.** Futility plus funding loss, lack of clinical benefit plus slow enrollment, and adverse-event experience plus poor recruitment cannot be represented faithfully by one forced label.
9. **Planned milestones and transitions remain distinct from failure.** Phase 1 completion, reaching MTD, establishing the primary objective/endpoint, shifting to a combination study, and rollover to a continuation study should be handled as non-failure/transition unless a separate failure cause is present.
10. **Generated data remains semantically stale relative to the audit rules.** The same recurrent phrase families remain wrong through record 1800, supporting a versioned classifier fix and clean regeneration before any post-fix accuracy estimate.

---

## Cumulative status — records 1–1800

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 977 | 54.28% |
| Definitely misclassified | 685 | 38.06% |
| Ambiguous / multiple plausible causes / non-failure | 138 | 7.67% |
| Needs change or manual review | 823 | 45.72% |

Of the 685 definite errors across the first 1800 records:

- 395 (57.7%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 192 (28.0%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 63 (9.2%) are missed `EFFICACY/FUTILITY`;
- 16 (2.3%) are missed `SAFETY`;
- 15 (2.2%) are missed `REGULATORY`;
- 4 (0.6%) are inverse biological false positives.

Thus 587 of 685 definite errors (85.7%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.
