import assert from "node:assert/strict";
import test from "node:test";

import { countryScaleSignalSlice } from "../lib/insightStats";
import type { TrialIndexRow } from "../lib/types";

function rowsFor(
  prefix: string,
  total: number,
  biological: number,
  countries: string,
): TrialIndexRow[] {
  return Array.from({ length: total }, (_, index) => ({
    nct_id: `${prefix}${index}`,
    phases: "PHASE2",
    disease_area: "Oncology",
    countries,
    classification_final_outcome: index < biological ? "BIOLOGICAL_FAILURE" : "NON_BIOLOGICAL",
    classification_final_category: index < biological ? "EFFICACY_FUTILITY" : "RECRUITMENT",
  }));
}

test("country-scale statistics use exclusive bands and retain matched phase-area comparisons", () => {
  const rows = [
    ...rowsFor("S", 100, 10, "United States"),
    ...rowsFor("M", 20, 4, "United States; Canada; France"),
    ...rowsFor("L", 50, 20, "United States; Canada; France; Germany; Spain"),
    ...rowsFor("U", 5, 0, ""),
  ];

  const summary = countryScaleSignalSlice(rows);
  const bands = new Map(summary.bands.map((band) => [band.key, band]));

  assert.deepEqual(
    [...bands.values()].map((band) => band.total),
    [5, 100, 20, 50],
  );
  assert.equal(bands.get("single")?.biologicalShare, "10.0%");
  assert.equal(bands.get("fivePlus")?.biologicalShare, "40.0%");
  assert.equal(summary.areaComparisons[0].label, "Oncology");
  assert.equal(summary.matchedComparisons[0].phase, "Phase II");
  assert.equal(summary.matchedComparisons[0].single.total, 100);
  assert.equal(summary.matchedComparisons[0].fivePlus.total, 50);
});

