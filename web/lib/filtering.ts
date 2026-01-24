import { splitSemicolonValues } from "./data";
import { ReasonBucket, SortKey, TrialRow, UrlState } from "./types";

function norm(s: string) {
  return (s || "").toLowerCase();
}

/**
 * Phase keys used in URL/state and facet filtering.
 * We keep these short and stable.
 */
export type PhaseKey = "EP1" | "I" | "I/II" | "II" | "II/III" | "III" | "IV" | "Unknown";

export const PHASE_ORDER: PhaseKey[] = ["EP1", "I", "I/II", "II", "II/III", "III", "IV", "Unknown"];

export function phaseLabel(p: PhaseKey): string {
  switch (p) {
    case "EP1": return "Early Phase 1";
    case "I": return "Phase I";
    case "I/II": return "Phase I/II";
    case "II": return "Phase II";
    case "II/III": return "Phase II/III";
    case "III": return "Phase III";
    case "IV": return "Phase IV";
    default: return "Unknown";
  }
}

/**
 * Parse phases from raw strings.
 * We detect explicit combined phases by slash patterns (e.g., Phase 1/2, Phase 2/3).
 * We do NOT invent combined phases from separate tokens like "PHASE1; PHASE2".
 */
export function parsePhases(phasesRaw: string): PhaseKey[] {
  const raw = (phasesRaw || "").toUpperCase();

  if (!raw.trim()) return ["Unknown"];

  const out = new Set<PhaseKey>();

  // explicit combined
  if (raw.includes("1/2") || raw.includes("I/II") || raw.includes("PHASE 1/2") || raw.includes("PHASE1/2") || raw.includes("PHASE 1 / 2")) {
    out.add("I/II");
  }
  if (raw.includes("2/3") || raw.includes("II/III") || raw.includes("PHASE 2/3") || raw.includes("PHASE2/3") || raw.includes("PHASE 2 / 3")) {
    out.add("II/III");
  }

  // Early Phase 1 (if present)
  if (raw.includes("EARLY PHASE 1") || raw.includes("EARLY_PHASE1") || raw.includes("EARLYPHASE1")) {
    out.add("EP1");
  }

  // single phases
  if (raw.includes("PHASE1") || raw.includes("PHASE 1") || raw.includes("PHASE I")) out.add("I");
  if (raw.includes("PHASE2") || raw.includes("PHASE 2") || raw.includes("PHASE II")) out.add("II");
  if (raw.includes("PHASE3") || raw.includes("PHASE 3") || raw.includes("PHASE III")) out.add("III");
  if (raw.includes("PHASE4") || raw.includes("PHASE 4") || raw.includes("PHASE IV")) out.add("IV");

  if (out.size === 0) out.add("Unknown");

  // order deterministically
  return PHASE_ORDER.filter((p) => out.has(p));
}

// Structured bucket inference from why_stopped + existing reason
export function reasonBucket(t: TrialRow): ReasonBucket {
  const base = (t.classification_reason || "").toUpperCase();
  if (base === "SAFETY") return "Safety";
  if (base === "EFFICACY/FUTILITY") return "Efficacy";

  const w = norm(t.why_stopped || "");

  if (w.includes("recruit") || w.includes("enroll") || w.includes("accrual") || w.includes("participant")) return "Enrollment";
  if (w.includes("funding") || w.includes("budget") || w.includes("financial")) return "Funding";
  if (w.includes("strategic") || w.includes("priorit") || w.includes("portfolio") || w.includes("business") || w.includes("commercial") || w.includes("competitive")) return "Strategic";
  if (w.includes("regulatory") || w.includes("irb") || w.includes("ethics") || w.includes("fda") || w.includes("ema") || w.includes("authority")) return "Regulatory";

  if (base === "OPERATIONAL") return "Operational";
  return "Other/Unknown";
}

export function confidenceScore(t: TrialRow): number {
  const c = (t.classification_confidence || "").toUpperCase();
  if (c === "HIGH") return 3;
  if (c === "MEDIUM") return 2;
  if (c === "LOW") return 1;
  return 0;
}

export function matchesQuery(t: TrialRow, q: string): boolean {
  const needle = norm(q.trim());
  if (!needle) return true;

  const blob = [
    t.nct_id,
    t.brief_title,
    t.lead_sponsor,
    t.collaborators,
    t.conditions,
    t.intervention_names,
    t.disease_area,
    t.mesh_terms,
    t.why_stopped,
  ].filter(Boolean).join(" | ");

  return norm(blob).includes(needle);
}

export function filterTrials(trials: TrialRow[], state: UrlState): TrialRow[] {
  let rows = trials;

  if (state.q) rows = rows.filter((t) => matchesQuery(t, state.q!));

  // “Likely scientific failure” filter (binary)
  if (state.bio) {
    rows = rows.filter((t) =>
      (t.classification_label || "") === "BIOLOGICAL_FAILURE" &&
      ["HIGH", "MEDIUM"].includes((t.classification_confidence || "").toUpperCase())
    );
  }

  if (state.status?.length) {
    const set = new Set(state.status.map((x) => x.toUpperCase()));
    rows = rows.filter((t) => set.has((t.overall_status || "").toUpperCase()));
  }

  if (state.phase?.length) {
    const set = new Set(state.phase as any); // PhaseKey strings
    rows = rows.filter((t) => parsePhases(t.phases || "").some((p) => set.has(p)));
  }

  if (state.area?.length) {
    const set = new Set(state.area);
    rows = rows.filter((t) => set.has((t.disease_area || "Other") || "Other"));
  }

  if (state.bucket?.length) {
    const set = new Set(state.bucket);
    rows = rows.filter((t) => set.has(reasonBucket(t)));
  }

  if (state.sponsor?.length) {
    const set = new Set(state.sponsor);
    rows = rows.filter((t) => set.has((t.lead_sponsor || "").trim()));
  }

  if (state.intervention?.length) {
    const set = new Set(state.intervention);
    rows = rows.filter((t) => splitSemicolonValues(t.intervention_names || "").some((x) => set.has(x)));
  }

  if (state.condition?.length) {
    const set = new Set(state.condition);
    rows = rows.filter((t) => splitSemicolonValues(t.conditions || "").some((x) => set.has(x)));
  }

  if (state.date_from) rows = rows.filter((t) => (t.last_update_post_date || "") >= state.date_from!);
  if (state.date_to) rows = rows.filter((t) => (t.last_update_post_date || "") <= state.date_to!);

  return rows;
}

export function sortTrials(rows: TrialRow[], sort: SortKey): TrialRow[] {
  const out = [...rows];

  switch (sort) {
    case "date_asc":
      out.sort((a, b) => (a.last_update_post_date || "").localeCompare(b.last_update_post_date || ""));
      break;
    case "date_desc":
      out.sort((a, b) => (b.last_update_post_date || "").localeCompare(a.last_update_post_date || ""));
      break;
    case "sponsor_asc":
      out.sort((a, b) => (a.lead_sponsor || "").localeCompare(b.lead_sponsor || ""));
      break;
    case "sponsor_desc":
      out.sort((a, b) => (b.lead_sponsor || "").localeCompare(a.lead_sponsor || ""));
      break;
    case "phase_asc":
      out.sort((a, b) => parsePhases(a.phases || "")[0].localeCompare(parsePhases(b.phases || "")[0]));
      break;
    case "phase_desc":
      out.sort((a, b) => parsePhases(b.phases || "")[0].localeCompare(parsePhases(a.phases || "")[0]));
      break;
    case "confidence_asc":
      out.sort((a, b) => confidenceScore(a) - confidenceScore(b));
      break;
    case "confidence_desc":
      out.sort((a, b) => confidenceScore(b) - confidenceScore(a));
      break;
    default:
      out.sort((a, b) => (b.last_update_post_date || "").localeCompare(a.last_update_post_date || ""));
  }

  return out;
}
