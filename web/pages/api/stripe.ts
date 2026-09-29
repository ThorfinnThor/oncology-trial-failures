// web/pages/api/stripe.ts
//
// Stripe tells us a payment completed; this flips one bit on a grant that already exists.
//
// The grant is minted when the order is placed, before the customer pays, and its token travels
// to Stripe as the checkout's client_reference_id. So there is nothing to create here and nothing
// to look up by email — which matters, because a webhook that has to guess which customer it
// belongs to is a webhook that will one day guess wrong.
//
// Everything is verified before anything is written: the signature, and the timestamp. A
// signature alone is not enough — a captured request replayed a month later is genuinely from
// Stripe, and would grant access again.

import type { NextApiRequest, NextApiResponse } from "next";

import { isSettled, settlesOrder, verifySignature, webhookSecret } from "@/lib/server/payment";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

// Stripe signs the bytes it sent. Anything that re-serialises the body — including Next's own
// JSON parser — changes them, and the signature stops matching.
export const config = { api: { bodyParser: false } };

const YEAR_SECONDS = 60 * 60 * 24 * 365;

async function rawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const secret = webhookSecret();
  if (!secret) {
    console.error(JSON.stringify({ event: "stripe_not_configured" }));
    return res.status(503).json({ ok: false, error: "Payment is not configured." });
  }

  const body = await rawBody(req);
  const header = String(req.headers["stripe-signature"] || "");
  const check = await verifySignature(body, header, secret);
  if (!check.ok) {
    // Deliberately terse to the caller and specific in the log: a rejected webhook is either a
    // misconfiguration or somebody probing, and neither deserves a hint.
    console.error(JSON.stringify({ event: "stripe_signature_rejected", reason: check.reason }));
    return res.status(400).json({ ok: false, error: "Invalid signature." });
  }

  let payload: { type?: string; id?: string; data?: { object?: Record<string, unknown> } };
  try {
    payload = JSON.parse(body);
  } catch {
    return res.status(400).json({ ok: false, error: "Invalid payload." });
  }

  // Everything else Stripe sends is acknowledged and ignored; a 200 stops it retrying.
  if (!settlesOrder(payload.type)) {
    return res.status(200).json({ ok: true, ignored: payload.type });
  }

  const session = payload.data?.object || {};
  const token = String(session.client_reference_id || "").trim();
  const paidStatus = String(session.payment_status || "");
  if (!token) {
    console.error(JSON.stringify({ event: "stripe_session_without_token", id: payload.id }));
    return res.status(200).json({ ok: true, ignored: "no client_reference_id" });
  }
  if (!isSettled(paidStatus)) {
    // A session can complete without being paid — a bank transfer awaiting settlement, say.
    console.log(JSON.stringify({ event: "stripe_session_not_paid", payment_status: paidStatus }));
    return res.status(200).json({ ok: true, ignored: paidStatus });
  }

  const store = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
  if (!store) {
    console.error(JSON.stringify({ event: "stripe_store_missing" }));
    // A 500 makes Stripe retry, which is what should happen: the payment is real and the grant
    // must eventually be settled.
    return res.status(500).json({ ok: false, error: "Store unavailable." });
  }

  try {
    const raw = await store.get(`grant:${token}`);
    if (!raw) {
      console.error(JSON.stringify({ event: "stripe_grant_missing", token: token.slice(0, 8) }));
      return res.status(200).json({ ok: true, ignored: "unknown grant" });
    }
    const grant = JSON.parse(raw);
    if (grant.paid) return res.status(200).json({ ok: true, already: true }); // Stripe retries; this is fine.

    grant.paid = true;
    grant.paid_at = new Date().toISOString();
    grant.stripe_session = String(session.id || "");
    grant.amount_total = session.amount_total ?? null;
    grant.currency = session.currency ?? null;
    await store.put(`grant:${token}`, JSON.stringify(grant), { expirationTtl: YEAR_SECONDS });
    await store.put(`payment:${grant.paid_at}:${grant.email || "unknown"}`, JSON.stringify(grant));
    // A Payment Link redirects to one fixed URL, so the customer comes back from Stripe carrying
    // the checkout id and nothing else — the token they left with is in a tab they may have
    // closed. This is how that id finds its way back to the grant.
    if (grant.stripe_session) {
      await store.put(`session:${grant.stripe_session}`, token, { expirationTtl: YEAR_SECONDS });
    }
  } catch (error) {
    console.error(JSON.stringify({ event: "stripe_settle_failed", message: String(error) }));
    return res.status(500).json({ ok: false, error: "Could not settle." });
  }

  console.log(JSON.stringify({ event: "stripe_settled", token: token.slice(0, 8) }));
  return res.status(200).json({ ok: true });
}
