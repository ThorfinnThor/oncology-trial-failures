// The table a buyer opens in Excel.
//
// Two things can go wrong here and both are silent: a cohort that has no rows at all, so the
// download is empty and the report it came with looks like a lie; and a registry title that
// Excel reads as a formula, which turns a data file into a script someone opens without
// thinking.

import assert from "node:assert/strict";
import test from "node:test";

import { cohortCsv, cohortRowCount, hasTrials } from "../lib/server/cohortCsv";
import { PACKAGES } from "../lib/server/grants";

test("every cohort that is sold has a table behind it", () => {
  const missing = Object.keys(PACKAGES).filter((slug) => !hasTrials(slug) || cohortRowCount(slug) === 0);
  assert.deepEqual(missing, [], `cohorts with no trial table: ${missing.join(", ")}`);
});

test("the table is the whole cohort, not the part the report had room for", () => {
  for (const [slug, pkg] of Object.entries(PACKAGES)) {
    assert.equal(
      cohortRowCount(slug),
      pkg.counts.total_in_cohort,
      `${slug}: ${cohortRowCount(slug)} rows for a cohort of ${pkg.counts.total_in_cohort}`,
    );
  }
});

test("a row carries what a denominator is for", () => {
  const csv = cohortCsv("oncology-egfr");
  assert.ok(csv);
  const [header, first] = csv.replace(/^﻿/, "").split("\r\n");
  for (const column of ["nct_id", "kind", "overall_status", "sponsor_group", "enrollment", "why_stopped",
    "stop_attribution", "registry_url"]) {
    assert.ok(header.includes(column), `the header should name ${column}`);
  }
  assert.match(first, /^NCT\d+,/);
  assert.ok(csv.includes("https://clinicaltrials.gov/study/NCT"), "every row should link its record");
  assert.ok(csv.startsWith("﻿"), "Excel needs the byte order mark to read UTF-8 without being asked");
});

test("every kind of trial is named for what it is", () => {
  const csv = cohortCsv("oncology-egfr")!;
  for (const kind of ["biological_stop", "terminated_cause_not_readable", "still_open",
    "closed_no_biological_stop", "withdrawn_never_enrolled", "status_not_updated"]) {
    assert.ok(csv.includes(`,${kind},`), `the table should contain ${kind} rows`);
  }
});

test("a withdrawn or abandoned registration is not counted as a running trial", () => {
  // "Still open" has to mean a trial that could still report. A withdrawn trial never enrolled
  // anybody and a registration nobody has touched in years is unaccounted for, not running —
  // and how much is still to come is exactly what the open list is read for.
  const rows = cohortCsv("oncology-egfr")!.replace(/^\uFEFF/, "").split("\r\n").slice(1).filter(Boolean)
    .map((line) => line.split(","));
  const kindOf = (k: string) => rows.filter((r) => r[1] === k);
  for (const row of kindOf("still_open")) {
    assert.notEqual(row[3], "WITHDRAWN", `${row[0]} is withdrawn but counted as open`);
    assert.notEqual(row[3], "UNKNOWN", `${row[0]} has an unknown status but counted as open`);
  }
  assert.ok(kindOf("withdrawn_never_enrolled").length > 0, "withdrawn registrations should be labelled");
  assert.ok(kindOf("status_not_updated").length > 0, "abandoned registrations should be labelled");
});

test("a cell cannot become a formula when the file is opened", () => {
  // Not hypothetical: registry text begins with a dash often enough, and Excel runs it.
  const csv = cohortCsv("oncology-egfr")!;
  for (const line of csv.split("\r\n").slice(1)) {
    for (const cell of line.split(",")) {
      const value = cell.replace(/^"|"$/g, "");
      assert.ok(!/^[=+@]/.test(value), `a cell starting with a formula character escaped quoting: ${cell.slice(0, 40)}`);
    }
  }
});

test("an unknown cohort yields nothing rather than an empty file", () => {
  assert.equal(cohortCsv("no-such-cohort"), null);
  assert.equal(hasTrials("no-such-cohort"), false);
});
