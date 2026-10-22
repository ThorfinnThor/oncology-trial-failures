import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";

import PrimaryNav from "@/components/PrimaryNav";
import briefsIndex from "@/data/briefs_index.json";
import { serializeJsonLd } from "@/lib/serializeJsonLd";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/use-cases`;
const TITLE = "Who uses Clinical Trial Failures: in-licensing, investment diligence, study design";
const DESCRIPTION =
  "Three questions the database answers from registry evidence: has a drug with this target failed before, how often does a sponsor stop for biological reasons, and why do trials like mine stop.";

// Each example is read from the current data at build time, so the numbers on this page are the
// numbers on the pages it links to.
type Props = {
  licensing: { segment: string; slug: string; missed: number; readable: number; stops: number; closed: number } | null;
  sponsor: { label: string; path: string; total: number; biological: number } | null;
  recruitment: { stops: number; total: number; biological: number };
};

type Brief = (typeof briefsIndex.briefs)[number];

export const getStaticProps: GetStaticProps<Props> = async () => {
  const { loadIndexServer, loadMetaServer } = await import("@/lib/server-data");
  const { buildSponsorHubs, sponsorEvidenceStats } = await import("@/lib/seoHubs");
  const [rows, meta] = await Promise.all([loadIndexServer(), loadMetaServer()]);

  const tigit = (briefsIndex.briefs as Brief[]).find((brief) => brief.slug === "oncology-tigit");
  const endpoints = (tigit as any)?.endpoints;
  const licensing = tigit
    ? {
        segment: tigit.segment,
        slug: tigit.slug,
        missed: endpoints?.missed || 0,
        readable: endpoints?.readable || 0,
        stops: tigit.biological_stops,
        closed: tigit.closed,
      }
    : null;

  const hubs = buildSponsorHubs(rows).map((hub) => ({
    label: hub.label,
    path: hub.path,
    total: hub.total,
    biological: sponsorEvidenceStats(hub.rows).biologicalCount,
  }));
  const sponsor = hubs.sort((a, b) => b.biological - a.biological)[0] || null;

  const reasons = (meta as any)?.classification_v2?.primary_reasons || {};
  return {
    props: {
      licensing,
      sponsor,
      recruitment: {
        stops: reasons.RECRUITMENT || 0,
        total: (meta as any)?.all?.record_count || rows.length,
        biological: (reasons.EFFICACY_FUTILITY || 0) + (reasons.SAFETY || 0),
      },
    },
  };
};

const n = (value: number) => value.toLocaleString("en-US");

export default function UseCasesPage({ licensing, sponsor, recruitment }: Props) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: TITLE,
      description: DESCRIPTION,
      url: CANONICAL_URL,
      isPartOf: { "@type": "WebSite", name: "Clinical Trial Failures", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Who it's for", item: CANONICAL_URL },
      ],
    },
  ];

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
        <meta property="og:type" content="website" />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
            <PrimaryNav active="use-cases" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="useWrap">
          <p className="useEyebrow">Who it&apos;s for</p>
          <h1>Three questions, answered from the registry record</h1>
          <p className="useLead">
            Clinical Trial Failures reads why {n(recruitment.total)} stopped clinical trials stopped, and which completed
            trials missed their primary endpoint. It is built for people who have to decide whether a mechanism, a
            programme or a trial design is worth the next dollar. Everything below is free to use during the beta.
          </p>

          <div className="useGrid">
            <article className="card useCase">
              <span className="useTag">01 · In-licensing and business development</span>
              <h2>Has a drug with this target failed before?</h2>
              <p>
                Before an asset goes to a licensing committee, the question is whether its mechanism has already been
                tested and stopped, and whether the stops were the biology or the business.
              </p>
              {licensing ? (
                <p className="useExample">
                  <b>Example:</b> in {licensing.segment}, {licensing.missed} of {licensing.readable} completed trials with a
                  readable primary result missed it, while only {licensing.stops} of {n(licensing.closed)} closed trials were
                  stopped early for a biological reason. A stop count alone would have hidden that.
                </p>
              ) : null}
              <div className="useLinks">
                <Link href="/asset-check">Check a molecule or target</Link>
                {licensing ? <Link href={`/briefs/${licensing.slug}`}>Read the {licensing.segment} brief</Link> : null}
              </div>
            </article>

            <article className="card useCase">
              <span className="useTag">02 · Investment diligence</span>
              <h2>How often does this sponsor stop for biological reasons?</h2>
              <p>
                A pipeline&apos;s stopped trials say different things depending on why they stopped. Separate efficacy and
                safety stops from recruitment, funding and portfolio decisions before reading anything into a count.
              </p>
              {sponsor ? (
                <p className="useExample">
                  <b>Example:</b> {sponsor.label} has {n(sponsor.total)} stopped trials in the dataset, of which{" "}
                  {n(sponsor.biological)} carry a likely biological stop reason. Each one links to the sponsor&apos;s own
                  registry wording.
                </p>
              ) : null}
              <div className="useLinks">
                {sponsor ? <Link href={sponsor.path}>Open the {sponsor.label} profile</Link> : null}
                <Link href="/sponsors">All sponsor profiles</Link>
              </div>
            </article>

            <article className="card useCase">
              <span className="useTag">03 · Clinical strategy and study design</span>
              <h2>Why do trials like mine stop?</h2>
              <p>
                Most stopped trials did not fail on the drug. Knowing which operational causes dominate in a disease area
                and phase is a design input, not a footnote.
              </p>
              <p className="useExample">
                <b>Example:</b> recruitment is the stated primary reason for {n(recruitment.stops)} of the{" "}
                {n(recruitment.total)} stopped trials
                {recruitment.stops > recruitment.biological
                  ? `, against ${n(recruitment.biological)} for efficacy, futility or safety combined.`
                  : "."}
              </p>
              <div className="useLinks">
                <Link href="/clinical-trial-enrollment-failure">Recruitment failures</Link>
                <Link href="/explore">Filter the trials</Link>
              </div>
            </article>
          </div>

          <section className="card useHow">
            <h2>What you get, and what you do not</h2>
            <ul>
              <li>Every classification links to the ClinicalTrials.gov record and quotes the sponsor&apos;s own stop reason.</li>
              <li>
                Biological-failure precision on a blind, double-annotated held-out sample is published on the{" "}
                <Link className="link" href="/validation">validation page</Link>.
              </li>
              <li>It is a screening signal from registry text, not a medical, regulatory or investment conclusion.</li>
            </ul>
            <div className="useLinks">
              <Link href="/newsletter">Get newly stopped trials every two weeks</Link>
              <Link href="/methods">Read the method</Link>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{`
        .useWrap {
          max-width: 1100px;
          margin: 0 auto;
        }
        .useEyebrow,
        .useTag {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        h1 {
          margin: 8px 0 0;
          font-size: clamp(1.9rem, 4vw, 2.8rem);
          line-height: 1.1;
          letter-spacing: 0;
        }
        .useLead {
          max-width: 760px;
          margin: 14px 0 0;
          color: #334155;
          font-size: 16px;
          line-height: 1.65;
        }
        .useGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-top: 26px;
        }
        .useCase,
        .useHow {
          display: flex;
          flex-direction: column;
          padding: 22px;
        }
        .useCase h2,
        .useHow h2 {
          margin: 10px 0 0;
          font-size: 19px;
          line-height: 1.3;
          letter-spacing: 0;
        }
        .useCase p {
          margin: 12px 0 0;
          color: #334155;
          font-size: 14px;
          line-height: 1.6;
        }
        .useCase .useExample {
          padding: 12px 14px;
          border-left: 3px solid var(--accent);
          background: #eef2ff;
          color: #1e293b;
        }
        .useLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          margin-top: auto;
          padding-top: 16px;
          font-size: 13px;
          font-weight: 800;
        }
        .useLinks :global(a) {
          color: var(--accent);
        }
        .useLinks :global(a:hover) {
          text-decoration: underline;
        }
        .useHow {
          margin-top: 16px;
        }
        .useHow ul {
          margin: 12px 0 0;
          padding-left: 18px;
          color: #334155;
          font-size: 14px;
          line-height: 1.7;
        }
        @media (max-width: 900px) {
          .useGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
