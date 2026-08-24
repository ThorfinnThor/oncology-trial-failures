# Classification V2

Classification V2 is the conservative stop-reason pipeline used for new and
changed ClinicalTrials.gov records. It replaces forced keyword precedence with
an evidence-bearing, review-gated model.

The current rule implementation is `2.5.0`. A review flag is a deliberate
semantic result, not a failed pipeline state: text that does not state a cause
clearly enough remains unclassified until primary-source context or a reviewed
decision supports it.

Version 2.5 treats explicit business/corporate decisions as the broad
`BUSINESS_STRATEGY` cause and explicit administrative causes as
`OPERATIONAL_OTHER`. Actor-only wording such as `Sponsor decision` remains
separate from causal categories as `DECISION_WITHOUT_STATED_CAUSE`: the actor
and action are known, but the biological, operational, or regulatory cause is
not stated. Bare
regulatory and recruitment cause labels such as `IND withdrawn` and `Accrual
Factor` retain their named broad domain without inventing a more specific
underlying mechanism.

## Why V2 exists

The semantic audit of oncology records 1-4000 found that 34.83% were definitely
misclassified and another 8.65% were ambiguous, mixed-cause, planned-success,
or non-failure cases. Most definite errors came from confusing a decision or
action (for example, `Sponsor decision`) with an actual causal explanation.

V2 therefore prefers an explicit unknown or review state over an unsupported
medical, scientific, operational, or regulatory claim.

## Semantic model

The outcome and causal reason are stored separately.

Outcomes:

- `BIOLOGICAL_FAILURE`
- `NON_BIOLOGICAL`
- `MIXED_CAUSES`
- `NON_FAILURE_TRANSITION`
- `CAUSE_NOT_STATED`
- `UNKNOWN`

Primary and secondary reasons:

- `EFFICACY_FUTILITY`
- `SAFETY`
- `BIOLOGICAL_UNSPECIFIED`
- `REGULATORY`
- `RECRUITMENT`
- `FUNDING`
- `SUPPLY_MANUFACTURING`
- `STAFFING_RESOURCES`
- `BUSINESS_STRATEGY`
- `PROTOCOL_FEASIBILITY`
- `SUPPORT_WITHDRAWAL`
- `EXTERNAL_DISRUPTION`
- `OPERATIONAL_OTHER`
- `PLANNED_MILESTONE`
- `REPLACEMENT_TRANSITION`
- `NOT_INITIATED`
- `DECISION_WITHOUT_STATED_CAUSE`
- `MULTIPLE`
- `UNSPECIFIED`

The website's original `classification_label` and `classification_reason`
fields remain available as compatibility fields. Mixed and non-failure
outcomes and decision-only records retain `UNCLEAR / OTHER/UNKNOWN` in the
legacy compatibility fields; unresolved records do not assert a
legacy category. `BIOLOGICAL_UNSPECIFIED` maps to
`BIOLOGICAL_FAILURE / OTHER/UNKNOWN`, preserving the supported biological
domain without inventing an efficacy-versus-safety split.

## Complete-row final classification

Every canonical row also receives four final export fields:

- `classification_resolution_status`: `RESOLVED` or `UNRESOLVED`;
- `classification_final_outcome`: the supported V2 outcome, or `UNRESOLVED`;
- `classification_final_category`: the supported primary cause, or a precise
  `UNRESOLVED_*` disposition;
- `classification_final_explanation`: the evidence provenance or the reason a
  causal category cannot be supported.

This makes the complete dataset filterable without converting missing or
ambiguous source data into invented efficacy, safety, or operational claims.
`UNRESOLVED` is a final data-quality classification, not an unprocessed row.
The underlying suggested V2 outcome, secondary causes, evidence, and review
flag remain available for later adjudication when better source text appears.

## Decision order

1. Normalize the registry stop reason and compute a stable text hash.
2. Reuse a consistent, previously reviewed exact stop reason when available.
   Legacy audit rows explicitly marked as unresolved do not block a later,
   more specific tested V2 rule.
3. Apply high-precision semantic rules with polarity and negation guards.
4. Preserve multiple explicit causes as a resolved `MIXED_CAUSES` result
   instead of forcing precedence.
5. Identify explicit planned milestones and replacement transitions.
6. Resolve exact actor-only decisions to `CAUSE_NOT_STATED /
   DECISION_WITHOUT_STATED_CAUSE` without assigning a causal domain.
7. Route missing text, status-only text, novel language, and unresolved
   language to review.

An explicitly unfavorable benefit-risk statement resolves to
`BIOLOGICAL_FAILURE / BIOLOGICAL_UNSPECIFIED`. This asserts the biological
domain without inventing an efficacy-versus-safety split. Explicit business,
corporate, strategic, portfolio, and reprioritization decisions resolve to
`NON_BIOLOGICAL / BUSINESS_STRATEGY`; a bare `Sponsor decision` resolves only
to `CAUSE_NOT_STATED / DECISION_WITHOUT_STATED_CAUSE` because it identifies
the actor but not the causal domain.

Description fallback is allowed only when `whyStopped` is empty or an explicit
placeholder. It is accepted only for a direct, high-confidence causal sentence.
This prevents unrelated safety or efficacy background from becoming a false
stop reason.

The classifier compiles its narrow semantic patterns once per process. This
keeps full-snapshot classification fast even though the rule set favors many
specific patterns over a few broad, error-prone keyword rules.

## Files

- `scripts/classification_v2.py`: classifier and compatibility mapping
- `tests/classification_gold_v2.jsonl`: row-level audit fixture for records 1-4000
- `data/classification_reviewed_reasons_v2.json`: consistent exact-text decisions
- `data/classification_review_queue_v2.json`: grouped unresolved reasons
- `data/classification_review_dispositions_v2.json`: documented disposition for
  every unresolved reason group
- `data/classification_manual_decisions_v2.csv`: durable approved V2 decisions
- `data/classification_v2_quality.json`: audit benchmark
- `data/classification_v2_reclassification_report.json`: full-snapshot summary
- `scripts/build_classification_gold_v2.py`: reproducible audit materialization
- `scripts/build_reviewed_reason_index_v2.py`: exact reviewed-reason index builder
- `scripts/evaluate_classification_v2.py`: quality metrics and release gate
- `scripts/reclassify_dataset_v2.py`: snapshot migration and review queue builder
- `scripts/validate_classification_v2_snapshot.py`: full-snapshot invariant checks
- `scripts/export_classification_review_batch_v2.py`: prioritized grouped review export
- `scripts/import_classification_review_batch_v2.py`: validated decision-log import
- `scripts/enrich_classification_context_v2.py`: conservative registry-description fallback proposals
- `data/classification_context_proposals_v2.json`: reviewed description-fallback decisions

## Grouped review workflow

The queue is grouped by normalized stop-reason text, so repeated registry
language is reviewed once rather than one NCT record at a time. To export the
200 highest-leverage non-empty reason groups:

```bash
python scripts/export_classification_review_batch_v2.py --limit 200
```

Complete only the `reviewer_*` columns, set `decision_status` to `APPROVED`,
then import the file and rebuild the snapshot:

```bash
python scripts/import_classification_review_batch_v2.py data/classification_review_batch_v2.csv
python scripts/build_reviewed_reason_index_v2.py
python scripts/reclassify_dataset_v2.py --write
python scripts/validate_classification_v2_snapshot.py
```

Approved decisions override audit-derived entries and are automatically reused
for identical future registry language. Blank stop reasons remain unknown; they
cannot be semantically resolved without another explicit primary-source field.

Every queue group receives exactly one review disposition and a priority.
Dispositions distinguish missing source text, placeholders, multi-domain
causes, unspecified biological signals, negated causes, generic actor
decisions, registry-administration text, program actions without an underlying
cause, follow-up limitations, insufficient data, fragments, and other
ambiguous wording. They explain why a group remains unresolved; they do not
substitute a causal classification.

`scripts/reclassify_dataset_v2.py` rebuilds both review artifacts from the full
snapshot on every run. Snapshot validation rejects missing or duplicate group
hashes, undocumented dispositions, stale notes, inconsistent counts, or a
difference between the stored queue and a fresh reclassification. Newly
ingested wording therefore cannot silently bypass the review inventory.

## Primary-source context workflow

The context helper queries ClinicalTrials.gov only for unresolved records whose
`whyStopped` field is blank or an explicit placeholder. It writes proposals
without changing the canonical snapshot by default:

```bash
python scripts/enrich_classification_context_v2.py
```

Review `data/classification_context_proposals_v2.json`, then apply that frozen
proposal file without another network request and rebuild the classifications:

```bash
python scripts/enrich_classification_context_v2.py --apply-existing
python scripts/reclassify_dataset_v2.py --write
python scripts/validate_classification_v2_snapshot.py
```

Fallback text must be a direct study-level causal statement and produce a
high-confidence final result. Individual participant discontinuations,
background safety/efficacy discussion, and study-drug discontinuation advice
are excluded. A description fallback therefore cannot be used to guess a cause
for generic registry text. When the classifier version changes, stored
description fallbacks are not copied blindly: the saved source sentence must
again produce the same high-confidence outcome and primary cause under the new
classifier or the record returns to the review queue.

## Quality policy

The release gate currently requires:

- at least 99% precision among asserted legacy-compatible classifications;
- at least 99% precision among high-confidence assertions;
- at least 98% precision for biological failure assertions;
- at least 55% recall for biological audit cases;
- at least 85% safe disposition recall for audit cases previously marked
  ambiguous/review. A case is safely disposed when it remains review-gated or
  is identified as an explicit non-failure transition.

The initial V2 rule benchmark exceeds these minimums, but its recall is
intentionally conservative. Exact reviewed reasons increase production coverage
without weakening the independent rule benchmark.

Snapshot validation also rejects any `UNKNOWN`, `MIXED_CAUSES`, or
`BIOLOGICAL_UNSPECIFIED` record without a review flag. This prevents uncertain
semantics from appearing as a completed classification even if an old audit
mapping or a future import is malformed.

The historical Markdown audit did not record the target label of correct rows
individually. Their expected labels are reconstructed from the frozen audited
snapshot and marked accordingly in the Gold V2 fixture. Definite corrections
and review cases retain their explicit audit notes.

## Weekly ingest behavior

Every ingest runs the semantic tests and quality gate before fetching data. New
and changed records are classified with V2, then the pipeline regenerates the
grouped review queue, canonical subsets, metadata, compact index, and Cloudflare
shards. Unchanged exact reviewed reasons remain stable across ingests. Manual
NCT overrides and high-confidence description-fallback decisions are preserved
when the canonical snapshot is rebuilt. New placeholder records are evaluated
against their registry description during ingestion using the same strict
direct-cause requirement.

No classifier can guarantee that every registry statement is correct or
unambiguous. V2 instead guarantees that unsupported or conflicting semantics
are not silently promoted to a confident failure category.
