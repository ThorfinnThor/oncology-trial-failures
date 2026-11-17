import assert from "node:assert/strict";
import test from "node:test";

import { BROWSER_HTML_CACHE_CONTROL, withBrowserHtmlCache } from "../worker-html-cache.mjs";

const respond = (type: string, cache: string) =>
  new Response("body", { status: 200, headers: { "content-type": type, "cache-control": cache, "x-opennext-cache": "HIT" } });

test("prerendered HTML is revalidated by browsers instead of served stale", async () => {
  const out = withBrowserHtmlCache(respond("text/html; charset=utf-8", "s-maxage=31536000, stale-while-revalidate=2592000"));
  assert.equal(out.headers.get("cache-control"), BROWSER_HTML_CACHE_CONTROL);
  assert.equal(out.headers.get("x-opennext-cache"), "HIT");
  assert.equal(out.status, 200);
  assert.equal(await out.text(), "body");
});

test("other responses keep their caching", () => {
  for (const [type, cache] of [
    ["application/json", "s-maxage=31536000, stale-while-revalidate=2592000"],
    ["text/html; charset=utf-8", "private, no-cache, no-store, max-age=0, must-revalidate"],
    ["application/javascript", "public, max-age=31536000, immutable"],
  ]) {
    const original = respond(type, cache);
    assert.equal(withBrowserHtmlCache(original), original, `${type} ${cache}`);
  }
});
