// web/pages/api/package-request.ts
//
// The evidence package is the one thing on this site somebody pays for, and until now the
// only way to ask for it was a mailto link. This takes the request properly: what cohort,
// which asset it is being evaluated against, and where to send it.
//
// It does not take payment. A first customer is agreed in a conversation, not in a checkout,
// and pretending otherwise would put a card form in front of a product nobody has bought yet.

import type { NextApiRequest, NextApiResponse } from "next";

type KvBinding = { put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> };
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|gmx|web|proton|protonmail|mail)\./i;

function clean(value: unknown, max = 300): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (clean(body.website)) {
    return res.status(200).json({ ok: true }); // honeypot
  }

  const email = clean(body.email, 254).toLowerCase();
  const company = clean(body.company, 160);
  const cohort = clean(body.cohort, 300);
  const asset = clean(body.asset, 200);
  const context = clean(body.context, 1200);
  const marketing = body.marketing === true || body.marketing === "true" || body.marketing === "on";

  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });
  if (!company) return res.status(400).json({ ok: false, error: "Please enter your company or institution." });
  if (!cohort) {
    return res.status(400).json({ ok: false, error: "Please say which mechanism, target or asset the package should cover." });
  }

  const lead = {
    type: "evidence_package_request",
    email,
    company,
    cohort,
    asset,
    context,
    marketing_consent: marketing,
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
      console.warn(JSON.stringify({ event: "lead_store_missing", hint: "KV binding LEADS is not configured" }));
    }
  } catch (error) {
    console.error(JSON.stringify({ event: "lead_store_failed", message: String(error) }));
  }

  return res.status(200).json({
    ok: true,
    message: "Thanks — we'll come back within one working day with the cohort as we'd define it, "
      + "what the package will contain, and what it cannot answer.",
  });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
