import assert from "node:assert/strict";
import test from "node:test";

import { buildInsightStats } from "../lib/insightStats";
import { getInsightBySlug } from "../lib/insights";

test("amyloid-beta insight compresses trial stops to molecules and programme evidence", async () => {
  const stats = await buildInsightStats();
  const brief = stats.mechanismBriefs.amyloidBetaAntibodies;
  const article = getInsightBySlug("amyloid-beta-antibody-trial-stops-programme-cascades", stats);

  assert.ok(article);
  assert.ok(article.dek.includes(`${brief.biologicalStops} of ${brief.closed}`));
  assert.ok(article.dek.includes(`${brief.molecules} antibodies`));
  assert.ok(article.facts.some((fact) => fact.includes(`${brief.stopsFromProgrammeCascade}`) && fact.includes("cascade")));
  assert.ok(article.sections.some((section) => section.heading.includes("narrower than")));
  assert.ok(article.tables.some((table) => table.heading.includes("three levels of evidence")));
  assert.ok(article.links.some((link) => link.href === `/briefs/${brief.slug}`));
  assert.ok(article.links.some((link) => link.href === "/trial/NCT02670083"));
});

test("TIGIT insight keeps stopped-trial and posted-endpoint denominators separate", async () => {
  const stats = await buildInsightStats();
  const brief = stats.mechanismBriefs.tigitPdL1;
  const article = getInsightBySlug("tigit-pd-l1-endpoints-vs-trial-stops", stats);

  assert.ok(article);
  assert.ok(article.dek.includes(`${brief.biologicalStops}`) && article.dek.includes(`${brief.closed}`));
  assert.ok(article.dek.includes(`${brief.endpointMissed}`) && article.dek.includes(`${brief.endpointReadable}`));
  assert.ok(article.sections.some((section) => section.heading.includes("both views can be true")));
  assert.ok(article.tables.some((table) => table.heading.includes("Two lenses")));
  assert.ok(article.links.some((link) => link.href === `/briefs/${brief.slug}`));
  assert.ok(article.links.some((link) => link.href.includes("NCT05014815") && link.href.includes("tab=results")));
});

test("anti-tau insight separates molecule evidence from programme cascades", async () => {
  const stats = await buildInsightStats();
  const brief = stats.mechanismBriefs.tauAntibodies;
  const article = getInsightBySlug("anti-tau-antibody-clinical-trial-stop-signals", stats);

  assert.ok(article);
  assert.ok(article.dek.includes(`${brief.biologicalStops} of ${brief.closed}`));
  assert.ok(article.dek.includes(`${brief.molecules} antibodies`));
  assert.ok(article.facts.some((fact) => fact.includes(`${brief.stopsFromProgrammeCascade}`) && fact.includes("programme")));
  assert.ok(article.sections.some((section) => section.heading.includes("independent experiments")));
  assert.ok(article.links.some((link) => link.href === `/briefs/${brief.slug}`));
  assert.ok(article.links.some((link) => link.href === "/trial/NCT03289143"));
});

test("TGF-beta plus PD-L1 insight preserves the mixed efficacy and safety signature", async () => {
  const stats = await buildInsightStats();
  const brief = stats.mechanismBriefs.tgfBetaPdL1;
  const article = getInsightBySlug("tgf-beta-pd-l1-clinical-trial-stop-signals", stats);

  assert.ok(article);
  assert.ok(article.dek.includes(`${brief.biologicalStops} of ${brief.closed}`));
  assert.ok(article.dek.includes(`${brief.efficacyStops} for efficacy`));
  assert.ok(article.dek.includes(`${brief.safetyStops} for safety`));
  assert.ok(article.sections.some((section) => section.heading.includes("therapeutic-window")));
  assert.ok(article.tables.some((table) => table.heading.includes("checkpoint-combination reference")));
  assert.ok(article.links.some((link) => link.href === `/briefs/${brief.slug}`));
});
