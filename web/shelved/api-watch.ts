// web/pages/api/watch.ts
//
// A watchlist: the molecules, targets, mechanisms or sponsors somebody wants to hear about.
// The weekly workflow already builds a change report that separates registry events from our
// own pipeline moving; this decides who is told about which of them.
//
// Everything here is a write to KV. The matching and the sending happen in the workflow,
// because that is where the data and the network are — the site never sends a mail.

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
const MAX_TERMS = 25;
const MAX_TERM_LENGTH = 80;

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function terms(raw: unknown): string[] {
  // One per line or comma-separated, whichever the person typed.
  const parts = String(raw ?? "")
    .split(/[\n,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.slice(0, MAX_TERM_LENGTH));
  return [...new Set(parts)].slice(0, MAX_TERMS);
}

function token(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const store = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
  if (!store) {
    console.error(JSON.stringify({ event: "watch_store_missing" }));
    return res.status(503).json({ ok: false, error: "Watchlists are not configured yet." });
  }

  // Unsubscribing is a GET so it works from a link in a mail, with no login and no account.
  if (req.method === "GET") {
    const key = clean(req.query.stop, 120);
    if (!key) return res.status(400).json({ ok: false, error: "Nothing to stop." });
    try {
      const raw = await store.get(`watch:${key}`);
      if (!raw) return res.status(200).json({ ok: true, message: "That watchlist is already gone." });
      // KV bindings vary on delete; an emptied record is treated as absent by the sender.
      if (store.delete) await store.delete(`watch:${key}`);
      else await store.put(`watch:${key}`, JSON.stringify({ stopped_at: new Date().toISOString() }));
    } catch (error) {
      console.error(JSON.stringify({ event: "watch_stop_failed", message: String(error) }));
      return res.status(503).json({ ok: false, error: "Could not stop it. Please reply to the mail." });
    }
    console.log(JSON.stringify({ event: "watch_stopped", key }));
    return res.status(200).json({ ok: true, message: "Stopped. No more mail about this watchlist." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (clean(body.website)) return res.status(200).json({ ok: true }); // honeypot

  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 160);
  const watching = terms(body.terms);

  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });
  if (!watching.length) {
    return res.status(400).json({ ok: false, error: "Name at least one molecule, target, mechanism or sponsor." });
  }

  const key = token();
  const record = {
    email,
    company,
    terms: watching,
    created_at: new Date().toISOString(),
    country: clean(req.headers["cf-ipcountry"], 4),
    // The sender writes this back so a quiet week does not look like a failure.
    last_sent_at: null as string | null,
  };

  try {
    await store.put(`watch:${key}`, JSON.stringify(record));
  } catch (error) {
    console.error(JSON.stringify({ event: "watch_store_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not save it. Please try again." });
  }

  console.log(JSON.stringify({ event: "watch_created", email, terms: watching.length }));
  return res.status(200).json({
    ok: true,
    message: `Watching ${watching.length} ${watching.length === 1 ? "term" : "terms"}. You will hear from us in the week `
      + "something changes, and not otherwise. Every mail carries a link that stops it.",
  });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
