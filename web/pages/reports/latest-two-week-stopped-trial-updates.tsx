import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";

import PrimaryNav from "@/components/PrimaryNav";
import { buildInsightStats } from "@/lib/insightStats";
import type { InsightStats } from "@/lib/insights";

const SITE_URL = "https://clinicaltrialfailures.com";
const PATH = "/reports/latest-two-week-stopped-trial-updates";
const CANONICAL_URL = `${SITE_URL}${PATH}`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

type ReportProps = {
  report: InsightStats["latestUpdates"];
};

function number(value: number): string {
  return value.toLocaleString("en-US");
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function sortedEntries(values: Record<string, number>) {
  return Object.entries(values).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function reasonClass(bucket: string): string {
  return bucket.toUpperCase() === "SAFETY" ? "reportReason reportReasonSafety" : "reportReason reportReasonEfficacy";
}

export const getStaticProps: GetStaticProps<ReportProps> = async () => {
  const stats = await buildInsightStats();
  return {
    props: { report: stats.latestUpdates },
  };
};

export default function LatestTwoWeekReport({ report }: ReportProps) {
  const title = `Latest stopped clinical trial updates: ${report.startDate} to ${report.endDate}`;
  const description = `A source-linked report covering ${number(report.total)} stopped clinical trial records updated from ${report.startDate} to ${report.endDate}. Automatically recalculated from the latest ingest.`;
  const scientificShare = report.total ? `${((report.scientificCount / report.total) * 100).toFixed(1)}%` : "0.0%";
  const exploreHref = `/explore?date_from=${encodeURIComponent(report.startDate)}&date_to=${encodeURIComponent(report.endDate)}&sort=date_desc`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Report",
      name: title,
      description,
      url: CANONICAL_URL,
      dateModified: report.endDate,
      publisher: { "@type": "Organization", name: "Clinical Trial Failures" },
      isBasedOn: "https://clinicaltrials.gov",
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Latest two-week stopped clinical trial update window",
      description,
      temporalCoverage: `${report.startDate}/${report.endDate}`,
      isAccessibleForFree: true,
      isBasedOn: "https://clinicaltrials.gov",
    },
  ];

  return (
    <>
      <Head>
        <title>{title} | Clinical Trial Failures</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <div className="reportPage min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">Clinical trial failures</Link>
              <PrimaryNav active="insights" />
            </div>
          </div>
        </header>

        <main className="page">
          <article className="reportShell">
            <nav className="reportBreadcrumb" aria-label="Breadcrumb">
              <Link href="/">Home</Link> / <Link href="/insights">Insights</Link> / <span>Latest report</span>
            </nav>

            <header className="reportHero card">
              <div className="reportHeroCopy">
                <p className="facet-title">Automatically calculated report</p>
                <h1>Latest two-week stopped trial updates</h1>
                <p className="reportLede">
                  This report covers records updated from <strong>{formatDate(report.startDate)}</strong> through{" "}
                  <strong>{formatDate(report.endDate)}</strong>. It recalculates from the newest available ingest whenever the site builds.
                </p>
                <div className="reportActions">
                  <Link href={exploreHref} className="reportPrimary">Open this window in Explore →</Link>
                  <Link href="/methods" className="reportSecondary">How classification works →</Link>
                </div>
              </div>

              <aside className="reportDefinition" data-ai-summary="true">
                <span>Important definition</span>
                <p>
                  These are recently <strong>updated</strong> stopped records. They are not necessarily newly created NCT IDs.
                  A true new-record count requires comparison with the previous ingest snapshot.
                </p>
              </aside>
            </header>

            <section className="reportMetrics" aria-label="Report summary">
              <article>
                <span>Updated stopped records</span>
                <strong>{number(report.total)}</strong>
                <p>Terminated, suspended, or withdrawn records in the window.</p>
              </article>
              <article>
                <span>Biological signals</span>
                <strong>{number(report.scientificCount)}</strong>
                <p>{scientificShare} classified as efficacy/futility or safety signals.</p>
              </article>
              <article>
                <span>Window start</span>
                <strong>{report.startDate}</strong>
                <p>Thirteen days before the latest ingested update date.</p>
              </article>
              <article>
                <span>Latest update</span>
                <strong>{report.endDate}</strong>
                <p>The newest registry update date available in this ingest.</p>
              </article>
            </section>

            <section className="reportSection" aria-labelledby="notable-records-title">
              <div className="reportSectionHeading">
                <p className="facet-title">Source-linked records</p>
                <h2 id="notable-records-title">Notable efficacy and safety updates</h2>
                <p>
                  These records are selected from the latest window because their stop language is classified as efficacy/futility or safety.
                  Open the trial page before using any item in research or reporting.
                </p>
              </div>

              <div className="reportRecordList">
                {report.notableRecords.map((record) => (
                  <article className="reportRecord card" key={record.nctId}>
                    <div className="reportRecordTop">
                      <Link href={record.href} className="reportNct">{record.nctId}</Link>
                      <span className={reasonClass(record.bucket)}>{record.bucket}</span>
                    </div>
                    <h3>{record.title}</h3>
                    <dl>
                      <div><dt>Sponsor</dt><dd>{record.sponsor}</dd></div>
                      <div><dt>Phase</dt><dd>{record.phase}</dd></div>
                      <div><dt>Disease area</dt><dd>{record.area}</dd></div>
                      <div><dt>Updated</dt><dd>{record.updated}</dd></div>
                    </dl>
                    <div className="reportReasonText">
                      <span>Registry stop language</span>
                      <p>{record.why}</p>
                    </div>
                    <Link href={record.href} className="reportRecordLink">Open source-linked trial detail →</Link>
                  </article>
                ))}
              </div>
            </section>

            <section className="reportTables" aria-label="Latest report breakdowns">
              <article className="card">
                <h2>Status mix</h2>
                <dl>{sortedEntries(report.statuses).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl>
              </article>
              <article className="card">
                <h2>Stop-reason mix</h2>
                <dl>{sortedEntries(report.buckets).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{number(value)}</dd></div>)}</dl>
              </article>
              <article className="card">
                <h2>Largest disease areas</h2>
                <dl>{report.topAreas.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{number(item.count)}</dd></div>)}</dl>
              </article>
              <article className="card">
                <h2>Largest sponsor counts</h2>
                <dl>{report.topSponsors.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{number(item.count)}</dd></div>)}</dl>
              </article>
            </section>

            <section className="reportNote card">
              <h2>How to use this report</h2>
              <p>
                Use it as a monitoring and triage layer. Status alone does not establish drug failure, and short registry explanations can omit endpoint,
                safety, or strategic context. Verify important findings against ClinicalTrials.gov and related primary documents.
              </p>
            </section>
          </article>
        </main>
      </div>

      <style jsx global>{`
        .reportPage { background: #f7f8fb; color: var(--text); }
        .reportPage .reportShell { max-width: 1120px; margin: 0 auto; }
        .reportPage .reportBreadcrumb { margin-bottom: 12px; color: var(--text-muted); font-size: 13px; }
        .reportPage .reportBreadcrumb a { color: var(--accent); font-weight: 750; }
        .reportPage .reportHero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr); gap: 24px; padding: clamp(22px, 3vw, 32px); }
        .reportPage .reportHero h1 { max-width: 760px; margin: 4px 0 0; font-size: clamp(2.1rem, 5vw, 3.35rem); line-height: 1.04; letter-spacing: 0; }
        .reportPage .reportLede { max-width: 760px; margin: 16px 0 0; color: var(--text-muted); font-size: 17px; line-height: 1.68; }
        .reportPage .reportLede strong { color: var(--text); }
        .reportPage .reportActions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .reportPage .reportPrimary, .reportPage .reportSecondary { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 11px; padding: 11px 14px; font-weight: 850; }
        .reportPage .reportPrimary { background: #0f172a; color: #fff; border: 1px solid #0f172a; }
        .reportPage .reportSecondary { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; }
        .reportPage .reportDefinition { align-self: start; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 12px; background: #eff6ff; padding: 18px; }
        .reportPage .reportDefinition span { color: #1d4ed8; font-size: 11px; font-weight: 900; letter-spacing: .07em; text-transform: uppercase; }
        .reportPage .reportDefinition p { margin: 8px 0 0; color: #1e3a5f; line-height: 1.6; }
        .reportPage .reportMetrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 16px; }
        .reportPage .reportMetrics article { min-width: 0; border: 1px solid var(--border); border-radius: 13px; background: #fff; padding: 16px; box-shadow: var(--shadow-soft); }
        .reportPage .reportMetrics span, .reportPage .reportReasonText > span { color: var(--text-muted); font-size: 11px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
        .reportPage .reportMetrics strong { display: block; margin-top: 7px; font-size: 24px; line-height: 1.1; }
        .reportPage .reportMetrics p { margin: 7px 0 0; color: var(--text-muted); font-size: 13px; line-height: 1.45; }
        .reportPage .reportSection { margin-top: 32px; }
        .reportPage .reportSectionHeading { max-width: 880px; padding: 0 4px; }
        .reportPage .reportSectionHeading h2 { margin: 0; font-size: clamp(1.65rem, 3vw, 2.25rem); line-height: 1.12; }
        .reportPage .reportSectionHeading > p:last-child { margin: 11px 0 0; color: var(--text-muted); line-height: 1.68; }
        .reportPage .reportRecordList { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
        .reportPage .reportRecord { display: flex; min-width: 0; flex-direction: column; padding: 20px; }
        .reportPage .reportRecordTop { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .reportPage .reportNct { color: var(--accent); font-family: var(--font-mono); font-weight: 900; }
        .reportPage .reportReason { display: inline-flex; border-radius: 999px; padding: 5px 9px; font-size: 11px; font-weight: 900; }
        .reportPage .reportReasonEfficacy { background: var(--reason-efficacy-bg); color: var(--reason-efficacy-text); }
        .reportPage .reportReasonSafety { background: var(--reason-safety-bg); color: var(--reason-safety-text); }
        .reportPage .reportRecord h3 { margin: 13px 0 0; font-size: 18px; line-height: 1.3; }
        .reportPage .reportRecord dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 14px; margin: 16px 0 0; }
        .reportPage .reportRecord dl div { min-width: 0; }
        .reportPage .reportRecord dt { color: var(--text-muted); font-size: 10px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
        .reportPage .reportRecord dd { margin: 4px 0 0; font-size: 13px; font-weight: 750; line-height: 1.35; }
        .reportPage .reportReasonText { margin-top: 16px; border-top: 1px solid var(--border); padding-top: 14px; }
        .reportPage .reportReasonText p { margin: 6px 0 0; color: var(--text-muted); line-height: 1.58; }
        .reportPage .reportRecordLink { display: inline-flex; margin-top: auto; padding-top: 16px; color: var(--accent); font-weight: 850; }
        .reportPage .reportTables { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 28px; }
        .reportPage .reportTables article { padding: 20px; }
        .reportPage .reportTables h2, .reportPage .reportNote h2 { margin: 0 0 12px; font-size: 20px; }
        .reportPage .reportTables dl { display: grid; gap: 9px; margin: 0; }
        .reportPage .reportTables dl div { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; border-bottom: 1px solid var(--border); padding-bottom: 9px; }
        .reportPage .reportTables dl div:last-child { border-bottom: 0; padding-bottom: 0; }
        .reportPage .reportTables dt, .reportPage .reportTables dd { margin: 0; line-height: 1.4; }
        .reportPage .reportTables dt { color: var(--text-muted); }
        .reportPage .reportTables dd { font-weight: 900; font-variant-numeric: tabular-nums; }
        .reportPage .reportNote { margin-top: 16px; padding: 20px; }
        .reportPage .reportNote p { max-width: 900px; margin: 0; color: var(--text-muted); line-height: 1.68; }
        @media (max-width: 860px) {
          .reportPage .reportHero, .reportPage .reportMetrics, .reportPage .reportRecordList, .reportPage .reportTables { grid-template-columns: 1fr; }
          .reportPage .reportMetrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 560px) {
          .reportPage .reportHero { padding: 18px; }
          .reportPage .reportMetrics { grid-template-columns: 1fr; }
          .reportPage .reportActions, .reportPage .reportPrimary, .reportPage .reportSecondary { width: 100%; }
          .reportPage .reportRecord { padding: 18px; }
          .reportPage .reportRecord dl { grid-template-columns: 1fr; }
          .reportPage .reportRecordTop { align-items: flex-start; }
        }
      `}</style>
    </>
  );
}
