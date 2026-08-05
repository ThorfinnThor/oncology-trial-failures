import type { GetStaticProps } from "next";
import type { ComponentProps } from "react";

import TopSeoPage from "@/components/TopSeoPage";
import { areaSummary, topInterventionsByArea } from "@/lib/topSeoData";

type Props = ComponentProps<typeof TopSeoPage>;

export const getStaticProps: GetStaticProps<Props> = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  const topRows = topInterventionsByArea(rows, "Neurology", 10);
  const summary = areaSummary(rows, "Neurology");

  return {
    props: {
      title: "Top 10 neurology clinical trial failures | Drug and intervention signals",
      description:
        "Review neurology clinical trial failure signals from stopped ClinicalTrials.gov records, including efficacy, futility, safety, sponsor, and NCT source examples.",
      canonicalPath: "/top-10-neurology-clinical-trial-failures",
      eyebrow: "Neurology failure ranking",
      h1: "Top 10 neurology clinical trial failure signals",
      lede:
        "A source-linked ranking of neurology drugs and interventions appearing in stopped-trial records with likely biological failure signals.",
      summary: [
        { label: "Neurology stopped trials", value: summary.total.toLocaleString(), detail: "Records in the neurology disease-area slice." },
        { label: "Biological signals", value: summary.biological.toLocaleString(), detail: `${summary.share} of neurology stopped trials in this dataset.` },
        { label: "Efficacy / safety", value: `${summary.efficacy.toLocaleString()} / ${summary.safety.toLocaleString()}`, detail: "Likely scientific stop-signal categories." },
      ],
      intro: [
        "Neurology trial failure analysis is difficult because stopped-trial language can mix scientific, operational, and strategic explanations. Some studies stop after weak efficacy, failed endpoints, or safety concerns. Others stop because recruitment is slow, endpoints change, or a sponsor reallocates resources.",
        "This page uses the Clinical Trial Failures dataset to show the neurology interventions that appear most often in likely biological stopped-trial signals. The ranking is intentionally conservative: it is a discovery layer, not a final judgment about a molecule, mechanism, sponsor, or disease program.",
        "The most useful workflow is to scan the top list, open the example NCT record, then move into the live database for related sponsors, phases, indications, and stop-reason language.",
      ],
      tableTitle: "Top neurology drugs and interventions by stopped-trial signals",
      tableIntro:
        "Ranked by likely biological failure signals first, then by total stopped-trial records. Counts are generated from the current ClinicalTrials.gov-derived dataset.",
      rows: topRows,
      methodology: [
        "This ranking groups neurology stopped trials by the first listed intervention name. It captures repeated signals in the compact dataset, but it does not replace product-level due diligence or full registry review.",
        "Efficacy/futility and safety buckets are treated as likely biological failure signals. Enrollment, funding, operational, strategic, regulatory, and unclear reasons are included in total stopped-trial counts but not in the biological-signal numerator.",
        "Neurology has many heterogeneous conditions and endpoints. A stopped trial in dementia, epilepsy, pain, movement disorders, or neuropsychiatric disease can mean very different things. Use the table to prioritize which source records deserve review first.",
      ],
      related: [
        { href: "/failures/neurology", label: "Neurology failure hub", text: "Review crawlable neurology stopped-trial records." },
        { href: "/why-clinical-trials-fail", label: "Why trials fail", text: "Separate biological and non-biological stop reasons." },
        { href: "/explore?area=Neurology", label: "Explore neurology records", text: "Open the live database filtered to neurology." },
      ],
    },
  };
};

export default TopSeoPage;
