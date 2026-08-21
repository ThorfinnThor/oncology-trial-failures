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
