import { splitSemicolonValues } from "./data";
import { ReasonBucket, SortKey, TrialRow, UrlState } from "./types";

function norm(s: string) {
  return (s || "").toLowerCase();
}

export function normalizePhase(phasesRaw: string): string[] {
  const parts = splitSemicolonValues(phasesRaw).map((p) => norm(p));
  const out: string[] = [];

  const add = (v: string) => { if (!out.includes(v)) out.push(v); };

  if (!parts.length) return ["Unknown"];

  for (const p of parts) {
    if (p.includes("phase1") || p.includes("phase 1") || p.includes("phase i")) add("I");
    else if (p.includes("phase2") || p.includes("phase 2") || p.includes("phase ii")) add("II");
    else if (p.includes("phase3") || p.includes("phase 3") || p.includes("phase iii")) add("III");
    else if (p.includes("phase4") || p.includes("phase 4") || p.includes("phase iv")) add("IV");
    else add("Unknown");
  }

  return out.length ? out : ["Unknown"];
}

// Structured bucket inference from why_stopped + existing reason
export function reasonBucket(t: TrialRow): ReasonBucket {
  const base = (t.classification_reason || "").toUpperCase();
  if (base === "SAFETY") return "Safety";
  if (base === "EFFICACY/FUTILITY") return "Efficacy";

  const w = norm(t.why_stopped || "");

  // operational sub-buckets
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

  // Global search
  if (state.q) rows = rows.filter((t) => matchesQuery(t, state.q!));

  // bio facet
  if (state.bio) {
    rows = rows.filter((t) => (t.classification_label || "") === "BIOLOGICAL_FAILURE"
      && ["HIGH", "MEDIUM"].includes((t.classification_confidence || "").toUpperCase())
    );
  }

  // status facet
  if (state.status?.length) {
    const set = new Set(state.status.map((x) => x.toUpperCase()));
    rows = rows.filter((t) => set.has((t.overall_status || "").toUpperCase()));
  }

  // phase facet
  if (state.phase?.length) {
    const set = new Set(state.phase);
    rows = rows.filter((t) => normalizePhase(t.phases || "").some((p) => set.has(p)));
  }

  // disease area facet
  if (state.area?.length) {
    const set = new Set(state.area);
    rows = rows.filter((t) => set.has((t.disease_area || "Other") || "Other"));
  }

  // bucket facet
  if (state.bucket?.length) {
    const set = new Set(state.bucket);
    rows = rows.filter((t) => set.has(reasonBucket(t)));
  }

  // sponsor facet
  if (state.sponsor?.length) {
    const set = new Set(state.sponsor);
    rows = rows.filter((t) => set.has((t.lead_sponsor || "").trim()));
  }

  // intervention facet
  if (state.intervention?.length) {
    const set = new Set(state.intervention);
    rows = rows.filter((t) => splitSemicolonValues(t.intervention_names || "").some((x) => set.has(x)));
  }

  // condition facet
  if (state.condition?.length) {
    const set = new Set(state.condition);
    rows = rows.filter((t) => splitSemicolonValues(t.conditions || "").some((x) => set.has(x)));
  }

  // date range: last_update_post_date
  if (state.date_from) {
    rows = rows.filter((t) => (t.last_update_post_date || "") >= state.date_from!);
  }
  if (state.date_to) {
    rows = rows.filter((t) => (t.last_update_post_date || "") <= state.date_to!);
  }

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
      out.sort((a, b) => normalizePhase(a.phases || "")[0].localeCompare(normalizePhase(b.phases || "")[0]));
      break;
    case "phase_desc":
      out.sort((a, b) => normalizePhase(b.phases || "")[0].localeCompare(normalizePhase(a.phases || "")[0]));
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

export function relatedTrials(all: TrialRow[], base: TrialRow) {
  const sponsor = (base.lead_sponsor || "").trim();
  const interventions = new Set(splitSemicolonValues(base.intervention_names || ""));
  const conditions = new Set(splitSemicolonValues(base.conditions || ""));

  const sameSponsor = all.filter((t) => t.nct_id !== base.nct_id && (t.lead_sponsor || "").trim() === sponsor).slice(0, 5);

  const sameIntervention = all
    .filter((t) => t.nct_id !== base.nct_id && splitSemicolonValues(t.intervention_names || "").some((x) => interventions.has(x)))
    .slice(0, 5);

  const sameCondition = all
    .filter((t) => t.nct_id !== base.nct_id && splitSemicolonValues(t.conditions || "").some((x) => conditions.has(x)))
    .slice(0, 5);

  return { sameSponsor, sameIntervention, sameCondition };
}
