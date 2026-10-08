import assert from "node:assert/strict";
import test from "node:test";

import { postedEndpointResultSlice } from "../lib/insightStats";
import type { EndpointResult, TrialIndexRow } from "../lib/types";

function endpointResult(
  verdict: EndpointResult["verdict"],
  basis: EndpointResult["basis"] = "posted_analysis",
): Omit<EndpointResult, "read_on"> {
  return {
    verdict,
    basis,
    statement: null,
    statistical_verdict: verdict,
    lines: [`Evidence for ${verdict}`],
    more: 0,
    rules: [],
    results_url: "https://clinicaltrials.gov/study/example?tab=results",
  };
}

test("posted endpoint results keep result verdicts separate from stop classifications", () => {
  const rows: TrialIndexRow[] = [
    {
      nct_id: "NCT02193074",
      brief_title: "Positive interim transition",
      classification_final_outcome: "NON_FAILURE_TRANSITION",
      classification_final_category: "PLANNED_MILESTONE",
      why_stopped_short: "Positive interim analysis",
    },
    {
      nct_id: "NCT01496430",
      brief_title: "Business stop",
      classification_final_outcome: "NON_BIOLOGICAL",
      classification_final_category: "BUSINESS_STRATEGY",
      why_stopped_short: "Business decision",
    },
    {
      nct_id: "NCT00000001",
      brief_title: "Biological stop",
      classification_final_outcome: "BIOLOGICAL_FAILURE",
      classification_final_category: "EFFICACY_FUTILITY",
      why_stopped_short: "Futility",
    },
  ];

  const summary = postedEndpointResultSlice(rows, {
    read_on: "2026-10-05",
    reader_version: 3,
    trials: {
      NCT02193074: endpointResult("MET"),
      NCT01496430: endpointResult("MET", "sponsor_statement"),
      NCT00000001: endpointResult("MISSED"),
    },
  });

  assert.equal(summary.total, 3);
  assert.deepEqual(summary.verdicts, { missed: 1, met: 2, mixed: 0 });
  assert.deepEqual(summary.basis, { postedAnalysis: 2, sponsorStatement: 1 });
  assert.equal(summary.outcomesByVerdict.MET.NON_FAILURE_TRANSITION, 1);
  assert.equal(summary.outcomesByVerdict.MET.NON_BIOLOGICAL, 1);
  assert.equal(summary.outcomesByVerdict.MISSED.BIOLOGICAL_FAILURE, 1);
  assert.equal(summary.examples.length, 2);
  assert.match(summary.examples[0].href, /^\/trial\/NCT02193074-/);
});

