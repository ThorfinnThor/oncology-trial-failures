import type { GetStaticProps } from "next";
import type { ComponentProps } from "react";

import TopSeoPage from "@/components/TopSeoPage";
import { sponsorShareSummary, topSponsorsByBiologicalShare } from "@/lib/topSeoData";

type Props = ComponentProps<typeof TopSeoPage>;

export const getStaticProps: GetStaticProps<Props> = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  const topRows = topSponsorsByBiologicalShare(rows, 10, 25);
  const summary = sponsorShareSummary(rows);

  return {
    props: {
      title: "Top pharma companies by clinical trial failure share | Stopped trial signals",
      description:
        "Compare pharma sponsors by share of likely biological failure signals in stopped ClinicalTrials.gov trial records, with NCT examples and methodology notes.",
      canonicalPath: "/top-10-pharma-companies-clinical-trial-failure-share",
      eyebrow: "Sponsor failure-share ranking",
      h1: "Top pharma companies by clinical trial failure-signal share",
      lede:
        "A sponsor-level ranking that compares likely biological failure signals against each sponsor's stopped-trial volume.",
      summary: [
        { label: "Sponsors analyzed", value: summary.totalSponsors.toLocaleString(), detail: "Sponsors appearing in the current stopped-trial dataset." },
        { label: "Minimum records", value: summary.minTotal.toLocaleString(), detail: "Sponsors need at least this many stopped records to enter the ranking." },
        { label: "Ranked sponsors", value: summary.rankedSponsors.toLocaleString(), detail: "Sponsors with enough stopped records and at least one biological signal." },
      ],
      intro: [
        "Sponsor rankings can be misleading if they only count total stopped trials. A large pharma company can have more stopped studies simply because it runs more studies. A smaller sponsor can look unusually risky because one or two records dominate its public footprint. This page uses a share-based view to reduce that problem.",
        "The ranking below compares likely biological failure signals with each sponsor's stopped-trial volume. That means efficacy/futility and safety signals matter more than administrative stops, but total stopped-trial volume is still shown for context.",
        "This is not an investment ranking, a clinical recommendation, or a statement that one sponsor is better or worse than another. It is a source-linked screening page for analysts who want to know where biological stop language appears repeatedly in public registry records.",
      ],
      tableTitle: "Top sponsors by biological failure-signal share",
      tableIntro:
        "Sponsors are ranked by likely biological failure-signal share among sponsors with at least 25 stopped-trial records in the current dataset.",
      rows: topRows,
      methodology: [
        "The denominator is each sponsor's stopped-trial records in the current database. The numerator is the subset classified as likely biological failure signals, mainly efficacy/futility or safety.",
        "A minimum record threshold is used because share rankings become noisy when sponsors have very few stopped trials. Even with a threshold, this should be treated as a starting point for source review, not as a final quality score.",
        "Sponsor names come from registry records and may reflect subsidiaries, academic collaborators, legal entities, or historical naming. Before using the ranking in a report, open the sponsor page and inspect the underlying NCT records.",
      ],
      related: [
        { href: "/sponsors", label: "Sponsor hubs", text: "Open crawlable sponsor pages." },
        { href: "/sponsor-insights", label: "Sponsor insights", text: "Drill down into sponsors and stop-reason distributions." },
        { href: "/explore", label: "Explore database", text: "Search and filter stopped clinical trial records." },
      ],
    },
  };
};

export default TopSeoPage;
