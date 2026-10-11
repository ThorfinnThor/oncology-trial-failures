import assert from "node:assert/strict";
import test from "node:test";

import { buildInsightStats } from "../lib/insightStats";
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
  assert.deepEqual(page.rows.map((row) => [row.label, row.total, row.biological, row.share]), [
    ["Terminated", 16379, 2277, "13.9%"],
    ["Withdrawn", 6887, 110, "1.6%"],
    ["Suspended", 602, 27, "4.5%"],
  ]);
  assert.equal(page.statusGuide?.steps.length, 2);
  assert.deepEqual(page.statusGuide?.examples.map((item) => item.nctId), ["NCT05256134", "NCT05042934", "NCT03875144"]);
});

test("futility guide is hydrated from the current efficacy evidence slice", async () => {
  const stats = await buildInsightStats();
  const page = hydrateSeoLandingPage(SEO_LANDING_PAGES.clinicalTrialFutility, stats);
  assert.equal(page.h1, "Clinical trial futility: a decision under uncertainty");
  assert.equal(page.dataInsights?.metrics[0]?.value, "1,617");
  assert.equal(page.dataInsights?.metrics[1]?.value, "1,551");
  assert.equal(page.dataInsights?.distributions[0]?.items[1]?.value, "57");
});
