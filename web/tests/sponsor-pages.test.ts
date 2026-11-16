import assert from "node:assert/strict";
import test from "node:test";

import { buildSponsorHubs, buildSponsorPages, findSponsorHub } from "../lib/seoHubs";
import type { TrialIndexRow } from "../lib/types";

let serial = 0;

function sponsorRows(sponsor: string, count: number): TrialIndexRow[] {
  return Array.from({ length: count }, () => {
    serial += 1;
    const nctId = `NCT${String(serial).padStart(8, "0")}`;
    return {
      nct_id: nctId,
      brief_title: `Study ${nctId}`,
      disease_area: "Oncology",
      phases: "PHASE2",
      lead_sponsor: sponsor,
      why_stopped_short: "Sponsor decision",
      last_update_post_date: "2026-01-01",
    };
  });
}

// 148 large sponsors, four tied at the cutoff (places 149-152), one small one and one below the minimum.
const large = Array.from({ length: 148 }, (_, index) => `Large sponsor ${String(index).padStart(3, "0")}`);
const tied = ["Tied sponsor A", "Tied sponsor B", "Tied sponsor C", "Tied sponsor D"];
const rows = [
  ...large.flatMap((sponsor) => sponsorRows(sponsor, 30)),
  ...tied.flatMap((sponsor) => sponsorRows(sponsor, 26)),
  ...sponsorRows("Small sponsor", 12),
  ...sponsorRows("Tiny sponsor", 9),
];

test("sponsors tied with the last indexed sponsor are all indexed", () => {
  const hubs = buildSponsorHubs(rows);
  assert.equal(hubs.length, 152);
  for (const sponsor of tied) assert.ok(hubs.some((hub) => hub.label === sponsor), sponsor);
  assert.ok(!hubs.some((hub) => hub.label === "Small sponsor"));
});

test("every sponsor above the minimum keeps a page; only the indexed set is indexable", () => {
  const pages = buildSponsorPages(rows);
  assert.equal(pages.length, 153);
  assert.equal(pages.filter((page) => page.indexable).length, 152);
  assert.equal(pages.find((page) => page.label === "Small sponsor")?.indexable, false);
  assert.ok(!pages.some((page) => page.label === "Tiny sponsor"));
});

test("a sponsor outside the indexed set resolves to a noindex page instead of a 404", () => {
  const small = findSponsorHub(rows, "small-sponsor");
  assert.equal(small?.label, "Small sponsor");
  assert.equal(small?.indexable, false);
  assert.equal(small?.total, 12);

  assert.equal(findSponsorHub(rows, "tied-sponsor-d")?.indexable, true);
  assert.equal(findSponsorHub(rows, "tiny-sponsor"), null);
});
