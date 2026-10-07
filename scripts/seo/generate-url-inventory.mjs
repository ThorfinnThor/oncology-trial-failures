import { readFile, writeFile } from "node:fs/promises";

const inputPath = process.argv[2] || "/tmp/clinicaltrialfailures-sitemap-2026-10-06.xml";
const outputPath = process.argv[3] || "docs/seo/url-inventory.csv";
const xml = await readFile(inputPath, "utf8");

function csv(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function classify(url) {
  const path = new URL(url).pathname;
  if (path === "/") return "home";
  if (/^\/trial\//.test(path)) return "trial";
  if (/^\/sponsor\//.test(path)) return "sponsor";
  if (/^\/failures\//.test(path)) return "failure_hub";
  if (/^\/briefs\//.test(path)) return "brief";
  if (/^\/insights\//.test(path)) return "insight";
  if (/^\/(top-|clinical-trial-|terminated|failed-|why-)/.test(path)) return "editorial_reference";
  if (/^\/packages\//.test(path)) return "package";
  return "static_reference";
}

const records = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?\s*<\/url>/g)]
  .map((match) => ({ url: match[1], pageType: classify(match[1]), lastmod: match[2] || "" }));

if (!records.length) throw new Error(`No sitemap URLs found in ${inputPath}`);
if (new Set(records.map((record) => record.url)).size !== records.length) {
  throw new Error("Sitemap contains duplicate URLs");
}

const header = ["url", "page_type", "lastmod", "measurement_status", "decision_status"].map(csv).join(",");
const rows = records.map((record) => [record.url, record.pageType, record.lastmod, "unknown", "unreviewed"].map(csv).join(","));
await writeFile(outputPath, `${header}\n${rows.join("\n")}\n`);
console.log(`Wrote ${records.length} URL records to ${outputPath}`);
