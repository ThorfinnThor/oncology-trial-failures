export type TrialRow = {
  nct_id: string;
  brief_title: string;
  overall_status: string;
  why_stopped: string;

  classification_label: "BIOLOGICAL_FAILURE" | "NON_BIOLOGICAL" | "UNCLEAR" | string;
  classification_reason: "SAFETY" | "EFFICACY/FUTILITY" | "OPERATIONAL" | "OTHER/UNKNOWN" | string;
  classification_confidence: "HIGH" | "MEDIUM" | "LOW" | string;
  classification_evidence: string;

  disease_area: string;
  disease_areas_matched: string;
  mesh_terms: string;

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
  all: {
    record_count: number;
    max_last_update_post_date: string;
  };
  biological_failure: {
    record_count: number;
    max_last_update_post_date: string;
  };
  top_areas: { area: string; count: number }[];
  notes?: string;
};
