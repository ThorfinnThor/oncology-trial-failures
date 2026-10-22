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
//
// During the beta that free path is the offer: the report costs a work email, nothing else. The
// address is required, a free-mail domain is accepted but flagged on the record (refusing it loses
// the lead and stops nobody who is willing to invent an address), and an optional, unticked
// newsletter box starts the newsletter's own double opt-in. The report is delivered whether or not
// that box is ticked: delivering a file somebody asked for is not marketing
// (docs/provenance_and_rights.md).

import type { NextApiRequest, NextApiResponse } from "next";

import { cohortsForAsset, PACKAGES, type Grant } from "@/lib/server/grants";
import { checkoutUrl, isConfigured } from "@/lib/server/payment";
import { requestSubscription } from "@/pages/api/newsletter";

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

  // The order asks for an email again, but an address is free to invent, so it does not stop a
  // script from minting grants either. Only the site's own pages may place an order; a browser
  // always sends Origin on a POST.
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
  // Unticked by default on the form, and only a request: nobody is on the list until they click
  // the confirmation mail.
  const newsletter = body.newsletter === true || body.newsletter === "true" || body.newsletter === "on";

  // The work email is what the report costs during the beta, and once Stripe is on it prefills the
  // checkout. Company stays optional; Stripe's checkout collects it when there is one.
  if (!email) return res.status(400).json({ ok: false, error: "Please enter your work email to get the report." });
  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });
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
    // A request, not consent: consent is the confirmed newsletter record, if the click ever comes.
    newsletter_requested: newsletter,
    free_mail_domain: isFreeMail(email),
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

  // The token exists before the payment does, and travels to Stripe as the checkout's reference,
  // so the page the customer lands on after paying is known in advance and the webhook only has
  // to flip a bit.
  // Self-serve orders are always the per-molecule tier; full access is arranged by hand.
  const tier = "molecule" as const;
  const pay = isConfigured(tier) ? checkoutUrl(tier, value, email) : "";

  // After the grant exists, and never in its way: a newsletter that cannot send its confirmation
  // right now costs the reader the newsletter, not the report.
  let newsletterNote = "";
  let newsletterStarted = false;
  if (newsletter) {
    const sub = await requestSubscription(store, { email, company, country: String(record.country || "") })
      .catch(() => null);
    newsletterStarted = Boolean(sub?.body.ok);
    console.log(JSON.stringify({ event: "order_newsletter", started: newsletterStarted }));
    newsletterNote = newsletterStarted
      ? " For the newsletter, please confirm the mail we have just sent you."
      : " We could not start the newsletter sign-up just now; you can subscribe on the newsletter page.";
  }

  console.log(JSON.stringify({ event: "order", ...record, awaiting_payment: Boolean(pay) }));
  return res.status(200).json({
    ok: true,
    url: pay || `/access?token=${value}`,
    access_url: `/access?token=${value}`,
    payment: Boolean(pay),
    cohorts: slugs.length,
    message: (pay
      ? (slugs.length === 1
        ? "One step left. After payment the report opens straight away and the link stays current for a year."
        : `One report with ${slugs.length} cohort chapters. It opens straight away after payment and the link `
          + "stays current for a year.")
      : (slugs.length === 1
        ? "Your report is ready. The link works from any device and stays current for a year."
        : `Your report is ready — ${slugs.length} cohort chapters, one for every cohort where something that `
          + "failed shares your target. The link works from any device and stays current for a year."))
      + newsletterNote,
    newsletter: newsletter ? (newsletterStarted ? "confirmation_sent" : "unavailable") : "not_requested",
  });
}

/** Accepted, but flagged on the order: a personal address is a weaker lead, not a reason to refuse. */
export function isFreeMail(email: string): boolean {
  return FREE_MAIL.test(email);
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
