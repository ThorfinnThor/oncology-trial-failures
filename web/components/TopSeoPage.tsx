import Head from "next/head";
import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";
import type { TopListRow } from "@/lib/topSeoData";

const SITE_URL = "https://clinicaltrialfailures.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

type TopSeoPageProps = {
  title: string;
  description: string;
  canonicalPath: string;
  eyebrow: string;
  h1: string;
  lede: string;
  intro: string[];
  methodology: string[];
  tableTitle: string;
  tableIntro: string;
  rows: TopListRow[];
  summary: Array<{ label: string; value: string; detail: string }>;
  related: Array<{ href: string; label: string; text: string }>;
};

export default function TopSeoPage({
  title,
  description,
  canonicalPath,
  eyebrow,
  h1,
  lede,
  intro,
  methodology,
  tableTitle,
  tableIntro,
  rows,
  summary,
  related,
}: TopSeoPageProps) {
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: h1,
      description,
      url: canonicalUrl,
      image: OG_IMAGE,
      author: { "@type": "Organization", name: "Clinical Trial Failures" },
      publisher: { "@type": "Organization", name: "Clinical Trial Failures" },
      mainEntityOfPage: canonicalUrl,
      about: ["clinical trial failures", "failed clinical trials", "ClinicalTrials.gov", "pharma intelligence"],
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: tableTitle,
      description: tableIntro,
      isBasedOn: "https://clinicaltrials.gov",
      isAccessibleForFree: true,
    },
  ];

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <div className="topSeoPage min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <PrimaryNav active="guides" />
            </div>
          </div>
        </header>

        <main className="page">
          <article className="topSeoArticle">
            <header className="topSeoHero card p-4">
              <p className="facet-title">{eyebrow}</p>
              <h1>{h1}</h1>
              <p className="topSeoLede">{lede}</p>
              <div className="topSeoSummary" aria-label="Dataset summary">
                {summary.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </header>

            <section className="topSeoSection">
              {intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>

            <section className="card p-4 topSeoTableCard">
              <h2>{tableTitle}</h2>
              <p>{tableIntro}</p>
              <div className="topSeoTableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Total stopped</th>
                      <th>Likely biological</th>
                      <th>Efficacy / safety</th>
                      <th>Example record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${row.rank}-${row.label}`}>
                        <td>{row.rank}</td>
                        <td>
                          <strong>{row.label}</strong>
                          <span>{row.share} biological-signal share</span>
                        </td>
                        <td>{row.total.toLocaleString()}</td>
                        <td>{row.scientific.toLocaleString()}</td>
                        <td>
                          {row.efficacy.toLocaleString()} efficacy/futility · {row.safety.toLocaleString()} safety
                        </td>
                        <td>
                          <Link href={row.example.href}>{row.example.nctId}</Link>
                          <span>
                            {row.example.phase} · {row.example.sponsor}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="topSeoSection">
              <h2>How to read this ranking</h2>
              {methodology.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>

            <section className="topSeoExamples">
              {rows.slice(0, 3).map((row) => (
                <article className="card p-4" key={row.example.nctId}>
                  <p className="facet-title">Example source record</p>
                  <h3>{row.example.nctId}: {row.example.title}</h3>
                  <p>
                    {row.example.reason} signal in {row.example.phase}, sponsored by {row.example.sponsor}.
                  </p>
                  <p>{row.example.why || "No short stop-reason text is available in the compact dataset."}</p>
                  <Link className="link" href={row.example.href}>
                    Open trial detail →
                  </Link>
                </article>
              ))}
            </section>

            <section className="card p-4 topSeoRelated">
              <h2>Continue from here</h2>
              <div>
                {related.map((item) => (
                  <Link href={item.href} key={item.href}>
                    <strong>{item.label}</strong>
                    <span>{item.text}</span>
                  </Link>
                ))}
              </div>
            </section>
          </article>
        </main>
      </div>

      <style jsx>{`
        .topSeoArticle {
          max-width: 1080px;
          margin: 0 auto;
        }
        .topSeoHero h1 {
          margin: 0;
          max-width: 900px;
          font-size: clamp(2rem, 4.8vw, 3.35rem);
          line-height: 1.05;
          letter-spacing: 0;
        }
        .topSeoLede {
          max-width: 820px;
          margin: 14px 0 0;
          color: var(--text-muted);
          font-size: 17px;
          line-height: 1.65;
        }
        .topSeoSummary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .topSeoSummary div {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--surface-2);
          padding: 13px;
        }
        .topSeoSummary span {
          display: block;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .topSeoSummary strong {
          display: block;
          margin-top: 6px;
          font-size: 24px;
          line-height: 1.1;
        }
        .topSeoSummary p {
          margin: 7px 0 0;
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.4;
        }
        .topSeoSection {
          max-width: 880px;
          margin: 24px auto 0;
        }
        .topSeoSection h2,
        .topSeoTableCard h2,
        .topSeoRelated h2 {
          margin: 0 0 10px;
          font-size: 24px;
          line-height: 1.18;
        }
        .topSeoSection p,
        .topSeoTableCard p,
        .topSeoExamples p {
          margin: 0;
          color: var(--text-muted);
          font-size: 16px;
          line-height: 1.72;
        }
        .topSeoSection p + p,
        .topSeoExamples p + p {
          margin-top: 12px;
        }
        .topSeoTableCard {
          margin-top: 24px;
        }
        .topSeoTableWrap {
          margin-top: 14px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
          font-size: 14px;
        }
        th,
        td {
          border-bottom: 1px solid var(--border);
          padding: 11px 9px;
          text-align: left;
          vertical-align: top;
        }
        th {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        td strong,
        td span {
          display: block;
        }
        td span {
          margin-top: 4px;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.35;
        }
        td a {
          color: var(--accent);
          font-weight: 850;
        }
        .topSeoExamples {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 24px;
        }
        .topSeoExamples h3 {
          margin: 0 0 10px;
          font-size: 17px;
          line-height: 1.28;
        }
        .topSeoExamples .link {
          display: inline-flex;
          margin-top: 12px;
        }
        .topSeoRelated {
          margin-top: 24px;
        }
        .topSeoRelated div {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .topSeoRelated a {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 13px;
          text-decoration: none;
        }
        .topSeoRelated a:hover {
          border-color: rgba(79, 70, 229, 0.35);
          background: var(--surface-2);
        }
        .topSeoRelated strong,
        .topSeoRelated span {
          display: block;
        }
        .topSeoRelated span {
          margin-top: 6px;
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.45;
        }
        @media (max-width: 820px) {
          .topSeoSummary,
          .topSeoExamples,
          .topSeoRelated div {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
