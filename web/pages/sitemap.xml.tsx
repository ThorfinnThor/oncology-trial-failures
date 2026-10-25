// web/pages/sitemap.xml.tsx

import type { GetServerSideProps } from "next";

import { readSeoIndexingFeatures } from "@/lib/seoIndexingPolicy";
import { buildSitemapUrls, renderSitemapXml, SITEMAP_ENTRIES_FILE, type SitemapData } from "@/lib/sitemapEntries";

// Reads the entries precomputed by scripts/generate-sitemap-entries.ts, never the full index.
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const { readJsonServerAsset } = await import("@/lib/server-data");
  const data = await readJsonServerAsset<SitemapData>(SITEMAP_ENTRIES_FILE);
  const xml = renderSitemapXml(buildSitemapUrls(data, readSeoIndexingFeatures(process.env)));

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function SitemapXml() {
  return null;
}
