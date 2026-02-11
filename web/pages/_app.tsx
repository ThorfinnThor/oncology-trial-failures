import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";

import { CookieBanner } from "@/components/CookieBanner";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

const DEFAULT_TITLE = "Clinical trial failures";
const DEFAULT_DESCRIPTION =
  "Explore and analyze clinical trials that stopped early, including reasons for stoppage, phases, conditions, sponsors, and more.";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="description" content={DEFAULT_DESCRIPTION} />
        <meta property="og:site_name" content={DEFAULT_TITLE} />
        <meta property="og:type" content="website" />
        <meta property="og:description" content={DEFAULT_DESCRIPTION} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
      </Head>

      <GoogleAnalytics />
      <Component {...pageProps} />
      <CookieBanner />
    </>
  );
}
