# Step 08 — Trial-page evidence quality review

**Status:** implemented and locally reviewable; not deployed

**Scope:** the five indexable pages that published a ClinicalTrials.gov detailed-description pointer, plus every currently indexable trial whose registry stop reason contains at most 20 characters

## Result

The current compatibility rule exposes 2,434 trial pages to search. A repeated template is not by itself a thin-content decision: these pages also publish the NCT identity, source-linked registry wording, classification and uncertainty, sponsor, phase, condition, intervention, disease area, provenance, and related evidence paths.

The URL-level review found:

- 272 pages with a stop reason of 20 characters or fewer;
- 271 of those short reasons directly support their structured efficacy/futility, safety, or biological classification and have all required page fields;
- NCT01965600 has no separate registry stop-reason value, but its detailed description explicitly states the safety and endotoxin-supply reasons;
- five further pages publish a pointer such as “See termination reason in detailed description” even though the pipeline retained the actual ClinicalTrials.gov detailed-description sentence;
- no reviewed trial URL qualifies for thin-content `noindex` after recovering the detailed-description evidence.

## Technical correction

`web/lib/trialEvidence.ts` resolves visible stop evidence in this order:

1. ordinary registry `why_stopped` wording;
2. URL-keyed, manually verified ClinicalTrials.gov detailed-description evidence;
3. retained `source.description_fallback` evidence when the registry field points to the detailed description;
4. an explicit missing-evidence state.

Trial-page body copy and SEO metadata now use the same resolver. The five placeholder pages and NCT01965600 identify the evidence as coming from the ClinicalTrials.gov detailed description rather than presenting a placeholder or an empty evidence block.

The verified source text is stored in `web/config/trial-detailed-description-evidence.json`. This is necessary because the classifier evidence intentionally limits each quote to 180 characters; two of the source texts were therefore cut off mid-sentence and are not used as visible page copy.

## Reviewed placeholder pages

- NCT01098240 — interim futility criteria met
- NCT01420081 — discontinued after lack of confidence in the efficacy signal and assay selection
- NCT00584779 — terminated after adverse events in study subjects
- NCT01145417 — parent study stopped for lack of efficacy
- NCT00823979 — terminated for lack of efficacy at the week-24 analysis

## Corrected noindex decision

NCT01965600 had previously been approved and deployed as `NOINDEX_THIN_CONTENT` because `why_stopped` is empty. The deeper source review found an explicit termination statement in the official detailed description. Treating this page differently from the five pointer-based pages would be inconsistent. Its URL-level decision is therefore corrected to `IMPROVE_INDEX`: publish the verified source text, return `index,follow`, and restore its sitemap entry with the final deployment. Until that deployment, production remains unchanged.

## Guardrail

Short wording alone is not a `noindex` trigger. A future exclusion requires missing or non-recoverable source evidence, missing required study context, and a URL-level reviewed decision. `docs/seo/trial-page-quality-review.csv` records every reviewed URL and `docs/seo/trial-page-quality-report.json` records the aggregate result.
