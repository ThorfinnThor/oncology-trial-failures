// web/lib/server/payment.ts
//
// Payment, arranged so that the site works the same whether or not it is configured.
//
// Stripe Payment Links rather than a Checkout Session created through the API: a link is made
// once in the dashboard and needs no secret key on our side, which removes the one credential
// that would have been worth stealing. The order mints the token first and passes it as the
// link's client_reference_id, so the success URL is known before the customer pays and the
// webhook only has to flip a bit.
//
// Until the links are set, isConfigured() is false and an order is granted immediately, exactly
// as it was before any of this existed. That is deliberate: a half-connected checkout that
// refuses to deliver is worse than no checkout.

type Env = Record<string, string | undefined>;
type CloudflareGlobal = typeof globalThis & { [key: symbol]: { env?: Env } | undefined };

function env(): Env {
  const cf = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env;
  return { ...(typeof process !== "undefined" ? process.env : {}), ...(cf || {}) };
}

export type Tier = "molecule" | "all";

/** The dashboard link for a tier, or "" when payment is not set up. */
export function paymentLink(tier: Tier): string {
  const e = env();
  return (tier === "all" ? e.STRIPE_LINK_ACCESS : e.STRIPE_LINK_PACKAGE) || "";
}

export function isConfigured(tier: Tier): boolean {
  return Boolean(paymentLink(tier));
}

/** Where to send the customer to pay, carrying the token the webhook will settle against. */
export function checkoutUrl(tier: Tier, token: string, email: string): string {
  const link = paymentLink(tier);
  if (!link) return "";
  const url = new URL(link);
  url.searchParams.set("client_reference_id", token);
  if (email) url.searchParams.set("prefilled_email", email);
  return url.toString();
}

/**
 * The Stripe events that can settle an order. A card payment settles in `checkout.session.completed`
 * itself. A delayed method — SEPA Direct Debit, a bank transfer — completes the session unpaid and
 * settles days later in `checkout.session.async_payment_succeeded`; ignoring that event would leave a
 * customer who has paid without access. Both carry the same session object and the same
 * client_reference_id, and settling is idempotent, so both go through one path.
 */
export const SETTLING_EVENTS = ["checkout.session.completed", "checkout.session.async_payment_succeeded"] as const;

export function settlesOrder(type: unknown): boolean {
  return (SETTLING_EVENTS as readonly string[]).includes(String(type || ""));
}

/**
 * Whether a completed session means the order is settled. `paid` is the normal case.
 * `no_payment_required` is a checkout whose total a 100% promotion code brought to zero — only
 * codes created in our own Stripe dashboard can do that, so it is a decision, not a leak; it is
 * how a test purchase or a complimentary report goes through the real link without money moving.
 * Anything else (`unpaid`: a bank transfer still on its way) waits for async_payment_succeeded.
 */
export function isSettled(paymentStatus: unknown): boolean {
  const status = String(paymentStatus || "");
  return status === "paid" || status === "no_payment_required";
}

/**
 * A restricted Stripe key with one permission — Checkout Sessions: Read — and nothing else.
 *
 * Without it, the customer returning from checkout waits for the webhook, and then for Workers KV
 * to carry the webhook's write to the edge they are reading from, which can take up to a minute:
 * a buyer who has just paid looking at "waiting for your payment". With it, the return itself asks
 * Stripe whether the checkout is paid and opens the report at once. The key can read checkouts and
 * do nothing else — it cannot charge, refund or change anything — so the reason for keeping secret
 * keys out of this site still holds. Optional: unset, everything works as before, only slower.
 */
export function readKey(): string {
  return env().STRIPE_READ_KEY || "";
}

/** Stripe checkout ids. Anything else is refused before it is put into a URL to Stripe's API. */
export function isCheckoutId(id: string): boolean {
  return /^cs_(live|test)_[A-Za-z0-9]{10,250}$/.test(id);
}

export type CheckoutSession = Record<string, unknown>;

/** The checkout as Stripe has it now, or null when no read key is set or Stripe does not answer. */
export async function retrieveCheckoutSession(
  id: string,
  fetcher: typeof fetch = fetch,
): Promise<CheckoutSession | null> {
  const key = readKey();
  if (!key || !isCheckoutId(id)) return null;
  try {
    const response = await fetcher(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!response.ok) {
      console.error(JSON.stringify({ event: "stripe_session_read_failed", status: response.status }));
      return null;
    }
    return (await response.json()) as CheckoutSession;
  } catch (error) {
    console.error(JSON.stringify({ event: "stripe_session_read_failed", message: String(error) }));
    return null;
  }
}

/** Whether this checkout, as Stripe reports it, pays for the order behind `token`. */
export function checkoutPays(session: CheckoutSession | null, token: string): boolean {
  if (!session || !token) return false;
  return String(session.client_reference_id || "").trim() === token && isSettled(session.payment_status);
}

/**
 * The one place a grant is marked paid, whether the webhook or the customer's return got there
 * first. Mutates and returns the grant.
 */
export function settleGrant<G extends Record<string, unknown>>(grant: G, session: CheckoutSession): G {
  const g = grant as Record<string, unknown>;
  g.paid = true;
  g.paid_at = g.paid_at || new Date().toISOString();
  g.stripe_session = String(session.id || "");
  g.amount_total = session.amount_total ?? null;
  g.currency = session.currency ?? null;
  // The order no longer asks for these on our page; Stripe's checkout does.
  const customer = (session.customer_details || {}) as Record<string, unknown>;
  const collected = (session.collected_information || {}) as Record<string, unknown>;
  if (!g.email && customer.email) g.email = String(customer.email).toLowerCase();
  if (!g.name && customer.name) g.name = String(customer.name);
  if (!g.company && (collected.business_name || customer.business_name)) {
    g.company = String(collected.business_name || customer.business_name);
  }
  return grant;
}

export function webhookSecret(): string {
  return env().STRIPE_WEBHOOK_SECRET || "";
}

const encoder = new TextEncoder();

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Stripe's own scheme: HMAC-SHA256 over `${timestamp}.${body}`, compared against every v1
 * signature in the header.
 *
 * The timestamp check is not decoration. Without it a signature captured once stays valid
 * forever, and a replayed `checkout.session.completed` grants access again — the request is
 * genuinely from Stripe, which is exactly why the signature alone cannot be the whole test.
 */
export async function verifySignature(
  body: string,
  header: string,
  secret: string,
  toleranceSeconds = 300,
  now = Math.floor(Date.now() / 1000),
): Promise<{ ok: boolean; reason?: string }> {
  if (!secret) return { ok: false, reason: "no signing secret" };
  if (!header) return { ok: false, reason: "no signature header" };

  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const at = part.indexOf("=");
      return at < 0 ? ["", ""] : [part.slice(0, at).trim(), part.slice(at + 1).trim()];
    }),
  );
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: "no timestamp" };
  if (Math.abs(now - timestamp) > toleranceSeconds) return { ok: false, reason: "timestamp outside tolerance" };

  const signatures = header
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!signatures.length) return { ok: false, reason: "no v1 signature" };

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
  return signatures.some((candidate) => timingSafeEqual(candidate, expected))
    ? { ok: true }
    : { ok: false, reason: "signature does not match" };
}
