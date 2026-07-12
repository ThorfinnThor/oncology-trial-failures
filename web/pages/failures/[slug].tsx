import type { GetStaticPaths, GetStaticProps } from "next";

import SeoHubPage from "@/components/SeoHubPage";
import { displayHubRows, findFailureHub, buildFailureHubs, hubStats, type HubStats } from "@/lib/seoHubs";
import type { TrialIndexRow } from "@/lib/types";

type FailureHubPageProps = {
  hub: {
    title: string;
    h1: string;
    description: string;
    path: string;
    label: string;
    total: number;
    eyebrow: string;
  };
  rows: TrialIndexRow[];
  stats: HubStats;
};

export default function FailureHubPage({ hub, rows, stats }: FailureHubPageProps) {
  return (
    <SeoHubPage
      hub={hub}
      rows={rows}
      stats={stats}
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
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  const hub = findFailureHub(rows, slug);

  if (!hub) return { notFound: true };

  return {
    props: {
      hub: {
        title: hub.title,
        h1: hub.h1,
        description: hub.description,
        path: hub.path,
        label: hub.label,
        total: hub.total,
        eyebrow:
          hub.kind === "area"
            ? "Disease area hub"
            : hub.kind === "phase"
              ? "Phase hub"
              : "Stop-reason hub",
      },
      rows: displayHubRows(hub.rows),
      stats: hubStats(hub.rows),
    },
  };
};
