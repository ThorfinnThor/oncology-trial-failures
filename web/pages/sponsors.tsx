import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";

import GuidesMenu from "@/components/GuidesMenu";
import { buildSponsorHubs, OG_IMAGE, SITE_URL } from "@/lib/seoHubs";

type SponsorDirectoryProps = {
  hubs: Array<{ path: string; h1: string; description: string; total: number }>;
};

const TITLE = "Clinical trial failure sponsor hubs | Stopped trials by sponsor";
const DESCRIPTION =
  "Browse sponsor-specific clinical trial failure hubs for organizations with enough stopped trial records to support meaningful analysis.";
const CANONICAL_URL = `${SITE_URL}/sponsors`;

export default function SponsorDirectoryPage({ hubs }: SponsorDirectoryProps) {
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
                <Link className="navlink" href="/sponsor-insights">Sponsor insights</Link>
                <GuidesMenu />
                <Link className="navlink" href="/methods">Methods</Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="page">
          <section className="card p-4" style={{ maxWidth: 1120, margin: "0 auto" }}>
            <p className="facet-title">Sponsor hubs</p>
            <h1 style={{ margin: "0 0 10px", fontSize: 30 }}>Clinical trial failure sponsor hubs</h1>
            <p className="muted" style={{ lineHeight: 1.65 }}>
              Browse sponsor pages for organizations with at least five stopped clinical trial records in the
              dataset. Each page summarizes stop reasons, phases, disease areas, and linked trial records.
            </p>
            <div className="sponsorList">
              {hubs.map((hub) => (
                <Link className="sponsorRow" href={hub.path} key={hub.path}>
                  <strong>{hub.h1}</strong>
                  <span>{hub.total.toLocaleString()} trials</span>
                  <p>{hub.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
      <style jsx>{`
        .sponsorList {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }
        .sponsorRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px 16px;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          background: #fff;
        }
        .sponsorRow strong {
          color: var(--accent);
          line-height: 1.3;
        }
        .sponsorRow span {
          font-weight: 900;
          white-space: nowrap;
        }
        .sponsorRow p {
          grid-column: 1 / -1;
          margin: 0;
          color: var(--text-muted);
          line-height: 1.45;
        }
        @media (max-width: 640px) {
          .sponsorRow {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}

export const getStaticProps: GetStaticProps<SponsorDirectoryProps> = async () => {
  const { loadIndexServer } = await import("@/lib/server-data");
  const rows = await loadIndexServer();
  return {
    props: {
      hubs: buildSponsorHubs(rows).map((hub) => ({
        path: hub.path,
        h1: hub.h1,
        description: hub.description,
        total: hub.total,
      })),
    },
  };
};
