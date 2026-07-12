import Head from "next/head";
import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";

const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "About Clinical Trial Failures | Source, scope, and data trust";
const DESCRIPTION =
  "About Clinical Trial Failures: a ClinicalTrials.gov-based research database for studying terminated, suspended, and withdrawn clinical trials.";
const CANONICAL_URL = `${SITE_URL}/about`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export default function AboutPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: TITLE,
      description: DESCRIPTION,
      url: CANONICAL_URL,
      isPartOf: {
        "@type": "WebSite",
        name: "Clinical Trial Failures",
        url: SITE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "About", item: CANONICAL_URL },
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
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
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
              <PrimaryNav active="guides" />
            </div>
          </div>
        </header>

        <main className="page">
          <article className="card p-4" style={{ maxWidth: 920, margin: "0 auto" }}>
            <p className="facet-title">About and data trust</p>
            <h1 style={{ margin: "0 0 12px", fontSize: 30, lineHeight: 1.1 }}>
              About Clinical Trial Failures
            </h1>
            <p className="muted" style={{ fontSize: 16, lineHeight: 1.7 }}>
              Clinical Trial Failures is a research tool for studying stopped clinical trials. It helps users
              search terminated, suspended, and withdrawn records and compare likely stop-reason signals such as
              efficacy, futility, safety, operational, enrollment, funding, regulatory, and other/unknown reasons.
            </p>

            <section style={{ marginTop: 24 }}>
              <h2>Primary source</h2>
              <p>
                The underlying records are derived from ClinicalTrials.gov registry data. Trial status, sponsor,
                phase, condition, intervention, update dates, and stop-reason text should be verified against the
                original ClinicalTrials.gov record before being used in medical, scientific, commercial, or
                investment decisions.
              </p>
            </section>

            <section style={{ marginTop: 24 }}>
              <h2>Methodology</h2>
              <p>
                The site groups sponsor-provided stop language into practical research buckets. These labels are
                screening signals, not final judgments. A stopped trial can have multiple causes, and registry
                text can be incomplete or change over time.
              </p>
              <p style={{ marginTop: 10 }}>
                The detailed methodology is available on the{" "}
                <Link className="link" href="/methods">
                  Methods page
                </Link>
                .
              </p>
            </section>

            <section style={{ marginTop: 24 }}>
              <h2>Important limitation</h2>
              <p>
                This website is for research support only. It does not provide medical advice, clinical
                recommendations, investment advice, or a substitute for reviewing primary source documents.
              </p>
            </section>

            <section style={{ marginTop: 24 }}>
              <h2>Contact and corrections</h2>
              <p>
                If a record appears incomplete or misclassified, verify the source ClinicalTrials.gov page first
                and use the methods page as the reference for how classifications are assigned. Corrections should
                be based on primary registry text or source documents.
              </p>
            </section>
          </article>
        </main>
      </div>
    </>
  );
}
