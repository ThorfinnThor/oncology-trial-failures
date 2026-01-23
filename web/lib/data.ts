import { DatasetMeta, TrialRow } from "./types";

const META_URL = "/dataset_meta.json";
const ALL_URL = "/all_stopped_trials.json";
const BIO_URL = "/biological_failure_trials.json";

const LS_META_KEY = "tt_meta_v1";
const LS_ALL_KEY = "tt_all_v1";
const LS_BIO_KEY = "tt_bio_v1";

export async function loadMeta(): Promise<DatasetMeta> {
  const r = await fetch(META_URL, { cache: "no-cache" });
  if (!r.ok) throw new Error(`Failed to load ${META_URL}: ${r.status}`);
  return (await r.json()) as DatasetMeta;
}

function normalize(rows: TrialRow[]): TrialRow[] {
  return (rows || [])
    .filter((r) => r && typeof r.nct_id === "string" && r.nct_id.length > 0)
    .sort((a, b) => (b.last_update_post_date || "").localeCompare(a.last_update_post_date || ""));
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "force-cache" });
  if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
  return (await r.json()) as T;
}

export async function loadDatasetClient(mode: "all" | "bio"): Promise<{ meta: DatasetMeta; trials: TrialRow[] }> {
  const meta = await loadMeta();
  const dataKey = mode === "all" ? LS_ALL_KEY : LS_BIO_KEY;
  const url = mode === "all" ? ALL_URL : BIO_URL;

  try {
    const cachedMetaRaw = localStorage.getItem(LS_META_KEY);
    const cachedDataRaw = localStorage.getItem(dataKey);
    if (cachedMetaRaw && cachedDataRaw) {
      const cachedMeta = JSON.parse(cachedMetaRaw) as DatasetMeta;
      if (cachedMeta?.version && cachedMeta.version === meta.version) {
        const cached = JSON.parse(cachedDataRaw) as TrialRow[];
        return { meta, trials: cached };
      }
    }
  } catch {
    // ignore cache errors
  }

  const rows = await fetchJson<TrialRow[]>(url);
  const cleaned = normalize(rows);

  try {
    localStorage.setItem(LS_META_KEY, JSON.stringify(meta));
    localStorage.setItem(dataKey, JSON.stringify(cleaned));
  } catch {
    // ignore storage quota
  }

  return { meta, trials: cleaned };
}

export function splitSemicolonValues(v: string): string[] {
  return (v || "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}
