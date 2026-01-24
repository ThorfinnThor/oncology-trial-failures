import { DatasetMeta, TrialDetail, TrialIndexRow } from "./types";

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "force-cache" });
  if (!r.ok) throw new Error(`Failed to load ${url}`);
  return (await r.json()) as T;
}

export async function loadMeta(): Promise<DatasetMeta> {
  return fetchJson<DatasetMeta>("/data/meta.json");
}

export async function loadIndex(): Promise<TrialIndexRow[]> {
  return fetchJson<TrialIndexRow[]>("/data/trials_index.json");
}

/**
 * Detail chunking: last digit of NCT -> trials_details_{d}.json
 * Only fetch the chunk you need, cache in-memory.
 */
const detailChunkCache: Record<string, Record<string, TrialDetail>> = {};

export async function loadDetail(nctId: string): Promise<TrialDetail | null> {
  const last = nctId && /\d$/.test(nctId) ? nctId[nctId.length - 1] : "0";
  const key = `d${last}`;

  if (!detailChunkCache[key]) {
    const chunk = await fetchJson<Record<string, TrialDetail>>(`/data/trials_details_${last}.json`);
    detailChunkCache[key] = chunk;
  }

  return detailChunkCache[key][nctId] || null;
}
