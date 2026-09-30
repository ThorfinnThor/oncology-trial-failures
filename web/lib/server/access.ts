// web/lib/server/access.ts
//
// Reading a grant, and settling it on the spot when Stripe already says it is paid.
//
// Workers KV is eventually consistent: the webhook's write can take up to a minute to reach the
// edge a buyer reads from, and until then an order that has been paid still reads as unpaid.
// Every route that opens a paid report reads its grant through here, so none of them can show a
// paying customer "not paid yet" because of where a cache happens to be.

import type { Grant } from "@/lib/server/grants";
import {
  checkoutPays,
  retrieveCheckoutSession,
  settleGrant,
  type CheckoutSession,
} from "@/lib/server/payment";

export type KvStore = {
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

const YEAR_SECONDS = 60 * 60 * 24 * 365;
// The shortest time KV lets an edge keep a value. A grant that has just been paid should not be
// served from a minute-old copy.
const FRESH = { cacheTtl: 30 };

/** Write a settled grant and the indexes that point at it. Idempotent: the webhook does the same. */
export async function persistSettled(store: KvStore, token: string, grant: Record<string, unknown>): Promise<void> {
  await store.put(`grant:${token}`, JSON.stringify(grant), { expirationTtl: YEAR_SECONDS });
  const session = String(grant.stripe_session || "");
  if (session) {
    // A Payment Link returns the customer carrying the checkout id and nothing else.
    await store.put(`session:${session}`, token, { expirationTtl: YEAR_SECONDS });
    // Keyed by checkout, so the webhook and the return writing it both leave one record.
    await store.put(`payment:${session}`, JSON.stringify(grant));
  }
}

/** The token behind a checkout id: from Stripe when a read key is set, else from the webhook's index. */
export async function tokenForCheckout(
  store: KvStore,
  session: string,
): Promise<{ token: string; checkout: CheckoutSession | null }> {
  const checkout = await retrieveCheckoutSession(session);
  const fromStripe = checkout ? String(checkout.client_reference_id || "").trim() : "";
  if (fromStripe) return { token: fromStripe, checkout };
  return { token: (await store.get(`session:${session}`, FRESH)) || "", checkout: null };
}

/**
 * The grant for a token. If it still reads unpaid and a checkout id came with the request, Stripe
 * is asked; a checkout that pays for exactly this token settles the grant here and now.
 */
export async function loadGrant(
  store: KvStore,
  token: string,
  session = "",
  checkout: CheckoutSession | null = null,
): Promise<Grant | null> {
  const raw = await store.get(`grant:${token}`, FRESH);
  const grant = raw ? (JSON.parse(raw) as Grant & Record<string, unknown>) : null;
  if (!grant || grant.paid || !session) return grant;

  const stripe = checkout || (await retrieveCheckoutSession(session));
  if (!checkoutPays(stripe, token)) return grant;

  settleGrant(grant, stripe as CheckoutSession);
  try {
    await persistSettled(store, token, grant);
    console.log(JSON.stringify({ event: "settled_on_return", token: token.slice(0, 8) }));
  } catch (error) {
    // Stripe has confirmed the payment, so the report opens regardless; the webhook will write it.
    console.error(JSON.stringify({ event: "settle_on_return_write_failed", message: String(error) }));
  }
  return grant;
}
