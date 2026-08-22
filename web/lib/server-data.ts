// web/lib/server-data.ts
//
// Server-side (build-time / SSR / ISR) data loaders. Optimized build assets are
// generated from public/all_stopped_trials.json before `next build`.

import path from "path";
import { promises as fs } from "fs";

import { trialShardKey } from "./trial-sharding";
import { DatasetMeta, TrialDetail, TrialIndexRow } from "./types";

let _meta: DatasetMeta | null = null;
let _index: TrialIndexRow[] | null = null;
const _detailShards = new Map<string, TrialDetail[]>();

async function readJsonFile<T>(relPathFromWeb: string): Promise<T> {
  const abs = path.join(process.cwd(), relPathFromWeb);
  const raw = await fs.readFile(abs, "utf8");
  return JSON.parse(raw) as T;
}

export async function loadMetaServer(): Promise<DatasetMeta> {
  if (_meta) return _meta;

  try {
    const m = await readJsonFile<any>("public/dataset_meta.json");
    _meta = {
      version: m.version || m.generated_at_utc || "Dataset",
      source: m.source || "ClinicalTrials.gov",
    };
    return _meta;
  } catch {
    _meta = {
      version: "All stopped trials",
      source: "ClinicalTrials.gov",
    };
    return _meta;
  }
}

/**
 * The compact index contains the same normalized fields the Explore UI consumed
 * previously, but excludes the many unused source fields from the 27 MB dataset.
 */
export async function loadIndexServer(): Promise<TrialIndexRow[]> {
  if (_index) return _index;

  _index = (await readJsonFile<TrialIndexRow[]>("public/trials-index.json")).filter(
    (row) => row.nct_id
  );
  return _index;
}

export async function loadDetailServer(nctId: string): Promise<TrialDetail | null> {
  const normalizedId = (nctId || "").trim().toUpperCase();
  if (!normalizedId) return null;

  const key = trialShardKey(normalizedId);
  let rows = _detailShards.get(key);

  if (!rows) {
    try {
      rows = await readJsonFile<TrialDetail[]>(`public/trial-shards/${key}.json`);
      _detailShards.set(key, rows);
    } catch {
      rows = undefined;
    }
  }

  const detail = rows?.find((row) => row.nct_id.toUpperCase() === normalizedId);
  if (detail) return detail;

  // Build/runtime safety fallback. This still reads only the compact index rather
  // than the full all_stopped_trials.json payload.
  const index = await loadIndexServer();
  const row = index.find((candidate) => candidate.nct_id.toUpperCase() === normalizedId);
  if (!row) return null;

  return {
    ...row,
    why_stopped: row.why_stopped_short || "",
    conditions: row.condition_first || "",
    intervention_names: row.intervention_first || "",
  };
}
