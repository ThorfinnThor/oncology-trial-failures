// web/pages/packages/[slug].tsx
//
// What a package contains, and the form that delivers it. The brief is the teaser: it shows
// the finding and the stopped trials. This shows what the brief leaves out, using real counts
// from the cohort rather than a feature list, and hands over the document immediately.

import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import { FormEvent, useState } from "react";

import BriefVsPackage, { trialsBeyondTheBrief } from "@/components/BriefVsPackage";
import PrimaryNav from "@/components/PrimaryNav";
import catalogue from "@/data/evidence_catalogue.json";
import briefsIndex from "@/data/briefs_index.json";
import { LICENSING_EMAIL } from "@/lib/licensing";

type Pkg = (typeof catalogue.packages)[number];

const SITE_URL = "https://clinicaltrialfailures.com";
const n = (v: number) => v.toLocaleString("en-US");

export default function PackagePage({ pkg, briefSlug }: { pkg: Pkg; briefSlug: string | null }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), slug: pkg.slug }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Request failed");
      setUrl(data.url || "");
      setMessage(data.message || "");
      setStatus("done");
    } catch (error: any) {
      setMessage(error?.message || "Request failed. Please email us instead.");
      setStatus("error");
    }
  }

  const title = `${pkg.cohort} — evidence package`;
  const c = pkg.counts;
  // Every trial in a couple of the smallest cohorts stopped, so the free brief already lists all of
  // them and there is nothing left for a package to hand over. Those are not for sale.
  const adds = trialsBeyondTheBrief(pkg);

  return (
    <>
      <Head>
        <title>{`${title} — Clinical Trial Failures`}</title>
        <meta
          name="description"
          content={`The full ${pkg.cohort} cohort: ${n(c.total_in_cohort)} trials with cohort rules, attribution and the time-to-event curve.`}
        />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`${SITE_URL}/packages/${pkg.slug}`} />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
            <PrimaryNav active="briefs" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <div className="crumb">
            <Link className="link" href="/packages">
              Packages
            </Link>{" "}
            · {pkg.area}
          </div>
          <h1>
            {adds > 0
              ? `${pkg.cohort}: the whole cohort, not just the stops`
              : `${pkg.cohort}: the brief already is the whole cohort`}
          </h1>
          <BriefVsPackage pkg={pkg} briefSlug={briefSlug} emphasis="package" />

          <section className="section">
            <h2>{adds > 0 ? "What is in it, in detail" : "What a package contains, where one is sold"}</h2>
            <div className="grid2">
              <div className="card">
                <div className="cardTitle">The cohort, written out</div>
                <p>
                  Every rule that decides which trial is in and which is out — source, area, phase, window, how the mechanism
                  class is assigned, what counts as closed. No rule is applied that is not listed.
                </p>
              </div>
              <div className="card">
                <div className="cardTitle">Which stops were this trial&rsquo;s own</div>
                <p>
                  Each stop is attributed: the trial&rsquo;s own data, or a decision taken elsewhere — another study, a
                  programme halt, an upstream trial — with the evidence that produced the verdict, and{" "}
                  <i>not established</i> where the record does not say.
                </p>
              </div>
              <div className="card">
                <div className="cardTitle">Time, not maturity</div>
                <p>
                  The probability of a biological stop at 12, 24, 36, 48 and 60 months, with completion and non-biological
                  termination as competing events, against the same curve for the comparator. Unlike the rate, it does not
                  move with how mature the cohort is.
                </p>
              </div>
              <div className="card">
                <div className="cardTitle">What it cannot tell you</div>
                <p>
                  The limits in full: unadjusted comparisons, no clinician review, disclosure differences between sponsors,
                  and the fact that a completed trial that missed its endpoint is not counted anywhere.
                </p>
              </div>
            </div>
          </section>

          {adds > 0 ? (
          <section className="section" id="get">
            <div className="box">
              {status === "done" ? (
                <div>
                  <h2>Ready</h2>
                  <p className="lead">{message}</p>
                  <a className="btnPrimary" href={url} target="_blank" rel="noopener noreferrer">
                    Open the package
                  </a>
                  <p className="fine">
                    Keep the link — it works from any device and stays valid for a year. To print it as a PDF, use your
                    browser&rsquo;s print dialogue.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <h2>Get this package</h2>
                    <p className="lead">
                      Delivered the moment you ask — it is already built, rebuilt every week with the registry. No call, no
                      waiting.
                    </p>
                    <ul className="list">
                      <li>Automated analysis. No clinician has reviewed these records, and we do not price as though one has</li>
                      <li>Every figure traces to a trial, and every trial to its registry record</li>
                      <li>
                        Tell us the asset you are evaluating and we will say which of these failures share its target and
                        modality
                      </li>
                    </ul>
                  </div>
                  <form className="form" onSubmit={submit}>
                    <div className="field">
                      <label htmlFor="pk-email">Work email</label>
                      <input id="pk-email" className="input" name="email" type="email" required autoComplete="email" />
                    </div>
                    <div className="field">
                      <label htmlFor="pk-company">Company or institution</label>
                      <input id="pk-company" className="input" name="company" type="text" required autoComplete="organization" />
                    </div>
                    <div className="field">
                      <label htmlFor="pk-asset">
                        The asset you are evaluating <span className="opt">optional</span>
                      </label>
                      <input id="pk-asset" className="input" name="asset" type="text" placeholder="Name or research code" />
                    </div>
                    <input
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      style={{ position: "absolute", left: "-9999px" }}
                    />
                    <label className="consent">
                      <input name="marketing" type="checkbox" />
                      <span>Optional: tell me when this cohort changes. You get the package either way.</span>
                    </label>
                    <button className="submit" type="submit" disabled={status === "sending"}>
                      {status === "sending" ? "Preparing…" : "Get the package"}
                    </button>
                    {status === "error" ? <div className="formError">{message}</div> : null}
                    <p className="fine">
                      Or email{" "}
                      <a className="link" href={`mailto:${LICENSING_EMAIL}`}>
                        {LICENSING_EMAIL}
                      </a>
                      .
                    </p>
                  </form>
                </>
              )}
            </div>
          </section>
          ) : (
            <section className="section" id="get">
              <div className="box">
                <div>
                  <h2>There is nothing here to sell you</h2>
                  <p className="lead">
                    All {n(c.total_in_cohort)} trials in this cohort have closed and all {c.stopped} of them stopped
                    early. The free brief lists every one, so a package would be the same {c.stopped} trials with a
                    price on them.
                  </p>
                  <ul className="list">
                    <li>
                      Read the brief — it is the whole cohort, and it says plainly that {c.stopped} trials cannot carry
                      a rate
                    </li>
                    <li>
                      For a cohort where most of the trials are <i>not</i> in the brief, see the{" "}
                      <Link className="link" href="/packages">
                        other cohorts
                      </Link>
                    </li>
                    <li>
                      For your own asset, sponsor or indication, tell us what you are evaluating and we will say whether
                      the data can answer it before anything is built
                    </li>
                  </ul>
                  <div className="noSaleActions">
                    {briefSlug ? (
                      <Link className="btnPrimary" href={`/briefs/${briefSlug}`}>
                        Read the free brief
                      </Link>
                    ) : null}
                    <a
                      className="btnGhost"
                      href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent("Evidence package for a custom cohort")}`}
                    >
                      Describe your cohort
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1120px;
          margin: 0 auto;
        }
        .crumb {
          font-size: 12.5px;
          color: var(--text-muted);
          padding-top: 10px;
        }
        h1 {
          margin: 8px 0 0;
          font-size: 30px;
          line-height: 1.14;
          font-weight: 900;
          letter-spacing: -0.02em;
          max-width: 30ch;
        }
        .lead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 88ch;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 20px;
        }
        .stat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .stat b {
          display: block;
          font-size: 27px;
          font-weight: 900;
          letter-spacing: -0.025em;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .stat span {
          display: block;
          margin-top: 6px;
          font-size: 12.5px;
          line-height: 1.45;
          color: var(--text-muted);
        }
        .section {
          margin-top: 34px;
        }
        .section h2 {
          margin: 0 0 4px;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        .grid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 14px;
        }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px 18px;
        }
        .cardTitle {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .card p {
          margin: 8px 0 0;
          font-size: 13.5px;
          line-height: 1.55;
        }
        .noSaleActions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }
        .box {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 28px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: var(--shadow-soft);
          padding: 24px 26px;
          margin-top: 14px;
        }
        .list {
          margin: 12px 0 0;
          padding-left: 18px;
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .list li {
          margin-bottom: 6px;
        }
        .field {
          margin-bottom: 12px;
        }
        .field label {
          display: block;
          font-size: 12.5px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        .opt {
          font-weight: 600;
          color: var(--text-muted);
        }
        .input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: inherit;
          background: var(--bg);
          color: var(--text);
        }
        .consent {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: 12.5px;
          line-height: 1.45;
          color: var(--text-muted);
          margin: 10px 0;
        }
        .submit {
          width: 100%;
          background: var(--accent);
          color: #fff;
          border: 0;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
        }
        .formError {
          margin-top: 10px;
          font-size: 13px;
          color: #b91c1c;
        }
        .fine {
          margin: 12px 0 0;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 90ch;
        }
        @media (max-width: 900px) {
          .stats,
          .grid2,
          .box {
            grid-template-columns: 1fr;
          }
          h1 {
            font-size: 25px;
          }
        }
      `}</style>
      <style jsx>{`
        :global(.btnPrimary) {
          display: inline-block;
          margin-top: 12px;
          background: var(--accent);
          color: #fff;
          border-radius: 12px;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
        }
      `}</style>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: catalogue.packages.map((p) => ({ params: { slug: p.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const pkg = catalogue.packages.find((p) => p.slug === params?.slug);
  if (!pkg) return { notFound: true };
  // The brief that this package extends, so the page can send a reader to the free one first.
  const brief = (briefsIndex.briefs as any[]).find((b) => b.file_stem === (pkg as any).brief_stem);
  return { props: { pkg, briefSlug: brief ? brief.slug : null } };
};
