import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";

import PrimaryNav from "@/components/PrimaryNav";
import { hydrateInsightArticles, INSIGHTS_BASE_URL, insightPath, type InsightArticle } from "@/lib/insights";
import { buildInsightStats } from "@/lib/insightStats";

const TITLE = "Clinical trial failure insights | Data-backed research notes";
const DESCRIPTION =
  "Research notes from the Clinical Trial Failures database, using stopped clinical trial records, failure signals, sponsors, phases, and disease areas.";
const CANONICAL_URL = `${INSIGHTS_BASE_URL}/insights`;
const OG_IMAGE = `${INSIGHTS_BASE_URL}/og-image.png`;

type InsightsIndexPageProps = {
  articles: InsightArticle[];
};

export const getStaticProps: GetStaticProps<InsightsIndexPageProps> = async () => {
  const stats = await buildInsightStats();
  return {
    props: {
      articles: hydrateInsightArticles(stats),
    },
  };
};

export default function InsightsIndexPage({ articles }: InsightsIndexPageProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL_URL,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: articles.map((article, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${INSIGHTS_BASE_URL}${insightPath(article)}`,
        name: article.title,
      })),
    },
  };

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
        <meta name="twitter:card" content="summary_large_image" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <div className="insightsIndex min-h-screen">
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
          <section className="card p-4 insightsHero">
            <p className="facet-title">Research notes</p>
            <h1>Clinical trial failure insights</h1>
            <p>
              Short, data-backed notes from the stopped-trial database. The goal is simple: use real numbers
              from the dataset, then link back to the records and methodology.
            </p>
            <Link href="/reports/latest-two-week-stopped-trial-updates" className="latestReportLink">
              Open the automatically calculated two-week report →
            </Link>
          </section>

          <section className="insightsGrid" aria-label="Insight articles">
            {articles.map((article) => (
              <Link href={insightPath(article)} className="insightCard card p-4" key={article.slug}>
                <span className="facet-title">{article.eyebrow}</span>
                <h2>{article.title}</h2>
                <p>{article.dek}</p>
                <div>
                  <span>{article.datePublished}</span>
                  <span>{article.readingTime}</span>
                </div>
              </Link>
            ))}
          </section>
        </main>
      </div>

      <style jsx global>{`
        .insightsIndex .insightsHero {
          max-width: 960px;
          margin: 0 auto 16px;
        }
        .insightsIndex .insightsHero h1 {
          margin: 4px 0 0;
          font-size: 32px;
          line-height: 1.1;
        }
        .insightsIndex .insightsHero p {
          max-width: 760px;
          margin: 12px 0 0;
          color: var(--text-muted);
          line-height: 1.65;
        }
        .insightsIndex .latestReportLink {
          display: inline-flex;
          margin-top: 16px;
          color: var(--accent);
          font-weight: 850;
        }
        .insightsIndex .latestReportLink:hover,
        .insightsIndex .latestReportLink:focus-visible {
          text-decoration: underline;
          text-underline-offset: .18em;
        }
        .insightsIndex .insightsGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          max-width: 960px;
          margin: 0 auto;
        }
        .insightsIndex .insightCard {
          display: flex;
          flex-direction: column;
          color: var(--text);
          text-decoration: none;
          min-height: 230px;
        }
        .insightsIndex .insightCard:hover,
        .insightsIndex .insightCard:focus-visible {
          border-color: rgba(79, 70, 229, 0.35);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
          outline: none;
        }
        .insightsIndex .insightCard h2 {
          margin: 8px 0 0;
          font-size: 22px;
          line-height: 1.15;
        }
        .insightsIndex .insightCard p {
          margin: 12px 0 0;
          color: var(--text-muted);
          line-height: 1.6;
        }
        .insightsIndex .insightCard div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: auto;
          padding-top: 16px;
        }
        .insightsIndex .insightCard div span {
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface-2);
          padding: 5px 9px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 800;
        }
        @media (max-width: 760px) {
          .insightsIndex .insightsGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
