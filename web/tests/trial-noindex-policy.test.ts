import assert from "node:assert/strict";
import test from "node:test";

import config from "../config/trial-noindex-decisions.json";
import {
  isExplicitlyNoindexTrial,
  trialNoindexDecisionForUrl,
  TRIAL_NOINDEX_DECISION_COUNT,
} from "../lib/trialNoindexPolicy";

test("the reviewed pruning registry contains exactly 791 unique trial decisions", () => {
  const counts = Object.fromEntries(config.batches.map((batch) => [batch.id, batch.nctIds.length]));
  const ids = config.batches.flatMap((batch) => batch.nctIds);

  assert.deepEqual(counts, {
    "weak-search-evidence": 17,
    "unresolved-legacy-classification": 20,
    "short-low-search-evidence": 344,
    "repeated-formulaic-low-search-evidence": 53,
    "low-search-programme-cascade": 274,
    "unclear-attribution-thin-content": 83,
  });
  assert.equal(ids.length, 791);
  assert.equal(new Set(ids).size, 791);
  assert.equal(TRIAL_NOINDEX_DECISION_COUNT, 791);
});

test("trial exclusions are stable by NCT identifier and canonical URL", () => {
  assert.equal(isExplicitlyNoindexTrial("nct04925960"), true);
  assert.equal(isExplicitlyNoindexTrial("NCT02354014"), true);
  assert.equal(isExplicitlyNoindexTrial("NCT04762771"), true, "low-search programme cascades are excluded");
  assert.equal(isExplicitlyNoindexTrial("NCT00083759"), true, "manually reviewed unclear-attribution thin pages are excluded");
  assert.equal(isExplicitlyNoindexTrial("NCT00994253"), false, "manually reviewed trials with concrete own-trial data stay indexable");
  assert.equal(isExplicitlyNoindexTrial("NCT03940690"), false);
  assert.equal(isExplicitlyNoindexTrial("NCT04191096"), false, "curated insight evidence stays indexable");
  assert.equal(isExplicitlyNoindexTrial("NCT05153408"), false, "high-impression pages stay indexable");
  assert.equal(isExplicitlyNoindexTrial("NCT03907072"), false, "top-10 pages stay indexable");

  const decision = trialNoindexDecisionForUrl(
    "https://clinicaltrialfailures.com/trial/NCT02354014-title-can-change"
  );
  assert.equal(decision?.batch, "unresolved-legacy-classification");
});
