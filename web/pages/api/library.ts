// web/pages/api/library.ts
//
// What one link opens. There is no account and no password on purpose: a login is the largest
// thing that could be built here and the least useful, and a token in a URL is exactly as strong
// as the email it was sent to — which is what a password reset reduces to anyway.
//
// The list is computed from the grant every time rather than frozen into it, so a buyer sees this
// week's release through last month's link.

import type { NextApiRequest, NextApiResponse } from "next";

import briefsIndex from "@/data/briefs_index.json";
import productSummary from "@/data/product_summary.json";
import { grantedSlugs, PACKAGES, type Grant } from "@/lib/server/grants";

type KvBinding = { get(key: string): Promise<string | null> };
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = clean(req.query.token, 120);
  if (!token) return res.status(400).json({ ok: false, error: "This page needs the link from your order." });

  const store = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
  if (!store) {
    console.error(JSON.stringify({ event: "library_store_missing" }));
    return res.status(503).json({ ok: false, error: "Access is not configured. Please contact us." });
  }

  let grant: Grant | null = null;
  try {
    const raw = await store.get(`grant:${token}`);
    grant = raw ? (JSON.parse(raw) as Grant) : null;
  } catch (error) {
    console.error(JSON.stringify({ event: "library_grant_read_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not check that link. Please try again." });
  }

  const slugs = grantedSlugs(grant);
  if (!grant || !slugs.length) {
    return res.status(403).json({ ok: false, error: "That link is not valid, or it has expired." });
  }

  const packages = slugs
    .map((slug) => {
      const pkg = PACKAGES[slug];
      const brief = (briefsIndex.briefs as { slug: string; file_stem: string }[]).find(
        (b) => b.file_stem === (pkg as unknown as { brief_stem?: string }).brief_stem,
      );
      return {
        slug,
        cohort: pkg.cohort,
        area: pkg.area,
        rate: pkg.headline.rate,
        comparator_rate: pkg.headline.comparator_rate,
        counts: pkg.counts,
        generated_at_utc: pkg.generated_at_utc,
        brief_slug: brief ? brief.slug : null,
        url: `/api/report?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}`
          + (grant.asset ? `&asset=${encodeURIComponent(grant.asset)}` : ""),
        csv_url: `/api/report?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}&format=csv`,
      };
    })
    .sort((a, b) => b.counts.total_in_cohort - a.counts.total_in_cohort);

  console.log(JSON.stringify({ event: "library_opened", scope: grant.scope, cohorts: packages.length }));

  return res.status(200).json({
    ok: true,
    scope: grant.scope === "all" || grant.slug === "any" ? "all" : grant.scope || "cohort",
    asset: grant.asset || "",
    company: grant.company || "",
    issued_at: grant.issued_at || "",
    dataset_version: productSummary.dataset_version,
    packages,
    // Public files, listed here so everything a buyer paid for is reachable from one page rather
    // than from an email they have to find again.
    files: [
      { label: "Free sample of the signals dataset (CSV)", href: productSummary.sample_file },
      { label: "What every column means", href: productSummary.sample_readme_file },
      { label: "Stopped trials, full export (CSV)", href: "/all_stopped_trials.csv" },
      { label: "Trials stopped for a biological reason (CSV)", href: "/biological_failure_trials.csv" },
      { label: "Release metadata", href: "/dataset_meta.json" },
    ],
  });
}
