// web/pages/compare.tsx

import Head from "next/head";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/router";

import { decodeState } from "@/lib/urlState";
import { UrlState } from "@/lib/types";

export default function ComparePage() {
  const router = useRouter();

  // decodeState expects an asPath (e.g. "/compare?compare=A,B")
  const state: UrlState = useMemo(() => decodeState(router.asPath), [router.asPath]);
  const ids: string[] = (state.compare ?? []).slice(0, 5);

  return (
    <>
      <Head>
        <title>Compare • Clinical trial failures</title>
      </Head>

      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">Clinical trial failures</Link>
              <nav className="nav" aria-label="Primary">
                <Link className="navlink" href="/explore">Explore</Link>
                <Link className="navlink" href="/overview">Overview</Link>
                <Link className="navlink" href="/sponsor-insights">Sponsor insights</Link>
                <Link className="navlink" href="/outliers">Outliers</Link>
                <Link className="navlink" href="/top-entities">Top entities</Link>
                <Link className="navlink" href="/methods">Methods</Link>
              </nav>
            </div>

            <div className="topbar-right">
              <Link className="btn" href={`/explore${router.asPath.includes("?") ? router.asPath.slice(router.asPath.indexOf("?")) : ""}`}>Back</Link>
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
            {ids.length < 2 ? (
              <div className="text-[var(--text-muted)]">Select at least 2 trials in Explore.</div>
            ) : (
              <div className="space-y-2">
                <div className="font-semibold">Selected:</div>
                <div className="flex flex-wrap gap-2">
                  {ids.map((id: string) => (
                    <span
                      key={id}
                      className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold"
                    >
                      {id}
                    </span>
                  ))}
                </div>
                <div className="text-[var(--text-muted)]">
                  This page is intentionally lightweight. Use “Open full page” from Explore for complete details.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
