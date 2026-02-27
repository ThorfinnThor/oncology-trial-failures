import type { NextApiRequest, NextApiResponse } from "next";

type Consent = "all" | "necessary" | "none";

function buildConsentCookie(value: Consent) {
  const maxAgeSeconds = 60 * 60 * 24 * 180; // 180 days
  const parts = [
    `cookie_consent=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "SameSite=Lax",
  ];

  // Secure only in production (HTTPS). Keeps localhost working.
  if (process.env.NODE_ENV === "production") parts.push("Secure");

  return parts.join("; ");
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  const consent = (req.body?.consent as Consent) ?? "none";
  if (!["all", "necessary", "none"].includes(consent)) {
    return res.status(400).json({ ok: false, error: "Invalid consent value" });
  }

  res.setHeader("Set-Cookie", buildConsentCookie(consent));
  return res.status(200).json({ ok: true });
}
