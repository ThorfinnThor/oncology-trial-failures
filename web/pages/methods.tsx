// web/pages/methods.tsx

import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";

import { loadMeta } from "@/lib/data";
import { DatasetMeta } from "@/lib/types";
import PrimaryNav from "@/components/PrimaryNav";

const TITLE = "Methods and data sources — Clinical trial failures";
const DESCRIPTION =
  "Review the Clinical Trial Failures methodology, source data, reason buckets, limitations, and verification guidance for stopped clinical trial records.";
const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/methods`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

type HeldoutValidation = {
  sample_size?: number;
  eligible_records?: number;
  classifier_version?: string;
  generated_at_utc?: string;
  biological_precision?: number;
  biological_precision_ci95?: [number, number];
  biological_recall?: number;
  biological_recall_ci95?: [number, number];
  assertion_no_material_disagreement?: number;
  assertion_no_material_disagreement_ci95?: [number, number];
  assertion_outcome_and_primary_precision?: number;
  assertion_outcome_and_primary_precision_ci95?: [number, number];
};

function pct(value?: number): string {
  return typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "—";
}

function ci(range?: [number, number]): string {
  return range ? `95% CI ${pct(range[0])}–${pct(range[1])}` : "";
}

export default function MethodsPage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [heldout, setHeldout] = useState<HeldoutValidation | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/dataset_meta.json")
      .then((res) => (res.ok ? res.json() : null))
      .then((raw) => {
        if (alive && raw?.classification_v2?.heldout_validation) setHeldout(raw.classification_v2.heldout_validation);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

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
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
            <PrimaryNav active="methods" />
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
              The site uses registry fields such as status, phase, sponsor, condition, intervention, dates, and
              the reported stop-reason text when available.
            </p>
            <div className="trustPanel">
              <div>
                <div className="trustTitle">Primary record</div>
                <p className="muted">
                  Use each trial&apos;s NCT identifier to verify details directly in ClinicalTrials.gov before making
                  medical, scientific, or commercial decisions.
                </p>
              </div>
              <div>
                <div className="trustTitle">Analytical label</div>
                <p className="muted">
                  Failure buckets are screening labels derived from structured fields and text. They should be
                  treated as research signals, not definitive clinical conclusions.
                </p>
              </div>
              <div>
                <div className="trustTitle">Version awareness</div>
                <p className="muted">
                  Registry records can change over time. Check the dataset version and generation timestamp
                  shown above when comparing results.
                </p>
              </div>
            </div>

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
              decision only, and other/unknown) using rule-based parsing of the recorded reason text and structured fields where available.
            </p>
            <p className="muted">
              <span className="strong">Decision only</span> means the registry identifies an actor or action, such as
              &ldquo;Sponsor decision&rdquo; or &ldquo;PI request,&rdquo; but does not state why the decision was made. It is not treated as
              biological, operational, regulatory, or business-strategy evidence. Explicit wording such as &ldquo;business decision&rdquo; or
              &ldquo;portfolio reprioritization&rdquo; remains classified separately as business strategy.
            </p>
            <p className="muted">
              <span className="strong">Program stop only</span> means the registry explicitly reports that a development program,
              molecule, or asset was discontinued but supplies no underlying cause. This is kept separate from a bare trial status and
              is likewise not interpreted as evidence of biological failure or a non-biological cause.
            </p>

            <h2 id="validation" className="h2">
              Validation
            </h2>
            <p className="muted">
              Classification quality is measured on a held-out sample of {heldout?.sample_size ?? 600} unique stop-reason texts that were never
              used to write, audit, or adjudicate the rules. The sample is stratified by predicted outcome and weighted back to the{" "}
              {heldout?.eligible_records ? heldout.eligible_records.toLocaleString("en-US") : "eligible"} rule-classified records it represents.
              Reference labels were produced blind to the classifier by two independent LLM annotators from different model families, with
              disagreements resolved by a third LLM adjudicator following written guidelines.
            </p>
            <div className="trustPanel">
              <div>
                <div className="trustTitle">Biological failure precision</div>
                <p className="muted">
                  <span className="strong">{pct(heldout?.biological_precision)}</span> {ci(heldout?.biological_precision_ci95)}
                </p>
              </div>
              <div>
                <div className="trustTitle">Biological failure recall</div>
                <p className="muted">
                  <span className="strong">{pct(heldout?.biological_recall)}</span> {ci(heldout?.biological_recall_ci95)}
                </p>
              </div>
              <div>
                <div className="trustTitle">Asserted labels without material disagreement</div>
                <p className="muted">
                  <span className="strong">{pct(heldout?.assertion_no_material_disagreement)}</span>{" "}
                  {ci(heldout?.assertion_no_material_disagreement_ci95)}. Exact outcome and primary cause:{" "}
                  {pct(heldout?.assertion_outcome_and_primary_precision)}.
                </p>
              </div>
            </div>
            <p className="muted">
              Limitations: reference labels are LLM-adjudicated rather than expert-curated, the registry text is the only evidence, and records
              resolved from previously reviewed exact wording or without any stop-reason text are outside this estimate. Most remaining
              disagreements concern mixed causes and whether an administrative stop counts as a transition or an operational cause.
            </p>

            <h2 id="outliers-calculations" className="h2">
              Outliers calculations
            </h2>
            <p className="muted">
              The{" "}
              <Link className="link" href="/outliers">
                Outliers
              </Link>{" "}
              page highlights sponsors or disease areas that appear unusually often in a particular stop-reason bucket (for example: Safety in Phase II).
              All metrics are computed within a chosen <span className="strong">cohort</span> (scope × phase × bucket) and then compared to that cohort’s
              baseline rate.
            </p>

            <h3 className="h3">Cohorts and counts</h3>
            <p className="muted">For a selected cohort, each group (sponsor or disease area) has:</p>
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
              probability <code>p</code> with a Beta prior <code>Beta(a, b)</code> (read from <code>specialness_index.json</code>; defaults to{" "}
              <code>a=b=1</code>). After observing <code>k</code> hits out of <code>n</code> trials:
            </p>
            <p className="muted">
              Posterior: <code className="eq">p | data ~ Beta(a + k, b + (n - k))</code>
            </p>
            <p className="muted">“Shrunk rate” shown in the table is the posterior mean:</p>
            <p className="muted">
              <code>posterior_mean = (a + k) / (a + b + n)</code>
            </p>
            <p className="muted">
              The displayed 90% CI is an approximation using the posterior standard deviation and a normal approximation:
            </p>
            <p className="muted">
              <code className="eq">sd = sqrt( (αβ) / ((α+β)^2 (α+β+1)) )</code> with <code>α=a+k</code>, <code>β=b+(n-k)</code>, and a two-sided 90%
              z-value <code>z≈1.645</code>. Then:
            </p>
            <p className="muted">
              <code className="eq">CI90 ≈ [mean - z·sd, mean + z·sd]</code> clipped to <code>[0, 1]</code>.
            </p>

            <h3 className="h3">P(&gt;baseline)</h3>
            <p className="muted">
              We report an approximate probability that a group’s true rate exceeds the cohort baseline. Using the same normal approximation:
            </p>
            <p className="muted">
              <code className="eq">z = (posterior_mean - p0) / sd</code> and <code>P(&gt;baseline) ≈ Φ(z)</code>, where <code>Φ</code> is the standard
              normal CDF.
            </p>
            <p className="muted">
              Interpretation: values near 50% indicate “not distinguishable from baseline”; values near 100% indicate the group is very likely above the
              cohort baseline after shrinkage.
            </p>

            <h3 className="h3">Lift</h3>
            <p className="muted">Lift is a ratio of the shrunk rate to the baseline:</p>
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
              <li>The site is for research support only and is not medical advice.</li>
            </ul>
            <p className="muted" style={{ marginTop: 10 }}>
              Read the <Link className="link" href="/disclaimer">Disclaimer and limitations</Link> for
              verification responsibilities, information-quality limitations, and the legally applicable
              limitation of liability.
            </p>

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
        .trustPanel {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }
        .trustPanel > div {
          min-width: 0;
          padding: 14px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #f8fafc;
        }
        .trustTitle {
          margin-bottom: 6px;
          color: #0f172a;
          font-size: 13px;
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

        /* Keep typography consistent with the rest of the app */
        p.muted {
          font-size: 14px;
          line-height: 1.55;
        }
        ul.muted {
          font-size: 14px;
          line-height: 1.55;
        }

        /* Inline symbols / formulas should not switch to a different font */
        .body :global(code) {
          font-family: inherit;
          font-size: 0.95em;
          font-weight: 750;
          padding: 1px 6px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--surface-2);
          color: rgba(15, 23, 42, 0.92);
          white-space: nowrap;
        }

        /* Allow long equations to wrap instead of overflowing on narrow screens */
        .body :global(code.eq) {
          white-space: normal;
          display: inline-block;
        }
        @media (max-width: 760px) {
          .trustPanel {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
