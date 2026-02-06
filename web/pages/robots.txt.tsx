// web/pages/robots.txt.tsx

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

  // Disallow API routes; allow everything else.
  // NOTE: You may want to disallow certain param-heavy URLs in the future (e.g. explore facets),
  // but doing so here could block legitimate crawling depending on your strategy.
  const content =
    `User-agent: *\n` +
    `Disallow: /api/\n` +
    `\n` +
    `Sitemap: ${baseUrl}/sitemap.xml\n`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.write(content);
  res.end();

  return { props: {} };
};

export default function RobotsTxt() {
  return null;
}
