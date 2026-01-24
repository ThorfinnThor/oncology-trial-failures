import { DatasetMeta, TrialRow } from "./types";

const META_URL = "/dataset_meta.json";
const ALL_URL = "/all_stopped_trials.json";
const BIO_URL = "/biological_failure_trials.json";

const LS_META_KEY = "tf_meta_v2";
const LS_ALL_KEY = "tf_all_v2";
const LS_BIO_KEY = "tf_bio_v2";

async function fetchJson<T>(url: string, cache: RequestCache): Promise<T> {
  const r = await fetch(url, { cache });
  if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
  return (await r.json()) as T;
}

export async function loadMeta(): Promise<DatasetMeta> {
  // meta should be fresh so clients see new version fast
  const meta = await fetchJson<DatasetMeta>(META_URL, "no-cache");
  return meta;
}

function normalize(rows: TrialRow[]): TrialRow[] {
  return (rows || [])
    .filter((r) => r && typeof r.nct_id === "string" && r.nct_id.length > 0)
    .sort((a, b) => (b.last_update_post_date || "").localeCompare(a.last_update_post_date || ""));
}

export type DatasetMode = "bio" | "all";

export async function loadDatasetClient(mode: DatasetMode): Promise<{ meta: DatasetMeta; trials: TrialRow[] }> {
  const meta = await loadMeta();
  const dataKey = mode === "bio" ? LS_BIO_KEY : LS_ALL_KEY;
  const url = mode === "bio" ? BIO_URL : ALL_URL;

  // Cache keying by meta.version
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
    // ignore
  }

  const rows = await fetchJson<TrialRow[]>(url, "force-cache");
  const cleaned = normalize(rows);

  try {
    localStorage.setItem(LS_META_KEY, JSON.stringify(meta));
    localStorage.setItem(dataKey, JSON.stringify(cleaned));
  } catch {
    // ignore
  }

  return { meta, trials: cleaned };
}

export function splitSemicolonValues(v: string): string[] {
  return (v || "")
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
}
