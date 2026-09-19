// web/pages/api/brief-request.ts
//
// Gate for the brief PDFs: same lead capture as the dataset sample, one fewer field.
// The PDF itself is a public asset; the form is what turns a download into a lead, so
// the response carries the URL rather than the page hardcoding it.

import type { NextApiRequest, NextApiResponse } from "next";

import briefsIndex from "@/data/briefs_index.json";

type KvBinding = { put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> };
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|gmx|web|proton|protonmail|mail)\./i;

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (clean(body.website)) {
    // Honeypot filled: respond like success without issuing the brief.
    return res.status(200).json({ ok: true });
  }

  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 160);
  const slug = clean(body.slug, 120);
  const consent = body.consent === true || body.consent === "true" || body.consent === "on";

  const brief = briefsIndex.briefs.find((b) => b.slug === slug);
  if (!brief) return res.status(404).json({ ok: false, error: "Unknown brief." });
  if (!brief.has_pdf) return res.status(503).json({ ok: false, error: "This brief's PDF is being rebuilt. Please try again shortly." });
  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });
  if (!company) return res.status(400).json({ ok: false, error: "Please enter your company or institution." });
  if (!consent) return res.status(400).json({ ok: false, error: "Please confirm you agree to be contacted." });

  const lead = {
    type: "brief_request",
    brief: brief.segment,
    area: brief.area,
    slug,
    email,
    company,
    free_mail_domain: FREE_MAIL.test(email),
    requested_at: new Date().toISOString(),
    country: clean(req.headers["cf-ipcountry"], 4),
  };

  console.log(JSON.stringify({ event: "lead", ...lead }));
  try {
    const kv = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
    if (kv) {
      await kv.put(`lead:${lead.requested_at}:${email}`, JSON.stringify(lead));
    } else {
      // Without the binding a lead survives only as long as Workers Logs retention. See docs/leads.md.
      console.warn(JSON.stringify({ event: "lead_store_missing", hint: "KV binding LEADS is not configured" }));
    }
  } catch (error) {
    console.error(JSON.stringify({ event: "lead_store_failed", message: String(error) }));
  }

  return res.status(200).json({ ok: true, pdfUrl: `/briefs/${brief.file_stem}.pdf` });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
