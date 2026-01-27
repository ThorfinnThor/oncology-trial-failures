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

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/explore" className="brand">
              Clinical trial failures
            </Link>
            <nav className="nav" aria-label="Primary">
              <Link className="navlink" href="/explore">
                Explore
              </Link>
              <Link className="navlink" href="/pharma-intelligence">
                Pharma intelligence
              </Link>
              <Link className="navlink" href="/methods" aria-current="page" style={{ color: "var(--text)" }}>
                Methods
              </Link>
            </nav>
          </div>
          <div className="topbar-center" />
          <div className="topbar-right" />
        </div>
      </header>

      <main className="page">
        <div className="card" style={{ padding: 18 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 850, letterSpacing: "-0.01em" }}>Data &amp; Methods</h1>
          <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)" }}>
            This site summarizes stopped clinical trials and the recorded stop reasons in the registry.
          </p>

          <div style={{ marginTop: 12 }}>
            {meta ? (
              <div className="chip" style={{ display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
                <span>
                  Dataset version: <span style={{ fontWeight: 800 }}>{meta.version}</span>
                </span>
                {meta.generated_at_utc ? (
                  <span>
                    • Generated: <span style={{ fontWeight: 800 }}>{meta.generated_at_utc}</span>
                  </span>
                ) : null}
                {meta.source ? (
                  <span>
                    • Source: <span style={{ fontWeight: 800 }}>{meta.source}</span>
                  </span>
                ) : null}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading dataset info…</div>
            )}
          </div>

          <h2 style={{ marginTop: 22, marginBottom: 0, fontSize: 16, fontWeight: 850 }}>Data sources</h2>
          <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)" }}>
            Primary source is ClinicalTrials.gov registry metadata as recorded by sponsors and investigators.
          </p>

          <h2 id="scientific-failure" style={{ marginTop: 22, marginBottom: 0, fontSize: 16, fontWeight: 850 }}>
            Likely scientific failure
          </h2>
          <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)" }}>
            A trial is flagged when the stated stop reason suggests the intervention did not work as intended (e.g., lack of efficacy or futility). This is
            inferred from registry text and may be incomplete. Verify using primary sources.
          </p>

          <h2 style={{ marginTop: 22, marginBottom: 0, fontSize: 16, fontWeight: 850 }}>Reason buckets</h2>
          <p style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, color: "var(--text-muted)" }}>
            Stop reasons are grouped into high-level buckets (e.g., efficacy/futility, safety, operational, enrollment, funding, regulatory, other/unknown)
            using rule-based parsing of the recorded reason text and structured fields where available.
          </p>

          <h2 style={{ marginTop: 22, marginBottom: 0, fontSize: 16, fontWeight: 850 }}>Limitations</h2>
          <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: "var(--text-muted)" }}>
            <li>Registry stop reasons can be incomplete or inconsistently reported.</li>
            <li>Some trials stop for non-scientific reasons (enrollment, funding, strategic decisions).</li>
            <li>Labels are probabilistic and should be verified against primary sources.</li>
          </ul>

          <div style={{ marginTop: 18 }}>
            <Link href="/explore" className="btn">
              Back to Explore
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
