import { trialShardKey } from "./trial-sharding";
import { DatasetMeta, TrialDetail, TrialIndexRow } from "./types";

let _meta: DatasetMeta | null = null;
let _index: TrialIndexRow[] | null = null;
let _specialness: any | null = null;

async function fetchJSON<T>(url: string): Promise<T> {
  // These files change only when the site is redeployed. Respect the browser/CDN
  // cache instead of forcing every visit back to origin.
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

async function tryFetchJSON<T>(url: string): Promise<T | null> {
  try {
    return await fetchJSON<T>(url);
  } catch {
    return null;
  }
}

function asString(x: any): string {
  if (x == null) return "";
  if (Array.isArray(x)) return x.filter(Boolean).join("; ");
  if (typeof x === "string") return x;
  return String(x);
}

function firstFromSemicolon(s: string): string {
  const t = (s || "").split(";").map((z) => z.trim()).filter(Boolean);
  return t[0] || "";
}

function normalizeIndexRows(raw: any[]): TrialIndexRow[] {
  return raw
    .map((r: any) => {
      const phasesRaw = r.phases ?? r.phase ?? r.phase_list ?? r.phase_raw ?? r.phases_raw ?? "";
      const conditionsRaw =
        r.conditions ?? r.condition ?? r.condition_list ?? r.condition_name ?? r.condition_names ?? r.condition_terms ?? "";
      const interventionsRaw =
        r.intervention_names ?? r.interventions ?? r.intervention ?? r.intervention_list ?? r.intervention_name ?? "";
      const whyRaw = r.why_stopped ?? r.why_stopped_reason ?? r.why_stopped_text ?? r.reason_stopped ?? r.reason ?? "";
      const diseaseArea = r.disease_area ?? r.area ?? r.condition_area ?? r.therapeutic_area ?? "Other";
      const nctId = asString(r.nct_id).trim();
      const url = r.url || (nctId ? `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}` : "");

      return {
        nct_id: nctId,
        brief_title: asString(r.brief_title || r.title || r.official_title || "").trim(),
        overall_status: asString(r.overall_status || r.status || "").trim(),
        phases: asString(phasesRaw).trim(),
        disease_area: asString(diseaseArea).trim(),
        lead_sponsor: asString(r.lead_sponsor || r.sponsor || r.organization || "").trim(),
        collaborators: asString(r.collaborators || r.collab || "").trim(),
        condition_first: firstFromSemicolon(asString(conditionsRaw)),
        intervention_first: firstFromSemicolon(asString(interventionsRaw)),
        why_stopped_short: asString(whyRaw).trim(),
        classification_label: asString(r.classification_label || r.label || "").trim(),
        classification_reason: asString(r.classification_reason || r.reason_bucket || "").trim(),
        classification_confidence: asString(r.classification_confidence || r.confidence || "").trim(),
        classification_evidence: asString(r.classification_evidence || r.evidence || "").trim(),
        last_update_post_date: asString(r.last_update_post_date || r.last_update || r.updated || "").trim(),
        url,
      } as TrialIndexRow;
    })
    .filter((row) => row.nct_id);
}

export async function loadMeta(): Promise<DatasetMeta> {
  if (_meta) return _meta;

  const m = await tryFetchJSON<any>("/dataset_meta.json");
  if (m) {
    _meta = {
      version: m.version || m.generated_at_utc || "Dataset",
      source: m.source || "ClinicalTrials.gov",
    };
    return _meta;
  }

  _meta = {
    version: "All stopped trials",
    source: "ClinicalTrials.gov",
  };
  return _meta;
}

export async function loadIndex(): Promise<TrialIndexRow[]> {
  if (_index) return _index;

  // Normal deployments generate this compact, already-normalized asset before
  // `next build`. Keep the legacy fallback so local/older deployments still work.
  const compactIndex = await tryFetchJSON<TrialIndexRow[]>("/trials-index.json");
  if (compactIndex) {
    _index = compactIndex.filter((row) => row.nct_id);
    return _index;
  }

  const legacyRaw =
    (await tryFetchJSON<any[]>("/all_stopped_trials.json")) ??
    (await fetchJSON<any[]>("/data/all_stopped_trials.json"));
  _index = normalizeIndexRows(legacyRaw);
  return _index;
}

export async function loadDetail(nctId: string): Promise<TrialDetail | null> {
  const normalizedId = (nctId || "").trim().toUpperCase();
  if (!normalizedId) return null;

  const shard = await tryFetchJSON<TrialDetail[]>(`/trial-shards/${trialShardKey(normalizedId)}.json`);
  const fromShard = shard?.find((row) => row.nct_id.toUpperCase() === normalizedId);
  if (fromShard) return fromShard;

  // Safe fallback: the compact index contains every field the existing detail UI
  // used before sharding, so a missing shard does not force a 27 MB download.
  const rows = await loadIndex();
  const row = rows.find((candidate) => candidate.nct_id.toUpperCase() === normalizedId);
  if (!row) return null;

  return {
    ...row,
    why_stopped: row.why_stopped_short || "",
    conditions: row.condition_first || "",
    intervention_names: row.intervention_first || "",
  };
}

/**
 * Aggregate "outlier" / enrichment stats used by /outliers.
 * Published at web/public/specialness_index.json by scripts/publish_public_assets.py.
 */
export async function loadSpecialness(): Promise<any> {
  if (_specialness) return _specialness;

  const raw =
    (await tryFetchJSON<any>("/specialness_index.json")) ??
    (await tryFetchJSON<any>("/data/specialness_index.json"));

  if (!raw) throw new Error("Failed to load specialness_index.json");
  _specialness = raw;
  return _specialness;
}
