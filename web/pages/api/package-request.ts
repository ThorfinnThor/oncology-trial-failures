// web/pages/api/package-request.ts
//
// Requests that need a person: today that is the full-access waiting list on /pricing, and a
// cohort that is not a mechanism class. The evidence package itself is bought and delivered
// without anyone in the loop — see api/order.ts — so nothing here takes payment.
//
// Two things this route must get right, because both have been got wrong before. The record is
// typed by what was actually asked for, so a waiting-list entry is not filed as a package order.
// And somebody is told: a list that only a KV key knows about is a mailto that never rings.

import type { NextApiRequest, NextApiResponse } from "next";

import { canSendMail, frame, mailEnv, sendMail } from "@/lib/server/mail";

type KvBinding = { put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> };
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const FREE_MAIL = /@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|gmx|web|proton|protonmail|mail)\./i;
const INTENTS = new Set(["full_access_waitlist", "custom_cohort_request"]);

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
  // Whitelisted rather than stored as sent: a type is what somebody later filters the list by.
  const intent = INTENTS.has(clean(body.intent, 40)) ? clean(body.intent, 40) : "custom_cohort_request";

  if (!EMAIL.test(email)) return res.status(400).json({ ok: false, error: "Please enter a valid work email." });
  if (!company) return res.status(400).json({ ok: false, error: "Please enter your company or institution." });
  if (!cohort) {
    return res.status(400).json({ ok: false, error: "Please say which mechanism, target or asset the package should cover." });
  }

  const lead = {
    type: intent,
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

  // Told, not stored and forgotten. Best effort by design: the person has already been answered
  // by the time this runs, and a mail provider having a bad minute must not turn their request
  // into an error. It is skipped entirely until the sending key is set on the Worker.
  await notify(lead).catch((error) => {
    console.error(JSON.stringify({ event: "lead_notify_failed", message: String(error) }));
  });

  return res.status(200).json({
    ok: true,
    message: intent === "full_access_waitlist"
      ? "You are on the list. We will write once there is a price, and not otherwise."
      : "Thank you — we will read this and reply by email.",
  });
}

/** A short mail to whoever runs this, when a sending key is configured. */
async function notify(lead: Record<string, unknown>): Promise<void> {
  if (!canSendMail()) return;
  const lines = Object.entries(lead)
    .filter(([, value]) => value !== "" && value !== undefined && value !== null)
    .map(([field, value]) => `<tr><td style="padding:3px 10px 3px 0;color:#666">${field}</td><td>${String(value)}</td></tr>`)
    .join("");
  await sendMail(
    mailEnv().LEAD_NOTIFY_TO || "contact@clinicaltrialfailures.com",
    `${lead.type === "full_access_waitlist" ? "Waiting list" : "Request"}: ${lead.company || lead.email}`,
    frame(`<table style="font-size:14px">${lines}</table>`),
  );
}



function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
