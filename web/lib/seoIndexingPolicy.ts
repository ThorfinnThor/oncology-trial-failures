import approvedConfig from "@/config/seo-approved-decisions.json";

export type SeoDecision =
  | "KEEP_INDEX"
  | "IMPROVE_INDEX"
  | "REVIEW_HOLD"
  | "NOINDEX_UTILITY"
  | "NOINDEX_THIN_CONTENT"
  | "CANONICAL_DUPLICATE"
  | "MERGE_REDIRECT"
  | "REMOVE";

export type SeoRobots = "index,follow" | "noindex,follow" | "noindex,nofollow";

export type SeoIndexingState = {
  httpStatus: number;
  robots: SeoRobots;
  canonical: string | null;
  sitemap: boolean;
  redirectTo: string | null;
  editorialStatus: "ready" | "improve" | "hold" | "utility" | "duplicate" | "removed";
};

export type SeoIndexingFeatures = {
  reportMode: boolean;
  pilotTemplates: boolean;
  registrySitemap: boolean;
  indexDirectives: boolean;
  noindexList: boolean;
  canonicalDuplicates: boolean;
  redirectList: boolean;
  removalList: boolean;
};

type ApprovedDecision = (typeof approvedConfig.decisions)[number];

export type SeoPolicyResolution = {
  url: string;
  approvedDecision: SeoDecision;
  approval: ApprovedDecision | null;
  current: SeoIndexingState;
  planned: SeoIndexingState;
  effective: SeoIndexingState;
  applied: boolean;
  reportOnly: boolean;
  templateVariant: "current" | "pilot";
  notes: string[];
};

export const REPORT_ONLY_FEATURES: SeoIndexingFeatures = {
  reportMode: true,
  pilotTemplates: false,
  registrySitemap: false,
  indexDirectives: false,
  noindexList: false,
  canonicalDuplicates: false,
  redirectList: false,
  removalList: false,
};

const approvals = new Map(approvedConfig.decisions.map((item) => [item.url, item]));

function booleanEnv(value: string | undefined, fallback: boolean, name: string): boolean {
  if (value == null || value === "") return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false`);
}

export function readSeoIndexingFeatures(env: Record<string, string | undefined>): SeoIndexingFeatures {
  const features = {
    reportMode: booleanEnv(env.SEO_INDEXING_REPORT_MODE, true, "SEO_INDEXING_REPORT_MODE"),
    pilotTemplates: booleanEnv(env.SEO_INDEXING_PILOT_TEMPLATES, false, "SEO_INDEXING_PILOT_TEMPLATES"),
    registrySitemap: booleanEnv(env.SEO_INDEXING_REGISTRY_SITEMAP, false, "SEO_INDEXING_REGISTRY_SITEMAP"),
    indexDirectives: booleanEnv(env.SEO_INDEXING_INDEX_DIRECTIVES, false, "SEO_INDEXING_INDEX_DIRECTIVES"),
    noindexList: booleanEnv(env.SEO_INDEXING_NOINDEX_LIST, false, "SEO_INDEXING_NOINDEX_LIST"),
    canonicalDuplicates: booleanEnv(env.SEO_INDEXING_CANONICAL_DUPLICATES, false, "SEO_INDEXING_CANONICAL_DUPLICATES"),
    redirectList: booleanEnv(env.SEO_INDEXING_REDIRECT_LIST, false, "SEO_INDEXING_REDIRECT_LIST"),
    removalList: booleanEnv(env.SEO_INDEXING_REMOVAL_LIST, false, "SEO_INDEXING_REMOVAL_LIST"),
  };
  assertSeoIndexingFeatures(features);
  return features;
}

export function assertSeoIndexingFeatures(features: SeoIndexingFeatures): void {
  if (features.reportMode) return;
  if ((features.indexDirectives || features.noindexList || features.canonicalDuplicates || features.redirectList || features.removalList)
      && !features.registrySitemap) {
    throw new Error("Active directive, exclusion, canonical, redirect, or removal lists require the registry sitemap switch");
  }
  if (features.canonicalDuplicates && !features.indexDirectives) {
    throw new Error("Canonical duplicate activation requires the index directives switch");
  }
}

function normalizeUrl(input: string): string {
  return new URL(input, "https://clinicaltrialfailures.com").toString();
}

export function approvedDecisionForUrl(input: string): ApprovedDecision | null {
  return approvals.get(normalizeUrl(input)) ?? null;
}

export function planSeoIndexingState(
  decision: SeoDecision,
  current: SeoIndexingState,
  canonicalUrl: string,
  replacementUrl: string | null
): SeoIndexingState {
  if (decision === "KEEP_INDEX" || decision === "IMPROVE_INDEX") {
    return {
      ...current,
      httpStatus: 200,
      robots: "index,follow",
      canonical: canonicalUrl,
      sitemap: true,
      redirectTo: null,
      editorialStatus: decision === "IMPROVE_INDEX" ? "improve" : "ready",
    };
  }
  if (decision === "NOINDEX_UTILITY" || decision === "NOINDEX_THIN_CONTENT") {
    return {
      ...current,
      httpStatus: 200,
      robots: "noindex,follow",
      sitemap: false,
      redirectTo: null,
      editorialStatus: decision === "NOINDEX_THIN_CONTENT" ? "improve" : "utility",
    };
  }
  if (decision === "CANONICAL_DUPLICATE") {
    if (!replacementUrl) throw new Error(`CANONICAL_DUPLICATE requires replacement URL: ${canonicalUrl}`);
    return { ...current, httpStatus: 200, canonical: replacementUrl, sitemap: false, redirectTo: null, editorialStatus: "duplicate" };
  }
  if (decision === "MERGE_REDIRECT") {
    if (!replacementUrl) throw new Error(`MERGE_REDIRECT requires replacement URL: ${canonicalUrl}`);
    return { ...current, httpStatus: 301, sitemap: false, redirectTo: replacementUrl, editorialStatus: "duplicate" };
  }
  if (decision === "REMOVE") {
    return { ...current, httpStatus: 410, robots: "noindex,nofollow", canonical: null, sitemap: false, redirectTo: null, editorialStatus: "removed" };
  }
  return current;
}

function effectiveState(
  decision: SeoDecision,
  current: SeoIndexingState,
  planned: SeoIndexingState,
  features: SeoIndexingFeatures
): SeoIndexingState {
  if (features.reportMode || decision === "REVIEW_HOLD") return current;
  const effective = { ...current };

  if (features.registrySitemap) effective.sitemap = planned.sitemap;
  if (features.pilotTemplates && (decision === "KEEP_INDEX" || decision === "IMPROVE_INDEX")) {
    effective.editorialStatus = planned.editorialStatus;
  }
  if (features.indexDirectives && (decision === "KEEP_INDEX" || decision === "IMPROVE_INDEX")) {
    effective.httpStatus = planned.httpStatus;
    effective.robots = planned.robots;
    effective.canonical = planned.canonical;
    effective.redirectTo = planned.redirectTo;
  }
  if (features.noindexList && (decision === "NOINDEX_UTILITY" || decision === "NOINDEX_THIN_CONTENT")) {
    effective.httpStatus = planned.httpStatus;
    effective.robots = planned.robots;
    effective.editorialStatus = planned.editorialStatus;
  }
  if (features.canonicalDuplicates && decision === "CANONICAL_DUPLICATE") {
    effective.canonical = planned.canonical;
    effective.editorialStatus = planned.editorialStatus;
  }
  if (features.redirectList && decision === "MERGE_REDIRECT") {
    effective.httpStatus = planned.httpStatus;
    effective.redirectTo = planned.redirectTo;
    effective.editorialStatus = planned.editorialStatus;
  }
  if (features.removalList && decision === "REMOVE") {
    effective.httpStatus = planned.httpStatus;
    effective.robots = planned.robots;
    effective.canonical = planned.canonical;
    effective.redirectTo = planned.redirectTo;
    effective.editorialStatus = planned.editorialStatus;
  }
  return effective;
}

export function resolveSeoIndexingPolicy(
  input: string,
  current: SeoIndexingState,
  features: SeoIndexingFeatures = REPORT_ONLY_FEATURES
): SeoPolicyResolution {
  assertSeoIndexingFeatures(features);
  const url = normalizeUrl(input);
  const approval = approvedDecisionForUrl(url);
  const decision = (approval?.decision ?? "REVIEW_HOLD") as SeoDecision;
  const notes = approval ? [`Approved by ${approval.reviewer} in ${approvedConfig.decisionVersion}`] : ["No approved URL-level decision; preserving current behavior"];

  if ([404, 410].includes(current.httpStatus)) {
    notes.push("Resource validity takes priority over registry directives");
    return { url, approvedDecision: decision, approval, current, planned: current, effective: current, applied: false, reportOnly: features.reportMode, templateVariant: "current", notes };
  }

  const planned = planSeoIndexingState(decision, current, url, approval?.replacementUrl ?? null);
  const effective = effectiveState(decision, current, planned, features);
  const applied = JSON.stringify(effective) !== JSON.stringify(current);
  if (!applied && JSON.stringify(planned) !== JSON.stringify(current)) {
    notes.push(features.reportMode ? "Planned change is report-only" : "Required feature switch is disabled");
  }
  return {
    url,
    approvedDecision: decision,
    approval,
    current,
    planned,
    effective,
    applied,
    reportOnly: features.reportMode,
    templateVariant: !features.reportMode && features.pilotTemplates && approval?.role === "pilot" ? "pilot" : "current",
    notes,
  };
}

export const SEO_DECISION_VERSION = approvedConfig.decisionVersion;
