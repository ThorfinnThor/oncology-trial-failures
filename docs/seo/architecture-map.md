# SEO architecture map

**Snapshot:** 2026-10-09
**Purpose:** Current inventory for the index-quality plan. Runtime rules remain owned by the source files named below.

## Page families and source of truth

| Page family | Route | Rendering/data source | Current index signal | Sitemap source | Audit status |
| --- | --- | --- | --- | --- | --- |
| Home and editorial reference pages | `/`, `/methods`, `/insights/*`, `/reports/*`, `/top-*` | Page modules and `web/lib/seoReferenceData.ts` | Explicit `index,follow` in each page component | `web/pages/sitemap.xml.tsx` | Inventory captured; quality review open |
| Disease/phase/reason hubs | `/failures`, `/failures/[slug]` | `buildFailureHubs()` and `SeoHubPage` | Explicit `index,follow` | `buildFailureHubs(rows)` | Ophthalmology pilot completed; family review open |
| Sponsor hubs | `/sponsors`, `/sponsor/[slug]` | `buildSponsorHubs()` and `SponsorEvidencePage` | Explicit `index,follow` | `buildSponsorHubs(rows)` | Family review open |
| Trial detail pages | `/trial/[trialId]` | Sharded trial data and `isIndexableTrial()` | `index,follow` only when biological-signal and source-backed evidence gates pass; otherwise `noindex,follow` | `indexableTrialRows(rows)` | Quality gate implemented and audited |
| Explore/search/compare utilities | `/explore`, `/compare`, `/asset-check`, `/validation` | Interactive page components | `/explore`, `/asset-check`, and `/compare` are `noindex,follow`; `/validation` stays indexable | Noindex utilities excluded | Reviewed |
| Core data dashboards | `/overview`, `/outliers`, `/top-entities` | Compact build-time evidence snapshot plus hydrated interactive data | `index,follow` with substantive initial HTML | Included | Server-rendered snapshots implemented |
| Newsletter and generic sponsor insight | `/newsletter`, `/sponsor-insights` | Interactive/static page components | `noindex,follow` | Excluded | Reviewed as utility/thin content |
| Contact utility | `/contact` | Static support and correction flow | `noindex,follow` | Excluded | Reviewed as utility |
| Packages and briefs | `/packages/*`, `/briefs/*` | Package/brief indexes and static paths | Explicit page-level signals | Explicit brief/package entries | Inventory captured; quality review open |
| Account and transaction flows | `/access`, `/newsletter/confirm`, `/newsletter/stop`, APIs | Runtime routes | `noindex` or non-document response | Not SEO destinations | Excluded from SEO population |

## Existing technical controls

- Trial indexability is centralized in `web/lib/seoHubs.ts:isIndexableTrial()` and reused by trial rendering and the sitemap. It requires both the existing biological signal and a source-backed stop reason, study identity, condition, intervention, source URL, and final explanation.
- Reviewed static pruning is centralized in `web/lib/seoStaticPolicy.ts` and reused by page robots directives and sitemap filtering.
- Disease hubs and sponsor hubs are generated from the same data snapshot as their page content.
- Canonicals are emitted by the page/template components; there is no single registry that currently owns all decisions.
- Redirects are defined in `web/next.config.ts`; aliases and redirects are not yet reconciled against a URL inventory.
- `web/pages/robots.txt.tsx` exposes the sitemap and does not replace page-level `noindex` decisions.

## Remaining audit work

1. Google-selected canonicals and live index status still require post-deployment Search Console validation.
2. Parameter variants should continue to be monitored after the static utility pruning ships.
3. Additional noindex decisions must remain URL-specific and evidence-backed; no broad NCT pattern is approved.
