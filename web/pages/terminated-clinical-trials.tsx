import type { GetStaticProps } from "next";

import SeoLandingPage from "../components/SeoLandingPage";
import { hydrateSeoLandingPage, SEO_LANDING_PAGES, type SeoLandingPageConfig } from "../lib/seoLandingPages";
import { buildInsightStats } from "../lib/insightStats";

type PageProps = {
  page: SeoLandingPageConfig;
};

export const getStaticProps: GetStaticProps<PageProps> = async () => {
  const stats = await buildInsightStats();
  return {
    props: {
      page: hydrateSeoLandingPage(SEO_LANDING_PAGES.terminatedClinicalTrials, stats),
    },
  };
};

export default function TerminatedClinicalTrialsPage({ page }: PageProps) {
  return <SeoLandingPage page={page} />;
}
