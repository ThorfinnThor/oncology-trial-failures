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
  comparisonLead,
  rankMatches,
  renderComparison,
  renderUnresolved,
  resolveAsset,
  resolveSubject,
  suggest,
  summariseCohort,
  type FailedAsset,
  verdictLabel,
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

  const asset = resolveSubject("osimertinib");
  assert.ok(asset);
  const rows = compareAsset(asset, pkg.failed_assets!, pkg.area);
  assert.ok(rows.some((r) => r.verdict === "closest"), "an EGFR inhibitor should match EGFR failures");

  const delivered = pkg.html.replace(SLOT, renderComparison(asset, rows));
  assert.ok(!delivered.includes(SLOT), "the slot must not survive into the delivered document");
  assert.ok(delivered.includes("OSIMERTINIB against the molecules that failed"));
  assert.ok(delivered.includes("Same target, same modality"));

  // A target asked about without a molecule has no modality; its label must not claim one.
  assert.equal(verdictLabel({ verdict: "closest", same_modality: false }), "Same target");
  assert.equal(verdictLabel({ verdict: "closest", same_modality: true }), "Same target, same modality");
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

test("the free check reports counts, never the names it is selling", async () => {
  const bundle = (await import("../data/private/evidence_packages.json")).default as unknown as {
    packages: Record<string, any>;
  };
  const asset = resolveSubject("osimertinib");
  assert.ok(asset);

  const matches = Object.entries(bundle.packages)
    .map(([slug, pkg]) => summariseCohort(asset, { slug, ...pkg }))
    .filter((m): m is NonNullable<typeof m> => m !== null);

  assert.ok(matches.length > 0, "an EGFR inhibitor should match at least one cohort");
  const egfr = matches.find((m) => m.slug === "oncology-egfr");
  assert.ok(egfr, "the EGFR cohort should be among them");
  assert.equal(egfr.best, "closest");
  assert.ok(egfr.same_target_and_modality >= 1);
  assert.ok(egfr.molecules >= egfr.same_target_and_modality + egfr.same_target);

  // The whole point of the split: the payload must not carry what the package is paid for.
  const serialised = JSON.stringify(matches);
  for (const name of ["Erlotinib", "Cetuximab", "Afatinib", "Necitumumab"]) {
    assert.ok(!serialised.includes(name), `the free check must not name ${name}`);
  }
  assert.ok(!serialised.includes("NCT"), "the free check must not carry trial ids");
});

test("a cohort with nothing in common is left out rather than shown as a non-answer", () => {
  const asset = resolveSubject("osimertinib");
  assert.ok(asset);
  const unrelated = {
    slug: "made-up",
    cohort: "Made up",
    area: "Oncology",
    counts: { closed: 10, stopped: 2 },
    headline: { rate: 0.2, comparator_rate: 0.05 },
    failed_assets: [
      { asset: "Something else", modalities: ["Antibody"], target_genes: ["CD19"], mechanisms: [], trial_count: 2 },
    ],
  };
  assert.equal(summariseCohort(asset, unrelated), null);
});

test("matches are ranked by how close they are, not by how big the cohort is", () => {
  const rows = [
    { best: "weak", same_target_and_modality: 0, same_target: 0, stopped: 99 },
    { best: "closest", same_target_and_modality: 1, same_target: 0, stopped: 2 },
    { best: "related", same_target_and_modality: 0, same_target: 4, stopped: 50 },
  ] as any[];
  assert.deepEqual(rankMatches(rows).map((r) => r.best), ["closest", "related", "weak"]);
});

test("the asset check answers the kinds of query people actually type", () => {
  // Written down because the first version resolved molecules and nothing else: every gene, every
  // short name and every class came back "not found", which reads as a broken tool rather than as
  // a gap in an ontology. This file is the floor.
  const cases = JSON.parse(readFileSync(path.join(here, "fixtures/asset_queries.json"), "utf8"));
  const failures: string[] = [];

  for (const group of ["molecules", "codes_and_brands", "genes", "short_names", "protein_names", "classes", "with_modality"]) {
    for (const query of cases[group] as string[]) {
      const subject = resolveSubject(query);
      if (!subject) failures.push(`${group}: ${query}`);
      else if (!subject.target_genes.length && group !== "molecules") failures.push(`${group}: ${query} (no genes)`);
    }
  }
  assert.deepEqual(failures, [], `queries that should resolve but did not:\n${failures.join("\n")}`);

  for (const query of cases.should_not_resolve as string[]) {
    assert.equal(resolveSubject(query), null, `${query} should not resolve`);
  }
});

test("a modality said alongside a target is read, not thrown away", () => {
  const plain = resolveSubject("EGFR");
  const antibody = resolveSubject("EGFR antibody");
  assert.ok(plain && antibody);
  assert.deepEqual(plain.target_genes, antibody.target_genes);
  assert.equal(plain.modality, "");
  assert.equal(antibody.modality, "Antibody");
  assert.equal(resolveSubject("BCMA CAR-T")?.modality, "Cell therapy");
  assert.equal(resolveSubject("HER2 ADC")?.modality, "ADC");
});

test("a target with no modality is not told its modality differs", () => {
  const subject = resolveSubject("EGFR");
  assert.ok(subject);
  const failed: FailedAsset = {
    asset: "Erlotinib", modalities: ["Small molecule"], target_genes: ["EGFR"], mechanisms: [], trial_count: 3,
  };
  const [row] = compareAsset(subject, [failed], "Oncology");
  assert.equal(row.verdict, "closest");
  assert.equal(row.why, "same target");
});

test("a query that resolves to nothing is met with suggestions, not a dead end", () => {
  assert.ok(suggest("pembro").some((s) => /pembrolizumab/i.test(s.label)), "a prefix should suggest the molecule");
  assert.ok(suggest("amyloid").length > 0);
  assert.ok(suggest("egf").some((s) => /EGFR/i.test(s.label)));
  assert.equal(suggest("z").length, 0, "one character is not a query");
});

test("the ChEMBL modality vocabulary is translated into the cohorts'", () => {
  // ChEMBL says "Antibody drug conjugate", "Cell" and "Gene"; the cohorts say "ADC", "Cell
  // therapy" and "Gene therapy". Comparing the two directly meant an ADC under review never
  // matched an ADC that failed.
  assert.equal(resolveSubject("trastuzumab deruxtecan")?.modality, "ADC");
  assert.equal(resolveSubject("tisagenlecleucel")?.modality, "Cell therapy");
});

test("a class we track answers even when no rate was published for it", async () => {
  // The failure this exists to fix: a CD19 developer, with hundreds of CD19 trials in the
  // dataset, was told nothing in our data looked like their asset — because a brief had not been
  // published for the class, and the comparison read the packages rather than the classes.
  const { coverageFor } = await import("../lib/server/classCoverage");
  for (const query of ["KRAS", "CD19", "TROP-2", "IL-17"]) {
    const subject = resolveSubject(query);
    assert.ok(subject, `${query} should resolve`);
    const matches = coverageFor(subject);
    const own = matches.filter((m) => m.by === "class");
    assert.ok(own.length > 0, `${query}: we track this class and should say so`);
    assert.ok(own[0].counts.total_in_cohort > 0, `${query}: the counts should be real`);
    assert.equal(own[0].rate, null, `${query}: no brief was published, so no rate may be quoted`);
    assert.equal(own[0].slug, null, `${query}: there is nothing to sell here`);
  }
});

test("a class with a published rate still carries one, and a package", async () => {
  const { coverageFor } = await import("../lib/server/classCoverage");
  const matches = coverageFor(resolveSubject("osimertinib")!);
  const egfr = matches.find((m) => m.cohort === "EGFR");
  assert.ok(egfr);
  assert.ok(typeof egfr.rate === "number" && egfr.rate > 0);
  assert.equal(egfr.slug, "oncology-egfr");
  assert.ok(egfr.same_target_and_modality > 0);
});

test("the combination cohorts are not lost when classes take over", async () => {
  const { coverageFor } = await import("../lib/server/classCoverage");
  const matches = coverageFor(resolveSubject("pembrolizumab")!);
  assert.ok(
    matches.some((m) => m.cohort.includes("+") && m.slug),
    "a combination cohort is sold but is not a plain class; it must still appear",
  );
});

test("a target bought without a molecule is never said to share a modality", () => {
  const subject = resolveSubject("BCMA");
  assert.ok(subject, "BCMA should resolve as a target");
  assert.equal(subject!.modality || "", "", "a bare target carries no modality");
  const rows = [
    { asset: "BELANTAMAB MAFODOTIN", modalities: ["Antibody"], trial_count: 3, shared_target_genes: ["TNFRSF17"],
      shared_mechanisms: [], shared_classes: [], same_modality: false, verdict: "closest" as const, why: "same target" },
  ];
  const lead = comparisonLead(subject!, rows as never);
  assert.ok(!/share its target and its modality/.test(lead), lead);
  assert.ok(/act on the same target/.test(lead), lead);
});
