import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

type Consent = "all" | "necessary" | "none";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: any[]) => void;
  }
}

const GA_ID = "G-N12WY9483E";

function readConsent(): Consent | null {
  const match = document.cookie.match(new RegExp(`(^| )cookie_consent=([^;]+)`));
  const value = match ? decodeURIComponent(match[2]) : null;
  if (value === "all" || value === "necessary" || value === "none") return value;
  return null;
}

export function GoogleAnalytics() {
  const router = useRouter();
  const [consent, setConsent] = useState<Consent | null>(null);

  // sync consent state
  useEffect(() => {
    const sync = () => setConsent(readConsent());
    sync();
    window.addEventListener("cookie_consent_updated", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("cookie_consent_updated", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  // push consent updates (works even before gtag.js loads because we define a stub)
  useEffect(() => {
    if (consent == null) return;

    window.dataLayer = window.dataLayer || [];
    // eslint-disable-next-line prefer-rest-params -- gtag queues IArguments objects; preserve that format.
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };

    const deniedAll = {
      ad_storage: "denied",
      analytics_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    } as const;

    if (consent === "all") {
      window.gtag("consent", "update", { ...deniedAll, analytics_storage: "granted" });
    } else {
      window.gtag("consent", "update", deniedAll);
    }
  }, [consent]);

  // SPA route tracking only when consent === all
  useEffect(() => {
    if (consent !== "all") return;

    const handleRouteChange = (url: string) => {
      if (typeof window.gtag === "function") {
        window.gtag("config", GA_ID, { page_path: url, anonymize_ip: true });
      }
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [consent, router.events]);

  return (
    <>
      {/* EXTRA STRICT: only load gtag.js after explicit "Accept all" */}
      {consent === "all" && (
        <>
          <Script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                page_path: window.location.pathname,
                anonymize_ip: true,
                allow_google_signals: false,
                allow_ad_personalization_signals: false
              });
            `}
          </Script>
        </>
      )}
    </>
  );
}
