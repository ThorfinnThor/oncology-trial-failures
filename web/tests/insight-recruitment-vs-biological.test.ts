import assert from "node:assert/strict";
import test from "node:test";

import { atlasAreaHash } from "../lib/atlas";
import { recruitmentVsBiologicalSlice } from "../lib/insightStats";
import { getInsightBySlug, type InsightStats } from "../lib/insights";
import type { TrialIndexRow } from "../lib/types";

const SLUG = "recruitment-vs-efficacy-clinical-trial-stops-by-disease-area";

function rows(area: string, counts: Record<string, number>): TrialIndexRow[] {
  const kinds: Record<string, [string, string]> = {
    recruitment: ["NON_BIOLOGICAL", "RECRUITMENT"],
    efficacy: ["BIOLOGICAL_FAILURE", "EFFICACY_FUTILITY"],
    safety: ["BIOLOGICAL_FAILURE", "SAFETY"],
    business: ["NON_BIOLOGICAL", "FUNDING"],
    unclear: ["UNRESOLVED", "UNRESOLVED_MISSING_STOP_REASON"],
  };
  return Object.entries(counts).flatMap(([kind, count]) =>
    Array.from({ length: count }, (_, i) => ({
      nct_id: `${area}-${kind}-${i}`,
      disease_area: area,
      classification_final_outcome: kinds[kind][0],
      classification_final_category: kinds[kind][1],
    })),
  );
}

const data = [
  ...rows("Cardiovascular", { recruitment: 100, efficacy: 15, safety: 5, business: 60, unclear: 40 }),
  ...rows("Neurology", { recruitment: 60, efficacy: 40, safety: 10, business: 50, unclear: 60 }),
  ...rows("Ophthalmology", { recruitment: 20, efficacy: 30, safety: 10, business: 5 }),
  ...rows("Other", { recruitment: 300 }),
];

test("areas are counted with the atlas groups and ordered by recruitment-to-biological ratio", () => {
  const slice = recruitmentVsBiologicalSlice(data, 50);
  assert.deepEqual(slice.areas.map((a) => a.label), ["Cardiovascular", "Neurology", "Ophthalmology"]);
  const cv = slice.areas[0];
  assert.deepEqual([cv.total, cv.recruitment, cv.efficacy, cv.safety, cv.biological, cv.unclear], [220, 100, 15, 5, 20, 40]);
  assert.equal(slice.overall.total, data.length);
  assert.equal(slice.overall.recruitment, 480);
});

test("small areas and the catch-all Other are left out", () => {
  assert.deepEqual(recruitmentVsBiologicalSlice(data, 100).areas.map((a) => a.label), ["Cardiovascular", "Neurology"]);
});

test("the article states the numbers and does not claim 'everywhere' when an area breaks the pattern", () => {
  const stats = { recruitmentVsBiological: recruitmentVsBiologicalSlice(data, 50) } as InsightStats;
  const article = getInsightBySlug(SLUG, stats)!;
  assert.match(article.facts[0], /^480 of 805 stopped trials/, article.facts[0]);
  assert.match(article.dek, /not in Ophthalmology/);
  assert.equal(article.sections[1].heading, "Recruitment comes first almost everywhere");
  assert.equal(article.tables[0].rows[0][0], "Cardiovascular (220)");
  assert.match(article.tables[0].rows[0][1], /\(5\.0 to 1\)$/);
  assert.ok(article.links.some((link) => link.href === "/atlas#cardiovascular"));
  assert.equal(article.faqs.length, 3);
});

test("atlas links use the same fragment as the atlas page", () => {
  assert.equal(atlasAreaHash("Gastroenterology & Hepatology"), "gastroenterology-and-hepatology");
  assert.equal(atlasAreaHash("Hematology (non-onc)"), "hematology-non-onc");
});
