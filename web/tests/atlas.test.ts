import assert from "node:assert/strict";
import test from "node:test";

import { ATLAS_GROUPS, atlasGroup, atlasSummary, buildAtlasData } from "../lib/atlas";
import type { TrialIndexRow } from "../lib/types";

function row(nct: string, area: string, outcome: string, category: string, extra: Partial<TrialIndexRow> = {}): TrialIndexRow {
  return {
    nct_id: nct,
    brief_title: `Study ${nct}`,
    disease_area: area,
    phases: "PHASE2",
    overall_status: "TERMINATED",
    lead_sponsor: "Example sponsor",
    why_stopped_short: "Example reason",
    classification_final_outcome: outcome,
    classification_final_category: category,
    completion_date: "2021-05-01",
    ...extra,
  };
}

test("each final classification maps to one plain-language group", () => {
  const cases: Array<[string, string, string]> = [
    ["BIOLOGICAL_FAILURE", "EFFICACY_FUTILITY", "efficacy"],
    ["BIOLOGICAL_FAILURE", "BIOLOGICAL_UNSPECIFIED", "efficacy"],
    ["BIOLOGICAL_FAILURE", "SAFETY", "safety"],
    ["NON_FAILURE_TRANSITION", "PLANNED_MILESTONE", "transition"],
    ["NON_BIOLOGICAL", "RECRUITMENT", "recruitment"],
    ["NON_BIOLOGICAL", "FUNDING", "business"],
    ["NON_BIOLOGICAL", "BUSINESS_STRATEGY", "business"],
    ["NON_BIOLOGICAL", "SUPPLY_MANUFACTURING", "operational"],
    ["UNRESOLVED", "UNRESOLVED_MISSING_STOP_REASON", "unclear"],
    ["CAUSE_NOT_STATED", "DECISION_WITHOUT_STATED_CAUSE", "unclear"],
    ["MIXED_CAUSES", "MULTIPLE", "unclear"],
  ];
  for (const [outcome, category, expected] of cases) {
    assert.equal(atlasGroup({ classification_final_outcome: outcome, classification_final_category: category }), expected, `${outcome}/${category}`);
  }
});

const rows: TrialIndexRow[] = [
  ...Array.from({ length: 40 }, (_, i) => row(`NCT${String(i).padStart(8, "0")}`, "Oncology", "NON_BIOLOGICAL", "RECRUITMENT")),
  ...Array.from({ length: 10 }, (_, i) => row(`NCT${String(100 + i).padStart(8, "0")}`, "Oncology", "BIOLOGICAL_FAILURE", "EFFICACY_FUTILITY")),
  ...Array.from({ length: 12 }, (_, i) => row(`NCT${String(200 + i).padStart(8, "0")}`, "Neurology", "BIOLOGICAL_FAILURE", "SAFETY", { phases: "PHASE3" })),
  row("NCT00000999", "", "UNRESOLVED", "UNRESOLVED_MISSING_STOP_REASON", { phases: undefined, overall_status: "WITHDRAWN" }),
];

test("every trial appears once, with its area, group, phase and status", () => {
  const data = buildAtlasData(rows, "2026-11-17");
  assert.equal(data.x.length, rows.length);
  assert.equal(new Set(data.id).size, rows.length);
  for (const key of ["y", "g", "a", "p", "s", "st", "yr", "t", "w", "d"] as const) assert.equal(data[key].length, rows.length, key);
  assert.deepEqual(data.areas.map((a) => [a.name, a.n]), [["Oncology", 50], ["Neurology", 12], ["Other", 1]]);

  const i = data.id.indexOf(999);
  assert.equal(data.groups[data.g[i]].key, "unclear");
  assert.equal(data.areas[data.a[i]].name, "Other");
  assert.equal(data.phases[data.p[i]], "Not applicable");
  assert.equal(data.statuses[data.st[i]], "Withdrawn");
  assert.equal(data.yr[i], 2021);
});

test("the layout is the same on every build and keeps clusters apart", () => {
  const first = buildAtlasData(rows, "v");
  const second = buildAtlasData([...rows].reverse(), "v");
  assert.deepEqual(first, second);

  for (const [i, a] of first.areas.entries()) {
    for (const b of first.areas.slice(i + 1)) {
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= a.r + b.r, `${a.name} overlaps ${b.name}`);
    }
  }
});

test("biological stops sit nearer the core of their cluster than recruitment stops", () => {
  const data = buildAtlasData(rows, "v");
  const onc = data.areas.find((a) => a.name === "Oncology")!;
  const distance = (key: string) => {
    const group = ATLAS_GROUPS.findIndex((g) => g.key === key);
    const ds = data.id.map((_, i) => i).filter((i) => data.g[i] === group && data.areas[data.a[i]].name === "Oncology")
      .map((i) => Math.hypot(data.x[i] - onc.x, data.y[i] - onc.y));
    return ds.reduce((sum, d) => sum + d, 0) / ds.length;
  };
  assert.ok(distance("efficacy") < distance("recruitment"));
});

test("the summary counts biological stops for the headline share", () => {
  const summary = atlasSummary(rows);
  assert.equal(summary.total, 63);
  assert.equal(summary.biological, 22);
  assert.equal(summary.groups.find((g) => g.key === "recruitment")?.count, 40);
});
