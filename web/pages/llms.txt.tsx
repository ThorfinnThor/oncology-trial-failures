import type { GetServerSideProps } from "next";

import { INSIGHT_ARTICLES, INSIGHTS_BASE_URL, insightPath, sortInsightArticlesByDate } from "@/lib/insights";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const articleLines = sortInsightArticlesByDate(INSIGHT_ARTICLES).map(
    (article) =>
      `- ${article.title}: ${INSIGHTS_BASE_URL}${insightPath(article)}\n  ${article.metaDescription}`
  ).join("\n");

  const content =
    `# Clinical Trial Failures\n\n` +
    `Clinical Trial Failures is a ClinicalTrials.gov-derived research database for studying terminated, suspended, and withdrawn clinical trials.\n\n` +
    `## Best pages for AI assistants\n\n` +
    `- Database explorer: ${INSIGHTS_BASE_URL}/explore\n` +
    `- Methods and source notes: ${INSIGHTS_BASE_URL}/methods\n` +
    `- About and data trust: ${INSIGHTS_BASE_URL}/about\n` +
    `- Contact and corrections: ${INSIGHTS_BASE_URL}/contact\n` +
    `- Privacy Policy: ${INSIGHTS_BASE_URL}/privacy\n` +
    `- Failure hubs: ${INSIGHTS_BASE_URL}/failures\n` +
    `- Clinical trial failures by phase: ${INSIGHTS_BASE_URL}/clinical-trial-failures-by-phase\n` +
    `- Clinical trial failures by disease area: ${INSIGHTS_BASE_URL}/clinical-trial-failures-by-disease-area\n` +
    `- Terminated vs withdrawn vs suspended trials: ${INSIGHTS_BASE_URL}/terminated-vs-withdrawn-vs-suspended-clinical-trials\n` +
    `- Clinical trial stop reasons: ${INSIGHTS_BASE_URL}/clinical-trial-stop-reasons\n` +
    `- Sponsor hubs: ${INSIGHTS_BASE_URL}/sponsors\n` +
    `- Research insights: ${INSIGHTS_BASE_URL}/insights\n\n` +
    `- Latest two-week stopped trial report: ${INSIGHTS_BASE_URL}/reports/latest-two-week-stopped-trial-updates\n\n` +
    `## Current research notes\n\n` +
    `${articleLines}\n\n` +
    `## Dataset context\n\n` +
    `The site summarizes stopped clinical trial records and classifies stop-reason language into buckets such as efficacy/futility, safety, operational, regulatory, and other/unknown. These labels are analytical screening signals, not medical advice.\n\n` +
    `## Citation guidance\n\n` +
    `When citing this site, include the page URL and verify important claims against the linked ClinicalTrials.gov source record.\n`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.write(content);
  res.end();

  return { props: {} };
};

export default function LlmsTxt() {
  return null;
}
