import assert from "node:assert/strict";
import test from "node:test";

import { stopReasonsByYearSlice, timeToStopSlice } from "../lib/insightStats";
import { getInsightBySlug, type InsightStats } from "../lib/insights";
import type { TrialIndexRow } from "../lib/types";

const KIND: Record<string, [string, string]> = {
  recruitment: ["NON_BIOLOGICAL", "RECRUITMENT"],
  business: ["NON_BIOLOGICAL", "FUNDING"],
  operational: ["NON_BIOLOGICAL", "EXTERNAL_DISRUPTION"],
  efficacy: ["BIOLOGICAL_FAILURE", "EFFICACY_FUTILITY"],
  safety: ["BIOLOGICAL_FAILURE", "SAFETY"],
  transition: ["NON_FAILURE_TRANSITION", "PLANNED_MILESTONE"],
};

let id = 0;
function make(kind: string, count: number, extra: Partial<TrialIndexRow>): TrialIndexRow[] {
  return Array.from({ length: count }, () => ({
    nct_id: `NCT${String((id += 1)).padStart(8, "0")}`,
    overall_status: "TERMINATED",
    classification_final_outcome: KIND[kind][0],
    classification_final_category: KIND[kind][1],
    ...extra,
  }));
}

function year(y: number, recruitment: number, business: number, other: Partial<Record<string, number>> = {}) {
  const date = { completion_date: `${y}-06-01` };
  return [
    ...make("recruitment", recruitment, date),
    ...make("business", business, date),
    ...Object.entries(other).flatMap(([kind, count]) => make(kind, count || 0, date)),
  ];
}

const yearRows = [
  ...year(2014, 50, 0),
  ...year(2015, 40, 10, { efficacy: 10 }),
  ...year(2016, 40, 15, { efficacy: 10 }),
  ...year(2017, 40, 20, { efficacy: 10 }),
  ...year(2018, 30, 35, { efficacy: 10 }),
  ...year(2019, 30, 40, { efficacy: 10, operational: 5 }),
  ...year(2020, 25, 30, { efficacy: 10, operational: 20 }),
  ...year(2021, 5, 1),
  ...year(2031, 50, 0),
  ...make("operational", 3, { completion_date: "2020-04-01", why_stopped_short: "Halted due to the COVID-19 pandemic" }),
];

test("stop reasons are counted per year from 2015 up to the build year, small years left out", () => {
  const slice = stopReasonsByYearSlice(yearRows, 2026, 2015, 50);
  assert.deepEqual(slice.years.map((item) => item.year), [2015, 2016, 2017, 2018, 2019, 2020]);
  assert.equal(slice.years[0].counts.recruitment, 40);
  assert.equal(slice.years[5].counts.operational, 23);
  assert.equal(slice.covidMentions, 3);
  assert.equal(slice.covidOperational, 3);
  assert.deepEqual(slice.covidByYear, [{ year: 2020, count: 3 }]);
});

test("the trend article names the first year from which business stops lead every year", () => {
  const stats = { stopReasonsByYear: stopReasonsByYearSlice(yearRows, 2026, 2015, 50) } as InsightStats;
  const article = getInsightBySlug("business-decisions-overtake-recruitment-as-clinical-trial-stop-reason", stats)!;
  assert.equal(article.title, "Business decisions now stop more clinical trials than recruitment problems");
  assert.match(article.dek, /Since 2018,/);
  assert.equal(article.tables[0].rows.length, 6);
  assert.match(article.tables[0].rows[5][0], /^2020, so far/);
  assert.match(article.sections[2].body[0], /2019 to .* in 2020/);
});

test("without a lasting crossover the trend article does not claim one", () => {
  const rows = [...yearRows, ...year(2021, 60, 10)];
  const stats = { stopReasonsByYear: stopReasonsByYearSlice(rows, 2026, 2015, 50) } as InsightStats;
  const article = getInsightBySlug("business-decisions-overtake-recruitment-as-clinical-trial-stop-reason", stats)!;
  assert.equal(article.title, "How the reasons clinical trials stop have changed since 2015");
  assert.doesNotMatch(article.dek, /Since \d{4}/);
});

function spans(kind: string, months: number[]) {
  return months.flatMap((m) => {
    const end = new Date(Date.UTC(2020, m, 1)).toISOString().slice(0, 10);
    return make(kind, 1, { start_date: "2020-01-01", completion_date: end });
  });
}

test("time to stop counts terminated trials only, in months, and drops impossible spans", () => {
  const rows = [
    ...spans("safety", [2, 6, 10, 20, 30]),
    ...spans("recruitment", [12, 24, 36, 48, 60]),
    ...spans("efficacy", [10, 20, 28, 36, 44]),
    ...make("safety", 2, { overall_status: "WITHDRAWN", start_date: "2020-01-01", completion_date: "2020-02-01" }),
    ...make("safety", 1, { start_date: "2020-05-01", completion_date: "2020-01-01" }),
    ...make("safety", 1, { start_date: "2020-05-01" }),
  ];
  const slice = timeToStopSlice(rows, 3);
  assert.equal(slice.measured, 15);
  assert.deepEqual(slice.groups.map((group) => [group.key, group.median]), [["safety", 10], ["efficacy", 28], ["recruitment", 36]]);
  assert.equal(slice.groups[0].withinYear, 3);
});

test("the time-to-stop article compares stated reasons only", () => {
  const rows = [
    ...spans("safety", [2, 6, 10, 20, 30]),
    ...spans("efficacy", [10, 20, 28, 36, 44]),
    ...spans("recruitment", [12, 24, 36, 48, 60]),
    ...spans("transition", [40, 50, 60, 70, 80]),
  ];
  const stats = { timeToStop: timeToStopSlice(rows, 3) } as InsightStats;
  const article = getInsightBySlug("how-long-clinical-trials-run-before-they-stop", stats)!;
  assert.equal(article.title, "Safety stops come first: how long clinical trials run before they stop");
  assert.match(article.dek, /stopped for too few participants run the longest/);
  assert.equal(article.sections[2].heading, "Recruitment stops drag on");
  assert.equal(article.tables[0].rows.length, 4);
});
