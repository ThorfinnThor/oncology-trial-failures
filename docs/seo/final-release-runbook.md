# Final trial-quality and static-pruning release runbook

**Owner:** Sol

**Decision sources:** `docs/seo/approved-decisions.csv` and `web/config/trial-noindex-decisions.json`

**Decision versions:** `luna-approval-v2` and `sol-trial-pruning-v4`

**Deployment status:** the original 791-page pruning set is live; the additional 525-page pruning set is pending deployment

## Scope

The next indexability release corrects one reviewed trial URL after recovering stronger source evidence:

- `NCT01965600` remains HTTP 200 and self-canonical.
- Its robots directive returns from `noindex,follow` to `index,follow`.
- It returns to the XML sitemap.
- Its page body and metadata publish the verified ClinicalTrials.gov detailed-description evidence.

The first trial-pruning batch supersedes the earlier `IMPROVE_INDEX` recommendation for 20 unresolved legacy-classification URLs. It also excludes 17 pages with no measured clicks, at most ten measured impressions, and only a short generic stop explanation. All 37 remain available at HTTP 200 with self-canonicals, but return `noindex,follow` and are absent from the XML sitemap.

The second trial-pruning batch excludes another 344 pages. These pages have a source stop explanation of at most 35 characters, no measured click, no top-10 position, fewer than 20 measured impressions or no appearance in the top-1,000 page export, and no curated use in an insight, brief, newsletter, or landing page. Forty-three otherwise matching pages remain protected because editorial content uses them as evidence.

The third batch excludes 53 additional pages whose 36-to-50-character stop explanations are repeated across multiple NCT records or are purely formulaic. These pages also have no measured click, no top-10 position, fewer than 20 measured impressions or no appearance in the top-1,000 export, and no curated editorial use. Specific clinical statements in the same length range remain indexable.

The fourth batch excludes 274 programme-cascade pages. Their stop explanations point to another trial, a programme decision, preclinical findings, or outside evidence rather than the indexed trial's own result. They also have no measured click, no top-10 position, fewer than 20 measured impressions or no appearance in the top-1,000 export, and no curated editorial use. The 114 programme-cascade pages with protected search or editorial signals remain indexable.

The additional pruning batch excludes 485 pages with no measured click in the reviewed Search Console page export, no more than 100 characters of source stop wording, no detected endpoint, interim-analysis, monitoring-board, exposure, or specific clinical-event detail, and no curated use in an insight, published brief, newsletter, landing page, or reference page. This implements the approved aggressive reduction of the remaining short, nonspecific trial pages, including low-volume exact-NCT impressions that produced no click. Two initially selected URLs remain indexable because earlier evidence review explicitly protected concrete own-trial data or recovered ClinicalTrials.gov detailed-description evidence.

The final manual borderline review examined the 63 highest-risk remaining pages and excludes 40 more. Twenty-three pages remain indexable because their source records contain concrete endpoint, interim-analysis, treatment-related safety, or named clinical-event evidence. The excluded pages add little independent search value because their wording is generic, repeated, mixed, or programme-level, and they have no measured click, posted endpoint result, or curated editorial use.

Five reviewed static pages are removed from search while remaining HTTP 200 and crawlable through `noindex,follow`:

- `/explore`, `/asset-check`, `/newsletter`, and `/contact` are input, filtering, conversion, or support utilities rather than durable search answers.
- `/sponsor-insights` is a weak standalone landing page that duplicates the richer sponsor hubs and overview.
- All five are excluded from the XML sitemap.

The trial indexability predicate also requires usable source-backed stop evidence, study identity, a source URL, condition, intervention, and a classification explanation. The current dataset has 2,435 pages that pass that evidence gate. The explicit pruning set removes 1,316 of them, leaving 1,119 indexable trial pages. The 83-page manual-review batch excludes generic, repeated, programme-level, externally attributed, or ambiguous explanations; the 485-page batch applies the stricter search and content-value threshold; and the final 40-page batch resolves the remaining highest-risk borderline set.

`/overview`, `/outliers`, and `/top-entities` also ship compact server-rendered evidence snapshots. Their initial HTML must contain the reviewed totals, baseline, and ranking sections before the existing interactive datasets hydrate in the browser.

Six recovery pages also ship distinct server-rendered editorial modules based on current dataset values: `/`, `/clinical-trial-futility`, `/failures/neurology`, `/failures/phase-2`, `/sponsor/pfizer`, and `/terminated-vs-withdrawn-vs-suspended-clinical-trials`. These pages remain indexable and retain their current canonicals.

This release does not activate template experiments, broad trial directives, canonical replacements, redirects, or removals.

## Preflight

Run from `web/` on the exact commit intended for production:

```sh
npm ci
npm run lint
npm run typecheck
npm run check:styles
npm run check:private
npm test
npm run audit:seo-trials
npm run check:seo-release:trial-quality
npm run build:cloudflare
npm run cloudflare:build
npx wrangler whoami
```

The release guard must report 36 legacy reviewed URLs, 1,316 explicit trial noindex IDs, one static thin-content noindex URL, four static utility noindex URLs, and one non-overridden improve-only URL. Automated tests must confirm the 17/20/344/53/274/83/485/40 batch split and the 2,435-to-1,119 trial reduction. GitHub's `web` and `text-readers` checks must be green. Wrangler authentication must be valid before the final deployment; if `wrangler whoami` reports an expired token, authenticate again at that point without changing the release scope. A Vercel deployment failure caused by a blocked Vercel account is not a Cloudflare application check and does not authorize ignoring any GitHub test failure.

## Exact production settings

Set these Cloudflare Worker variables for the fresh production deployment:

```text
SEO_INDEXING_REPORT_MODE=false
SEO_INDEXING_REGISTRY_SITEMAP=true
SEO_INDEXING_NOINDEX_LIST=false
```

`SEO_INDEXING_NOINDEX_LIST` remains false because the 1,316 NCT exclusions are enforced by the shared trial-eligibility predicate rather than the older URL registry switch. The same predicate controls both page robots output and sitemap membership. The five static page decisions remain explicit page-level directives and sitemap exclusions.

Keep all remaining mutation switches explicitly false or unset:

```text
SEO_INDEXING_PILOT_TEMPLATES=false
SEO_INDEXING_INDEX_DIRECTIVES=false
SEO_INDEXING_CANONICAL_DUPLICATES=false
SEO_INDEXING_REDIRECT_LIST=false
SEO_INDEXING_REMOVAL_LIST=false
```

Do not commit the active production values to `wrangler.jsonc`: the safe repository default is report-only. Configure the values in the Cloudflare production environment immediately before the final fresh deployment. The committed `keep_vars: true` setting is required so that later `wrangler deploy` runs preserve the reviewed production variables instead of silently replacing them with the report defaults.

## Deployment rule

Use a fresh build and deployment after the variables are set. Do not only change variables on the existing Worker. Trial pages are generated on demand and cached with a 24-hour ISR lifetime, so an existing cached HTML variant can retain the previous robots directive. After deployment, re-open the runtime-variable table and verify that all eight SEO variables still exist; their disappearance means the deployment did not preserve the release profile.

No Google URL-removal or manual indexing request is part of this release. The corrected HTML and sitemap are the deliberate recovery signals.

## Post-deployment checks

Check the production response, not a local or preview URL:

1. `NCT01965600` returns HTTP 200, has `index,follow`, keeps its self-canonical, contains the verified Detailed Description evidence, and is present in `/sitemap.xml`.
2. `NCT02354014` returns HTTP 200 with `noindex,follow`, keeps its self-canonical, and is absent from `/sitemap.xml`.
3. `/failures/ophthalmology` and the five frozen control hubs preserve their prior robots and canonical output.
4. `/explore`, `/asset-check`, `/newsletter`, `/contact`, and `/sponsor-insights` return HTTP 200 with `noindex,follow` and self-canonicals.
5. Those five static URLs are absent from `/sitemap.xml`; protected and data-rich static pages remain present.
6. `/overview`, `/outliers`, and `/top-entities` expose their evidence snapshot in raw response HTML without requiring JavaScript execution.
7. The six recovery pages expose their reviewed editorial module and current figures in raw response HTML without requiring JavaScript execution.
8. `/sitemap.xml` returns valid XML and no unrelated URL-count collapse is visible.
9. Cloudflare Worker logs show no new exceptions while the tested pages are requested.

Record the deployment commit, deployment time, response evidence, sitemap URL count, and any cache purge or revalidation performed.

## Production release record

- Deployment time: `2026-10-09T11:25:38Z`
- Cloudflare Worker version: `1c83a660-c361-42b6-ad78-680d8c60723f`
- Previous production version: `bbb21c94-b594-4989-b3c0-3f040fd0fd5c`
- Fresh build result: 367 static pages generated; OpenNext bundle and 17 changed assets uploaded successfully.
- Runtime verification: all eight SEO variables match the release profile and all three existing secrets remain attached.
- Production verification: all tested pages returned HTTP 200; six recovery modules and all three server snapshots were present in raw HTML.
- Sitemap verification: 2,688 URLs. Relative to the 2,692-URL review baseline, five static URLs left the sitemap and recovered trial `NCT01965600` returned, producing the expected net reduction of four URLs.
- Runtime verification: an error-filtered Worker tail stayed empty while the 18 production acceptance URLs were requested again.
- Cache handling: a fresh Worker version and asset set were deployed; no manual cache purge was required.

## Rollback

If any unrelated URL changes, the sitemap loses an unexpected group, or production emits errors:

1. roll the Cloudflare Worker back to the previously verified production version `bbb21c94-b594-4989-b3c0-3f040fd0fd5c`;
2. confirm all eight existing runtime variables were retained;
3. keep every unrelated mutation switch false;
4. purge or revalidate the affected ISR response if the prior HTML remains cached;
5. confirm `NCT01965600` returned to HTTP 200 plus `noindex,follow` and is absent from the sitemap, while the controls remain unchanged;
6. confirm the five static pages returned to their previous `index,follow` output and sitemap membership where applicable.

Google's index state can lag behind the rollback. The production HTML and sitemap are the immediate rollback acceptance criteria.
