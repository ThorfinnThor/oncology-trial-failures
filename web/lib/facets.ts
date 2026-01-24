import { TrialIndexRow } from "./types";
import { parsePhases, phaseLabel, reasonBucket } from "./filtering";

export type FacetOption = { value: string; label: string; count: number };

function addCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

const PHASE_ORDER = [
  "EARLY_PHASE1",
  "PHASE1",
  "PHASE1/PHASE2",
  "PHASE2",
  "PHASE2/PHASE3",
  "PHASE3",
  "PHASE4",
  "UNKNOWN"
];

export function computeFacets(rows: TrialIndexRow[]): {
  status: FacetOption[];
  phase: FacetOption[];
  area: FacetOption[];
  bucket: FacetOption[];
} {
  const statusM = new Map<string, number>();
  const phaseM = new Map<string, number>();
  const areaM = new Map<string, number>();
  const bucketM = new Map<string, number>();

  for (const r of rows) {
    addCount(statusM, (r.overall_status || "UNKNOWN").toUpperCase());

    const ps = parsePhases(r.phases || "");
    if (!ps.length) addCount(phaseM, "UNKNOWN");
    else for (const p of ps) addCount(phaseM, p);

    addCount(areaM, (r.disease_area || "Other").trim());

    addCount(bucketM, reasonBucket(r).toUpperCase());
  }

  const status = Array.from(statusM.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count);

  const phase = PHASE_ORDER.filter((p) => phaseM.has(p)).map((value) => ({
    value,
    label: phaseLabel(value),
    count: phaseM.get(value) || 0
  }));

  const area = Array.from(areaM.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count);

  const bucket = Array.from(bucketM.entries())
    .map(([value, count]) => ({ value, label: value, count }))
    .sort((a, b) => b.count - a.count);

  return { status, phase, area, bucket };
}
