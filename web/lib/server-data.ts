// web/lib/server-data.ts
//
// Server-side (build-time / SSR / ISR) data loaders.
// These read the same published assets used by the client, but from the filesystem
// so pages can be statically generated without changing the UI.

import path from "path";
import { promises as fs } from "fs";

import { DatasetMeta, TrialDetail, TrialIndexRow } from "./types";

let _meta: DatasetMeta | null = null;
let _index: TrialIndexRow[] | null = null;

function asString(x: any): string {
  if (x == null) return "";
  if (Array.isArray(x)) return x.filter(Boolean).join("; ");
  if (typeof x === "string") return x;
  return String(x);
}

function firstFromSemicolon(s: string): string {
  const t = (s || "")
    .split(";")
    .map((z) => z.trim())
    .filter(Boolean);
  return t[0] || "";
}

async function readJsonFile<T>(relPathFromWeb: string): Promise<T> {
  // When running inside the Next.js app, process.cwd() is typically the /web directory.
  const abs = path.join(process.cwd(), relPathFromWeb);
  const raw = await fs.readFile(abs, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * Server-side meta (build/SSR) — mirrors lib/data.ts behavior.
 */
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
 * Server-side index (build/SSR) — mirrors lib/data.ts normalization.
 */
export async function loadIndexServer(): Promise<TrialIndexRow[]> {
  if (_index) return _index;

  const raw = await readJsonFile<any[]>("public/all_stopped_trials.json");

  _index = raw
    .map((r: any) => {
      const phasesRaw =
        r.phases ?? r.phase ?? r.phase_list ?? r.phase_raw ?? r.phases_raw ?? "";

      const conditionsRaw =
        r.conditions ??
        r.condition ??
        r.condition_list ??
        r.condition_name ??
        r.condition_names ??
        r.condition_terms ??
        "";

      const interventionsRaw =
        r.intervention_names ??
        r.interventions ??
        r.intervention ??
        r.intervention_list ??
        r.intervention_name ??
        "";

      const whyRaw =
        r.why_stopped ??
        r.why_stopped_reason ??
        r.why_stopped_text ??
        r.reason_stopped ??
        r.reason ??
        "";

      const diseaseArea =
        r.disease_area ??
        r.area ??
        r.condition_area ??
        r.therapeutic_area ??
        "Other";

      const url =
        r.url ||
        (r.nct_id
          ? `https://clinicaltrials.gov/study/${encodeURIComponent(r.nct_id)}`
          : "");

      return {
        nct_id: asString(r.nct_id).trim(),

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

        last_update_post_date: asString(
          r.last_update_post_date || r.last_update || r.updated || ""
        ).trim(),

        url,
      } as TrialIndexRow;
    })
    .filter((x) => x.nct_id);

  return _index;
}

export async function loadDetailServer(nctId: string): Promise<TrialDetail | null> {
  const rows = await loadIndexServer();
  const row = rows.find((x) => x.nct_id === nctId);
  if (!row) return null;

  return {
    ...row,
    why_stopped: row.why_stopped_short || "",
    conditions: row.condition_first || "",
    intervention_names: row.intervention_first || "",
  };
}
