import assert from "node:assert/strict";
import test from "node:test";

import { sponsorPortfolioSignalSlice } from "../lib/insightStats";
import type { TrialIndexRow } from "../lib/types";

function row(
  nctId: string,
  sponsor: string,
  phase: string,
  area: string,
  biological: boolean,
): TrialIndexRow {
  return {
    nct_id: nctId,
    lead_sponsor: sponsor,
    phases: phase,
    disease_area: area,
    classification_final_outcome: biological ? "BIOLOGICAL_FAILURE" : "NON_BIOLOGICAL",
    classification_final_category: biological ? "EFFICACY_FUTILITY" : "RECRUITMENT",
  };
}

test("sponsor portfolio statistics enforce a denominator and calculate mix-based expectations", () => {
  const rows = [
    row("A1", "Sponsor A", "PHASE2", "Oncology", true),
    row("A2", "Sponsor A", "PHASE2", "Oncology", false),
    row("A3", "Sponsor A", "PHASE3", "Other", false),
    row("B1", "Sponsor B", "PHASE2", "Oncology", true),
    row("B2", "Sponsor B", "PHASE3", "Other", true),
    row("C1", "Sponsor C", "PHASE2", "Oncology", false),
  ];

  const summary = sponsorPortfolioSignalSlice(rows, 2);

  assert.equal(summary.minimumRecords, 2);
  assert.equal(summary.eligibleSponsors, 2);
  assert.equal(summary.profiles[0].sponsor, "Sponsor A");
  assert.equal(summary.profiles[0].biologicalShare, "33.3%");
  assert.equal(summary.profiles[0].expectedBiologicalCount, 1.5);
  assert.equal(summary.profiles[0].observedExpectedRatio, "0.67");
  assert.equal(summary.profiles[1].observedExpectedRatio, "2.00");
  assert.equal(summary.medianBiologicalShare, "66.7%");
  assert.equal(summary.volumeShareCorrelation, -1);
  assert.equal(summary.profiles[0].href, "/sponsor/sponsor-a");
});

