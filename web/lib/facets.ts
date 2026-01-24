import { TrialIndexRow } from "./types";
import { parsePhases, PHASE_ORDER, reasonBucket, phaseLabel } from "./filtering";

export type FacetOption = {
  value: string;
  label: string;
  count: number;
};

export type Facets = {
  status: FacetOption[];
  phase: FacetOption[]; // ordered by PHASE_ORDER
  area: FacetOption[];
  bucket: FacetOption[];

  sponsor_top10: FacetOption[];
  condition_top10: FacetOption[];
  intervention_top10: FacetOption[];

  sponsor_all: FacetOption[];
  condition_all: FacetOption[];
  intervention_all: FacetOption[];
};

function inc(map: Map<string, number>, key: string) {
  if (!key) return;
  map.set(key, (map.get(key) || 0) + 1);
}

function sortDesc(map: Map<string, number>): Array<[string, number]> {
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function topN(map: Map<string, number>, n: number): Array<[string, number]> {
  return sortDesc(map).slice(0, n);
}

function toOptions(pairs: Array<[string, number]>, labelFn?: (v: string) => string): FacetOption[] {
  return pairs.map(([value, count]) => ({
    value,
    count,
    label: labelFn ? labelFn(value) : value,
  }));
}

/**
 * Compute facets from TrialIndexRow (fast).
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

  const phasePairs: Array<[string, number]> = PHASE_ORDER
    .map((p) => [p, phase.get(p) || 0] as [string, number])
    .filter(([, c]) => c > 0);

  return {
    status: toOptions(sortDesc(status)),
    phase: toOptions(phasePairs, (v) => phaseLabel(v as any)),
    area: toOptions(sortDesc(area)),
    bucket: toOptions(sortDesc(bucket)),

    sponsor_top10: toOptions(topN(sponsor, 10)),
    condition_top10: toOptions(topN(condition, 10)),
    intervention_top10: toOptions(topN(intervention, 10)),

    sponsor_all: toOptions(sortDesc(sponsor)),
    condition_all: toOptions(sortDesc(condition)),
    intervention_all: toOptions(sortDesc(intervention)),
  };
}
