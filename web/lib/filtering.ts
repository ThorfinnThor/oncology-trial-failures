import { TrialIndexRow, UrlState, SortKey } from "./types";

export type PhaseKey =
  | "EARLY_PHASE1"
  | "PHASE1"
  | "PHASE1/PHASE2"
  | "PHASE2"
  | "PHASE2/PHASE3"
  | "PHASE3"
  | "PHASE4"
  | "NOT_APPLICABLE"
  | "UNKNOWN";

export const PHASE_ORDER: PhaseKey[] = [
  "EARLY_PHASE1",
  "PHASE1",
  "PHASE1/PHASE2",
  "PHASE2",
  "PHASE2/PHASE3",
  "PHASE3",
  "PHASE4",
  "NOT_APPLICABLE",
  "UNKNOWN"
];

function normPhaseToken(t: string): PhaseKey | null {
  const s = (t || "").trim().toUpperCase();

  if (!s) return null;

  if (s.includes("EARLY") && s.includes("PHASE") && s.includes("1")) return "EARLY_PHASE1";
  if (s === "PHASE1" || s === "PHASE 1" || s === "PHASE I" || s === "I") return "PHASE1";
  if (s === "PHASE2" || s === "PHASE 2" || s === "PHASE II" || s === "II") return "PHASE2";
  if (s === "PHASE3" || s === "PHASE 3" || s === "PHASE III" || s === "III") return "PHASE3";
  if (s === "PHASE4" || s === "PHASE 4" || s === "PHASE IV" || s === "IV") return "PHASE4";

  if (s.includes("PHASE") && (s.includes("1/2") || (s.includes("1") && s.includes("2")))) return "PHASE1/PHASE2";
  if (s.includes("PHASE") && (s.includes("2/3") || (s.includes("2") && s.includes("3")))) return "PHASE2/PHASE3";

  if (s.includes("NOT APPLICABLE")) return "NOT_APPLICABLE";

  return null;
}

export function parsePhases(raw: string): PhaseKey[] {
  const s = (raw || "").trim();
  if (!s) return ["UNKNOWN"];

  const tokens = s
    .split(/[;|,]/g)
    .map((x) => x.trim())
    .filter(Boolean);

  const out: PhaseKey[] = [];
  for (const tok of tokens) {
    const p = normPhaseToken(tok);
    if (p) out.push(p);
  }

  if (out.length === 0) return ["UNKNOWN"];

  // unique preserving PHASE_ORDER
  const set = new Set(out);
  return PHASE_ORDER.filter((p) => set.has(p));
}

export function phaseLabel(p: PhaseKey): string {
  switch (p) {
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
    default:
      return "Unknown";
  }
}

export function reasonBucket(r: TrialIndexRow): string {
  const base = (r.classification_reason || "").toUpperCase();
  if (base) return base;

  // fallback: infer lightly from why text
  const w = (r.why_stopped_short || "").toLowerCase();
  if (!w) return "OTHER/UNKNOWN";

  if (w.includes("lack of efficacy") || w.includes("insufficient efficacy") || w.includes("futility") || w.includes("ineffective"))
    return "EFFICACY/FUTILITY";
  if (w.includes("safety") || w.includes("toxic") || w.includes("adverse")) return "SAFETY";
  if (w.includes("enroll") || w.includes("recruit")) return "ENROLLMENT";
  if (w.includes("fund") || w.includes("budget")) return "FUNDING";
  if (w.includes("regulator") || w.includes("fda") || w.includes("ema")) return "REGULATORY";
  if (w.includes("strategic") || w.includes("portfolio") || w.includes("business")) return "STRATEGIC";
  if (w.includes("operational") || w.includes("logistic") || w.includes("site")) return "OPERATIONAL";

  return "OTHER/UNKNOWN";
}

function includesAny(hay: string, needles: string[]) {
  const h = hay.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

export function filterRows(rows: TrialIndexRow[], state: UrlState): TrialIndexRow[] {
  let out = rows;

  // search
  const q = (state.q || "").trim().toLowerCase();
  if (q) {
    out = out.filter((r) => {
      const blob = [
        r.nct_id,
        r.brief_title,
        r.lead_sponsor,
        r.collaborators,
        r.condition_first,
        r.intervention_first,
        r.disease_area,
        r.why_stopped_short
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }

  // status
  if (state.status?.length) {
    const set = new Set(state.status.map((s) => s.toUpperCase()));
    out = out.filter((r) => set.has((r.overall_status || "").toUpperCase()));
  }

  // phase
  if (state.phase?.length) {
    const set = new Set(state.phase.map((p) => p.toUpperCase()));
    out = out.filter((r) => parsePhases(r.phases || "").some((p) => set.has(p)));
  }

  // disease area
  if (state.area?.length) {
    const set = new Set(state.area.map((a) => a.toLowerCase()));
    out = out.filter((r) => set.has((r.disease_area || "Other").toLowerCase()));
  }

  // reason bucket
  if (state.bucket?.length) {
    const set = new Set(state.bucket.map((b) => b.toUpperCase()));
    out = out.filter((r) => set.has(reasonBucket(r)));
  }

  // bio toggle: keep only "scientific failure" flagged
  if (state.bio) {
    out = out.filter((r) => (r.classification_label || "").toUpperCase() === "BIOLOGICAL_FAILURE");
  }

  // date range (optional; uses last_update_post_date as available)
  const from = state.date_from ? Date.parse(state.date_from) : NaN;
  const to = state.date_to ? Date.parse(state.date_to) : NaN;

  if (!Number.isNaN(from) || !Number.isNaN(to)) {
    out = out.filter((r) => {
      const d = Date.parse(r.last_update_post_date || "");
      if (Number.isNaN(d)) return false;
      if (!Number.isNaN(from) && d < from) return false;
      if (!Number.isNaN(to) && d > to) return false;
      return true;
    });
  }

  return out;
}

function cmp(a: any, b: any) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function dateVal(s?: string) {
  const d = Date.parse(s || "");
  return Number.isNaN(d) ? -1 : d;
}

function confVal(s?: string) {
  const c = (s || "").toUpperCase();
  if (c === "HIGH") return 3;
  if (c === "MED") return 2;
  if (c === "LOW") return 1;
  return 0;
}

export function sortRows(rows: TrialIndexRow[], sort: SortKey): TrialIndexRow[] {
  const out = [...rows];
  out.sort((x, y) => {
    switch (sort) {
      case "date_asc":
        return cmp(dateVal(x.last_update_post_date), dateVal(y.last_update_post_date));
      case "date_desc":
        return cmp(dateVal(y.last_update_post_date), dateVal(x.last_update_post_date));
      case "sponsor_asc":
        return cmp((x.lead_sponsor || "").toLowerCase(), (y.lead_sponsor || "").toLowerCase());
      case "sponsor_desc":
        return cmp((y.lead_sponsor || "").toLowerCase(), (x.lead_sponsor || "").toLowerCase());
      case "confidence_asc":
        return cmp(confVal(x.classification_confidence), confVal(y.classification_confidence));
      case "confidence_desc":
        return cmp(confVal(y.classification_confidence), confVal(x.classification_confidence));
      default:
        return 0;
    }
  });
  return out;
}
