import assert from "node:assert/strict";
import test from "node:test";

import {
  classificationReasonBucket,
  isResolvedBiologicalFailure,
  resolveClassification,
} from "../lib/classificationResolution";
import { isLikelyScientificFailure, reasonBucket } from "../lib/filtering";
import { isIndexableTrial } from "../lib/seoHubs";
import { buildTrialSeoMetadata } from "../lib/seoMetadata";
import type { TrialDetail, TrialIndexRow } from "../lib/types";

test("final classification overrides conflicting V2 and legacy fields", () => {
  const row: TrialIndexRow = {
    nct_id: "NCT00000001",
    classification_final_outcome: "NON_BIOLOGICAL",
    classification_final_category: "RECRUITMENT",
    classification_resolution_status: "RESOLVED",
    classification_outcome_v2: "BIOLOGICAL_FAILURE",
    classification_primary_reason_v2: "SAFETY",
    classification_label: "BIOLOGICAL_FAILURE",
    classification_reason: "SAFETY",
  };

  assert.deepEqual(resolveClassification(row), {
    outcome: "NON_BIOLOGICAL",
    reason: "RECRUITMENT",
    resolutionStatus: "RESOLVED",
    reviewRequired: false,
    source: "final",
  });
  assert.equal(classificationReasonBucket(row), "OPERATIONAL");
  assert.equal(isResolvedBiologicalFailure(row), false);
});

test("an authoritative final unresolved state never falls back to an older biological label or stays indexable without evidence", () => {
  const row: TrialDetail = {
    nct_id: "NCT00000002",
    brief_title: "Sparse stopped trial",
    classification_final_outcome: "UNRESOLVED",
    classification_final_category: "UNRESOLVED_MISSING_STOP_REASON",
    classification_resolution_status: "UNRESOLVED",
    classification_needs_review: true,
    classification_outcome_v2: "BIOLOGICAL_FAILURE",
    classification_primary_reason_v2: "EFFICACY_FUTILITY",
    classification_label: "BIOLOGICAL_FAILURE",
  };

  const resolved = resolveClassification(row);
  assert.equal(resolved.outcome, "UNRESOLVED");
  assert.equal(resolved.reviewRequired, true);
  assert.equal(classificationReasonBucket(row), "OTHER/UNKNOWN");
  assert.equal(reasonBucket(row), "OTHER/UNKNOWN");
  assert.equal(isLikelyScientificFailure(row), false);
  assert.equal(isIndexableTrial(row), false, "a sparse unresolved trial must not stay indexable");
  assert.match(buildTrialSeoMetadata(row, row.nct_id).description, /review required/i);
});

test("cause-not-stated and legacy records resolve deterministically", () => {
  const decisionOnly: TrialIndexRow = {
    nct_id: "NCT00000003",
    classification_outcome_v2: "CAUSE_NOT_STATED",
    classification_primary_reason_v2: "DECISION_WITHOUT_STATED_CAUSE",
    classification_needs_review: false,
  };
  const legacy: TrialIndexRow = {
    nct_id: "NCT00000004",
    classification_label: "BIOLOGICAL_FAILURE",
    classification_reason: "EFFICACY/FUTILITY",
  };

  assert.equal(classificationReasonBucket(decisionOnly), "DECISION ONLY");
  assert.equal(resolveClassification(legacy).source, "legacy");
  assert.equal(classificationReasonBucket(legacy), "EFFICACY/FUTILITY");
  assert.equal(isResolvedBiologicalFailure(legacy), true);
});

test("resolved rows agree while trial SEO eligibility also requires source-backed page evidence", () => {
  const rows: TrialIndexRow[] = [
    {
      nct_id: "NCT00000005",
      brief_title: "Evidence-backed stopped trial",
      url: "https://clinicaltrials.gov/study/NCT00000005",
      condition_first: "Example condition",
      intervention_first: "Example intervention",
      why_stopped_short: "The study did not meet its prespecified efficacy threshold.",
      classification_final_outcome: "BIOLOGICAL_FAILURE",
      classification_final_category: "SAFETY",
      classification_final_explanation: "The registry records a biological efficacy or safety signal.",
      classification_resolution_status: "RESOLVED",
    },
    {
      nct_id: "NCT00000006",
      classification_final_outcome: "UNRESOLVED",
      classification_final_category: "UNRESOLVED_MISSING_STOP_REASON",
      classification_resolution_status: "UNRESOLVED",
    },
  ];

  for (const row of rows) {
    const expectedResolved = resolveClassification(row).outcome === "BIOLOGICAL_FAILURE";
    assert.equal(isResolvedBiologicalFailure(row), expectedResolved);
    assert.equal(isLikelyScientificFailure(row), expectedResolved);
  }
  assert.equal(isIndexableTrial(rows[0]), true);
  assert.equal(isIndexableTrial(rows[1]), false);
});
