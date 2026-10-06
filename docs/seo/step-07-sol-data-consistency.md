# Step 07 — Sol data consistency and low-information audit

**Status:** implementation and local verification complete

**Release effect:** none; no merge, deployment, redirect, sitemap removal, or `noindex` activation

**Decision mode:** report-only, with URL-level Luna approval required before index changes

## Why this step was necessary

The site resolved trial classifications independently in filtering, hub statistics, trial-page copy, metadata, and indexability. An authoritative final `UNRESOLVED` value could therefore be replaced in some consumers by an older V2 or legacy biological label. The data publisher also did not refuse empty snapshots, so a bad import could replace valid public assets with empty files.

This step creates one classification resolver, protects publication and shard generation, separates freshness timestamps, preserves matched disease areas for audit, and inventories pages whose source data is too thin for an automatic indexing decision.

## Implemented safeguards

- `web/lib/classificationResolution.ts` is the shared source for final outcome, detailed reason, review state, broad reason bucket, and biological indexability.
- Final classifications are authoritative, including `UNRESOLVED`; older V2 and legacy values can no longer silently override them.
- Trial pages, SEO metadata, hub statistics, and filtering use the same resolver.
- SEO eligibility remains on the previous compatibility rule until URL-level Luna approval; this prevents a code cleanup from silently deindexing pages.
- The public high-level reason buckets remain compatible with the existing site. Detailed final reasons remain available for explanatory copy and statistics.
- Shard generation aborts before deleting valid output when the source array is empty, an NCT ID is missing, or an NCT ID is duplicated.
- Public-asset publication rejects empty/duplicate datasets and a biological subset that is not contained in the canonical dataset.
- New metadata separates import time, source verification time, latest registry update, content-change time, and a SHA-256 source snapshot ID. These fields are emitted on the next successful data publication; older metadata remains loadable.
- `disease_areas_matched` now survives compact-index generation. Disease-area hubs still use the single primary `disease_area` denominator so their cohort definition does not change silently.
- Sponsor hubs still use exact `lead_sponsor` labels. Alias consolidation remains a separate reviewed task.

## Low-information candidates

The report-only audit found **2,164** records without a registry stop reason:

| Final outcome | Records |
| --- | ---: |
| Unresolved | 2,152 |
| Non-biological | 8 |
| Biological failure | 1 |
| Cause not stated | 1 |
| Mixed causes | 1 |
| Non-failure transition | 1 |

Only **NCT01965600** is both low-information and currently indexable/in the sitemap. Its final safety classification comes from `DESCRIPTION_FALLBACK`, while the registry `why_stopped` field is empty. It remains `REVIEW_HOLD` and should be reviewed by Luna for either source-backed enrichment or a URL-level `NOINDEX` approval.

The other 2,163 candidates are not currently indexable under the shared biological-failure rule. They still need a final exclusion verification, but there is no reason to issue a broad new deindexing directive for them.

Separately, the audit found **20 compatibility migrations**: the old SEO rule treats them as biological because it falls back to V2, while their final reviewed outcome is `UNRESOLVED`. Their current eligibility is deliberately preserved in this step. They require their own Luna-reviewed URL decisions before the compatibility rule can be retired.

Artifacts:

- `docs/seo/data-consistency-report.json`
- `docs/seo/low-information-candidates.csv`
- `docs/seo/indexability-migration-candidates.csv`
- `scripts/seo/audit-seo-data.mjs`

## Taxonomy findings

- 6,393 records match more than one disease area; all primary areas are present in their matched-area lists.
- One sponsor slug collision exists: `Alberto Dominguez-Rodriguez` and `Alberto Domínguez Rodríguez`. No automatic alias merge was made.
- The candidate rule is evidence-based. It does not use word count alone and does not assume that every template-based page is low value.

## Verification

- 88 web tests passed.
- TypeScript typecheck passed.
- Classification V2 snapshot validation passed for 23,868 canonical records and 2,414 biological signals.
- Next.js Cloudflare-targeted build and the full OpenNext worker bundle passed, including SEO approval and pilot-output checks.
- The audit is deterministic against the committed canonical snapshot.

## Required next decision

Luna should review NCT01965600 and the candidate rule before any active deindexing list is generated. Approved exclusions must be written URL by URL to the decision registry and released together with sitemap removal and the matching robots directive. No candidate is automatically excluded by this step.
