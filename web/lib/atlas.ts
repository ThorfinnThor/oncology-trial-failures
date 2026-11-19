// The atlas of stopped trials (/atlas): every stopped trial as one light, clustered by disease area
// and coloured by why it stopped. buildAtlasData runs at build time (scripts/generate-atlas-data.ts)
// and writes public/atlas/data.json; the page draws it on a canvas in the browser.
//
// The layout is a star field, not a regular spiral: a sunflower spiral reads as a flickering
// mandala. Each cluster still orders its lights from the core outwards by reason group, so the
// biological stops (efficacy, safety) sit at the centre and the operational ones further out.

import type { TrialIndexRow } from "./types";

export const ATLAS_DATA_FILE = "public/atlas/data.json";
export const ATLAS_DATA_URL = "/atlas/data.json";

// Plain-language groups, in their order from the core of a cluster to its edge.
export const ATLAS_GROUPS = [
  { key: "efficacy", label: "Not enough benefit" },
  { key: "safety", label: "Safety concerns" },
  { key: "transition", label: "Planned end or replaced" },
  { key: "recruitment", label: "Too few participants" },
  { key: "business", label: "Business or funding" },
  { key: "operational", label: "Operational reasons" },
  { key: "unclear", label: "No clear reason given" },
] as const;

export type AtlasGroupKey = (typeof ATLAS_GROUPS)[number]["key"];

export const ATLAS_PHASES = [
  { key: "EARLY_PHASE1", label: "Early phase 1" },
  { key: "PHASE1", label: "Phase 1" },
  { key: "PHASE1; PHASE2", label: "Phase 1/2" },
  { key: "PHASE2", label: "Phase 2" },
  { key: "PHASE2; PHASE3", label: "Phase 2/3" },
  { key: "PHASE3", label: "Phase 3" },
  { key: "PHASE4", label: "Phase 4" },
  { key: "NA", label: "Not applicable" },
] as const;

export const ATLAS_STATUSES = ["TERMINATED", "WITHDRAWN", "SUSPENDED"] as const;

const BUSINESS = new Set(["BUSINESS_STRATEGY", "FUNDING", "SUPPORT_WITHDRAWAL"]);

/** The #fragment that opens the atlas zoomed into one disease area, e.g. "gastroenterology-and-hepatology". */
export function atlasAreaHash(area: string): string {
  return area.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** The plain-language group a trial falls into, from its final classification. */
export function atlasGroup(row: Pick<TrialIndexRow, "classification_final_outcome" | "classification_final_category">): AtlasGroupKey {
  const outcome = row.classification_final_outcome || "";
  const category = row.classification_final_category || "";
  if (outcome === "BIOLOGICAL_FAILURE") return category === "SAFETY" ? "safety" : "efficacy";
  if (outcome === "NON_FAILURE_TRANSITION") return "transition";
  if (outcome === "NON_BIOLOGICAL") {
    if (category === "RECRUITMENT") return "recruitment";
    if (BUSINESS.has(category)) return "business";
    return "operational";
  }
  // UNRESOLVED, CAUSE_NOT_STATED and MIXED_CAUSES: the record does not settle one reason.
  return "unclear";
}

export type AtlasArea = { name: string; x: number; y: number; r: number; n: number };

/** Columnar so 24,000 trials stay small: index i across the arrays is one trial. */
export type AtlasData = {
  version: string;
  groups: Array<{ key: AtlasGroupKey; label: string }>;
  phases: string[];
  statuses: string[];
  areas: AtlasArea[];
  sponsors: string[];
  x: number[];
  y: number[];
  g: number[];
  a: number[];
  p: number[];
  s: number[];
  st: number[];
  yr: number[];
  id: number[];
  t: string[];
  w: string[];
  d: string[];
};

export type AtlasSummary = {
  total: number;
  biological: number;
  groups: Array<{ key: AtlasGroupKey; label: string; count: number }>;
};

// Deterministic so the layout is the same on every build (mulberry32).
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function yearOf(row: TrialIndexRow): number {
  for (const value of [row.completion_date, row.primary_completion_date, row.last_update_post_date, row.start_date]) {
    if (value && /^\d{4}/.test(value)) return Number(value.slice(0, 4));
  }
  return 0;
}

function clip(text: string | undefined, limit: number): string {
  const value = (text || "").replace(/\s+/g, " ").trim();
  return value.length <= limit ? value : `${value.slice(0, limit - 1).trimEnd()}…`;
}

function countDesc(values: string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

const SPACING = 1;   // one light per unit of area; a cluster's radius grows with sqrt(trials)
const GAP = 7;       // space between clusters
const SCALE = 10;    // stored coordinates are world units x 10, rounded to integers

/**
 * Place the disease-area clusters: largest first at the centre, then each next circle at the free
 * spot closest to the centre (a greedy circle packing, stretched a little wider than tall).
 */
function placeClusters(sizes: Array<[string, number]>): Map<string, { x: number; y: number; r: number }> {
  const placed: Array<{ name: string; x: number; y: number; r: number }> = [];
  for (const [name, count] of sizes) {
    const r = SPACING * Math.sqrt(count) * 1.02 + 2;
    if (!placed.length) {
      placed.push({ name, x: 0, y: 0, r });
      continue;
    }
    let best: { score: number; x: number; y: number } | null = null;
    for (const other of placed) {
      for (let step = 0; step < 180; step++) {
        const angle = (step * 2 * Math.PI) / 180;
        const d = other.r + r + GAP;
        const x = other.x + d * Math.cos(angle);
        const y = other.y + d * Math.sin(angle);
        if (!placed.every((q) => Math.hypot(x - q.x, y - q.y) >= q.r + r + GAP - 1e-6)) continue;
        const score = Math.hypot(x, y * 1.35);
        if (!best || score < best.score) best = { score, x, y };
      }
    }
    placed.push({ name, x: best!.x, y: best!.y, r });
  }
  return new Map(placed.map((c) => [c.name, { x: c.x, y: c.y, r: c.r }]));
}

export function buildAtlasData(rows: TrialIndexRow[], version: string): AtlasData {
  const trials = rows.filter((row) => row.nct_id);
  const groupIndex = new Map(ATLAS_GROUPS.map((group, index) => [group.key, index]));
  const phaseIndex = new Map(ATLAS_PHASES.map((phase, index) => [phase.key as string, index]));
  const naPhase = phaseIndex.get("NA")!;

  const areaSizes = countDesc(trials.map((row) => row.disease_area || "Other"));
  const areaIndex = new Map(areaSizes.map(([name], index) => [name, index]));
  const sponsors = countDesc(trials.map((row) => row.lead_sponsor || "Unknown sponsor")).map(([name]) => name);
  const sponsorIndex = new Map(sponsors.map((name, index) => [name, index]));
  const clusters = placeClusters(areaSizes);

  const out: Omit<AtlasData, "version" | "groups" | "phases" | "statuses" | "areas" | "sponsors"> = {
    x: [], y: [], g: [], a: [], p: [], s: [], st: [], yr: [], id: [], t: [], w: [], d: [],
  };
  const random = seededRandom(20261117);

  for (const [area] of areaSizes) {
    const centre = clusters.get(area)!;
    const members = trials
      .filter((row) => (row.disease_area || "Other") === area)
      .sort((a, b) =>
        groupIndex.get(atlasGroup(a))! - groupIndex.get(atlasGroup(b))! ||
        yearOf(a) - yearOf(b) ||
        a.nct_id.localeCompare(b.nct_id)
      );
    const n = members.length;
    members.forEach((row, i) => {
      // The radius comes from a band slightly wider than the trial's own slot, so neighbouring
      // groups blend at their edges instead of forming hard rings; the angle is random.
      const slot = Math.min(n, Math.max(0, i + (random() * 0.08 - 0.04) * n + random()));
      const radius = SPACING * Math.sqrt(slot);
      const angle = random() * 2 * Math.PI;
      const status = ATLAS_STATUSES.indexOf(row.overall_status as (typeof ATLAS_STATUSES)[number]);
      out.x.push(Math.round((centre.x + radius * Math.cos(angle)) * SCALE));
      out.y.push(Math.round((centre.y + radius * Math.sin(angle)) * SCALE));
      out.g.push(groupIndex.get(atlasGroup(row))!);
      out.a.push(areaIndex.get(area)!);
      out.p.push(phaseIndex.get(row.phases || "NA") ?? naPhase);
      out.s.push(sponsorIndex.get(row.lead_sponsor || "Unknown sponsor")!);
      out.st.push(status < 0 ? 0 : status);
      out.yr.push(yearOf(row));
      out.id.push(Number(row.nct_id.slice(3)));
      out.t.push(clip(row.brief_title, 90));
      out.w.push(clip(row.why_stopped_short, 160));
      out.d.push(clip(row.intervention_first, 48));
    });
  }

  return {
    version,
    groups: ATLAS_GROUPS.map((group) => ({ key: group.key, label: group.label })),
    phases: ATLAS_PHASES.map((phase) => phase.label),
    statuses: ["Terminated", "Withdrawn", "Suspended"],
    areas: areaSizes.map(([name, count]) => {
      const c = clusters.get(name)!;
      return { name, x: Math.round(c.x * SCALE), y: Math.round(c.y * SCALE), r: Math.round(c.r * SCALE), n: count };
    }),
    sponsors,
    ...out,
  };
}

/** The figures the page renders on the server, before the data file has loaded. */
export function atlasSummary(rows: TrialIndexRow[]): AtlasSummary {
  const trials = rows.filter((row) => row.nct_id);
  const counts = new Map<AtlasGroupKey, number>();
  for (const row of trials) counts.set(atlasGroup(row), (counts.get(atlasGroup(row)) || 0) + 1);
  return {
    total: trials.length,
    biological: (counts.get("efficacy") || 0) + (counts.get("safety") || 0),
    groups: ATLAS_GROUPS.map((group) => ({ key: group.key, label: group.label, count: counts.get(group.key) || 0 })),
  };
}
