// web/pages/robots.txt.tsx

import type { GetServerSideProps } from "next";

const SITE_URL = "https://clinicaltrialfailures.com";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  // Disallow API routes and the per-trial detail shards; allow everything else.
  // Trial pages are rendered on the server and no longer fetch their shard after hydration, so
  // crawlers gain nothing from /trial-shards/ (it was most of Googlebot's crawl volume). The index
  // shards stay open: /overview and /top-entities build their charts from them in the browser.
  // NOTE: You may want to disallow certain param-heavy URLs in the future (e.g. explore facets),
  // but doing so here could block legitimate crawling depending on your strategy.
  const content =
    `User-agent: *\n` +
    `Disallow: /api/\n` +
    `Disallow: /samples/\n` +
    `Disallow: /trial-shards/\n` +
    `\n` +
    `LLMs: ${SITE_URL}/llms.txt\n` +
    `Sitemap: ${SITE_URL}/sitemap.xml\n`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.write(content);
  res.end();

  return { props: {} };
};

export default function RobotsTxt() {
  return null;
}
