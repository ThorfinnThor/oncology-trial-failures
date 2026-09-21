// web/lib/server/grants.ts
//
// What a token unlocks, in one place, because three routes ask the same question and a paid
// boundary that is decided in three places is a paid boundary with three different answers.
//
// A grant is created by an order and read by delivery. It carries the cohorts it covers rather
// than recomputing them at delivery: the catalogue is rebuilt every week, and a buyer who paid
// for the cohorts that matched their molecule in March should not silently lose one in June
// because a mechanism class was renamed.

import bundle from "@/data/private/evidence_packages.json";
import {
  rankMatches,
  resolveSubject,
  summariseCohort,
  type CohortMatch,
  type FailedAsset,
} from "@/lib/server/assetComparison";

export type Pkg = {
  cohort: string;
  area: string;
  counts: { closed: number; stopped: number; still_open: number; total_in_cohort: number };
  headline: { rate: number; comparator_rate: number; comparator_label: string };
  failed_assets?: FailedAsset[];
  html: string;
  generated_at_utc: string;
};

export const PACKAGES = (bundle as unknown as { packages: Record<string, Pkg> }).packages;

export type Grant = {
  /** "molecule": the cohorts that share a target with the asset. "cohort": one. "all": everything. */
  scope?: "molecule" | "cohort" | "all";
  slug?: string;
  slugs?: string[];
  asset?: string;
  email?: string;
  company?: string;
  issued_at?: string;
  paid?: boolean;
};

/** Cohorts where something that failed acts on the same target as the subject.
 *
 * Target, not pathway: "every cohort where a drug that failed shares your molecule's target" is
 * what the price says, and a promise that is wider in the code than on the page is a promise
 * nobody can check.
 */
export function cohortsForAsset(asset: string): { matches: CohortMatch[]; slugs: string[] } {
  const subject = resolveSubject(asset);
  if (!subject) return { matches: [], slugs: [] };

  const matches: CohortMatch[] = [];
  for (const [slug, pkg] of Object.entries(PACKAGES)) {
    const match = summariseCohort(subject, { slug, ...pkg });
    if (match && match.same_target_and_modality + match.same_target > 0) matches.push(match);
  }
  const ranked = rankMatches(matches);
  return { matches: ranked, slugs: ranked.map((m) => m.slug) };
}

/** Every cohort this grant opens. An unknown or empty grant opens nothing. */
export function grantedSlugs(grant: Grant | null): string[] {
  if (!grant) return [];
  if (grant.scope === "all" || grant.slug === "any") return Object.keys(PACKAGES);
  const slugs = new Set<string>(grant.slugs || []);
  if (grant.slug) slugs.add(grant.slug);
  return [...slugs].filter((slug) => slug in PACKAGES);
}

export function grantCovers(grant: Grant | null, slug: string): boolean {
  if (!grant) return false;
  if (grant.scope === "all" || grant.slug === "any") return slug in PACKAGES;
  return grantedSlugs(grant).includes(slug);
}
