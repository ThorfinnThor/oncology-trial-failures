import Head from "next/head";
import { serializeJsonLd } from "@/lib/serializeJsonLd";
import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";
import { INSIGHTS_BASE_URL, insightPath, type InsightArticle } from "@/lib/insights";

const OG_IMAGE = `${INSIGHTS_BASE_URL}/og-image.png`;

type InsightArticlePageProps = {
  article: InsightArticle;
};

export default function InsightArticlePage({ article }: InsightArticlePageProps) {
  const canonicalUrl = `${INSIGHTS_BASE_URL}${insightPath(article)}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: article.title,
      description: article.metaDescription,
      datePublished: article.datePublished,
      dateModified: article.datePublished,
      author: {
        "@type": "Organization",
        name: "Clinical Trial Failures",
      },
      publisher: {
        "@type": "Organization",
        name: "Clinical Trial Failures",
      },
      mainEntityOfPage: canonicalUrl,
      image: OG_IMAGE,
      about: [article.keyword, "clinical trial failures", "ClinicalTrials.gov"],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: article.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: INSIGHTS_BASE_URL },
        { "@type": "ListItem", position: 2, name: "Insights", item: `${INSIGHTS_BASE_URL}/insights` },
        { "@type": "ListItem", position: 3, name: article.title, item: canonicalUrl },
      ],
    },
  ];

  return (
    <>
      <Head>
        <title>{`${article.title} | Clinical Trial Failures`}</title>
        <meta name="description" content={article.metaDescription} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={`${article.title} | Clinical Trial Failures`} />
        <meta property="og:description" content={article.metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${article.title} | Clinical Trial Failures`} />
        <meta name="twitter:description" content={article.metaDescription} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      </Head>

      <div className="insightPage min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <PrimaryNav active="insights" />
            </div>
          </div>
        </header>

        <main className="page">
          <article className="insightArticle">
            <nav className="insightBreadcrumb" aria-label="Breadcrumb">
              <Link className="link" href="/">
                Home
              </Link>{" "}
              /{" "}
              <Link className="link" href="/insights">
                Insights
              </Link>{" "}
              / <span>{article.eyebrow}</span>
            </nav>

            <header className="insightHero card p-4">
              <p className="facet-title">{article.eyebrow}</p>
              <h1>{article.title}</h1>
              <p className="insightDek">{article.dek}</p>
              <div className="insightMeta">
                <span>{article.datePublished}</span>
                <span>{article.readingTime}</span>
                <span>Keyword: {article.keyword}</span>
              </div>
            </header>

            <section className="insightFacts card p-4" data-ai-summary="true">
              <div className="facet-title">Five facts from the dataset</div>
              <ul>
                {article.facts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </section>

            {article.sections.map((section) => (
              <section className="insightSection" key={section.heading}>
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}

            <section className="insightTables">
              {article.tables.map((table) => (
                <div className="card p-4" key={table.heading}>
                  <h2>{table.heading}</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>{table.columns[0]}</th>
                        <th>{table.columns[1]}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row) => (
                        <tr key={`${table.heading}-${row[0]}`}>
                          <td>{row[0]}</td>
                          <td>{row[1]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>

            <section className="card p-4 insightLinks">
              <h2>Continue from here</h2>
              <div className="insightLinkGrid">
                {article.links.map((link) => {
                  const isExternal = /^https?:\/\//.test(link.href);
                  const content = (
                    <>
                      <strong>{link.label}</strong>
                      <span>{link.text}</span>
                    </>
                  );

                  return isExternal ? (
                    <a
                      href={link.href}
                      className="insightLinkCard"
                      key={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {content}
                    </a>
                  ) : (
                    <Link href={link.href} className="insightLinkCard" key={link.href}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="insightFaq">
              <h2>FAQ</h2>
              {article.faqs.map((faq) => (
                <details key={faq.question}>
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </section>

            <p className="insightSource">
              Source note: counts are generated from the current ClinicalTrials.gov-derived stopped-trial
              dataset used by ClinicalTrialFailures.com. These labels are analytical screening signals, not
              medical advice.
            </p>
          </article>
        </main>
      </div>

      <style jsx global>{`
        .insightPage .insightArticle {
          max-width: 1040px;
          margin: 0 auto;
        }
        .insightPage .insightHero,
        .insightPage .insightFacts,
        .insightPage .insightLinks,
        .insightPage .insightTables > .card {
          padding: clamp(20px, 2.5vw, 26px);
        }
        .insightPage .insightBreadcrumb {
          color: var(--text-muted);
          font-size: 13px;
          margin-bottom: 12px;
        }
        .insightPage .insightHero h1 {
          max-width: 840px;
          margin: 4px 0 0;
          font-size: clamp(2rem, 5vw, 3rem);
          line-height: 1.05;
          letter-spacing: 0;
        }
        .insightPage .insightDek {
          max-width: 780px;
          margin: 14px 0 0;
          color: var(--text-muted);
          font-size: 17px;
          line-height: 1.65;
        }
        .insightPage .insightMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }
        .insightPage .insightMeta span {
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface-2);
          padding: 6px 10px;
          color: var(--text);
          font-size: 12px;
          font-weight: 800;
        }
        .insightPage .insightFacts {
          margin-top: 16px;
          background: #f8fafc;
        }
        .insightPage .insightFacts ul {
          display: grid;
          gap: 8px;
          margin: 10px 0 0;
          padding-left: 18px;
        }
        .insightPage .insightFacts li {
          color: var(--text);
          line-height: 1.55;
        }
        .insightPage .insightSection {
          margin-top: 26px;
          padding: 0 clamp(18px, 2.5vw, 26px);
        }
        .insightPage .insightSection h2,
        .insightPage .insightTables h2,
        .insightPage .insightLinks h2,
        .insightPage .insightFaq h2 {
          margin: 0 0 10px;
          font-size: 22px;
          line-height: 1.15;
        }
        .insightPage .insightSection p {
          margin: 0;
          color: var(--text-muted);
          font-size: 16px;
          line-height: 1.75;
        }
        .insightPage .insightSection p + p {
          margin-top: 12px;
        }
        .insightPage .insightTables {
          display: grid;
          gap: 14px;
          margin-top: 24px;
        }
        .insightPage table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .insightPage th,
        .insightPage td {
          border-bottom: 1px solid var(--border);
          padding: 10px 8px;
          text-align: left;
          vertical-align: top;
        }
        .insightPage th {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .insightPage td:last-child {
          font-weight: 850;
        }
        .insightPage .insightLinks {
          margin-top: 18px;
        }
        .insightPage .insightLinkGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }
        .insightPage .insightLinkCard {
          display: grid;
          gap: 6px;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          color: var(--text);
          text-decoration: none;
        }
        .insightPage .insightLinkCard:hover,
        .insightPage .insightLinkCard:focus-visible {
          border-color: rgba(79, 70, 229, 0.35);
          background: var(--surface-2);
          outline: none;
        }
        .insightPage .insightLinkCard span {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.45;
        }
        .insightPage .insightFaq {
          margin-top: 26px;
          padding: 0 clamp(18px, 2.5vw, 26px);
        }
        .insightPage details {
          border: 1px solid var(--border);
          border-radius: 12px;
          background: #fff;
          padding: 12px 14px;
        }
        .insightPage details + details {
          margin-top: 10px;
        }
        .insightPage summary {
          cursor: pointer;
          color: var(--text);
          font-weight: 850;
        }
        .insightPage details p {
          margin: 10px 0 0;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .insightPage .insightSource {
          margin: 22px 0 0;
          padding: 0 clamp(18px, 2.5vw, 26px);
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.6;
        }
        @media (max-width: 760px) {
          .insightPage .insightLinkGrid {
            grid-template-columns: 1fr;
          }
          .insightPage .insightHero,
          .insightPage .insightFacts,
          .insightPage .insightLinks,
          .insightPage .insightTables > .card {
            padding: 18px;
          }
          .insightPage .insightSection,
          .insightPage .insightFaq,
          .insightPage .insightSource {
            padding-left: 2px;
            padding-right: 2px;
          }
        }
      `}</style>
    </>
  );
}
