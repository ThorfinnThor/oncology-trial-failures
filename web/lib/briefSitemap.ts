export const SITEMAP_BRIEF_SLUGS = [
  "neurology-bace-secretase",
  "neurology-tau",
  "oncology-tgf-pd-l-1",
  "oncology-cd38",
  "oncology-androgen-receptor-axis",
  "oncology-met",
  "oncology-egfr",
  "oncology-pi3k-akt-mtor",
  "oncology-parp",
  "oncology-flt3-kit",
  "oncology-pd-l-1",
  "oncology-alk-ros1-ret",
  "oncology-braf-mek",
  "oncology-cdk4-6",
  "oncology-antifolate-nucleoside",
  "oncology-microtubule",
  "oncology-topoisomerase",
  "oncology-fgfr",
  "oncology-her2",
  "oncology-vegf-vegfr",
  "oncology-ctla-4",
] as const;

export type BriefSitemapRecord = {
  slug: string;
  generated_at_utc?: string;
  closed?: number;
  failure_signature?: { assets?: { trials?: (string | { nct_id?: string })[] }[] } | null;
  endpoint_trials?: { nct_id: string }[];
};

export type BriefSitemapEntry = {
  path: string;
  lastmod?: string;
};

// The trials a brief rests on: the stopped trials behind its rate and the completed trials that
// missed. Two briefs with the same set are the same evidence under two names.
function evidenceKey(brief: BriefSitemapRecord): string {
  const ids = new Set<string>();
  for (const asset of brief.failure_signature?.assets || []) {
    for (const trial of asset.trials || []) {
      const id = typeof trial === "string" ? trial : trial?.nct_id;
      if (id) ids.add(id.toUpperCase());
    }
  }
  for (const trial of brief.endpoint_trials || []) ids.add(trial.nct_id.toUpperCase());
  return Array.from(ids).sort().join(",");
}

// Wave 1 (docs/brief-indexing-audit-2026-09-23.md) goes first and keeps its choices. Every other
// brief in the catalogue follows, broadest cohort first, unless it rests on exactly the same trials
// as a brief already listed — then the broader page carries the query and the narrower one stays
// indexable but out of the sitemap.
export function selectBriefSitemapEntries(briefs: BriefSitemapRecord[]): BriefSitemapEntry[] {
  const briefsBySlug = new Map(briefs.map((brief) => [brief.slug, brief]));
  const wave1 = SITEMAP_BRIEF_SLUGS.flatMap((slug) => {
    const brief = briefsBySlug.get(slug);
    return brief ? [brief] : [];
  });
  const rest = briefs
    .filter((brief) => !(SITEMAP_BRIEF_SLUGS as readonly string[]).includes(brief.slug))
    .sort((a, b) => (b.closed || 0) - (a.closed || 0) || a.slug.localeCompare(b.slug));

  const seen = new Set<string>();
  const selected: BriefSitemapRecord[] = [];
  for (const brief of [...wave1, ...rest]) {
    const key = evidenceKey(brief);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    selected.push(brief);
  }
  return selected.map((brief) => ({ path: `/briefs/${brief.slug}`, lastmod: brief.generated_at_utc }));
}

export function latestBriefSitemapLastmod(entries: BriefSitemapEntry[]): string | undefined {
  return entries
    .map((entry) => entry.lastmod)
    .filter((value): value is string => Boolean(value) && !Number.isNaN(Date.parse(value as string)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}
