// web/pages/api/order.ts
//
// Turns a request for a package into a delivered package, with nobody in between.
//
// There is no payment here yet. A first customer is agreed in a conversation, not in a
// checkout, and building a payment flow before anyone has bought anything is how you spend a
// week to serve zero people. What this does build is the part that has to exist either way:
// the order is recorded, a token is minted, and the package is available immediately at a URL
// only that token opens.
//
// When Stripe is connected, its webhook writes the same grant record and redirects to the same
// URL. Nothing else changes.

import type { NextApiRequest, NextApiResponse } from "next";

import catalogue from "@/data/evidence_catalogue.json";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|gmx|web|proton|protonmail|mail)\./i;
const COHORTS = new Set((catalogue as { packages: { slug: string }[] }).packages.map((p) => p.slug));

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
  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 160);
  const asset = clean(body.asset, 200);
  const marketing = body.marketing === true || body.marketing === "true" || body.marketing === "on";

  if (!COHORTS.has(slug)) return res.status(404).json({ ok: false, error: "Unknown cohort." });
  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });
  if (!company) return res.status(400).json({ ok: false, error: "Please enter your company or institution." });

  const store = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
  if (!store) {
    console.error(JSON.stringify({ event: "order_store_missing", slug }));
    return res.status(503).json({ ok: false, error: "Ordering is not configured. Please email us." });
  }

  const value = token();
  const record = {
    slug,
    email,
    company,
    asset,
    marketing_consent: marketing,
    free_mail_domain: FREE_MAIL.test(email),
    issued_at: new Date().toISOString(),
    country: clean(req.headers["cf-ipcountry"], 4),
    paid: false,
  };

  try {
    // A grant lasts a year: long enough that a bookmark still works, short enough that a link
    // pasted into a public channel does not stay open forever.
    await store.put(`grant:${value}`, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 365 });
    await store.put(`order:${record.issued_at}:${email}`, JSON.stringify(record));
  } catch (error) {
    console.error(JSON.stringify({ event: "order_store_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not complete the order. Please try again." });
  }

  console.log(JSON.stringify({ event: "order", ...record }));
  return res.status(200).json({
    ok: true,
    url: `/api/report?slug=${encodeURIComponent(slug)}&token=${value}`,
    message: "Your package is ready. The link works from any device and stays valid for a year.",
  });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
