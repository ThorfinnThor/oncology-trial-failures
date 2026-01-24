import { splitSemicolonValues } from "./data";
import { ReasonBucket, TrialRow } from "./types";
import { normalizePhase, reasonBucket } from "./filtering";

export type FacetOption = { value: string; count: number };

function topOptions(map: Map<string, number>, limit: number): FacetOption[] {
  const arr: FacetOption[] = Array.from(map.entries()).map(([value, count]) => ({ value, count }));
  arr.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  return arr.slice(0, limit);
}

export function buildFacets(trials: TrialRow[]) {
  const status = new Map<string, number>();
  const phase = new Map<string, number>();
  const area = new Map<string, number>();
  const bucket = new Map<string, number>();
  const sponsor = new Map<string, number>();
  const intervention = new Map<string, number>();
  const condition = new Map<string, number>();

  for (const t of trials) {
    const s = (t.overall_status || "").toUpperCase() || "UNKNOWN";
    status.set(s, (status.get(s) || 0) + 1);

    for (const p of normalizePhase(t.phases || "")) phase.set(p, (phase.get(p) || 0) + 1);

    const a = (t.disease_area || "Other") || "Other";
    area.set(a, (area.get(a) || 0) + 1);

    const b = reasonBucket(t) as ReasonBucket;
    bucket.set(b, (bucket.get(b) || 0) + 1);

    const sp = (t.lead_sponsor || "").trim();
    if (sp) sponsor.set(sp, (sponsor.get(sp) || 0) + 1);

    for (const i of splitSemicolonValues(t.intervention_names || "")) {
      intervention.set(i, (intervention.get(i) || 0) + 1);
    }

    for (const c of splitSemicolonValues(t.conditions || "")) {
      condition.set(c, (condition.get(c) || 0) + 1);
    }
  }

  return {
    status: topOptions(status, 50),
    phase: topOptions(phase, 10),
    area: topOptions(area, 200),
    bucket: topOptions(bucket, 50),
    sponsor: topOptions(sponsor, 200),
    intervention: topOptions(intervention, 300),
    condition: topOptions(condition, 300),

    // sizes for “show more” messaging
    counts: {
      sponsors: sponsor.size,
      interventions: intervention.size,
      conditions: condition.size,
      areas: area.size,
    },
  };
}
