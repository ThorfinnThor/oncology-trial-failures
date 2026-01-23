import { TrialRow } from "./types";

export type DatasetMeta = {
  version: string;
  generated_at_utc: string;
  record_count: number;
  max_last_update_post_date: string;
  source: string;
  notes?: string;
};

const META_URL = "/dataset_meta.json";
const DATA_URL = "/biological_failure_oncology_trials.json";

const LS_META_KEY = "otf_meta_v1";
const LS_DATA_KEY = "otf_data_v1";

/**
 * Load trials in the browser with caching + invalidation.
 * - Fetch meta first (tiny file)
 * - If meta.version matches localStorage, use cached dataset
 * - Else fetch dataset and refresh cache
 */
export async function loadTrialsClient(): Promise<{ meta: DatasetMeta; trials: TrialRow[] }> {
  const metaResp = await fetch(META_URL, { cache: "no-cache" });
  if (!metaResp.ok) throw new Error(`Failed to load ${META_URL}: ${metaResp.status}`);
  const meta = (await metaResp.json()) as DatasetMeta;

  try {
    const cachedMetaRaw = localStorage.getItem(LS_META_KEY);
    const cachedDataRaw = localStorage.getItem(LS_DATA_KEY);

    if (cachedMetaRaw && cachedDataRaw) {
      const cachedMeta = JSON.parse(cachedMetaRaw) as DatasetMeta;
      if (cachedMeta?.version && cachedMeta.version === meta.version) {
        const cachedTrials = JSON.parse(cachedDataRaw) as TrialRow[];
        return { meta, trials: cachedTrials };
      }
    }
  } catch {
    // Ignore cache read/parse errors and refetch
  }

  const dataResp = await fetch(DATA_URL, { cache: "force-cache" });
  if (!dataResp.ok) throw new Error(`Failed to load ${DATA_URL}: ${dataResp.status}`);
  const trials = (await dataResp.json()) as TrialRow[];

  // Normalize/sort client-side
  const cleaned = (trials || [])
    .filter((r) => r && typeof r.nct_id === "string" && r.nct_id.length > 0)
    .sort((a, b) => (b.last_update_post_date || "").localeCompare(a.last_update_post_date || ""));

  try {
    localStorage.setItem(LS_META_KEY, JSON.stringify(meta));
    localStorage.setItem(LS_DATA_KEY, JSON.stringify(cleaned));
  } catch {
    // If storage is full, skip caching; site still works.
  }

  return { meta, trials: cleaned };
}

export function splitSemicolonValues(v: string): string[] {
  return (v || "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}
