import assert from "node:assert/strict";
import test from "node:test";

import { phaseCoverageSlice, registryTimingSlice } from "../lib/insightStats";
import type { TrialIndexRow } from "../lib/types";

test("registry timing keeps completion gaps separate from pre-completion updates", () => {
  const rows: TrialIndexRow[] = [
    {
      nct_id: "NCT00000001",
      overall_status: "TERMINATED",
      completion_date: "2020-01-01",
      last_update_post_date: "2026-01-01",
    },
    {
      nct_id: "NCT00000002",
      overall_status: "WITHDRAWN",
      completion_date: "2024-01-01",
      last_update_post_date: "2025-01-01",
    },
    {
      nct_id: "NCT00000003",
      overall_status: "SUSPENDED",
      completion_date: "2025-01-01",
      last_update_post_date: "2024-01-01",
    },
    {
      nct_id: "NCT00000004",
      overall_status: "TERMINATED",
      last_update_post_date: "2026-01-01",
    },
  ];

  const summary = registryTimingSlice(rows);

  assert.equal(summary.total, 4);
  assert.equal(summary.paired, 2);
  assert.equal(summary.beforeCompletion, 1);
  assert.equal(summary.missingCompletion, 1);
  assert.equal(summary.overOneYear, 2);
  assert.equal(summary.overFiveYears, 1);
  assert.equal(summary.updated2026CompletedBefore2021, 1);
  assert.equal(summary.examples[0]?.nctId, "NCT00000001");
});

test("phase coverage exposes unique encoding and overlapping memberships", () => {
  const rows: TrialIndexRow[] = [
    {
      nct_id: "NCT00000011",
      phases: "PHASE1; PHASE2",
      classification_final_outcome: "BIOLOGICAL_FAILURE",
    },
    {
      nct_id: "NCT00000012",
      phases: "PHASE2; PHASE3",
      classification_final_outcome: "NON_BIOLOGICAL",
    },
    {
      nct_id: "NCT00000013",
      phases: "NA",
      classification_final_outcome: "NON_BIOLOGICAL",
    },
    { nct_id: "NCT00000014", phases: "" },
    {
      nct_id: "NCT00000015",
      phases: "PHASE3",
      classification_final_outcome: "BIOLOGICAL_FAILURE",
    },
  ];

  const summary = phaseCoverageSlice(rows);
  const memberships = new Map(summary.phaseMembership.map((item) => [item.key, item]));

  assert.equal(summary.total, 5);
  assert.equal(summary.singlePhase, 2);
  assert.equal(summary.multiPhase, 2);
  assert.equal(summary.notApplicable, 1);
  assert.equal(summary.missingPhase, 1);
  assert.equal(summary.membershipTotal, 6);
  assert.equal(memberships.get("PHASE2")?.count, 2);
  assert.equal(memberships.get("PHASE2")?.biologicalCount, 1);
  assert.equal(summary.examples.length, 3);
});
