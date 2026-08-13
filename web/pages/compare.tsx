// web/pages/compare.tsx

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { decodeState } from "@/lib/urlState";
import { UrlState } from "@/lib/types";
import PrimaryNav from "@/components/PrimaryNav";

const TITLE = "Compare selected clinical trial failures";
const DESCRIPTION =
  "Compare selected stopped clinical trials side by side. This utility page is intended for active app users rather than search indexing.";
const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/compare`;

export default function ComparePage() {
  const router = useRouter();
  const [urlStateReady, setUrlStateReady] = useState(false);

  useEffect(() => {
    if (router.isReady) setUrlStateReady(true);
  }, [router.isReady]);

  // decodeState expects an asPath (e.g. "/compare?compare=A,B")
  const state: UrlState = useMemo(
    () => (urlStateReady ? decodeState(router.asPath) : {}),
    [router.asPath, urlStateReady]
  );
  const ids: string[] = (state.compare ?? []).slice(0, 5);
  const compareQuery = ids.join(",");

  useEffect(() => {
    if (!urlStateReady || !compareQuery || ids.length < 2) return;
    void router.replace(`/explore?compare=${encodeURIComponent(compareQuery)}`);
  }, [compareQuery, ids.length, urlStateReady]);

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href={CANONICAL_URL} />
      </Head>

      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">Clinical trial failures</Link>
              <PrimaryNav />
            </div>

            <div className="topbar-right">
              <Link className="btn" href={ids.length ? `/explore?compare=${encodeURIComponent(ids.join(","))}` : "/explore"}>Back</Link>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Compare trials</h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">Compare 2–5 selected trials side-by-side.</p>
            </div>


          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)] text-sm">
            {!urlStateReady ? (
              <div className="text-[var(--text-muted)]">Preparing comparison…</div>
            ) : ids.length < 2 ? (
              <div className="space-y-3">
                <div className="text-[var(--text-muted)]">Select at least 2 trials in Explore.</div>
                <Link className="btn" href="/explore">Open Explore</Link>
              </div>
            ) : (
              <div className="space-y-2" role="status">
                <div className="font-semibold">Opening the side-by-side comparison…</div>
                <div className="text-[var(--text-muted)]">You will be redirected to the working comparison view in Explore.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
