import type { TrialIndexRow } from "./types";
import { reasonBucket } from "./filtering";
import { buildSponsorHubs, isIndexableTrial } from "./seoHubs";
import { trialPath } from "./seoUrls";

// Links a trial page carries to the rest of the site: its sponsor hub, the mechanism briefs that
// list it, and a handful of indexable trials like it. Built once from the whole index at build time
// (scripts/generate-related-links.ts) so a trial page never has to load the index to render them.

export type RelatedLink = { label: string; href: string };

export type RelatedTrial = {
  nct_id: string;
  href: string;
  title: string;
  sponsor: string;
};

export type TrialRelatedLinks = {
  sponsor: RelatedLink | null;
  briefs: RelatedLink[];
  similar: RelatedTrial[];
  // Drug pages (lib/drugPages.ts) for the drugs this trial lists; absent in shards built before them.
  drugs?: RelatedLink[];
};

export type BriefMembership = {
  slug: string;
  segment: string;
  nct_ids: string[];
};

const SIMILAR_EACH_SIDE = 3;
const BRIEFS_PER_TRIAL = 3;

function sortKey(row: TrialIndexRow): string {
  return [row.condition_first || "", row.intervention_first || "", row.nct_id].join("\u0000").toLowerCase();
}

function groupKey(row: TrialIndexRow): string {
  return `${row.disease_area || "Other"}\u0000${reasonBucket(row).toUpperCase()}`;
}

function relatedTrial(row: TrialIndexRow): RelatedTrial {
  return {
    nct_id: row.nct_id,
    href: trialPath(row),
    title: row.brief_title || row.nct_id,
    sponsor: row.lead_sponsor || "Unknown sponsor",
  };
}

// First index whose key sorts at or after `key` (binary search over a sorted group).
function insertionPoint(keys: string[], key: string): number {
  let lo = 0;
  let hi = keys.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (keys[mid] < key) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Neighbours in a group sorted by condition and intervention, so the trials shown sit close to the
// one on the page. Taking the same number from each side, wrapping at the ends, means every
// indexable trial in a group of two or more is linked from its neighbours: no sitemap page is left
// reachable only through the sitemap.
function neighbours(group: TrialIndexRow[], keys: string[], self: TrialIndexRow): RelatedTrial[] {
  const others = group.length - (group.includes(self) ? 1 : 0);
  if (others <= 0) return [];
  const start = insertionPoint(keys, sortKey(self));
  // A member sits at `start`, so its right-hand neighbour is start + 1; for a trial outside the
  // group, `start` is already the first trial after it.
  const rightOffset = group[start]?.nct_id === self.nct_id ? 0 : 1;
  const picked: TrialIndexRow[] = [];
  const seen = new Set<string>([self.nct_id]);
  const want = Math.min(others, SIMILAR_EACH_SIDE * 2);
  for (let step = 1; picked.length < want && step <= group.length; step += 1) {
    for (const index of [start - step, start + step - rightOffset]) {
      const row = group[((index % group.length) + group.length) % group.length];
      if (picked.length < want && !seen.has(row.nct_id)) {
        seen.add(row.nct_id);
        picked.push(row);
      }
    }
  }
  return picked.map(relatedTrial);
}

export function buildRelatedLinks(
  rows: TrialIndexRow[],
  briefs: BriefMembership[],
  drugsByTrial: Record<string, RelatedLink[]> = {}
): Map<string, TrialRelatedLinks> {
  const sponsorPaths = new Map(buildSponsorHubs(rows).map((hub) => [hub.label, hub.path]));

  const briefsByTrial = new Map<string, RelatedLink[]>();
  for (const brief of briefs) {
    for (const nctId of new Set(brief.nct_ids.map((id) => id.toUpperCase()))) {
      const list = briefsByTrial.get(nctId) || [];
      if (list.length < BRIEFS_PER_TRIAL) list.push({ label: brief.segment, href: `/briefs/${brief.slug}` });
      briefsByTrial.set(nctId, list);
    }
  }

  // Similar trials are drawn from indexable trials only: linking to a noindex page passes nothing on.
  const byGroup = new Map<string, TrialIndexRow[]>();
  const byArea = new Map<string, TrialIndexRow[]>();
  for (const row of rows) {
    if (!isIndexableTrial(row)) continue;
    const group = byGroup.get(groupKey(row)) || [];
    group.push(row);
    byGroup.set(groupKey(row), group);
    const area = row.disease_area || "Other";
    const areaRows = byArea.get(area) || [];
    areaRows.push(row);
    byArea.set(area, areaRows);
  }
  const sorted = (groups: Map<string, TrialIndexRow[]>) =>
    new Map(
      Array.from(groups, ([key, group]) => {
        group.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
        return [key, { group, keys: group.map(sortKey) }] as const;
      })
    );
  const groups = sorted(byGroup);
  const areas = sorted(byArea);

  const out = new Map<string, TrialRelatedLinks>();
  for (const row of rows) {
    const sponsorPath = row.lead_sponsor ? sponsorPaths.get(row.lead_sponsor) : undefined;
    const sameGroup = groups.get(groupKey(row));
    const sameArea = areas.get(row.disease_area || "Other");
    let similar = sameGroup ? neighbours(sameGroup.group, sameGroup.keys, row) : [];
    if (!similar.length && sameArea) similar = neighbours(sameArea.group, sameArea.keys, row);
    out.set(row.nct_id.toUpperCase(), {
      sponsor: sponsorPath && row.lead_sponsor ? { label: row.lead_sponsor, href: sponsorPath } : null,
      briefs: briefsByTrial.get(row.nct_id.toUpperCase()) || [],
      similar,
      drugs: drugsByTrial[row.nct_id.toUpperCase()] || [],
    });
  }
  return out;
}
