# Brief indexing audit (2026-09-23)

This is a publication-priority review, not a claim that a high rate is statistically significant. The source is `web/data/briefs_index.json` generated on 2026-09-21. It contains 51 mechanism-class briefs covering Phase 2/3 trials started in 2015-2024. Every brief currently allows indexing and has a self-canonical URL. The current local sitemap change submits `/briefs` and the 21 wave-1 URLs. Sitemap absence is not a `noindex` directive.

The audit compares each brief's own counts, named molecules, original NCT stop reasons, and overlap of stopped NCT IDs in `failure_signature.assets[].trials`. Overlap refers to **stopped studies**, not to the entire cohort denominator. A nested combination may still deserve a distinct page if the question and analysis are demonstrably different. The Benjamini-Yekutieli result is relevant to interpretation, not an SEO inclusion threshold.

## Wave 1: added to the local sitemap change

These 21 pages have an identifiable mechanism question and useful trial-level evidence. This is a discovery priority, not an endorsement of a biological effect.

| URL path after `/briefs/` | Biological stops / closed | Distinct stopped molecules | Why this wave |
| --- | ---: | ---: | --- |
| `neurology-bace-secretase` | 4 / 4 | 3 | Three molecules, three programmes; FDR survivor, but very small cohort. |
| `neurology-tau` | 7 / 10 | 4 | Four molecules and an FDR survivor; distinguish own-data and cascade stops prominently. |
| `oncology-tgf-pd-l-1` | 11 / 44 | 2 | FDR survivor; more specific of two pages with the exact same 11 stops. |
| `oncology-cd38` | 8 / 71 | 3 | Parent mechanism, broader than its three-stop combination page. |
| `oncology-androgen-receptor-axis` | 13 / 125 | 7 | Larger, distinct cohort. |
| `oncology-met` | 11 / 121 | 8 | Parent mechanism, broader than its three-stop combination page. |
| `oncology-egfr` | 20 / 271 | 13 | Broad cohort with multiple named molecules. |
| `oncology-pi3k-akt-mtor` | 13 / 178 | 9 | Distinct pathway analysis across multiple molecules. |
| `oncology-parp` | 12 / 205 | 4 | Parent mechanism, broader than its five-stop combination page. |
| `oncology-flt3-kit` | 14 / 244 | 11 | Multiple molecules and trials. |
| `oncology-pd-l-1` | 97 / 2,063 | 13 | Broad reference page; its 97 stopped studies include many combination subsets. |
| `oncology-alk-ros1-ret` | 7 / 153 | 6 | Multiple molecules and trials. |
| `oncology-braf-mek` | 9 / 210 | 7 | Parent mechanism, broader than its three-stop combination page. |
| `oncology-cdk4-6` | 6 / 144 | 4 | Distinct mechanism and study set. |
| `oncology-antifolate-nucleoside` | 21 / 523 | 7 | Parent mechanism, broader than its seven-stop combination page. |
| `oncology-microtubule` | 26 / 655 | 10 | Parent mechanism, broader than its three-stop combination page. |
| `oncology-topoisomerase` | 13 / 335 | 9 | Multiple molecules and trials. |
| `oncology-fgfr` | 6 / 167 | 5 | Distinct mechanism and study set. |
| `oncology-her2` | 7 / 200 | 5 | Distinct mechanism and study set. |
| `oncology-vegf-vegfr` | 20 / 653 | 13 | Parent mechanism, broader than its five-stop combination page. |
| `oncology-ctla-4` | 11 / 304 | 3 | Parent mechanism; includes one stop absent from the combination page. |

## Wave 2: keep indexable, review before sitemap inclusion

These 19 pages are not necessarily thin or incorrect. Their evidence is smaller, their cohort has more unresolved terminations, or a narrow question needs a clearer editorial introduction. Check Search Console demand and add an explicit interpretation of the named molecules and NCT records before promoting them.

| URL path after `/briefs/` | Biological stops / closed | Review focus |
| --- | ---: | --- |
| `neurology-amyloid-directed` | 6 / 20 | Nine additional unresolved terminations; explain the uncertainty band. |
| `oncology-ox40-4-1bb-gitr` | 5 / 33 | Only one stop attributed to own trial data; distinguish the combination subset. |
| `oncology-bcma` | 4 / 28 | Small cohort; no stops attributed to own trial data. |
| `oncology-her3` | 4 / 30 | Small cohort; two programme-cascade stops. |
| `immunology-autoimmune-btk` | 3 / 25 | Small cohort; add area to visible title/H1 to distinguish oncology BTK. |
| `oncology-cd47-sirp` | 3 / 25 | Small cohort; nine unresolved terminations. |
| `oncology-jak-tyk2` | 4 / 47 | Small cohort; add area to visible title/H1 to distinguish immunology JAK/TYK2. |
| `neurology-gaba-a` | 3 / 37 | Small cohort; no stops attributed to own trial data. |
| `oncology-ido1` | 3 / 37 | Small cohort; no stops attributed to own trial data. |
| `neurology-dopaminergic` | 4 / 52 | Small cohort; separate own-data and cascade evidence. |
| `oncology-cd3-t-cell-engagers` | 4 / 62 | Small cohort; five unresolved terminations. |
| `oncology-hdac` | 4 / 65 | Small cohort; four unresolved terminations. |
| `oncology-tigit` | 3 / 58 | All three stops duplicate the TIGIT + PD-(L)1 page; keep only one as the primary discovery page. |
| `immunology-autoimmune-jak-tyk2` | 4 / 79 | Small cohort; add area to visible title/H1 to distinguish oncology JAK/TYK2. |
| `oncology-bcl-2` | 5 / 101 | All five stops belong to one resolved molecule; avoid a class-level inference. |
| `oncology-btk` | 5 / 131 | Two resolved molecules; distinguish from immunology BTK. |
| `oncology-cd20` | 6 / 169 | Two resolved molecules; clarify what the grouped cohort means. |
| `oncology-proteasome` | 3 / 101 | Small cohort; no stops attributed to own trial data. |
| `oncology-er-aromatase` | 3 / 132 | Small cohort; ten unresolved terminations. |

### Editorial outcome for wave 2

All 19 remain outside the sitemap for now. Eight have a clear, distinct source question worth revisiting after a source and page-copy review. Eleven need a stronger evidence or cohort check first. This is a judgement about publication priority, not a reclassification of the registry records.

| Brief | Decision | What the registry evidence supports or limits |
| --- | --- | --- |
| `neurology-amyloid-directed` | Revisit | Six classified stops across aducanumab, crenezumab and solanezumab; four rest on the listed trial's own data. Nine further terminations have no classifiable cause, so the 6/20 rate is a lower bound on possible biological stops. |
| `oncology-cd47-sirp` | Revisit | Three own-data stops across magrolimab and evorpacept. The nine additional unclear terminations make the class rate sensitive to missing explanations. |
| `oncology-jak-tyk2` | Revisit | Four stops across pacritinib and ruxolitinib, with two own-data decisions. One source mixes futility with a supplier decision, so the page should show that full wording prominently. |
| `neurology-dopaminergic` | Revisit | Four stops across three molecules; two own-data, one cascade and one unclear. The distinction between a trial's result and another programme's result is central here. |
| `oncology-hdac` | Revisit | Four stops across tucidinostat, pracinostat and vorinostat; two own-data and two unclear. The source statements concern different settings and should not become a single drug-class verdict. |
| `immunology-autoimmune-jak-tyk2` | Revisit | Four stops across three molecules, with two own-data decisions, one cascade and one unclear. This has a different disease-area question from oncology JAK/TYK2. |
| `oncology-btk` | Revisit | Five stops across ibrutinib and vecabrutinib; two own-data and three unclear. Mixed efficacy and safety statements need to remain visible. |
| `oncology-cd20` | Revisit | Six stops across rituximab and obinutuzumab, but only three own-data decisions. Many studies are combinations, so a trial-level stop cannot be assigned to CD20 alone. |
| `oncology-ox40-4-1bb-gitr` | Hold | Five molecules appear, but only one of five stops is attributed to that trial's own data; four have unclear decision source. |
| `oncology-bcma` | Hold | Four stops across two very different modalities, with no stop attributed to a trial's own data in the current audit. One stopped NCT record is also in OX40 / 4-1BB / GITR. |
| `oncology-her3` | Hold | Four stops across three molecules; only one own-data decision, two programme cascades and one unclear. |
| `immunology-autoimmune-btk` | Hold | Three stops across three molecules, but two are explicit feeder or parent-study cascades. The page must explain the relation before it is promoted. |
| `neurology-gaba-a` | Hold | Three stops, zero own-data decisions, one cascade and two unclear. |
| `oncology-ido1` | Hold | Three stops, zero own-data decisions and three unclear; one reason combines poor activity with low enrolment. |
| `oncology-cd3-t-cell-engagers` | Hold | One own-data decision and three unclear. `NCT04934670` is a steroid-refractory acute graft-versus-host disease study labelled Oncology in the current source data; verify the area assignment before promoting the page. |
| `oncology-tigit` | Hold | Its three stopped NCT IDs exactly match the TIGIT + PD-(L)1 page. Choose a primary interpretation of the two cohort denominators first. |
| `oncology-bcl-2` | Hold | All five classified stops involve venetoclax. One example describes the discontinuation of a different drug programme in a combination study, so attribution to BCL-2 requires careful wording. |
| `oncology-proteasome` | Hold | Three stops, with no trial's own-data decision established by the current attribution audit. |
| `oncology-er-aromatase` | Hold | Three classified stops against ten further unclassifiable terminations; the apparent rate is especially sensitive to missing reasons. |

## Hold from sitemap pending differentiation

These 11 combination or parent pages repeat most or all stopped studies from a wave-1 page. They currently remain `index,follow`; do not blanket-`noindex` or canonicalize them to another page without first deciding whether the *whole page* serves a distinct intent. The numbers below are the intersection of stopped NCT IDs, not an overlap of all cohort records.

| URL path after `/briefs/` | Shared stopped NCT IDs | Primary page to compare | Decision needed |
| --- | ---: | --- | --- |
| `oncology-tgf` | 11 / 11 | `oncology-tgf-pd-l-1` | Exact same stop set and two named molecules; explain the wider denominator or consolidate. |
| `oncology-cd38-pd-l-1` | 3 / 3 | `oncology-cd38` | All its stops are in parent; show what combination analysis adds. |
| `oncology-ox40-4-1bb-gitr-pd-l-1` | 3 / 3 | `oncology-ox40-4-1bb-gitr` | Three of the parent's five stops; distinguish combination question. |
| `oncology-met-pd-l-1` | 3 / 3 | `oncology-met` | All its stops are in parent; distinguish combination question. |
| `oncology-parp-pd-l-1` | 5 / 5 | `oncology-parp` | All its stops are in parent; distinguish combination question. |
| `oncology-tigit-pd-l-1` | 3 / 3 | `oncology-tigit` | Exact same stop set and named molecules; choose one primary page. |
| `oncology-braf-mek-pd-l-1` | 3 / 3 | `oncology-braf-mek` | All its stops are in parent; distinguish combination question. |
| `oncology-antifolate-nucleoside-pd-l-1` | 7 / 7 | `oncology-antifolate-nucleoside` | All its stops are in parent; distinguish combination question. |
| `oncology-ctla-4-pd-l-1` | 10 / 10 | `oncology-ctla-4` | Ten of the parent's eleven stops; near-duplicate evidence set. |
| `oncology-vegf-vegfr-pd-l-1` | 5 / 5 | `oncology-vegf-vegfr` | All its stops are in parent; distinguish combination question. |
| `oncology-microtubule-pd-l-1` | 3 / 3 | `oncology-microtubule` | All its stops are in parent; distinguish combination question. |

## Site-level follow-up

- `/briefs` and its 21 wave-1 pages are included in the sitemap. `/validation` and `/asset-check` are also included as distinct discovery pages: validation publishes the dataset's actual review method and measured results; asset check is the public molecule-comparison tool. `/pricing` remains the catalogue entry point for the evidence packages. Individual `/packages/[slug]` pages remain crawlable and self-canonical, but are not submitted individually because they share a sales-page structure and `/pricing` is their discovery hub.
- Brief `<title>` and H1 now include the disease area in the local page change. The source-attribution and unclassifiable-termination caveats are also visible near the top. This helps distinguish oncology and immunology BTK/JAK pages; it does not make their small cohorts statistically conclusive.
- The downloadable `/briefs/*.html` renderings now carry a canonical link to `/briefs/[slug]` in the local change. Cloudflare's static-asset `_headers` rule sets `X-Robots-Tag: noindex` on `/briefs/*.pdf`. Download access remains available.
- `scripts/briefs/build_briefs_index.py` intentionally limits the canonical HTML to five stopped-study rows except for the open-access worked example. The printable HTML/PDF generated by `build_brief.py` show up to six rows, so the PDF does **not** contain every stop for larger cohorts. The complete trial list belongs to the dataset and evidence package. Expanding public coverage would change that product decision.
- Use the actual `generated_at_utc` or a real content-update timestamp for sitemap `lastmod`, not the request time. Do not submit all 51 automatically just because generation created them.

## Sitemap implementation

The local sitemap change adds `/briefs` and exactly the 21 wave-1 detail URLs above through the explicit allowlist in `web/lib/briefSitemap.ts`. Its test detects an allowlisted slug missing from the current source index. The 19 wave-2 pages and 11 overlap-review pages remain accessible and indexable, but are not actively submitted yet.
