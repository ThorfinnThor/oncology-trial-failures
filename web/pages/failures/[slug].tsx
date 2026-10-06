import type { GetStaticPaths, GetStaticProps } from "next";

import SeoHubPage from "@/components/SeoHubPage";
import {
  buildFailureHubs,
  buildHubEditorialInsight,
  displayHubRows,
  findFailureHub,
  hubStats,
  type HubEditorialInsight,
  type HubStats,
} from "@/lib/seoHubs";
import type { DatasetMeta, TrialIndexRow } from "@/lib/types";

type FailureHubPageProps = {
  hub: {
    slug: string;
    title: string;
    h1: string;
    description: string;
    path: string;
    label: string;
    total: number;
    eyebrow: string;
    kind: "area" | "phase" | "reason";
  };
  rows: TrialIndexRow[];
  stats: HubStats;
  editorial: HubEditorialInsight | null;
  datasetMeta: DatasetMeta;
};

export default function FailureHubPage({ hub, rows, stats, editorial, datasetMeta }: FailureHubPageProps) {
  return (
    <SeoHubPage
      hub={hub}
      rows={rows}
      stats={stats}
      editorial={editorial}
      datasetMeta={datasetMeta}
      parentHref="/failures"
      parentLabel="Failure hubs"
    />
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  return {
    paths: buildFailureHubs(rows).map((hub) => ({ params: { slug: hub.slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<FailureHubPageProps> = async (ctx) => {
  const slug = String(ctx.params?.slug || "");
  const { loadIndexServer, loadMetaServer } = await import("@/lib/server-data");
  const [rows, datasetMeta] = await Promise.all([loadIndexServer(), loadMetaServer()]);
  const hub = findFailureHub(rows, slug);

  if (!hub) return { notFound: true };
  const stats = hubStats(hub.rows);

  return {
    props: {
      hub: {
        slug: hub.slug,
        title: hub.title,
        h1: hub.h1,
        description: hub.description,
        path: hub.path,
        label: hub.label,
        total: hub.total,
        kind: hub.kind,
        eyebrow:
          hub.kind === "area"
            ? "Disease area hub"
            : hub.kind === "phase"
              ? "Phase hub"
              : "Stop-reason hub",
      },
      rows: displayHubRows(hub.rows, 60),
      stats,
      editorial: buildHubEditorialInsight(hub, stats),
      datasetMeta,
    },
  };
};
