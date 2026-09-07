import assert from "node:assert/strict";
import test from "node:test";
import { filterRows } from "../lib/filtering";
import { decodeState, encodeState, resetExploreState } from "../lib/urlState";
import type { TrialIndexRow, UrlState } from "../lib/types";

const sponsor = "Chia Tai Tianqing Pharmaceutical Group Co., Ltd.";
const rows: TrialIndexRow[] = [
  { nct_id: "NCT00000001", lead_sponsor: sponsor },
  { nct_id: "NCT00000002", lead_sponsor: "Another sponsor" },
];

test("sponsor links preserve comma-containing names and their filter results", () => {
  // Sponsor hubs and trial pages also construct this single-value URL directly.
  const state = decodeState(`/explore?sponsor=${encodeURIComponent(sponsor)}`);
  assert.deepEqual(state.sponsor, [sponsor]);
  assert.deepEqual(filterRows(rows, state), [rows[0]]);
  assert.deepEqual(filterRows(rows, decodeState(`/explore${encodeState(state)}`)), [rows[0]]);
});

test("multiple entity facets round-trip without splitting names or losing values", () => {
  const entities = {
    sponsor: [sponsor, "Research & Development, Inc."],
    intervention: ["Drug A, extended release", "NaCl 0.9% + placebo"],
    condition: ["Carcinoma, Non-Small-Cell Lung", "Diabetes"],
    country: ["Korea, Republic of", "Germany"],
  };
  const encoded = encodeState(entities);
  const decoded = decodeState(`/explore${encoded}`);
  const params = new URLSearchParams(encoded);
  for (const key of ["sponsor", "intervention", "condition", "country"] as const) {
    assert.deepEqual(params.getAll(key), entities[key]);
    assert.deepEqual(decoded[key], entities[key]);
  }
});

test("repeated sponsor filters retain OR semantics", () => {
  const state = decodeState(`/explore${encodeState({ sponsor: rows.map((row) => row.lead_sponsor!) })}`);
  assert.deepEqual(filterRows(rows, state), rows);
});

test("existing CSV vocabulary facets and comparison links stay compatible", () => {
  const state = decodeState("/explore?status=TERMINATED,SUSPENDED&phase=PHASE1,PHASE2&area=Oncology,Neurology&bucket=SAFETY,ENROLLMENT&compare=NCT1,NCT2,NCT3,NCT4,NCT5,NCT6");
  assert.deepEqual(state.status, ["TERMINATED", "SUSPENDED"]);
  assert.deepEqual(state.phase, ["PHASE1", "PHASE2"]);
  assert.deepEqual(state.area, ["Oncology", "Neurology"]);
  assert.deepEqual(state.bucket, ["SAFETY", "ENROLLMENT"]);
  assert.deepEqual(state.compare, ["NCT1", "NCT2", "NCT3", "NCT4", "NCT5"]);
  assert.deepEqual(decodeState(`/explore${encodeState(state)}`), state);
});

test("empty entity values do not create active filters", () => {
  const state = decodeState("/explore?sponsor=&sponsor=%20&intervention=&condition=&country=");
  for (const key of ["sponsor", "intervention", "condition", "country"] as const) {
    assert.equal(state[key], undefined);
  }
  assert.equal(encodeState(state), "");
});

test("Reset clears every filter, including hidden facets, after URL state merging", () => {
  const state: UrlState = {
    q: "unmatched search",
    status: ["TERMINATED"],
    phase: ["PHASE3"],
    area: ["Oncology"],
    bucket: ["SAFETY"],
    sponsor: [sponsor],
    intervention: ["unmatched drug"],
    condition: ["unmatched condition"],
    country: ["Germany"],
    bio: true,
    date_from: "2026-01-01",
    date_to: "2026-09-01",
    sort: "sponsor_asc",
    trial: rows[0].nct_id,
    compare: rows.map((row) => row.nct_id),
  };
  assert.equal(filterRows(rows, state).length, 0);
  const reset = { ...state, ...resetExploreState(state) };
  assert.equal(encodeState(reset), "?sort=date_desc");
  assert.deepEqual(filterRows(rows, decodeState(`/explore${encodeState(reset)}`)), rows);
  assert.deepEqual(state.sponsor, [sponsor]);
});
