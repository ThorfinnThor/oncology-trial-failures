import assert from "node:assert/strict";
import test from "node:test";

import {
  REPORT_ONLY_FEATURES,
  approvedDecisionForUrl,
  planSeoIndexingState,
  readSeoIndexingFeatures,
  resolveSeoIndexingPolicy,
  type SeoIndexingState,
} from "../lib/seoIndexingPolicy";

const currentHub: SeoIndexingState = {
  httpStatus: 200,
  robots: "index,follow",
  canonical: "https://clinicaltrialfailures.com/failures/ophthalmology",
  sitemap: true,
  redirectTo: null,
  editorialStatus: "ready",
};

test("report mode reads the Luna approval without changing effective output", () => {
  const result = resolveSeoIndexingPolicy("/failures/ophthalmology", currentHub);
  assert.equal(result.approvedDecision, "KEEP_INDEX");
  assert.equal(result.reportOnly, true);
  assert.equal(result.applied, false);
  assert.deepEqual(result.effective, currentHub);
  assert.equal(result.approval?.reviewer, "Luna");
  assert.equal(result.templateVariant, "current");
});

test("unapproved URLs default to REVIEW_HOLD and preserve current behavior", () => {
  const result = resolveSeoIndexingPolicy("/not-reviewed", currentHub);
  assert.equal(result.approvedDecision, "REVIEW_HOLD");
  assert.equal(result.approval, null);
  assert.deepEqual(result.planned, currentHub);
  assert.deepEqual(result.effective, currentHub);
});

test("protected control URLs stay on REVIEW_HOLD", () => {
  const approval = approvedDecisionForUrl("/failures/cardiovascular");
  assert.equal(approval?.decision, "REVIEW_HOLD");
  assert.equal(approval?.protected, true);
});

test("resource validity takes priority over an indexing approval", () => {
  const missing = { ...currentHub, httpStatus: 404 };
  const result = resolveSeoIndexingPolicy("/failures/ophthalmology", missing);
  assert.deepEqual(result.planned, missing);
  assert.match(result.notes.join(" "), /Resource validity/);
});

test("feature parsing rejects invalid or inconsistent active configurations", () => {
  assert.throws(
    () => readSeoIndexingFeatures({ SEO_INDEXING_REPORT_MODE: "maybe" }),
    /must be true or false/
  );
  assert.throws(
    () => readSeoIndexingFeatures({ SEO_INDEXING_REPORT_MODE: "false", SEO_INDEXING_NOINDEX_LIST: "true" }),
    /require the registry sitemap switch/
  );
  assert.throws(
    () => readSeoIndexingFeatures({
      SEO_INDEXING_REPORT_MODE: "false",
      SEO_INDEXING_REGISTRY_SITEMAP: "true",
      SEO_INDEXING_CANONICAL_DUPLICATES: "true",
    }),
    /requires the index directives switch/
  );
  assert.deepEqual(readSeoIndexingFeatures({}), REPORT_ONLY_FEATURES);
});

test("the pilot template switch is independent and URL-scoped", () => {
  const features = readSeoIndexingFeatures({
    SEO_INDEXING_REPORT_MODE: "false",
    SEO_INDEXING_PILOT_TEMPLATES: "true",
  });
  const pilot = resolveSeoIndexingPolicy("/failures/ophthalmology", currentHub, features);
  const control = resolveSeoIndexingPolicy("/failures/cardiovascular", currentHub, features);
  assert.equal(pilot.templateVariant, "pilot");
  assert.equal(control.templateVariant, "current");
  assert.deepEqual(control.effective, currentHub);
});

test("thin-content noindex is reportable and uses the same safe 200/noindex plan", () => {
  const planned = planSeoIndexingState("NOINDEX_THIN_CONTENT", currentHub, currentHub.canonical || "https://clinicaltrialfailures.com/not-reviewed", null);
  assert.equal(planned.httpStatus, 200);
  assert.equal(planned.robots, "noindex,follow");
  assert.equal(planned.sitemap, false);
  assert.equal(planned.editorialStatus, "improve");
});

test("approved thin-content trial stays unchanged in report mode and can activate atomically", () => {
  const url = "/trial/NCT01965600-a-study-to-evaluate-the-safety-and-effects-on-the-body-of-an-investigational-dru";
  const current: SeoIndexingState = {
    httpStatus: 200,
    robots: "index,follow",
    canonical: `https://clinicaltrialfailures.com${url}`,
    sitemap: true,
    redirectTo: null,
    editorialStatus: "ready",
  };
  const report = resolveSeoIndexingPolicy(url, current);
  assert.equal(report.approvedDecision, "NOINDEX_THIN_CONTENT");
  assert.equal(report.approval?.reviewer, "Luna");
  assert.equal(report.planned.robots, "noindex,follow");
  assert.equal(report.planned.sitemap, false);
  assert.deepEqual(report.effective, current);

  const active = resolveSeoIndexingPolicy(url, current, readSeoIndexingFeatures({
    SEO_INDEXING_REPORT_MODE: "false",
    SEO_INDEXING_REGISTRY_SITEMAP: "true",
    SEO_INDEXING_NOINDEX_LIST: "true",
  }));
  assert.equal(active.effective.httpStatus, 200);
  assert.equal(active.effective.robots, "noindex,follow");
  assert.equal(active.effective.sitemap, false);
  assert.equal(active.applied, true);
});
