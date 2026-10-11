# Step 12 — Sol recovery-content implementation

**Model:** Sol
**Completed:** 2026-10-09
**Deployment status:** not deployed

## Outcome

The six priority loss pages now publish distinct, server-rendered editorial experiences based on the Luna briefs and the current `2026-10-05` dataset. The implementation does not introduce a common article template:

- `/` adds a three-route question map for biological evidence, operational/strategic causes, and review-gated records.
- `/clinical-trial-futility` adds a three-question evidence-reading flow and replaces stale futility figures with the live 1,617-record efficacy/futility slice and current source-linked examples.
- `/failures/neurology` adds a case comparison spanning efficacy, safety, and operational stops, grounded in the 1,054-record neurology slice.
- `/failures/phase-2` adds four stop pathways—patient access, scientific signal, program economics, and safety/oversight—grounded in the 10,861-record Phase II hub.
- `/sponsor/pfizer` adds three portfolio lenses for a business decision, efficacy/futility evidence, and safety evidence. The module explicitly prevents sponsor-performance conclusions from raw stop counts.
- `/terminated-vs-withdrawn-vs-suspended-clinical-trials` adds a two-step status-versus-reason reading rule, exact one-decimal biological shares, and one contrasting source-linked example per status.

All counts are generated from the current build data. The selected NCT examples are resolved from current dataset rows and retain source-backed trial links.

## Verification

- TypeScript: passed.
- Automated tests: 111 passed, zero failed.
- New recovery-content tests cover Neurology, Phase II, Pfizer, status shares/examples, and futility hydration.
- styled-jsx structural check: passed.
- SEO trial-quality release guard: passed with 36 reviewed decisions.
- ESLint: zero errors; existing repository warnings remain.
- Cloudflare production build: passed; all 367 static pages generated successfully.
- Raw built HTML contains each new editorial module before hydration.

Approximate visible raw-HTML word counts after the build are 1,087 for `/`, 722 for `/clinical-trial-futility`, 2,928 for `/failures/neurology`, 2,902 for `/failures/phase-2`, 3,709 for `/sponsor/pfizer`, and 1,060 for the status comparison. The long hub totals include their existing source-linked trial lists; the new editorial modules are intentionally compact.

## React review

The implementation keeps data aggregation in `getStaticProps`, serializes only the reviewed aggregate/editorial data needed by each page, and introduces no client-side fetching, effects, or mutable shared state. New sections use semantic headings, lists, articles, labels, and source links, and remain responsive at the existing breakpoints.

## Guardrail

These six pages remain `index,follow` with their existing canonicals. No sitemap, redirect, removal, or Cloudflare production setting changed in this step.
