export type SortKey =
  | "date_desc" | "date_asc"
  | "sponsor_asc" | "sponsor_desc"
  | "phase_asc" | "phase_desc"
  | "confidence_desc" | "confidence_asc";

export type ReasonBucket =
  | "Safety"
  | "Efficacy"
  | "Operational"
  | "Enrollment"
  | "Funding"
  | "Strategic"
  | "Regulatory"
  | "Other/Unknown";

export type DatasetMeta = {
  version: string;
  generated_at_utc?: string;
};

export type TrialIndexRow = {
  nct_id: string;
  brief_title: string;
  overall_status: string;
  phases: string;
  disease_area: string;
  lead_sponsor: string;
  collaborators: string;
  condition_first: string;
  intervention_first: string;
  why_stopped_short: string;

  classification_label: string;
  classification_reason: string;
  classification_confidence: string;
  classification_evidence: string;

  last_update_post_date: string;
  url: string;

  search_blob: string; // precomputed lowercase blob for fast includes()
};

export type TrialDetail = {
  nct_id: string;
  brief_title: string;
  why_stopped: string;
  conditions: string;
  intervention_names: string;
  intervention_types: string;
  mesh_terms: string;

  disease_area: string;
  lead_sponsor: string;
  collaborators: string;

  overall_status: string;
  phases: string;
  last_update_post_date: string;

  classification_label: string;
  classification_reason: string;
  classification_confidence: string;
  classification_evidence: string;

  url: string;
};

export type UrlState = {
  q?: string;

  status?: string[];
  phase?: string[];
  area?: string[];
  bucket?: string[];
  sponsor?: string[];
  intervention?: string[];
  condition?: string[];

  bio?: boolean;

  date_from?: string;
  date_to?: string;

  sort?: SortKey;

  trial?: string;
  compare?: string[];

  rail?: boolean;
};
