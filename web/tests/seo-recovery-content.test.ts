import assert from "node:assert/strict";
import test from "node:test";

import { buildInsightStats } from "../lib/insightStats";
import { isLikelyScientificFailure, reasonBucket } from "../lib/filtering";
import {
  buildHubEditorialInsight,
  buildSponsorEditorialInsight,
  findFailureHub,
  findSponsorHub,
  hubStats,
} from "../lib/seoHubs";
import { hydrateSeoLandingPage, SEO_LANDING_PAGES } from "../lib/seoLandingPages";
import { buildReferencePage } from "../lib/seoReferenceData";
import { loadIndexServer, loadMetaServer } from "../lib/server-data";

test("neurology recovery content contrasts biological, safety, and operational evidence", async () => {
  const rows = await loadIndexServer();
  const hub = findFailureHub(rows, "neurology");
  assert.ok(hub);
  const editorial = buildHubEditorialInsight(hub, hubStats(hub.rows));
  assert.equal(editorial?.variant, "neurology-comparison");
  assert.equal(editorial?.evidence.length, 3);
  assert.deepEqual(editorial?.evidence.map((item) => item.nctId), ["NCT05256134", "NCT05478031", "NCT03870763"]);
});

test("Phase II recovery content exposes four distinct stop pathways", async () => {
  const rows = await loadIndexServer();
  const hub = findFailureHub(rows, "phase-2");
  assert.ok(hub);
  const editorial = buildHubEditorialInsight(hub, hubStats(hub.rows));
  assert.equal(editorial?.variant, "phase-two-lanes");
  assert.deepEqual(editorial?.observations.map((item) => item.title), [
    "Patient access",
    "Scientific signal",
    "Program economics",
    "Safety and oversight",
  ]);
  assert.equal(editorial?.evidence.length, 4);
});

test("Pfizer recovery content separates portfolio, efficacy, and safety lenses", async () => {
  const rows = await loadIndexServer();
  const hub = findSponsorHub(rows, "pfizer");
  assert.ok(hub);
  const editorial = buildSponsorEditorialInsight(hub);
  assert.deepEqual(editorial?.lenses.map((item) => item.label), ["Portfolio action", "Efficacy / futility", "Safety"]);
  assert.deepEqual(editorial?.lenses.map((item) => item.nctId), ["NCT03530683", "NCT03642132", "NCT05510245"]);
});

test("status comparison publishes exact shares and the two-step reading guide", async () => {
  const [rows, meta] = await Promise.all([loadIndexServer(), loadMetaServer()]);
  const page = buildReferencePage("status", rows, meta);
  const statuses = ["TERMINATED", "WITHDRAWN", "SUSPENDED"];
  const expectedRows = statuses.map((status) => {
    const members = rows.filter((row) => (row.overall_status || "").toUpperCase() === status);
    const biological = members.filter((row) => {
      const bucket = reasonBucket(row).toUpperCase();
      return isLikelyScientificFailure(row) || bucket === "EFFICACY/FUTILITY" || bucket === "SAFETY";
    }).length;
    return [
      status[0] + status.slice(1).toLowerCase(),
      members.length,
      biological,
      members.length ? `${((biological / members.length) * 100).toFixed(1)}%` : "0.0%",
    ];
  });
  assert.deepEqual(page.rows.map((row) => [row.label, row.total, row.biological, row.share]), expectedRows);
  assert.equal(page.statusGuide?.steps.length, 2);
  assert.deepEqual(page.statusGuide?.examples.map((item) => item.nctId), ["NCT05256134", "NCT05042934", "NCT03875144"]);
});

test("futility guide is hydrated from the current efficacy evidence slice", async () => {
  const stats = await buildInsightStats();
  const page = hydrateSeoLandingPage(SEO_LANDING_PAGES.clinicalTrialFutility, stats);
  const efficacy = stats.signalComparison.efficacy;
  assert.equal(page.h1, "Clinical trial futility: a decision under uncertainty");
  assert.equal(page.dataInsights?.metrics[0]?.value, efficacy.total.toLocaleString("en-US"));
  assert.equal(
    page.dataInsights?.metrics[1]?.value,
    (efficacy.statuses.TERMINATED || 0).toLocaleString("en-US")
  );
  assert.equal(
    page.dataInsights?.distributions[0]?.items[1]?.value,
    (efficacy.statuses.WITHDRAWN || 0).toLocaleString("en-US")
  );
});
