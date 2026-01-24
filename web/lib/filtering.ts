import { ReasonBucket, SortKey, TrialIndexRow, UrlState } from "./types";

/**
 * Phase normalization and ordering
 */
export const PHASE_ORDER = [
  "EARLY_PHASE1",
  "PHASE1",
  "PHASE1/PHASE2",
  "PHASE2",
  "PHASE2/PHASE3",
  "PHASE3",
  "PHASE4",
  "NOT_APPLICABLE",
  "UNKNOWN",
] as const;

export type PhaseKey = (typeof PHASE_ORDER)[number];

export function parsePhases(phasesRaw: string): PhaseKey[] {
  const s = (phasesRaw || "").toUpperCase();

  // Common encodings coming from CT.gov exports/pipeline
  const keys: PhaseKey[] = [];
  if (!s.trim()) return ["UNKNOWN"];

  const add = (k: PhaseKey) => {
    if (!keys.includes(k)) keys.push(k);
  };

  if (s.includes("EARLY") && s.includes("PHASE 1")) add("EARLY_PHASE1");
  if (s.includes("PHASE 1/PHASE 2") || (s.includes("PHASE 1") && s.includes("PHASE 2") && s.includes("/"))) add("PHASE1/PHASE2");
  if (s.includes("PHASE 2/PHASE 3") || (s.includes("PHASE 2") && s.includes("PHASE 3") && s.includes("/"))) add("PHASE2/PHASE3");
  if (s.includes("PHASE 1") && !s.includes("EARLY") && !s.includes("1/PHASE 2")) add("PHASE1");
  if (s.includes("PHASE 2") && !s.includes("2/PHASE 3")) add("PHASE2");
  if (s.includes("PHASE 3")) add("PHASE3");
  if (s.includes("PHASE 4")) add("PHASE4");
  if (s.includes("NOT APPLICABLE")) add("NOT_APPLICABLE");

  if (keys.length === 0) add("UNKNOWN");
  return keys;
}

export function phaseLabel(k: PhaseKey): string {
  switch (k) {
    case "EARLY_PHASE1":
      return "Early Phase I";
    case "PHASE1":
      return "Phase I";
    case "PHASE1/PHASE2":
      return "Phase I/II";
    case "PHASE2":
      return "Phase II";
    case "PHASE2/PHASE3":
      return "Phase II/III";
    case "PHASE3":
      return "Phase III";
    case "PHASE4":
      return "Phase IV";
    case "NOT_APPLICABLE":
      return "Not applicable";
    case "UNKNOWN":
    default:
      return "Unknown";
  }
}

/**
 * Reason bucket (canonical union values)
 * Must return one of ReasonBucket.
 */
export function reasonBucket(r: TrialIndexRow): ReasonBucket {
  const base = (r.classification_reason || "").toUpperCase().trim();

  // Prefer pipeline classification_reason when present
  if (base === "SAFETY") return "SAFETY";
  if (base === "EFFICACY/FUTILITY") return "EFFICACY/FUTILITY";
  if (base === "OPERATIONAL") return "OPERATIONAL";
  if (base === "ENROLLMENT") return "ENROLLMENT";
  if (base === "FUNDING") return "FUNDING";
  if (base === "STRATEGIC") return "STRATEGIC";
  if (base === "REGULATORY") return "REGULATORY";
  if (base === "OTHER/UNKNOWN") return "OTHER/UNKNOWN";

  // Fallback: infer from short reason text (cheap heuristic)
  const txt = (r.why_stopped_short || "").toLowerCase();

  const has = (re: RegExp) => re.test(txt);

  if (has(/\bsafety\b|\btox\b|\btoxic\b|\badverse\b|\bserious adverse\b/)) return "SAFETY";
  if (has(/\befficacy\b|\bfutility\b|\binsufficient efficacy\b|\black of efficacy\b|\bno benefit\b/)) return "EFFICACY/FUTILITY";
  if (has(/\benroll\b|\brecruit\b|\bslow accrual\b|\binsufficient accrual\b/)) return "ENROLLMENT";
  if (has(/\bfund\b|\bbudget\b|\bfinancial\b/)) return "FUNDING";
  if (has(/\bstrategy\b|\bpriorit/)) return "STRATEGIC";
  if (has(/\bregulator\b|\bfda\b|\bethics\b|\birb\b/)) return "REGULATORY";

  // default
  return "OTHER/UNKNOWN";
}

/**
 * Filtering — works on TrialIndexRow
 */
export function filterRows(rows: TrialIndexRow[], state: UrlState): TrialIndexRow[] {
  const q = (state.q || "").trim().toLowerCase();

  const statusSet = new Set((state.status || []).map((x) => x.toUpperCase()));
  const phaseSet = new Set((state.phase || []).map((x) => x.toUpperCase()));
  const areaSet = new Set((state.area || []).map((x) => x.toLowerCase()));
  const bucketSet = new Set((state.bucket || []).map((x) => x.toUpperCase()));
  const sponsorSet = new Set((state.sponsor || []).map((x) => x.toLowerCase()));
  const conditionSet = new Set((state.condition || []).map((x) => x.toLowerCase()));
  const interventionSet = new Set((state.intervention || []).map((x) => x.toLowerCase()));

  const bioOnly = !!state.bio;

  const dateFrom = state.date_from ? new Date(state.date_from) : null;
  const dateTo = state.date_to ? new Date(state.date_to) : null;

  return rows.filter((r) => {
    if (statusSet.size) {
      const st = (r.overall_status || "").toUpperCase();
      if (!statusSet.has(st)) return false;
    }

    if (areaSet.size) {
      const a = ((r.disease_area || "Other") || "Other").toLowerCase();
      if (!areaSet.has(a)) return false;
    }

    if (bucketSet.size) {
      const b = reasonBucket(r);
      if (!bucketSet.has(b.toUpperCase())) return false;
    }

    if (bioOnly) {
      if ((r.classification_label || "").toUpperCase() !== "BIOLOGICAL_FAILURE") return false;
    }

    if (sponsorSet.size) {
      const s = (r.lead_sponsor || "").toLowerCase();
      if (!sponsorSet.has(s)) return false;
    }

    if (conditionSet.size) {
      const c = (r.condition_first || "").toLowerCase();
      if (!conditionSet.has(c)) return false;
    }

    if (interventionSet.size) {
      const i = (r.intervention_first || "").toLowerCase();
      if (!interventionSet.has(i)) return false;
    }

    if (phaseSet.size) {
      const ph = parsePhases(r.phases || "");
      const ok = ph.some((p) => phaseSet.has(p.toUpperCase()));
      if (!ok) return false;
    }

    if (dateFrom || dateTo) {
      const d = r.last_update_post_date ? new Date(r.last_update_post_date) : null;
      if (d) {
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }
    }

    if (q) {
      const hay = [
        r.nct_id,
        r.brief_title,
        r.lead_sponsor,
        r.collaborators,
        r.condition_first,
        r.intervention_first,
        r.why_stopped_short,
        r.disease_area,
        r.overall_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Sorting
 */
function cmp(a: any, b: any) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sortRows(rows: TrialIndexRow[], sortKey: SortKey): TrialIndexRow[] {
  const arr = rows.slice();

  arr.sort((x, y) => {
    switch (sortKey) {
      case "date_asc":
        return cmp(x.last_update_post_date, y.last_update_post_date);
      case "date_desc":
        return -cmp(x.last_update_post_date, y.last_update_post_date);

      case "sponsor_asc":
        return cmp((x.lead_sponsor || "").toLowerCase(), (y.lead_sponsor || "").toLowerCase());
      case "sponsor_desc":
        return -cmp((x.lead_sponsor || "").toLowerCase(), (y.lead_sponsor || "").toLowerCase());

      case "confidence_asc":
        return cmp((x.classification_confidence || "").toUpperCase(), (y.classification_confidence || "").toUpperCase());
      case "confidence_desc":
        return -cmp((x.classification_confidence || "").toUpperCase(), (y.classification_confidence || "").toUpperCase());

      default:
        return -cmp(x.last_update_post_date, y.last_update_post_date);
    }
  });

  return arr;
}
