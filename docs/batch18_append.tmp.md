
---

# Classification Audit — Batch 18

This section is the completed manual semantic audit for records 3401–3600 and uses the same methodology and taxonomy as Batches 1–17.

Batch boundary: record 3401 is `NCT02985021`; record 3600 is `NCT00066677`.

The same causal-layer rule is applied strictly: a decision, request, hold, closure, development discontinuation, or stage transition does not by itself identify the reason a study stopped. Concrete recruitment, funding, staffing, supply, logistics, strategy-change, treatment-landscape, feasibility, protocol/design, safety, efficacy/futility, or external regulatory causes are classified by the actual stated cause. Interim/DSMB/DMC/risk-benefit language still requires dimension and negative-polarity evidence, and mixed causes are not collapsed to a single label.

## Summary

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 123 | 61.5% |
| Definitely misclassified | 62 | 31.0% |
| Ambiguous / multiple plausible causes / planned-success / non-failure | 15 | 7.5% |
| Needs change or manual review | 77 | 38.5% |

## Main finding

Batch 18 again concentrates error at the `OPERATIONAL` versus `OTHER/UNKNOWN` boundary. Of the 62 definite errors, 35 are `OTHER/UNKNOWN` records with a concrete operational cause and 12 are labeled `OPERATIONAL` even though the text supplies only a decision/action or an underspecified enrollment/program action. Together these 47 records account for 75.8% of all definite Batch 18 errors.

The remaining 15 definite errors are 11 missed `EFFICACY/FUTILITY` cases, two missed `SAFETY` cases, two missed `REGULATORY` cases, and zero inverse biological false positives.

## A. `OTHER/UNKNOWN` that should be `OPERATIONAL` — 35

- `NCT02985021` (record 3401) — competing studies created a concrete recruitment/feasibility constraint
- `NCT02521870` (record 3403) — strategic restructuring and planned conclusion of oncology-development programs; concrete program/portfolio restructuring
- `NCT02765165` (record 3415) — business reasons, explicitly unrelated to safety
- `NCT03967093` (record 3417) — resources were redirected toward pediatric development of BXQ-350
- `NCT02579863` (record 3420) — terminated for business reasons
- `NCT04427774` (record 3422) — policy change caused the stop; a concrete policy/operational change rather than a bare decision
- `NCT03178201` (record 3423) — PI left the institution
- `NCT02867618` (record 3424) — PI left the institution
- `NCT03200600` (record 3429) — frequent postoperative protocol violations made the study operationally nonviable
- `NCT03394937` (record 3452) — study medication expired; direct drug-availability/supply constraint
- `NCT01433991` (record 3470) — change in corporate strategy
- `NCT02768558` (record 3474) — another treatment was found efficacious, changing the treatment landscape
- `NCT02574637` (record 3481) — terminated for business reasons, explicitly not for safety or efficacy
- `NCT02693717` (record 3486) — changing efficacy of available treatments altered the metastatic-urothelial-cancer treatment landscape
- `NCT03875859` (record 3487) — study medication expired; the source explicitly identifies logistics
- `NCT02097732` (record 3501) — standard-of-care change made continuation obsolete
- `NCT02621333` (record 3502) — competing trials and a limited enrollee pool created a recruitment-feasibility constraint
- `NCT02805894` (record 3507) — prostate-cancer treatment landscape changed substantially
- `NCT03608878` (record 3508) — all first five screened patients failed the required Globo-H eligibility criterion; screen-failure/eligibility feasibility
- `NCT02817113` (record 3516) — strategy change
- `NCT03029585` (record 3520) — business reasons
- `NCT04162301` (record 3535) — strategic and business reasons
- `NCT01438112` (record 3536) — study-design change
- `NCT03094611` (record 3544) — competing trials
- `NCT02036502` (record 3547) — business reasons
- `NCT02805660` (record 3553) — sponsor de-prioritized mocetinostat development; concrete portfolio reprioritization
- `NCT03050450` (record 3554) — inability to accrue within the available timeline; direct feasibility constraint
- `NCT03125876` (record 3567) — company strategy adjustment
- `NCT02750514` (record 3573) — changed standard of care made further accrual impossible
- `NCT03730077` (record 3575) — PI left the institution
- `NCT01476657` (record 3578) — program scope was reduced to focus resources on registration-enabling studies; resource reprioritization
- `NCT03666728` (record 3579) — changes in R&D strategy
- `NCT00461773` (record 3584) — lack of accrual
- `NCT02550743` (record 3589) — lack of accrual
- `NCT03515824` (record 3596) — business reasons

## B. `OPERATIONAL` that should be `OTHER/UNKNOWN` — 12

These records identify a decision, actor, request, or enrollment/program action but do not provide the underlying causal reason.

- `NCT03393000` (record 3418) — business decision on behalf of the sponsor; decision only
- `NCT01784861` (record 3434) — pharmaceutical-company decision only
- `NCT03982004` (record 3451) — sponsor decision only
- `NCT01147536` (record 3472) — sponsor business decision only
- `NCT03983395` (record 3484) — business decision not to proceed with the asset; safety is excluded but the actual cause is absent
- `NCT01644253` (record 3488) — business decision only
- `NCT01253668` (record 3543) — manufacturer decided not to pursue additional research in the population; the action is stated but not its underlying cause
- `NCT03283631` (record 3555) — enrollment was halted, but no causal reason is supplied
- `NCT03849365` (record 3569) — recruitment was stopped before target sample size was reached; this states the enrollment action/outcome, not why recruitment was stopped
- `NCT03722186` (record 3572) — business decision only
- `NCT04025307` (record 3588) — sponsor decision only
- `NCT03134638` (record 3595) — business decision only

## C. Missed `EFFICACY/FUTILITY` — 11

- `NCT02510911` (record 3402) — lack of effect at interim analysis
- `NCT01126216` (record 3511) — interim DSMB review found no significant treatment-arm difference and did not expect one with reasonable additional recruitment
- `NCT03051672` (record 3524) — two-stage design stopped at Stage 1 with no evidence of promise under the prespecified decision rule
- `NCT01125293` (record 3527) — protocol-defined early termination was tied to fewer than 5% of participants achieving VGPR-or-better; explicit response/futility criterion
- `NCT02117466` (record 3537) — primary endpoint could no longer be reached
- `NCT03419403` (record 3538) — depatuxizumab-mafodotin development in glioblastoma stopped for lack of survival benefit
- `NCT02336048` (record 3549) — tocilizumab premedication was unlikely to reduce infusion-reaction risk; direct lack of intended treatment effect
- `NCT03340883` (record 3558) — no objective responses after Phase 1 dose escalation
- `NCT02822482` (record 3564) — treatment futility stated directly
- `NCT03876925` (record 3568) — treatment effect was not as good as expected
- `NCT03449030` (record 3571) — insufficient clinical benefit at the selected RP2D

## D. Missed `SAFETY` — 2

- `NCT03451773` (record 3456) — study closed after a treatment-related death
- `NCT02055690` (record 3494) — `Safety` is supplied directly as the stop reason

## E. Missed `REGULATORY` — 2

- `NCT03567616` (record 3439) — company-sponsored multiple-myeloma studies were placed on a partial clinical hold; the hold is the concrete external regulatory stop mechanism
- `NCT04094077` (record 3469) — the study stopped after an adverse CPP/ethics-review result on a substantial protocol modification; direct external ethics-committee action

## F. Inverse biological false positives — 0

No definite Batch 18 record currently assigned a biological failure label is contradicted strongly enough by the stop text to require an inverse biological false-positive reclassification.

## G. Ambiguous / mixed-cause / planned-success / non-failure cases — 15

- `NCT02168725` (record 3446) — FDA hold plus manufacturing problems; explicit regulatory stop and operational manufacturing constraint coexist
- `NCT02323230` (record 3447) — terse `new study` wording suggests replacement/transition to a planned study rather than a demonstrated failure, but the causal detail is too sparse for a single failure label
- `NCT02128230` (record 3449) — low enrollment plus futility; mixed operational + efficacy cause
- `NCT03605212` (record 3473) — EMA waiver was granted and the study stopped accordingly; favorable regulatory transition/waiver rather than a stated adverse failure cause
- `NCT02743078` (record 3475) — treatment became commercially available; commercial-availability milestone/non-failure
- `NCT00542191` (record 3480) — enrollment completed; successful milestone rather than failure
- `NCT00582205` (record 3491) — study completed per investigator; completion/non-failure
- `NCT03478904` (record 3506) — study drug became commercially available in tablet form; commercial-availability transition/non-failure
- `NCT01999335` (record 3523) — safety profile plus PK/formulation characteristics required optimization; safety and operational/formulation causes are not cleanly separable
- `NCT00438204` (record 3541) — all data collection completed; completion/non-failure
- `NCT03937791` (record 3542) — identifiable data/specimen analysis was complete and the sole participant was taken off study; administrative/analytical completion rather than a supplied failure cause
- `NCT03510455` (record 3546) — greater-than-expected ocular adverse events plus low likelihood of permanent remission; mixed `SAFETY` + `EFFICACY/FUTILITY`
- `NCT01981187` (record 3565) — slow enrollment plus lack of response; mixed operational + efficacy cause
- `NCT02722369` (record 3577) — low recruitment, lack of efficacy, and increased adverse events all explicitly contributed; mixed operational + efficacy + safety
- `NCT02291614` (record 3581) — immunogenicity plus a business decision; the biological consequence of immunogenicity is not dimensionally resolvable as safety versus efficacy, while the decision itself supplies no causal layer

## Classifier issues reinforced or newly exposed by Batch 18

1. **Decision/action phrases remain high-confidence false positives.** Sponsor/company/business decisions and bare enrollment-halting actions still become `OPERATIONAL` without an actual cause.
2. **Business reasons and concrete strategy changes remain under-recognized.** Business reasons, strategy changes/adjustments, R&D changes, restructuring, de-prioritization, and resource refocusing are operational when they causally explain the stop.
3. **Competing-study, staffing, supply, eligibility, and feasibility language still leaks to `OTHER/UNKNOWN`.** Competing trials, PI departure, medication expiry, screen failures, and inability to accrue within time are direct operational constraints.
4. **Treatment-landscape and standard-of-care changes require operational coverage.** A new effective or commercially established treatment can make continuation obsolete without being a regulator-ordered stop or observed efficacy failure of the study drug.
5. **Direct negative efficacy language is still missed.** `lack of effect`, no treatment-arm difference, no evidence of promise, endpoint no longer reachable, lack of survival benefit, no objective response, futility, effect below expectation, and insufficient clinical benefit all recur outside `EFFICACY/FUTILITY`.
6. **Direct safety language remains missable.** `Safety` and a treatment-related death are sufficiently explicit causal safety signals.
7. **Clinical-hold and ethics-committee actions remain important regulatory cases.** Partial clinical holds and adverse external ethics-review decisions should not remain unknown.
8. **Interim/DSMB/stopping-rule language still requires dimension and polarity gating.** Batch 18 contains both a true efficacy stop (`no significant difference`) and an underspecified interim-analysis stop where no dimension is given.
9. **Mixed causes still need multi-cause representation.** Regulatory+manufacturing, efficacy+recruitment, safety+formulation, safety+efficacy, and three-way operational+efficacy+safety combinations cannot be represented faithfully by forced single-label precedence.
10. **Commercial availability, completion, waiver, and replacement-study transitions are not failure causes.** Milestone/non-failure handling remains necessary.
11. **Risk-benefit/review wording still requires adverse polarity and dimensional evidence.** An assessment or review alone does not justify a biological label.
12. **Confidence remains poorly calibrated.** Bare decisions receive HIGH-confidence `OPERATIONAL`, while explicit business reasons, strategy changes, direct efficacy language, safety language, and regulatory actions remain LOW-confidence `OTHER/UNKNOWN`.

---

## Cumulative status — records 1–3600

| Audit result | Count | Share |
|---|---:|---:|
| Correct | 1987 | 55.19% |
| Definitely misclassified | 1301 | 36.14% |
| Ambiguous / multiple plausible causes / non-failure | 312 | 8.67% |
| Needs change or manual review | 1613 | 44.81% |

Of the 1301 definite errors across the first 3600 records:

- 749 (57.6%) are `OTHER/UNKNOWN → OPERATIONAL`;
- 338 (26.0%) are `OPERATIONAL → OTHER/UNKNOWN`;
- 141 (10.8%) are missed `EFFICACY/FUTILITY`;
- 33 (2.5%) are missed `SAFETY`;
- 33 (2.5%) are missed `REGULATORY`;
- 7 (0.5%) are inverse biological false positives.

Thus 1087 of 1301 definite errors (83.6%) remain variants of the same core problem: separating a real operational cause from a mere decision-maker/action statement.

## Arithmetic check

- Batch 18: `123 + 62 + 15 = 200`.
- Batch 18 needs change/review: `62 + 15 = 77`.
- Batch 18 definite-error subgroups: `35 + 12 + 11 + 2 + 2 + 0 = 62`.
- Cumulative additions: `1864 + 123 = 1987`, `1239 + 62 = 1301`, `297 + 15 = 312`, and `1536 + 77 = 1613`.
- Cumulative total: `1987 + 1301 + 312 = 3600`.
- Cumulative needs change/review: `1301 + 312 = 1613`.
- Cumulative definite-error subgroups: `749 + 338 + 141 + 33 + 33 + 7 = 1301`.
