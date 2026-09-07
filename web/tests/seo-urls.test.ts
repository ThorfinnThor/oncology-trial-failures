import assert from "node:assert/strict";
import test from "node:test";

import { extractNctId, trialPath } from "../lib/seoUrls";

test("extractNctId preserves ID, slug, trimming, and uppercase fallback behavior", () => {
  for (const [input, expected] of [
    ["NCT01234567", "NCT01234567"],
    ["  nct01234567  ", "NCT01234567"],
    ["nct01234567-a-clinical-trial", "NCT01234567"],
    ["https://clinicaltrials.gov/study/NCT01234567", "NCT01234567"],
    ["  unknown-trial  ", "UNKNOWN-TRIAL"],
    ["", ""],
    ["   ", ""],
  ]) {
    assert.equal(extractNctId(input), expected, input);
  }
});

test("extractNctId accepts already-decoded route values with malformed percent sequences", () => {
  for (const suffix of ["100%", "%", "%2", "%GG", "%E0%A4%A", "%FF"]) {
    assert.equal(extractNctId(`nct01234567-${suffix}`), "NCT01234567");
    assert.equal(extractNctId(`  ${suffix}  `), suffix.toUpperCase());
  }
});

test("extractNctId does not decode literal percent-encoded text a second time", () => {
  assert.equal(extractNctId("  unknown%20trial  "), "UNKNOWN%20TRIAL");
  assert.equal(extractNctId("%4E%43%5401234567"), "%4E%43%5401234567");
});

test("extractNctId recovers IDs from generated trial paths after route decoding", () => {
  const path = trialPath({
    nct_id: "NCT01234567",
    brief_title: "Trial of 100% response < 5",
    condition_first: "Cancer",
    intervention_first: "Drug",
  });

  assert.equal(extractNctId(decodeURIComponent(path.slice("/trial/".length))), "NCT01234567");
});
