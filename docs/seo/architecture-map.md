# SEO architecture map

**Snapshot:** 2026-10-06  
**Purpose:** Read-only inventory for the index-quality plan. This file does not change routing, robots, canonicals, or the sitemap.

## Page families and source of truth

| Page family | Route | Rendering/data source | Current index signal | Sitemap source | Audit status |
| --- | --- | --- | --- | --- | --- |
| Home and editorial reference pages | `/`, `/methods`, `/insights/*`, `/reports/*`, `/top-*` | Page modules and `web/lib/seoReferenceData.ts` | Explicit `index,follow` in each page component | `web/pages/sitemap.xml.tsx` | Inventory captured; quality review open |
| Disease/phase/reason hubs | `/failures`, `/failures/[slug]` | `buildFailureHubs()` and `SeoHubPage` | Explicit `index,follow` | `buildFailureHubs(rows)` | Ophthalmology pilot completed; family review open |
| Sponsor hubs | `/sponsors`, `/sponsor/[slug]` | `buildSponsorHubs()` and `SponsorEvidencePage` | Explicit `index,follow` | `buildSponsorHubs(rows)` | Family review open |
| Trial detail pages | `/trial/[trialId]` | Sharded trial data and `isIndexableTrial()` | `index,follow` for scientific failures; otherwise `noindex,follow` | `indexableTrialRows(rows)` | Existing rule audited; registry not built |
| Explore/search/compare utilities | `/explore`, `/compare`, `/asset-check`, `/validation` | Interactive page components | Mostly indexable today; `/compare` is `noindex,follow` | Selected explicitly or absent | Parameter and utility audit open |
| Packages and briefs | `/packages/*`, `/briefs/*` | Package/brief indexes and static paths | Explicit page-level signals | Explicit brief/package entries | Inventory captured; quality review open |
| Account and transaction flows | `/access`, `/newsletter/confirm`, `/newsletter/stop`, APIs | Runtime routes | `noindex` or non-document response | Not SEO destinations | Excluded from SEO population |

## Existing technical controls

- Trial indexability is centralized in `web/lib/seoHubs.ts:isIndexableTrial()` and reused by trial rendering and the sitemap.
- Disease hubs and sponsor hubs are generated from the same data snapshot as their page content.
- Canonicals are emitted by the page/template components; there is no single registry that currently owns all decisions.
- Redirects are defined in `web/next.config.ts`; aliases and redirects are not yet reconciled against a URL inventory.
- `web/pages/robots.txt.tsx` exposes the sitemap and does not replace page-level `noindex` decisions.

## Known gaps for the next audit

1. No complete URL registry records the intended decision, protection state, reviewer, or decision version.
2. Utility/filter/parameter variants have not had a systematic crawl and duplicate review.
3. Sitemap membership is generated from code paths rather than checked against an approved manifest.
4. The existing trial rule is a technical predicate, not yet a versioned SEO decision contract.

