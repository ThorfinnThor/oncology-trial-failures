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
