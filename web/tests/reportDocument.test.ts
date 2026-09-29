// What a buyer receives: one report, main chapter first, every further chapter explained.
//
// A report bought for BCMA once opened with the Microtubule cohort — 1,900 taxane trials — because
// it was the largest, and nothing said it was there only for an anti-BCMA ADC with a tubulin payload.

import assert from "node:assert/strict";
import test from "node:test";

import { chaptersFor, renderReportDocument } from "../lib/server/reportDocument";
import { cohortsForAsset } from "../lib/server/grants";

test("a target's own cohort is the main chapter and comes first", () => {
  const { slugs } = cohortsForAsset("BCMA");
  assert.ok(slugs.includes("oncology-bcma"));
  const chapters = chaptersFor(slugs, "BCMA");
  assert.equal(chapters[0].slug, "oncology-bcma");
  assert.equal(chapters[0].role, "main");
  assert.equal(chapters[0].reason, "");
});

test("a further chapter says which failed molecule put it in the report", () => {
  const { slugs } = cohortsForAsset("BCMA");
  const further = chaptersFor(slugs, "BCMA").filter((c) => c.role === "further");
  assert.ok(further.length > 0);
  for (const chapter of further) {
    assert.match(chapter.reason, /^Included because /);
  }
  assert.ok(further.some((c) => /Belantamab/i.test(c.reason)));
});

test("the downloadable document has a cover, contents and every chapter", () => {
  const { slugs } = cohortsForAsset("BCMA");
  const { html, title } = renderReportDocument({
    slugs, asset: "BCMA", preparedFor: "Acme Bio", issuedAt: "2026-09-29T10:00:00Z", release: "2026-09-28",
  });
  assert.match(title, /Diligence report/);
  assert.match(html, /class="cover"/);
  assert.match(html, /Acme Bio/);
  assert.equal((html.match(/<section class="chapter"/g) || []).length, slugs.length);
  assert.ok(!html.includes("<!--ASSET_COMPARISON-->"));
  assert.ok(!html.includes("window.print"));
  const printable = renderReportDocument({ slugs, asset: "BCMA", preparedFor: "", issuedAt: "", release: "x", print: true });
  assert.ok(printable.html.includes("window.print"));
});
