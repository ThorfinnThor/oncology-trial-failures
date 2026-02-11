import { useEffect, useMemo, useRef, useState } from "react";

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
  // null = not checked yet (prevents hydration weirdness)
  const [open, setOpen] = useState<boolean | null>(null);

  const acceptRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const existing = getCookie("cookie_consent");
    setOpen(existing == null);
  }, []);

  // Lock scroll while the dialog is open, so it feels like a real consent gate.
  useEffect(() => {
    if (open !== true) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the primary action for accessibility
    const t = window.setTimeout(() => acceptRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const description = useMemo(
    () => ({
      title: "Cookies & privacy",
      body: "We use cookies for essential site functionality. With your permission, we also use Google Analytics cookies to understand how the site is used and improve it. You can choose to accept all cookies, reject non-essential cookies, or allow essential cookies only.",
      note: "Your choice is stored for 180 days.",
    }),
    []
  );

  // Only remove after a click on one of the options.
  if (open !== true) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay (NOT clickable to dismiss) */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Dialog container */}
      <div className="relative flex h-full w-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-consent-title"
          className="w-full max-w-xl rounded-2xl border bg-white shadow-2xl"
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="cookie-consent-title" className="text-xl font-semibold text-gray-900">
                  {description.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-700">{description.body}</p>
                <p className="mt-3 text-xs text-gray-500">{description.note}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
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
                className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                onClick={async () => {
                  await persistConsent("necessary");
                  notifyConsentUpdated();
                  setOpen(false);
                }}
              >
                Essential only
              </button>

              <button
                ref={acceptRef}
                type="button"
                className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                onClick={async () => {
                  await persistConsent("all");
                  notifyConsentUpdated();
                  setOpen(false);
                }}
              >
                Accept all
              </button>
            </div>

            {/* Optional link area (safe to keep even if you don't have /privacy yet) */}
            <div className="mt-4 text-xs text-gray-500">
              If you’d like, add a privacy page and link it here (e.g.,{" "}
              <a className="underline hover:text-gray-700" href="/privacy">
                Privacy Policy
              </a>
              ).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
