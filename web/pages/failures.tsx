import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";

import GuidesMenu from "@/components/GuidesMenu";
import { buildFailureHubs, OG_IMAGE, SITE_URL } from "@/lib/seoHubs";

type FailureDirectoryProps = {
  hubs: Array<{ path: string; h1: string; description: string; total: number; kind: string }>;
};

const TITLE = "Clinical trial failure hubs | Disease, phase, and stop-reason pages";
const DESCRIPTION =
  "Browse indexable clinical trial failure hubs by disease area, phase, and stop reason, with grouped ClinicalTrials.gov-derived stopped trial records.";
const CANONICAL_URL = `${SITE_URL}/failures`;

export default function FailureDirectoryPage({ hubs }: FailureDirectoryProps) {
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
      </Head>
      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <nav className="nav" aria-label="Primary">
                <Link className="navlink" href="/explore">Explore</Link>
                <Link className="navlink" href="/overview">Overview</Link>
                <GuidesMenu />
                <Link className="navlink" href="/methods">Methods</Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="page">
          <section className="card p-4" style={{ maxWidth: 1120, margin: "0 auto" }}>
            <p className="facet-title">Failure hubs</p>
            <h1 style={{ margin: "0 0 10px", fontSize: 30 }}>Clinical trial failure hubs</h1>
            <p className="muted" style={{ lineHeight: 1.65 }}>
              Browse grouped pages for stopped clinical trials by disease area, phase, and stop-reason signal.
              These pages summarize slices of the dataset and link to crawlable trial records.
            </p>
            <div className="hubDirGrid">
              {hubs.map((hub) => (
                <Link className="hubDirCard" href={hub.path} key={hub.path}>
                  <span>{hub.kind}</span>
                  <strong>{hub.h1}</strong>
                  <p>{hub.description}</p>
                  <em>{hub.total.toLocaleString()} trials</em>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
      <style jsx>{`
        .hubDirGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .hubDirCard {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 190px;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          background: #fff;
        }
        .hubDirCard span {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .hubDirCard strong {
          color: var(--accent);
          line-height: 1.25;
        }
        .hubDirCard p {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.45;
        }
        .hubDirCard em {
          margin-top: auto;
          font-style: normal;
          font-weight: 900;
        }
        @media (max-width: 900px) {
          .hubDirGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

export const getStaticProps: GetStaticProps<FailureDirectoryProps> = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  return {
    props: {
      hubs: buildFailureHubs(rows).map((hub) => ({
        path: hub.path,
        h1: hub.h1,
        description: hub.description,
        total: hub.total,
        kind: hub.kind,
      })),
    },
  };
};
