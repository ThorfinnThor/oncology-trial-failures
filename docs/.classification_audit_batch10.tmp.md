
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
