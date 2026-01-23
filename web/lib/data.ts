import raw from "@/data/trials";

import { TrialRow } from "./types";

export const TRIALS: TrialRow[] = (raw as TrialRow[])
  .filter((r) => r && typeof r.nct_id === "string" && r.nct_id.length > 0)
  .sort((a, b) => (b.last_update_post_date || "").localeCompare(a.last_update_post_date || ""));

export function splitSemicolonValues(v: string): string[] {
  return (v || "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}
