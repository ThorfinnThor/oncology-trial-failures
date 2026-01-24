export type SortKey =
  | "date_desc"
  | "date_asc"
  | "sponsor_asc"
  | "sponsor_desc"
  | "confidence_desc"
  | "confidence_asc";

export type DatasetMeta = {
  version: string;
  generated_at_utc?: string;
  source?: string;
};

export type UrlState = {
  q?: string;

  status?: string[];
  phase?: string[]; // uses PhaseKey values from filtering.ts
  area?: string[];
  bucket?: string[];

  sponsor?: string[];
  condition?: string[];
  intervention?: string[];

  bio?: boolean;

  date_from?: string;
  date_to?: string;

  sort?: SortKey;

  trial?: string; // open drawer trial id
  compare?: string[]; // 2-5 ids

  rail?: boolean; // show/hide filter rail
};

export type TrialIndexRow = {
  nct_id: string;

  brief_title?: string;
  overall_status?: string;

  phases?: string; // raw value from pipeline
  disease_area?: string;

  lead_sponsor?: string;
  collaborators?: string;

  condition_first?: string;
  intervention_first?: string;

  why_stopped_short?: string;

  classification_label?: string; // e.g., BIOLOGICAL_FAILURE
  classification_reason?: string; // e.g., EFFICACY/FUTILITY
  classification_confidence?: string; // LOW/MED/HIGH
  classification_evidence?: string;

  last_update_post_date?: string;

  url?: string;
};

export type TrialDetail = TrialIndexRow & {
  why_stopped?: string;
  conditions?: string;
  intervention_names?: string;
};
