import path from "path";
import { promises as fs } from "fs";

export type IngestChangeRecord = {
  nct_id: string;
  brief_title: string;
  overall_status: string;
  why_stopped: string;
  classification_label: string;
  classification_reason: string;
  classification_confidence: string;
  disease_area: string;
  phases: string;
  lead_sponsor: string;
  conditions: string;
  intervention_names: string;
  last_update_post_date: string;
  url: string;
  changed_fields?: string[];
  previous_status?: string;
  previous_classification_label?: string;
  previous_classification_reason?: string;
};

export type IngestChangeReport = {
  schema_version: number;
  generated_at_utc: string;
  has_previous_snapshot: boolean;
  definition: string;
  previous: { record_count: number; max_last_update_post_date: string };
  current: { record_count: number; max_last_update_post_date: string };
  summary: {
    new_records: number;
    new_scientific_signals: number;
    updated_records: number;
    status_changes: number;
    classification_changes: number;
    removed_records: number;
  };
  new_records: IngestChangeRecord[];
  updated_records: IngestChangeRecord[];
  status_changes: IngestChangeRecord[];
  classification_changes: IngestChangeRecord[];
  removed_records: IngestChangeRecord[];
};

export async function loadIngestChangesServer(): Promise<IngestChangeReport | null> {
  const candidates = [
    path.join(process.cwd(), "public", "ingest_changes.json"),
    path.join(process.cwd(), "public", "data", "ingest_changes.json"),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as IngestChangeReport;
      if (parsed && parsed.schema_version === 1 && parsed.summary) return parsed;
    } catch {
      // The first deployment establishes the baseline; the next ingest creates this file.
    }
  }

  return null;
}
