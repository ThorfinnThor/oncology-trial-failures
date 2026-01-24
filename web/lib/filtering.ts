import { ReasonBucket, SortKey, TrialIndexRow, UrlState } from "./types";

function norm(s: string) {
  return (s || "").toLowerCase();
}

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

export function parsePhases(phasesRaw: string): PhaseKey[] {
  const raw = (phasesRaw || "").toUpperCase();
  if (!raw.trim()) return ["Unknown"];

  const out = new Set<PhaseKey>();

  if (raw.includes("1/2") || raw.includes("I/II")) out.add("I/II");
  if (raw.includes("2/3") || raw.includes("II/III")) out.add("II/III");
  if (raw.includes("EARLY PHASE 1")) out.add("EP1");

  if (raw.includes("PHASE1") || raw.includes("PHASE 1") || raw.includes("PHASE I")) out.add("I");
  if (raw.includes("PHASE2") || raw.includes("PHASE 2") || raw.includes("PHASE II")) out.add("II");
  if (raw.includes("PHASE3") || raw.includes("PHASE 3") || raw.includes("PHASE III")) out.add("III");
  if (raw.includes("PHASE4") || raw.includes("PHASE 4") || raw.includes("PHASE IV")) out.add("IV");

  if (out.size === 0) out.add("Unknown");
  return PHASE_ORDER.filter((p) => out.has(p));
}

export function reasonBucket(r: TrialIndexRow): ReasonBucket {
  const base = (r.classification_reason || "").toUpperCase();
  if (base === "SAFETY") return "Safety";
  if (base === "EFFICACY/FUTILITY") return "Efficacy";

  // Use short reason text (cheap)
  const w = norm(r.why_stopped_short || "");
  if (w.includes("recruit") || w.includes("enroll") || w.includes("accrual")) return "Enrollment";
  if (w.includes("funding") || w.includes("budget") || w.includes("financial")) return "Funding";
  if (w.includes("strategic") || w.includes("priorit") || w.includes("portfolio") || w.includes("business")) return "Strategic";
  if (w.includes("regulatory") || w.includes("irb") || w.includes("fda") || w.includes("ema")) return "Regulatory";
  if (base === "OPERATIONAL") return "Operational";
  return "Other/Unknown";
}

export function confidenceScore(r: TrialIndexRow): number {
  const c = (r.classification_confidence || "").toUpperCase();
  if (c === "HIGH") return 3;
  if (c === "MEDIUM") return 2;
  if (c === "LOW") return 1;
  return 0;
}

export function filterRows(rows: TrialIndexRow[], state: UrlState): TrialIndexRow[] {
  let out = rows;

  // Search: single includes() on precomputed blob (fast)
  const q = (state.q || "").trim().toLowerCase();
  if (q) out = out.filter((r) => (r.search_blob || "").includes(q));

  // Likely scientific failure (binary)
  if (state.bio) {
    out = out.filter((r) =>
      r.classification_label === "BIOLOGICAL_FAILURE" &&
      ["HIGH", "MEDIUM"].includes((r.classification_confidence || "").toUpperCase())
    );
  }

  if (state.status?.length) {
    const set = new Set(state.status.map((x) => x.toUpperCase()));
    out = out.filter((r) => set.has((r.overall_status || "").toUpperCase()));
  }

  if (state.phase?.length) {
    const set = new Set(state.phase);
    out = out.filter((r) => parsePhases(r.phases || "").some((p) => set.has(p)));
  }

  if (state.area?.length) {
    const set = new Set(state.area);
    out = out.filter((r) => set.has((r.disease_area || "Other") || "Other"));
  }

  if (state.bucket?.length) {
    const set = new Set(state.bucket);
    out = out.filter((r) => set.has(reasonBucket(r)));
  }

  // Lightweight sponsor/condition/intervention filtering uses index fields only (fast)
  if (state.sponsor?.length) {
    const set = new Set(state.sponsor);
    out = out.filter((r) => set.has((r.lead_sponsor || "").trim()));
  }

  if (state.condition?.length) {
    const set = new Set(state.condition);
    out = out.filter((r) => set.has(r.condition_first));
  }

  if (state.intervention?.length) {
    const set = new Set(state.intervention);
    out = out.filter((r) => set.has(r.intervention_first));
  }

  if (state.date_from) out = out.filter((r) => (r.last_update_post_date || "") >= state.date_from!);
  if (state.date_to) out = out.filter((r) => (r.last_update_post_date || "") <= state.date_to!);

  return out;
}

export function sortRows(rows: TrialIndexRow[], sort: SortKey): TrialIndexRow[] {
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
