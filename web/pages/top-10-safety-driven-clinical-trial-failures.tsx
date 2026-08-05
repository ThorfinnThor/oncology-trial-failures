import type { GetStaticProps } from "next";
import type { ComponentProps } from "react";

import TopSeoPage from "@/components/TopSeoPage";
import { reasonSummary, topInterventionsByReason } from "@/lib/topSeoData";

type Props = ComponentProps<typeof TopSeoPage>;

export const getStaticProps: GetStaticProps<Props> = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  const topRows = topInterventionsByReason(rows, "SAFETY", 10);
  const summary = reasonSummary(rows, "SAFETY");

  return {
    props: {
      title: "Top 10 safety-driven clinical trial failures | Toxicity and stop signals",
      description:
        "Review safety-driven clinical trial failure signals from ClinicalTrials.gov stopped-trial records, including toxicity, tolerability, adverse-event, and NCT examples.",
      canonicalPath: "/top-10-safety-driven-clinical-trial-failures",
      eyebrow: "Safety signal ranking",
      h1: "Top 10 safety-driven clinical trial failure signals",
      lede:
        "A ranking of interventions appearing in stopped-trial records where the registry language points to safety, toxicity, or tolerability concerns.",
      summary: [
        { label: "Safety-signal records", value: summary.total.toLocaleString(), detail: "Stopped records classified in the safety bucket." },
        { label: "Sponsors represented", value: summary.sponsors.toLocaleString(), detail: "Sponsor names appearing in safety-classified records." },
        { label: "Disease areas", value: summary.areas.toLocaleString(), detail: "Disease-area slices represented by safety stop language." },
      ],
      intro: [
        "Safety-driven trial stops are different from futility stops. They can point to toxicity, tolerability, adverse events, risk-benefit concerns, data monitoring recommendations, or protocol decisions after emerging safety information. They can also be incomplete or ambiguous in public registry text.",
        "This page ranks interventions that appear repeatedly in safety-classified stopped-trial records. It is useful when the question is not simply whether a trial stopped, but whether the stop language suggests a biological or clinical risk signal that deserves closer review.",
        "The table is not a safety database and it does not replace pharmacovigilance review. It is a screening page built from public ClinicalTrials.gov records, with direct NCT examples so every row can be checked against the source.",
      ],
      tableTitle: "Top interventions in safety-classified stopped trials",
      tableIntro:
        "Ranked by total safety-classified stopped-trial records in the current ClinicalTrials.gov-derived dataset.",
      rows: topRows,
      methodology: [
        "The ranking includes records whose stop-reason bucket is safety. Terms can include safety, toxicity, tolerability, adverse events, risk signals, or related sponsor language.",
        "Counts are grouped by intervention name from the compact dataset. A trial can include multiple interventions, combinations, or background therapies, so the table should be used to find records for review rather than to assign final causality.",
        "Safety interpretation requires caution. The registry stop reason may not describe severity, attribution, dose relationship, comparator, patient selection, or full adverse-event data. Open the linked NCT example and related source materials before using the signal in analysis.",
      ],
      related: [
        { href: "/clinical-trial-failures", label: "Clinical trial failures guide", text: "Understand stopped-trial classification." },
        { href: "/failed-clinical-trials", label: "Failed clinical trials", text: "Review broader stopped-trial evidence." },
        { href: "/explore?bucket=SAFETY", label: "Explore safety records", text: "Open the database filtered to safety signals." },
      ],
    },
  };
};

export default TopSeoPage;
