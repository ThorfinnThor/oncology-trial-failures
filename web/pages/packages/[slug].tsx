// web/pages/packages/[slug].tsx
//
// What a report contains, and the way to buy it — through the asset check, which sells by target. The brief is the teaser: it shows
// the finding and the stopped trials. This shows what the brief leaves out, using real counts
// from the cohort rather than a feature list, and hands over the document immediately.

import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";

import BriefVsPackage, { PACKAGE_PRICE, trialsBeyondTheBrief } from "@/components/BriefVsPackage";
import PrimaryNav from "@/components/PrimaryNav";
import SampleCallout from "@/components/SampleCallout";
import catalogue from "@/data/evidence_catalogue.json";
import briefsIndex from "@/data/briefs_index.json";

type Pkg = (typeof catalogue.packages)[number];

const SITE_URL = "https://clinicaltrialfailures.com";
const n = (v: number) => v.toLocaleString("en-US");

export default function PackagePage({ pkg, briefSlug }: { pkg: Pkg; briefSlug: string | null }) {
  // The class name is what the buyer is sent to the asset check with. Every one of the 52 resolves
  // there, and buying through it always includes this cohort — checked against the catalogue.
  const buyAs = pkg.cohort.split(" + ")[0];

  const title = `${pkg.cohort} — diligence report`;
  const c = pkg.counts;
  // Every trial in a couple of the smallest cohorts stopped, so the free brief already lists all of
  // them and there is nothing left for a report to hand over. Those are not for sale.
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
              Reports
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
            <h2>{adds > 0 ? "What is in it, in detail" : "What a report contains, where one is sold"}</h2>
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
                  The limits in full: unadjusted comparisons, no clinician review, and disclosure differences between
                  sponsors. Completed trials that missed their primary endpoint are listed separately, each with the
                  sponsor&apos;s posted numbers or sentence it was read from, and only where the sponsor posted a result
                  that can be read — so that count is a floor, not a rate.
                </p>
              </div>
            </div>
          </section>

          {adds > 0 ? <SampleCallout /> : null}

          {adds > 0 ? (
          <section className="section" id="get">
            <div className="box">
              <div>
                <h2>Get this report — {PACKAGE_PRICE}</h2>
                <p className="lead">
                  Reports are bought for a molecule or a target rather than one cohort at a time. You receive every
                  cohort in which a drug that failed shares that target — this one included — each opening with your
                  molecule compared against the molecules that failed there.
                </p>
                <ul className="list">
                  <li>One payment, delivered immediately, and a link that stays current for a year</li>
                  <li>Every figure traces to a trial, and every trial to its registry record</li>
                  <li>Automated analysis: no clinician has reviewed these records, and the price reflects that</li>
                </ul>
              </div>
              <div className="buySide">
                <Link className="btnPrimary buyMain" href={`/asset-check?q=${encodeURIComponent(buyAs)}`}>
                  Buy for {buyAs}
                </Link>
                <p className="fine">
                  Evaluating a specific molecule?{" "}
                  <Link className="link" href="/asset-check">
                    Check it first
                  </Link>{" "}
                  — the comparison is free, and the report then opens with your molecule already placed against the
                  ones that failed.
                </p>
                <p className="fine">
                  See the full structure first:{" "}
                  <Link className="link" href="/packages/sample">
                    sample report
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>
          ) : (
            <section className="section" id="get">
              <div className="box">
                <div>
                  <h2>There is nothing here to sell you</h2>
                  <p className="lead">
                    All {n(c.total_in_cohort)} trials in this cohort have closed and all {c.stopped} of them stopped
                    early. The free brief lists every one, so a report would be the same {c.stopped} trials with a
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
                  </ul>
                  <div className="noSaleActions">
                    {briefSlug ? (
                      <Link className="btnPrimary" href={`/briefs/${briefSlug}`}>
                        Read the free brief
                      </Link>
                    ) : null}
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
        .againRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 14px;
          align-items: center;
        }
        .againRow :global(.input) {
          flex: 1 1 220px;
          min-width: 0;
        }
        .hint {
          font-size: 11.5px;
          line-height: 1.45;
          color: var(--text-muted);
        }
        .buySide {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 12px;
        }
        .buySide :global(.buyMain) {
          display: block;
          width: 100%;
          text-align: center;
          padding: 14px 18px;
          font-size: 15px;
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
  // The brief that this report extends, so the page can send a reader to the free one first.
  const brief = (briefsIndex.briefs as any[]).find((b) => b.file_stem === (pkg as any).brief_stem);
  return { props: { pkg, briefSlug: brief ? brief.slug : null } };
};
