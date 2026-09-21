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

import bundle from "@/data/private/evidence_packages.json";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

type Pkg = { cohort: string; area: string; html: string; generated_at_utc: string; counts: Record<string, number> };
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

  let grant: { slug?: string; email?: string; issued_at?: string } | null = null;
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

  console.log(JSON.stringify({ event: "report_delivered", slug, email: grant.email, at: new Date().toISOString() }));

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // A paid document should not sit in a shared cache.
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", `inline; filename="${slug}.html"`);
  return res.status(200).send(pkg.html);
}
