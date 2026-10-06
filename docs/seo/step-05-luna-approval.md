# Step 05 — Luna approval record

**Approval version:** `luna-approval-v1`  
**Reviewed:** 2026-10-06  
**Scope:** existing Ophthalmology recovery pilot and its fixed comparison group

## Approved scope

- `/failures/ophthalmology` is approved as `KEEP_INDEX` for the existing recovery pilot.
- The five fixed control hubs remain `REVIEW_HOLD`, which preserves their last valid behavior and prevents the pilot template change from reaching them.
- The home page, two watch hubs, and the high-impression NCT03940690 reference remain protected under `REVIEW_HOLD`.
- No sponsor page and no additional trial page is added to the first pilot.

## Exclusion decision

No URL is approved for `NOINDEX_UTILITY`, `CANONICAL_DUPLICATE`, `MERGE_REDIRECT`, or `REMOVE` in this approval version. The inventory does not yet contain a manually confirmed utility or duplicate case with all required evidence, and backlink and product-usage data remain unknown.

## Release boundary

This approval authorizes only the already scoped Ophthalmology content and internal-link pilot. It does not authorize a sitewide registry integration, sitemap filtering, redirect, canonical, robots, or removal change. Any future exclusion candidate needs a URL-level reason, reviewer, replacement URL where applicable, and an explicit approval version.

## Acceptance result

Every URL in the approved pilot, control, watch, and protected-reference scope has exactly one valid decision. Missing evidence resolves to `REVIEW_HOLD`; it is never interpreted as zero value.
