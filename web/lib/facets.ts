import { TrialIndexRow } from "./types";
import { parsePhases, PHASE_ORDER, reasonBucket } from "./filtering";

export type FacetCounts = Array<[string, number]>;

export type Facets = {
  status: FacetCounts;
  phase: FacetCounts; // ordered by PHASE_ORDER
  area: FacetCounts;
  bucket: FacetCounts;

  sponsor_top10: FacetCounts;
  condition_top10: FacetCounts;
  intervention_top10: FacetCounts;

  // full lists if needed (can be large)
  sponsor_all: FacetCounts;
  condition_all: FacetCounts;
  intervention_all: FacetCounts;
};

function inc(map: Map<string, number>, key: string) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function sortDesc(map: Map<string, number>): FacetCounts {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function topN(map: Map<string, number>, n: number): FacetCounts {
  return sortDesc(map).slice(0, n);
}

/**
 * Compute facets from TrialIndexRow (fast).
 * Uses only already-normalized index fields (first condition/intervention),
 * plus computed phase and bucket.
 */
export function computeFacets(rows: TrialIndexRow[]): Facets {
  const status = new Map<string, number>();
  const phase = new Map<string, number>();
  const area = new Map<string, number>();
  const bucket = new Map<string, number>();

  const sponsor = new Map<string, number>();
  const condition = new Map<string, number>();
  const intervention = new Map<string, number>();

  for (const r of rows) {
    inc(status, (r.overall_status || "").toUpperCase());
    inc(area, (r.disease_area || "Other") || "Other");

    const ph = parsePhases(r.phases || "")[0] || "Unknown";
    inc(phase, ph);

    inc(bucket, reasonBucket(r));

    const s = (r.lead_sponsor || "").trim();
    if (s) inc(sponsor, s);

    if (r.condition_first) inc(condition, r.condition_first);
    if (r.intervention_first) inc(intervention, r.intervention_first);
  }

  const phaseOrdered: FacetCounts = PHASE_ORDER
    .map((p) => [p, phase.get(p) || 0] as [string, number])
    .filter(([, c]) => c > 0);

  return {
    status: sortDesc(status),
    phase: phaseOrdered,
    area: sortDesc(area),
    bucket: sortDesc(bucket),

    sponsor_top10: topN(sponsor, 10),
    condition_top10: topN(condition, 10),
    intervention_top10: topN(intervention, 10),

    sponsor_all: sortDesc(sponsor),
    condition_all: sortDesc(condition),
    intervention_all: sortDesc(intervention),
  };
}
