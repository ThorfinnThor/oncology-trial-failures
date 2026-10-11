# Step 13 — Sol production release

## Outcome

The reviewed search-recovery release was deployed to the production Cloudflare Worker on 2026-10-09. The active version is `1c83a660-c361-42b6-ad78-680d8c60723f`; the immediately preceding production version is `bbb21c94-b594-4989-b3c0-3f040fd0fd5c`.

The release used a fresh OpenNext build. Next.js generated all 367 static pages, the Worker bundle uploaded successfully, and Cloudflare retained the `LEADS` KV binding plus the three existing secrets.

## Active production profile

The deployed Worker exposes this reviewed SEO profile:

```text
SEO_INDEXING_REPORT_MODE=false
SEO_INDEXING_PILOT_TEMPLATES=false
SEO_INDEXING_REGISTRY_SITEMAP=true
SEO_INDEXING_INDEX_DIRECTIVES=false
SEO_INDEXING_NOINDEX_LIST=false
SEO_INDEXING_CANONICAL_DUPLICATES=false
SEO_INDEXING_REDIRECT_LIST=false
SEO_INDEXING_REMOVAL_LIST=false
```

`SEO_INDEXING_NOINDEX_LIST` is deliberately false. Trial indexability is enforced by the source-evidence gate in application code; the current 2,434 trial pages all pass that gate. The five approved static exclusions use explicit page-level `noindex,follow` directives and sitemap filtering.

## Production evidence

- `/`, `/clinical-trial-futility`, `/failures/neurology`, `/failures/phase-2`, `/sponsor/pfizer`, and `/terminated-vs-withdrawn-vs-suspended-clinical-trials` return HTTP 200, `index,follow`, self-canonicals, and their distinct recovery modules in raw HTML.
- `/overview`, `/outliers`, and `/top-entities` return HTTP 200 and expose their evidence snapshots before client hydration.
- `/explore`, `/asset-check`, `/newsletter`, `/contact`, and `/sponsor-insights` return HTTP 200 with `noindex,follow`, retain self-canonicals, and are absent from the sitemap.
- `NCT01965600` and control `NCT02354014` return HTTP 200 with `index,follow`, source-specific canonicals, and sitemap membership.
- `/sitemap.xml` returns HTTP 200 with 2,688 URLs. The reviewed baseline was 2,692: five static URLs were removed and recovered trial `NCT01965600` was restored, so the expected net change is minus four.
- `/robots.txt` returns HTTP 200 and advertises `https://clinicaltrialfailures.com/sitemap.xml`.
- An error-filtered Worker tail stayed empty while the 18 production acceptance URLs were requested again.

No broad canonical replacement, redirect, removal, or template experiment was activated.
