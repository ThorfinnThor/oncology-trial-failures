import assert from "node:assert/strict";
import test from "node:test";

import briefsIndex from "../data/briefs_index.json";
import { SITEMAP_BRIEF_SLUGS, selectBriefSitemapEntries } from "../lib/briefSitemap";

test("every brief is in the sitemap unless another listed brief rests on the same trials", () => {
  const entries = selectBriefSitemapEntries(briefsIndex.briefs as any);
  const paths = new Set(entries.map((entry) => entry.path));
  assert.equal(paths.size, entries.length, "no brief is listed twice");
  for (const slug of SITEMAP_BRIEF_SLUGS) {
    if (briefsIndex.briefs.some((brief) => brief.slug === slug)) assert.ok(paths.has(`/briefs/${slug}`), slug);
  }
  assert.ok(entries.length > SITEMAP_BRIEF_SLUGS.length, "briefs beyond wave 1 are listed");
});

test("of two briefs with the same trials, the wave-1 or broader one is kept", () => {
  const brief = (slug: string, closed: number, trials: string[]) => ({
    slug,
    closed,
    failure_signature: { assets: [{ trials }] },
  });
  const entries = selectBriefSitemapEntries([
    brief("oncology-tigit-pd-l-1", 59, ["NCT1", "NCT2"]),
    brief("oncology-tigit", 60, ["NCT2", "NCT1"]),
    brief("oncology-other", 10, ["NCT3"]),
  ]);
  assert.deepEqual(entries.map((entry) => entry.path), ["/briefs/oncology-tigit", "/briefs/oncology-other"]);
});
