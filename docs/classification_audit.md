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

---

# Classification Audit — Batch 10

This section is the completed manual semantic audit for records 1801–2000 and uses the same methodology and taxonomy as Batches 1–9.

Batch boundary: record 1801 is `NCT03866980`; record 2000 is `NCT03870529`.

The consistency rule is applied strictly: `sponsor decision`, `company decision`, `business decision`, `strategic decision`, `PI decision/request`, `administrative decision/reasons`, a bare termination, or an enrollment hold describes an action, actor, or underspecified decision layer rather than the underlying causal stop reason. By contrast, explicit business reasons, R&D/development-strategy changes, corporate changes, funding/support loss, supply/resource/staffing constraints, recruitment failure, technical/feasibility problems, or other concrete operational causes are treated as `OPERATIONAL`.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 95 | 47.5% |
| Definitely misclassified | 88 | 44.0% |
| Ambiguous / multiple plausible causes / non-failure | 17 | 8.5% |
| Needs change or manual review | 105 | 52.5% |

## Main finding

Batch 10 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 88 definite errors, 55 are `OTHER/UNKNOWN` records with a clearly operational cause and 23 are labeled `OPERATIONAL` even though the text gives only a decision/action or content-free administrative wording. Together these 78 records account for 88.6% of all definite Batch 10 errors.

The remaining 10 definite errors are nine missed `EFFICACY/FUTILITY` cases and one missed `SAFETY` case. Batch 10 contains no definite missed `REGULATORY` case and no inverse biological false positive.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 55

- `NCT03866980` (record 1801) — corporate-strategy adjustment
- `NCT04300114` (record 1808) — sponsor R&D strategy adjustment
- `NCT01962948` (record 1813) — study drug no longer supplied by the grantor
- `NCT05011019` (record 1825) — sponsor research-and-development strategy adjustment
- `NCT05067257` (record 1829) — Chapter 11 bankruptcy
- `NCT05361915` (record 1830) — Chapter 11 bankruptcy
- `NCT04761601` (record 1837) — strategic business reasons; explicitly not safety related
- `NCT03533946` (record 1839) — new standard of care for the study population
- `NCT05148195` (record 1842) — sponsor research-and-development strategy adjustment
- `NCT05085002` (record 1843) — corporate changes at EQRx; explicitly not efficacy or safety related
- `NCT01953926` (record 1844) — alignment with the sponsor's current development plans; explicitly not based on new efficacy or safety data
- `NCT04469725` (record 1845) — sponsor development-strategy adjustment; safety concerns explicitly excluded
- `NCT03646188` (record 1846) — inconsistent application of the arrays; technical/study-execution problem
- `NCT04352413` (record 1859) — sponsor R&D strategy adjustment
- `NCT04718376` (record 1860) — sponsor R&D strategy adjustment
- `NCT04548700` (record 1861) — sponsor R&D strategy adjustment
- `NCT04900766` (record 1862) — sponsor R&D strategy adjustment
- `NCT04509466` (record 1863) — sponsor R&D strategy adjustment
- `NCT05101616` (record 1865) — difficulty enrolling participants
- `NCT04816214` (record 1868) — business consideration; explicitly unrelated to safety
- `NCT03744715` (record 1869) — business reasons; explicitly unrelated to safety
- `NCT03705351` (record 1873) — principal investigator departed the institution
- `NCT04158583` (record 1875) — program reprioritized toward the combination study because it had greater expected development potential; no observed monotherapy efficacy failure is stated
- `NCT05099549` (record 1879) — the partners redirected their respective programs to different NK-cell development priorities
- `NCT02579005` (record 1881) — lack of resources
- `NCT03711279` (record 1882) — sponsor R&D strategy adjustment
- `NCT03057314` (record 1884) — slow recruitment (`Slow recreuitment`)
- `NCT04912063` (record 1889) — strategic considerations
- `NCT05345938` (record 1894) — research-strategy adjustment
- `NCT04927481` (record 1895) — sponsor R&D strategy adjustment
- `NCT03709706` (record 1896) — feasibility reasons
- `NCT03461952` (record 1897) — target-mutation prevalence was lower than expected and no nonduplicative feasible amendment was available
- `NCT03573544` (record 1898) — the program no longer met the sponsor's cost-effectiveness development goal
- `NCT04624113` (record 1900) — corporate acquisition of Epizyme by Ipsen
- `NCT02004028` (record 1905) — development-program redirection
- `NCT04341311` (record 1910) — withdrawal of support from BMS
- `NCT05408871` (record 1911) — principal investigator changed institutions
- `NCT04814875` (record 1915) — technical reasons
- `NCT04171284` (record 1928) — strategy adjustment; safety and efficacy explicitly excluded
- `NCT04842630` (record 1929) — R&D strategy adjustment
- `NCT04409223` (record 1930) — R&D strategy adjustment
- `NCT04826432` (record 1932) — no experimental drug remained available
- `NCT03965494` (record 1933) — NCI redirected the brain-cancer program and terminated the consortium
- `NCT03393858` (record 1935) — insufficient enrollment
- `NCT04176016` (record 1944) — investigational-drug raw materials were difficult and expensive to obtain
- `NCT04653038` (record 1963) — rapid treatment-landscape changes plus development-strategy change
- `NCT05489679` (record 1968) — sponsor development-strategy adjustment
- `NCT03500874` (record 1978) — FUDR production halt in China
- `NCT02722616` (record 1979) — ultrasound vendor could no longer support the study
- `NCT05154630` (record 1983) — current dual-antibody clinical-research landscape drove the sponsor's development decision
- `NCT04524195` (record 1985) — principal investigator left the institution
- `NCT05088967` (record 1992) — development-strategy adjustment
- `NCT03992131` (record 1993) — change in development priorities; no further development of the combinations planned
- `NCT04528199` (record 1994) — principal investigator left Hopkins
- `NCT03422679` (record 1995) — business reason

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 23

These records identify an actor, decision, or administrative action but do not supply the underlying causal reason.

- `NCT04762160` (record 1818) — company business decision only
- `NCT04691375` (record 1819) — sponsor business decision only
- `NCT03571828` (record 1821) — business decision only; safety explicitly excluded
- `NCT04682431` (record 1822) — sponsor business decision only
- `NCT04113616` (record 1823) — sponsor decision only; safety explicitly excluded
- `NCT04586335` (record 1826) — business decision only
- `NCT04172597` (record 1836) — strategic business decision only; safety explicitly excluded
- `NCT05121948` (record 1854) — sponsor decision only
- `NCT04144140` (record 1858) — business decision only; safety and clinical-activity evidence explicitly excluded
- `NCT03604445` (record 1874) — sponsor decision only
- `NCT04920383` (record 1878) — sponsor decision only
- `NCT05065411` (record 1890) — business decision only
- `NCT05611853` (record 1902) — company decision only
- `NCT04276415` (record 1912) — business decision only
- `NCT04337931` (record 1919) — business decision only; safety explicitly excluded
- `NCT03275402` (record 1921) — corporate business decision only; safety and efficacy explicitly excluded
- `NCT05430555` (record 1938) — sponsor decision only
- `NCT03684694` (record 1939) — administrative decision only
- `NCT04844749` (record 1940) — administrative reasons only
- `NCT05107856` (record 1956) — company decision only
- `NCT02152956` (record 1957) — business decision only
- `NCT04609579` (record 1958) — sponsor decision only; safety explicitly excluded
- `NCT04869943` (record 1966) — business decision only

## C. Missed `EFFICACY/FUTILITY` — 9

- `NCT05128539` (record 1815) — efficacy did not reach the preset threshold; the regimen was explicitly well tolerated and safe
- `NCT04430348` (record 1851) — absence of immunological response
- `NCT02723006` (record 1867) — protocol efficacy-futility criterion met; this overrides the prefixed business-decision wording
- `NCT03283826` (record 1893) — primary endpoint was not achieved
- `NCT02841540` (record 1914) — interim efficacy results were below the initially set expectations
- `NCT03834220` (record 1936) — lower antitumor activity than expected
- `NCT00617656` (record 1960) — interim analysis showed the experimental-arm superiority hypothesis would not be confirmed; safety explicitly excluded
- `NCT01996696` (record 1961) — no statistically significant difference in the primary objective between arms
- `NCT03840902` (record 1990) — IDMC found a low likelihood of superiority on the efficacy endpoints

## D. Missed `SAFETY` — 1

- `NCT03818776` (record 1909) — `Safety` is supplied directly as the stop reason in a terminated trial, rather than as review/assessment vocabulary

## E. Ambiguous / mixed-cause / planned-success / non-failure cases — 17

- `NCT05687617` (record 1803) — recruitment was lower than expected and results were negative; operational and possible efficacy causes coexist, but the negative-result dimension is nonspecific
- `NCT05071183` (record 1806) — no dose could be optimized to provide a positive benefit-risk profile; safety versus efficacy cannot be isolated
- `NCT03288493` (record 1809) — Phase I completed, then Phase II was ended to focus on an allogeneic BCMA CAR-T program; milestone/transition plus portfolio reprioritization
- `NCT03699956` (record 1816) — RRx-001 was moved to a new global Phase III trial; transition/continuation rather than a supplied failure cause
- `NCT03473496` (record 1831) — benefit was not significant and enrollment was difficult; mixed efficacy + operational cause
- `NCT03151057` (record 1847) — `Safety endpointreached` lacks adverse polarity and may describe a completed endpoint/milestone
- `NCT01764451` (record 1850) — research was completed and deemed outside Applicable Clinical Trial reporting requirements; administrative completion/non-failure
- `NCT05496595` (record 1866) — data review and preference for another compound are both cited, but the reviewed data's dimension and polarity are not stated
- `NCT03370198` (record 1887) — recruitment difficulty plus strategy modification based on unspecified new clinical data; operational and possible biological causality cannot be separated
- `NCT04455503` (record 1903) — promising interim results led to acceleration of a second-generation product after Part 1; positive milestone/program transition
- `NCT04727736` (record 1913) — the intervention became FDA-approved; successful approval milestone rather than an adverse regulatory cause
- `NCT03151811` (record 1962) — all endpoints were assessed and overall-survival follow-up continued for two years after primary completion; administrative follow-up/completion
- `NCT05673109` (record 1967) — the subject benefit-risk ratio changed, but the failing safety versus efficacy dimension is not stated
- `NCT01769222` (record 1970) — `Planned Future Study`; transition/non-failure
- `NCT04025216` (record 1974) — unfavorable overall risk-benefit analysis does not isolate safety from efficacy
- `NCT02031419` (record 1982) — replaced with another clinical trial; transition/non-failure
- `NCT04864782` (record 1996) — Phase II completed, then Phase III was ended by a bare sponsor decision; milestone plus action without a failure cause

## Classifier issues reinforced or newly exposed by Batch 10

1. **Decision/action vocabulary remains the dominant false-positive source.** Bare `sponsor decision`, `company decision`, `business decision`, `strategic business decision`, `administrative decision`, and `administrative reasons` must not define causality on their own.
2. **Strategy and business *reasons* remain under-recognized.** R&D/development-strategy adjustments, corporate changes, strategic considerations, business reasons, development-priority changes, program redirection, and portfolio reprioritization are operational when they actually explain the stop.
3. **Supply, support, staffing, manufacturing, technical, and feasibility coverage remains incomplete.** Bankruptcy, investigator departure, support withdrawal, raw-material constraints, production halt, vendor inability, product unavailability, inconsistent device application, and misspelled recruitment language all recur as missed operational causes.
4. **Efficacy semantics still miss direct negative-result language.** Failure to reach a preset efficacy level, absence of immunological response, endpoint failure, lower-than-expected antitumor activity, failed superiority, no significant primary-objective difference, and low likelihood of efficacy-endpoint superiority should map to `EFFICACY/FUTILITY` when explicitly causal.
5. **Explicit biological evidence must outrank decision/action wording.** `Protocol efficacy futility met` remains an efficacy cause even when prefixed by `Business decision`; the administrative action must not suppress the biological cause.
6. **Safety handling needs both direct-cause recognition and polarity control.** A direct stop reason of `Safety` in a terminated trial supports `SAFETY`, while `Safety endpoint reached`, a safety review, or an explicit safety negation does not by itself prove an adverse safety failure.
7. **Data-review and risk-benefit language still requires dimension/polarity gating.** Unspecified data review, new clinical data, dose optimization for benefit-risk, and an unfavorable overall risk-benefit judgment cannot be forced into `SAFETY` or `EFFICACY/FUTILITY` unless the failing dimension is stated.
8. **Mixed operational/biological causes continue to require explicit representation.** Recruitment plus negative results, weak benefit plus enrollment difficulty, and recruitment plus unspecified clinical data cannot be represented faithfully by a single forced label.
9. **Milestones, approvals, and transitions remain distinct from failure.** Phase completion, movement to a global Phase III trial, promising interim results followed by a next-generation program, FDA approval, endpoint-assessment completion, planned future studies, and replacement trials should be treated as non-failure/transition unless a separate failure cause is supplied.
10. **Generated data remains semantically stale relative to the audit rules.** The same recurrent phrase families remain wrong through record 2000, supporting a versioned classifier fix and clean regeneration before any post-fix accuracy estimate.

---

## Cumulative status — records 1–2000

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 1072 | 53.60% |
| Definitely misclassified | 773 | 38.65% |
| Ambiguous / multiple plausible causes / non-failure | 155 | 7.75% |
| Needs change or manual review | 928 | 46.40% |

Of the 773 definite errors across the first 2000 records:

- 450 (58.2%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 215 (27.8%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 72 (9.3%) are missed `EFFICACY/FUTILITY`;
- 17 (2.2%) are missed `SAFETY`;
- 15 (1.9%) are missed `REGULATORY`;
- 4 (0.5%) are inverse biological false positives.

Thus 665 of 773 definite errors (86.0%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

---

# Classification Audit — Batch 11

This section is the completed manual semantic audit for records 2001–2200 and uses the same methodology and taxonomy as Batches 1–10.

Batch boundary: record 2001 is `NCT03502577`; record 2200 is `NCT03733249`.

The consistency rules from the preceding batches are applied strictly. Decision/action wording without a causal explanation remains `OTHER/UNKNOWN`; concrete strategy, portfolio, funding/support, supply, staffing, recruitment, technical, feasibility, data-availability, and protocol-redesign causes are `OPERATIONAL`; explicit negative efficacy or tolerability/safety evidence takes biological precedence; regulator/IRB/ethics actions are `REGULATORY` when they are the concrete external cause; and review, benefit-risk, milestone, transition, or mixed-cause wording is not forced into a single label without sufficient polarity and dimension.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 116 | 58.0% |
| Definitely misclassified | 59 | 29.5% |
| Ambiguous / multiple plausible causes / non-failure | 25 | 12.5% |
| Needs change or manual review | 84 | 42.0% |

## Main finding

Batch 11 continues the same structural `OPERATIONAL` versus `OTHER/UNKNOWN` problem, although the definite-error rate is lower than in Batches 9–10 because many straightforward accrual failures are already classified correctly. Of the 59 definite errors, 35 are `OTHER/UNKNOWN` records with a concrete operational cause and 12 are labeled `OPERATIONAL` despite containing only a decision/action without the underlying cause. Together these 47 records account for 79.7% of all definite Batch 11 errors.

The remaining 12 definite errors are eight missed `EFFICACY/FUTILITY` cases, two missed `SAFETY` cases, and two missed `REGULATORY` cases. Batch 11 contains no definite inverse biological false positive.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 35

- `NCT04046887` (record 2002) — inability to proceed because of Neulasta difficulties and other complications; technical/feasibility cause
- `NCT04999605` (record 2004) — inclusion rate too low
- `NCT04549363` (record 2034) — explicit feasibility reasons
- `NCT03525392` (record 2037) — transfer of IPN01087 rights to an external partner; business/partner cause, explicitly not safety related
- `NCT05193604` (record 2042) — adjustment of sponsor development strategies and pipeline
- `NCT02608268` (record 2043) — business reasons
- `NCT04894994` (record 2051) — change in the clinical landscape
- `NCT04828174` (record 2058) — inability to enroll qualified participants
- `NCT01190644` (record 2059) — isotope required for the primary-endpoint analysis no longer available from the manufacturer, with no alternative
- `NCT04637698` (record 2066) — strategy adjustment
- `NCT02285543` (record 2069) — no new participants could be enrolled
- `NCT02530502` (record 2076) — protocol amended to stop after Phase I and remove Phase II
- `NCT02826161` (record 2079) — changing treatment landscape and evolving standard of care
- `NCT02232620` (record 2085) — low feasibility
- `NCT03416816` (record 2086) — alternate development strategy
- `NCT03572634` (record 2092) — projected time to completion made the study no longer feasible
- `NCT05221385` (record 2097) — changes in the sponsor's research strategy
- `NCT02834975` (record 2098) — investigator left the institution
- `NCT02294357` (record 2109) — difficulties enrolling subjects
- `NCT03619655` (record 2111) — changing prostate-cancer standard of care made the target population disappear and the research question obsolete
- `NCT04983407` (record 2113) — business reasons
- `NCT04300140` (record 2117) — business reasons
- `NCT00736450` (record 2130) — manufacturer no longer making the drug
- `NCT04485052` (record 2139) — changes in development strategies
- `NCT03228186` (record 2140) — pharmaceutical company discontinued the study drug
- `NCT03366103` (record 2145) — drug-supply issues
- `NCT04598321` (record 2155) — termination of the research-grant agreement
- `NCT03190967` (record 2160) — Phase II could not start because the drug was no longer obtainable from the manufacturer
- `NCT03971734` (record 2170) — NCI terminated the ABTC consortium because its brain-cancer program was moving in a different direction
- `NCT02659800` (record 2172) — NCI terminated the ABTC consortium because its brain-cancer program was moving in a different direction
- `NCT04167618` (record 2173) — business priorities
- `NCT00014131` (record 2181) — change in corporate priorities
- `NCT04171700` (record 2187) — change in development priorities
- `NCT02391545` (record 2192) — sponsor reprioritized toward studies that could enable duvelisib registration
- `NCT02204982` (record 2194) — sponsor reprioritized toward studies that could enable duvelisib registration

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 12

These records identify a decision-maker or administrative action but do not provide the underlying causal reason. Negative safety/efficacy exclusions do not convert a content-free decision into an operational cause.

- `NCT04244552` (record 2011) — Sponsor Decision
- `NCT00089245` (record 2016) — corporate business decision; only excludes safety and efficacy concerns
- `NCT04714619` (record 2024) — Sponsor decision
- `NCT04513067` (record 2041) — business decision only
- `NCT03969420` (record 2091) — business decision to terminate the alvocidib program; underlying business cause absent
- `NCT04854434` (record 2101) — Sponsor decision
- `NCT01099644` (record 2110) — corporate business decision; only excludes safety and efficacy concerns
- `NCT04699461` (record 2137) — administrative decision; only excludes a safety reason
- `NCT03985423` (record 2171) — Sponsor Decision
- `NCT02743611` (record 2176) — company decision
- `NCT02065869` (record 2188) — Sponsor decision
- `NCT03752099` (record 2199) — Administrative decision

## C. Missed `EFFICACY/FUTILITY` — 8

- `NCT04267939` (record 2022) — no anticipated benefit of the experimental combination over available standard therapies
- `NCT04809805` (record 2032) — lack of evidence of sufficient clinical benefit; the accompanying therapeutic-window concern does not state a separate adverse safety finding
- `NCT04663126` (record 2033) — after five patients, the tracer showed low uptake, indicating failure of the intended biological/imaging signal
- `NCT03458728` (record 2053) — no anticipated benefit over available standard therapies
- `NCT04066491` (record 2084) — IDMC data review found the study unlikely to achieve its primary overall-survival objective
- `NCT01849874` (record 2115) — planned interim efficacy analysis crossed the predefined futility boundary
- `NCT04729608` (record 2116) — no significant median-PFS difference versus paclitaxel alone, with no new safety signal
- `NCT00745134` (record 2198) — only one patient with pCR among the first 15 randomized to the curcumin arm, causing early stop

## D. Missed `SAFETY` — 2

- `NCT01133990` (record 2096) — the E7820/FOLFIRI combination was deemed not tolerable, so efficacy analysis was not performed
- `NCT02608411` (record 2153) — safety results led to early termination

## E. Missed `REGULATORY` — 2

- `NCT01420861` (record 2175) — FDA Clinical Hold
- `NCT04692155` (record 2196) — FDA hold

## F. Ambiguous / mixed-cause / planned-success / non-failure cases — 25

- `NCT04053062` (record 2003) — `Due to efficacy evaluation` names an evaluation but supplies no negative efficacy polarity
- `NCT04592861` (record 2006) — Einstein IRB administrative closure plus absence of US enrolling sites; regulatory and operational causes coexist
- `NCT04409288` (record 2007) — `Endpoint reached`; successful milestone/non-failure unless a separate adverse endpoint result is supplied
- `NCT04196010` (record 2012) — unfavorable risk-benefit ratio does not isolate the failing safety versus efficacy dimension
- `NCT05394558` (record 2013) — IDMC recommendations without the underlying safety, efficacy, or other basis
- `NCT04634825` (record 2023) — internal review of safety data without an adverse safety finding or negative polarity
- `NCT01514864` (record 2027) — lack of efficacy and slow accrual are both explicit; mixed efficacy + operational cause
- `NCT05425862` (record 2039) — enrollment suspended to further assess supplementary non-clinical data; review alone supplies no negative dimension or polarity
- `NCT02642094` (record 2049) — early termination `due to efficacy` lacks the negative polarity needed to distinguish efficacy failure from a successful efficacy stop
- `NCT03867370` (record 2060) — enrollment ended because the study was completed; non-failure
- `NCT03954704` (record 2071) — decision based on the totality of clinical, PK, and PD findings with no safety concerns; the failing dimension and polarity are not stated
- `NCT05920408` (record 2095) — emerging data challenged the ability to reach a suitable therapeutic index; safety versus efficacy cannot be isolated
- `NCT01041027` (record 2119) — slow accrual plus external PORTEC3 results that rendered the hypothesis invalid; operational and scientific causes coexist
- `NCT01307956` (record 2123) — manufacturer requested a stop following a DSMB observation in the POWER trial, but the observation's causal dimension is absent
- `NCT05255484` (record 2126) — primary objective completed; successful milestone/non-failure
- `NCT04308785` (record 2133) — sponsor decision based on negative SKYSCRAPER-02 results, but the negative result's safety/efficacy dimension is not supplied
- `NCT04020419` (record 2134) — program transferred to another site; administrative transition rather than a supplied failure cause
- `NCT03722108` (record 2148) — unfavorable benefit-risk balance after an interim efficacy and safety analysis; the failing dimension cannot be isolated
- `NCT01891981` (record 2151) — Phase I did not proceed to Phase II and the supporter terminated the study, but no causal failure is supplied
- `NCT03330405` (record 2152) — no further safety or efficacy data were needed and benefiting participants moved to a continuation study; transition/non-failure
- `NCT05120375` (record 2157) — global data on same-target drugs and pipeline optimization jointly informed termination; data dimension is unspecified while an operational reprioritization is explicit
- `NCT04511026` (record 2158) — `Efficacy` without direction or polarity
- `NCT05073484` (record 2161) — global data on same-target drugs and pipeline optimization jointly informed termination; data dimension is unspecified while an operational reprioritization is explicit
- `NCT04737122` (record 2167) — `Failure to achieve expected outcomes` is too nonspecific to identify an efficacy endpoint versus another study objective confidently
- `NCT03477162` (record 2185) — enrollment had become challenging, but the primary objective had already been obtained with the enrolled sample; successful milestone plus recruitment constraint

## Classifier issues reinforced or newly exposed by Batch 11

1. **Decision/action phrases remain structural false positives.** `Sponsor Decision`, `company decision`, `corporate business decision`, and `administrative decision` must remain `OTHER/UNKNOWN` unless the underlying cause is supplied.
2. **Real strategy, business, and portfolio causes remain under-recognized.** Development-strategy changes, business reasons/priorities, corporate priorities, clinical-landscape changes, and registration-focused portfolio reprioritization are operational when explicitly causal.
3. **Supply, support, staffing, recruitment, and feasibility vocabulary remains incomplete.** Manufacturer discontinuation, isotope/drug unavailability, investigator departure, research-grant termination, low feasibility, low inclusion, and inability to enroll qualified participants recur as missed operational causes.
4. **Protocol redesign and data availability need explicit operational coverage.** Removing a later study phase by protocol amendment and loss of required study material/data capability are operational when they directly make continuation infeasible.
5. **Direct negative efficacy semantics still leak into `OTHER/UNKNOWN` or `OPERATIONAL`.** No anticipated benefit, lack of sufficient clinical benefit, failed biological/imaging signal, low likelihood of achieving the primary objective, a crossed futility boundary, lack of PFS improvement, and inadequate pCR response should map to `EFFICACY/FUTILITY` when causal.
6. **Safety logic needs direct tolerability recognition but strict review gating.** `Not tolerable` and safety results that cause termination support `SAFETY`; a safety-data review without a negative finding does not.
7. **Benefit-risk and therapeutic-index wording still requires dimension gating.** An unfavorable overall balance can be biologically adverse without uniquely identifying safety versus efficacy; the classifier should not choose one dimension without supporting language.
8. **Concrete FDA holds remain regulatory.** `FDA Clinical Hold` and `FDA hold` should map to `REGULATORY`, while a bare sponsor-side `IND Withdrawn` remains an action unless an external authority is stated as the causal actor.
9. **Mixed operational/biological and operational/scientific causes need explicit review handling.** Lack of efficacy plus slow accrual, or recruitment failure plus external evidence invalidating the hypothesis, should not be flattened by keyword precedence.
10. **Milestones and transitions remain distinct from failure.** Endpoint reached, completed primary objective, study completion, site transfer, and continuation-study rollover are non-failure/transition patterns unless a separate failure cause is supplied.

---

## Cumulative status — records 1–2200

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 1188 | 54.00% |
| Definitely misclassified | 832 | 37.82% |
| Ambiguous / multiple plausible causes / non-failure | 180 | 8.18% |
| Needs change or manual review | 1012 | 46.00% |

Of the 832 definite errors across the first 2200 records:

- 485 (58.3%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 227 (27.3%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 80 (9.6%) are missed `EFFICACY/FUTILITY`;
- 19 (2.3%) are missed `SAFETY`;
- 17 (2.0%) are missed `REGULATORY`;
- 4 (0.5%) are inverse biological false positives.

Thus 712 of 832 definite errors (85.6%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

---

# Classification Audit — Batch 12

This section is the completed manual semantic audit for records 2201–2400 and uses the same methodology and taxonomy as Batches 1–11.

Batch boundary: record 2201 is `NCT04116164`; record 2400 is `NCT04149821`.

The consistency rules from the preceding batches are applied strictly. Decision/action wording without a causal explanation remains `OTHER/UNKNOWN`; concrete strategy, portfolio, funding/support, supply, staffing, recruitment, manufacturing, feasibility, data-availability, protocol-redesign, and treatment-landscape causes are `OPERATIONAL`; explicit negative efficacy or tolerability/safety evidence takes biological precedence; regulator/IRB/ethics actions are `REGULATORY` when they are the concrete external cause; and review, benefit-risk, milestone, transition, or mixed-cause wording is not forced into a single label without sufficient polarity and dimension.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 109 | 54.5% |
| Definitely misclassified | 71 | 35.5% |
| Ambiguous / multiple plausible causes / non-failure | 20 | 10.0% |
| Needs change or manual review | 91 | 45.5% |

## Main finding

Batch 12 again shows the same structural `OPERATIONAL` versus `OTHER/UNKNOWN` problem. Of the 71 definite errors, 38 are `OTHER/UNKNOWN` records with a concrete operational cause and 19 are labeled `OPERATIONAL` despite containing only a decision/action or an unexplained administrative/enrollment action. Together these 57 records account for 80.3% of all definite Batch 12 errors.

The remaining 14 definite errors are eight missed `EFFICACY/FUTILITY` cases, two missed `SAFETY` cases, and four missed `REGULATORY` cases. Batch 12 contains no definite inverse biological false positive. Confidence remains poorly calibrated around the core structural error: many content-free decision/action phrases are classified as high-confidence `OPERATIONAL`, while concrete strategy, support, supply, manufacturing, recruitment, and treatment-landscape causes remain low-confidence `OTHER/UNKNOWN`.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 38

- `NCT01047007` (record 2206) — explicit business reasons
- `NCT04729205` (record 2226) — investigational drug not available
- `NCT03807479` (record 2228) — `less recruting`; clearly reduced/insufficient recruitment despite the spelling
- `NCT03860207` (record 2230) — business priorities
- `NCT04079738` (record 2232) — funder requested termination because internal development of TAK-659 was halted; development/program cause
- `NCT01093183` (record 2236) — study sponsors withdrew support for the study drug
- `NCT00483561` (record 2239) — PI left UNMC
- `NCT05243524` (record 2240) — closure of IMV operations
- `NCT04099888` (record 2241) — Phase 3 results were expected to change standard of care, making the RELEASE study difficult to complete and potentially inadequate for NDA approval
- `NCT05148442` (record 2246) — company development-strategy adjustment
- `NCT03224819` (record 2256) — prioritization of other programs
- `NCT05470933` (record 2257) — strategic changes in product development, explicitly unrelated to drug safety
- `NCT04190056` (record 2258) — change in practice patterns
- `NCT04422392` (record 2259) — publication of CheckMate816 made enrollment difficult; treatment-landscape/recruitment cause
- `NCT04480086` (record 2263) — strategic considerations
- `NCT04385433` (record 2267) — not enough patients enrolled
- `NCT05106335` (record 2281) — sponsor R&D strategy adjustment
- `NCT05027867` (record 2283) — unanticipated and extremely high screen-failure rate; explicitly no safety concern
- `NCT05103826` (record 2285) — sponsor R&D strategy adjustment
- `NCT04750239` (record 2291) — business priorities
- `NCT03121677` (record 2293) — vaccine manufacturing suspended
- `NCT04398368` (record 2298) — research efforts refocused on other projects; portfolio reprioritization
- `NCT00707655` (record 2313) — company re-evaluation of which SCCHN indications to pursue
- `NCT04214093` (record 2315) — strategic change to the clinical-development plan
- `NCT04552704` (record 2316) — explicit business reason
- `NCT04276090` (record 2322) — approval of an alternate device changed the treatment/device landscape
- `NCT02710396` (record 2326) — frontline pembrolizumab approval established a new standard of care
- `NCT05584332` (record 2329) — strategic adjustment
- `NCT02592707` (record 2330) — too few ongoing patients to continue the study; remaining patients could transfer to a long-term follow-up study
- `NCT05244070` (record 2333) — business objectives changed
- `NCT03740100` (record 2338) — sponsor became insolvent
- `NCT02530437` (record 2341) — sponsor sold the drug and no study drug remained available
- `NCT03591965` (record 2343) — adjustment of the clinical R&D strategy
- `NCT04601285` (record 2349) — sponsor adjusted the study-development plan
- `NCT04194528` (record 2374) — study sponsor withdrew support
- `NCT03399448` (record 2385) — sponsor terminated the trial to pursue other targets; portfolio reprioritization
- `NCT01559818` (record 2388) — no further meaningful data were being collected or expected to be collected; data-availability/feasibility cause
- `NCT04679194` (record 2394) — product manufacturing is supplied as the causal stop reason

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 19

These records identify a decision-maker, strategic/business decision, administrative reason, or enrollment action without supplying the underlying causal reason. Negative safety exclusions do not convert a content-free decision into an operational cause.

- `NCT05698888` (record 2214) — Sponsor Decision
- `NCT05144334` (record 2219) — Business decision
- `NCT01076400` (record 2220) — sponsor suspended enrollment and discontinued the study; only excludes product-safety concerns
- `NCT03425006` (record 2237) — Administrative reasons
- `NCT03695250` (record 2271) — funding-source decision to terminate; no funding withdrawal, shortage, or other underlying cause is supplied
- `NCT04575766` (record 2295) — Sponsor Decision
- `NCT03926143` (record 2303) — strategic company decisions to stop development; the underlying strategic cause is not stated
- `NCT03576131` (record 2320) — Sponsor decision
- `NCT03229876` (record 2324) — Sponsor decision
- `NCT03828448` (record 2325) — Strategic/Business Decision
- `NCT04016805` (record 2327) — Strategic/Business decision
- `NCT04541225` (record 2337) — Sponsor decision
- `NCT03927573` (record 2344) — business decision by sponsor
- `NCT03805841` (record 2364) — enrollment pause without the reason for the pause
- `NCT02656303` (record 2379) — Strategic/Business Decision
- `NCT02935543` (record 2380) — administrative reasons
- `NCT02640209` (record 2382) — administrative reasons
- `NCT02794246` (record 2383) — administrative reasons
- `NCT02335944` (record 2392) — Company decision

## C. Missed `EFFICACY/FUTILITY` — 8

- `NCT04171843` (record 2211) — lack of sufficient therapeutic effect
- `NCT01303679` (record 2252) — no significant difference between the two treatment arms
- `NCT04157088` (record 2309) — lead-in results failed the predefined criteria required to move into the randomized phase
- `NCT04882176` (record 2321) — not meeting expected endpoints
- `NCT03637764` (record 2342) — interim results failed the preplanned criteria required to move all four cohorts into Phase 2 stage 2
- `NCT02150967` (record 2353) — early termination because of limited efficacy in Cohorts 2 and 3, explicitly not because of safety
- `NCT01347645` (record 2390) — E7820 plus irinotecan was considered potentially inferior to FOLFIRI
- `NCT03634228` (record 2399) — lack of adequate response prevented progression to the Phase II portion

## D. Missed `SAFETY` — 2

- `NCT01044745` (record 2253) — study closed to accrual for safety because of the frequency of BK infections
- `NCT03509584` (record 2398) — `SAFETY` is supplied directly as the stop reason

## E. Missed `REGULATORY` — 4

- `NCT00006478` (record 2222) — drug-development suspension was made by FDA decision
- `NCT05438498` (record 2243) — FDA withdrew the EUA for AZD7442
- `NCT02906332` (record 2270) — FDA hold due to updated risks
- `NCT01326312` (record 2386) — FDA Clinical Hold

## F. Ambiguous / mixed-cause / planned-success / non-failure cases — 20

- `NCT03565991` (record 2202) — no further safety or efficacy data were needed and benefiting participants moved to a continuation study; transition/non-failure
- `NCT05435053` (record 2224) — termination followed an evaluation of safety and efficacy in seven treated patients, but no adverse polarity or failing dimension is stated
- `NCT03201250` (record 2244) — Phase I response was not as expected while the myeloma treatment field also changed; efficacy and operational treatment-landscape causes coexist
- `NCT03317496` (record 2261) — no further safety or efficacy data were needed and benefiting participants moved to a continuation study; transition/non-failure
- `NCT03329378` (record 2269) — DSMB agreed that a stopping rule had been met, but the rule's safety, efficacy, or other dimension is not supplied
- `NCT04227275` (record 2276) — safety events and biologic activity without sustained clinical responses jointly produced an unfavorable risk-benefit assessment; safety and efficacy causes coexist
- `NCT04185311` (record 2286) — bare `enrollment` supplies no negative polarity and could denote an enrollment problem or an enrollment milestone
- `NCT00786682` (record 2290) — lack of improved efficacy versus historical controls plus competing studies; mixed efficacy + operational cause
- `NCT04644315` (record 2302) — the data were no longer needed; administrative completion/non-failure unless a separate adverse reason is supplied
- `NCT02748564` (record 2311) — `Study Complete`; successful/administrative completion rather than a supplied failure cause
- `NCT03662074` (record 2314) — an interim analysis preceded the decision not to continue, but the interim result and its polarity are not stated
- `NCT02059265` (record 2318) — `Interim monitoring` supplies no negative dimension or polarity
- `NCT04424641` (record 2323) — MTD reached; protocol milestone rather than a safety failure by itself
- `NCT00788125` (record 2336) — resources were shifted after `lackluster performance` of the drug; operational reprioritization and a possible biological-performance signal coexist, but the latter is insufficiently dimensioned
- `NCT02584634` (record 2345) — no further safety or efficacy data were needed and benefiting participants moved to a continuation study; transition/non-failure
- `NCT02640534` (record 2368) — roughly ten years of follow-up were already adequate for the secondary endpoints and additional follow-up would not materially change the results; sufficient-data/non-failure pattern
- `NCT03896295` (record 2369) — the study was originally halted by COVID-19, then later terminated so participants could enter a planned future open-label extension; operational history plus transition/non-failure
- `NCT02067741` (record 2373) — lifelong follow-up was ended because 90% of patients had died; administrative follow-up completion/attrition rather than an isolable treatment-failure dimension
- `NCT03724071` (record 2376) — terminated after the Phase I part, with no reason distinguishing successful phase completion from a failure to proceed
- `NCT04194034` (record 2377) — terminated after the Phase I part, with no reason distinguishing successful phase completion from a failure to proceed

## Classifier issues reinforced or newly exposed by Batch 12

1. **Decision/action phrases remain high-confidence structural false positives.** `Sponsor Decision`, `Company decision`, `Business decision`, `Strategic/Business Decision`, `Administrative reasons`, funding-source decisions, and a bare enrollment pause must not become `OPERATIONAL` without an underlying cause.
2. **Real strategy, business, and portfolio causes remain under-recognized.** Business reasons/priorities, R&D-strategy adjustments, development-plan changes, indication re-evaluation, refocusing on other projects/targets, and changed business objectives are operational when the change itself causally explains the stop.
3. **Recruitment, support, staffing, supply, manufacturing, and data-availability coverage remains incomplete.** High screen failure, insufficient recruitment, PI departure, sponsor support withdrawal, drug unavailability, sponsor insolvency, suspended manufacturing, and inability to collect further meaningful data all recur as concrete operational causes.
4. **Treatment-landscape changes need explicit operational coverage without confusing them with regulator-ordered stops.** New standard-of-care results and approval of alternate therapies/devices can make a study infeasible or obsolete; that is operational, whereas an FDA hold or FDA withdrawal action directed at the product is regulatory.
5. **Direct negative efficacy semantics continue to leak into `OTHER/UNKNOWN`.** Lack of therapeutic effect, no difference between treatment arms, failure of stage-progression criteria, missed expected endpoints, limited efficacy, potential inferiority, and inadequate response all support `EFFICACY/FUTILITY` when causal.
6. **Safety logic needs both direct-cause recognition and mixed risk-benefit gating.** A safety-related infection stop and a direct `SAFETY` reason support `SAFETY`; a risk-benefit stop that explicitly combines safety events with inadequate sustained response is mixed rather than a forced single safety label.
7. **Concrete FDA actions remain regulatory.** FDA decisions suspending development, EUA withdrawal, FDA holds, and FDA Clinical Holds should map to `REGULATORY` when they are the concrete external stop mechanism.
8. **Milestones, sufficient-data stops, and transitions must stay distinct from failure.** Study completion, MTD reached, adequate long-term follow-up, continuation-study rollover, and possible Phase I completion should not be converted into biological or operational failure without a separate adverse cause.
9. **Mixed operational/biological causes still need explicit review handling.** Unexpected response plus a changed treatment landscape, lack of improved efficacy plus competing studies, and resource shifts following poor drug performance should not be flattened by keyword precedence.
10. **Review and underspecified-dimension language needs polarity gating.** DSMB stopping rules, interim analyses, interim monitoring, safety/efficacy evaluations, and a bare `enrollment` label are insufficient for a confident single failure class when the adverse dimension or direction is absent.

---

## Cumulative status — records 1–2400

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 1297 | 54.04% |
| Definitely misclassified | 903 | 37.63% |
| Ambiguous / multiple plausible causes / non-failure | 200 | 8.33% |
| Needs change or manual review | 1103 | 45.96% |

Of the 903 definite errors across the first 2400 records:

- 523 (57.9%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 246 (27.2%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 88 (9.7%) are missed `EFFICACY/FUTILITY`;
- 21 (2.3%) are missed `SAFETY`;
- 21 (2.3%) are missed `REGULATORY`;
- 4 (0.4%) are inverse biological false positives.

Thus 769 of 903 definite errors (85.2%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

---

# Classification Audit — Batch 13

This section is the completed manual semantic audit for records 2401–2600 and uses the same methodology and taxonomy as Batches 1–12.

Batch boundary: record 2401 is `NCT02489201`; record 2600 is `NCT03437200`.

The consistency rules from the preceding batches are applied strictly. Decision/action wording without a causal explanation remains `OTHER/UNKNOWN`; concrete strategy, policy, portfolio, funding/support, supply, staffing, recruitment, feasibility, protocol/design, product/technical, and treatment-landscape causes are `OPERATIONAL`; explicit negative efficacy or tolerability/safety evidence takes biological precedence; regulator/IRB/ethics actions are `REGULATORY` when they are the concrete external cause; and review, benefit-risk, milestone, transition, or mixed-cause wording is not forced into a single label without sufficient polarity and dimension.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 106 | 53.0% |
| Definitely misclassified | 79 | 39.5% |
| Ambiguous / multiple plausible causes / non-failure | 15 | 7.5% |
| Needs change or manual review | 94 | 47.0% |

## Main finding

Batch 13 again confirms that the dominant classifier problem is separating a real operational cause from a mere decision or action. Of the 79 definite errors, 52 are `OTHER/UNKNOWN` records with a concrete operational cause and 16 are labeled `OPERATIONAL` despite containing only a decision/action without the underlying cause. Together these 68 records account for 86.1% of all definite Batch 13 errors.

The remaining 11 definite errors are seven missed `EFFICACY/FUTILITY` cases, two missed `SAFETY` cases, and two missed `REGULATORY` cases. Batch 13 contains no definite inverse biological false positive. Confidence remains poorly calibrated around the same structural error: bare sponsor/business/strategic decisions can receive high-confidence `OPERATIONAL`, while explicit strategy changes, insolvency, supply/support failures, staffing constraints, protocol/design changes, and treatment-landscape causes remain low-confidence `OTHER/UNKNOWN`.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 52

- `NCT02489201` (record 2401) — corporate policy adjustments; a concrete policy/strategy change
- `NCT02768532` (record 2403) — low inclusion rates; recruitment failure
- `NCT03152929` (record 2420) — institutional standards of care changed so PEC procedures were no longer common or preferred; treatment-landscape/feasibility cause
- `NCT03871855` (record 2425) — sponsor R&D strategy adjustment
- `NCT04193904` (record 2428) — sponsor insolvency
- `NCT03637803` (record 2430) — sponsor insolvency
- `NCT05375604` (record 2435) — company bankruptcy
- `NCT03233724` (record 2437) — study terminated due to drug-supply issues
- `NCT04155190` (record 2438) — low blinded event rate made continuation infeasible; event-availability/feasibility cause
- `NCT05077423` (record 2440) — business priorities
- `NCT03332355` (record 2445) — explicit business reasons
- `NCT01721577` (record 2452) — investigator moved to another institution
- `NCT00597597` (record 2456) — not enough patients enrolled
- `NCT02203773` (record 2459) — strategic considerations
- `NCT02345330` (record 2460) — company resource constraints
- `NCT01579318` (record 2461) — company resource constraints
- `NCT04639024` (record 2464) — resources were reallocated to the Phase III program
- `NCT02961283` (record 2471) — reformulation; concrete product/development change
- `NCT02698111` (record 2473) — corporate policy adjustments
- `NCT02489214` (record 2474) — corporate policy adjustments
- `NCT04335006` (record 2476) — sponsor R&D strategy adjustment
- `NCT02761694` (record 2478) — explicit business reasons
- `NCT03776864` (record 2479) — company providing the study drug terminated its oncology program; support/program-availability cause
- `NCT03400943` (record 2480) — change in the development program
- `NCT05249569` (record 2481) — sponsor pulled support for one of the study drugs
- `NCT03002103` (record 2489) — study-design reconsideration; protocol/design cause
- `NCT03043430` (record 2490) — research manpower shortage
- `NCT00004935` (record 2509) — lifelong follow-up terminated to reduce resources and costs
- `NCT03371420` (record 2510) — company ceased operations
- `NCT03618953` (record 2513) — drug-product potency titer was lower under an improved assay; concrete technical/product-quality problem
- `NCT04863248` (record 2514) — treatment paradigm shifted away from the docetaxel backbone used in the study
- `NCT03436433` (record 2515) — study did not enroll as planned
- `NCT04085991` (record 2517) — drug no longer available
- `NCT03714334` (record 2525) — stock break / product unavailable
- `NCT03019588` (record 2536) — explicit business reasons
- `NCT00667953` (record 2537) — difficulty enrolling subjects
- `NCT03411031` (record 2540) — sponsor no longer providing the study drug
- `NCT04730349` (record 2546) — business objectives changed
- `NCT05388279` (record 2549) — sponsor R&D strategy adjustment/change
- `NCT00481936` (record 2554) — corporate reasons, explicitly unrelated to safety and efficacy
- `NCT04387071` (record 2555) — study drug no longer available
- `NCT05010525` (record 2561) — clinical R&D strategy adjustment
- `NCT04635527` (record 2562) — company development-strategy adjustment
- `NCT04602065` (record 2565) — company development-strategy adjustment
- `NCT05008445` (record 2576) — company strategy adjustment
- `NCT04895410` (record 2580) — strategic considerations
- `NCT04748848` (record 2584) — business objectives changed
- `NCT03251924` (record 2586) — development discontinued because business objectives changed; explicitly not safety related
- `NCT02292225` (record 2588) — program scope reduced to focus resources on registration-enabling studies
- `NCT04311710` (record 2591) — business objectives changed
- `NCT03906526` (record 2592) — business objectives changed
- `NCT01933815` (record 2595) — explicit business reasons

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 16

These records identify a decision-maker, business/strategic decision, or enrollment/closure action without supplying the underlying causal reason. A decision label alone does not establish an operational cause.

- `NCT03267836` (record 2405) — sponsor wanted to terminate enrollment; no underlying cause is supplied
- `NCT04471415` (record 2408) — company decision to close the study and discontinue enrollment; no causal reason is supplied
- `NCT02440685` (record 2417) — Business decision
- `NCT04186637` (record 2422) — Sponsor decision
- `NCT04077021` (record 2463) — Business decision
- `NCT04410445` (record 2497) — Sponsor decision
- `NCT03118349` (record 2498) — Sponsor Decision
- `NCT04590781` (record 2501) — business decision only
- `NCT03465540` (record 2519) — Strategic decisions
- `NCT03729245` (record 2521) — Sponsor decision
- `NCT04381325` (record 2530) — Sponsor Decision
- `NCT04746612` (record 2538) — sponsor business decision
- `NCT03138889` (record 2573) — Sponsor decision
- `NCT03445663` (record 2579) — previous sponsor business decision not to proceed with AMG 424; the underlying business cause is absent
- `NCT02452268` (record 2581) — business decision
- `NCT03265080` (record 2593) — Business decision

## C. Missed `EFFICACY/FUTILITY` — 7

- `NCT02882321` (record 2402) — study terminated for apparent lack of effectiveness
- `NCT03397394` (record 2412) — efficacy did not meet the continuance criteria and the DMC recommended stopping enrollment
- `NCT02516670` (record 2418) — insufficient clinical response per DSMB
- `NCT04843319` (record 2455) — endpoints were not achieved at the current dose level
- `NCT05860075` (record 2457) — no expected efficacy was observed in the extended phase; monotherapy development was terminated
- `NCT04775680` (record 2495) — overall clinical benefit was limited; the accompanying safety statement is neutral rather than an adverse safety finding
- `NCT03838848` (record 2583) — cohorts D/E were considered to have no significant clinical benefit, causing enrollment termination

## D. Missed `SAFETY` — 2

- `NCT03884517` (record 2483) — an explicit safety risk was judged to affect subsequent development and drove termination
- `NCT03030131` (record 2568) — definitive discontinuation was based on safety monitoring of deaths

## E. Missed `REGULATORY` — 2

- `NCT01728259` (record 2469) — FDA placed the study on clinical hold; FDA and Health Canada concerns were the concrete external oversight cause
- `NCT03639610` (record 2575) — sponsor terminated the study following an FDA request for a partial clinical hold

## F. Ambiguous / mixed-cause / planned-success / non-failure cases — 15

- `NCT04649060` (record 2415) — financial issues followed an FDA request for a partial clinical hold; operational and regulatory causes coexist
- `NCT04849273` (record 2441) — adverse risk/benefit is biologically negative, but the failing safety versus efficacy dimension is not isolated
- `NCT02382406` (record 2448) — study was completed and fully accrued; successful completion/non-failure
- `NCT05256277` (record 2458) — a new study was planned to replace the current study after an IP upgrade; transition/planned future study rather than a stated failure
- `NCT04893551` (record 2499) — all planned dose-escalation levels were completed and the sponsor chose not to expand cohorts under the existing design; no causal failure is supplied
- `NCT04489940` (record 2523) — probability of success was considered too low, but the endpoint or failing dimension is not specified
- `NCT03642132` (record 2526) — a related Phase 3 study stopped for efficacy futility while new PARP approvals changed the treatment landscape; scientific/efficacy and operational causes are mixed
- `NCT02927249` (record 2529) — DSMB review alone supplies neither the causal dimension nor negative polarity
- `NCT03254927` (record 2532) — emerging risk-benefit profile does not isolate whether safety or efficacy is the failing dimension
- `NCT00251433` (record 2533) — Phase I ended and the Phase II expansion was never initiated by sponsor decision; no underlying failure cause is supplied
- `NCT03354611` (record 2563) — study progress did not meet the sponsor's requirement, but the failed requirement/dimension is unspecified
- `NCT03439033` (record 2570) — study drug became FDA approved; approval is a milestone/context, not a negative failure cause by itself
- `NCT03435640` (record 2577) — overall Phase 1 results led the sponsor to end the study and safety was excluded, but the adverse dimension/polarity is not stated
- `NCT05622058` (record 2589) — Grade 4 neutropenia/alopecia and failure of the primary and main secondary endpoints are both explicit; safety and efficacy causes are mixed
- `NCT05744115` (record 2590) — investigational product became FDA approved and commercially available; approval/commercial transition is a non-failure context absent a separate negative cause

## Classifier issues reinforced or newly exposed by Batch 13

1. **Decision/action phrases remain structural false positives.** `Sponsor Decision`, `Business decision`, `Strategic decisions`, sponsor-requested closure, and similar statements must remain `OTHER/UNKNOWN` unless the causal reason is supplied.
2. **Concrete strategy, business, policy, and portfolio causes remain under-recognized.** Corporate policy adjustments, strategic considerations, R&D/development-strategy changes, business reasons/objectives/priorities, and resource reallocation are operational when they actually explain the stop.
3. **Supply, support, staffing, and organizational viability vocabulary remains incomplete.** Sponsor insolvency/bankruptcy, company cessation, withdrawal of study-drug support, drug/stock unavailability, investigator departure, and manpower shortage are recurring operational causes.
4. **Protocol/design, product, technical, and feasibility causes need broader operational coverage.** Reformulation, study-design reconsideration, low blinded event rate, and a product-potency problem identified by a changed assay are concrete continuation/feasibility causes.
5. **Treatment-landscape changes remain operational rather than automatically regulatory.** Institutional standard-of-care changes and a treatment paradigm moving away from the study backbone can make continuation impractical without any regulator ordering the stop.
6. **Direct negative efficacy semantics continue to leak into `OTHER/UNKNOWN` or `OPERATIONAL`.** Lack of effectiveness, failure of continuance criteria, insufficient clinical response, endpoints not achieved, and limited/no clinical benefit should map to `EFFICACY/FUTILITY` when causal.
7. **Direct adverse safety findings still need coverage, while review language needs gating.** An explicit safety risk or death-based safety monitoring supports `SAFETY`; a generic risk-benefit statement without an isolated dimension does not.
8. **Concrete FDA holds remain regulatory, including partial holds.** An FDA clinical hold or FDA request for a partial clinical hold is `REGULATORY` when it is the external stop cause; when a regulatory hold coexists with an independent financial cause, the record needs mixed-cause review.
9. **Review, probability-of-success, and vague progress language require dimension/polarity gating.** `DSMB review`, broad `probability of success`, or `progress doesn't meet sponsor requirement` is insufficient without the actual failing endpoint or dimension.
10. **Milestones, transitions, and approvals are not failure causes by themselves.** Full accrual/completion, completion of planned dose escalation, replacement by a future study, and FDA approval/commercial availability require non-failure/transition handling unless a separate negative cause is explicit.
11. **Mixed biological or biological/operational causes require explicit review.** Safety plus endpoint failure, or external efficacy futility plus a changed treatment landscape, should not be flattened into a single class.
12. **Confidence remains poorly calibrated.** Content-free decision phrases can receive high-confidence `OPERATIONAL`, while concrete strategy, insolvency, supply, staffing, technical, and treatment-landscape causes can remain low-confidence `OTHER/UNKNOWN`.

---

## Cumulative status — records 1–2600

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 1403 | 53.96% |
| Definitely misclassified | 982 | 37.77% |
| Ambiguous / multiple plausible causes / non-failure | 215 | 8.27% |
| Needs change or manual review | 1197 | 46.04% |

Of the 982 definite errors across the first 2600 records:

- 575 (58.6%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 262 (26.7%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 95 (9.7%) are missed `EFFICACY/FUTILITY`;
- 23 (2.3%) are missed `SAFETY`;
- 23 (2.3%) are missed `REGULATORY`;
- 4 (0.4%) are inverse biological false positives.

Thus 837 of 982 definite errors (85.2%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

---

# Classification Audit — Batch 14

This section is the completed manual semantic audit for records 2601–2800 and uses the same methodology and taxonomy as Batches 1–13.

Batch boundary: record 2601 is `NCT04438902`; record 2800 is `NCT03723915`.

The consistency rules from the preceding batches are applied strictly. Decision/action wording without a causal explanation remains `OTHER/UNKNOWN`; concrete strategy, policy, portfolio, funding/support, supply, staffing, recruitment, feasibility, protocol/design, product/technical, and treatment-landscape causes are `OPERATIONAL`; explicit negative efficacy or tolerability/safety evidence takes biological precedence; regulator/IRB/ethics actions are `REGULATORY` when they are the concrete external cause; and review, milestone, transition, or mixed-cause wording is not forced into a single label without sufficient polarity and dimension.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 112 | 56.0% |
| Definitely misclassified | 64 | 32.0% |
| Ambiguous / multiple plausible causes / non-failure | 24 | 12.0% |
| Needs change or manual review | 88 | 44.0% |

## Main finding

Batch 14 still concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary, although less overwhelmingly than Batch 13. Of the 64 definite errors, 33 are `OTHER/UNKNOWN` records with a concrete operational cause and 16 are labeled `OPERATIONAL` despite containing only a decision/action without the underlying cause. Together these 49 records account for 76.6% of all definite Batch 14 errors.

The remaining 15 definite errors are nine missed `EFFICACY/FUTILITY` cases, three missed `SAFETY` cases, and three missed `REGULATORY` cases. Batch 14 adds no inverse biological-to-nonbiological false positive; record 2792 is instead a wrong biological dimension (`SAFETY → EFFICACY/FUTILITY`) and is counted in the missed-efficacy group. Confidence remains poorly calibrated: bare sponsor/company/business decisions continue to receive high-confidence `OPERATIONAL`, while explicit strategy, support/supply, recruitment/feasibility, company-closure, regulatory-hold, safety, and efficacy causes can remain low-confidence `OTHER/UNKNOWN`.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 33

- `NCT01700569` (record 2602) — changing standard of care; treatment-landscape cause
- `NCT04622072` (record 2606) — strategic considerations; concrete strategy cause
- `NCT03678428` (record 2609) — production halt of FUDR in China; manufacturing/supply cause
- `NCT03236649` (record 2623) — clinical development plan changed; development-strategy cause
- `NCT04095858` (record 2625) — explicit business reasons
- `NCT02513667` (record 2635) — Novartis withdrew further study support
- `NCT04804254` (record 2636) — strategic considerations; concrete strategy cause
- `NCT03251417` (record 2640) — PD-1 antibodies became standard second-line treatment, changing the treatment landscape and study relevance
- `NCT04518137` (record 2642) — low NGS uptake and a small eligible population drove an R&D-strategy adjustment; feasibility/strategy cause
- `NCT03876028` (record 2643) — explicit business reasons
- `NCT01712659` (record 2670) — program ended after the lead investigator died; staffing/PI-availability cause
- `NCT03484520` (record 2682) — strategic considerations; concrete strategy cause
- `NCT04515394` (record 2692) — operational difficulty identifying suitable participants for screening
- `NCT04306692` (record 2695) — treatment was no longer considered standard of care; treatment-landscape/relevance cause
- `NCT04453046` (record 2701) — lack of eligible subjects at the study site; recruitment/feasibility cause
- `NCT01882660` (record 2706) — inclusion was too slow to reach the target within the study period
- `NCT04402723` (record 2726) — corporate policy adjustments
- `NCT04866056` (record 2727) — corporate policy adjustments
- `NCT03852576` (record 2734) — lack of dimer and inability to produce more; supply/manufacturing cause
- `NCT04304781` (record 2735) — lack of dimer; supply cause
- `NCT03195764` (record 2736) — existing OPC formulation was replaced by a newly developed capsule formulation; reformulation/development cause
- `NCT04782609` (record 2737) — Samus Therapeutics company closure
- `NCT03090880` (record 2738) — inclusion rate was too low and the available data could not meet the research objectives; recruitment failure
- `NCT03214666` (record 2745) — development shifted from GTB-3550 to the second-generation GTB-3650 product; development-strategy/replacement cause
- `NCT03518112` (record 2756) — competing studies; recruitment/feasibility cause
- `NCT02641782` (record 2757) — antibody supply was discontinued
- `NCT02474173` (record 2758) — drug-supply issues
- `NCT05271279` (record 2763) — R&D strategy adjustment
- `NCT04735796` (record 2770) — business strategy changed
- `NCT04547101` (record 2778) — enrollment difficulty plus clinical-guideline/treatment-landscape considerations; operational causes
- `NCT04444141` (record 2779) — enrollment difficulty plus clinical-guideline/treatment-landscape considerations; operational causes
- `NCT01464593` (record 2784) — trial design depended on RFA optimization; protocol/design feasibility cause
- `NCT00145158` (record 2790) — investigational-agent availability; drug-availability cause

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 16

These records identify a decision-maker, business decision, request, enrollment-closure action, or monitoring recommendation without supplying the underlying causal reason. A decision/action label alone does not establish an operational cause.

- `NCT05223699` (record 2617) — Sponsor Decision
- `NCT02323113` (record 2621) — Business Decision; exclusion of safety/efficacy concerns does not supply the actual cause
- `NCT03599518` (record 2627) — sponsor business decision only
- `NCT03238651` (record 2629) — sponsor business decision only
- `NCT03430791` (record 2637) — investigator/sponsor decided to end enrollment early; underlying cause absent
- `NCT04835714` (record 2641) — Sponsor decision
- `NCT03710564` (record 2644) — Sponsor Decision
- `NCT01986348` (record 2651) — sponsor decision; patient follow-up status does not explain the underlying cause
- `NCT01339910` (record 2679) — DSMB recommendation to terminate accrual is an action; the causal data dimension and polarity are absent
- `NCT02023905` (record 2685) — Sponsor decision
- `NCT04042116` (record 2698) — Company decision
- `NCT02229149` (record 2723) — per Sponsor request
- `NCT03515629` (record 2739) — Business decision
- `NCT03430063` (record 2760) — Business decision
- `NCT02811783` (record 2768) — Sponsor decision
- `NCT04504708` (record 2775) — business decision only

## C. Missed `EFFICACY/FUTILITY` — 9

- `NCT03504410` (record 2624) — explicit futility
- `NCT02052193` (record 2705) — second cohort was not opened because the Simon two-stage model failed; predefined stage-progression/futility failure
- `NCT03119064` (record 2713) — lack of response to study therapy
- `NCT00543712` (record 2714) — efficacy was not evident in the population
- `NCT02703272` (record 2724) — EFS hazard ratio and p-value crossed the protocol-specified futility boundary
- `NCT03784599` (record 2747) — insufficient effectiveness
- `NCT04142060` (record 2767) — lack of effectiveness
- `NCT00293215` (record 2791) — abnormal distribution and lack of tumor targeting; direct negative pharmacologic/targeting performance
- `NCT04022876` (record 2792) — favorable safety profile but insufficient treatment-group difference for the primary endpoint; this is efficacy failure, not `SAFETY`

## D. Missed `SAFETY` — 3

- `NCT03663166` (record 2613) — increased SAE occurrence
- `NCT03370302` (record 2630) — QW enrollment was terminated because the QD schedule showed a more favorable safety profile; the causal dimension is safety
- `NCT01005914` (record 2675) — increased rate of bacterial infections; adverse safety finding

## E. Missed `REGULATORY` — 3

- `NCT02807454` (record 2604) — Health Authority request caused the stop; concrete external oversight action
- `NCT03481556` (record 2703) — sponsor terminated the study following an FDA request for a partial clinical hold
- `NCT02716805` (record 2789) — FDA placed the study on partial hold

## F. Ambiguous / mixed-cause / planned-success / non-failure cases — 24

- `NCT03503968` (record 2614) — Phase I completed and Phase II was not initiated; no separate failure cause is supplied
- `NCT05725343` (record 2616) — termination followed results from CANOPY-A and safety is excluded, but the result direction/failing dimension is not stated
- `NCT03208296` (record 2631) — study did not start and another protocol was being developed; transition/planned replacement rather than a stated failure
- `NCT03614728` (record 2632) — internal review of clinical data without result polarity or a failing dimension
- `NCT01746173` (record 2645) — slow accrual plus futility; operational and efficacy causes are both explicit
- `NCT01028716` (record 2657) — COVID-related lower accrual is stated, but the collected sample was deemed adequate to assess study aims; operational difficulty plus sufficient-data/non-failure context
- `NCT04297748` (record 2660) — `Efficacy finding` supplies a dimension but no negative polarity
- `NCT04969861` (record 2665) — program discontinued after three negative studies, but the failing biological/clinical dimension is not stated clearly enough for a single label
- `NCT02987998` (record 2704) — higher-than-expected toxicity plus an unrealistic timeline to complete the trial; safety and operational causes coexist
- `NCT01381211` (record 2709) — stop based on interim-analysis results without stated dimension or negative polarity
- `NCT03781960` (record 2711) — safety letter from the sponsor without the adverse finding or negative safety polarity
- `NCT04372706` (record 2712) — sponsor terminated during expansion; safety is explicitly favorable, while rapid clearance is reported without an explicit failure interpretation
- `NCT05219578` (record 2717) — sponsor terminated after two dose groups; safety is explicitly favorable, while rapid clearance is reported without an explicit failure interpretation
- `NCT04672980` (record 2718) — sponsor terminated after three dose groups; safety is explicitly favorable, while rapid clearance is reported without an explicit failure interpretation
- `NCT01881789` (record 2744) — safety profile and PK characteristics of the formulation both required optimization; safety and product/PK-development causes are mixed
- `NCT05611086` (record 2749) — study period ended; administrative/planned completion rather than a stated failure
- `NCT01416428` (record 2753) — safety profile and PK characteristics of the formulation both required optimization; safety and product/PK-development causes are mixed
- `NCT02933073` (record 2755) — recruitment challenges plus an ongoing investigational-adjuvant review whose dimension/polarity is unspecified
- `NCT01649505` (record 2762) — low enrollment plus `no clinical findings`; operational and potentially biological/data-sufficiency interpretations cannot be cleanly separated
- `NCT03099265` (record 2769) — COVID pause plus inability to reach the protocol-specified 65% resection rate; operational and endpoint/futility causes coexist
- `NCT01266018` (record 2772) — lack of efficacy in Cohort 2 plus slow enrollment in Cohort 1; biological and operational causes are explicit
- `NCT04880564` (record 2773) — no drug-treatment benefit plus a company/treatment-landscape change; efficacy and operational causes coexist
- `NCT03693846` (record 2777) — slow enrollment plus lack of efficacy; operational and efficacy causes are explicit
- `NCT03723915` (record 2800) — accrual goal was not met and Stage 1 also failed the interim criterion to proceed to Stage 2; operational and efficacy/futility causes coexist

## Classifier issues reinforced or newly exposed by Batch 14

1. **Decision/action phrases remain structural false positives.** `Sponsor Decision`, `Company decision`, `Business decision`, sponsor requests, and enrollment-closure recommendations can still receive high-confidence `OPERATIONAL` without a causal explanation.
2. **Concrete strategy, policy, and business causes remain under-recognized.** Strategic considerations, business reasons, corporate policy adjustments, R&D/development changes, and business-strategy changes are operational when they actually explain the stop.
3. **Supply, manufacturing, support, staffing, and recruitment vocabulary remains incomplete.** Production halt, withdrawn study support, lead-investigator loss, dimer/manufacturing shortages, company closure, drug/antibody availability, competing studies, and lack of eligible subjects all recur as missed operational causes.
4. **Treatment-landscape and guideline changes remain operational when they undermine feasibility or relevance.** Standard-of-care changes, new guideline context, and replacement therapeutic options should not default to regulatory or unknown when no regulator ordered the stop.
5. **Direct efficacy/futility semantics still leak.** Bare `Futile`, failed Simon two-stage progression, lack of response/effectiveness, protocol futility boundaries, tumor-targeting failure, and insufficient primary-endpoint separation all require broader efficacy coverage.
6. **Safety needs both broader adverse-event coverage and stricter polarity gating.** Increased SAEs, increased bacterial infections, and a schedule stopped for an inferior safety profile support `SAFETY`; a generic safety letter or favorable safety statements do not.
7. **FDA/Health-Authority holds and requests remain missed regulatory causes.** Partial clinical holds and direct Health Authority requests should map to `REGULATORY` when they externally cause the stop.
8. **Mixed-cause handling remains necessary.** Slow accrual plus futility, toxicity plus timeline infeasibility, COVID/operational interruption plus endpoint failure, efficacy plus treatment-landscape change, and safety plus PK/formulation optimization should not be flattened into a single label.
9. **Review/result language still needs dimension-and-polarity gating.** Interim analysis, internal clinical-data review, `Efficacy finding`, safety letters, negative-study summaries, and rapid-clearance observations require the actual adverse dimension and causal interpretation before assigning a biological class.
10. **Milestone and transition handling remains important.** Completion of Phase I without Phase II, sufficient data already collected, replacement by another protocol, and the study period simply ending are not automatically failure causes.
11. **Wrong biological dimension is a separate classifier failure mode.** Record 2792 is labeled `SAFETY` despite explicitly favorable safety and an efficacy endpoint failure; biological keyword precedence must respect polarity and the actual failing dimension.
12. **Confidence remains poorly calibrated.** Content-free decision phrases can be HIGH-confidence `OPERATIONAL`, while explicit strategy, regulatory, safety, efficacy, supply, and feasibility causes remain LOW-confidence `OTHER/UNKNOWN`.

---

## Cumulative status — records 1–2800

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 1515 | 54.11% |
| Definitely misclassified | 1046 | 37.36% |
| Ambiguous / multiple plausible causes / non-failure | 239 | 8.54% |
| Needs change or manual review | 1285 | 45.89% |

Of the 1046 definite errors across the first 2800 records:

- 608 (58.1%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 278 (26.6%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 104 (9.9%) are missed `EFFICACY/FUTILITY`;
- 26 (2.5%) are missed `SAFETY`;
- 26 (2.5%) are missed `REGULATORY`;
- 4 (0.4%) are inverse biological false positives.

Thus 886 of 1046 definite errors (84.7%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

## Arithmetic check

- Batch 14: `112 + 64 + 24 = 200`.
- Batch 14 needs change/review: `64 + 24 = 88`.
- Batch 14 definite-error subgroups: `33 + 16 + 9 + 3 + 3 = 64`.
- Cumulative total: `1515 + 1046 + 239 = 2800`.
- Cumulative needs change/review: `1046 + 239 = 1285`.
- Cumulative definite-error subgroups: `608 + 278 + 104 + 26 + 26 + 4 = 1046`.

---

# Classification Audit — Batch 15

This section is the completed manual semantic audit for records 2801–3000 and uses the same methodology and taxonomy as Batches 1–14.

Batch boundary: record 2801 is `NCT04398199`; record 3000 is `NCT03752541`.

The consistency rules from the preceding batches are applied strictly. Decision/action wording without a causal explanation remains `OTHER/UNKNOWN`; concrete strategy, policy, portfolio, funding/support, supply, staffing, recruitment, feasibility, protocol/design, product/technical, and treatment-landscape causes are `OPERATIONAL`; explicit negative efficacy or tolerability/safety evidence takes biological precedence; regulator/IRB/ethics actions and explicit clinical holds are `REGULATORY` when they are the concrete external cause; and review, milestone, transition, or mixed-cause wording is not forced into a single label without sufficient polarity and dimension.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 117 | 58.5% |
| Definitely misclassified | 69 | 34.5% |
| Ambiguous / multiple plausible causes / non-failure | 14 | 7.0% |
| Needs change or manual review | 83 | 41.5% |

## Main finding

Batch 15 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 69 definite errors, 38 are `OTHER/UNKNOWN` records with a concrete operational cause and 16 are labeled `OPERATIONAL` despite containing only a decision/action without the underlying cause. Together these 54 records account for 78.3% of all definite Batch 15 errors.

The remaining 15 definite errors are ten missed `EFFICACY/FUTILITY` cases, three missed `REGULATORY` cases, and two inverse biological false positives. There is no definite missed `SAFETY` case in Batch 15. One inverse case is a false `SAFETY` assignment to a successful/neutral Phase I milestone with a manageable safety profile; the other is a false `EFFICACY/FUTILITY` assignment where `Interim Analysis` lacks negative efficacy polarity and the only actual causal content is business concerns. Confidence remains poorly calibrated: bare sponsor/business/strategic decisions continue to receive high-confidence `OPERATIONAL`, while explicit business/strategy, staffing, supply, recruitment, efficacy, and regulatory causes can remain low-confidence `OTHER/UNKNOWN`.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 38

- `NCT01665274` (record 2805) — the team was joining a larger similar multicenter trial and suspended this project to avoid conflicts; program/redundancy cause
- `NCT02601378` (record 2807) — explicit business reasons
- `NCT03516760` (record 2808) — required actions and measures to restart the trial could not be implemented; execution/feasibility cause
- `NCT04746131` (record 2816) — product-development strategy changed; the later sponsor request to make the IND inactive is an action downstream of the operational strategy cause
- `NCT04425655` (record 2820) — original investigator left
- `NCT03129776` (record 2821) — lack of participants
- `NCT03773133` (record 2829) — high number of screen failures
- `NCT02572453` (record 2831) — drug-supply issues
- `NCT02113553` (record 2834) — target population not reached; recruitment/feasibility cause
- `NCT04272203` (record 2840) — strategic considerations
- `NCT03596658` (record 2844) — sponsor R&D strategy adjustment
- `NCT03182673` (record 2845) — sponsor R&D strategy adjustment
- `NCT03998033` (record 2853) — resources reallocated to a new HCC study
- `NCT02341625` (record 2865) — explicit business reasons, with safety excluded
- `NCT01582009` (record 2872) — PI left the institute
- `NCT01573780` (record 2875) — sponsor lacked funds to continue the study
- `NCT01525069` (record 2881) — study equipment was discontinued
- `NCT04069936` (record 2893) — resourcing; concrete resource constraint
- `NCT02414724` (record 2907) — PI left the institute
- `NCT03526185` (record 2908) — lack of funds
- `NCT01550185` (record 2909) — sponsor wanted the study rewritten; protocol-redesign cause
- `NCT00746590` (record 2912) — sponsor terminated prematurely for a business reason
- `NCT02325349` (record 2919) — change in protocol strategy
- `NCT02826512` (record 2922) — too few eligible patients and too many screen failures
- `NCT04596033` (record 2924) — business reasons
- `NCT04634344` (record 2930) — internal business strategy
- `NCT03476928` (record 2935) — change in the development program
- `NCT02535247` (record 2936) — Merck no longer providing study drug
- `NCT01555281` (record 2937) — SAKK restructuring and portfolio/value review drove early termination
- `NCT02718404` (record 2947) — non-renewal of the medical-device loan agreement; equipment/device-availability cause
- `NCT03400956` (record 2948) — change in the development program
- `NCT04326439` (record 2963) — unforeseen circumstances limited the team's ability to enroll; recruitment/feasibility cause
- `NCT04230954` (record 2976) — PI left the institution
- `NCT03077698` (record 2977) — development-strategy change, explicitly not a safety concern
- `NCT03606889` (record 2978) — not enough participants
- `NCT03904108` (record 2991) — insufficient patient population to complete the trial as planned
- `NCT01459666` (record 2992) — investigator left the institution for private practice
- `NCT03444753` (record 2998) — business objectives changed

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 16

These records identify a decision-maker or strategic/business decision without supplying the underlying causal reason. A decision label alone does not establish an operational cause, even when safety or efficacy is explicitly excluded.

- `NCT03218683` (record 2819) — Sponsor Decision
- `NCT03778073` (record 2855) — Strategic/Business Decision
- `NCT03379051` (record 2858) — Strategic/Business Decision
- `NCT03970382` (record 2860) — Business decision
- `NCT03645395` (record 2866) — Sponsor decision
- `NCT03488251` (record 2867) — Sponsor decision
- `NCT04489420` (record 2878) — Business decision
- `NCT03674242` (record 2895) — sponsor decision
- `NCT03207256` (record 2913) — Strategic/Business Decision
- `NCT02793583` (record 2914) — Strategic/Business Decision
- `NCT05001451` (record 2916) — business decision; the safety exclusion does not supply the actual cause
- `NCT04210037` (record 2926) — Sponsor decision
- `NCT00479765` (record 2955) — sponsor business decision, explicitly not based on safety or efficacy data
- `NCT04178460` (record 2987) — business decision, explicitly not due to safety concerns
- `NCT04461886` (record 2994) — Sponsor decision
- `NCT03594955` (record 2996) — Sponsor decision

## C. Missed `EFFICACY/FUTILITY` — 10

- `NCT04861948` (record 2803) — no signs of efficacy in solid tumors
- `NCT04265534` (record 2822) — lack of clinical benefit
- `NCT01440179` (record 2824) — very modest activity compared with competitors
- `NCT02698189` (record 2832) — limited efficacy, explicitly not a safety stop
- `NCT04060342` (record 2859) — no clear benefit as monotherapy or in combination
- `NCT03147040` (record 2920) — interim analysis found insufficient benefit to continue
- `NCT00573131` (record 2956) — no impact on overall tumor response
- `NCT03100006` (record 2971) — poor efficacy
- `NCT02374424` (record 2979) — planned interim analysis did not provide a positive outcome, so enrollment was not reopened; negative efficacy/futility result
- `NCT04727541` (record 2999) — recruitment stopped after another Phase II study with the same agent/combination was discontinued because it was unlikely to meet the OS primary endpoint; external efficacy-futility evidence is the causal basis

## D. Missed `SAFETY` — 0

No definite Batch 15 record is currently non-safety but supplies a sufficiently explicit adverse safety/tolerability cause to require reclassification to `SAFETY`.

## E. Missed `REGULATORY` — 3

- `NCT02361346` (record 2862) — sponsor decision followed a clinical hold; under the audit taxonomy an explicit clinical hold is a regulatory stop mechanism unless a separate underlying safety failure is stated
- `NCT04173325` (record 2966) — IRB closed the study for non-compliance
- `NCT04173338` (record 2967) — IRB closed the study

## F. Inverse biological false positives — 2

- `NCT05156229` (record 2843) — currently `SAFETY`, but PK/PD confirmed the RP2D and a manageable safety profile, and no additional Phase I data were needed before Phase II; successful/neutral milestone rather than a safety failure
- `NCT01402908` (record 2954) — currently `EFFICACY/FUTILITY`, but `Interim Analysis` supplies no negative efficacy polarity while `business concerns` is the only concrete causal content; should be `OPERATIONAL`

## G. Ambiguous / mixed-cause / planned-success / non-failure cases — 14

- `NCT01174199` (record 2804) — `no value in finding efficacy` is semantically unclear and does not cleanly state a negative efficacy result
- `NCT03524898` (record 2811) — last-patient-last-visit occurred and the trial ended in accordance with SAKK/CI; administrative end/non-failure rather than a supplied failure cause
- `NCT03945799` (record 2847) — preliminary results were obtained and the study `stopped advanced`; result polarity and failing dimension are unclear
- `NCT02601209` (record 2852) — interim monitoring without an adverse dimension or polarity
- `NCT02267863` (record 2854) — drug-manufacturing process/procedure review identifies a domain but not a concrete adverse manufacturing finding; review alone is insufficient for a forced label
- `NCT04102618` (record 2874) — enrollment concluded and the primary objective/core goals were met; successful milestone/non-failure
- `NCT03760666` (record 2888) — no efficacy observed plus COVID-19 site shutdown; efficacy and operational causes coexist
- `NCT03442985` (record 2898) — trial stopped to analyze accumulated data and evaluate efficacy, safety, and future development; evaluation/review without adverse polarity
- `NCT02340221` (record 2928) — modest clinical benefit plus limited tolerability; mixed `EFFICACY/FUTILITY` + `SAFETY`
- `NCT04006847` (record 2946) — `Product complaint` is too underspecified to distinguish product-quality/operational from safety causality
- `NCT03850535` (record 2958) — sponsor stopped after Phase I and did not proceed to Phase II, with no underlying failure cause supplied; stage transition/non-failure pattern
- `NCT03259425` (record 2970) — DSMC recommendation without the underlying safety, efficacy, or other basis
- `NCT03970694` (record 2975) — significant differences in conversion and R0-resection rates are reported without direction or adverse polarity
- `NCT02452983` (record 2986) — `lack of study progress` does not identify the failed endpoint, operational constraint, or other causal dimension

## Classifier issues reinforced or newly exposed by Batch 15

1. **Decision/action phrases remain structural false positives.** `Sponsor decision`, `Business decision`, and `Strategic/Business Decision` still receive high-confidence `OPERATIONAL` despite lacking the causal layer.
2. **Concrete strategy, business, resource, and program causes remain under-recognized.** Product/development-strategy changes, business reasons/objectives, restructuring, resource reallocation, and resourcing constraints are operational when they actually explain the stop.
3. **Staffing, funding, supply, equipment, and recruitment vocabulary remains incomplete.** PI departure, lack of funds, drug-supply loss, discontinued equipment/device access, lack of participants, screen failures, and insufficient patient populations recur as missed operational causes.
4. **Protocol and execution causes need broader coverage.** An inability to implement restart measures, a sponsor-requested study rewrite, and changes in protocol strategy are concrete execution/design causes rather than unknown decisions.
5. **Direct negative efficacy semantics still leak.** `No signs of efficacy`, `lack of clinical benefit`, `very modest activity`, `limited efficacy`, `no clear benefit`, `insufficient benefit`, `poor efficacy`, and no impact on tumor response all require robust efficacy/futility coverage.
6. **External efficacy evidence must retain its biological dimension.** Stopping the current study because a closely related Phase II program was unlikely to meet an OS primary endpoint is an efficacy/futility cause, not merely the operational act of closing recruitment.
7. **Safety polarity gating remains essential.** A `manageable safety profile` and successful RP2D confirmation must not trigger `SAFETY`; generic efficacy/safety evaluation likewise does not prove failure.
8. **Clinical holds and IRB closures remain regulatory causes.** An explicit clinical hold or IRB-directed closure should map to `REGULATORY` unless the text separately establishes a different underlying failure dimension.
9. **Review language still needs dimension-and-polarity gating.** Interim monitoring, manufacturing-process review, DSMC recommendation, accumulated-data review, and an interim analysis without a stated negative result cannot be forced into a biological class.
10. **Mixed causes remain irreducible under one forced label.** No efficacy plus COVID shutdown and modest clinical benefit plus limited tolerability require explicit review/multi-cause handling.
11. **Milestone and stage-transition handling remains necessary.** Primary objectives/core goals met, a confirmed RP2D with sufficient data, and stopping after Phase I without a causal failure are not automatically failures.
12. **Confidence remains poorly calibrated.** Content-free decisions can be HIGH-confidence `OPERATIONAL`, while explicit strategy, staffing, funding, recruitment, efficacy, and regulatory causes remain LOW-confidence `OTHER/UNKNOWN`.

---

## Cumulative status — records 1–3000

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 1632 | 54.40% |
| Definitely misclassified | 1115 | 37.17% |
| Ambiguous / multiple plausible causes / non-failure | 253 | 8.43% |
| Needs change or manual review | 1368 | 45.60% |

Of the 1115 definite errors across the first 3000 records:

- 646 (57.9%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 294 (26.4%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 114 (10.2%) are missed `EFFICACY/FUTILITY`;
- 26 (2.3%) are missed `SAFETY`;
- 29 (2.6%) are missed `REGULATORY`;
- 6 (0.5%) are inverse biological false positives.

Thus 940 of 1115 definite errors (84.3%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

## Arithmetic check

- Batch 15: `117 + 69 + 14 = 200`.
- Batch 15 needs change/review: `69 + 14 = 83`.
- Batch 15 definite-error subgroups: `38 + 16 + 10 + 0 + 3 + 2 = 69`.
- Cumulative additions: `1515 + 117 = 1632`, `1046 + 69 = 1115`, `239 + 14 = 253`, and `1285 + 83 = 1368`.
- Cumulative total: `1632 + 1115 + 253 = 3000`.
- Cumulative needs change/review: `1115 + 253 = 1368`.
- Cumulative definite-error subgroups: `646 + 294 + 114 + 26 + 29 + 6 = 1115`.

---

# Classification Audit — Batch 16

This section is the completed manual semantic audit for records 3001–3200 and uses the same methodology and taxonomy as Batches 1–15.

Batch boundary: record 3001 is `NCT03666988`; record 3200 is `NCT04476329`.

The consistency rules from the preceding batches are applied strictly. Decision/action wording without a causal explanation remains `OTHER/UNKNOWN`; concrete strategy, policy, portfolio, funding/support, supply, staffing, recruitment, feasibility, protocol/design, manufacturing/technical, and treatment-landscape causes are `OPERATIONAL`; explicit negative efficacy or tolerability/safety evidence takes biological precedence; direct regulator/IRB/ethics actions and explicit clinical holds are `REGULATORY`; and benefit-risk, review, milestone, transition, or mixed-cause wording is not forced into a single label without sufficient polarity, dimension, and causality.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 118 | 59.0% |
| Definitely misclassified | 64 | 32.0% |
| Ambiguous / multiple plausible causes / non-failure | 18 | 9.0% |
| Needs change or manual review | 82 | 41.0% |

## Main finding

Batch 16 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 64 definite errors, 36 are `OTHER/UNKNOWN` records with a concrete operational cause and 15 are labeled `OPERATIONAL` despite supplying only a decision/action or an underspecified administrative/strategic statement. Together these 51 records account for 79.7% of all definite Batch 16 errors.

The remaining 13 definite errors are eight missed `EFFICACY/FUTILITY` cases, three missed `SAFETY` cases, one missed `REGULATORY` case, and one inverse biological false positive. The inverse case is `NCT02212015`: `Interim Analysis` plus protocol definitions does not supply an explicit negative efficacy dimension or polarity, so the current `EFFICACY/FUTILITY` label is not semantically supported. Benefit-risk wording is also important in this batch: an adverse benefit-risk statement is biologically meaningful, but without a separable safety-versus-efficacy dimension it should not be forced into one biological label, and it should not be reduced to the downstream operational act of closing enrollment. Confidence remains poorly calibrated: bare sponsor/business/strategic/administrative decisions can receive high-confidence `OPERATIONAL`, while explicit staffing, supply, strategy, efficacy, safety, and regulatory causes can remain `OTHER/UNKNOWN`.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 36

- `NCT03332589` (record 3002) — PI departure is a concrete staffing/feasibility cause
- `NCT00810017` (record 3004) — difficulty accruing patients is an explicit recruitment cause
- `NCT04844086` (record 3007) — manufacturing inability to meet dose requirements is operational
- `NCT03475680` (record 3010) — lack of inclusions is recruitment failure
- `NCT03787303` (record 3014) — PI relocation is a concrete staffing/feasibility cause
- `NCT03041285` (record 3017) — difficulty finding eligible participants is recruitment/feasibility
- `NCT02043587` (record 3030) — PI departure is staffing/feasibility
- `NCT03074318` (record 3032) — PI departure is operational
- `NCT04009460` (record 3033) — concrete clinical-development strategy adjustment is operational
- `NCT03254732` (record 3037) — concrete corporate-priority change is operational
- `NCT02927938` (record 3042) — limited participation and testing challenges are concrete operational causes
- `NCT03041701` (record 3050) — drug availability was withdrawn, a concrete supply/support cause
- `NCT03707028` (record 3058) — concrete change in research plan/development design is operational
- `NCT03713320` (record 3060) — explicit business reasons are a concrete operational cause; safety/efficacy are expressly negated
- `NCT03924245` (record 3074) — participant/treatment landscape changes are concrete operational feasibility causes
- `NCT01187810` (record 3080) — drug supply is a concrete operational cause
- `NCT02163356` (record 3082) — drug supply is a concrete operational cause
- `NCT02838745` (record 3084) — a causal research-plan change is an operational development/study-plan change
- `NCT03759184` (record 3095) — prolonged study inactivity is a concrete operational feasibility failure
- `NCT01525329` (record 3104) — study-drug availability is a concrete operational cause
- `NCT01455389` (record 3122) — concrete development-strategy change/refocusing to another combination is operational
- `NCT03739138` (record 3126) — explicit business reasons are an operational cause
- `NCT01606566` (record 3137) — explicit business reasons are operational
- `NCT02982720` (record 3140) — manufacturer discontinuation removes drug availability, an operational supply cause
- `NCT01295697` (record 3144) — program divestment is a concrete corporate/portfolio change causing discontinuation
- `NCT02687386` (record 3145) — study-medication production/supply ended
- `NCT01036113` (record 3146) — program divestment is a concrete corporate/portfolio change
- `NCT02559024` (record 3148) — drug-supply loss plus PI departure are concrete operational causes
- `NCT04506983` (record 3149) — the stated causal reason is a study-plan adjustment, an operational protocol/development change
- `NCT04697290` (record 3150) — a causal plan adjustment is an operational study-design/development change
- `NCT01918930` (record 3154) — failure to accrue as planned for optional biopsies is an operational recruitment/feasibility cause
- `NCT00003777` (record 3165) — PI departure is a concrete staffing cause
- `NCT02054104` (record 3167) — manufacturing/production halt is a concrete operational cause
- `NCT02933944` (record 3168) — changed priorities are a concrete portfolio/strategy cause
- `NCT04097301` (record 3172) — inability to complete/close within a clinically relevant timeframe is an operational feasibility failure
- `NCT02901483` (record 3182) — explicit business reason is operational

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 15

These records supply a decision-maker, action, or generic administrative/strategic wording without a sufficiently concrete underlying cause. A decision label alone does not establish an operational cause, even when safety is explicitly excluded.

- `NCT03552029` (record 3003) — bare sponsor business decision is an action without causal explanation
- `NCT03655613` (record 3022) — content-free administrative reasons do not state a concrete cause
- `NCT04627142` (record 3045) — bare sponsor decision is not a cause
- `NCT02945813` (record 3055) — closure/shortening action is stated without causal reason
- `NCT03684785` (record 3062) — content-free administrative reasons do not identify a cause
- `NCT03217838` (record 3068) — bare strategic decision lacks causal explanation
- `NCT00785798` (record 3072) — sponsor request is an action without stated cause
- `NCT03515551` (record 3106) — a bare strategic decision to stop development supplies no underlying cause; safety is explicitly negated
- `NCT04156100` (record 3121) — bare strategic/business decision is an action without a causal explanation
- `NCT03347123` (record 3123) — business decision plus undimensioned sister-study data analysis does not state the causal scientific or operational reason
- `NCT03746704` (record 3131) — bare business decision is action-only
- `NCT02628535` (record 3153) — bare business decision provides no causal explanation; safety is explicitly negated
- `NCT03099486` (record 3155) — generic administrative change is content-free and does not identify the underlying cause
- `NCT03255083` (record 3171) — bare sponsor business decision is action-only
- `NCT00321100` (record 3180) — undimensioned KRAS data do not identify an operational cause or a polarity-gated biological failure

## C. Missed `EFFICACY/FUTILITY` — 8

- `NCT03367819` (record 3011) — failure of per-protocol continuation criteria after interim analysis is futility
- `NCT04131192` (record 3021) — no obvious advantage versus standard treatment is explicit lack of efficacy/benefit
- `NCT02154529` (record 3036) — lack of response is explicit efficacy failure
- `NCT02419664` (record 3085) — the stated scientific hypothesis could not be confirmed and further follow-up was no longer justified, indicating futility/endpoint failure
- `NCT02236572` (record 3159) — predefined stage-progression response criterion was not met, an efficacy/futility failure
- `NCT04653389` (record 3181) — explicit unsatisfactory treatment efficacy
- `NCT03404726` (record 3187) — explicit lack of sufficient clinical benefit
- `NCT03937141` (record 3197) — explicit lack of substantial anti-tumor activity

## D. Missed `SAFETY` — 3

- `NCT04209621` (record 3114) — unexpected on-study sudden death is an explicit adverse mortality/safety signal
- `NCT04525391` (record 3127) — a SUSAR with the same drug in other trials is explicit adverse safety evidence causing the stop
- `NCT04958993` (record 3128) — high incidence of severe radiation pneumonia is explicit toxicity/safety evidence

## E. Missed `REGULATORY` — 1

- `NCT04115956` (record 3091) — explicit FDA request for a partial clinical hold is a regulatory cause

## F. Inverse biological false positives — 1

- `NCT02212015` (record 3093) — interim-analysis wording lacks an explicit efficacy dimension and negative polarity; protocol definitions alone do not establish efficacy failure

## G. Ambiguous / mixed-cause / planned-success / non-failure cases — 18

- `NCT03666988` (record 3001) — undimensioned unfavorable benefit-risk; cannot isolate safety vs efficacy
- `NCT04327986` (record 3005) — worsening benefit-risk is biologically negative but dimension not isolable; not operational
- `NCT02801097` (record 3008) — successful/neutral data/accrual sufficiency milestone, not a failure cause
- `NCT03655821` (record 3012) — recruitment difficulty plus statement that full inclusion would not change results mixes operational and futility/data-sufficiency signals
- `NCT03324282` (record 3028) — explicit regulatory refusal + recruitment decline + external efficacy non-benefit are mixed regulatory/operational/efficacy causes
- `NCT03316222` (record 3029) — stage completion and planned separate Phase II are neutral/planned transition, not a failure cause
- `NCT03294252` (record 3040) — completed treatment with sufficient data for objectives is a neutral/success milestone, not failure
- `NCT04428047` (record 3067) — external biological evidence includes hyperprogression and early toxicities; biological negative signal is clear but dimension is mixed/uncertain, so not a pure operational label
- `NCT03300921` (record 3086) — mixed safety signal (potential harm) and operational infeasibility of timely subtyping
- `NCT02978716` (record 3092) — protocol-defined analysis and survival follow-up were completed; explicit non-safety completion is a non-failure milestone
- `NCT04501094` (record 3096) — explicit mixed operational (low accrual) and safety causes; do not reduce to a single biological label
- `NCT02999633` (record 3098) — unfavorable benefit-risk is biologically negative but does not isolate safety versus efficacy; not operational
- `NCT01685606` (record 3119) — explicit mixed operational (lack of accrual) and efficacy causes; do not reduce to OPERATIONAL
- `NCT02739555` (record 3132) — text describes end-of-research completion/non-failure while also noting incomplete recruitment; review rather than force an operational failure
- `NCT00496431` (record 3163) — explicit mixed operational recruitment failure and efficacy failure
- `NCT04034355` (record 3164) — regulatory context motivated a sponsor hold, but no explicit authority directive on this study is stated; review rather than force OPERATIONAL or REGULATORY
- `NCT03637491` (record 3166) — explicit limited efficacy plus dose-level feasibility constraint; mixed/review
- `NCT04296942` (record 3189) — explicit mixed safety evidence and operational slow accrual

## Classifier issues reinforced or newly exposed by Batch 16

1. **Decision/action phrases remain structural false positives.** Bare `business decision`, `strategic decision`, sponsor requests, and generic administrative statements can still receive `OPERATIONAL` without a causal layer.
2. **Concrete business and strategy causes remain under-recognized.** `Business Reasons`, changing corporate priorities, research-plan changes, development-strategy changes, program divestment, and explicit plan adjustments are operational when they actually explain the stop, in contrast to a bare decision.
3. **Staffing, supply/manufacturing, recruitment, and feasibility coverage remains incomplete.** PI departure/relocation, drug unavailability, discontinued production, manufacturing inability to meet dose requirements, recruitment/eligibility problems, prolonged inactivity, and clinically unrealistic timelines recur as missed operational causes.
4. **Direct efficacy and continuance semantics still leak.** Failure of per-protocol continuation criteria, no advantage versus standard treatment, lack of response, a failed predefined response threshold, unsatisfactory efficacy, insufficient clinical benefit, and no substantial anti-tumor activity require efficacy/futility coverage.
5. **Explicit safety evidence can still be missed.** An unexpected on-study death, an external SUSAR with the same drug, and a high incidence of severe radiation pneumonia were all left as `OTHER/UNKNOWN`.
6. **FDA partial clinical-hold requests remain a clear regulatory pattern.** A sponsor termination following an FDA request for a partial clinical hold is `REGULATORY`, not merely unknown or operational.
7. **Benefit-risk wording requires dimension gating.** Records 3001, 3005, and 3098 show an adverse benefit-risk conclusion but do not isolate whether safety or efficacy is the failing dimension; they require review rather than a forced single label.
8. **Mixed operational and biological causes remain irreducible under keyword precedence.** Batch 16 includes regulatory+operational+efficacy, safety+operational, and efficacy+operational combinations that need explicit multi-cause handling.
9. **Milestone and stage-transition handling remains necessary.** Sufficient enrollment/data, completed protocol analysis/follow-up, and completion of Phase 1b with transition to another Phase 2 study are not automatically failure causes.
10. **Interim/DSMB language still needs dimension, direction, and polarity gating.** `NCT02212015` is the clearest inverse example: interim-analysis wording alone does not prove efficacy failure; the same caution applies to DSMB/interim descriptions that omit the direction of the result.
11. **Regulatory context must remain distinct from direct regulatory cause.** Interactions with a regulator or a clinical hold in another study do not by themselves establish that a regulator ordered the current study to stop.
12. **Mixed recruitment plus scientific interpretation requires review.** `NCT03655821` combines difficult inclusion with a claim that full inclusion would not change the results; a one-label classifier loses that dual structure.
13. **Undimensioned scientific data should not be forced into either operational or biological failure.** KRAS-data wording without the scientific result or adverse polarity is not a valid operational cause and does not support a biological label.
14. **Confidence remains poorly calibrated.** Content-free decisions can be confidently operationalized while explicit strategy, staffing, supply, efficacy, safety, and regulatory causes remain unrecognized.

---

## Cumulative status — records 1–3200

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 1750 | 54.69% |
| Definitely misclassified | 1179 | 36.84% |
| Ambiguous / multiple plausible causes / non-failure | 271 | 8.47% |
| Needs change or manual review | 1450 | 45.31% |

Of the 1179 definite errors across the first 3200 records:

- 682 (57.8%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 309 (26.2%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 122 (10.3%) are missed `EFFICACY/FUTILITY`;
- 29 (2.5%) are missed `SAFETY`;
- 30 (2.5%) are missed `REGULATORY`;
- 7 (0.6%) are inverse biological false positives.

Thus 991 of 1179 definite errors (84.1%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

## Arithmetic check

- Batch 16: `118 + 64 + 18 = 200`.
- Batch 16 needs change/review: `64 + 18 = 82`.
- Batch 16 definite-error subgroups: `36 + 15 + 8 + 3 + 1 + 1 = 64`.
- Cumulative additions: `1632 + 118 = 1750`, `1115 + 64 = 1179`, `253 + 18 = 271`, and `1368 + 82 = 1450`.
- Cumulative total: `1750 + 1179 + 271 = 3200`.
- Cumulative needs change/review: `1179 + 271 = 1450`.
- Cumulative definite-error subgroups: `682 + 309 + 122 + 29 + 30 + 7 = 1179`.

---

# Classification Audit — Batch 17

This section is the completed manual semantic audit for records 3201–3400 and uses the same methodology and taxonomy as Batches 1–16.

Batch boundary: record 3201 is `NCT02963610`; record 3400 is `NCT01113502`.

The consistency rules from the preceding batches are applied strictly. Decision/action wording without a causal explanation remains `OTHER/UNKNOWN`; concrete strategy, portfolio, funding/support, supply, staffing, recruitment, feasibility, protocol/design, resource, and treatment-landscape causes are `OPERATIONAL`; explicit negative efficacy or tolerability/safety evidence takes biological precedence; direct regulator/IRB/ethics actions and explicit clinical holds are `REGULATORY`; and review, benefit-risk, milestone, transition, or mixed-cause wording is not forced into a single label without sufficient polarity, dimension, and causality.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 114 | 57.0% |
| Definitely misclassified | 60 | 30.0% |
| Ambiguous / multiple plausible causes / non-failure | 26 | 13.0% |
| Needs change or manual review | 86 | 43.0% |

## Main finding

Batch 17 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 60 definite errors, 32 are `OTHER/UNKNOWN` records with a concrete operational cause and 17 are labeled `OPERATIONAL` despite supplying only a decision/action without the underlying cause. Together these 49 records account for 81.7% of all definite Batch 17 errors.

The remaining 11 definite errors are eight missed `EFFICACY/FUTILITY` cases, two missed `SAFETY` cases, and one missed `REGULATORY` case. Batch 17 contains no inverse biological false positive. A particularly important distinction is again visible between a concrete strategy change and a bare strategic decision: `drug development strategy adjustment`, `company adjusts strategy`, or a sponsor shift in focus causally explains the stop and is operational, whereas `Strategic decision` by itself remains action-only. Confidence remains poorly calibrated: content-free sponsor/company/business decisions can receive high-confidence `OPERATIONAL`, while explicit funding, supply, staffing, strategy, efficacy, safety, and regulatory causes remain `OTHER/UNKNOWN`.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 32

- `NCT01093066` (record 3202) — difficulties in inclusion and follow-up are concrete recruitment/follow-up feasibility causes
- `NCT01441115` (record 3205) — a duplicate Japanese trial was testing the same primary endpoint, making this study redundant
- `NCT03990077` (record 3218) — explicit drug-development strategy adjustment
- `NCT04070313` (record 3224) — current treatment practice made TS-1 monotherapy less clinically relevant than combination therapy; treatment-landscape/relevance cause rather than observed study efficacy failure
- `NCT03389438` (record 3229) — shortage of funds
- `NCT03519984` (record 3231) — study-drug supply issue
- `NCT02627677` (record 3234) — explicit operational feasibility; safety concerns are explicitly excluded
- `NCT03712930` (record 3245) — sponsor revisited the development approach for prostate cancer; concrete development-strategy change
- `NCT02934503` (record 3246) — standard of care changed to frontline immunotherapy, making the study no longer clinically relevant
- `NCT02137252` (record 3247) — insufficient patients; recruitment failure
- `NCT00618917` (record 3249) — MnSOD was no longer available during Phase II; supply cause
- `NCT03499353` (record 3255) — explicit change in clinical-development strategy, unrelated to safety and efficacy
- `NCT02078960` (record 3256) — inability to add sites and enroll an adequate number of subjects
- `NCT01934335` (record 3269) — drugs unavailable
- `NCT04379024` (record 3271) — study agent no longer available
- `NCT01246752` (record 3273) — recruitment rate was too low to achieve the target population in a realistic timeframe
- `NCT03422094` (record 3279) — manufacturer changed focus to cell therapy; portfolio/strategy reprioritization
- `NCT03265496` (record 3287) — recruited patient count was insufficient
- `NCT00633958` (record 3288) — a larger Phase II study opened for the same patient population; replacement/redundancy cause
- `NCT03599362` (record 3292) — PI departure from the institution
- `NCT02576977` (record 3313) — explicit business reasons
- `NCT04104334` (record 3315) — surgical practice and chemotherapy treatment changed; treatment/practice-landscape cause
- `NCT02298166` (record 3318) — manufacturer terminated its support agreement for the investigator-initiated trial
- `NCT01549886` (record 3323) — explicit business reasons
- `NCT01861717` (record 3325) — insufficient enrollment
- `NCT01058850` (record 3337) — resources were redirected to higher-enrolling studies
- `NCT02375984` (record 3344) — PI changed institutions
- `NCT03608618` (record 3365) — sponsor shift in focus; concrete strategic reprioritization
- `NCT02614703` (record 3373) — under-powered sample; data/sample-size feasibility problem
- `NCT03387332` (record 3374) — company strategy adjustment
- `NCT02105116` (record 3377) — no patients were eligible to receive the experimental protocol component; eligibility/recruitment feasibility
- `NCT03545165` (record 3378) — sponsor withdrawal; support withdrawal is a concrete operational cause

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 17

These records identify a decision-maker, business/strategic decision, request, or program action without supplying the underlying causal reason. A decision/action label alone does not establish an operational cause, even when safety or efficacy is explicitly excluded.

- `NCT04810208` (record 3204) — bare `Strategic decision`
- `NCT00560716` (record 3207) — Sponsor decision
- `NCT01627314` (record 3232) — Business decision
- `NCT03176264` (record 3304) — company decision only
- `NCT03189836` (record 3309) — Business decision
- `NCT02319369` (record 3311) — business decision by the Sponsor
- `NCT01288430` (record 3321) — Sponsor decision
- `NCT01662102` (record 3322) — Sponsor decision
- `NCT03403725` (record 3334) — MTD was achieved, then cohort expansion was omitted for a Company decision; the milestone is not a failure and the decision supplies no causal reason
- `NCT03051035` (record 3348) — strategic business decision only; safety and efficacy are explicitly excluded but the underlying cause is absent
- `NCT04111445` (record 3357) — business decision only
- `NCT01439347` (record 3360) — Sponsor decision
- `NCT02851004` (record 3366) — request of the investigational-drug provider; the request is an action without an underlying causal reason
- `NCT02687230` (record 3370) — Sponsor decision
- `NCT04099277` (record 3371) — strategic business decision by the company without the underlying strategic cause
- `NCT02177682` (record 3394) — Company decision
- `NCT03988647` (record 3397) — Business decision

## C. Missed `EFFICACY/FUTILITY` — 8

- `NCT02675439` (record 3203) — no substantial anti-tumor activity was observed
- `NCT02212574` (record 3261) — participant relapses caused the abrupt stop; direct failure of disease control/clinical response
- `NCT03685344` (record 3282) — no additional activity was evident for the combination versus monotherapy
- `NCT04052204` (record 3300) — experimental treatments were not expected to provide additional clinical benefit over current or future standard of care
- `NCT00354432` (record 3333) — DSMB stopped the study for lack of effect under the interim stopping rule
- `NCT03473457` (record 3355) — therapeutic effect was not as expected
- `NCT01663766` (record 3384) — no safety signals were present, but the drug did not appear to lessen the risk of GVHD
- `NCT01956812` (record 3392) — interim overall-survival analysis showed insufficient improvement versus placebo

## D. Missed `SAFETY` — 2

- `NCT03797261` (record 3223) — `Safety` is supplied directly as the causal stop reason in a terminated trial
- `NCT01110876` (record 3376) — explicit unanticipated toxicities

## E. Missed `REGULATORY` — 1

- `NCT03654729` (record 3211) — the FDA issued a clinical hold on the POLAR program; direct external regulatory action

## F. Inverse biological false positives — 0

No definite Batch 17 record currently assigned a biological failure label is contradicted strongly enough by the stop text to require an inverse biological false-positive reclassification.

## G. Ambiguous / mixed-cause / planned-success / non-failure cases — 26

- `NCT03050814` (record 3210) — terminated after an unplanned interim efficacy analysis, but no negative efficacy result or polarity is stated
- `NCT03287050` (record 3214) — changing therapeutic landscape plus lack of radiation/immunotherapy synergy in other malignancies; operational and external scientific/efficacy signals coexist
- `NCT03602495` (record 3217) — IDMC interim recommendation states that the trial reached its early-termination goal and CDE agreed to unblind and submit an NDA; successful/regulatory-development milestone rather than an adverse failure signal
- `NCT03135262` (record 3222) — sponsor stopped after Phase 1 and did not proceed to Phase 2, with no separate failure cause supplied
- `NCT02189174` (record 3226) — safety/tolerability concerns and limited clinical activity are both explicit; mixed `SAFETY` + `EFFICACY/FUTILITY`
- `NCT01324141` (record 3240) — slow/insufficient accrual plus failure to meet endpoints; mixed operational + efficacy cause
- `NCT03071094` (record 3243) — external pivotal trials are described as failures, but the actual failing scientific dimension is not stated
- `NCT01035658` (record 3274) — Phase I analyses led to no Phase II, but the adverse dimension and polarity are absent
- `NCT02792192` (record 3277) — the study met its goals of providing preliminary safety and efficacy information; successful milestone/non-failure
- `NCT04381988` (record 3280) — termination was based on results of other studies and use of a new vaccine; result direction/dimension and transition/operational contribution are unclear
- `NCT03752177` (record 3286) — risk-benefit ratio no longer favored continued evaluation; biologically negative but safety versus efficacy cannot be isolated
- `NCT00766779` (record 3299) — DMC recommendation without the underlying safety, efficacy, or other basis
- `NCT02213042` (record 3302) — primary analysis was completed and further minimal data collection was not expected to add meaningful knowledge; sufficient-data/completion non-failure
- `NCT02387216` (record 3308) — preliminary/interim results were confirmed in final analysis, but the result dimension and negative polarity are not stated
- `NCT00314353` (record 3320) — low enrollment plus new information regarding the benefit of the regimen; operational and underspecified scientific/benefit signals coexist
- `NCT01170650` (record 3326) — DSMB decision without its underlying basis
- `NCT00110136` (record 3327) — concern about an interaction between St. John's wort and tamoxifen; safety versus efficacy/pharmacologic consequence is not isolated
- `NCT02404506` (record 3329) — board decision after the primary endpoint was analyzed; milestone/decision without a negative result
- `NCT02833766` (record 3330) — trial was to terminate after the primary endpoint was reached; successful/planned milestone
- `NCT01077154` (record 3332) — Amgen decision following primary analysis, explicitly not safety-related, but the analysis result/polarity is absent
- `NCT03131206` (record 3335) — slow accrual plus lack of efficacy; mixed operational + efficacy cause
- `NCT03894007` (record 3341) — safety/effect data from another ongoing study are cited without adverse polarity or a uniquely identifiable failing dimension
- `NCT00508274` (record 3345) — primary analysis was completed; later data collection was not reportable because of local regulations in China; administrative completion plus regulatory-reporting constraint
- `NCT02808247` (record 3347) — a prespecified number of `failures` in the experimental arm was exceeded, but the stopping-criterion dimension is not specified
- `NCT02984683` (record 3362) — limited clinical benefit plus a higher-than-expected ophthalmological-event rate; mixed `EFFICACY/FUTILITY` + `SAFETY`
- `NCT01728207` (record 3383) — insufficient efficacy plus very slow accrual; mixed efficacy + operational cause

## Classifier issues reinforced or newly exposed by Batch 17

1. **Decision/action phrases remain structural high-confidence false positives.** `Sponsor decision`, `Company decision`, `Business decision`, `Strategic decision`, and `strategic business decision` still become `OPERATIONAL` without a causal layer.
2. **Concrete strategy changes must be separated from bare strategy decisions.** `Drug development strategy adjustment`, `company adjusts strategy`, `sponsor shift in focus`, and manufacturer/program refocusing are operational when the change itself explains the stop; the word `decision` alone is not.
3. **Funding, support, supply, staffing, recruitment, and resource coverage remains incomplete.** Shortage of funds, support withdrawal, drug/agent unavailability, PI departure, insufficient patients, site-accrual limits, and resource reallocation recur as missed operational causes.
4. **Treatment-landscape and clinical-practice changes need operational coverage.** New standard of care, changes in surgical/chemotherapy practice, and a therapy becoming clinically irrelevant can make continuation infeasible without representing an observed study-efficacy failure or regulator-ordered stop.
5. **Direct negative efficacy semantics still leak.** No anti-tumor activity, relapse-driven stop, no additional activity, no additional clinical benefit, lack of effect, therapeutic effect below expectation, failure to reduce GVHD risk, and insufficient OS improvement require broader efficacy/futility handling.
6. **Direct safety causes remain missable.** A direct stop reason of `Safety` and explicit `Unanticipated Toxicities` should map to `SAFETY`, while review/assessment wording still requires negative polarity.
7. **Explicit FDA clinical holds remain `REGULATORY`.** A direct FDA clinical hold is an external regulatory stop mechanism and should not remain unknown.
8. **Interim/DMC/DSMB/primary-analysis language still requires dimension and polarity gating.** An analysis, recommendation, or decision is not enough unless the adverse result and failing dimension are stated.
9. **Risk-benefit language still requires dimension gating.** An unfavorable risk-benefit conclusion is biologically adverse but does not necessarily distinguish `SAFETY` from `EFFICACY/FUTILITY`.
10. **Mixed causes remain irreducible under one forced label.** Batch 17 again contains safety+efficacy and efficacy+operational combinations that require review or multi-cause representation.
11. **Milestone and stage-transition handling remains essential.** Reaching an early-termination goal followed by NDA submission, completing Phase I, meeting preliminary-information goals, reaching/analyzing a primary endpoint, achieving MTD, and ending after sufficient data are not automatically failure causes.
12. **External-study evidence needs dimensional evidence.** A statement that another pivotal study `failed` is insufficient unless the safety, efficacy, or other adverse dimension is actually supplied.
13. **Eligibility and sample-power language needs explicit operational treatment.** No eligible patients and an under-powered sample are feasibility/data-adequacy problems unless the text supplies a separate biological failure.
14. **Confidence remains poorly calibrated.** Bare decisions can receive HIGH-confidence `OPERATIONAL`, while concrete strategy, funding, supply, efficacy, safety, and regulatory causes remain LOW-confidence `OTHER/UNKNOWN`.

---

## Cumulative status — records 1–3400

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 1864 | 54.82% |
| Definitely misclassified | 1239 | 36.44% |
| Ambiguous / multiple plausible causes / non-failure | 297 | 8.74% |
| Needs change or manual review | 1536 | 45.18% |

Of the 1239 definite errors across the first 3400 records:

- 714 (57.6%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 326 (26.3%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 130 (10.5%) are missed `EFFICACY/FUTILITY`;
- 31 (2.5%) are missed `SAFETY`;
- 31 (2.5%) are missed `REGULATORY`;
- 7 (0.6%) are inverse biological false positives.

Thus 1040 of 1239 definite errors (83.9%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

## Arithmetic check

- Batch 17: `114 + 60 + 26 = 200`.
- Batch 17 needs change/review: `60 + 26 = 86`.
- Batch 17 definite-error subgroups: `32 + 17 + 8 + 2 + 1 + 0 = 60`.
- Cumulative additions: `1750 + 114 = 1864`, `1179 + 60 = 1239`, `271 + 26 = 297`, and `1450 + 86 = 1536`.
- Cumulative total: `1864 + 1239 + 297 = 3400`.
- Cumulative needs change/review: `1239 + 297 = 1536`.
- Cumulative definite-error subgroups: `714 + 326 + 130 + 31 + 31 + 7 = 1239`.
