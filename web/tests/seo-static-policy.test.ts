import assert from "node:assert/strict";
import test from "node:test";

import {
  STATIC_NOINDEX_DECISIONS,
  includeStaticPathInSitemap,
  staticRobotsForPath,
} from "../lib/seoStaticPolicy";

test("approved weak and utility pages are noindex and absent from the sitemap", () => {
  assert.deepEqual(STATIC_NOINDEX_DECISIONS, {
    "/explore": "utility",
    "/asset-check": "utility",
    "/newsletter": "utility",
    "/contact": "utility",
    "/sponsor-insights": "thin_content",
  });

  for (const path of Object.keys(STATIC_NOINDEX_DECISIONS)) {
    assert.equal(staticRobotsForPath(path), "noindex,follow");
    assert.equal(includeStaticPathInSitemap(path), false);
  }
});

test("strong data, evidence, and commercial pages stay indexable", () => {
  for (const path of [
    "/",
    "/overview",
    "/validation",
    "/outliers",
    "/top-entities",
    "/briefs",
    "/pricing",
    "/packages/sample",
  ]) {
    assert.equal(staticRobotsForPath(path), "index,follow");
    assert.equal(includeStaticPathInSitemap(path), true);
  }
});
