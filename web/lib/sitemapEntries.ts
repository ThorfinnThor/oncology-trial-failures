// web/lib/sitemapEntries.ts
//
// The sitemap in two steps. buildSitemapData runs at build time (scripts/generate-sitemap-entries.ts)
// over the full index and writes public/sitemap/entries.json; /sitemap.xml reads only that file and
// applies the runtime parts: the SEO indexing switches (environment) and, when the dataset has no
// dated version, the request time as lastmod. Loading the full index on every sitemap request
// exceeded the Cloudflare Worker memory limit.

import briefsIndex from "@/data/briefs_index.json";

import { latestBriefSitemapLastmod, selectBriefSitemapEntries } from "./briefSitemap";
import type { DrugCatalogEntry } from "./drugPages";
import { INSIGHT_ARTICLES, insightPath, sortInsightArticlesByDate } from "./insights";
import { ISSUES, issuePath } from "./newsletterIssues";
import { buildFailureHubs, buildSponsorHubs, indexableTrialRows } from "./seoHubs";
import { resolveSeoIndexingPolicy, type SeoIndexingFeatures } from "./seoIndexingPolicy";
import { includeStaticPathInSitemap } from "./seoStaticPolicy";
import { trialPath } from "./seoUrls";
import type { DatasetMeta, TrialIndexRow } from "./types";

const SITE_URL = "https://clinicaltrialfailures.com";

export const SITEMAP_ENTRIES_FILE = "public/sitemap/entries.json";

const DATA_DRIVEN_PATHS = [
  "/",
  "/explore",
  "/overview",
  "/failures",
  "/sponsors",
  "/insights",
  "/briefs",
  "/validation",
  "/asset-check",
  "/packages",
  "/packages/sample",
  "/reports/latest-two-week-stopped-trial-updates",
  "/sponsor-insights",
  "/top-entities",
  "/outliers",
  "/clinical-trial-failures",
  "/why-clinical-trials-fail",
  "/failed-clinical-trials",
  "/terminated-clinical-trials",
  "/clinical-trial-futility",
  "/failed-endpoint-clinical-trials",
  "/clinical-trial-enrollment-failure",
  "/clinical-trial-failures-by-phase",
  "/clinical-trial-failures-by-disease-area",
  "/terminated-vs-withdrawn-vs-suspended-clinical-trials",
  "/clinical-trial-stop-reasons",
  "/top-10-oncology-clinical-trial-failures",
  "/top-10-neurology-clinical-trial-failures",
  "/top-10-pharma-companies-clinical-trial-failure-share",
  "/top-10-infectious-disease-clinical-trial-failures",
  "/top-10-phase-2-clinical-trial-failure-signals",
  "/top-10-safety-driven-clinical-trial-failures",
];

const STABLE_INFORMATION_PATHS = [
  "/methods",
  "/pricing",
  "/about",
  "/use-cases",
  "/contact",
  "/privacy",
  "/disclaimer",
  "/imprint",
];

// lastmod: an ISO date; null for the dataset lastmod (resolved per request); absent for none.
export type SitemapDataEntry = { loc: string; lastmod?: string | null };

export type SitemapData = {
  datasetLastmod: string | null;
  // Everything before the trial pages, in sitemap order.
  pages: SitemapDataEntry[];
  // Trial and drug pages before the SEO indexing switches are applied.
  trials: SitemapDataEntry[];
  drugs: string[];
};

export type SitemapUrl = { loc: string; lastmod: string | undefined };

function toIsoDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function buildSitemapData(rows: TrialIndexRow[], meta: DatasetMeta, drugCatalog: DrugCatalogEntry[]): SitemapData {
  const datasetLastmod = meta.version && /^\d{4}-\d{2}-\d{2}/.test(meta.version) ? new Date(meta.version).toISOString() : null;
  const briefEntries = selectBriefSitemapEntries(briefsIndex.briefs);
  const latestBriefLastmod = latestBriefSitemapLastmod(briefEntries) || null;

  const pages: SitemapDataEntry[] = [
    ...DATA_DRIVEN_PATHS.filter(includeStaticPathInSitemap).map((path) => ({
      loc: `${SITE_URL}${path}`,
      lastmod: path === "/briefs" ? latestBriefLastmod : null,
    })),
    ...briefEntries.map((entry) => ({ loc: `${SITE_URL}${entry.path}`, lastmod: toIsoDate(entry.lastmod) })),
    // The archive only once it has an issue; until then it is noindex.
    ...(ISSUES.length
      ? [
          { loc: `${SITE_URL}/newsletter/issues`, lastmod: toIsoDate(ISSUES[0].date) },
          ...ISSUES.map((issue) => ({ loc: `${SITE_URL}${issuePath(issue.date)}`, lastmod: toIsoDate(issue.date) })),
        ]
      : []),
    ...STABLE_INFORMATION_PATHS.filter(includeStaticPathInSitemap).map((path) => ({ loc: `${SITE_URL}${path}` })),
    ...buildFailureHubs(rows).map((hub) => ({ loc: `${SITE_URL}${hub.path}`, lastmod: null })),
    ...buildSponsorHubs(rows).map((hub) => ({ loc: `${SITE_URL}${hub.path}`, lastmod: null })),
    ...sortInsightArticlesByDate(INSIGHT_ARTICLES).map((article) => ({
      loc: `${SITE_URL}${insightPath(article)}`,
      lastmod: new Date(article.datePublished).toISOString(),
    })),
  ];

  return {
    datasetLastmod,
    pages,
    trials: indexableTrialRows(rows).map((row) => ({
      loc: `${SITE_URL}${trialPath(row)}`,
      lastmod: toIsoDate(row.last_update_post_date),
    })),
    drugs: drugCatalog.filter((drug) => drug.indexable).map((drug) => `${SITE_URL}${drug.path}`),
  };
}

function inPolicySitemap(loc: string, features: SeoIndexingFeatures): boolean {
  return resolveSeoIndexingPolicy(
    loc,
    { httpStatus: 200, robots: "index,follow", canonical: loc, sitemap: true, redirectTo: null, editorialStatus: "ready" },
    features
  ).effective.sitemap;
}

export function buildSitemapUrls(data: SitemapData, features: SeoIndexingFeatures, now: Date = new Date()): SitemapUrl[] {
  const lastmod = data.datasetLastmod ?? now.toISOString();
  const resolve = (entry: SitemapDataEntry): SitemapUrl => ({
    loc: entry.loc,
    lastmod: entry.lastmod === undefined ? undefined : entry.lastmod ?? lastmod,
  });
  const drugs = data.drugs.filter((loc) => inPolicySitemap(loc, features)).map((loc) => ({ loc, lastmod }));
  const urls = [
    ...data.pages.map(resolve),
    ...data.trials.filter((entry) => inPolicySitemap(entry.loc, features)).map(resolve),
    ...(drugs.length ? [{ loc: `${SITE_URL}/drugs`, lastmod }, ...drugs] : []),
  ];

  const seen = new Set<string>();
  return urls.filter((url) => {
    if (seen.has(url.loc)) return false;
    seen.add(url.loc);
    return true;
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function renderSitemapXml(urls: SitemapUrl[]): string {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
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
