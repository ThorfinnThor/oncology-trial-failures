// What a link opens, and what it must not.
//
// The boundary is enforced in one module because it used to be decided in three routes, and a
// paid boundary with three implementations has three different answers. These tests are the
// cheapest place to notice that a grant has quietly started opening more than it was sold.

import assert from "node:assert/strict";
import test from "node:test";

import { cohortsForAsset, grantCovers, grantedSlugs, PACKAGES } from "../lib/server/grants";

test("an order for a molecule covers every cohort that shares its target, and no others", () => {
  const { matches, slugs } = cohortsForAsset("osimertinib");
  assert.ok(slugs.includes("oncology-egfr"), "an EGFR inhibitor must cover the EGFR cohort");
  assert.ok(slugs.length >= 2, "and the other cohorts where an EGFR drug failed");
  for (const match of matches) {
    assert.ok(
      match.same_target_and_modality + match.same_target > 0,
      `${match.slug} was included without sharing a target`,
    );
  }
  // Sharing only a pathway or only a modality is not what the price says is covered.
  assert.ok(!slugs.includes("oncology-microtubule") || matches.find((m) => m.slug === "oncology-microtubule")!.same_target > 0);
});

test("a molecule nothing shares a target with buys nothing", () => {
  const { slugs } = cohortsForAsset("aspirin");
  assert.deepEqual(slugs, [], "aspirin should not open any cohort");
});

test("a query that resolves to nothing buys nothing either", () => {
  assert.deepEqual(cohortsForAsset("XYZ-999 preclinical").slugs, []);
  assert.deepEqual(cohortsForAsset("").slugs, []);
});

test("a target can be ordered as well as a molecule", () => {
  const { slugs } = cohortsForAsset("EGFR");
  assert.ok(slugs.includes("oncology-egfr"));
});

test("full access opens the catalogue; a molecule order does not", () => {
  const all = grantedSlugs({ scope: "all" });
  assert.equal(all.length, Object.keys(PACKAGES).length);

  const molecule = { scope: "molecule" as const, slugs: ["oncology-egfr"] };
  assert.deepEqual(grantedSlugs(molecule), ["oncology-egfr"]);
  assert.equal(grantCovers(molecule, "oncology-egfr"), true);
  assert.equal(grantCovers(molecule, "oncology-pd-l-1"), false, "a molecule order must not open the catalogue");
});

test("an absent, empty or unknown grant opens nothing", () => {
  assert.deepEqual(grantedSlugs(null), []);
  assert.deepEqual(grantedSlugs({}), []);
  assert.deepEqual(grantedSlugs({ scope: "molecule", slugs: ["no-such-cohort"] }), []);
  assert.equal(grantCovers(null, "oncology-egfr"), false);
  assert.equal(grantCovers({ scope: "molecule", slugs: [] }, "oncology-egfr"), false);
});

test("the single-cohort grants issued before molecules existed still work", () => {
  assert.equal(grantCovers({ slug: "oncology-egfr" }, "oncology-egfr"), true);
  assert.equal(grantCovers({ slug: "oncology-egfr" }, "oncology-her2"), false);
  assert.equal(grantCovers({ slug: "any" }, "oncology-her2"), true, '"any" was the old whole-catalogue grant');
});
