// web/lib/server/cohortCsv.ts
//
// The cohort as a table, because the document is a report and a report is not where anyone does
// their own work. A buyer who paid for a denominator wants to sort it, filter it and paste it
// into their own model — and if we do not give them that, the first thing they do is rebuild the
// cohort by hand from the registry, which is the work they paid us not to do.
//
// The rows are stored compactly, one array per trial, because they are bundled into the Worker
// and a Worker has a hard limit on its size.

import trials from "@/data/private/cohort_trials.json";

type Store = { columns: string[]; cohorts: Record<string, (string | number | null)[][]> };
const DATA = trials as unknown as Store;

export function hasTrials(slug: string): boolean {
  return Array.isArray(DATA.cohorts[slug]);
}

export function cohortRowCount(slug: string): number {
  return (DATA.cohorts[slug] || []).length;
}

function cell(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  // Excel reads a leading =, +, - or @ as a formula. A registry title beginning with one is not
  // a formula, and a spreadsheet that runs it is a real vulnerability in a file people open
  // without thinking.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** RFC 4180, with a BOM so Excel opens UTF-8 without being asked twice. */
export function cohortCsv(slug: string): string | null {
  const rows = DATA.cohorts[slug];
  if (!rows) return null;
  const header = [...DATA.columns, "registry_url"];
  const lines = [header.join(",")];
  for (const row of rows) {
    const nct = String(row[0] ?? "");
    lines.push([...row.map(cell), cell(nct ? `https://clinicaltrials.gov/study/${nct}` : "")].join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}
