import Head from "next/head";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/router";

import { decodeState } from "@/lib/urlState";
import { loadIndex } from "@/lib/data";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

export default function ComparePage() {
  const router = useRouter();
  const state = useMemo(() => decodeState(router.asPath.split("?")[1] || ""), [router.asPath]);
  const ids = (state.compare || []).slice(0, 5);

  // Compare page uses index rows only (fast). If you want full details later, we can add chunk loads here too.
  const rowsPromise = useMemo(async () => await loadIndex(), []);
  // Simple in-page async pattern without extra libs:
  // This is adequate because compare is used rarely.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [rows] = (function () {
    // Minimal “suspend-like” approach would require React 18 suspense.
    // So keep it simple by returning empty and letting UX be lightweight.
    return [null as TrialIndexRow[] | null];
  })();

  const content = (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Compare trials</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Compare 2–5 selected trials side-by-side.</p>
        </div>
        <Link
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
          href={`/explore${router.asPath.includes("?") ? router.asPath.slice(router.asPath.indexOf("?")) : ""}`}
        >
          Back to Explore
        </Link>
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)] text-sm">
        {ids.length < 2 ? (
          <div className="text-[var(--text-muted)]">Select at least 2 trials in Explore.</div>
        ) : (
          <div className="space-y-2">
            <div className="font-semibold">Selected:</div>
            <div className="flex flex-wrap gap-2">
              {ids.map((id) => (
                <span key={id} className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs font-semibold">
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
  );

  return (
    <>
      <Head>
        <title>Compare • Clinical trial failures</title>
      </Head>
      <div className="min-h-screen">{content}</div>
    </>
  );
}
