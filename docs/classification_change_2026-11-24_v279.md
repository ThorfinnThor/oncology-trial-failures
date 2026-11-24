# Classification change 24 Nov 2026: classifier 2.7.9 (three gaps from the registry-history probe)

Found in `docs/registry_history_probe_2026-11-24.md`: today's stop text states a cause the rules did
not read. Golden cases first (`tests/golden_classification_v2.jsonl`), then three rules at the end of
RULES, so no earlier primary reason moves.

| Rule | Text | Reading |
|---|---|---|
| `v279.inadequate_response_no_further_enrolment` | "Inadequate treatment response observed in preliminary data did not justify enrolling further study participants" | EFFICACY_FUTILITY |
| `v279.reformulation_needed` | "Re-formulation of study product needed." (the same text without "needed" was already SUPPLY) | SUPPLY_MANUFACTURING |
| `v279.government_prohibition` | "Due to the promulgation of State Council Order No. 818, this category of clinical trials is prohibited from conduct." | REGULATORY |

Negation is respected: "Insufficient efficacy was not the reason ..." and "re-formulation ... was not
needed" stay unresolved.

**Transitions over the snapshot (24,132 trials): 8.**

| Trial | Before | After |
|---|---|---|
| NCT05003908, NCT05016804, NCT05016817, NCT05018845, NCT05147766, NCT05147779 | UNRESOLVED / UNRESOLVED_INSUFFICIENT_OR_LOW_QUALITY_DATA | BIOLOGICAL_FAILURE / EFFICACY_FUTILITY |
| NCT03756389 | UNRESOLVED / UNRESOLVED_OTHER_AMBIGUOUS_TEXT | NON_BIOLOGICAL / SUPPLY_MANUFACTURING |
| NCT07555561 | UNRESOLVED / UNRESOLVED_EXPLICIT_BUT_UNMAPPED_CAUSE | NON_BIOLOGICAL / REGULATORY |

Together with 2.7.8 (NCT04222972 → BUSINESS_STRATEGY) the next weekly run moves 9 labels; biological
labels +6. The four description-fallback trials a local dry run also lists (NCT01832857, NCT02235740,
NCT00254891, NCT00254904) need registry descriptions the weekly run fetches and are not changed by
these rules.

Checks: 1,458 golden semantic cases, golden stop-reason tests, `check_text_readers.py` over 21,965 stop
reasons.
