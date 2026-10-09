# Step 10 — server-rendered data snapshots

**Model:** Sol
**Completed:** 2026-10-09
**Deployment status:** not deployed

## Problem

`/overview`, `/outliers`, and `/top-entities` were useful after client-side hydration, but their initial production HTML contained only 21–53 visible words and a loading state. A crawler or text reader that did not execute the data-loading JavaScript could not see the evidence that justified indexing these pages.

## Implementation

Each page now uses `getStaticProps` with one-day revalidation to calculate a compact evidence snapshot at build time:

- `/overview` publishes dataset totals, the biological-signal share, registry window, leading stop-reason groups, phase coverage, and leading disease areas.
- `/outliers` publishes the default Phase II sponsor safety baseline and the leading shrinkage-adjusted comparisons.
- `/top-entities` publishes the default efficacy/futility sponsor and disease-area rankings with denominators.

The full interactive datasets remain browser-loaded. Only compact aggregate rows are serialized into the page, avoiding a multi-megabyte HTML payload and preserving the existing controls.

## Verification

- Next.js production build completed successfully and marks all three routes as statically generated with one-day revalidation.
- Generated initial HTML contains 171 visible words on `/overview`, 166 on `/outliers`, and 220 on `/top-entities`, compared with 53, 41, and 21 before the change.
- Dedicated SSR regression tests verify the key headings, totals, baselines, and rankings before hydration.
- The complete test suite passes: 106 tests, zero failures.

## Guardrail

These pages remain `index,follow` because the server-rendered snapshot is a genuine, data-backed search destination. A loading-only regression now fails the SSR snapshot tests before deployment.
