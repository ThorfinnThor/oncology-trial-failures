// Core dataset meta (from data/meta.json)
export type DatasetMeta = {
  version: string;
  generated_at_utc?: string;
  // Optional fields (pipeline-dependent)
  source?: string;
  notes?: string;
};

export type ReasonBucket =
  | "EFFICACY/FUTILITY"
  | "SAFETY"
  | "OPERATIONAL"
  | "ENROLLMENT"
  | "FUNDING"
  | "STRATEGIC"
  | "REGULATORY"
  | "OTHER/UNKNOWN";

// Lightweight row for the results table (from data/index.json)
export type TrialIndexRow = {
  nct_id: string;
  brief_title?: string;
  overall_status?: string;

  phases?: string; // original string from registry pipeline
  disease_area?: string;

  lead_sponsor?: string;
  collaborators?: string;

  condition_first?: string;
  intervention_first?: string;

  why_stopped_short?: string;

  classification_label?: string; // e.g., BIOLOGICAL_FAILURE / UNCLEAR
  classification_reason?: string; // e.g., EFFICACY/FUTILITY / SAFETY ...
  classification_confidence?: string; // LOW/MED/HIGH
  classification_evidence?: string;

  last_update_post_date?: string;
  url: string;
};

// Full detail record (from chunked files data/trials/*.json)
export type TrialDetail = TrialIndexRow & {
  why_stopped?: string; // full text
  conditions?: string;
  intervention_names?: string;
  mesh_terms?: string;
};

export type SortKey =
  | "date_desc"
  | "date_asc"
  | "sponsor_asc"
  | "sponsor_desc"
  | "confidence_desc"
  | "confidence_asc";

export type UrlState = {
  q?: string;

  status?: string[];
  phase?: string[];
  area?: string[];
  bucket?: string[];
  sponsor?: string[];
  condition?: string[];
  intervention?: string[];

  bio?: boolean;

  date_from?: string;
  date_to?: string;

  sort?: SortKey;

  trial?: string; // open drawer id
  compare?: string[]; // 2-5 ids

  rail?: boolean; // filters panel open/closed
};
