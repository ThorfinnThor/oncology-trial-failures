import { TrialIndexRow, UrlState, SortKey } from "./types";

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
  // Prefer explicit field from pipeline if present:
  const base = (r.classification_reason || "").toUpperCase().trim();
  if (base) return base;

  // Fallback heuristic:
  const why = (r.why_stopped_short || "").toUpperCase();
  if (why.includes("EFFICACY") || why.includes("FUTILITY") || why.includes("INSUFFICIENT")) return "EFFICACY/FUTILITY";
  if (why.includes("SAFETY") || why.includes("TOXIC") || why.includes("ADVERSE")) return "SAFETY";
  if (why.includes("ENROLL") || why.includes("RECRUIT")) return "ENROLLMENT";
  if (why.includes("FUND")) return "FUNDING";
  if (why.includes("REGULAT") || why.includes("FDA") || why.includes("AUTHORITY")) return "REGULATORY";
  if (why.includes("STRATEG")) return "STRATEGIC";
  if (why.includes("OPERATION") || why.includes("LOGISTIC") || why.includes("SUPPLY")) return "OPERATIONAL";
  return "OTHER/UNKNOWN";
}

function textIncludes(hay: string, needle: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function normToken(s?: string): string {
  return (s || "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function isLikelyScientificFailure(r: TrialIndexRow): boolean {
  // Use pipeline labels if available:
  const label = (r.failure_label || r.classification_label || r.failure_type || "").toUpperCase();

  if (label.includes("BIOLOGICAL_FAILURE") || label.includes("SCIENTIFIC_FAILURE")) return true;

  // Fall back: if reason bucket is efficacy/futility, assume likely scientific failure
  const bucket = reasonBucket(r);
  if (bucket === "EFFICACY/FUTILITY") return true;

  return false;
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
        r.condition_first,
        r.intervention_first,
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

    // intervention / condition / country (exact match against compact index fields when available)
    if (intervention.length) {
      const x = normToken((r as any).intervention_first || (r as any).intervention_names);
      if (!intervention.includes(x)) return false;
    }
    if (condition.length) {
      const x = normToken((r as any).condition_first || (r as any).conditions);
      if (!condition.includes(x)) return false;
    }
    if (country.length) {
      // Some builds may not carry country in the compact index; tolerate missing.
      const blob = normToken((r as any).countries || (r as any).country || "");
      if (!blob) return false;
      // If countries is a semicolon/comma list, accept any match.
      if (!country.some((c) => blob.split(/[,;|]/).map((t: string) => normToken(t)).includes(c))) return false;
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
