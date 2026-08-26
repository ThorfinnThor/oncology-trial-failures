import Head from "next/head";
import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";
import { ORGANIZATION_ID } from "@/lib/siteIdentity";

const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "Contact | Clinical Trial Failures";
const DESCRIPTION =
  "Contact Clinical Trial Failures for data corrections, source issues, methodology questions, and website feedback.";
const CANONICAL_URL = `${SITE_URL}/contact`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const CONTACT_EMAIL = "contact@clinicaltrialfailures.com";
const DATA_CORRECTION_MAILTO =
  `mailto:${CONTACT_EMAIL}?subject=Clinical%20Trial%20Failures%20data%20correction&body=Please%20include%3A%0A-%20NCT%20ID%3A%0A-%20Page%20URL%3A%0A-%20Current%20source%20text%3A%0A-%20Suggested%20correction%3A%0A-%20Primary%20source%20link%3A`;
const WEBSITE_FEEDBACK_MAILTO =
  `mailto:${CONTACT_EMAIL}?subject=Clinical%20Trial%20Failures%20website%20feedback&body=Please%20include%3A%0A-%20Page%20URL%3A%0A-%20Browser%20and%20device%3A%0A-%20What%20is%20broken%20or%20unclear%3A`;

export default function ContactPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      name: TITLE,
      description: DESCRIPTION,
      url: CANONICAL_URL,
      isPartOf: {
        "@type": "WebSite",
        name: "Clinical Trial Failures",
        url: SITE_URL,
      },
      mainEntity: {
        "@id": ORGANIZATION_ID,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Contact", item: CANONICAL_URL },
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

      <div className="min-h-screen contactPage">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <PrimaryNav />
            </div>
          </div>
        </header>

        <main className="page">
          <article className="contactShell">
            <header className="contactHeader">
              <p className="facet-title">Contact</p>
              <h1>Contact Clinical Trial Failures</h1>
              <p>
                Use this page for data corrections, source questions, methodology feedback, and website issues.
                For any trial-specific concern, please include the NCT ID and the exact source text you want reviewed.
              </p>
              <p className="contactEmail">
                Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            </header>

            <section className="contactGrid" aria-label="Contact options">
              <div className="contactCard">
                <h2>Data corrections</h2>
                <p>
                  If a record looks incomplete, misclassified, or outdated, please verify the ClinicalTrials.gov
                  source page first and include the NCT ID, the current source text, and the correction you suggest.
                </p>
                <a href={DATA_CORRECTION_MAILTO}>
                  Email a correction →
                </a>
              </div>

              <div className="contactCard">
                <h2>Methodology questions</h2>
                <p>
                  The site classifies registry stop language into research buckets such as efficacy/futility,
                  safety, operational, enrollment, regulatory, and other/unknown. These are screening signals,
                  not medical conclusions.
                </p>
                <Link href="/methods">Read how classification works →</Link>
              </div>

              <div className="contactCard">
                <h2>Website feedback</h2>
                <p>
                  If something is broken, unclear, or hard to use on mobile or desktop, send the page URL,
                  browser, device, and a short description of the issue.
                </p>
                <a href={WEBSITE_FEEDBACK_MAILTO}>
                  Email website feedback →
                </a>
              </div>
            </section>

            <section className="contactNote">
              <h2>Important note</h2>
              <p>
                Clinical Trial Failures is a research-support website. It does not provide medical advice,
                investment advice, clinical recommendations, or a substitute for primary source review.
              </p>
              <div className="contactLinks">
                <Link href="/about">About and data trust</Link>
                <Link href="/privacy">Privacy Policy</Link>
              </div>
            </section>
          </article>
        </main>
      </div>

      <style jsx>{`
        .contactPage {
          background: #f8fafc;
          color: #0f172a;
        }

        .contactShell {
          max-width: 980px;
          margin: 0 auto;
          background: #ffffff;
          border: 1px solid #dbe4f0;
          border-radius: 14px;
          padding: clamp(20px, 3vw, 32px);
          box-shadow: 0 18px 48px rgba(15, 23, 42, 0.06);
        }

        .contactHeader {
          max-width: 760px;
        }

        .contactHeader h1 {
          margin: 0 0 12px;
          font-size: clamp(30px, 4vw, 46px);
          line-height: 1.04;
          letter-spacing: 0;
        }

        .contactHeader p,
        .contactEmail,
        .contactCard p,
        .contactNote p {
          margin: 0;
          color: #334155;
          font-size: 16px;
          line-height: 1.7;
        }

        .contactEmail {
          margin-top: 12px;
          font-weight: 800;
        }

        .contactEmail a {
          color: #3730a3;
          text-decoration: none;
        }

        .contactEmail a:hover {
          text-decoration: underline;
        }

        .contactGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 28px;
        }

        .contactCard,
        .contactNote {
          border: 1px solid #dbe4f0;
          border-radius: 12px;
          background: #ffffff;
          padding: 18px;
        }

        .contactCard h2,
        .contactNote h2 {
          margin: 0 0 10px;
          font-size: 18px;
          line-height: 1.25;
        }

        .contactCard a,
        .contactLinks :global(a) {
          display: inline-block;
          margin-top: 14px;
          color: #3730a3;
          font-weight: 800;
          text-decoration: none;
        }

        .contactCard a:hover,
        .contactLinks :global(a:hover) {
          text-decoration: underline;
        }

        .contactNote {
          margin-top: 14px;
          background: #f8fafc;
        }

        .contactLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 14px 20px;
          margin-top: 2px;
        }

        @media (max-width: 860px) {
          .contactGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
