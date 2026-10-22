import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDrugPages,
  drugCatalogEntry,
  drugLinksForRow,
  drugsForRow,
  DRUG_MIN_TRIALS,
  normaliseDrugName,
  type DrugSourceRow,
} from "../lib/drugPages";

function row(nct: string, names: string, types: string, extra: Partial<DrugSourceRow> = {}): DrugSourceRow {
  return {
    nct_id: nct,
    brief_title: `Trial ${nct}`,
    overall_status: "TERMINATED",
    phases: "PHASE2",
    lead_sponsor: "Sponsor",
    intervention_names: names,
    intervention_types: types,
    why_stopped_short: "Sponsor decision",
    completion_date: "2022-01-01",
    url: `https://clinicaltrials.gov/study/${nct}`,
    condition_first: "Major depressive disorder",
    classification_final_explanation: "Supported by explicit rule evidence.",
    ...extra,
  };
}

test("drug names lose dose, formulation and salt noise but keep the molecule", () => {
  assert.equal(normaliseDrugName("Vortioxetine 10 mg"), "vortioxetine");
  assert.equal(normaliseDrugName("Gemcitabine Hydrochloride"), "gemcitabine");
  assert.equal(normaliseDrugName("Metformin oral tablet"), "metformin");
  assert.equal(normaliseDrugName("5-Fluorouracil"), "fluorouracil");
  assert.equal(normaliseDrugName("RAC VAC GM-CSF (JX-594)"), "rac vac gm-csf");
  assert.equal(normaliseDrugName("Pembrolizumab"), "pembrolizumab");
});

test("placebo, controls, classes, regimens and combinations never become a drug", () => {
  for (const name of [
    "Placebo",
    "Matching placebo oral capsule",
    "Normal saline",
    "Standard of care",
    "Chemotherapy",
    "Carboplatin + paclitaxel",
    "Drug A and Drug B",
    "Treatment A",
    "FOLFOX",
    "Corticosteroids",
    "PD-1 antibody",
    "Phase 2",
  ]) {
    assert.equal(normaliseDrugName(name), null, name);
  }
});

test("only drug and biological interventions count, matched by position", () => {
  const drugs = drugsForRow(row("NCT00000001", "Vortioxetine; Placebo; Exercise; Surgery", "DRUG; DRUG; BEHAVIORAL; PROCEDURE"));
  assert.deepEqual(drugs.map((drug) => drug.slug), ["vortioxetine"]);

  // Collapsed types that are all drug-like: every name is accepted.
  assert.deepEqual(
    drugsForRow(row("NCT00000002", "CART123 cells; Cyclophosphamide", "BIOLOGICAL")).map((drug) => drug.slug),
    ["cart123-cells", "cyclophosphamide"]
  );
  // Names and types that do not line up and include a non-drug type: nothing is guessed.
  assert.deepEqual(drugsForRow(row("NCT00000003", "Drugx; Device y; Drugz", "DRUG; DEVICE")), []);
});

test("a drug gets a page at the threshold; indexing needs an indexable trial and two stated reasons", () => {
  const rows = [
    row("NCT00000011", "Vortioxetine 10 mg; Placebo", "DRUG; DRUG", {
      why_stopped_short: "Lack of efficacy at interim analysis",
      classification_final_outcome: "BIOLOGICAL_FAILURE",
      classification_final_category: "EFFICACY_FUTILITY",
      classification_resolution_status: "RESOLVED",
    }),
    row("NCT00000012", "vortioxetine", "DRUG", { why_stopped_short: "Recruitment was slower than planned" }),
    row("NCT00000013", "Rarelumab", "BIOLOGICAL"),
  ];
  const pages = buildDrugPages(rows);
  assert.deepEqual(pages.map((page) => page.slug), ["vortioxetine"]);
  assert.ok(DRUG_MIN_TRIALS >= 2);

  const [page] = pages;
  assert.equal(page.name, "Vortioxetine");
  assert.equal(page.path, "/drug/vortioxetine");
  assert.equal(page.total, 2);
  assert.equal(page.withStopReason, 2);
  assert.equal(page.efficacyOrSafety, 1);
  assert.equal(page.indexable, true);
  assert.equal(page.trials[0].ended, "2022-01-01");
  assert.deepEqual(page.trials.find((trial) => trial.nct_id === "NCT00000011")?.listed_with, ["Placebo"]);

  // The catalogue carries no trial list, so the A-Z page and sitemap stay small.
  assert.equal("trials" in drugCatalogEntry(page), false);
  const catalog = new Map([[page.slug, drugCatalogEntry(page)]]);
  assert.deepEqual(drugLinksForRow(rows[1], catalog), [{ label: "Vortioxetine", href: "/drug/vortioxetine" }]);
  assert.deepEqual(drugLinksForRow(rows[2], catalog), []);

  const noReasons = buildDrugPages([row("NCT00000021", "Druglumab", "DRUG", { why_stopped_short: "" }), row("NCT00000022", "Druglumab", "DRUG", { why_stopped_short: "" })]);
  assert.equal(noReasons[0].indexable, false);
});

test("a drug page never carries cohort analysis fields", () => {
  const pages = buildDrugPages([row("NCT00000031", "Abcixumab", "DRUG"), row("NCT00000032", "Abcixumab", "DRUG")]);
  const keys = new Set([...Object.keys(pages[0]), ...Object.keys(pages[0].trials[0])]);
  for (const forbidden of ["rate", "target", "cohort", "comparison", "mechanism"]) {
    assert.ok(![...keys].some((key) => key.toLowerCase().includes(forbidden)), forbidden);
  }
});
