// web/lib/server/mail.ts
//
// The one place the site sends a mail from. Two routes need it — the confirmation that turns a
// signup into a subscription, and the note that tells us somebody joined the waiting list — and
// a second copy of the same fetch is a second place for the sender address to drift.
//
// Brevo's transactional API, the same account the fortnightly mail goes through. The key is a
// Worker secret: the GitHub secret of the same name belongs to the weekly workflow and is not
// readable from here.

type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: Record<string, string | undefined> } | undefined;
};

const BREVO = "https://api.brevo.com/v3/smtp/email";

export function mailEnv(): Record<string, string | undefined> {
  const cf = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env;
  return { ...(typeof process !== "undefined" ? process.env : {}), ...(cf || {}) };
}

/** Whether a mail can be sent at all. A route that needs one must check before it promises it. */
export function canSendMail(): boolean {
  return Boolean(mailEnv().BREVO_API_KEY);
}

export async function sendMail(to: string, subject: string, html: string, text?: string): Promise<boolean> {
  const env = mailEnv();
  const key = env.BREVO_API_KEY;
  if (!key) return false;
  const response = await fetch(BREVO, {
    method: "POST",
    headers: { "api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      sender: {
        email: env.MAIL_FROM || "contact@clinicaltrialfailures.com",
        name: env.MAIL_FROM_NAME || "Clinical Trial Failures",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      // A plain-text part alongside the HTML. Mail without one scores worse with spam filters,
      // and some readers in regulated companies see nothing else.
      ...(text ? { textContent: text } : {}),
    }),
  });
  if (!response.ok) {
    console.error(JSON.stringify({ event: "mail_rejected", status: response.status }));
    return false;
  }
  return true;
}

/** The plain wrapper every mail from the site uses. No images, no tracking, no styling to load. */
export function frame(body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#14161a;`
    + `max-width:560px;font-size:15px;line-height:1.55">${body}</div>`;
}


const esc = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The layout for mail a reader actually sees. Tables and inline styles because that is what
 * Outlook renders; no images, so nothing is blocked and nothing is fetched on open.
 *
 * The fallback link is printed as text on purpose. Brevo rewrites every <a href> in a
 * transactional mail through its own click-tracking domain and, on this plan, that cannot be
 * turned off. The button still works — the redirect lands on our page — but a recipient who
 * looks at where a confirmation link goes should be able to see our own address, unwrapped.
 */
export function layout(opts: {
  preheader: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; href: string };
  fallbackUrl?: string;
  footnote?: string;
}): string {
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const button = opts.button
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 8px">`
      + `<tr><td style="border-radius:8px;background:#4f46e5">`
      + `<a href="${esc(opts.button.href)}" style="display:inline-block;padding:13px 24px;font-family:${font};`
      + `font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">`
      + `${esc(opts.button.label)}</a></td></tr></table>`
    : "";
  const fallback = opts.fallbackUrl
    ? `<p style="margin:26px 0 6px;font-size:13px;line-height:1.5;color:#6b7280">If the button does not work, `
      + `copy this address into your browser:</p>`
      + `<p style="margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.5;`
      + `color:#374151;word-break:break-all">${esc(opts.fallbackUrl)}</p>`
    : "";
  const footnote = opts.footnote
    ? `<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #e5e7eb;font-size:13px;line-height:1.55;`
      + `color:#6b7280">${esc(opts.footnote)}</p>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">`
    + `<title>${esc(opts.heading)}</title></head>`
    + `<body style="margin:0;padding:0;background:#f4f5f7">`
    + `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>`
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5f7">`
    + `<tr><td align="center" style="padding:32px 16px">`
    + `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px">`
    + `<tr><td style="padding:0 4px 14px;font-family:${font};font-size:13px;font-weight:700;letter-spacing:0.02em;`
    + `color:#111827">Clinical Trial Failures</td></tr>`
    + `<tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:34px 32px;`
    + `font-family:${font};color:#111827">`
    + `<h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;font-weight:700;color:#111827">${esc(opts.heading)}</h1>`
    + opts.paragraphs
      .map((text) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151">${text}</p>`)
      .join("")
    + button + fallback + footnote
    + `</td></tr>`
    + `<tr><td style="padding:16px 4px 0;font-family:${font};font-size:12px;line-height:1.5;color:#9ca3af">`
    // Plain text, not a link: every <a> here goes through the tracker, and a footer is not worth one.
    + `Clinical Trial Failures · clinicaltrialfailures.com</td></tr>`
    + `</table></td></tr></table></body></html>`;
}
