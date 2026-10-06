import { TrialIndexRow, UrlState, SortKey } from "./types";
import { classificationReasonBucket, isResolvedBiologicalFailure } from "./classificationResolution";

/** Split phases like "PHASE1; PHASE2" into normalized tokens */
export function parsePhases(phasesRaw: string): string[] {
  const s = (phasesRaw || "").trim();
  if (!s) return [];
  return s
    .split(";")
    .map((x) => x.trim().toUpperCase())
    .filter(Boolean);
}

export function phaseLabel(phaseKey: string): string {
  const p = (phaseKey || "").toUpperCase();
  if (p === "EARLY_PHASE1") return "Early Phase I";
  if (p === "PHASE1") return "Phase I";
  if (p === "PHASE1/PHASE2") return "Phase I/II";
  if (p === "PHASE2") return "Phase II";
  if (p === "PHASE2/PHASE3") return "Phase II/III";
  if (p === "PHASE3") return "Phase III";
  if (p === "PHASE4") return "Phase IV";
  return "Unknown";
}

export function reasonBucket(r: TrialIndexRow): string {
  return classificationReasonBucket(r);
}

function textIncludes(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function normToken(s?: string): string {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function matchesEntityList(value: string | undefined, selected: string[]): boolean {
  // Commas belong to entity names; the pipeline separates entries with semicolons.
  return (value || "").split(";").some((entry) => selected.includes(normToken(entry)));
}

export function isLikelyScientificFailure(r: TrialIndexRow): boolean {
  return isResolvedBiologicalFailure(r);
}

export function filterRows(rows: TrialIndexRow[], state: UrlState): TrialIndexRow[] {
  const q = (state.q || "").trim();
  const status = state.status?.map((s) => s.toUpperCase()) || [];
  const phase = state.phase?.map((s) => s.toUpperCase()) || [];
  const area = state.area || [];
  const bucket = state.bucket?.map((s) => s.toUpperCase()) || [];

  // Deep-link facets (not all are exposed in the current sidebar UI)
  const sponsor = (state.sponsor || []).map(normToken).filter(Boolean);
  const intervention = (state.intervention || []).map(normToken).filter(Boolean);
  const condition = (state.condition || []).map(normToken).filter(Boolean);
  const country = (state.country || []).map(normToken).filter(Boolean);

  return rows.filter((r) => {
    // q search
    if (q) {
      const blob = [
        r.nct_id,
        r.brief_title,
        r.lead_sponsor,
        r.conditions || r.condition_first,
        r.intervention_names || r.intervention_first,
        r.disease_area,
        r.why_stopped_short
      ]
        .filter(Boolean)
        .join(" | ");
      if (!textIncludes(blob, q)) return false;
    }

    // status
    if (status.length) {
      const s = (r.overall_status || "").toUpperCase();
      if (!status.includes(s)) return false;
    }

    // phase
    if (phase.length) {
      const ps = parsePhases(r.phases || "");
      // if trial has no phases, treat as UNKNOWN
      const has = ps.length ? ps : ["UNKNOWN"];
      if (!has.some((x) => phase.includes(x))) return false;
    }

    // disease area
    if (area.length) {
      const a = (r.disease_area || "Other").trim();
      if (!area.includes(a)) return false;
    }

    // sponsor (exact match, case-insensitive)
    if (sponsor.length) {
      const s = normToken(r.lead_sponsor);
      if (!sponsor.includes(s)) return false;
    }

    // Match any complete entity, retaining support for older first-only indexes.
    if (intervention.length) {
      if (!matchesEntityList(r.intervention_names || r.intervention_first, intervention)) return false;
    }
    if (condition.length) {
      if (!matchesEntityList(r.conditions || r.condition_first, condition)) return false;
    }
    if (country.length) {
      if (!matchesEntityList(r.countries || (r as any).country, country)) return false;
    }

    // bucket
    if (bucket.length) {
      const b = reasonBucket(r).toUpperCase();
      if (!bucket.includes(b)) return false;
    }

    // scientific failure toggle
    if (state.bio) {
      if (!isLikelyScientificFailure(r)) return false;
    }

    // dates (optional)
    if (state.date_from) {
      const d = (r.last_update_post_date || r.date || "").slice(0, 10);
      if (d && d < state.date_from) return false;
    }
    if (state.date_to) {
      const d = (r.last_update_post_date || r.date || "").slice(0, 10);
      if (d && d > state.date_to) return false;
    }

    return true;
  });
}

function parseDateOrZero(s?: string): number {
  if (!s) return 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

export function sortRows(rows: TrialIndexRow[], sortKey: SortKey): TrialIndexRow[] {
  const out = [...rows];
  out.sort((a, b) => {
    if (sortKey === "date_desc")
      return parseDateOrZero(b.last_update_post_date || b.date) - parseDateOrZero(a.last_update_post_date || a.date);
    if (sortKey === "date_asc")
      return parseDateOrZero(a.last_update_post_date || a.date) - parseDateOrZero(b.last_update_post_date || b.date);

    if (sortKey === "sponsor_asc") return (a.lead_sponsor || "").localeCompare(b.lead_sponsor || "");
    if (sortKey === "sponsor_desc") return (b.lead_sponsor || "").localeCompare(a.lead_sponsor || "");

    // confidence sort (optional)
    const ca = (a.classification_confidence || "").toUpperCase();
    const cb = (b.classification_confidence || "").toUpperCase();
    const rank = (x: string) => (x === "HIGH" ? 3 : x === "MEDIUM" ? 2 : x === "LOW" ? 1 : 0);

    if (sortKey === "confidence_desc") return rank(cb) - rank(ca);
    if (sortKey === "confidence_asc") return rank(ca) - rank(cb);

    return 0;
  });
  return out;
}
