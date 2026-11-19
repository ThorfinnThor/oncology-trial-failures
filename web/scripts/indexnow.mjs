// Tells Bing (and the other IndexNow engines: Yandex, Seznam, Naver) which pages are new, changed or gone,
// so they recrawl those instead of waiting for their next pass over the sitemap. Run daily by
// .github/workflows/indexnow.yml against the live site, never at build time: the URLs it reports must
// already be deployed.
//
// It compares the live sitemap (url -> lastmod) with the copy it saved after its last successful
// submission and reports only the difference: new URLs, URLs whose lastmod moved, and URLs that left the
// sitemap. The first run, with nothing saved, reports every URL once.
//
// The key is public by design: engines confirm it by fetching https://<host>/<key>.txt, so the run stops
// before submitting anything if that file is not live yet.
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const SITE = "https://clinicaltrialfailures.com";
export const KEY = "ed9a3fcc8b9ab6093de6ec7049602d9e";
export const ENDPOINT = "https://api.indexnow.org/indexnow";
export const MAX_URLS_PER_REQUEST = 10000;

/** Reads <url><loc>…</loc><lastmod>…</lastmod></url> entries into { url: lastmod }. */
export function parseSitemap(xml) {
  const entries = {};
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) || []) {
    const loc = /<loc>\s*([^<]+?)\s*<\/loc>/.exec(block)?.[1];
    if (!loc) continue;
    const lastmod = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/.exec(block)?.[1] || "";
    entries[decodeXml(loc)] = lastmod;
  }
  return entries;
}

function decodeXml(s) {
  return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

/** URLs to report: new or changed in `current`, plus those that were in `previous` and are gone. */
export function changedUrls(previous, current) {
  const changed = Object.keys(current).filter((url) => previous[url] !== current[url]);
  const removed = Object.keys(previous).filter((url) => !(url in current));
  return { changed, removed, urls: [...changed, ...removed] };
}

/** Only URLs on our own host may be submitted under our key. */
export function ownUrls(urls, site = SITE) {
  const host = new URL(site).host;
  return urls.filter((url) => {
    try { return new URL(url).host === host; } catch { return false; }
  });
}

export function batches(urls, size = MAX_URLS_PER_REQUEST) {
  const out = [];
  for (let i = 0; i < urls.length; i += size) out.push(urls.slice(i, i + size));
  return out;
}

export function payload(urls, site = SITE, key = KEY) {
  return { host: new URL(site).host, key, keyLocation: `${site}/${key}.txt`, urlList: urls };
}

async function readState(file) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { return null; }
}

async function main() {
  const stateFile = process.argv[2] || "indexnow-state.json";
  const dryRun = process.argv.includes("--dry-run");

  const keyRes = await fetch(`${SITE}/${KEY}.txt`, { cache: "no-store" });
  const keyText = keyRes.ok ? (await keyRes.text()).trim() : "";
  if (keyText !== KEY) {
    console.log(`The key file is not live yet (HTTP ${keyRes.status}); nothing submitted.`);
    return;
  }

  const sitemapRes = await fetch(`${SITE}/sitemap.xml`, { cache: "no-store" });
  if (!sitemapRes.ok) throw new Error(`sitemap.xml returned HTTP ${sitemapRes.status}`);
  const current = parseSitemap(await sitemapRes.text());
  const count = Object.keys(current).length;
  // A broken deploy can serve a near-empty sitemap; reporting every page as removed would be wrong.
  if (count < 100) throw new Error(`The sitemap lists only ${count} URLs; refusing to compare against it.`);

  const saved = await readState(stateFile);
  const { changed, removed, urls } = changedUrls(saved || {}, current);
  const submit = ownUrls(urls);
  console.log(`${count} URLs in the sitemap${saved ? "" : " (first run: reporting all)"}; ${changed.length} new or changed, ${removed.length} removed.`);

  if (!submit.length) {
    console.log("Nothing to submit.");
  } else if (dryRun) {
    console.log(`Dry run: would submit ${submit.length} URLs, e.g.\n  ${submit.slice(0, 10).join("\n  ")}`);
    return;
  } else {
    for (const batch of batches(submit)) {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload(batch)),
      });
      // 200 = accepted, 202 = accepted while the key is still being verified.
      if (res.status !== 200 && res.status !== 202) {
        throw new Error(`IndexNow returned HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      console.log(`Submitted ${batch.length} URLs (HTTP ${res.status}).`);
    }
  }
  // Saved only after every batch was accepted, so a failed run is retried in full next time.
  await writeFile(stateFile, JSON.stringify(current));
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
