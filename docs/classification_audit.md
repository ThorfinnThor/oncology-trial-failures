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
