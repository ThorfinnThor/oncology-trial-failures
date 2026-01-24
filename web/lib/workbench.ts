import { ReasonBucket, TrialRow, UrlState } from "./types";
import { splitSemicolonValues } from "./data";

/**
 * Map record into a structured reason bucket.
 * Uses existing classification_reason when present, otherwise infers from why_stopped text.
 */
export function mapReasonBucket(row: TrialRow): ReasonBucket {
  const base = (row.classification_reason || "").toUpperCase();

  if (base === "SAFETY") return "Safety";
  if (base === "EFFICACY/FUTILITY") return "Efficacy";

  const w = (row.why_stopped || "").toLowerCase();

  if (w.includes("recruit") || w.includes("enroll") || w.includes("accrual") || w.includes("participant")) {
    return "Enrollment";
  }
  if (w.includes("funding") || w.includes("budget") || w.includes("financial")) {
    return "Funding";
  }
  if (
    w.includes("strategic") ||
    w.includes("priorit") ||
    w.includes("portfolio") ||
    w.includes("business") ||
    w.includes("commercial") ||
    w.includes("competitive")
  ) {
    return "Strategic";
  }
  if (w.includes("regulatory") || w.includes("irb") || w.includes("ethics") || w.includes("fda") || w.includes("ema")) {
    return "Regulatory";
  }

  // If your pipeline uses OPERATIONAL as a catch-all:
  if (base === "OPERATIONAL") return "Operational";

  return "Other/Unknown";
}

/**
 * Normalize phase values to {I,II,III,IV,Unknown}.
 */
export function normalizePhase(phasesRaw: string): string[] {
  const parts = splitSemicolonValues(phasesRaw).map((p) => p.toLowerCase());
  if (!parts.length) return ["Unknown"];

  const out: string[] = [];
  const add = (v: string) => { if (!out.includes(v)) out.push(v); };

  for (const p of parts) {
    if (p.includes("phase1") || p.includes("phase 1") || p.includes("phase i")) add("I");
    else if (p.includes("phase2") || p.includes("phase 2") || p.includes("phase ii")) add("II");
    else if (p.includes("phase3") || p.includes("phase 3") || p.includes("phase iii")) add("III");
    else if (p.includes("phase4") || p.includes("phase 4") || p.includes("phase iv")) add("IV");
    else add("Unknown");
  }

  return out.length ? out : ["Unknown"];
}

export function confidenceScore(row: TrialRow): number {
  const c = (row.classification_confidence || "").toUpperCase();
  if (c === "HIGH") return 3;
  if (c === "MEDIUM") return 2;
  if (c === "LOW") return 1;
  return 0;
}

export function matchesGlobalQuery(row: TrialRow, q: string): boolean {
  const needle = (q || "").trim().toLowerCase();
  if (!needle) return true;

  const blob = [
    row.nct_id,
    row.brief_title,
    row.lead_sponsor,
    row.collaborators,
    row.conditions,
    row.intervention_names,
    row.disease_area,
    row.mesh_terms,
    row.why_stopped,
  ].filter(Boolean).join(" | ").toLowerCase();

  return blob.includes(needle);
}

/**
 * Apply URL-state filters to rows.
 * This is used by the workbench UI.
 */
export function applyWorkbenchFilters(rows: TrialRow[], state: UrlState): TrialRow[] {
  let out = rows;

  // Search
  if (state.q) out = out.filter((r) => matchesGlobalQuery(r, state.q!));

  // Bio facet: your UI uses this as "likely biological failures"
  if (state.bio) {
    out = out.filter(
      (r) =>
        (r.classification_label || "") === "BIOLOGICAL_FAILURE" &&
        ["HIGH", "MEDIUM"].includes((r.classification_confidence || "").toUpperCase())
    );
  }

  // Status
  if (state.status?.length) {
    const set = new Set(state.status.map((s) => s.toUpperCase()));
    out = out.filter((r) => set.has((r.overall_status || "").toUpperCase()));
  }

  // Phase
  if (state.phase?.length) {
    const set = new Set(state.phase);
    out = out.filter((r) => normalizePhase(r.phases || "").some((p) => set.has(p)));
  }

  // Area
  if (state.area?.length) {
    const set = new Set(state.area);
    out = out.filter((r) => set.has((r.disease_area || "Other") || "Other"));
  }

  // Reason bucket
  if (state.bucket?.length) {
    const set = new Set(state.bucket);
    out = out.filter((r) => set.has(mapReasonBucket(r)));
  }

  // Sponsor
  if (state.sponsor?.length) {
    const set = new Set(state.sponsor);
    out = out.filter((r) => set.has((r.lead_sponsor || "").trim()));
  }

  // Intervention
  if (state.intervention?.length) {
    const set = new Set(state.intervention);
    out = out.filter((r) => splitSemicolonValues(r.intervention_names || "").some((x) => set.has(x)));
  }

  // Condition
  if (state.condition?.length) {
    const set = new Set(state.condition);
    out = out.filter((r) => splitSemicolonValues(r.conditions || "").some((x) => set.has(x)));
  }

  // Date range (last update date)
  if (state.date_from) out = out.filter((r) => (r.last_update_post_date || "") >= state.date_from!);
  if (state.date_to) out = out.filter((r) => (r.last_update_post_date || "") <= state.date_to!);

  return out;
}
