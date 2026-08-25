import type { GetStaticProps } from "next";
import type { ComponentProps } from "react";

import TopSeoPage from "@/components/TopSeoPage";
import { areaSummary, topInterventionsByArea } from "@/lib/topSeoData";

type Props = ComponentProps<typeof TopSeoPage>;

export const getStaticProps: GetStaticProps<Props> = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  const topRows = topInterventionsByArea(rows, "Oncology", 10);
  const summary = areaSummary(rows, "Oncology");

  return {
    props: {
      title: "Top 10 oncology clinical trial failures | Drug and intervention signals",
      description:
        "Review the top oncology drug and intervention failure signals from ClinicalTrials.gov stopped-trial records, with source-linked NCT examples and reason buckets.",
      canonicalPath: "/top-10-oncology-clinical-trial-failures",
      eyebrow: "Oncology failure ranking",
      h1: "Top 10 oncology clinical trial failure signals",
      lede:
        "A data-led ranking of oncology drugs and interventions with repeated stopped-trial signals in the Clinical Trial Failures database.",
      summary: [
        { label: "Oncology stopped trials", value: summary.total.toLocaleString(), detail: "Records in the oncology disease-area slice." },
        { label: "Biological signals", value: summary.biological.toLocaleString(), detail: `${summary.share} of oncology stopped trials in this dataset.` },
        { label: "Efficacy / safety", value: `${summary.efficacy.toLocaleString()} / ${summary.safety.toLocaleString()}`, detail: "Likely scientific stop-signal categories." },
      ],
      intro: [
        "Oncology is the largest disease area in the current Clinical Trial Failures dataset. That makes it useful, but also easy to misread. A terminated cancer trial is not automatically a failed drug. Some studies stop because of enrollment, portfolio strategy, operations, or changes in standard of care. The ranking below focuses on repeated intervention-level signals and separates likely biological stops from broader stopped-trial volume.",
        "The goal is not to declare a final winner or loser. It is to give analysts a practical starting point: which oncology drugs or interventions appear repeatedly in stopped records, how often the stop language looks biological, and which source record should be opened first for verification.",
        "Use this page as an entry point into the database. The table is strongest when combined with trial-level review, sponsor context, endpoint history, and the original ClinicalTrials.gov record.",
      ],
      tableTitle: "Top oncology drugs and interventions by stopped-trial signals",
      tableIntro:
        "Ranked by likely biological failure signals first, then by total stopped-trial records. Counts come from the current ClinicalTrials.gov-derived dataset.",
      rows: topRows,
      methodology: [
        "This ranking groups oncology stopped-trial records by the first listed intervention name in the compact dataset. A record can mention more than one intervention, so the table should be read as a screening view rather than a definitive product-level failure database.",
        "Likely biological signals include efficacy/futility and safety buckets. Operational, enrollment, funding, regulatory, strategic, and other/unknown stops are counted in total stopped records but are not treated as biological failure signals.",
        "For oncology, context matters especially strongly. Trials may stop because the competitive landscape changes, standard therapy evolves, a biomarker strategy is revised, or a sponsor prioritizes another program. That is why each row includes an example NCT record to verify before using the ranking in a report.",
      ],
      related: [
        { href: "/failures/oncology", label: "Oncology evidence hub", text: "Review V2 outcomes and source-linked oncology records." },
        { href: "/clinical-trial-futility", label: "Futility signals", text: "Focus on weak efficacy and failed endpoint language." },
        { href: "/explore?area=Oncology", label: "Explore oncology records", text: "Open the live database filtered to oncology." },
      ],
    },
  };
};

export default TopSeoPage;
