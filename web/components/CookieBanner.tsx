import { useEffect, useState } from "react";
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
    // Fallback if API route fails
    setCookieClientSide("cookie_consent", consent, 180);
  }
}

function notifyConsentUpdated() {
  window.dispatchEvent(new Event("cookie_consent_updated"));
}

export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOpen(getCookie("cookie_consent") == null);
  }, []);

  // Lock scrolling while consent is required
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  const modal = (
    <div className="cookie-consent-wrap" role="dialog" aria-modal="true" aria-label="Cookies and privacy">
      <div className="cookie-consent-overlay" aria-hidden="true" />
      <div className="cookie-consent-modal">
        <div className="cookie-consent-body">
          <h2 className="cookie-consent-title">Cookies &amp; privacy</h2>

          <div className="cookie-consent-text">
            We use cookies for essential site functionality. With your permission, we also use Google
            Analytics cookies to understand how the site is used and improve it.
          </div>

          <div className="cookie-consent-note">Your choice is stored for 180 days.</div>

          <div className="cookie-consent-actions">
            <button
              type="button"
              className="btn"
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
              className="btn"
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
              className="btn-primary"
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

        <div className="cookie-consent-links">
          Optional: link your <a href="/privacy">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );

  // Render into <body> so it can’t be constrained by page layout
  return createPortal(modal, document.body);
}
