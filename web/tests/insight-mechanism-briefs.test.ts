import assert from "node:assert/strict";
import test from "node:test";

import { buildInsightStats } from "../lib/insightStats";
import { getInsightBySlug } from "../lib/insights";

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
