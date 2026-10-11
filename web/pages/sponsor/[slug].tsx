import type { GetStaticPaths, GetStaticProps } from "next";

import SponsorEvidencePage from "@/components/SponsorEvidencePage";
import {
  buildSponsorEditorialInsight,
  buildSponsorHubs,
  displayHubRows,
  findSponsorHub,
  sponsorEvidenceStats,
  type SponsorEvidenceStats,
  type SponsorEditorialInsight,
} from "@/lib/seoHubs";
import type { DatasetMeta, TrialIndexRow } from "@/lib/types";

type SponsorHubPageProps = {
  hub: {
    title: string;
    h1: string;
    description: string;
    path: string;
    label: string;
  };
  rows: TrialIndexRow[];
  stats: SponsorEvidenceStats;
  editorial: SponsorEditorialInsight | null;
  datasetMeta: DatasetMeta;
};

export default function SponsorHubPage({ hub, rows, stats, editorial, datasetMeta }: SponsorHubPageProps) {
  return <SponsorEvidencePage hub={hub} rows={rows} stats={stats} editorial={editorial} datasetMeta={datasetMeta} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  return {
    paths: buildSponsorHubs(rows).map((hub) => ({ params: { slug: hub.slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<SponsorHubPageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || "");
  const { loadIndexServer, loadMetaServer } = await import("@/lib/server-data");
  const [rows, datasetMeta] = await Promise.all([loadIndexServer(), loadMetaServer()]);
  const hub = findSponsorHub(rows, slug);

  if (!hub) return { notFound: true };

  return {
    props: {
      hub: {
        title: hub.title,
        h1: hub.h1,
        description: hub.description,
        path: hub.path,
        label: hub.label,
      },
      rows: displayHubRows(hub.rows, 60),
      stats: sponsorEvidenceStats(hub.rows),
      editorial: buildSponsorEditorialInsight(hub),
      datasetMeta,
    },
  };
};
