import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { KEY, batches, changedUrls, ownUrls, parseSitemap, payload } from "../scripts/indexnow.mjs";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://clinicaltrialfailures.com/</loc>
    <lastmod>2026-11-16T00:00:00.000Z</lastmod>
  </url>
  <url><loc>https://clinicaltrialfailures.com/explore?a=1&amp;b=2</loc></url>
  <url>
    <loc>https://clinicaltrialfailures.com/atlas</loc>
    <lastmod>2026-11-16T00:00:00.000Z</lastmod>
  </url>
</urlset>`;

test("the sitemap is read into url -> lastmod, with entities decoded", () => {
  assert.deepEqual(parseSitemap(xml), {
    "https://clinicaltrialfailures.com/": "2026-11-16T00:00:00.000Z",
    "https://clinicaltrialfailures.com/explore?a=1&b=2": "",
    "https://clinicaltrialfailures.com/atlas": "2026-11-16T00:00:00.000Z",
  });
});

test("only new, changed and removed URLs are reported", () => {
  const previous = { "https://x.test/a": "1", "https://x.test/b": "1", "https://x.test/gone": "1" };
  const current = { "https://x.test/a": "1", "https://x.test/b": "2", "https://x.test/new": "1" };
  const { changed, removed, urls } = changedUrls(previous, current);
  assert.deepEqual(changed, ["https://x.test/b", "https://x.test/new"]);
  assert.deepEqual(removed, ["https://x.test/gone"]);
  assert.equal(urls.length, 3);
  assert.deepEqual(changedUrls(current, current).urls, []);
});

test("the first run reports every URL", () => {
  assert.equal(changedUrls({}, parseSitemap(xml)).urls.length, 3);
});

test("URLs on other hosts are never submitted under our key", () => {
  assert.deepEqual(
    ownUrls(["https://clinicaltrialfailures.com/a", "https://www.clinicaltrialfailures.com/b", "https://evil.test/c", "not a url"]),
    ["https://clinicaltrialfailures.com/a"],
  );
});

test("submissions are split at the 10,000-URL limit and point at the key file", () => {
  const urls = Array.from({ length: 20001 }, (_, i) => `https://clinicaltrialfailures.com/p${i}`);
  assert.deepEqual(batches(urls).map((b) => b.length), [10000, 10000, 1]);
  const body = payload(["https://clinicaltrialfailures.com/"]);
  assert.equal(body.host, "clinicaltrialfailures.com");
  assert.equal(body.keyLocation, `https://clinicaltrialfailures.com/${KEY}.txt`);
});

test("the key file is published with exactly the key", () => {
  const file = path.join(process.cwd(), "public", `${KEY}.txt`);
  assert.equal(readFileSync(file, "utf8").trim(), KEY);
});
