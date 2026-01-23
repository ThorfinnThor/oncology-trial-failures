import { ReasonBucket, TrialRow, WorkbenchState } from "./types";
import { splitSemicolonValues } from "./data";

export function mapReasonBucket(row: TrialRow): ReasonBucket {
  const r = (row.classification_reason || "").toUpperCase();
  if (r === "SAFETY") return "safety";
  if (r === "EFFICACY/FUTILITY") return "efficacy";
  if (r === "OPERATIONAL") return "operational";
  return "other";
}

function phaseTokens(row: TrialRow): string[] {
  const p = splitSemicolonValues(row.phases || "");
  return p.map((x) => x.toUpperCase());
}

function conditionsTokens(row: TrialRow): string[] {
  return splitSemicolonValues(row.conditions || "");
}

function interventionTokens(row: TrialRow): string[] {
  return splitSemicolonValues(row.intervention_names || "");
}

function sponsorTokens(row: TrialRow): string[] {
  const a: string[] = [];
  if (row.lead_sponsor) a.push(row.lead_sponsor);
  for (const c of splitSemicolonValues(row.collaborators || "")) a.push(c);
  return a;
}

function countryTokens(row: TrialRow): string[] {
  return splitSemicolonValues(row.countries || "");
}

function includesAny(haystack: string, q: string) {
  return haystack.toLowerCase().includes(q.toLowerCase());
}

function inDateRange(d: string | undefined, from?: string, to?: string) {
  if (!d) return false;
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export type FacetOption = { value: string; count: number };

export type Facets = {
  phase: FacetOption[];
  status: FacetOption[];
  area: FacetOption[];
  country: FacetOption[];
  reason: FacetOption[];
  condition: FacetOption[];
  intervention: FacetOption[];
  sponsor: FacetOption[];
};

function topN(counts: Record<string, number>, n: number): FacetOption[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

export function computeFacets(rows: TrialRow[], limitLongLists = 250): Facets {
  const phaseC: Record<string, number> = {};
  const statusC: Record<string, number> = {};
  const areaC: Record<string, number> = {};
  const countryC: Record<string, number> = {};
  const reasonC: Record<string, number> = {};
  const conditionC: Record<string, number> = {};
  const interventionC: Record<string, number> = {};
  const sponsorC: Record<string, number> = {};

  for (const r of rows) {
    for (const p of phaseTokens(r)) phaseC[p] = (phaseC[p] || 0) + 1;
    const st = (r.overall_status || "").toUpperCase() || "UNKNOWN";
    statusC[st] = (statusC[st] || 0) + 1;

    const area = (r.disease_area || "Other") || "Other";
    areaC[area] = (areaC[area] || 0) + 1;

    for (const c of countryTokens(r)) countryC[c] = (countryC[c] || 0) + 1;

    const bucket = mapReasonBucket(r);
    reasonC[bucket] = (reasonC[bucket] || 0) + 1;

    for (const c of conditionsTokens(r)) conditionC[c] = (conditionC[c] || 0) + 1;
    for (const i of interventionTokens(r)) interventionC[i] = (interventionC[i] || 0) + 1;
    for (const s of sponsorTokens(r)) sponsorC[s] = (sponsorC[s] || 0) + 1;
  }

  return {
    phase: topN(phaseC, 50),
    status: topN(statusC, 20),
    area: topN(areaC, 200),
    country: topN(countryC, 200),
    reason: topN(reasonC, 20),
    condition: topN(conditionC, limitLongLists),
    intervention: topN(interventionC, limitLongLists),
    sponsor: topN(sponsorC, limitLongLists),
  };
}

export function applyFilters(rows: TrialRow[], st: WorkbenchState): TrialRow[] {
  const q = (st.q || "").trim();

  return rows.filter((r) => {
    if (st.phase?.length) {
      const pt = phaseTokens(r);
      if (!st.phase.some((p) => pt.includes(p.toUpperCase()))) return false;
    }

    if (st.status?.length) {
      const os = (r.overall_status || "").toUpperCase();
      if (!st.status.map((x) => x.toUpperCase()).includes(os)) return false;
    }

    if (st.area?.length) {
      const a = (r.disease_area || "Other") || "Other";
      if (!st.area.includes(a)) return false;
    }

    if (st.country?.length) {
      const ct = countryTokens(r);
      if (!st.country.some((c) => ct.includes(c))) return false;
    }

    if (st.reason?.length) {
      const b = mapReasonBucket(r);
      if (!st.reason.includes(b)) return false;
    }

    if (st.condition?.length) {
      const ct = conditionsTokens(r);
      if (!st.condition.some((c) => ct.includes(c))) return false;
    }

    if (st.intervention?.length) {
      const it = interventionTokens(r);
      if (!st.intervention.some((i) => it.includes(i))) return false;
    }

    if (st.sponsor?.length) {
      const sp = sponsorTokens(r);
      if (!st.sponsor.some((s) => sp.includes(s))) return false;
    }

    if (st.date_from || st.date_to) {
      if (!inDateRange(r.last_update_post_date, st.date_from, st.date_to)) return false;
    }

    if (q) {
      const blob = [
        r.nct_id,
        r.brief_title,
        r.lead_sponsor,
        r.collaborators,
        r.conditions,
        r.mesh_terms,
        r.intervention_names,
        r.why_stopped,
        r.disease_area,
        r.countries,
      ].filter(Boolean).join(" | ");
      if (!includesAny(blob, q)) return false;
    }

    return true;
  });
}

export function sortRows(rows: TrialRow[], sort: WorkbenchState["sort"]): TrialRow[] {
  const s = sort || "date_desc";
  const copy = [...rows];

  const confRank = (c: string) => {
    const x = (c || "").toUpperCase();
    if (x === "HIGH") return 3;
    if (x === "MEDIUM") return 2;
    if (x === "LOW") return 1;
    return 0;
  };

  switch (s) {
    case "date_asc":
      copy.sort((a, b) => (a.last_update_post_date || "").localeCompare(b.last_update_post_date || ""));
      break;
    case "date_desc":
      copy.sort((a, b) => (b.last_update_post_date || "").localeCompare(a.last_update_post_date || ""));
      break;
    case "sponsor_asc":
      copy.sort((a, b) => (a.lead_sponsor || "").localeCompare(b.lead_sponsor || ""));
      break;
    case "sponsor_desc":
      copy.sort((a, b) => (b.lead_sponsor || "").localeCompare(a.lead_sponsor || ""));
      break;
    case "phase_asc":
      copy.sort((a, b) => (a.phases || "").localeCompare(b.phases || ""));
      break;
    case "phase_desc":
      copy.sort((a, b) => (b.phases || "").localeCompare(a.phases || ""));
      break;
    case "confidence_asc":
      copy.sort((a, b) => confRank(a.classification_confidence) - confRank(b.classification_confidence));
      break;
    case "confidence_desc":
      copy.sort((a, b) => confRank(b.classification_confidence) - confRank(a.classification_confidence));
      break;
  }

  return copy;
}
