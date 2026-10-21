import assert from "node:assert/strict";
import test from "node:test";

import { buildRelatedLinks } from "../lib/relatedLinks";
import { buildSponsorHubs, isIndexableTrial } from "../lib/seoHubs";
import { loadIndexServer } from "../lib/server-data";

// Run over the real index: the point is that no sitemap trial is left without a link from another
// trial page, and that is a property of the data, not of a fixture.
test("related links reach every indexable trial and point only at indexable trials", async () => {
  const rows = await loadIndexServer();
  const links = buildRelatedLinks(rows, []);
  const indexable = new Set(rows.filter(isIndexableTrial).map((row) => row.nct_id.toUpperCase()));
  assert.ok(indexable.size > 0);

  const linkedFrom = new Map<string, number>();
  for (const [nctId, entry] of links) {
    assert.ok(entry.similar.length <= 6, `${nctId} lists ${entry.similar.length} similar trials`);
    for (const item of entry.similar) {
      const target = item.nct_id.toUpperCase();
      assert.notEqual(target, nctId, `${nctId} links to itself`);
      assert.ok(indexable.has(target), `${nctId} links to non-indexable ${target}`);
      if (indexable.has(nctId)) linkedFrom.set(target, (linkedFrom.get(target) || 0) + 1);
    }
    assert.equal(new Set(entry.similar.map((item) => item.nct_id)).size, entry.similar.length);
  }

  // A trial alone in its disease area and stop reason has no peer to be linked from; anything
  // more than a handful of those means the grouping has gone wrong.
  const unreached = Array.from(indexable).filter((nctId) => !linkedFrom.has(nctId));
  assert.ok(unreached.length <= Math.ceil(indexable.size * 0.01), `${unreached.length} indexable trials unreached`);
});

test("a trial links to its sponsor hub only when the sponsor has one", async () => {
  const rows = await loadIndexServer();
  const hubs = new Map(buildSponsorHubs(rows).map((hub) => [hub.label, hub.path]));
  const links = buildRelatedLinks(rows, []);
  for (const row of rows.slice(0, 2000)) {
    const entry = links.get(row.nct_id.toUpperCase());
    assert.ok(entry);
    const expected = row.lead_sponsor ? hubs.get(row.lead_sponsor) : undefined;
    assert.equal(entry.sponsor?.href, expected);
  }
});

test("brief membership is read from the trials a brief lists, capped per trial", async () => {
  const rows = (await loadIndexServer()).slice(0, 3);
  const nctId = rows[0].nct_id;
  const briefs = [1, 2, 3, 4].map((n) => ({ slug: `class-${n}`, segment: `Class ${n}`, nct_ids: [nctId.toLowerCase()] }));
  const entry = buildRelatedLinks(rows, briefs).get(nctId.toUpperCase());
  assert.deepEqual(entry?.briefs.map((brief) => brief.href), ["/briefs/class-1", "/briefs/class-2", "/briefs/class-3"]);
  assert.deepEqual(buildRelatedLinks(rows, briefs).get(rows[1].nct_id.toUpperCase())?.briefs, []);
});
