# Final trial-quality release runbook

**Owner:** Sol  
**Decision source:** `docs/seo/approved-decisions.csv`  
**Decision version:** `luna-approval-v2`  
**Deployment status:** not deployed

## Scope

The next indexability release corrects exactly one reviewed trial URL after recovering stronger source evidence:

- `NCT01965600` remains HTTP 200 and self-canonical.
- Its robots directive returns from `noindex,follow` to `index,follow`.
- It returns to the XML sitemap.
- Its page body and metadata publish the verified ClinicalTrials.gov detailed-description evidence.

The other 20 `IMPROVE_INDEX` classification-migration URLs remain indexable. This release does not activate template changes, broad index directives, canonical replacements, redirects, removals, or any noindex list.

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

The release guard must report 31 reviewed URLs, zero thin-content noindex URLs, and 21 improve-only URLs. The trial-quality audit must report zero additional noindex targets and zero review holds. GitHub's `web` and `text-readers` checks must be green. Wrangler authentication must be valid before the final deployment; if `wrangler whoami` reports an expired token, authenticate again at that point without changing the release scope. A Vercel deployment failure caused by a blocked Vercel account is not a Cloudflare application check and does not authorize ignoring any GitHub test failure.

## Exact production settings

Set these Cloudflare Worker variables for the fresh production deployment:

```text
SEO_INDEXING_REPORT_MODE=false
SEO_INDEXING_REGISTRY_SITEMAP=true
SEO_INDEXING_NOINDEX_LIST=false
```

Keep all remaining mutation switches explicitly false or unset:

```text
SEO_INDEXING_PILOT_TEMPLATES=false
SEO_INDEXING_INDEX_DIRECTIVES=false
SEO_INDEXING_CANONICAL_DUPLICATES=false
SEO_INDEXING_REDIRECT_LIST=false
SEO_INDEXING_REMOVAL_LIST=false
```

Do not commit the active production values to `wrangler.jsonc`: the safe repository default is report-only. Configure the values in the Cloudflare production environment immediately before the final fresh deployment. The committed `keep_vars: true` setting is required so that `wrangler deploy` preserves those reviewed dashboard variables instead of silently replacing them with the report defaults.

## Deployment rule

Use a fresh build and deployment after the variables are set. Do not only change variables on the existing Worker. Trial pages are generated on demand and cached with a 24-hour ISR lifetime, so an existing cached HTML variant can retain the previous robots directive. After deployment, re-open the runtime-variable table and verify that all eight SEO variables still exist; their disappearance means the deployment did not preserve the release profile.

No Google URL-removal or manual indexing request is part of this release. The corrected HTML and sitemap are the deliberate recovery signals.

## Post-deployment checks

Check the production response, not a local or preview URL:

1. `NCT01965600` returns HTTP 200, has `index,follow`, keeps its self-canonical, contains the verified Detailed Description evidence, and is present in `/sitemap.xml`.
2. Control trial `NCT02354014` returns HTTP 200, has `index,follow`, keeps its self-canonical, and remains in `/sitemap.xml`.
3. `/failures/ophthalmology` and the five frozen control hubs preserve their prior robots and canonical output.
4. `/sitemap.xml` returns valid XML and no unrelated URL-count collapse is visible.
5. Cloudflare Worker logs show no new exceptions while the tested pages are requested.

Record the deployment commit, deployment time, response evidence, sitemap URL count, and any cache purge or revalidation performed.

## Rollback

If any unrelated URL changes, the sitemap loses an unexpected group, or production emits errors:

1. roll the Cloudflare Worker back to the previously verified production version `47d3875b`;
2. confirm all eight existing runtime variables were retained;
3. keep every unrelated mutation switch false;
4. purge or revalidate the affected ISR response if the prior HTML remains cached;
5. confirm `NCT01965600` returned to HTTP 200 plus `noindex,follow` and is absent from the sitemap, while the controls remain unchanged.

Google's index state can lag behind the rollback. The production HTML and sitemap are the immediate rollback acceptance criteria.
