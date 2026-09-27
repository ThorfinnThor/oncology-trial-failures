// web/pages/api/newsletter.ts
//
// One list, one mail every two weeks: the trials that entered the dataset, and the ones a sponsor
// changed. No per-subscriber matching, which is the whole reason this exists rather than the
// watchlist it replaced — one list is a thing that can be written once and sent, and a thing that
// can be written once and sent is a thing that keeps happening.
//
// Signing up does not put anybody on the list. It writes a pending record and sends one mail with
// a link; only a click on that link subscribes. That is double opt-in, and it is not decoration:
// anybody can type anybody's address into a form, so without it the list is a claim that somebody
// consented, with nothing behind it. It is also what German law expects of a mail like this.
//
// The fortnightly mail itself is still composed and sent by the weekly workflow. The only mail the
// site sends is this confirmation.

import type { NextApiRequest, NextApiResponse } from "next";

import { canSendMail, frame, sendMail } from "@/lib/server/mail";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete?(key: string): Promise<void>;
};
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const SITE = "https://clinicaltrialfailures.com";
// A week to click. Long enough for somebody who signs up on a Friday, short enough that an
// address that never confirms does not sit in the store.
const PENDING_TTL_SECONDS = 60 * 60 * 24 * 7;

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

/** Where an address's subscription can be found again.
 *
 *  Without it, subscribing is write-only: the record is keyed by a random token, so a second
 *  signup with the same address cannot see the first and simply makes another one — and the
 *  person then gets every issue twice, with two unsubscribe links, only one of which works.
 *  Hashed rather than stored plainly: it is an index, and it does not need to be readable.
 */
async function addressKey(email: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email));
  return `sub:${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function token(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const store = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
  if (!store) {
    console.error(JSON.stringify({ event: "newsletter_store_missing" }));
    return res.status(503).json({ ok: false, error: "The list is not configured yet." });
  }

  // Both links in a mail are GETs, so they work from any client with no login and no account.
  if (req.method === "GET") {
    const confirming = clean(req.query.confirm, 120);
    if (confirming) return confirm(store, confirming, res);

    const key = clean(req.query.stop, 120);
    if (!key) return res.status(400).json({ ok: false, error: "Nothing to stop." });
    try {
      const raw = await store.get(`news:${key}`);
      if (!raw) return res.status(200).json({ ok: true, message: "That subscription is already gone." });
      if (store.delete) await store.delete(`news:${key}`);
      else await store.put(`news:${key}`, JSON.stringify({ stopped_at: new Date().toISOString() }));
      // The index goes too. Leaving it behind would point at a subscription that no longer
      // exists, and the same person could never sign up again.
      const email = (JSON.parse(raw) as { email?: string }).email;
      if (email && store.delete) await store.delete(await addressKey(email));
    } catch (error) {
      console.error(JSON.stringify({ event: "newsletter_stop_failed", message: String(error) }));
      return res.status(503).json({ ok: false, error: "Could not stop it. Please reply to the mail." });
    }
    console.log(JSON.stringify({ event: "newsletter_stopped", key }));
    return res.status(200).json({ ok: true, message: "Stopped. No more mail." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (clean(body.website)) return res.status(200).json({ ok: true }); // honeypot

  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 160);
  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });

  // Refusing here rather than subscribing anyway. Without a sending key the confirmation can never
  // arrive, and a list nobody confirmed is exactly the thing this route exists to avoid.
  if (!canSendMail()) {
    console.error(JSON.stringify({ event: "newsletter_cannot_confirm", hint: "BREVO_API_KEY is not set on the Worker" }));
    return res.status(503).json({
      ok: false,
      error: "Sign-up is briefly unavailable. Please try again later, or write to contact@clinicaltrialfailures.com.",
    });
  }

  const index = await addressKey(email);
  const existing = await store.get(index).catch(() => null);
  if (existing && (await store.get(`news:${existing}`).catch(() => null))) {
    // Deliberately the same shape of answer as a fresh signup, and no second mail. Telling a
    // stranger "that address is already subscribed" turns the form into a way to test whether
    // somebody is on the list.
    console.log(JSON.stringify({ event: "newsletter_already_subscribed" }));
    return res.status(200).json({
      ok: true,
      message: "Check your inbox. Nothing is sent to this address until you open the link in that mail — which is also "
        + "how we can prove you asked for it.",
    });
  }

  const key = token();
  const record = {
    email,
    company,
    // Kept because it is the evidence that this address asked: when it was requested, from which
    // country, and when it was confirmed. Nothing else about the person is stored.
    requested_at: new Date().toISOString(),
    confirmed_at: null as string | null,
    country: clean(req.headers["cf-ipcountry"], 4),
    last_sent_at: null as string | null,
  };

  try {
    // A pending signup expires by itself. An address that never confirms leaves nothing behind.
    await store.put(`pending:${key}`, JSON.stringify(record), { expirationTtl: PENDING_TTL_SECONDS });
  } catch (error) {
    console.error(JSON.stringify({ event: "newsletter_store_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not save it. Please try again." });
  }

  const link = `${SITE}/newsletter/confirm?k=${key}`;
  const sent = await sendMail(
    email,
    "Confirm your subscription — Clinical Trial Failures",
    frame(
      `<p>Somebody asked for the fortnightly mail from Clinical Trial Failures to go to this address.</p>`
      + `<p><a href="${link}" style="color:#4f46e5">Confirm that it was you</a> and the next issue will arrive with the `
      + `release after this one. Every mail has an unsubscribe link.</p>`
      + `<p style="color:#666;font-size:13px">If it was not you, do nothing: this address is not on any list until `
      + `that link is clicked, and this request is forgotten within a week.</p>`
      + `<p style="color:#8a8f98;font-size:12px">${link}</p>`,
    ),
  ).catch((error) => {
    console.error(JSON.stringify({ event: "newsletter_confirm_send_failed", message: String(error) }));
    return false;
  });

  if (!sent) {
    return res.status(503).json({
      ok: false,
      error: "We could not send the confirmation mail. Please try again, or write to contact@clinicaltrialfailures.com.",
    });
  }

  console.log(JSON.stringify({ event: "newsletter_confirmation_sent", email }));
  return res.status(200).json({
    ok: true,
    message: "Check your inbox. Nothing is sent to this address until you open the link in that mail — which is also "
      + "how we can prove you asked for it.",
  });
}

/** Turns a pending signup into a subscription. Idempotent: the same link twice is not an error.
 *  Exported for tests: this is the one path where a bug means nobody is ever on the list. */
export async function confirm(store: KvBinding, key: string, res: NextApiResponse) {
  let raw: string | null = null;
  try {
    raw = await store.get(`pending:${key}`);
  } catch (error) {
    console.error(JSON.stringify({ event: "newsletter_confirm_read_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not check that link. Please try again." });
  }

  if (!raw) {
    // Either it is already confirmed, or the week ran out. Saying which is the difference between
    // "you are fine" and "do it again", and the subscriber cannot tell from the link alone.
    const live = await store.get(`news:${key}`).catch(() => null);
    return live
      ? res.status(200).json({ ok: true, message: "Already confirmed. You are on the list." })
      : res.status(410).json({
          ok: false,
          error: "This link has expired. Sign up again and we will send a fresh one.",
        });
  }

  const record = { ...JSON.parse(raw), confirmed_at: new Date().toISOString() };
  try {
    await store.put(`news:${key}`, JSON.stringify(record));
    if (record.email) await store.put(await addressKey(record.email), key);
    if (store.delete) await store.delete(`pending:${key}`);
  } catch (error) {
    console.error(JSON.stringify({ event: "newsletter_confirm_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not confirm it. Please try the link again." });
  }

  console.log(JSON.stringify({ event: "newsletter_confirmed", email: record.email }));
  return res.status(200).json({ ok: true, message: "Confirmed. The next issue goes out with the release after this." });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
