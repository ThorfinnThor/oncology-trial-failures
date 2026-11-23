# EU registers as a source for trials with no stated cause: probe of 23 Nov 2026

Linkage: the EU number a trial lists as a secondary ID on ClinicalTrials.gov. Of the 3,791 terminated
or suspended trials labelled CAUSE_NOT_STATED / UNRESOLVED, **693 list a EudraCT number** (625 of them
industry) and **80 a CTIS number** (trials under the EU Clinical Trials Regulation, since 2023).
Network: www.clinicaltrialsregister.eu and euclinicaltrials.eu added to the environment.

## EudraCT (EU Clinical Trials Register, older trials): not worth a pipeline

Results pages carry "Was the trial ended prematurely? Yes", but **no reason field**; a reason, if
any, is in free text (limitations, disposition notes), mostly written by the same sponsor as the
ClinicalTrials.gov record. Random sample of 80: 35 have a results page, and **2–3 add a cause** the
registry text lacks (a "strategic decision", a recruitment halt over liver toxicity, too few
subjects). About 3%, i.e. ~20 trials of 693. Not pursued.

## CTIS (EU Clinical Trials Information System): structured, worth building

The public API (`euclinicaltrials.eu/ctis-public-api/retrieve/<CT number>`) returns per member
state an `earlyTerminationReason` (a coded category), temporary halts with coded reasons, the flag
`isBenefitRiskBalanceChange` and a sponsor justification. All 80 retrieved; 64 carry an
early-termination reason:

| Category (per member state) | Count |
| --- | ---: |
| Sponsor Decision | 249 |
| Safety Related (Clinical or Pre-Clinical Results) | 16 |
| Reprioritisation of Trial | 10 |
| Feasibility (recruitment issues, etc) | 6 |
| Study Related / Medicinal Product Related | 1 / 1 |

New causes against our "no cause" labels (Claude's reading, not yet decisions):
- **Safety** as the early-termination category: NCT05900050, NCT06528093, NCT05159388, NCT06987968,
  NCT06509906; a safety-coded halt with the benefit–risk flag before the end: NCT06488716 (a related
  grade 5 event met the stopping criteria), NCT06142383, NCT06607484, NCT06882746.
- **Reprioritisation** (business): NCT06679582, NCT06055075.
- **Feasibility** (recruitment): NCT06882746, and single countries of NCT06032546, NCT05856526.

So roughly 10 of 80 (12%) gain a cause, most of them safety: the highest yield of any source so far,
on a small but growing set (every new EU trial is in CTIS since 2025).

**Caveats for the rules:** the category is per member state and can differ between them (Belgium
"Sponsor Decision", France and Germany "Safety Related"); "Sponsor Decision" is the default and says
nothing; the benefit–risk flag on a halt is noisy (set on a halt "to reduce the burden of the trial").
Decisions are therefore reviewed per trial, as for SEC and publications.

**Rights:** the categories are facts recorded by the regulator's system; the sponsor's justification
text is not reused. **Also useful as validation:** CTIS categories for trials that do state a cause
are an independent check of our labels.
