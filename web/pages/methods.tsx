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
              <Link className="navlink" href="/overview">
                Overview
              </Link>
              <Link className="navlink" href="/sponsor-insights">
                Sponsor insights
              </Link>
              <Link className="navlink" href="/outliers">
                Outliers
              </Link>
              <Link className="navlink" href="/top-entities">
                Top entities
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

            <h2 id="outliers-calculations" className="h2">
              Outliers calculations
            </h2>
            <p className="muted">
              The <Link className="link" href="/outliers">
                Outliers
              </Link>{" "}
              page highlights sponsors or disease areas that appear unusually often in a particular stop-reason bucket (for example: Safety in Phase II).
              All metrics are computed within a chosen <b>cohort</b> (scope × phase × bucket) and then compared to that cohort’s baseline rate.
            </p>

            <h3 className="h3">Cohorts and counts</h3>
            <p className="muted">
              For a selected cohort, each group (sponsor or disease area) has:
            </p>
            <ul className="muted list">
              <li>
                <code>n</code>: total stopped trials in the cohort for that group
              </li>
              <li>
                <code>k</code>: trials in the selected bucket (hits) for that group
              </li>
              <li>
                Raw rate: <code>k/n</code>
              </li>
            </ul>

            <h3 className="h3">Baseline</h3>
            <p className="muted">
              The baseline rate is computed over the same cohort across <i>all</i> groups:
            </p>
            <p className="muted">
              <code>p0 = K/N</code>, where <code>N</code> is the cohort total trials and <code>K</code> is the cohort total bucket hits.
            </p>

            <h3 className="h3">Shrunk rate and 90% CI</h3>
            <p className="muted">
              To avoid over-emphasizing small-sample groups, we use a simple Beta–Binomial shrinkage model. Each group’s bucket rate is treated as a
              probability <code>p</code> with a Beta prior <code>Beta(a, b)</code> (read from <code>specialness_index.json</code>; defaults to
              <code>a=b=1</code>). After observing <code>k</code> hits out of <code>n</code> trials:
            </p>
            <p className="muted">
              Posterior: <code>p | data ~ Beta(a + k, b + (n - k))</code>
            </p>
            <p className="muted">
              “Shrunk rate” shown in the table is the posterior mean:
            </p>
            <p className="muted">
              <code>posterior_mean = (a + k) / (a + b + n)</code>
            </p>
            <p className="muted">
              The displayed 90% CI is an approximation using the posterior standard deviation and a normal approximation:
            </p>
            <p className="muted">
              <code>sd = sqrt( (αβ) / ((α+β)^2 (α+β+1)) )</code> with <code>α=a+k</code>, <code>β=b+(n-k)</code>, and a two-sided 90% z-value
              <code>z≈1.645</code>. Then:
            </p>
            <p className="muted">
              <code>CI90 ≈ [mean - z·sd, mean + z·sd]</code> clipped to <code>[0, 1]</code>.
            </p>

            <h3 className="h3">P(&gt;baseline)</h3>
            <p className="muted">
              We report an approximate probability that a group’s true rate exceeds the cohort baseline. Using the same normal approximation:
            </p>
            <p className="muted">
              <code>z = (posterior_mean - p0) / sd</code> and <code>P(&gt;baseline) ≈ Φ(z)</code>, where <code>Φ</code> is the standard normal CDF.
            </p>
            <p className="muted">
              Interpretation: values near 50% indicate “not distinguishable from baseline”; values near 100% indicate the group is very likely above the
              cohort baseline after shrinkage.
            </p>

            <h3 className="h3">Lift</h3>
            <p className="muted">
              Lift is a ratio of the shrunk rate to the baseline:
            </p>
            <p className="muted">
              <code>lift = posterior_mean / p0</code> (shown as “×”). If <code>p0</code> is zero (rare), lift is omitted.
            </p>

            <h3 className="h3">Filters</h3>
            <p className="muted">
              “Min trials” and “Min bucket hits” suppress noisy rows by requiring <code>n ≥ minTrials</code> and <code>k ≥ minHits</code> before a group
              is eligible for ranking.
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
        .h3 {
          margin: 14px 0 6px;
          font-size: 13px;
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
