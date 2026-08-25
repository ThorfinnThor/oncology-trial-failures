import type { TrialIndexRow } from "./types";
import { isLikelyScientificFailure, parsePhases, phaseLabel, reasonBucket, sortRows } from "./filtering";
import { compactSeoDescription, compactSeoTitle } from "./seoMetadata";
import { slugify, trialPath } from "./seoUrls";

export const SITE_URL = "https://clinicaltrialfailures.com";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

export type FailureHubKind = "area" | "phase" | "reason";

export type SeoHub = {
  kind: FailureHubKind;
  slug: string;
  label: string;
  title: string;
  h1: string;
  description: string;
  path: string;
  total: number;
  rows: TrialIndexRow[];
};

export type SponsorHub = {
  slug: string;
  label: string;
  title: string;
  h1: string;
  description: string;
  path: string;
  total: number;
  rows: TrialIndexRow[];
};

export type HubStats = {
  total: number;
  scientificCount: number;
  topBuckets: Array<{ label: string; count: number }>;
  topSponsors: Array<{ label: string; count: number }>;
  topAreas: Array<{ label: string; count: number }>;
  topPhases: Array<{ label: string; count: number }>;
};

export type SponsorEvidenceStats = {
  total: number;
  biologicalCount: number;
  nonBiologicalCount: number;
  unresolvedCount: number;
  mixedCount: number;
  transitionCount: number;
  otherOutcomeCount: number;
  biologicalShare: number;
  outcomeBreakdown: Array<{ label: string; count: number }>;
  topResolvedReasons: Array<{ label: string; count: number }>;
  topAreas: Array<{ label: string; count: number }>;
  topPhases: Array<{ label: string; count: number }>;
  latestRegistryUpdate: string;
};

const AREA_MIN_COUNT = 10;
const AREA_LIMIT = 50;
const SPONSOR_MIN_COUNT = 10;
const SPONSOR_LIMIT = 150;
const HUB_TRIAL_LIST_LIMIT = 100;
const NON_CAUSAL_REASON_BUCKETS = new Set(["DECISION ONLY", "PROGRAM STOP ONLY"]);

function norm(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function titleCaseTaxonomy(value: string): string {
  const labels: Record<string, string> = {
    BIOLOGICAL_FAILURE: "Likely biological failure",
    NON_BIOLOGICAL: "Non-biological stop",
    NON_FAILURE_TRANSITION: "Non-failure transition",
    MIXED_CAUSES: "Mixed causes",
    UNRESOLVED: "Unresolved / review required",
    EFFICACY_FUTILITY: "Efficacy / futility",
    BIOLOGICAL_UNSPECIFIED: "Biological signal, unspecified",
    BUSINESS_STRATEGY: "Business / strategy",
    STAFFING_RESOURCES: "Staffing / resources",
    EXTERNAL_DISRUPTION: "External disruption",
  };
  if (labels[value]) return labels[value];
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolvedOutcome(row: TrialIndexRow): string {
  const finalOutcome = norm(row.classification_final_outcome).toUpperCase();
  if (finalOutcome) return finalOutcome;
  const v2Outcome = norm(row.classification_outcome_v2).toUpperCase();
  if (v2Outcome) return v2Outcome;
  return isLikelyScientificFailure(row) ? "BIOLOGICAL_FAILURE" : "UNRESOLVED";
}

function resolvedReason(row: TrialIndexRow): string {
  return norm(row.classification_final_category || row.classification_primary_reason_v2).toUpperCase();
}

function countBy(rows: TrialIndexRow[], getValue: (row: TrialIndexRow) => string): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = norm(getValue(row)) || "Other/unknown";
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function rowsByPhase(rows: TrialIndexRow[], phaseKey: string): TrialIndexRow[] {
  return rows.filter((row) => {
    const phases = parsePhases(row.phases || "");
    const normalized = phases.length ? phases : ["UNKNOWN"];
    return normalized.includes(phaseKey);
  });
}

function phaseSlug(phaseKey: string): string {
  const p = phaseKey.toUpperCase();
  if (p === "EARLY_PHASE1") return "early-phase-1";
  if (p === "PHASE1") return "phase-1";
  if (p === "PHASE1/PHASE2") return "phase-1-2";
  if (p === "PHASE2") return "phase-2";
  if (p === "PHASE2/PHASE3") return "phase-2-3";
  if (p === "PHASE3") return "phase-3";
  if (p === "PHASE4") return "phase-4";
  return "unknown-phase";
}

function reasonSlug(bucket: string): string {
  const b = bucket.toUpperCase();
  if (b === "EFFICACY/FUTILITY") return "futility";
  if (b === "SAFETY") return "safety";
  if (b === "OPERATIONAL") return "operational";
  if (b === "REGULATORY") return "regulatory";
  return slugify(bucket || "other-unknown") || "other-unknown";
}

export function isIndexableTrial(row: TrialIndexRow): boolean {
  return isLikelyScientificFailure(row);
}

export function indexableTrialRows(rows: TrialIndexRow[]): TrialIndexRow[] {
  return rows.filter(isIndexableTrial);
}

export function hubStats(rows: TrialIndexRow[]): HubStats {
  return {
    total: rows.length,
    scientificCount: rows.filter(isIndexableTrial).length,
    topBuckets: countBy(rows, reasonBucket).slice(0, 5),
    topSponsors: countBy(rows, (row) => row.lead_sponsor || "Unknown sponsor").slice(0, 5),
    topAreas: countBy(rows, (row) => row.disease_area || "Other").slice(0, 5),
    topPhases: countBy(rows, (row) => phaseLabel(parsePhases(row.phases || "")[0] || "UNKNOWN")).slice(0, 5),
  };
}

export function sponsorEvidenceStats(rows: TrialIndexRow[]): SponsorEvidenceStats {
  const outcomes = countBy(rows, (row) => titleCaseTaxonomy(resolvedOutcome(row)));
  const outcomeCount = (outcome: string) => rows.filter((row) => resolvedOutcome(row) === outcome).length;
  const knownOutcomes = new Set([
    "BIOLOGICAL_FAILURE",
    "NON_BIOLOGICAL",
    "UNRESOLVED",
    "MIXED_CAUSES",
    "NON_FAILURE_TRANSITION",
  ]);
  const topResolvedReasons = countBy(
    rows.filter((row) => {
      const outcome = resolvedOutcome(row);
      const reason = resolvedReason(row);
      return outcome !== "UNRESOLVED" && Boolean(reason) && !reason.startsWith("UNRESOLVED_");
    }),
    (row) => titleCaseTaxonomy(resolvedReason(row))
  ).slice(0, 6);
  const latestRegistryUpdate = rows
    .map((row) => norm(row.last_update_post_date || row.date).slice(0, 10))
    .filter(Boolean)
    .sort()
    .at(-1) || "Not available";
  const biologicalCount = outcomeCount("BIOLOGICAL_FAILURE");

  return {
    total: rows.length,
    biologicalCount,
    nonBiologicalCount: outcomeCount("NON_BIOLOGICAL"),
    unresolvedCount: outcomeCount("UNRESOLVED"),
    mixedCount: outcomeCount("MIXED_CAUSES"),
    transitionCount: outcomeCount("NON_FAILURE_TRANSITION"),
    otherOutcomeCount: rows.filter((row) => !knownOutcomes.has(resolvedOutcome(row))).length,
    biologicalShare: rows.length ? (biologicalCount / rows.length) * 100 : 0,
    outcomeBreakdown: outcomes,
    topResolvedReasons,
    topAreas: countBy(rows, (row) => row.disease_area || "Other").slice(0, 6),
    topPhases: countBy(rows, (row) => phaseLabel(parsePhases(row.phases || "")[0] || "UNKNOWN")).slice(0, 6),
    latestRegistryUpdate,
  };
}

function sponsorHubFromGroup(label: string, memberRows: TrialIndexRow[]): SponsorHub {
  const stats = sponsorEvidenceStats(memberRows);
  const slug = slugify(label);
  return {
    slug,
    label,
    title: compactSeoTitle(label, "stopped clinical trial evidence"),
    h1: `${label}: stopped clinical trials and failure signals`,
    description: compactSeoDescription(`V2 profile of ${memberRows.length.toLocaleString("en-US")} stopped records: ${stats.biologicalCount.toLocaleString("en-US")} likely biological signals, with non-biological and unresolved outcomes separated. Review source-linked NCT evidence.`),
    path: `/sponsor/${slug}`,
    total: memberRows.length,
    rows: memberRows,
  };
}

export function displayHubRows(rows: TrialIndexRow[], limit = HUB_TRIAL_LIST_LIMIT): TrialIndexRow[] {
  return sortRows(rows, "date_desc").slice(0, limit);
}

export function buildFailureHubs(rows: TrialIndexRow[]): SeoHub[] {
  const hubs: SeoHub[] = [];

  for (const area of countBy(rows, (row) => row.disease_area || "Other").filter((item) => item.count >= AREA_MIN_COUNT).slice(0, AREA_LIMIT)) {
    const memberRows = rows.filter((row) => (row.disease_area || "Other") === area.label);
    const stats = hubStats(memberRows);
    const slug = slugify(area.label);
    hubs.push({
      kind: "area",
      slug,
      label: area.label,
      title: compactSeoTitle(`${area.label} clinical trial failures`, `${area.count.toLocaleString("en-US")} stopped studies`),
      h1: `${area.label} clinical trial failures`,
      description: compactSeoDescription(`Review ${area.count.toLocaleString("en-US")} stopped ${area.label.toLowerCase()} trials, including ${stats.scientificCount.toLocaleString("en-US")} likely biological failure signals, sponsors, phases, and source reasons.`),
      path: `/failures/${slug}`,
      total: area.count,
      rows: memberRows,
    });
  }

  const phaseKeys = Array.from(
    new Set(rows.flatMap((row) => {
      const phases = parsePhases(row.phases || "");
      return phases.length ? phases : ["UNKNOWN"];
    }))
  );
  for (const phaseKey of phaseKeys) {
    const memberRows = rowsByPhase(rows, phaseKey);
    if (memberRows.length < AREA_MIN_COUNT) continue;
    const stats = hubStats(memberRows);
    const label = phaseLabel(phaseKey);
    const slug = phaseSlug(phaseKey);
    hubs.push({
      kind: "phase",
      slug,
      label,
      title: compactSeoTitle(`${label} clinical trial failures`, `${memberRows.length.toLocaleString("en-US")} stopped studies`),
      h1: `${label} clinical trial failures`,
      description: compactSeoDescription(`Explore ${memberRows.length.toLocaleString("en-US")} stopped ${label} trials, including ${stats.scientificCount.toLocaleString("en-US")} likely biological failure signals, sponsors, indications, and source reasons.`),
      path: `/failures/${slug}`,
      total: memberRows.length,
      rows: memberRows,
    });
  }

  for (const bucket of countBy(rows, reasonBucket).filter(
    (item) => item.count >= AREA_MIN_COUNT && !NON_CAUSAL_REASON_BUCKETS.has(item.label.toUpperCase())
  )) {
    const memberRows = rows.filter((row) => reasonBucket(row).toUpperCase() === bucket.label.toUpperCase());
    const slug = reasonSlug(bucket.label);
    const reasonLabel = `${bucket.label.charAt(0).toUpperCase()}${bucket.label.slice(1).toLowerCase()}`;
    hubs.push({
      kind: "reason",
      slug,
      label: bucket.label,
      title: compactSeoTitle(`${reasonLabel} clinical trial stops`, `${bucket.count.toLocaleString("en-US")} source records`),
      h1: `${bucket.label} clinical trial stops`,
      description: compactSeoDescription(`Search ${bucket.count.toLocaleString("en-US")} stopped trials whose registry language is classified as ${bucket.label.toLowerCase()}. Compare NCT records, sponsors, phases, and source evidence.`),
      path: `/failures/${slug}`,
      total: bucket.count,
      rows: memberRows,
    });
  }

  const seen = new Set<string>();
  return hubs.filter((hub) => {
    if (!hub.slug || seen.has(hub.slug)) return false;
    seen.add(hub.slug);
    return true;
  });
}

export function buildSponsorHubs(rows: TrialIndexRow[]): SponsorHub[] {
  return countBy(rows, (row) => row.lead_sponsor || "Unknown sponsor")
    .filter((item) => item.count >= SPONSOR_MIN_COUNT && item.label !== "Unknown sponsor")
    .slice(0, SPONSOR_LIMIT)
    .map((sponsor) => {
      const memberRows = rows.filter((row) => (row.lead_sponsor || "") === sponsor.label);
      return sponsorHubFromGroup(sponsor.label, memberRows);
    })
    .filter((hub, index, arr) => hub.slug && arr.findIndex((x) => x.slug === hub.slug) === index);
}

export function findFailureHub(rows: TrialIndexRow[], slug: string): SeoHub | null {
  return buildFailureHubs(rows).find((hub) => hub.slug === slug) || null;
}

export function findSponsorHub(rows: TrialIndexRow[], slug: string): SponsorHub | null {
  const sponsor = countBy(rows, (row) => row.lead_sponsor || "Unknown sponsor")
    .filter((item) => item.count >= SPONSOR_MIN_COUNT && item.label !== "Unknown sponsor")
    .slice(0, SPONSOR_LIMIT)
    .find((item) => slugify(item.label) === slug);
  if (!sponsor) return null;

  const memberRows = rows.filter((row) => (row.lead_sponsor || "") === sponsor.label);
  return sponsorHubFromGroup(sponsor.label, memberRows);
}

export function trialListItem(row: TrialIndexRow) {
  return {
    href: trialPath(row),
    id: row.nct_id,
    title: row.brief_title || row.nct_id,
    sponsor: row.lead_sponsor || "Unknown sponsor",
    condition: row.condition_first || row.disease_area || "Unknown condition",
    phase: phaseLabel(parsePhases(row.phases || "")[0] || "UNKNOWN"),
    bucket: reasonBucket(row),
    why: row.why_stopped_short || "No stop-reason text available in the compact dataset.",
    date: row.last_update_post_date || "",
  };
}
