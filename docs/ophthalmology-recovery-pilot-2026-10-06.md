# Ophthalmology search recovery pilot

**Baseline date:** 2026-10-06  
**Code state:** merged in PR #83; production deployment intentionally deferred  
**Machine-readable definition:** `web/scripts/seo-pilot.json`

## Experiment boundary

The only changed search landing page in this pilot is:

- `/failures/ophthalmology`

The fixed control group contains five unchanged disease-area hubs with the same page architecture:

- `/failures/cardiovascular`
- `/failures/dermatology`
- `/failures/neurology`
- `/failures/gastroenterology-and-hepatology`
- `/failures/infectious-disease`

These pages must not receive editorial, metadata, canonical, robots, or structured-data changes during the first evaluation window.

Hematology and Respiratory are watched separately, not used as controls, because they are possible later recovery candidates:

- `/failures/hematology-non-onc`
- `/failures/respiratory`

## Search Console baseline

For 2026-09-27 through 2026-10-03 compared with 2026-09-20 through 2026-09-26:

- sitewide impressions: 1,419 versus 3,406 (`-58.3%`)
- sitewide clicks: 31 versus 33 (`-6.1%`)
- sitewide CTR: 2.2% versus 1.0%
- sitewide average position: 7.5 versus 6.0
- Ophthalmology impressions: 22 versus 357 (`-335`)
- Ophthalmology URL inspection: crawled, currently not indexed
- Ophthalmology live test: available to Google and eligible for indexing

Desktop accounted for 1,933 of the 1,987 lost impressions. The United States accounted for 1,131. These segments must be reported separately in later comparisons. Operator-heavy NCT query variants must also remain a separate segment rather than being treated as normal demand.

The page-level Search Console baseline is:

| Page | Clicks current / comparison | Impressions current / comparison | CTR current / comparison | Position current / comparison |
| --- | ---: | ---: | ---: | ---: |
| Ophthalmology pilot | 0 / 0 | 22 / 357 | 0% / 0% | 7.0 / 5.3 |
| Cardiovascular control | 1 / 0 | 7 / 14 | 14.3% / 0% | 5.6 / 4.7 |
| Dermatology control | 0 / 0 | 19 / 40 | 0% / 0% | 6.8 / 4.6 |
| Neurology control | 1 / 0 | 56 / 59 | 1.8% / 0% | 4.4 / 4.2 |
| Gastroenterology & Hepatology control | 0 / 0 | 6 / 18 | 0% / 0% | 3.8 / 4.3 |
| Infectious Disease control | 0 / 0 | 3 / 12 | 0% / 0% | 6.0 / 6.1 |

The original candidates Musculoskeletal, Renal & Urology, and Endocrine & Metabolic did not appear in the page report for either comparison window. They were replaced rather than treating absent or privacy-suppressed values as zero. The exact values above are also stored in `web/scripts/seo-pilot.json`, and the build guard verifies that its baseline page set stays aligned with the experiment boundary.

## Automated release contract

Every standard and Cloudflare build now checks the generated initial HTML, not only TypeScript source. The release fails if:

- the pilot or a control page stops being `index,follow`
- a canonical is not self-referential
- the Ophthalmology analysis or any of its three evidence categories disappears
- the evidence examples stop linking to three distinct trial pages
- Dataset JSON-LD does not contain exactly 20 canonical trial entries for Ophthalmology
- a control page receives the Ophthalmology-specific analysis or changes from its 60-item structured baseline
- `/failures` stops linking to the pilot
- the pilot HTML exceeds 200,000 bytes
- the pilot description becomes truncated

Run the guard directly after a build with:

```bash
cd web
npm run check:seo-pilot
```

## Release and measurement gates

Before deployment:

1. Run the complete repository checks and `npm run cloudflare:build`.
2. Confirm no other disease-area hub changed.

At the final deployment:

1. Deploy the exact tested `main` commit.
2. Verify the public response, canonical, robots, structured data, internal link, and sitemap membership.
3. Submit one indexing request for `/failures/ophthalmology`; do not submit a batch.

After deployment:

- technical check immediately
- URL inspection after 7 complete days
- first performance decision after 28 complete days
- second decision after 56 complete days

The result is `EXPAND`, `HOLD`, or `ROLLBACK`. Hematology, Respiratory, trial pages, and sponsor pages are not expanded until this decision.
