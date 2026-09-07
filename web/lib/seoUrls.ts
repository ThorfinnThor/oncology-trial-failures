import type { TrialIndexRow } from "./types";

export function slugify(value: string): string {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function extractNctId(value: string): string {
  // Next.js route parameters are already decoded; literal percent signs are valid here.
  const raw = (value || "").trim();
  const match = raw.match(/NCT\d{8}/i);
  return match ? match[0].toUpperCase() : raw.toUpperCase();
}

export function trialSlug(row: Pick<TrialIndexRow, "nct_id" | "brief_title" | "condition_first" | "intervention_first">): string {
  const base = slugify(row.brief_title || row.intervention_first || row.condition_first || "clinical-trial");
  return base ? `${row.nct_id}-${base}` : row.nct_id;
}

export function trialPath(row: Pick<TrialIndexRow, "nct_id" | "brief_title" | "condition_first" | "intervention_first">): string {
  return `/trial/${encodeURIComponent(trialSlug(row))}`;
}
