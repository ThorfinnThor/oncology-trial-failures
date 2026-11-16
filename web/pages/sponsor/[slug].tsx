import type { GetStaticPaths, GetStaticProps } from "next";

import SponsorEvidencePage from "@/components/SponsorEvidencePage";
import {
  buildSponsorEditorialInsight,
  buildSponsorPages,
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
  indexable: boolean;
  rows: TrialIndexRow[];
  stats: SponsorEvidenceStats;
  editorial: SponsorEditorialInsight | null;
  datasetMeta: DatasetMeta;
};

export default function SponsorHubPage({ hub, indexable, rows, stats, editorial, datasetMeta }: SponsorHubPageProps) {
  return <SponsorEvidencePage hub={hub} indexable={indexable} rows={rows} stats={stats} editorial={editorial} datasetMeta={datasetMeta} />;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  return {
    // Every sponsor page, indexable or not, so no sponsor page turns into a 404 after a data update.
    paths: buildSponsorPages(rows).map((hub) => ({ params: { slug: hub.slug } })),
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
      indexable: hub.indexable,
      rows: displayHubRows(hub.rows, 60),
      stats: sponsorEvidenceStats(hub.rows),
      editorial: buildSponsorEditorialInsight(hub),
      datasetMeta,
    },
  };
};
