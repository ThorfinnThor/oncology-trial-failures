import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import briefsIndex from "../data/briefs_index.json";
import { latestBriefSitemapLastmod, selectBriefSitemapEntries } from "../lib/briefSitemap";
import type { DrugCatalogEntry } from "../lib/drugPages";
import { INSIGHT_ARTICLES, insightPath, sortInsightArticlesByDate } from "../lib/insights";
import { ISSUES, issuePath } from "../lib/newsletterIssues";
import { loadDrugCatalogServer, loadIndexServer, loadMetaServer } from "../lib/server-data";
import { buildFailureHubs, buildSponsorHubs, indexableTrialRows } from "../lib/seoHubs";
import { REPORT_ONLY_FEATURES, resolveSeoIndexingPolicy, type SeoIndexingFeatures } from "../lib/seoIndexingPolicy";
import { includeStaticPathInSitemap } from "../lib/seoStaticPolicy";
import { trialPath } from "../lib/seoUrls";
import { buildSitemapData, buildSitemapUrls, renderSitemapXml } from "../lib/sitemapEntries";
import type { DatasetMeta, TrialIndexRow } from "../lib/types";

// The request-time sitemap logic as it was before the entries were precomputed
// (pages/sitemap.xml.tsx up to the change that added lib/sitemapEntries.ts), with its inputs as arguments.
function legacySitemapXml(
  rows: TrialIndexRow[],
  meta: DatasetMeta,
  drugCatalog: DrugCatalogEntry[],
  seoFeatures: SeoIndexingFeatures,
  now: Date
): string {
  const SITE_URL = "https://clinicaltrialfailures.com";
  const escapeXml = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  const toIsoDate = (value: string | undefined, fallback: string) => {
    if (!value) return fallback;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return fallback;
    return date.toISOString();
  };
  const dataDrivenPaths = [
    "/", "/explore", "/overview", "/failures", "/sponsors", "/insights", "/briefs", "/validation", "/asset-check",
    "/packages", "/packages/sample", "/reports/latest-two-week-stopped-trial-updates", "/sponsor-insights",
    "/top-entities", "/outliers", "/clinical-trial-failures", "/why-clinical-trials-fail", "/failed-clinical-trials",
    "/terminated-clinical-trials", "/clinical-trial-futility", "/failed-endpoint-clinical-trials",
    "/clinical-trial-enrollment-failure", "/clinical-trial-failures-by-phase", "/clinical-trial-failures-by-disease-area",
    "/terminated-vs-withdrawn-vs-suspended-clinical-trials", "/clinical-trial-stop-reasons",
    "/top-10-oncology-clinical-trial-failures", "/top-10-neurology-clinical-trial-failures",
    "/top-10-pharma-companies-clinical-trial-failure-share", "/top-10-infectious-disease-clinical-trial-failures",
    "/top-10-phase-2-clinical-trial-failure-signals", "/top-10-safety-driven-clinical-trial-failures",
  ];
  const stableInformationPaths = ["/methods", "/pricing", "/about", "/use-cases", "/contact", "/privacy", "/disclaimer", "/imprint"];

  const lastmod = meta.version && /^\d{4}-\d{2}-\d{2}/.test(meta.version) ? new Date(meta.version).toISOString() : now.toISOString();
  const briefEntries = selectBriefSitemapEntries(briefsIndex.briefs);
  const latestBriefLastmod = latestBriefSitemapLastmod(briefEntries) || lastmod;
  const inSitemap = (loc: string) =>
    resolveSeoIndexingPolicy(
      loc,
      { httpStatus: 200, robots: "index,follow", canonical: loc, sitemap: true, redirectTo: null, editorialStatus: "ready" },
      seoFeatures
    ).effective.sitemap;
  const trialEntries = indexableTrialRows(rows)
    .map((row) => {
      const loc = `${SITE_URL}${trialPath(row)}`;
      return { loc, lastmod: toIsoDate(row.last_update_post_date, lastmod), include: inSitemap(loc) };
    })
    .filter((entry) => entry.include);
  const drugEntries = drugCatalog
    .filter((drug) => drug.indexable)
    .map((drug) => `${SITE_URL}${drug.path}`)
    .filter(inSitemap)
    .map((loc) => ({ loc, lastmod }));

  const urls: Array<{ loc: string; lastmod: string | undefined }> = [
    ...dataDrivenPaths.filter(includeStaticPathInSitemap).map((path) => ({
      loc: `${SITE_URL}${path}`,
      lastmod: path === "/briefs" ? latestBriefLastmod : lastmod,
    })),
    ...briefEntries.map((entry) => ({ loc: `${SITE_URL}${entry.path}`, lastmod: toIsoDate(entry.lastmod, lastmod) })),
    ...(ISSUES.length
      ? [
          { loc: `${SITE_URL}/newsletter/issues`, lastmod: toIsoDate(ISSUES[0].date, lastmod) },
          ...ISSUES.map((issue) => ({ loc: `${SITE_URL}${issuePath(issue.date)}`, lastmod: toIsoDate(issue.date, lastmod) })),
        ]
      : []),
    ...stableInformationPaths.filter(includeStaticPathInSitemap).map((path) => ({ loc: `${SITE_URL}${path}`, lastmod: undefined })),
    ...buildFailureHubs(rows).map((hub) => ({ loc: `${SITE_URL}${hub.path}`, lastmod })),
    ...buildSponsorHubs(rows).map((hub) => ({ loc: `${SITE_URL}${hub.path}`, lastmod })),
    ...sortInsightArticlesByDate(INSIGHT_ARTICLES).map((article) => ({
      loc: `${SITE_URL}${insightPath(article)}`,
      lastmod: new Date(article.datePublished).toISOString(),
    })),
    ...trialEntries,
    ...(drugEntries.length ? [{ loc: `${SITE_URL}/drugs`, lastmod }, ...drugEntries] : []),
  ];

  const seen = new Set<string>();
  const uniqueUrls = urls.filter((url) => {
    if (seen.has(url.loc)) return false;
    seen.add(url.loc);
    return true;
  });
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    uniqueUrls
      .map(
        (url) =>
          `  <url>\n` +
          `    <loc>${escapeXml(url.loc)}</loc>\n` +
          (url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n` : "") +
          `  </url>\n`
      )
      .join("") +
    `</urlset>\n`
  );
}

const ACTIVE: SeoIndexingFeatures = {
  reportMode: false,
  pilotTemplates: true,
  registrySitemap: true,
  indexDirectives: true,
  noindexList: true,
  canonicalDuplicates: true,
  redirectList: true,
  removalList: true,
};
const FEATURE_SETS: Array<[string, SeoIndexingFeatures]> = [
  ["report only", REPORT_ONLY_FEATURES],
  ["registry sitemap", { ...REPORT_ONLY_FEATURES, reportMode: false, registrySitemap: true }],
  ["all switches on", ACTIVE],
];
const NOW = new Date("2026-10-25T12:00:00.000Z");

// What /sitemap.xml renders: the generated JSON file, read back, then the runtime step.
function precomputedSitemapXml(rows: TrialIndexRow[], meta: DatasetMeta, catalog: DrugCatalogEntry[], features: SeoIndexingFeatures) {
  const data = JSON.parse(JSON.stringify(buildSitemapData(rows, meta, catalog)));
  return renderSitemapXml(buildSitemapUrls(data, features, NOW));
}

const hasShards = existsSync(path.join(process.cwd(), "public", "trials-index-shards", "0.json"));

test("the precomputed sitemap matches the request-time sitemap on the generated dataset", { skip: !hasShards && "run npm run data:optimize first" }, async () => {
  const [rows, meta, catalog] = await Promise.all([loadIndexServer(), loadMetaServer(), loadDrugCatalogServer()]);
  assert.ok(catalog.length, "drug catalog generated");
  for (const [label, features] of FEATURE_SETS) {
    const expected = legacySitemapXml(rows, meta, catalog, features, NOW);
    assert.ok(expected.includes("/trial/"), `${label}: trial pages listed`);
    assert.equal(precomputedSitemapXml(rows, meta, catalog, features), expected, label);
  }
  // An undated dataset version falls back to the request time, as before.
  const undated = { ...meta, version: "All stopped trials" };
  assert.equal(
    precomputedSitemapXml(rows, undated, catalog, REPORT_ONLY_FEATURES),
    legacySitemapXml(rows, undated, catalog, REPORT_ONLY_FEATURES, NOW)
  );
});

test("missing or invalid trial dates and an empty drug catalog render as before", () => {
  const trial = (nctId: string, date: string | undefined): TrialIndexRow => ({
    nct_id: nctId,
    brief_title: `Study ${nctId}`,
    disease_area: "Oncology",
    phases: "PHASE2",
    lead_sponsor: "Example sponsor",
    why_stopped_short: "Lack of efficacy at interim analysis",
    classification_final_outcome: "Biological failure",
    classification_final_category: "Efficacy",
    last_update_post_date: date,
  });
  const rows = [trial("NCT00000001", "2025-03-04"), trial("NCT00000002", undefined), trial("NCT00000003", "not a date")];
  for (const meta of [{ version: "2026-10-01", source: "ClinicalTrials.gov" }, { version: "Dataset", source: "ClinicalTrials.gov" }]) {
    for (const [label, features] of FEATURE_SETS) {
      assert.equal(precomputedSitemapXml(rows, meta, [], features), legacySitemapXml(rows, meta, [], features, NOW), `${meta.version} ${label}`);
    }
  }
});
