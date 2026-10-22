import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";

import PrimaryNav from "@/components/PrimaryNav";
import { ISSUES, issueLabel, issuePath, type IssueRow, type NewsletterIssue } from "@/lib/newsletterIssues";
import { serializeJsonLd } from "@/lib/serializeJsonLd";

const SITE_URL = "https://clinicaltrialfailures.com";

type Props = { date: string; issue: NewsletterIssue };

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: ISSUES.map((issue) => ({ params: { date: issue.date } })),
  fallback: false,
});

// Build time only (fallback: false), so reading the file system is safe on every runtime.
export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const date = String(params?.date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { notFound: true };
  const { promises: fs } = await import("fs");
  const path = await import("path");
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "newsletter_issues", `${date}.json`), "utf8");
    return { props: { date, issue: JSON.parse(raw) as NewsletterIssue } };
  } catch {
    return { notFound: true };
  }
};

export default function NewsletterIssuePage({ date, issue }: Props) {
  // Rendered by a helper, so the row rules below are written as :global under .issueWrap.
  const renderRows = (rows: IssueRow[], kind: "added" | "changed") => (
    <ul className="issueRows">
      {rows.map((row) => (
        <li key={`${kind}-${row.nct_id}`} className="card">
          <div className="issueRowHead">
            <Link className="issueId" href={`/trial/${row.nct_id}`}>
              {row.nct_id}
            </Link>
            {row.reason ? <span className="issueReason">{row.reason}</span> : null}
          </div>
          <strong>{row.title}</strong>
          <small>{[row.sponsor, row.area].filter(Boolean).join(" · ")}</small>
          {row.detail ? <p>{row.detail}</p> : null}
        </li>
      ))}
    </ul>
  );

  const label = issueLabel(date);
  const title = `Stopped clinical trials, ${label}: ${issue.counts.added} new, ${issue.counts.changed} changed`;
  const description = `The trials that entered the stopped-trial dataset and the records sponsors changed, as sent on ${label}. Each line links to the trial and its ClinicalTrials.gov record.`;
  const canonical = `${SITE_URL}${issuePath(date)}`;
  const index = ISSUES.findIndex((item) => item.date === date);
  const newer = index > 0 ? ISSUES[index - 1] : null;
  const older = index >= 0 && index < ISSUES.length - 1 ? ISSUES[index + 1] : null;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    datePublished: issue.sent_at,
    url: canonical,
    author: { "@type": "Person", name: "Schayan Yousefian" },
    publisher: { "@type": "Organization", name: "Clinical Trial Failures", url: SITE_URL },
  };

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
            <PrimaryNav active="newsletter" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="issueWrap">
          <nav className="muted issueCrumb" aria-label="Breadcrumb">
            <Link className="link" href="/newsletter">Newsletter</Link> /{" "}
            <Link className="link" href="/newsletter/issues">Archive</Link> / <span>{label}</span>
          </nav>
          <h1>{title}</h1>
          <p className="issueLead">
            As mailed on {label}
            {issue.trial_count ? ` to subscribers, from a dataset of ${issue.trial_count.toLocaleString("en-US")} stopped trials` : ""}.
            The stop reasons are the sponsors&apos; own words; the label next to them is our classification.
          </p>

          {issue.added.length ? (
            <section>
              <h2>New stopped trials ({issue.counts.added})</h2>
              {renderRows(issue.added, "added")}
            </section>
          ) : null}
          {issue.changed.length ? (
            <section>
              <h2>Records sponsors changed ({issue.counts.changed})</h2>
              {renderRows(issue.changed, "changed")}
            </section>
          ) : null}
          {!issue.added.length && !issue.changed.length ? <p>Nothing moved in this fortnight.</p> : null}

          <div className="card issueCta">
            <strong>Get the next one in your inbox</strong>
            <span>One mail every two weeks, free.</span>
            <Link className="btn btn-primary" href="/newsletter">Subscribe</Link>
          </div>

          <nav className="issuePager" aria-label="Other issues">
            {older ? <Link href={issuePath(older.date)}>← {issueLabel(older.date)}</Link> : <span />}
            {newer ? <Link href={issuePath(newer.date)}>{issueLabel(newer.date)} →</Link> : <span />}
          </nav>
        </div>
      </main>

      <style jsx>{`
        .issueWrap {
          max-width: 900px;
          margin: 0 auto;
        }
        .issueCrumb {
          font-size: 13px;
        }
        h1 {
          margin: 12px 0 0;
          font-size: clamp(1.6rem, 3.6vw, 2.3rem);
          line-height: 1.15;
          letter-spacing: 0;
        }
        .issueLead {
          margin: 12px 0 0;
          color: #334155;
          font-size: 15px;
          line-height: 1.6;
        }
        h2 {
          margin: 28px 0 0;
          font-size: 19px;
          letter-spacing: 0;
        }
        .issueWrap :global(.issueRows) {
          display: grid;
          gap: 10px;
          margin: 12px 0 0;
          padding: 0;
          list-style: none;
        }
        .issueWrap :global(.issueRows li) {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 14px 16px;
        }
        .issueWrap :global(.issueRowHead) {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
        }
        .issueWrap :global(.issueRowHead .issueId) {
          color: var(--accent);
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 800;
        }
        .issueWrap :global(.issueReason) {
          padding: 2px 7px;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 700;
        }
        .issueWrap :global(.issueRows strong) {
          font-size: 14px;
          line-height: 1.4;
        }
        .issueWrap :global(.issueRows small) {
          color: var(--text-muted);
          font-size: 12px;
        }
        .issueWrap :global(.issueRows p) {
          margin: 4px 0 0;
          color: #334155;
          font-size: 13px;
          line-height: 1.55;
        }
        .issueCta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 16px;
          margin-top: 28px;
          padding: 18px;
        }
        .issueCta span {
          color: var(--text-muted);
          font-size: 13px;
        }
        .issuePager {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          margin-top: 20px;
          font-size: 13px;
          font-weight: 700;
        }
        .issuePager :global(a) {
          color: var(--accent);
        }
      `}</style>
    </>
  );
}
