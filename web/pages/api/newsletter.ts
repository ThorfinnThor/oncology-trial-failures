// web/pages/api/newsletter.ts
//
// One list, one mail every two weeks: the trials that entered the dataset, and the ones a sponsor
// changed. No per-subscriber matching, which is the whole reason this exists rather than the
// watchlist it replaced — one list is a thing that can be written once and sent, and a thing that
// can be written once and sent is a thing that keeps happening.
//
// Everything here is a write to KV. The composing and the sending happen in the weekly workflow,
// because that is where the data and the network are; the site never sends a mail.

import type { NextApiRequest, NextApiResponse } from "next";

type KvBinding = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete?(key: string): Promise<void>;
};
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
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

  // Unsubscribing is a GET so it works from a link in a mail, with no login and no account.
  if (req.method === "GET") {
    const key = clean(req.query.stop, 120);
    if (!key) return res.status(400).json({ ok: false, error: "Nothing to stop." });
    try {
      const raw = await store.get(`news:${key}`);
      if (!raw) return res.status(200).json({ ok: true, message: "That subscription is already gone." });
      if (store.delete) await store.delete(`news:${key}`);
      else await store.put(`news:${key}`, JSON.stringify({ stopped_at: new Date().toISOString() }));
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

  const record = {
    email,
    company,
    created_at: new Date().toISOString(),
    country: clean(req.headers["cf-ipcountry"], 4),
    last_sent_at: null as string | null,
  };

  try {
    await store.put(`news:${token()}`, JSON.stringify(record));
  } catch (error) {
    console.error(JSON.stringify({ event: "newsletter_store_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not save it. Please try again." });
  }

  console.log(JSON.stringify({ event: "newsletter_subscribed", email }));
  return res.status(200).json({
    ok: true,
    message: "You are on the list. The next one goes out with the release after this — and every mail carries a link "
      + "that stops it.",
  });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
