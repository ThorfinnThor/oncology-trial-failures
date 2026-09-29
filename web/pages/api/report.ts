// web/pages/api/report.ts
//
// Delivers a paid diligence report. Nobody runs a command when an order arrives: every report
// is built by the weekly workflow and sits in a private bundle, so delivery is a lookup.
//
// The bundle is imported here and nowhere else. It must never be imported from a page
// component — the bundler would ship it to the browser and every report would be free.
// scripts/web/check_private_data.py enforces that.
//
// Access is a token. Today a token is issued by the ordering flow; when Stripe is connected,
// its webhook writes the same token. The check below does not care which wrote it, so adding
// payment later changes nothing here.

import type { NextApiRequest, NextApiResponse } from "next";

import { grantedSlugs, isUnlocked, type Grant } from "@/lib/server/grants";
import bundle from "@/data/private/evidence_packages.json";
import { renderChapter } from "@/lib/server/reportDocument";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

type Pkg = { cohort: string };

const PACKAGES = (bundle as unknown as { packages: Record<string, Pkg> }).packages;

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
  if (!pkg) return res.status(404).send("No report for that cohort.");
  if (!token) return res.status(401).send("This report needs an access token.");

  const store = kv();
  if (!store) {
    // Without the binding there is no way to tell a real token from a guess, and serving the
    // report anyway would make the token theatre. Fail closed and say why.
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

  // What a token opens is decided in grants.ts and nowhere else. This route used to ask its own
  // question, comparing the grant's single-cohort field against the slug — and an order from the
  // site writes a list of cohorts, never that field, so it answered 403 to every self-serve
  // buyer. The module was imported here the whole time and never called. A test in
  // tests/grants.test.ts now reads these routes and fails if one starts deciding again.
  if (!grant || !grantedSlugs(grant).includes(slug)) {
    return res.status(403).send("That token is not valid for this package.");
  }
  if (!isUnlocked(grant)) {
    return res.status(402).send("This order has not been paid yet. If you have just paid, give it "
      + "a moment and reload — confirmation usually takes a few seconds.");
  }

  // The asset under review comes from the order, unless this request names another one — a buyer
  // evaluating a second molecule should not have to order the cohort twice.
  const asset = clean(req.query.asset, 200) || clean(grant.asset, 200);
  const { html, resolution } = renderChapter(slug, asset);

  console.log(JSON.stringify({
    event: "report_delivered", slug, email: grant.email, asset_resolution: resolution,
    at: new Date().toISOString(),
  }));

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // A paid document should not sit in a shared cache.
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", `inline; filename="${slug}.html"`);
  return res.status(200).send(html);
}
