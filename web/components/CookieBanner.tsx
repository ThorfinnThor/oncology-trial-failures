import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Consent = "all" | "necessary" | "none";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookieClientSide(name: string, value: string, days: number) {
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
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState<boolean>(false);
  const acceptRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const existing = getCookie("cookie_consent");
    setOpen(existing == null);
  }, []);

  // Lock scroll while the dialog is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => acceptRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const modal = (
    <div className="fixed inset-0 z-[999999]">
      {/* overlay (NOT dismissible) */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Centered modal */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-consent-title"
          className="w-full max-w-2xl rounded-2xl border bg-white shadow-2xl"
        >
          <div className="p-6 sm:p-8">
            <h2 id="cookie-consent-title" className="text-2xl font-semibold text-gray-900">
              Cookies & privacy
            </h2>

            <p className="mt-4 text-sm leading-6 text-gray-700">
              We use cookies for essential site functionality. With your permission, we also use{" "}
              Google Analytics cookies to understand how the site is used and improve it.
            </p>

            <p className="mt-3 text-xs text-gray-500">Your choice is stored for 180 days.</p>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
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

            <div className="mt-5 text-xs text-gray-500">
              Optional: link your{" "}
              <a className="underline hover:text-gray-700" href="/privacy">
                Privacy Policy
              </a>
              .
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render into <body> so it’s centered regardless of layout wrappers/transforms
  return createPortal(modal, document.body);
}
