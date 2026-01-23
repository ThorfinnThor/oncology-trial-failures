export type TrialRow = {
  nct_id: string;
  brief_title: string;
  overall_status: string;
  why_stopped: string;

  classification_label: string;
  classification_reason: string;
  classification_confidence: string;
  classification_evidence: string;

  disease_area: string;
  disease_areas_matched: string;
  mesh_terms: string;

  countries: string;

  study_type: string;
  phases: string;
  lead_sponsor: string;
  collaborators: string;
  conditions: string;
  intervention_names: string;
  intervention_types: string;

  start_date: string;
  primary_completion_date: string;
  completion_date: string;
  last_update_post_date: string;

  url: string;
};

export type DatasetMeta = {
  version: string;
  generated_at_utc: string;
  source: string;
  all: { record_count: number; max_last_update_post_date: string };
  biological_failure: { record_count: number; max_last_update_post_date: string };
  top_areas: { area: string; count: number }[];
  notes?: string;
};

export type SortKey =
  | "date_desc"
  | "date_asc"
  | "sponsor_asc"
  | "sponsor_desc"
  | "phase_asc"
  | "phase_desc"
  | "confidence_desc"
  | "confidence_asc";

export type ReasonBucket = "efficacy" | "safety" | "operational" | "other";

export type WorkbenchState = {
  q?: string;

  bio?: boolean;

  phase?: string[];     // e.g. ["PHASE1","PHASE2"]
  status?: string[];    // e.g. ["TERMINATED","WITHDRAWN","SUSPENDED"]
  area?: string[];      // disease_area
  country?: string[];

  reason?: ReasonBucket[];

  condition?: string[];     // derived tokens
  intervention?: string[];
  sponsor?: string[];

  date_from?: string;   // YYYY-MM-DD (last_update_post_date)
  date_to?: string;     // YYYY-MM-DD (last_update_post_date)

  sort?: SortKey;

  trial?: string;       // nct_id for drawer
  compare?: string[];   // list of nct_ids
};
