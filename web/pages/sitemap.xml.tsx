// web/pages/sitemap.xml.tsx

import type { GetServerSideProps } from "next";

const SITE_URL = "https://clinicaltrialfailures.com";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Keep this intentionally small to avoid indexing faceted/query URLs.
  // Trial detail pages are intentionally omitted because there can be many of them.
  const paths = [
    "/",
    "/explore",
    "/overview",
    "/sponsor-insights",
    "/top-entities",
    "/outliers",
    "/methods",
    "/privacy",
    "/clinical-trial-failures",
    "/why-clinical-trials-fail",
    "/failed-clinical-trials",
    "/oncology-clinical-trial-failures",
    "/terminated-clinical-trials",
    "/clinical-trial-futility",
  ];

  const now = new Date().toISOString();

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths
      .map((p) => {
        return (
          `  <url>\n` +
          `    <loc>${SITE_URL}${p}</loc>\n` +
          `    <lastmod>${now}</lastmod>\n` +
          `  </url>\n`
        );
      })
      .join("") +
    `</urlset>\n`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  // Reasonable caching; adjust as you like.
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function SitemapXml() {
  return null;
}
