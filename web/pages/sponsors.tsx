import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";

import PrimaryNav from "@/components/PrimaryNav";
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
              <PrimaryNav active="guides" />
            </div>
          </div>
        </header>
        <main className="page sponsorDirectoryPage">
          <section className="card p-4 directoryHero">
            <p className="facet-title">Sponsor hubs</p>
            <h1>Clinical trial failure sponsor hubs</h1>
            <p className="muted directoryIntro">
              Browse sponsor pages for organizations with at least ten stopped clinical trial records in the
              dataset. Each page summarizes stop reasons, phases, disease areas, and linked trial records.
            </p>
            <div className="sponsorList">
              {hubs.map((hub) => (
                <Link className="sponsorRow" href={hub.path} key={hub.path}>
                  <strong>{hub.h1}</strong>
                  <span className="sponsorCount">{hub.total.toLocaleString()} trials</span>
                  <p>{hub.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
      <style jsx global>{`
        .sponsorDirectoryPage .directoryHero {
          max-width: 1120px;
          margin: 0 auto;
        }
        .sponsorDirectoryPage h1 {
          margin: 0 0 10px;
          font-size: 30px;
          line-height: 1.12;
          letter-spacing: 0;
        }
        .sponsorDirectoryPage .directoryIntro {
          max-width: 980px;
          line-height: 1.65;
        }
        .sponsorDirectoryPage .sponsorList {
          display: grid;
          gap: 10px;
          margin-top: 18px;
        }
        .sponsorDirectoryPage .sponsorRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px 16px;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 14px;
          background: #fff;
          color: var(--text);
          text-decoration: none;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.035);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }
        .sponsorDirectoryPage .sponsorRow:hover,
        .sponsorDirectoryPage .sponsorRow:focus-visible {
          border-color: rgba(79, 70, 229, 0.35);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.075);
          transform: translateY(-1px);
          outline: none;
        }
        .sponsorDirectoryPage .sponsorRow strong {
          color: var(--accent);
          line-height: 1.3;
          font-size: 16px;
        }
        .sponsorDirectoryPage .sponsorCount {
          font-weight: 900;
          white-space: nowrap;
          color: var(--text);
        }
        .sponsorDirectoryPage .sponsorRow p {
          grid-column: 1 / -1;
          margin: 0;
          color: var(--text-muted);
          line-height: 1.45;
        }
        @media (max-width: 640px) {
          .sponsorDirectoryPage .sponsorRow {
            grid-template-columns: 1fr;
          }
          .sponsorDirectoryPage h1 {
            font-size: 26px;
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
