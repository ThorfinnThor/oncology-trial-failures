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

const TREND = "business-decisions-overtake-recruitment-as-clinical-trial-stop-reason";
const trend = (rows: TrialIndexRow[], asOf = 2026) =>
  getInsightBySlug(TREND, { stopReasonsByYear: stopReasonsByYearSlice(rows, asOf, 2015, 50) } as InsightStats)!;
const withdrawn = (y: number, count: number) =>
  make("business", count, { overall_status: "WITHDRAWN", completion_date: `${y}-06-01` });

test("withdrawn trials count in the first table only, and each view gets its own crossover year", () => {
  // 2017: recruitment 40, business 20 terminated + 30 withdrawn = 50
  const rows = [...yearRows, ...withdrawn(2017, 30)];
  const slice = stopReasonsByYearSlice(rows, 2026, 2015, 50);
  assert.equal(slice.years[2].counts.business, 50);
  assert.equal(slice.terminatedYears[2].counts.business, 20);
  assert.equal(slice.years[2].counts.businessFunding, 50);
  assert.equal(slice.years[2].total, 100, "the business parts are not added to the total");
  const article = trend(rows);
  assert.match(article.facts[3], /all stopped trials.*every year since 2017.*terminated trials alone.*since 2018/);
  assert.equal(article.tables.length, 2);
});

test("a lead that exists only with withdrawn trials is not claimed for terminated ones", () => {
  const rows = [...yearRows, ...year(2021, 60, 10), ...withdrawn(2021, 80)];
  const fact = trend(rows).facts[3];
  assert.match(fact, /every year since 2018/);
  assert.match(fact, /terminated trials alone, they do not lead in 2021/);
});

test("the headline claims doubling only when it holds with and without withdrawn trials", () => {
  // 14% of terminated stops in the first three years, 40% in the last three
  const doubling = [2015, 2016, 2017, 2018, 2019, 2020].flatMap((y) => year(y, 60, y < 2018 ? 10 : 40));
  assert.equal(trend(doubling).title, "Business and funding stops of drug trials have more than doubled since 2015");
  // the late years double only through withdrawn trials
  const flat = [2015, 2016, 2017, 2018, 2019, 2020].flatMap((y) => year(y, 60, 20));
  const inflated = [...flat, ...withdrawn(2018, 200), ...withdrawn(2019, 200), ...withdrawn(2020, 200)];
  assert.equal(trend(inflated).title, "How the reasons drug trials stop have changed since 2015");
});

test("only the build year is marked incomplete", () => {
  assert.match(trend(yearRows, 2020).tables[0].rows[5][0], /^2020, so far/);
  assert.match(trend(yearRows, 2026).tables[0].rows[5][0], /^2020 \(/);
});

test("with too few years the article keeps its neutral text", () => {
  const article = trend(year(2015, 60, 10));
  assert.equal(article.title, "How the reasons drug trials stop have changed since 2015");
  assert.deepEqual(article.facts, []);
});

function spans(kind: string, months: number[], extra: Partial<TrialIndexRow> = {}) {
  return months.flatMap((m) => {
    const end = new Date(Date.UTC(2020, m, 1)).toISOString().slice(0, 10);
    return make(kind, 1, { start_date: "2020-01-01", completion_date: end, primary_completion_date: end, ...extra });
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
  assert.equal(slice.terminated, 17);
  assert.equal(slice.measured, 15);
  assert.deepEqual(slice.groups.map((group) => [group.key, group.median]), [["safety", 10], ["efficacy", 28], ["recruitment", 36]]);
  assert.equal(slice.groups[0].withinYear, 3);
  assert.deepEqual(slice.byPhase, []);
});

const durationRows = [
  ...spans("safety", [2, 6, 10, 20, 30]),
  ...spans("efficacy", [10, 20, 28, 36, 44]),
  ...spans("recruitment", [12, 24, 36, 48, 60]),
  ...spans("transition", [40, 50, 60, 70, 80]),
];
function duration(rows: TrialIndexRow[], phaseMinimum = 50) {
  const stats = { timeToStop: timeToStopSlice(rows, 3, phaseMinimum) } as InsightStats;
  return getInsightBySlug("how-long-clinical-trials-run-before-they-stop", stats)!;
}
const bodyOf = (article: ReturnType<typeof duration>, heading: string) =>
  article.sections.find((section) => section.heading === heading)!.body.join(" ");

test("the time-to-stop article names the longest group, including planned ends", () => {
  const article = duration(durationRows);
  assert.equal(article.title, "Safety stops have the shortest median run among terminated drug trials");
  assert.match(bodyOf(article, "By stop reason"), /The longest is planned end or replaced \(60 months\)/);
  assert.match(bodyOf(article, "By phase"), /No phase has enough trials/);
  assert.equal(article.tables.length, 1);
  assert.equal(article.tables[0].rows.length, 4);
});

test("no ranking is claimed when safety ties or the second date disagrees", () => {
  const neutral = "How long drug trials ran before they were terminated, by stop reason";
  const tied = duration([...durationRows, ...spans("operational", [2, 6, 10, 20, 30])]);
  assert.equal(tied.title, neutral);
  assert.doesNotMatch(bodyOf(tied, "By stop reason"), /shortest/);
  const disagreeing = duration([
    ...durationRows.filter((row) => row.classification_final_category !== "SAFETY"),
    ...spans("safety", [2, 6, 10, 20, 30], { primary_completion_date: "2024-01-01" }),
  ]);
  assert.equal(disagreeing.title, neutral);
  assert.doesNotMatch(bodyOf(disagreeing, "A second date"), /shortest/);
});

test("phases where safety stops are not shortest are named", () => {
  const phase = (phases: string, safety: number) => [
    ...spans("safety", [safety, safety, safety], { phases }),
    ...["efficacy", "recruitment", "business", "operational"].flatMap((kind) => spans(kind, [20, 20, 20], { phases })),
  ];
  const article = duration([...phase("PHASE1", 10), ...phase("PHASE3", 20), ...phase("PHASE4", 5).slice(1)], 3);
  const text = bodyOf(article, "By phase");
  assert.match(text, /shortest median of the five in phase 1\. They do not in phase 3\./);
  assert.doesNotMatch(text, /phase 4/);
  assert.match(article.dek, /do not have the shortest median in phase 3\./);
  assert.deepEqual(article.tables[1].rows.map((row) => row[0]), ["Phase 1 (15)", "Phase 3 (15)"]);
});

test("the time-to-stop article makes no claim about causes or the stop date", () => {
  const article = duration(durationRows);
  const text = JSON.stringify(article);
  for (const claim of [/usually forces/, /often add sites/, /planned interim/, /is the date it stopped/, /drag on/]) assert.doesNotMatch(text, claim);
  assert.match(text, /not the date of the decision to stop/);
});
