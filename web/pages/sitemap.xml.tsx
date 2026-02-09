// web/pages/sitemap.xml.tsx

import type { GetServerSideProps } from "next";

function getBaseUrl(req: any) {
  const proto =
    (req.headers["x-forwarded-proto"] as string) ||
    (req.connection?.encrypted ? "https" : "http");
  const host =
    (req.headers["x-forwarded-host"] as string) ||
    (req.headers["host"] as string);
  return `${proto}://${host}`;
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const baseUrl = getBaseUrl(req);

  // Keep this intentionally small to avoid indexing faceted/query URLs.
  // Trial detail pages are not included because the app currently loads them client-side;
  // including them in a sitemap won’t help much unless you later SSR/SSG those pages.
  const paths = [
    "/",
    "/explore",
    "/overview",
    "/sponsor-insights",
    "/top-entities",
    "/outliers",
    "/methods",
    "/compare",
  ];

  const now = new Date().toISOString();

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths
      .map((p) => {
        return (
          `  <url>\n` +
          `    <loc>${baseUrl}${p}</loc>\n` +
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
