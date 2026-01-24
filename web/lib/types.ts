export type TrialRow = {
  nct_id: string;
  brief_title: string;
  overall_status: string;
  why_stopped: string;

  classification_label: string; // BIOLOGICAL_FAILURE | NON_BIOLOGICAL | UNCLEAR
  classification_reason: string; // SAFETY | EFFICACY/FUTILITY | OPERATIONAL | OTHER/UNKNOWN
  classification_confidence: string; // HIGH | MEDIUM | LOW
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

  [key: string]: any;
};

export type DatasetMeta = {
  version: string;
  generated_at_utc: string;
  source: string;
  notes?: string;
  top_areas: { area: string; count: number }[];
  all: { record_count: number; max_last_update_post_date: string };
  biological_failure: { record_count: number; max_last_update_post_date: string };
};

export type ReasonBucket =
  | "Efficacy"
  | "Safety"
  | "Enrollment"
  | "Funding"
  | "Strategic"
  | "Regulatory"
  | "Operational"
  | "Other/Unknown";

export type SortKey =
  | "date_desc"
  | "date_asc"
  | "sponsor_asc"
  | "sponsor_desc"
  | "phase_asc"
  | "phase_desc"
  | "confidence_desc"
  | "confidence_asc";

/**
 * URL-driven state for the analyst workbench.
 * This is the canonical state type in the redesign.
 */
export type UrlState = {
  q?: string;

  status?: string[];
  phase?: string[];
  area?: string[];
  bucket?: ReasonBucket[];
  sponsor?: string[];
  intervention?: string[];
  condition?: string[];

  bio?: boolean;

  date_from?: string; // YYYY-MM-DD
  date_to?: string;   // YYYY-MM-DD

  sort?: SortKey;

  trial?: string;
  compare?: string[];

  rail?: boolean;
};

/**
 * Backwards-compatible alias (some earlier files may still refer to WorkbenchState).
 */
export type WorkbenchState = UrlState;
