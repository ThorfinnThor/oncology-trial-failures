import { isLikelyScientificFailure, parsePhases, reasonBucket } from "./filtering";
import type { InsightStats } from "./insights";
import { loadIndexServer } from "./server-data";
import type { TrialIndexRow } from "./types";

function countBy(rows: TrialIndexRow[], getValue: (row: TrialIndexRow) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = getValue(row) || "Other/unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function topCounts(rows: TrialIndexRow[], getValue: (row: TrialIndexRow) => string, limit: number) {
  return Object.entries(countBy(rows, getValue))
    .map(([label, count]) => ({ label, count }))
    .filter((item) => item.label && item.label !== "Other/unknown")
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function pct(part: number, total: number): string {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export function bucketCount(stats: Pick<InsightStats, "buckets">, bucket: string): number {
  return stats.buckets[bucket] || 0;
}

export async function buildInsightStats(): Promise<InsightStats> {
  const rows = await loadIndexServer();
  const statuses = countBy(rows, (row) => (row.overall_status || "").toUpperCase());
  const buckets = countBy(rows, (row) => reasonBucket(row).toUpperCase());
  const topAreas = countBy(rows, (row) => row.disease_area || "Other");
  const scientificCount = rows.filter(isLikelyScientificFailure).length;

  const oncologyRows = rows.filter((row) => (row.disease_area || "") === "Oncology");
  const oncologyBuckets = countBy(oncologyRows, (row) => reasonBucket(row).toUpperCase());
  const oncologyScientificCount = oncologyRows.filter(isLikelyScientificFailure).length;
  const oncologyPhase2Rows = oncologyRows.filter((row) => parsePhases(row.phases || "").includes("PHASE2"));
  const oncologyPhase2Buckets = countBy(oncologyPhase2Rows, (row) => reasonBucket(row).toUpperCase());

  return {
    total: rows.length,
    statuses: {
      terminated: statuses.TERMINATED || 0,
      withdrawn: statuses.WITHDRAWN || 0,
      suspended: statuses.SUSPENDED || 0,
    },
    buckets,
    topAreas,
    scientificCount,
    scientificShare: pct(scientificCount, rows.length),
    oncology: {
      total: oncologyRows.length,
      buckets: oncologyBuckets,
      scientificCount: oncologyScientificCount,
      phase2Total: oncologyPhase2Rows.length,
      phase2Buckets: oncologyPhase2Buckets,
      topSponsors: topCounts(oncologyRows, (row) => row.lead_sponsor || "Unknown sponsor", 5),
    },
  };
}
