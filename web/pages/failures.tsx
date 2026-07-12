import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";

import PrimaryNav from "@/components/PrimaryNav";
import { buildFailureHubs, OG_IMAGE, SITE_URL } from "@/lib/seoHubs";

type FailureDirectoryProps = {
  hubs: Array<{ path: string; h1: string; description: string; total: number; kind: string }>;
};

const TITLE = "Clinical trial failure hubs | Disease, phase, and stop-reason pages";
const DESCRIPTION =
  "Browse indexable clinical trial failure hubs by disease area, phase, and stop reason, with grouped ClinicalTrials.gov-derived stopped trial records.";
const CANONICAL_URL = `${SITE_URL}/failures`;

function kindLabel(kind: string): string {
  if (kind === "area") return "Disease area";
  if (kind === "phase") return "Trial phase";
  if (kind === "reason") return "Stop reason";
  return "Failure hub";
}

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
              <PrimaryNav active="guides" />
            </div>
          </div>
        </header>
        <main className="page failureDirectoryPage">
          <section className="card p-4 directoryHero">
            <p className="facet-title">Failure hubs</p>
            <h1>Clinical trial failure hubs</h1>
            <p className="muted directoryIntro">
              Browse grouped pages for stopped clinical trials by disease area, phase, and stop-reason signal.
              These pages summarize slices of the dataset and link to crawlable trial records.
            </p>
            <div className="hubDirGrid">
              {hubs.map((hub) => (
                <Link className="hubDirCard" href={hub.path} key={hub.path}>
                  <span className="hubDirType">{kindLabel(hub.kind)}</span>
                  <strong>{hub.h1}</strong>
                  <p>{hub.description}</p>
                  <em>{hub.total.toLocaleString()} trials</em>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
      <style jsx global>{`
        .failureDirectoryPage .directoryHero {
          max-width: 1120px;
          margin: 0 auto;
        }
        .failureDirectoryPage h1 {
          margin: 0 0 10px;
          font-size: 30px;
          line-height: 1.12;
          letter-spacing: 0;
        }
        .failureDirectoryPage .directoryIntro {
          max-width: 960px;
          line-height: 1.65;
        }
        .failureDirectoryPage .hubDirGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .failureDirectoryPage .hubDirCard {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 190px;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 14px;
          background: #fff;
          color: var(--text);
          text-decoration: none;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.04);
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }
        .failureDirectoryPage .hubDirCard:hover,
        .failureDirectoryPage .hubDirCard:focus-visible {
          border-color: rgba(79, 70, 229, 0.35);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
          transform: translateY(-1px);
          outline: none;
        }
        .failureDirectoryPage .hubDirType {
          display: block;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .failureDirectoryPage .hubDirCard strong {
          display: block;
          color: var(--accent);
          line-height: 1.25;
          font-size: 16px;
        }
        .failureDirectoryPage .hubDirCard p {
          margin: 0;
          color: var(--text-muted);
          line-height: 1.45;
        }
        .failureDirectoryPage .hubDirCard em {
          margin-top: auto;
          font-style: normal;
          font-weight: 900;
          color: var(--text);
        }
        @media (max-width: 900px) {
          .failureDirectoryPage .hubDirGrid {
            grid-template-columns: 1fr;
          }
          .failureDirectoryPage h1 {
            font-size: 26px;
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
