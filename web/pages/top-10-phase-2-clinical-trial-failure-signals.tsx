import type { GetStaticProps } from "next";
import type { ComponentProps } from "react";

import TopSeoPage from "@/components/TopSeoPage";
import { phaseSummary, topInterventionsByPhase } from "@/lib/topSeoData";

type Props = ComponentProps<typeof TopSeoPage>;

export const getStaticProps: GetStaticProps<Props> = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  const topRows = topInterventionsByPhase(rows, "Phase II", 10);
  const summary = phaseSummary(rows, "Phase II");

  return {
    props: {
      title: "Top 10 Phase II clinical trial failure signals | Stopped trial evidence",
      description:
        "Rank Phase II clinical trial failure signals from ClinicalTrials.gov stopped-trial records, with intervention-level counts, NCT examples, and source methodology.",
      canonicalPath: "/top-10-phase-2-clinical-trial-failure-signals",
      eyebrow: "Phase II ranking",
      h1: "Top 10 Phase II clinical trial failure signals",
      lede:
        "A Phase II-focused ranking for finding repeated efficacy, futility, and safety stop signals before pivotal development.",
      summary: [
        { label: "Phase II stopped records", value: summary.total.toLocaleString(), detail: "Records with Phase II in the current dataset." },
        { label: "Biological signals", value: summary.biological.toLocaleString(), detail: `${summary.share} of Phase II stopped records.` },
        { label: "Efficacy / safety", value: `${summary.efficacy.toLocaleString()} / ${summary.safety.toLocaleString()}`, detail: "Likely scientific stop-signal categories." },
      ],
      intro: [
        "Phase II is where many clinical programs start to look real, but it is also where uncertainty is still high. A stopped Phase II study can point to weak efficacy, safety, enrollment, protocol design, sponsor reprioritization, or a trial that simply no longer answers the right question.",
        "This page ranks interventions that appear repeatedly in Phase II stopped-trial records. It is designed for analysts who want to quickly identify where biological stop language appears, while still seeing total stopped-trial volume for context.",
        "The ranking should not be read as a definitive list of failed drugs. It is a practical screening layer: find the pattern, open the NCT example, verify the stop language, and then decide whether the evidence is actually relevant.",
      ],
      tableTitle: "Top Phase II interventions by stopped-trial signals",
      tableIntro:
        "Ranked by likely biological failure signals first, then total stopped Phase II records in the current dataset.",
      rows: topRows,
      methodology: [
        "The page includes records where the parsed phase list contains Phase II. Some registry records may include combined phases, so the ranking is a Phase II signal view rather than a strict single-phase-only list.",
        "Likely biological signals are efficacy/futility and safety buckets. Other stopped records are kept in the denominator because they show public stop volume, but they should not be treated as scientific failure without source review.",
        "Phase II evidence is especially context dependent. Biomarker selection, dose, endpoint choice, comparator, and patient population can change the meaning of a stop reason. The linked NCT example is included so the claim can be checked quickly.",
      ],
      related: [
        { href: "/clinical-trial-futility", label: "Clinical trial futility", text: "Focus on weak efficacy and futility language." },
        { href: "/failed-endpoint-clinical-trials", label: "Failed endpoint guide", text: "Understand endpoint failure signals." },
        { href: "/explore?phase=PHASE2", label: "Explore Phase II records", text: "Open the database filtered to Phase II." },
      ],
    },
  };
};

export default TopSeoPage;
