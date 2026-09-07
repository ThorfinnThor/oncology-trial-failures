import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { loadDetail, loadIndex } from "../lib/data";
import { filterRows } from "../lib/filtering";
import type { TrialIndexRow } from "../lib/types";

test("detail shards preserve every condition and intervention from the registry", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "trial-shards-test-"));
  try {
    await mkdir(path.join(dir, "public"));
    const record = {
      nct_id: "NCT00000001",
      conditions: "Multiple Myeloma; Relapsed Multiple Myeloma; Carcinoma, Non-Small-Cell Lung",
      intervention_names: "Mirdametinib; Sirolimus; Drug A, extended release",
      countries: "United States; Germany; Korea, Republic of",
      why_stopped: "Sponsor decision",
    };
    await writeFile(path.join(dir, "public/all_stopped_trials.json"), JSON.stringify([record]));
    const generator = fileURLToPath(new URL("../scripts/generate-data-shards.mjs", import.meta.url));
    execFileSync(process.execPath, [generator], { cwd: dir });
    const [detail] = JSON.parse(await readFile(path.join(dir, "public/trial-shards/01.json"), "utf8"));
    const [index] = JSON.parse(await readFile(path.join(dir, "public/trials-index-shards/0.json"), "utf8"));
    assert.equal(detail.conditions, record.conditions);
    assert.equal(detail.intervention_names, record.intervention_names);
    assert.equal(detail.why_stopped, record.why_stopped);
    assert.equal(index.condition_first, "Multiple Myeloma");
    assert.equal(index.intervention_first, "Mirdametinib");
    assert.equal(index.conditions, record.conditions);
    assert.equal(index.intervention_names, record.intervention_names);
    assert.equal(index.countries, record.countries);
    assert.equal(detail.countries, record.countries);

    assert.deepEqual(filterRows([index], { country: ["germany"] }), [index]);
    assert.deepEqual(filterRows([index], { condition: [" relapsed   multiple myeloma "] }), [index]);
    assert.deepEqual(filterRows([index], { intervention: ["sirolimus"] }), [index]);
    assert.deepEqual(filterRows([index], { q: "Relapsed Multiple Myeloma" }), [index]);
    assert.deepEqual(filterRows([index], { q: "sirolimus" }), [index]);
    assert.deepEqual(filterRows([index], {
      country: ["Korea, Republic of"],
      condition: ["Carcinoma, Non-Small-Cell Lung"],
      intervention: ["Drug A, extended release"],
    }), [index]);
    assert.deepEqual(filterRows([index], { intervention: ["not present", "Sirolimus"] }), [index]);
    assert.deepEqual(filterRows([index], { intervention: ["Sirolimus"], country: ["France"] }), []);
    assert.deepEqual(filterRows([index], { condition: ["Relapsed"] }), []);
    assert.deepEqual(filterRows([index], { intervention: ["Drug A"] }), []);
    assert.deepEqual(filterRows([index], { country: ["Republic of"] }), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("legacy JSON loading retains array-valued countries and full entities", async (t) => {
  const record = {
    nct_id: "NCT00000002",
    conditions: ["First condition", "Second condition"],
    intervention_names: ["First drug", "Second drug"],
    countries: ["United States", "Germany"],
  };
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    if (String(input) === "/all_stopped_trials.json") {
      return new Response(JSON.stringify([record]), { status: 200 });
    }
    return new Response("Not found", { status: 404 });
  });
  const rows = await loadIndex();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].condition_first, "First condition");
  assert.equal(rows[0].intervention_first, "First drug");
  assert.equal(rows[0].conditions, "First condition; Second condition");
  assert.equal(rows[0].intervention_names, "First drug; Second drug");
  assert.equal(rows[0].countries, "United States; Germany");
  assert.deepEqual(filterRows(rows, {
    condition: ["Second condition"], intervention: ["Second drug"], country: ["Germany"],
  }), rows);
  assert.deepEqual(filterRows(rows, { q: "Second drug" }), rows);
  const detail = await loadDetail(record.nct_id);
  assert.equal(detail?.conditions, rows[0].conditions);
  assert.equal(detail?.intervention_names, rows[0].intervention_names);
});

test("first-only indexes still support entity filters and search", () => {
  const rows: TrialIndexRow[] = [{
    nct_id: "NCT00000003", condition_first: "First condition", intervention_first: "First drug",
  }];
  assert.deepEqual(filterRows(rows, { condition: ["First condition"], intervention: ["First drug"] }), rows);
  assert.deepEqual(filterRows(rows, { q: "First drug" }), rows);
  assert.deepEqual(filterRows(rows, { country: ["Germany"] }), []);
});
