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
