import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="google-site-verification"
          content="gyQuOWSA5PAUhcrIwJ1YcQhy44f3d4gkYn7-vPIs4UI"
        />
      </Head>

      <body className="antialiased">
        <Main />
        <NextScript />
        {/* Define dataLayer + Consent Mode v2 default DENIED (no external script yet) */}
        <Script id="ga-consent-default" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;

            gtag('consent','default',{
              ad_storage:'denied',
              analytics_storage:'denied',
              ad_user_data:'denied',
              ad_personalization:'denied',
              wait_for_update: 500
            });
          `}
        </Script>
      </body>
    </Html>
  );
}
