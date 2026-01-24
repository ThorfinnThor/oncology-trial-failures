// web/lib/types.ts

export type DatasetMeta = {
  version: string;
  source?: string;
};

export type TrialIndexRow = {
  // Primary identifier
  nct_id: string;

  // Display / summary fields
  brief_title?: string;
  overall_status?: string;

  // Phase / therapeutic area
  phases?: string;
  disease_area?: string;

  // Sponsor info
  lead_sponsor?: string;
  collaborators?: string;

  // First condition / intervention (for table compact display)
  condition_first?: string;
  intervention_first?: string;

  // Stopping reason (short)
  why_stopped_short?: string;

  // Canonical pipeline classification fields
  classification_label?: string;        // e.g., BIOLOGICAL_FAILURE
  classification_reason?: string;       // e.g., EFFICACY/FUTILITY
  classification_confidence?: string;   // LOW/MED/HIGH
  classification_evidence?: string;

  // Backwards-compat / older naming referenced by filtering.ts and potentially older datasets
  failure_label?: string;
  failure_type?: string;

  // Dates
  last_update_post_date?: string;

  // Some code paths may refer to a generic "date" field; keep optional for compatibility
  date?: string;

  // External link
  url?: string;
};

export type TrialDetail = TrialIndexRow & {
  // The detail page expects these (some code maps from the compact fields)
  why_stopped?: string;
  conditions?: string;
  intervention_names?: string;
};
