# Blind labeling guidelines — ClinicalTrials.gov stop reasons

You label the registry "why stopped" text of a stopped clinical trial. Use ONLY the text given. Do not guess
from drug names, sponsor type or outside knowledge. Be conservative: never assert a cause the text does not state.

## Output per record

- `outcome` — exactly one of:
  - `BIOLOGICAL_FAILURE` — text states a biological/medical cause: lack of efficacy, futility, negative/unfavourable
    results, endpoint not met, safety/toxicity/adverse events, or unfavourable benefit-risk.
  - `NON_BIOLOGICAL` — text states a non-biological cause (recruitment, funding, business, regulatory, supply, staffing,
    protocol feasibility, external disruption e.g. COVID, withdrawal of support, other administrative cause).
  - `MIXED_CAUSES` — text states two or more causes from DIFFERENT domains (e.g. futility AND slow accrual; safety AND funding).
    Two non-biological causes of different kinds (e.g. funding + recruitment) are also MIXED_CAUSES.
  - `NON_FAILURE_TRANSITION` — stop is not a failure: planned milestone reached / study completed its objective /
    enrollment goal met, replaced by another study/protocol, or study never started / no participants enrolled with no cause given.
  - `CAUSE_NOT_STATED` — an actor or action is named but no cause: "Sponsor decision", "PI decision", "company decided to
    discontinue the program/asset" without saying why.
  - `UNKNOWN` — text is ambiguous, a fragment, status-only ("terminated", "study closed"), pending/temporary
    ("on hold pending review"), a directionless interim analysis ("stopped after interim analysis", "stopping rules met"
    without saying the result), negated causes only ("not due to safety"), or otherwise not clearly causal.
- `primary_reason` — one of:
  `EFFICACY_FUTILITY`, `SAFETY`, `BIOLOGICAL_UNSPECIFIED` (biological but efficacy vs safety not separable, e.g. "unfavourable benefit-risk"),
  `REGULATORY`, `RECRUITMENT` (slow/poor/insufficient accrual or enrollment, eligible patients hard to find),
  `FUNDING`, `SUPPLY_MANUFACTURING`, `STAFFING_RESOURCES` (PI left, staff/site resources),
  `BUSINESS_STRATEGY` (explicit business/strategic/portfolio/commercial/corporate reason), `PROTOCOL_FEASIBILITY` (design/protocol problems, feasibility),
  `SUPPORT_WITHDRAWAL` (collaborator/partner withdrew support), `EXTERNAL_DISRUPTION` (COVID-19, war, disaster),
  `OPERATIONAL_OTHER` (other explicit administrative/logistic cause),
  `PLANNED_MILESTONE`, `REPLACEMENT_TRANSITION`, `NOT_INITIATED`,
  `DECISION_WITHOUT_STATED_CAUSE`, `PROGRAM_ACTION_WITHOUT_STATED_CAUSE`,
  `MULTIPLE` (use with MIXED_CAUSES), `UNSPECIFIED` (use with UNKNOWN).
- `secondary_reasons` — list of other explicitly stated reasons (may be empty).
- `confidence` — `HIGH`, `MEDIUM` or `LOW` (your own certainty).
- `note` — max 20 words, only when non-obvious.

## Consistency rules

- outcome/primary pairs: BIOLOGICAL_FAILURE → EFFICACY_FUTILITY | SAFETY | BIOLOGICAL_UNSPECIFIED;
  NON_BIOLOGICAL → an operational/regulatory/business reason; MIXED_CAUSES → MULTIPLE;
  NON_FAILURE_TRANSITION → PLANNED_MILESTONE | REPLACEMENT_TRANSITION | NOT_INITIATED;
  CAUSE_NOT_STATED → DECISION_WITHOUT_STATED_CAUSE | PROGRAM_ACTION_WITHOUT_STATED_CAUSE; UNKNOWN → UNSPECIFIED.
- Negated causes do not count ("not related to safety" is not SAFETY).
- "Sponsor decision" alone = CAUSE_NOT_STATED. "Business decision" / "strategic reasons" = NON_BIOLOGICAL/BUSINESS_STRATEGY.
- "Low accrual" = NON_BIOLOGICAL/RECRUITMENT. "Lack of funding" = NON_BIOLOGICAL/FUNDING.
- "Terminated after interim analysis showed futility" = BIOLOGICAL_FAILURE/EFFICACY_FUTILITY; "after interim analysis" alone = UNKNOWN.
- A regulator/clinical hold without a stated medical cause = NON_BIOLOGICAL/REGULATORY; with a stated toxicity = MIXED_CAUSES is NOT used —
  use BIOLOGICAL_FAILURE/SAFETY with REGULATORY as secondary.
- Only a stated result counts; a hypothesis or plan does not.

## Output format

Write JSON Lines, one object per input record, same order, all records, no omissions:
{"sample_id": "...", "outcome": "...", "primary_reason": "...", "secondary_reasons": [], "confidence": "HIGH", "note": ""}
