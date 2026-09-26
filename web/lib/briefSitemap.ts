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
};

export type BriefSitemapEntry = {
  path: string;
  lastmod?: string;
};

export function selectBriefSitemapEntries(briefs: BriefSitemapRecord[]): BriefSitemapEntry[] {
  const briefsBySlug = new Map(briefs.map((brief) => [brief.slug, brief]));

  return SITEMAP_BRIEF_SLUGS.flatMap((slug) => {
    const brief = briefsBySlug.get(slug);
    if (!brief) return [];

    return [{ path: `/briefs/${slug}`, lastmod: brief.generated_at_utc }];
  });
}

export function latestBriefSitemapLastmod(entries: BriefSitemapEntry[]): string | undefined {
  return entries
    .map((entry) => entry.lastmod)
    .filter((value): value is string => Boolean(value) && !Number.isNaN(Date.parse(value as string)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}
