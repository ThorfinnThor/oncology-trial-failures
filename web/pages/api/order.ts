// web/pages/api/order.ts
//
// Turns a request into access, with nobody in between.
//
// What is ordered is a molecule, not a cohort: nobody evaluates a mechanism class, they evaluate
// the thing on their desk. So an order resolves the asset, finds every cohort where something
// that failed acts on the same target, and records those. If none do, the order is refused and
// says why — selling somebody a comparison that will come back empty is worse than not selling.
//
// There is no payment here yet. A first customer is agreed in a conversation, not in a checkout,
// and building a payment flow before anyone has bought anything is how you spend a week to serve
// zero people. What this does build is the part that has to exist either way: the order is
// recorded, a token is minted, and everything it covers is available immediately at a URL only
// that token opens. When Stripe is connected its webhook writes the same record, and nothing else
// changes.

import type { NextApiRequest, NextApiResponse } from "next";

import { cohortsForAsset, PACKAGES, type Grant } from "@/lib/server/grants";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|gmx|web|proton|protonmail|mail)\./i;
const YEAR_SECONDS = 60 * 60 * 24 * 365;

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function token(): string {
  // 160 bits from the platform CSPRNG. Long enough that guessing is not a strategy.
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (clean(body.website)) return res.status(200).json({ ok: true }); // honeypot

  const slug = clean(body.slug, 120);
  const asset = clean(body.asset, 200);
  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 160);
  const marketing = body.marketing === true || body.marketing === "true" || body.marketing === "on";

  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });
  if (!company) return res.status(400).json({ ok: false, error: "Please enter your company or institution." });
  if (!asset && !slug) return res.status(400).json({ ok: false, error: "Name the molecule or target you are evaluating." });

  let scope: Grant["scope"] = "cohort";
  let slugs: string[] = [];

  if (asset) {
    scope = "molecule";
    slugs = cohortsForAsset(asset).slugs;
    if (!slugs.length) {
      // Refusing here is the point. The free check would have shown the same emptiness, and a
      // buyer who finds it out after paying does not come back.
      console.log(JSON.stringify({ event: "order_refused_no_match", asset }));
      return res.status(200).json({
        ok: false,
        error: `Nothing in our data shares a target with ${asset}, so there is nothing here worth `
          + "selling you. Check it on the asset page — if we have the target under another name, it will say so.",
      });
    }
  } else {
    if (!(slug in PACKAGES)) return res.status(404).json({ ok: false, error: "Unknown cohort." });
    slugs = [slug];
  }

  const store = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
  if (!store) {
    console.error(JSON.stringify({ event: "order_store_missing", asset, slug }));
    return res.status(503).json({ ok: false, error: "Ordering is not configured. Please email us." });
  }

  const value = token();
  const record: Grant & Record<string, unknown> = {
    scope,
    asset,
    slugs,
    email,
    company,
    marketing_consent: marketing,
    free_mail_domain: FREE_MAIL.test(email),
    issued_at: new Date().toISOString(),
    country: clean(req.headers["cf-ipcountry"], 4),
    paid: false,
  };

  try {
    // A grant lasts a year: long enough that a bookmark still works, short enough that a link
    // pasted into a public channel does not stay open forever.
    await store.put(`grant:${value}`, JSON.stringify(record), { expirationTtl: YEAR_SECONDS });
    await store.put(`order:${record.issued_at}:${email}`, JSON.stringify(record));
  } catch (error) {
    console.error(JSON.stringify({ event: "order_store_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not complete the order. Please try again." });
  }

  console.log(JSON.stringify({ event: "order", ...record }));
  return res.status(200).json({
    ok: true,
    url: `/access?token=${value}`,
    cohorts: slugs.length,
    message: slugs.length === 1
      ? "Your package is ready. The link works from any device and stays current for a year."
      : `${slugs.length} packages are ready — every cohort where something that failed shares your target. The link `
        + "works from any device and stays current for a year.",
  });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
