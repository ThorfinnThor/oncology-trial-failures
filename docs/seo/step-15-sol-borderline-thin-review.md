# Step 15 — Sol borderline thin-page review

**Review date:** 2026-10-13  
**Decision version:** `sol-trial-pruning-v4`

## Scope

The review covered the 63 highest-risk trial pages remaining after the earlier explicit pruning batches. Every candidate had no measured click in the reviewed Search Console page export, no posted endpoint-result record, and no curated use in an insight, published brief, newsletter, landing page, or reference page.

## Decision

Forty pages are assigned to the `manual-borderline-thin-review` noindex batch. They remain available at HTTP 200 with `noindex,follow`, keep their self-canonical URL, and are excluded from the XML sitemap. Their incremental search value is limited by generic, repeated, mixed, or programme-level stop wording.

Twenty-three pages remain indexable because the source text contains concrete endpoint, interim-analysis, treatment-related safety, or named clinical-event evidence:

- `NCT00023244`
- `NCT00315614`
- `NCT00581997`
- `NCT00924287`
- `NCT00953706`
- `NCT01055067`
- `NCT01072643`
- `NCT01199302`
- `NCT01436175`
- `NCT01601184`
- `NCT01911377`
- `NCT02352753`
- `NCT02396225`
- `NCT02573935`
- `NCT02605824`
- `NCT02916056`
- `NCT03199976`
- `NCT03245619`
- `NCT03370302`
- `NCT04060888`
- `NCT04858451`
- `NCT05510245`
- `NCT05975905`

## Result

The explicit trial noindex registry now contains 1,316 unique NCT identifiers. Against the current 2,435 trial pages that pass the base evidence gate, 1,119 trial pages remain indexable.
