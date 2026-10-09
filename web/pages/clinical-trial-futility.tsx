import type { GetStaticProps } from "next";

import SeoLandingPage from "../components/SeoLandingPage";
import { hydrateSeoLandingPage, SEO_LANDING_PAGES, type SeoLandingPageConfig } from "../lib/seoLandingPages";
import { buildInsightStats } from "../lib/insightStats";
import { trialPath } from "../lib/seoUrls";
import type { TrialIndexRow } from "../lib/types";

type PageProps = {
  page: SeoLandingPageConfig;
};

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  const { loadIndexServer } = await import("../lib/server-data");
  const [stats, rows] = await Promise.all([buildInsightStats(), loadIndexServer()]);
  const page = hydrateSeoLandingPage(SEO_LANDING_PAGES.clinicalTrialFutility, stats);
  const preferredIds = ["NCT04628481", "NCT05534984", "NCT05220098"];
  const preferredRows = preferredIds
    .map((id) => rows.find((row) => row.nct_id === id))
    .filter((row): row is TrialIndexRow => Boolean(row));
  const examples = preferredRows.map((row) => ({
    nctId: row.nct_id,
    title: row.brief_title || row.nct_id,
    reason: "Registry efficacy / futility evidence",
    summary: `Registry stop language: ${row.why_stopped_short || "No compact stop statement is available."}`,
    href: trialPath(row),
  }));

  return {
    props: {
      page: page.dataInsights
        ? { ...page, dataInsights: { ...page.dataInsights, examples: examples.length === 3 ? examples : page.dataInsights.examples } }
        : page,
    },
  };
};

export default function ClinicalTrialFutilityPage({ page }: PageProps) {
  return <SeoLandingPage page={page} />;
}
