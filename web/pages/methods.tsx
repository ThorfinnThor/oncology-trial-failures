import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { loadMeta } from "@/lib/data";
import { DatasetMeta } from "@/lib/types";

export default function MethodsPage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await loadMeta();
        if (!alive) return;
        setMeta(m);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title>Methods — Clinical trial failures</title>
      </Head>

      <header className="sticky top-0 z-30 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mx-auto max-w-[1100px] px-4 py-3 flex items-center gap-3">
          <Link href="/explore" className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Clinical trial failures
          </Link>
          <nav className="ml-2 flex items-center gap-3 text-sm">
            <Link href="/explore" className="text-[var(--text-muted)] hover:text-[var(--text)]">Explore</Link>
            <Link href="/methods" className="text-[var(--text-muted)] hover:text-[var(--text)]">Methods</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] px-4 py-8">
        <div className="card p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Data & Methods</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            This site summarizes stopped clinical trials and the recorded stop reasons in the registry.
          </p>

          <div className="mt-4 text-sm">
            {meta ? (
              <div className="chip inline-flex">
                Dataset version: <span className="font-semibold">{meta.version}</span>
                {meta.generated_at_utc ? <span className="ml-2">• Generated: <span className="font-semibold">{meta.generated_at_utc}</span></span> : null}
                {meta.source ? <span className="ml-2">• Source: <span className="font-semibold">{meta.source}</span></span> : null}
              </div>
            ) : (
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading dataset info…</div>
            )}
          </div>

          <h2 className="mt-8 text-lg font-semibold">Data sources</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Primary source is ClinicalTrials.gov registry metadata as recorded by sponsors and investigators.
          </p>

          <h2 id="scientific-failure" className="mt-8 text-lg font-semibold">Likely scientific failure</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            A trial is flagged when the stated stop reason suggests the intervention did not work as intended (e.g., lack of efficacy or futility).
            This is inferred from registry text and may be incomplete. Verify using primary sources.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Reason buckets</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Stop reasons are grouped into high-level buckets (e.g., efficacy/futility, safety, operational, enrollment, funding, regulatory, other/unknown)
            using rule-based parsing of the recorded reason text and structured fields where available.
          </p>

          <h2 className="mt-8 text-lg font-semibold">Limitations</h2>
          <ul className="mt-2 list-disc pl-5 text-sm" style={{ color: "var(--text-muted)" }}>
            <li>Registry stop reasons can be incomplete or inconsistently reported.</li>
            <li>Some trials stop for non-scientific reasons (enrollment, funding, strategic decisions).</li>
            <li>Labels are probabilistic and should be verified against primary sources.</li>
          </ul>

          <div className="mt-8">
            <Link href="/explore" className="btn">
              Back to Explore
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
