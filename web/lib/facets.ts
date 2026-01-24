import { TrialIndexRow } from "./types";
import { parsePhases, PHASE_ORDER, phaseLabel, reasonBucket } from "./filtering";

export type FacetOption = { value: string; label: string; count: number };

function topN(map: Map<string, number>, n = 50): FacetOption[] {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, label: value, count }));
}

export function computeFacets(rows: TrialIndexRow[]) {
  const status = new Map<string, number>();
  const phase = new Map<string, number>();
  const area = new Map<string, number>();
  const bucket = new Map<string, number>();

  for (const r of rows) {
    const st = (r.overall_status || "UNKNOWN").toUpperCase();
    status.set(st, (status.get(st) || 0) + 1);

    const phases = parsePhases(r.phases || "");
    for (const p of phases) phase.set(p, (phase.get(p) || 0) + 1);

    const a = (r.disease_area || "Other").trim() || "Other";
    area.set(a, (area.get(a) || 0) + 1);

    const b = reasonBucket(r);
    bucket.set(b, (bucket.get(b) || 0) + 1);
  }

  const statusOptions = topN(status, 30);

  // Phase: canonical order, never by count
  const phaseOptions: FacetOption[] = PHASE_ORDER.map((p) => ({
    value: p,
    label: phaseLabel(p),
    count: phase.get(p) || 0
  })).filter((x) => x.count > 0);

  const areaOptions = topN(area, 200);
  const bucketOptions = topN(bucket, 50);

  return {
    status: statusOptions,
    phase: phaseOptions,
    area: areaOptions,
    bucket: bucketOptions
  };
}
