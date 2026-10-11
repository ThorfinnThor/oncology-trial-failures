# Step 14 — Sol: two new data-backed insight articles

**Model:** Sol
**Status:** Implemented and build-verified; not deployed
**Dataset:** `2026-10-05` ClinicalTrials.gov API v2 snapshot, 23,868 stopped-trial records

## Articles

### Registry timing

`/insights/registry-update-date-is-not-trial-stop-date` explains why a last-update date is a registry freshness signal, not a reconstructed stop date. The article uses the completion-to-update interval while keeping missing and pre-completion records separate:

- 20,220 records have a non-negative comparable interval.
- The median interval is 1.4 years.
- 4,314 records were updated at least five years after completion.
- 2,212 records were updated in 2026; 192 have a completion date before 2021.

### Phase counting

`/insights/clinical-trial-phase-totals-do-not-add-up` explains the difference between unique encoded groups, phase memberships, and exact-phase cohorts:

- 22,133 of 23,868 unique records carry a named phase and produce 25,140 named phase memberships.
- 19,126 records carry exactly one named phase.
- 3,007 records carry multiple phase labels.
- 1,734 records are marked not applicable and one has no usable phase value.
- Phase II has 10,861 memberships and Phase III has 4,017 under the membership rule.

The numbers are calculated at build time from compact lifecycle fields. Completion dates, primary-completion dates, and start dates are now retained in the compact index so future builds can reproduce the analysis without shipping the bulk dataset to the Worker.

## Verification

- `npm run typecheck` passed through the production build.
- `npm run build:cloudflare` passed and generated 369 static pages.
- Both article HTML files contain their dynamic facts and tables before hydration.
- Targeted insight tests passed: 5/5.
- `npm run lint` passed with the repository's existing warnings and zero errors.
- Style and private-data checks passed.

No production deployment is included in this step.
