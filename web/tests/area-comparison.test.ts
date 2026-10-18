import assert from "node:assert/strict";
import test from "node:test";
import { loadIndexServer } from "../lib/server-data";
import { buildFailureHubs, buildHubEditorialInsight, hubStats } from "../lib/seoHubs";

test("every named disease-area hub explains how it differs from all stopped trials", async () => {
  const rows = await loadIndexServer();
  const areas = buildFailureHubs(rows).filter((hub) => hub.kind === "area");
  assert.ok(areas.length > 5);
  for (const hub of areas) {
    const insight = buildHubEditorialInsight(hub, hubStats(hub.rows), rows);
    if (hub.slug === "neurology") { assert.equal(insight?.variant, "neurology-comparison"); continue; }
    if (hub.slug === "ophthalmology") { assert.equal(insight?.variant, "ophthalmology-review"); continue; }
    if (hub.label === "Other") { assert.equal(insight, null); continue; }
    assert.equal(insight?.variant, "area-comparison", hub.label);
    assert.ok(insight!.observations.length >= 1 && insight!.observations.length <= 3, hub.label);
    for (const observation of insight!.observations) {
      const [, count, total] = observation.body.match(/^([\d,]+) of ([\d,]+) stopped /) ?? [];
      assert.ok(count && total, observation.body);
      assert.equal(Number(total.replace(/,/g, "")), hub.rows.length, observation.body);
      assert.ok(Number(count.replace(/,/g, "")) >= 10 || observation.body.includes("compared with"), observation.body);
      assert.match(observation.body, new RegExp(`across all ${rows.length.toLocaleString("en-US")} stopped trials\\.$`));
      assert.doesNotMatch(observation.body + observation.title, /NaN|undefined|Infinity/);
    }
  }
});

test("observation counts match the rows they describe", async () => {
  const rows = await loadIndexServer();
  const oncology = buildFailureHubs(rows).find((hub) => hub.slug === "oncology")!;
  const insight = buildHubEditorialInsight(oncology, hubStats(oncology.rows), rows)!;
  const withdrawn = insight.observations.find((o) => o.body.includes("withdrawn before enrolling"));
  if (withdrawn) {
    const expected = oncology.rows.filter((row) => (row.overall_status || "").toUpperCase() === "WITHDRAWN").length;
    assert.ok(withdrawn.body.startsWith(`${expected.toLocaleString("en-US")} of `), withdrawn.body);
  }
});
