// web/pages/api/report.ts
//
// Delivers a paid evidence package. Nobody runs a command when an order arrives: every package
// is built by the weekly workflow and sits in a private bundle, so delivery is a lookup.
//
// The bundle is imported here and nowhere else. It must never be imported from a page
// component — the bundler would ship it to the browser and every package would be free.
// scripts/web/check_private_data.py enforces that.
//
// Access is a token. Today a token is issued by the ordering flow; when Stripe is connected,
// its webhook writes the same token. The check below does not care which wrote it, so adding
// payment later changes nothing here.

import type { NextApiRequest, NextApiResponse } from "next";

import { cohortCsv, cohortRowCount } from "@/lib/server/cohortCsv";
import { grantCovers, type Grant } from "@/lib/server/grants";
import bundle from "@/data/private/evidence_packages.json";
import {
  compareAsset,
  renderComparison,
  renderUnresolved,
  resolveSubject,
  type FailedAsset,
} from "@/lib/server/assetComparison";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

type Pkg = {
  cohort: string;
  area: string;
  html: string;
  generated_at_utc: string;
  counts: Record<string, number>;
  failed_assets?: FailedAsset[];
};

// The prebuilt document leaves this slot empty; the comparison against the buyer's own molecule
// is the one section that cannot exist before there is a buyer.
const SLOT = "<!--ASSET_COMPARISON-->";
// The document is built once a week with no buyer in mind, so the link that needs a token is
// spliced in at delivery, next to the figures it belongs with.
const CSV_SLOT = "<!--COHORT_CSV-->";
const PACKAGES = (bundle as { packages: Record<string, Pkg> }).packages;

function kv(): KvBinding | undefined {
  return (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
}

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = clean(req.query.slug, 120);
  const token = clean(req.query.token, 120);

  const pkg = PACKAGES[slug];
  if (!pkg) return res.status(404).send("No package for that cohort.");
  if (!token) return res.status(401).send("This package needs an access token.");

  const store = kv();
  if (!store) {
    // Without the binding there is no way to tell a real token from a guess, and serving the
    // package anyway would make the token theatre. Fail closed and say why.
    console.error(JSON.stringify({ event: "report_store_missing", slug }));
    return res.status(503).send("Delivery is not configured. Please contact us and we will send it.");
  }

  let grant: (Grant & { email?: string }) | null = null;
  try {
    const raw = await store.get(`grant:${token}`);
    grant = raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error(JSON.stringify({ event: "report_grant_read_failed", message: String(error) }));
    return res.status(503).send("Could not verify the token. Please try again.");
  }

  // A token is issued for one cohort. "any" exists so a licence can cover the whole catalogue
  // without minting 51 tokens.
  if (!grant || (grant.slug !== slug && grant.slug !== "any")) {
    return res.status(403).send("That token is not valid for this package.");
  }

  // The same token, the same cohort, a different shape. A report is for reading; a table is for
  // working in, and a buyer who paid for a denominator should not have to retype it.
  if (clean(req.query.format, 10).toLowerCase() === "csv") {
    const csv = cohortCsv(slug);
    if (!csv) return res.status(404).send("No trial table for that cohort.");
    console.log(JSON.stringify({ event: "report_csv", slug, email: grant.email }));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", `attachment; filename="${slug}-cohort.csv"`);
    return res.status(200).send(csv);
  }

  // The asset under review comes from the order, unless this request names another one — a buyer
  // evaluating a second molecule should not have to order the cohort twice.
  const asset = clean(req.query.asset, 200) || clean(grant.asset, 200);
  let section = "";
  let resolution: "none" | "resolved" | "unresolved" = "none";
  if (asset) {
    const resolved = resolveSubject(asset);
    if (resolved) {
      section = renderComparison(resolved, compareAsset(resolved, pkg.failed_assets || [], pkg.area));
      resolution = "resolved";
    } else {
      section = renderUnresolved(asset);
      resolution = "unresolved";
    }
  }

  console.log(JSON.stringify({
    event: "report_delivered", slug, email: grant.email, asset_resolution: resolution,
    at: new Date().toISOString(),
  }));

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // A paid document should not sit in a shared cache.
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", `inline; filename="${slug}.html"`);
  const rows = cohortRowCount(slug);
  const download = rows
    ? `<div class="download"><a href="/api/report?slug=${encodeURIComponent(slug)}`
      + `&token=${encodeURIComponent(token)}&format=csv" download>Download the cohort (CSV)</a>`
      + `<span>All ${rows.toLocaleString("en-US")} trials with their status, sponsor, drugs, target, enrolment, `
      + `dates, stop reason and attribution — the table this report was computed from, for your own model.</span></div>`
    : "";

  return res.status(200).send(pkg.html.replace(SLOT, section).replace(CSV_SLOT, download));
}
