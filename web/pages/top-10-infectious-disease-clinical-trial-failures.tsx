import type { GetStaticProps } from "next";
import type { ComponentProps } from "react";

import TopSeoPage from "@/components/TopSeoPage";
import { areaSummary, topInterventionsByArea } from "@/lib/topSeoData";

type Props = ComponentProps<typeof TopSeoPage>;

export const getStaticProps: GetStaticProps<Props> = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  const topRows = topInterventionsByArea(rows, "Infectious Disease", 10);
  const summary = areaSummary(rows, "Infectious Disease");

  return {
    props: {
      title: "Top 10 infectious disease clinical trial failures | Stopped trial signals",
      description:
        "Review infectious disease clinical trial failure signals from ClinicalTrials.gov stopped-trial records, including intervention rankings, NCT examples, and stop-reason buckets.",
      canonicalPath: "/top-10-infectious-disease-clinical-trial-failures",
      eyebrow: "Infectious disease ranking",
      h1: "Top 10 infectious disease clinical trial failure signals",
      lede:
        "A data-led ranking of infectious disease interventions with repeated stopped-trial records and source-linked stop language.",
      summary: [
        { label: "Infectious disease records", value: summary.total.toLocaleString(), detail: "Stopped records in this disease-area slice." },
        { label: "Biological signals", value: summary.biological.toLocaleString(), detail: `${summary.share} of infectious disease stopped trials.` },
        { label: "Efficacy / safety", value: `${summary.efficacy.toLocaleString()} / ${summary.safety.toLocaleString()}`, detail: "Likely scientific stop-signal categories." },
      ],
      intro: [
        "Infectious disease trials can stop for many reasons that do not mean a drug or vaccine failed scientifically. Some records are shaped by outbreaks, changing standard of care, recruitment windows, funding, public-health logistics, or regulatory pauses. That makes a source-linked ranking more useful than a simple list of stopped trials.",
        "This page focuses on interventions that appear repeatedly in infectious disease stopped-trial records. The table separates likely biological signals, such as efficacy/futility or safety, from the broader stopped-trial count so that one operational stop does not get overread.",
        "Use the ranking as a starting point for review. The most important step is still opening the linked NCT record and reading the sponsor's exact stop language in context.",
      ],
      tableTitle: "Top infectious disease interventions by stopped-trial signals",
      tableIntro:
        "Ranked by likely biological failure signals first, then total stopped-trial records in the infectious disease slice.",
      rows: topRows,
      methodology: [
        "The page groups infectious disease records by listed intervention name and excludes obvious placebo/control-only labels from the ranking.",
        "Likely biological signals include efficacy/futility and safety buckets. Operational, enrollment, funding, regulatory, strategic, and other/unknown stops remain visible in total counts but are not treated as biological failure signals.",
        "In infectious disease, timing and epidemiology matter. A trial can stop because an outbreak changes, enrollment becomes impossible, or the clinical question becomes less relevant. Always verify the primary ClinicalTrials.gov record before drawing a scientific conclusion.",
      ],
      related: [
        { href: "/clinical-trial-failures", label: "Clinical trial failures guide", text: "Understand how stopped-trial records are classified." },
        { href: "/clinical-trial-futility", label: "Futility signals", text: "Review weak efficacy and failed endpoint language." },
        { href: "/explore?area=Infectious%20Disease", label: "Explore infectious disease records", text: "Open the database filtered to infectious disease." },
      ],
    },
  };
};

export default TopSeoPage;
