# Registry record history as a source: probe of 24 Nov 2026

**ClinicalTrials.gov's own version history is not available to us.** The record history the site shows
("History of Changes") is served by an internal API that answers automated requests with 403 Forbidden,
and the history tab is a browser application; the public API v2 has no history endpoint (it returns only
`versionHolder`, the date of the current version). We do not work around the refusal.

**Our own weekly snapshots are.** `data/all_stopped_trials.csv` is committed every week (16 snapshots,
5 Oct – 23 Nov 2026). Comparing them for the trials labelled CAUSE_NOT_STATED or UNRESOLVED today:

- 9 such trials had a different stop text in an earlier snapshot; in 5 the earlier text stated a cause.
- One is a **sponsor softening the text**: NCT05617313 read "Study did not meet the criteria for
  continuation after interim analysis" and now reads "Study terminated after completion of planned
  interim analysis of 21 patients". The earlier wording is the sponsor's own statement of a result.
- Four show **gaps in our rules on today's text**, not a history effect:
  - NCT05003908, NCT05147766: "Inadequate treatment response observed in preliminary data did not
    justify enrolling further study participants" (efficacy; read as unresolved);
  - NCT03756389: "Re-formulation of study product needed." (supply/formulation; the earlier "Re-formulation
    of study product" was read, the added "needed" breaks it);
  - NCT07555561: "Due to the promulgation of State Council Order No. 818, this category of clinical trials is
    prohibited from conduct." (regulatory).

**Assessment:** seven weeks of history is too short to matter as a source (5 of ~5,400 trials), but it
grows by itself. Two uses are worth building: (1) keep every earlier stop text per trial and flag
rewrites that remove a stated cause (a sponsor softening "did not meet" into "after interim analysis"
is itself a signal, and the earlier text can back a reviewed decision); (2) the four gaps above go
through CLAUDE.md rule 4 (golden case first, then the rule).
