// web/pages/methods.tsx

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
              <Link className="navlink" href="/methods" aria-current="page">
                Methods
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <div className="card body">
            <h1 className="h1">Data &amp; methods</h1>
            <p className="muted lead">
              This site summarizes stopped clinical trials and the recorded stop reasons in the registry.
            </p>

            <div style={{ marginTop: 14 }}>
              {meta ? (
                <div className="chip">
                  Dataset version: <span className="strong">{meta.version}</span>
                  {meta.generated_at_utc ? (
                    <span className="muted" style={{ marginLeft: 10 }}>
                      • Generated: <span className="strong">{meta.generated_at_utc}</span>
                    </span>
                  ) : null}
                  {meta.source ? (
                    <span className="muted" style={{ marginLeft: 10 }}>
                      • Source: <span className="strong">{meta.source}</span>
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="muted">Loading dataset info…</div>
              )}
            </div>

            <h2 className="h2">Data sources</h2>
            <p className="muted">
              Primary source is ClinicalTrials.gov registry metadata as recorded by sponsors and investigators.
            </p>

            <h2 id="scientific-failure" className="h2">
              Likely scientific failure
            </h2>
            <p className="muted">
              A trial is flagged when the stated stop reason suggests the intervention did not work as intended (e.g., lack of efficacy or futility).
              This is inferred from registry text and may be incomplete. Verify using primary sources.
            </p>

            <h2 className="h2">Reason buckets</h2>
            <p className="muted">
              Stop reasons are grouped into high-level buckets (e.g., efficacy/futility, safety, operational, enrollment, funding, regulatory,
              other/unknown) using rule-based parsing of the recorded reason text and structured fields where available.
            </p>

            <h2 className="h2">Limitations</h2>
            <ul className="muted list">
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
        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1100px;
          margin: 0 auto;
        }
        .body {
          padding: 22px;
        }
        .h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.01em;
        }
        .lead {
          margin-top: 8px;
          font-size: 14px;
          line-height: 1.45;
        }
        .h2 {
          margin: 18px 0 6px;
          font-size: 15px;
          font-weight: 850;
        }
        .strong {
          font-weight: 850;
          color: var(--text);
        }
        .list {
          margin: 6px 0 0;
          padding-left: 18px;
        }
        .list li {
          margin: 6px 0;
        }
      `}</style>
    </>
  );
}
