import { useEffect, useState } from "react";

type Consent = "all" | "necessary" | "none";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookieClientSide(name: string, value: string, days: number) {
  // Fallback if API route fails.
  const maxAge = days * 24 * 60 * 60;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
  ];
  if (window.location.protocol === "https:") parts.push("Secure");
  document.cookie = parts.join("; ");
}

async function persistConsent(consent: Consent) {
  try {
    const res = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent }),
    });
    if (!res.ok) throw new Error("Failed");
  } catch {
    setCookieClientSide("cookie_consent", consent, 180);
  }
}

function notifyConsentUpdated() {
  window.dispatchEvent(new Event("cookie_consent_updated"));
}

export function CookieBanner() {
  // null avoids hydration flicker
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const existing = getCookie("cookie_consent");
    setOpen(existing == null);
  }, []);

  if (open !== true) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-800">
          We use cookies for essential functionality. With your permission, we also use Google
          Analytics cookies to understand how the site is used.
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            onClick={async () => {
              await persistConsent("none");
              notifyConsentUpdated();
              setOpen(false);
            }}
          >
            Reject
          </button>

          <button
            type="button"
            className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
            onClick={async () => {
              await persistConsent("necessary");
              notifyConsentUpdated();
              setOpen(false);
            }}
          >
            Essential only
          </button>

          <button
            type="button"
            className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            onClick={async () => {
              await persistConsent("all");
              notifyConsentUpdated();
              setOpen(false);
            }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
