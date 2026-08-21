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
