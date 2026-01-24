import { DatasetMeta, TrialDetail, TrialIndexRow } from "./types";

let _meta: DatasetMeta | null = null;
let _index: TrialIndexRow[] | null = null;

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

export async function loadMeta(): Promise<DatasetMeta> {
  if (_meta) return _meta;
  _meta = await fetchJSON<DatasetMeta>("/data/meta.json");
  return _meta;
}

export async function loadIndex(): Promise<TrialIndexRow[]> {
  if (_index) return _index;
  _index = await fetchJSON<TrialIndexRow[]>("/data/index.json");
  return _index;
}

/**
 * Detail loader:
 * tries /data/trials/<NCT>.json first.
 * If your pipeline uses a different folder name, add fallback paths here.
 */
export async function loadDetail(nctId: string): Promise<TrialDetail | null> {
  const id = nctId.trim();
  if (!id) return null;

  const candidates = [
    `/data/trials/${encodeURIComponent(id)}.json`,
    `/data/details/${encodeURIComponent(id)}.json`
  ];

  for (const url of candidates) {
    try {
      return await fetchJSON<TrialDetail>(url);
    } catch {
      // try next
    }
  }
  return null;
}
