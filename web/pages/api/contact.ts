import type { NextApiRequest, NextApiResponse } from "next";

import { canSendMail, frame, sendMail } from "@/lib/server/mail";
import { CONTACT_EMAIL } from "@/lib/siteContact";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;

export const CONTACT_TOPICS = {
  correction: "Data correction",
  methodology: "Methodology or source question",
  privacy: "Privacy request",
  licensing: "Licensing or custom research",
  website: "Website issue",
  other: "Other",
} as const;

type ContactTopic = keyof typeof CONTACT_TOPICS;

function cleanLine(value: unknown, max: number): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function cleanMessage(value: unknown, max: number): string {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim().slice(0, max);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] as string);
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  if (cleanLine(body.website, 200)) {
    // Honeypot: look successful so automated submissions do not learn how to retry.
    return res.status(200).json({ ok: true, message: "Thank you. Your message has been sent." });
  }

  const name = cleanLine(body.name, 120);
  const email = cleanLine(body.email, 254).toLowerCase();
  const topic = cleanLine(body.topic, 40) as ContactTopic;
  const message = cleanMessage(body.message, 5000);
  const pageUrl = cleanLine(body.pageUrl, 500);

  if (!EMAIL.test(email)) {
    return res.status(400).json({ ok: false, error: "Please enter a valid email address." });
  }
  if (!Object.prototype.hasOwnProperty.call(CONTACT_TOPICS, topic)) {
    return res.status(400).json({ ok: false, error: "Please choose what your message is about." });
  }
  if (message.length < 10) {
    return res.status(400).json({ ok: false, error: "Please add a little more detail to your message." });
  }
  if (!canSendMail()) {
    console.error(JSON.stringify({ event: "contact_mail_unavailable", hint: "BREVO_API_KEY is not set on the Worker" }));
    return res.status(503).json({
      ok: false,
      error: `The form is temporarily unavailable. Please email ${CONTACT_EMAIL} directly.`,
    });
  }

  const topicLabel = CONTACT_TOPICS[topic];
  const senderLabel = name || email;
  const rows = [
    ["Topic", topicLabel],
    ["Name", name || "Not provided"],
    ["Email", email],
    ["Page URL", pageUrl || "Not provided"],
  ];
  const htmlRows = rows
    .map(([label, value]) => `<tr><td style="padding:4px 14px 4px 0;color:#64748b;vertical-align:top">${escapeHtml(label)}</td><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`)
    .join("");
  const html = frame(
    `<table style="font-size:14px;border-collapse:collapse">${htmlRows}</table>`
      + `<div style="margin-top:18px;padding-top:16px;border-top:1px solid #e5e7eb;white-space:pre-wrap">${escapeHtml(message)}</div>`,
  );
  const text = [
    `Topic: ${topicLabel}`,
    `Name: ${name || "Not provided"}`,
    `Email: ${email}`,
    `Page URL: ${pageUrl || "Not provided"}`,
    "",
    message,
  ].join("\n");

  const sent = await sendMail(
    CONTACT_EMAIL,
    `[Website contact] ${topicLabel}: ${senderLabel}`,
    html,
    text,
    { replyTo: { email, ...(name ? { name } : {}) } },
  ).catch((error) => {
    console.error(JSON.stringify({ event: "contact_mail_failed", message: String(error) }));
    return false;
  });

  if (!sent) {
    return res.status(502).json({
      ok: false,
      error: `We could not send your message. Please email ${CONTACT_EMAIL} directly.`,
    });
  }

  console.log(JSON.stringify({ event: "contact_mail_sent", topic }));
  return res.status(200).json({ ok: true, message: "Thank you. Your message has been sent." });
}
