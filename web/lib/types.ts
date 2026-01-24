// web/lib/types.ts

export type DatasetMeta = {
  // A short human-readable version string (often a date like "2026-01-23")
  version: string;

  // Optional metadata shown on /methods
  generated_at_utc?: string;
  source?: string;

  // Allow additional non-breaking metadata fields from dataset_meta.json
  // without falling back to `any` in other types.
  [k: `meta_${string}`]?: string | number | boolean | null;
};

/**
 * Sorting keys used by the Explore UI and filtering utilities.
 * Keep union broad to tolerate future additions without breaking builds.
 */
export type SortKey =
  | "relevance"
  | "date_desc"
  | "date_asc"
  | "title_asc"
  | "title_desc"
  | "sponsor_asc"
  | "sponsor_desc"
  | "confidence_desc"
  | "confidence_asc"
  | string;

/**
 * URL-driven state (query params) used across explore/download/export.
 * IMPORTANT: do not add `[key: string]: any` — it causes implicit-any cascades.
 */
export type UrlState = {
  q?: string;

  // Facets / filters
  status?: string[];
  phase?: string[];
  area?: string[];
  bucket?: string[];
  sponsor?: string[];
  intervention?: string[];
  condition?: string[];
  country?: string[];

  // Compare selection
  compare?: string[];

  // Toggle (called "bio" in URL, meaning likely scientific failure)
  bio?: boolean;

  // Sorting / pagination / view
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  view?: "table" | "grid" | "list" | string;

  // Date range (YYYY-MM-DD)
  date_from?: string;
  date_to?: string;

  // Open trial details drawer
  trial?: string;
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
  classification_label?: string; // e.g., BIOLOGICAL_FAILURE
  classification_reason?: string; // e.g., EFFICACY/FUTILITY
  classification_confidence?: string; // LOW/MED/HIGH
  classification_evidence?: string;

  // Backwards-compat / older naming referenced by filtering.ts / legacy datasets
  failure_label?: string;
  failure_type?: string;

  // Dates
  last_update_post_date?: string;

  // Some code paths refer to a generic "date" field; keep optional for compatibility
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
