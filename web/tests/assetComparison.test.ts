// Parity with the Python that builds the document.
//
// compare_asset() lives in scripts/signals/build_evidence_package.py and is what the interpretation
// text in an evidence package is written from. The TypeScript port in lib/server/assetComparison.ts
// is what actually runs when a package is delivered. Two implementations of one rule drift silently
// — the buyer would get a verdict the document's own prose contradicts — so the fixtures here are
// generated from the Python and the port is checked against them.
//
// Regenerate: see the fixture header in the commit that added it; any rule change must update both.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  classesFor,
  compareAsset,
  renderComparison,
  renderUnresolved,
  resolveAsset,
  type FailedAsset,
} from "../lib/server/assetComparison";

// The same slot string pages/api/report.ts splices into.
const SLOT = "<!--ASSET_COMPARISON-->";

const here = path.dirname(fileURLToPath(import.meta.url));
type Case = {
  slug: string;
  area: string;
  query: string;
  resolved: { asset: string; chembl_id: string; modality: string; target_genes: string[]; mechanisms: string[] } | null;
  failed: FailedAsset[];
  rows: {
    asset: string;
    verdict: string;
    why: string;
    shared_target_genes: string[];
    shared_mechanisms: string[];
    shared_classes: string[];
    same_modality: boolean;
    trial_count: number;
  }[];
};
const cases: Case[] = JSON.parse(readFileSync(path.join(here, "fixtures/asset_comparison.json"), "utf8"));

test("the molecule index resolves the same names as the Python", () => {
  for (const c of cases) {
    const got = resolveAsset(c.query);
    if (!c.resolved) {
      assert.equal(got, null, `${c.query} should not resolve`);
      continue;
    }
    assert.ok(got, `${c.query} should resolve`);
    assert.equal(got.chembl_id, c.resolved.chembl_id, `${c.query}: chembl id`);
    assert.equal(got.modality, c.resolved.modality, `${c.query}: modality`);
    assert.deepEqual(got.target_genes, c.resolved.target_genes, `${c.query}: target genes`);
  }
});

test("every verdict matches the Python that the document is written from", () => {
  let compared = 0;
  for (const c of cases) {
    if (!c.resolved) continue;
    const got = compareAsset(resolveAsset(c.query)!, c.failed, c.area);
    assert.equal(got.length, c.rows.length, `${c.slug}/${c.query}: row count`);
    for (let i = 0; i < got.length; i += 1) {
      const label = `${c.slug}/${c.query} row ${i} (${c.rows[i].asset})`;
      assert.equal(got[i].asset, c.rows[i].asset, `${label}: order`);
      assert.equal(got[i].verdict, c.rows[i].verdict, `${label}: verdict`);
      assert.equal(got[i].why, c.rows[i].why, `${label}: reason`);
      assert.deepEqual(got[i].shared_target_genes, c.rows[i].shared_target_genes, `${label}: shared targets`);
      assert.deepEqual(got[i].shared_classes, c.rows[i].shared_classes, `${label}: shared pathway`);
      assert.equal(got[i].same_modality, c.rows[i].same_modality, `${label}: modality`);
      compared += 1;
    }
  }
  assert.ok(compared > 50, `expected a real number of comparisons, got ${compared}`);
});

test("two genes on one axis are one hypothesis", () => {
  // The case this rule exists for: PD-1 and PD-L1 are different gene symbols and the same bet.
  assert.deepEqual(classesFor(["PDCD1"], "Oncology"), classesFor(["CD274"], "Oncology"));
  const pembro = resolveAsset("pembrolizumab");
  assert.ok(pembro);
  const pdl1Antibody: FailedAsset = {
    asset: "A PD-L1 antibody",
    modalities: ["Antibody"],
    target_genes: ["CD274"],
    mechanisms: [],
    trial_count: 3,
  };
  const [row] = compareAsset(pembro, [pdl1Antibody], "Oncology");
  assert.equal(row.verdict, "related");
  assert.match(row.why, /same pathway \(PD-\(L\)1\)/);
});

test("a molecule whose target we could not resolve is said to be uncomparable, not distant", () => {
  const asset = resolveAsset("osimertinib");
  assert.ok(asset);
  const unknown: FailedAsset = { asset: "Unnamed", modalities: [], target_genes: [], mechanisms: [], trial_count: 1 };
  const [row] = compareAsset(asset, [unknown], "Oncology");
  assert.equal(row.verdict, "unknown");
});

test("the delivered document really gets the section, and never keeps the empty slot", async () => {
  // Against the real prebuilt bundle, because the slot only helps if it is where the route
  // expects it and the package the buyer opens is the one that was built.
  const bundle = (await import("../data/private/evidence_packages.json")).default as unknown as {
    packages: Record<string, { area: string; html: string; failed_assets?: FailedAsset[] }>;
  };
  const pkg = bundle.packages["oncology-egfr"];
  assert.ok(pkg, "the EGFR package should be in the bundle");
  assert.ok(pkg.html.includes(SLOT), "the prebuilt document should leave the slot empty");
  assert.ok(pkg.failed_assets && pkg.failed_assets.length > 0, "the bundle should carry the failed molecules");

  const asset = resolveAsset("osimertinib");
  assert.ok(asset);
  const rows = compareAsset(asset, pkg.failed_assets!, pkg.area);
  assert.ok(rows.some((r) => r.verdict === "closest"), "an EGFR inhibitor should match EGFR failures");

  const delivered = pkg.html.replace(SLOT, renderComparison(asset, rows));
  assert.ok(!delivered.includes(SLOT), "the slot must not survive into the delivered document");
  assert.ok(delivered.includes("OSIMERTINIB against the molecules that failed"));
  assert.ok(delivered.includes("Same target, same modality"));
  assert.ok(delivered.includes("ChEMBL CHEMBL3353410"));

  // An unordered package is delivered without the section rather than with a stray comment.
  assert.ok(!pkg.html.replace(SLOT, "").includes("<!--"), "an empty slot should leave nothing behind");
});

test("a buyer whose molecule is not in the index is told so, in the document", () => {
  const html = renderUnresolved("XYZ-999 (preclinical)");
  assert.ok(html.includes("could not resolve"));
  assert.ok(html.includes("XYZ-999 (preclinical)".replace(/[()]/g, (c) => c)));
  assert.ok(!html.includes("<script"));
});

test("a molecule name cannot smuggle markup into the delivered document", () => {
  const injected = renderUnresolved('<img src=x onerror="alert(1)">');
  assert.ok(!injected.includes("<img"), "the name must be escaped");
  assert.ok(injected.includes("&lt;img"));
});
