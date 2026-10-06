# Step 06 — Sol indexing control

**Status:** report-mode implementation complete  
**Decision source:** `docs/seo/approved-decisions.csv`  
**Decision version:** `luna-approval-v1`

## What is implemented

- `scripts/seo/generate-indexing-policy.mjs` validates Luna's approvals and creates the build-readable configuration.
- `web/lib/seoIndexingPolicy.ts` resolves the approved decision into planned and effective HTTP, robots, canonical, sitemap, redirect, editorial, and pilot-template states.
- Unknown URLs and `REVIEW_HOLD` preserve the complete current state.
- Existing 404/410 resource validity takes priority over an indexing approval.
- The web build fails when the generated approval configuration is stale or an active feature combination is inconsistent.
- Unit tests cover report-only behavior, unapproved URLs, protected controls, resource validity, feature validation, and pilot scoping.

## Feature switches

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `SEO_INDEXING_REPORT_MODE` | `true` | Calculate planned decisions without changing effective output |
| `SEO_INDEXING_PILOT_TEMPLATES` | `false` | Select an approved pilot template only for URLs with the pilot role |
| `SEO_INDEXING_REGISTRY_SITEMAP` | `false` | Allow registry decisions to affect sitemap inclusion |
| `SEO_INDEXING_INDEX_DIRECTIVES` | `false` | Allow approved `KEEP_INDEX`/`IMPROVE_INDEX` directives |
| `SEO_INDEXING_NOINDEX_LIST` | `false` | Allow approved utility noindex decisions |
| `SEO_INDEXING_CANONICAL_DUPLICATES` | `false` | Allow approved canonical-duplicate targets |
| `SEO_INDEXING_REDIRECT_LIST` | `false` | Allow approved merge redirects |
| `SEO_INDEXING_REMOVAL_LIST` | `false` | Allow approved removals |

Any directive, exclusion, canonical, redirect, or removal activation requires the registry-sitemap switch. Canonical-duplicate activation also requires the index-directive switch. Invalid values and inconsistent active combinations throw an error instead of falling back to a broad robots rule.

## Current release effect

None. The committed default is report mode and every mutating switch is off. This step does not yet connect the module to page metadata, routing, redirects, or sitemap output; that active integration remains gated until the relevant URL-level decisions and production release are approved.
