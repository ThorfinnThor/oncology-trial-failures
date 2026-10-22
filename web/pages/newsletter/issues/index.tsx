import Head from "next/head";
import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";
import { ISSUES, issueLabel, issuePath } from "@/lib/newsletterIssues";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/newsletter/issues`;
const TITLE = "Newsletter archive: stopped clinical trials, every two weeks";
const DESCRIPTION =
  "Every issue of the Clinical Trial Failures newsletter: the trials that entered the stopped-trial dataset and the records sponsors changed, fortnight by fortnight.";

export default function NewsletterArchivePage() {
  // An archive with nothing in it is not a page worth indexing; it becomes one with the first issue.
  const robots = ISSUES.length ? "index,follow" : "noindex,follow";
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content={robots} />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
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
        <div className="archiveWrap">
          <nav className="muted archiveCrumb" aria-label="Breadcrumb">
            <Link className="link" href="/newsletter">Newsletter</Link> / <span>Archive</span>
          </nav>
          <h1>Newsletter archive</h1>
          <p className="archiveLead">
            Every issue as it was sent: the trials that stopped in the fortnight and the records sponsors changed.{" "}
            <Link className="link" href="/newsletter">Subscribe</Link> to get the next one.
          </p>
          {ISSUES.length ? (
            <ul className="archiveList">
              {ISSUES.map((issue) => (
                <li key={issue.date} className="card">
                  <Link href={issuePath(issue.date)}>
                    <strong>{issueLabel(issue.date)}</strong>
                    <span>{issue.subject}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card archiveEmpty">
              The archive starts with the next issue. Until then, the{" "}
              <Link className="link" href="/newsletter">newsletter page</Link> shows what the next mail will carry.
            </p>
          )}
        </div>
      </main>

      <style jsx>{`
        .archiveWrap {
          max-width: 900px;
          margin: 0 auto;
        }
        .archiveCrumb {
          font-size: 13px;
        }
        h1 {
          margin: 12px 0 0;
          font-size: clamp(1.7rem, 3.6vw, 2.4rem);
          letter-spacing: 0;
        }
        .archiveLead {
          margin: 12px 0 0;
          color: #334155;
          font-size: 15px;
          line-height: 1.6;
        }
        .archiveList {
          display: grid;
          gap: 10px;
          margin: 20px 0 0;
          padding: 0;
          list-style: none;
        }
        .archiveList li :global(a) {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 14px 16px;
          color: var(--text);
        }
        .archiveList li :global(a strong) {
          color: var(--accent);
          font-size: 14px;
        }
        .archiveList li :global(a span) {
          color: #334155;
          font-size: 13px;
        }
        .archiveEmpty {
          margin-top: 20px;
          padding: 16px;
          color: #334155;
          font-size: 14px;
        }
      `}</style>
    </>
  );
}
