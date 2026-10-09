import assert from "node:assert/strict";
import test from "node:test";

import { buildHubEditorialInsight, hubStats, type SeoHub } from "../lib/seoHubs";
import type { TrialIndexRow } from "../lib/types";

function row(
  nctId: string,
  outcome: string,
  reason: string,
  date: string,
  phases = "PHASE2"
): TrialIndexRow {
  return {
    nct_id: nctId,
    brief_title: `Study ${nctId}`,
    disease_area: "Ophthalmology",
    phases,
    lead_sponsor: "Example sponsor",
    why_stopped_short: `${reason} source statement`,
    classification_final_outcome: outcome,
    classification_final_category: reason,
    last_update_post_date: date,
  };
}

function ophthalmologyHub(rows: TrialIndexRow[]): SeoHub {
  return {
    kind: "area",
    slug: "ophthalmology",
    label: "Ophthalmology",
    title: "Ophthalmology clinical trial failures",
    h1: "Ophthalmology clinical trial failures",
    description: "Test description",
    path: "/failures/ophthalmology",
    total: rows.length,
    rows,
  };
}

test("ophthalmology editorial insight uses the current hub data", () => {
  const rows = [
    row("NCT00000001", "BIOLOGICAL_FAILURE", "EFFICACY_FUTILITY", "2026-01-01"),
    row("NCT00000002", "BIOLOGICAL_FAILURE", "SAFETY", "2026-02-01", "PHASE3"),
    row("NCT00000003", "NON_BIOLOGICAL", "RECRUITMENT", "2026-03-01"),
    row("NCT00000004", "NON_BIOLOGICAL", "RECRUITMENT", "2026-04-01", "PHASE1"),
    row("NCT00000005", "UNRESOLVED", "UNRESOLVED_OTHER", "2026-05-01"),
    row("NCT00000006", "NON_FAILURE_TRANSITION", "PROGRAM_TRANSITION", "2026-06-01"),
  ];
  const hub = ophthalmologyHub(rows);
  const insight = buildHubEditorialInsight(hub, hubStats(rows));

  assert.ok(insight);
  assert.match(insight.observations[0].body, /2 of 6 \(33\.3%\)/);
  assert.match(insight.observations[1].body, /Recruitment is the resolved primary reason for 2 records/);
  assert.match(insight.observations[2].body, /4 stopped records are mapped to Phase II/);
  assert.deepEqual(
    insight.evidence.map((item) => item.nctId),
    ["NCT00000001", "NCT00000002", "NCT00000005"]
  );
});

test("editorial insight remains limited to the reviewed recovery hubs", () => {
  const rows = [row("NCT00000001", "BIOLOGICAL_FAILURE", "SAFETY", "2026-01-01")];
  const stats = hubStats(rows);
  const otherArea = { ...ophthalmologyHub(rows), slug: "oncology", label: "Oncology" };
  const phaseHub = { ...ophthalmologyHub(rows), kind: "phase" as const, slug: "phase-2" };

  assert.equal(buildHubEditorialInsight(otherArea, stats), null);
  assert.equal(buildHubEditorialInsight(phaseHub, stats)?.variant, "phase-two-lanes");
});
