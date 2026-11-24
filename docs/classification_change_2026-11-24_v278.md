# Classification change 24 Nov 2026: classifier 2.7.8 (two gaps found in the CTIS review)

Both were found on 23 Nov while reviewing CTIS records: the registry text stated a cause the rules
did not read. Golden cases added first (`tests/golden_classification_v2.jsonl`, CLAUDE.md rule 4),
then the rules fixed until they pass.

1. **"Commercial decisions" behind a programme action is a business cause.** A guard drops a business
   reading when the text also says a programme was discontinued, unless the text names the business
   reason (portfolio, strategy, ...). "Commercial decision(s)/reason(s)" was missing from that list.
   - NCT04222972: "Early termination of the study resulted from organizational and commercial decisions
     that led to the discontinuation of pralsetinib's global marketing and development ..."
     CAUSE_NOT_STATED / PROGRAM_ACTION_WITHOUT_STATED_CAUSE → **NON_BIOLOGICAL / BUSINESS_STRATEGY**.
2. **A denied benefit-risk mention is not a second domain.** A guard holds recruitment back for review
   when the text also mentions benefit-risk, results or endpoints. It now ignores mentions the text
   itself denies ("benefit-risk profile of IP unchanged", "not based on any safety concerns").
   - NCT06716853: "Persistent challenges have been encountered in patient recruitment ... not based on
     any safety concerns. Benefit-risk profile of IP unchanged." now reads RECRUITMENT. The trial's label
     does not change: it already carries RECRUITMENT from its reviewed CTIS decision.

**Transitions over the whole snapshot (24,132 trials):** 1 (NCT04222972, above). A local dry run also
lists four description-fallback trials (NCT01832857, NCT02235740, NCT00254891, NCT00254904); they need
the registry descriptions the weekly run fetches and are not changed by these rules.

Checks: 1,455 golden semantic cases, golden stop-reason tests, `check_text_readers.py` over all 21,965
stop reasons, simulated weekly write and validator.
