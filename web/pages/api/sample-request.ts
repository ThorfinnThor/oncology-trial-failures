import type { NextApiRequest, NextApiResponse } from "next";

import productSummary from "@/data/product_summary.json";

type KvBinding = { put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> };
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|gmx|web|proton|protonmail|mail)\./i;
const USE_CASES = new Set(["investment", "competitive-intelligence", "clinical-development", "ai-ml", "academic", "other"]);

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
    // Honeypot filled: respond like success without issuing the sample.
    return res.status(200).json({ ok: true });
  }

  const email = clean(body.email, 254).toLowerCase();
  const name = clean(body.name, 120);
  const company = clean(body.company, 160);
  const useCase = clean(body.useCase, 40);
  const consent = body.consent === true || body.consent === "true" || body.consent === "on";

  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });
  if (!company) return res.status(400).json({ ok: false, error: "Please enter your company or institution." });
  if (!USE_CASES.has(useCase)) return res.status(400).json({ ok: false, error: "Please choose a use case." });
  if (!consent) return res.status(400).json({ ok: false, error: "Please confirm the evaluation terms." });

  const lead = {
    type: "sample_request",
    product: productSummary.product,
    dataset_version: productSummary.dataset_version,
    email,
    name,
    company,
    use_case: useCase,
    free_mail_domain: FREE_MAIL.test(email),
    requested_at: new Date().toISOString(),
    country: clean(req.headers["cf-ipcountry"], 4),
  };

  // Cloudflare Workers Logs keep the lead even without storage bindings.
  console.log(JSON.stringify({ event: "lead", ...lead }));
  try {
    const kv = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
    if (kv) await kv.put(`lead:${lead.requested_at}:${email}`, JSON.stringify(lead));
  } catch (error) {
    console.error(JSON.stringify({ event: "lead_store_failed", message: String(error) }));
  }

  return res.status(200).json({ ok: true, sampleUrl: productSummary.sample_file, records: productSummary.sample_record_count });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
