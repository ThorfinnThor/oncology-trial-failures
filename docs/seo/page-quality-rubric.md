# Page-quality rubric

This rubric separates search demand from page quality. A low-click page is not automatically a `noindex` candidate.

## Required evidence by page family

| Page family | Must answer | Minimum evidence | Fail conditions |
| --- | --- | --- | --- |
| Trial | Which study is this, what happened, and how certain is the explanation? | Stable NCT identity, registry source, status, stop wording, classification, uncertainty, key study fields, related hub/sponsor links | Missing source, invented cause, empty 200 page, contradictory classification |
| Disease/phase/reason hub | What cohort is represented and what patterns are actually visible? | Cohort definition, denominator, resolved/unresolved breakdown, relevant phase/time split, 1–3 data-backed observations, linked trial examples, limits of inference | Generic text, hidden denominator, “failure rate” claim from stopped studies only, no source links |
| Sponsor | What stopped-study pattern is visible for this entity? | Canonical sponsor identity and aliases, included count, composition, concrete examples, data gaps, cautious interpretation | Alias mixing, tiny sample presented as ranking certainty, unsupported causal claim |
| Insight/report/brief | What specific question does this page answer? | Distinct question, method, date/snapshot, source links, reproducible conclusion, clear scope | Duplicate intent, unsupported conclusion, stale or missing source date |
| Explore/filter/compare utility | What product action does the user need? | Working interaction, login/access behavior, stable error handling, no reliance on search indexing | Arbitrary combinations exposed as SEO pages, empty states, duplicate parameter URLs |

## Decision guardrails

- `unknown` measurement stays unknown; it does not become zero.
- No decision may be triggered only by clicks, word count, sponsor size, or trial count.
- `TERMINATED`, `SUSPENDED`, and `WITHDRAWN` are data statuses, not deletion reasons.
- An unresolved stop reason is a valid result and must not be filled with invented interpretation.
- A canonical may consolidate true duplicates only; it must not join different studies or topics.
- A proposed `noindex`, redirect, or removal needs a URL-specific reason and review record.

## Review outcome

Each reviewed URL receives one of:

- `KEEP_INDEX`: useful and technically sound;
- `IMPROVE_INDEX`: keep indexable while improving evidence or presentation;
- `REVIEW_HOLD`: insufficient evidence for a change;
- `NOINDEX_UTILITY`: genuine utility page without an independent search destination;
- `NOINDEX_THIN_CONTENT`: page has a valid 200 resource but lacks enough source-backed information for an independent search destination;
- `CANONICAL_DUPLICATE`: equivalent variant with a suitable main URL;
- `MERGE_REDIRECT`: content has been merged into a genuinely equivalent destination;
- `REMOVE`: no valid resource and no suitable replacement.

The decision, reason, reviewer, date, measurement status, and last valid configuration must be recorded before a production directive changes.
