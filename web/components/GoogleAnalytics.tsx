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

const GA_ID = "G-N12WY9483E"; // from your snippet

function readConsent(): Consent | null {
  const match = document.cookie.match(new RegExp(`(^| )cookie_consent=([^;]+)`));
  const value = match ? decodeURIComponent(match[2]) : null;
  if (value === "all" || value === "necessary" || value === "none") return value;
  return null;
}

export function GoogleAnalytics() {
  const router = useRouter();
  const [consent, setConsent] = useState<Consent | null>(null);

  // Keep consent state in sync (banner dispatches event after click).
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

  // Track SPA route changes once GA is loaded & allowed.
  useEffect(() => {
    if (consent !== "all") return;

    const handleRouteChange = (url: string) => {
      if (typeof window.gtag === "function") {
        window.gtag("config", GA_ID, { page_path: url });
      }
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [consent, router.events]);

  // Do not load GA at all until consent is granted
  if (consent !== "all") return null;

  return (
    <>
      {/* Your exact external script */}
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />

      {/* Your exact inline snippet + initial page_path */}
      <Script id="ga-gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { page_path: window.location.pathname });
        `}
      </Script>
    </>
  );
}
