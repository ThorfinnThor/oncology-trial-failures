# Publications as a source for trials with no stated cause: probe of 23 Nov 2026

`scripts/sources/pub_stop_evidence.py` looks for a trial's own paper and a sentence in it saying why
the trial stopped, for trials labelled CAUSE_NOT_STATED or UNRESOLVED (5,642 on release 2026-11-20:
3,579 terminated, 1,851 withdrawn, 212 suspended).

**The trial's own paper:** a reference ClinicalTrials.gov lists with type RESULT (submitted by the
sponsor) or DERIVED (PubMed records this NCT ID as the paper's registration), or a Europe PMC paper
whose abstract names the NCT ID and is not a review or meta-analysis. **The sentence:** it says the
trial, its accrual or enrolment was stopped, closed or terminated. A patient leaving the study does
not count. The rules' reading of the sentence is attached as a suggestion but does not filter.

**Rights:** abstracts and full texts belong to publishers or authors (`docs/provenance_and_rights.md`).
They are read for the review only. This file paraphrases, and a decision would carry the PMID and our
label, never the paper's words.

## Result

Two random samples of 100 no-cause trials each (seeds 20261123 and 7); failed requests retried.

| | Sample 1 | Sample 2 | Together |
| --- | ---: | ---: | ---: |
| Trials with a linked paper | 17 | 9 | 26 (13%) |
| with a sentence about the trial stopping | 7 | 4 | 11 |
| **with a clear cause (Claude's reading)** | **6** | **2** | **8 (4%, 95% CI ~2–8%)** |
| arguable: stopped because of *other* trials' results | 1 | 2 | 3 |
| no cause in the sentence | 0 | 1 | 1 |

All 8 clear causes are biological. In our words:
- NCT01870726: enrolment halted after a planned futility analysis, limited activity of the drug.
- NCT01856257: halted early because of graft rejection in the treatment groups.
- NCT02434549: stopped at the interim analysis for futility.
- NCT02138825: terminated at the data monitoring committee's request because of more serious adverse
  events in the treatment arm.
- NCT00265382: early termination after the planned interim analysis, futility.
- NCT03604445: well tolerated, but a narrow therapeutic range and minimal efficacy.
- NCT01523171: terminated after suspected Wernicke's encephalopathy in other trials of the same drug.
- NCT01204333: halted after the first interim analysis, futility.

Arguable: three trials stopped because *other* trials reported inferior results for the same
approach (NCT00720512, NCT00321100) or in preparation for a larger trial (NCT00585221, which the
registry attributes to the DSMC and IRB). These are not accepted without a guideline decision.

**What it would add:** at about 4% of 5,642, roughly 230 trials (110–440) with a cause stated by
the trial's own investigators, nearly all biological, against 2,462 biological labels today. The
paper is linked mostly through the registry (DERIVED/RESULT). Unlike the SEC filings it covers
academic sponsors (NIAID, university groups) and European companies the SEC does not reach
(Boehringer, Bayer). Withdrawn trials never enrolled and almost never have a paper, so the yield
among terminated trials is higher.

**Cost:** Europe PMC answered slowly on 23 Nov (4–30 s per request, intermittent 503). The 5,642 trials
take an estimated 3–5 hours, best as a time-limited step in the weekly run with a ledger, as for the
SEC search.
