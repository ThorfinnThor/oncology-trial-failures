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

_Status: audit in progress._
