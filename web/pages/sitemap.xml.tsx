// web/pages/sitemap.xml.tsx

import type { GetServerSideProps } from "next";

import { trialPath } from "@/lib/seoUrls";
import { buildFailureHubs, buildSponsorHubs, indexableTrialRows } from "@/lib/seoHubs";
import { INSIGHT_ARTICLES, insightPath, sortInsightArticlesByDate } from "@/lib/insights";

const SITE_URL = "https://clinicaltrialfailures.com";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIsoDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const { loadIndexServer, loadMetaServer } = await import("@/lib/server-data");
  const [rows, meta] = await Promise.all([loadIndexServer(), loadMetaServer()]);

  const dataDrivenPaths = [
    "/",
    "/explore",
    "/overview",
    "/failures",
    "/sponsors",
    "/insights",
    "/reports/latest-two-week-stopped-trial-updates",
    "/sponsor-insights",
    "/top-entities",
    "/outliers",
    "/clinical-trial-failures",
    "/why-clinical-trials-fail",
    "/failed-clinical-trials",
    "/oncology-clinical-trial-failures",
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

  const stableInformationPaths = [
    "/methods",
    "/about",
    "/contact",
    "/privacy",
    "/disclaimer",
  ];

  const lastmod = meta.version && /^\d{4}-\d{2}-\d{2}/.test(meta.version)
    ? new Date(meta.version).toISOString()
    : new Date().toISOString();

  const urls = [
    ...dataDrivenPaths.map((path) => ({
      loc: `${SITE_URL}${path}`,
      lastmod,
    })),
    ...stableInformationPaths.map((path) => ({
      loc: `${SITE_URL}${path}`,
      lastmod: undefined,
    })),
    ...buildFailureHubs(rows).map((hub) => ({
      loc: `${SITE_URL}${hub.path}`,
      lastmod,
    })),
    ...buildSponsorHubs(rows).map((hub) => ({
      loc: `${SITE_URL}${hub.path}`,
      lastmod,
    })),
    ...sortInsightArticlesByDate(INSIGHT_ARTICLES).map((article) => ({
      loc: `${SITE_URL}${insightPath(article)}`,
      lastmod: new Date(article.datePublished).toISOString(),
    })),
    ...indexableTrialRows(rows).map((row) => ({
      loc: `${SITE_URL}${trialPath(row)}`,
      lastmod: toIsoDate(row.last_update_post_date, lastmod),
    })),
  ];

  const seen = new Set<string>();
  const uniqueUrls = urls.filter((url) => {
    if (seen.has(url.loc)) return false;
    seen.add(url.loc);
    return true;
  });

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    uniqueUrls
      .map((url) => {
        return (
          `  <url>\n` +
          `    <loc>${escapeXml(url.loc)}</loc>\n` +
          (url.lastmod ? `    <lastmod>${escapeXml(url.lastmod)}</lastmod>\n` : "") +
          `  </url>\n`
        );
      })
      .join("") +
    `</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function SitemapXml() {
  return null;
}
