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

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
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
