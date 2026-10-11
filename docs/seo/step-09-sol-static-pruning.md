# Step 09 — reviewed weak-page pruning

**Model:** Sol
**Reviewed:** 2026-10-09
**Deployment status:** not deployed

## Decision

Five unprotected static pages are approved for `noindex,follow`:

| URL | Decision | Reason |
| --- | --- | --- |
| `/explore` | `NOINDEX_UTILITY` | Mutable filtering interface; richer evidence hubs are the intended search destinations. |
| `/asset-check` | `NOINDEX_UTILITY` | Input-driven checker; useful results only exist after interaction. |
| `/newsletter` | `NOINDEX_UTILITY` | Subscription conversion flow rather than a durable search answer. |
| `/contact` | `NOINDEX_UTILITY` | Support and correction contact flow rather than an independent evidence destination. |
| `/sponsor-insights` | `NOINDEX_THIN_CONTENT` | Weak default landing output that duplicates richer sponsor destinations. |

All five remain available to users, retain self-canonicals, and keep links followable. They are removed from the XML sitemap. No redirect, removal, or `nofollow` directive is introduced.

## Protected pages

The home page, evidence hubs, sponsor detail pages, insights, briefs, validation, outliers, top entities, pricing, package pages, and the reviewed high-impression NCT reference remain indexable. The static audit found these pages either data-rich, source-backed, commercially intentional, or explicitly protected.

## Full indexable-scope audit

The production sitemap contained 2,692 URLs at review time: 2,434 trial pages, 150 sponsor pages, 26 failure hubs, 23 insight articles, 21 briefs, one package detail, and 37 other static pages. Every non-trial sitemap URL was fetched and compared by page family. The apparently short initial HTML for `/overview`, `/outliers`, and `/top-entities` is hydrated into a data-rich destination; these pages are improvement candidates for server rendering, not thin-content exclusions. Sponsor pages and failure hubs expose cohort denominators, outcome composition, source-linked records, and interpretation limits. Insights, briefs, and editorial landing pages have distinct questions and substantial source-linked analysis.

Transaction routes, confirmation routes, `/compare`, and the 404 response were already non-indexable. Redirect aliases remain redirects and are not separate indexable pages. The five explicit static decisions above are therefore the complete reviewed noindex set for valid 200 pages in this release; future pages must pass the same family-specific rubric rather than a word-count-only test.

## Trial-page guard

The existing biological-outcome predicate is now combined with a search-evidence gate. An NCT page must have:

- usable registry stop wording or verified detailed-description evidence;
- a study title and source URL;
- condition and intervention context;
- a classification explanation.

The current committed dataset has 2,434 biologically eligible trial pages, and all 2,434 pass this gate. Approximately 21,400 other trial pages were already excluded by the existing classification rule. The new gate prevents a future incomplete import from turning an empty NCT template into an indexable page without broadly removing source-backed records today.
