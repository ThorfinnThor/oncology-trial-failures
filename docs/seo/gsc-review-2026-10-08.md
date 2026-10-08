# GSC review — 8 October 2026

**Model:** Luna  
**Property:** `sc-domain:clinicaltrialfailures.com`  
**Source:** Google Search Console, Web search, authenticated account `shuu9599@gmail.com`  
**Production effect:** none; this is measurement only

## Current 90-day view

The Search Console performance report covered 6 July–5 October 2026 and showed:

| Metric | Value |
| --- | ---: |
| Clicks | 245 |
| Impressions | 50,100 |
| CTR | 0.5% |
| Average position | 7.1 |

The downloaded report contained 1,000 page rows and 636 query rows. The dashboard cards remain authoritative for totals; sums of the truncated dimension exports must not be treated as sitewide totals.

## Pilot versus fixed controls

The direct URL comparison used 28 September–4 October 2026 versus 21–27 September 2026. GSC data is delayed, so this is a recent directional signal, not a final release verdict.

| URL | Impressions current | Impressions previous | Change | Clicks current / previous | Position current / previous |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/failures/ophthalmology` — pilot | 12 | 189 | −93.7% | 0 / 0 | 9.5 / 5.1 |
| `/failures/cardiovascular` | 5 | 16 | −68.8% | 1 / 0 | 5.0 / 5.0 |
| `/failures/dermatology` | 12 | 43 | −72.1% | 0 / 0 | 7.3 / 4.7 |
| `/failures/neurology` | 45 | 70 | −35.7% | 1 / 0 | 4.6 / 4.1 |
| `/failures/gastroenterology-and-hepatology` | 5 | 19 | −73.7% | 0 / 0 | 3.4 / 4.4 |
| `/failures/infectious-disease` | 2 | 13 | −84.6% | 0 / 0 | 7.0 / 5.9 |
| **Five controls combined** | **69** | **161** | **−57.1%** | **2 / 0** | — |

## Interpretation

The pilot lost more impressions than the fixed controls in this window: −93.7% versus −57.1%. Its average position also moved from 5.1 to 9.5. This makes the pilot a priority for inspection, but it does not establish that the content change caused the decline: the controls also declined, the comparison is only one week, and GSC reporting is delayed.

The next content/technical review should therefore inspect:

1. whether the pilot's current production HTML, canonical, robots directive, sitemap entry, and internal links are still unchanged;
2. whether the lost impressions are concentrated in ophthalmology-specific queries or in generic failure queries;
3. whether the change persists across the next complete 7-day and 28-day windows;
4. whether the NCT-heavy query segment is moving independently of normal topic queries.

No URL removal, reindexing request, merge, or deployment is authorized by this measurement file.
