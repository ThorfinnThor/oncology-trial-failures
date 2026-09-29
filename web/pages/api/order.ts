// web/pages/api/order.ts
//
// Turns a request into access, with nobody in between.
//
// What is ordered is a molecule, not a cohort: nobody evaluates a mechanism class, they evaluate
// the thing on their desk. So an order resolves the asset, finds every cohort where something
// that failed acts on the same target, and records those. If none do, the order is refused and
// says why — selling somebody a comparison that will come back empty is worse than not selling.
//
// The token is minted before the payment exists and travels to Stripe as the checkout's
// client_reference_id, so /api/stripe has nothing to create and nobody to identify — it flips one
// bit on a record that is already there. While no Payment Link is configured the order is granted
// immediately, exactly as it was before any of this existed: a half-connected checkout that takes
// an order and then refuses to deliver is worse than no checkout. See docs/payment.md.

import type { NextApiRequest, NextApiResponse } from "next";

import { cohortsForAsset, PACKAGES, type Grant } from "@/lib/server/grants";
import { checkoutUrl, isConfigured } from "@/lib/server/payment";

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

  // The buy button no longer asks for an email, so nothing on the form stops a script from minting
  // grants. Only the site's own pages may place an order; a browser always sends Origin on a POST.
  if (!sameSite(req)) {
    console.log(JSON.stringify({ event: "order_rejected_origin", origin: clean(req.headers.origin, 120) }));
    return res.status(403).json({ ok: false, error: "Please order from clinicaltrialfailures.com." });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (clean(body.website)) return res.status(200).json({ ok: true }); // honeypot

  const slug = clean(body.slug, 120);
  const asset = clean(body.asset, 200);
  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 160);
  const marketing = body.marketing === true || body.marketing === "true" || body.marketing === "on";

  // Email and company are optional: the buy button goes straight to Stripe, whose checkout
  // collects both, and the webhook copies them onto the grant. An address that is given still has
  // to look like one.
  if (email && !EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });
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
    await store.put(`order:${record.issued_at}:${email || value.slice(0, 8)}`, JSON.stringify(record));
  } catch (error) {
    console.error(JSON.stringify({ event: "order_store_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not complete the order. Please try again." });
  }

  // The token exists before the payment does, and travels to Stripe as the checkout's reference,
  // so the page the customer lands on after paying is known in advance and the webhook only has
  // to flip a bit.
  // Self-serve orders are always the per-molecule tier; full access is arranged by hand.
  const tier = "molecule" as const;
  const pay = isConfigured(tier) ? checkoutUrl(tier, value, email) : "";

  console.log(JSON.stringify({ event: "order", ...record, awaiting_payment: Boolean(pay) }));
  return res.status(200).json({
    ok: true,
    url: pay || `/access?token=${value}`,
    access_url: `/access?token=${value}`,
    payment: Boolean(pay),
    cohorts: slugs.length,
    message: pay
      ? (slugs.length === 1
        ? "One step left. After payment the report opens straight away and the link stays current for a year."
        : `One report with ${slugs.length} cohort chapters. It opens straight away after payment and the link `
          + "stays current for a year.")
      : (slugs.length === 1
        ? "Your report is ready. The link works from any device and stays current for a year."
        : `Your report is ready — ${slugs.length} cohort chapters, one for every cohort where something that `
          + "failed shares your target. The link works from any device and stays current for a year."),
  });
}

export function sameSite(req: Pick<NextApiRequest, "headers">): boolean {
  const origin = String(req.headers.origin || req.headers.referer || "");
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return host === "clinicaltrialfailures.com" || host.endsWith(".clinicaltrialfailures.com")
      || host === "localhost" || host === "127.0.0.1" || host.endsWith(".workers.dev");
  } catch {
    return false;
  }
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
