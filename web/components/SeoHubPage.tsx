import Head from "next/head";
import Link from "next/link";

import GuidesMenu from "@/components/GuidesMenu";
import type { TrialIndexRow } from "@/lib/types";
import { displayHubRows, hubStats, OG_IMAGE, SITE_URL, trialListItem, type HubStats } from "@/lib/seoHubs";

type HubMeta = {
  title: string;
  h1: string;
  description: string;
  path: string;
  label: string;
  total: number;
  eyebrow: string;
};

type SeoHubPageProps = {
  hub: HubMeta;
  rows: TrialIndexRow[];
  stats?: HubStats;
  parentHref: string;
  parentLabel: string;
};

export default function SeoHubPage({ hub, rows, stats: providedStats, parentHref, parentLabel }: SeoHubPageProps) {
  const stats = providedStats || hubStats(rows);
  const visibleRows = displayHubRows(rows);
  const canonicalUrl = `${SITE_URL}${hub.path}`;
  const items = visibleRows.map(trialListItem);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: parentLabel, item: `${SITE_URL}${parentHref}` },
        { "@type": "ListItem", position: 3, name: hub.label, item: canonicalUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: hub.h1,
      description: hub.description,
      url: canonicalUrl,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: items.length,
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          url: `${SITE_URL}${item.href}`,
          name: `${item.id}: ${item.title}`,
        })),
      },
    },
  ];

  return (
    <>
      <Head>
        <title>{hub.title}</title>
        <meta name="description" content={hub.description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={hub.title} />
        <meta property="og:description" content={hub.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Clinical Trial Failures database preview" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={hub.title} />
        <meta name="twitter:description" content={hub.description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <nav className="nav" aria-label="Primary">
                <Link className="navlink" href="/explore">
                  Explore
                </Link>
                <Link className="navlink" href="/overview">
                  Overview
                </Link>
                <GuidesMenu />
                <Link className="navlink" href="/sponsor-insights">
                  Sponsor insights
                </Link>
                <Link className="navlink" href="/methods">
                  Methods
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="page">
          <article style={{ maxWidth: 1120, margin: "0 auto" }}>
            <nav className="muted" aria-label="Breadcrumb" style={{ fontSize: 13, marginBottom: 12 }}>
              <Link className="link" href="/">
                Home
              </Link>{" "}
              /{" "}
              <Link className="link" href={parentHref}>
                {parentLabel}
              </Link>{" "}
              / <span>{hub.label}</span>
            </nav>

            <section className="card p-4">
              <p className="facet-title">{hub.eyebrow}</p>
              <h1 style={{ margin: "0 0 10px", fontSize: 30, lineHeight: 1.1 }}>{hub.h1}</h1>
              <p style={{ maxWidth: 840, lineHeight: 1.7 }}>{hub.description}</p>
              <p className="muted" style={{ marginTop: 12, lineHeight: 1.6 }}>
                This page groups real ClinicalTrials.gov-derived stopped trial records. The strongest added
                signal is the stop-reason classification: {stats.scientificCount.toLocaleString()} of these
                records are likely biological failure signals, while the rest may reflect operational,
                strategic, regulatory, funding, enrollment, or unclear stop reasons.
              </p>

              <div className="seoHubStats" aria-label="Hub summary">
                <div>
                  <span>Total stopped trials</span>
                  <strong>{stats.total.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Likely biological signals</span>
                  <strong>{stats.scientificCount.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Shown below</span>
                  <strong>{items.length.toLocaleString()}</strong>
                </div>
              </div>
            </section>

            <section className="seoHubGrid">
              <div className="card p-4">
                <h2>Dominant stop reasons</h2>
                <dl className="seoHubList">
                  {stats.topBuckets.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.count.toLocaleString()}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="card p-4">
                <h2>Notable sponsors</h2>
                <dl className="seoHubList">
                  {stats.topSponsors.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.count.toLocaleString()}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="card p-4">
                <h2>Related phases</h2>
                <dl className="seoHubList">
                  {stats.topPhases.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.count.toLocaleString()}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            <section className="card p-4" style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0 }}>Crawlable stopped-trial records</h2>
                <Link className="btn" href="/explore">
                  Open Explore
                </Link>
              </div>
              <p className="muted" style={{ marginTop: 8, lineHeight: 1.55 }}>
                Showing up to {items.length.toLocaleString()} representative records from this slice. Each link
                opens the trial detail page with source attribution and stop-reason context.
              </p>

              <div className="seoTrialList">
                {items.map((item) => (
                  <article className="seoTrialCard" key={item.id}>
                    <Link className="seoTrialTitle" href={item.href}>
                      {item.id}: {item.title}
                    </Link>
                    <p>
                      {item.phase} {item.condition} trial by {item.sponsor}. Stop reason: {item.bucket}.
                    </p>
                    <p className="muted">{item.why}</p>
                  </article>
                ))}
              </div>
            </section>
          </article>
        </main>
      </div>

      <style jsx>{`
        h2 {
          margin: 0 0 10px;
          font-size: 18px;
          line-height: 1.2;
        }
        .seoHubStats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .seoHubStats div {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
          background: var(--surface-2);
        }
        .seoHubStats span {
          display: block;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .seoHubStats strong {
          display: block;
          margin-top: 5px;
          font-size: 22px;
        }
        .seoHubGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }
        .seoHubList {
          margin: 0;
          display: grid;
          gap: 9px;
        }
        .seoHubList div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 8px;
        }
        .seoHubList div:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }
        .seoHubList dt,
        .seoHubList dd {
          margin: 0;
        }
        .seoHubList dt {
          font-weight: 750;
        }
        .seoHubList dd {
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }
        .seoTrialList {
          display: grid;
          gap: 12px;
          margin-top: 14px;
        }
        .seoTrialCard {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 13px;
          background: #fff;
        }
        .seoTrialTitle {
          display: inline-block;
          color: var(--accent);
          font-weight: 900;
          line-height: 1.35;
        }
        .seoTrialCard p {
          margin: 7px 0 0;
          line-height: 1.5;
        }
        @media (max-width: 820px) {
          .seoHubStats,
          .seoHubGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
