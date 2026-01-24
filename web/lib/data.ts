import { DatasetMeta, TrialDetail, TrialIndexRow } from "./types";

/**
 * Your pipeline produces these files in /data (served from web/public/data):
 * - all_stopped_trials.json
 * - biological_failure_trials.json
 * - all_oncology_stopped_trials.json (optional UX shortcut)
 * - biological_failure_oncology_trials.json (optional)
 *
 * We will use all_stopped_trials.json as the main dataset.
 */

let _meta: DatasetMeta | null = null;
let _index: TrialIndexRow[] | null = null;

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
  return res.json() as Promise<T>;
}

/**
 * Minimal meta (since you don't have meta.json).
 * We generate a light meta object client-side.
 */
export async function loadMeta(): Promise<DatasetMeta> {
  if (_meta) return _meta;
  _meta = {
    version: "all_stopped_trials",
    generated_at_utc: undefined,
    source: "ClinicalTrials.gov"
  };
  return _meta;
}

/**
 * Main dataset: all stopped trials
 */
export async function loadIndex(): Promise<TrialIndexRow[]> {
  if (_index) return _index;

  // Primary file you said you want to use:
  const raw = await fetchJSON<any[]>("/data/all_stopped_trials.json");

  // Ensure it matches TrialIndexRow shape (your pipeline already mostly does).
  _index = raw.map((r: any) => ({
    nct_id: r.nct_id,
    brief_title: r.brief_title,
    overall_status: r.overall_status,
    phases: r.phases || r.phase || "",
    disease_area: r.disease_area || r.condition_area || r.area || "Other",
    lead_sponsor: r.lead_sponsor,
    collaborators: r.collaborators,

    condition_first:
      r.condition_first ||
      (typeof r.conditions === "string" ? r.conditions.split(";")[0]?.trim() : undefined) ||
      undefined,

    intervention_first:
      r.intervention_first ||
      (typeof r.intervention_names === "string" ? r.intervention_names.split(";")[0]?.trim() : undefined) ||
      undefined,

    why_stopped_short: r.why_stopped_short || r.why_stopped || r.why_stopped_reason || "",
    classification_label: r.classification_label,
    classification_reason: r.classification_reason,
    classification_confidence: r.classification_confidence,
    classification_evidence: r.classification_evidence,

    last_update_post_date: r.last_update_post_date || r.last_update || r.updated || "",
    url: r.url || `https://clinicaltrials.gov/study/${encodeURIComponent(r.nct_id)}`
  }));

  return _index;
}

/**
 * Detail:
 * We do NOT have per-trial JSON files.
 * So we derive "detail" from the same row.
 */
export async function loadDetail(nctId: string): Promise<TrialDetail | null> {
  const rows = await loadIndex();
  const row = rows.find((x) => x.nct_id === nctId);
  if (!row) return null;

  return {
    ...row,
    why_stopped: row.why_stopped_short || "",
    conditions: row.condition_first || "",
    intervention_names: row.intervention_first || ""
  };
}
