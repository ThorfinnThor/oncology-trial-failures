# Classification V2

Classification V2 is the conservative stop-reason pipeline used for new and
changed ClinicalTrials.gov records. It replaces forced keyword precedence with
an evidence-bearing, review-gated model.

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
- `MULTIPLE`
- `UNSPECIFIED`

The website's original `classification_label` and `classification_reason`
fields remain available as conservative compatibility fields. Mixed,
non-failure, unspecified biological, and unresolved records map to
`UNCLEAR / OTHER/UNKNOWN` rather than an asserted legacy failure bucket.

## Decision order

1. Normalize the registry stop reason and compute a stable text hash.
2. Reuse a consistent, previously reviewed exact stop reason when available.
   Legacy audit rows explicitly marked as unresolved do not block a later,
   more specific tested V2 rule.
3. Apply high-precision semantic rules with polarity and negation guards.
4. Preserve multiple explicit causes instead of forcing precedence.
5. Identify explicit planned milestones and replacement transitions.
6. Route content-free decisions, novel text, and unresolved language to review.

Description fallback is allowed only when `whyStopped` is empty or an explicit
placeholder. It is accepted only for a direct, high-confidence causal sentence.
This prevents unrelated safety or efficacy background from becoming a false
stop reason.

## Files

- `scripts/classification_v2.py`: classifier and compatibility mapping
- `tests/classification_gold_v2.jsonl`: row-level audit fixture for records 1-4000
- `data/classification_reviewed_reasons_v2.json`: consistent exact-text decisions
- `data/classification_review_queue_v2.json`: grouped unresolved reasons
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

## Quality policy

The release gate currently requires:

- at least 99% precision among asserted legacy-compatible classifications;
- at least 99% precision among high-confidence assertions;
- at least 98% precision for biological failure assertions;
- at least 55% recall for biological audit cases;
- at least 85% recall for audit cases previously marked ambiguous/review.

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
when the canonical snapshot is rebuilt.

No classifier can guarantee that every registry statement is correct or
unambiguous. V2 instead guarantees that unsupported or conflicting semantics
are not silently promoted to a confident failure category.
