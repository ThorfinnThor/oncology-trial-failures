import Head from "next/head";
import Link from "next/link";

import { serializeJsonLd } from "@/lib/serializeJsonLd";
import { CONTACT_EMAIL, SITE_OPERATOR } from "@/lib/siteContact";

const TITLE = "Imprint and legal notice | Clinical Trial Failures";
const DESCRIPTION =
  "Provider identification, editorial responsibility, contact details, and legal notices for Clinical Trial Failures.";
const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/imprint`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export default function ImprintPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: CANONICAL_URL,
    isPartOf: {
      "@type": "WebSite",
      name: "Clinical Trial Failures",
      url: SITE_URL,
    },
    accountablePerson: {
      "@type": "Person",
      name: SITE_OPERATOR.name,
      email: CONTACT_EMAIL,
      address: {
        "@type": "PostalAddress",
        streetAddress: SITE_OPERATOR.street,
        postalCode: SITE_OPERATOR.postalCode,
        addressLocality: SITE_OPERATOR.city,
        addressCountry: "DE",
      },
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
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      </Head>

      <main className="legalPage">
        <article className="legalShell">
          <header className="legalHeader">
            <Link href="/" className="imprintBackLink">← Home</Link>
            <p className="eyebrow">LEGAL INFORMATION</p>
            <h1>Imprint and legal notice</h1>
            <p>Provider identification for clinicaltrialfailures.com.</p>
            <p className="updated">Last updated: October 19, 2026</p>
          </header>

          <section className="identity" aria-labelledby="provider-heading">
            <h2 id="provider-heading">Provider identification under § 5 DDG</h2>
            <address>
              <strong>{SITE_OPERATOR.name}</strong>
              <br />
              {SITE_OPERATOR.street}
              <br />
              {SITE_OPERATOR.postalCode} {SITE_OPERATOR.city}
              <br />
              {SITE_OPERATOR.country}
            </address>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
            <p>
              You can also use the <Link href="/contact">contact form</Link> for corrections, privacy
              requests, methodology questions, and website issues.
            </p>
          </section>

          <section>
            <h2>Responsible for editorial content under § 18(2) MStV</h2>
            <address>
              {SITE_OPERATOR.name}
              <br />
              {SITE_OPERATOR.street}
              <br />
              {SITE_OPERATOR.postalCode} {SITE_OPERATOR.city}
              <br />
              {SITE_OPERATOR.country}
            </address>
          </section>

          <section>
            <h2>Nature of the service</h2>
            <p>
              Clinical Trial Failures is an independent research-support and information service. It is
              not affiliated with ClinicalTrials.gov, the U.S. National Library of Medicine, the National
              Institutes of Health, trial sponsors, regulators, or healthcare providers unless expressly
              stated otherwise.
            </p>
            <p>
              Public registry records and derived classifications are provided for research screening.
              They do not constitute medical, scientific, regulatory, investment, or legal advice. The
              applicable verification and liability limits are set out in the{" "}
              <Link href="/disclaimer">Disclaimer and limitations</Link>.
            </p>
          </section>

          <section>
            <h2>Liability for content</h2>
            <p>
              As a service provider, the operator is responsible for original content on these pages under
              general law. Registry data, sponsor-provided text, and other third-party information can be
              incomplete, delayed, amended, or incorrect. Important findings must be checked against the
              linked primary sources.
            </p>
          </section>

          <section>
            <h2>Liability for external links</h2>
            <p>
              This website links to external services whose content is outside the operator&apos;s control.
              The respective provider is responsible for its content. External links are reviewed when
              added and will be removed if the operator becomes aware of a legal violation.
            </p>
          </section>

          <section>
            <h2>Copyright, data, and trademarks</h2>
            <p>
              Original text, analysis, design, and software on this website are protected by applicable
              copyright law. Public clinical-trial information remains subject to the terms and attribution
              requirements of its original source. Product names, sponsor names, and other trademarks
              belong to their respective owners; their appearance does not imply endorsement or affiliation.
            </p>
          </section>

          <section>
            <h2>Consumer dispute resolution</h2>
            <p>
              The operator is neither obliged nor willing to participate in dispute-resolution proceedings
              before a consumer arbitration board.
            </p>
          </section>

          <section className="related">
            <h2>Related information</h2>
            <p>
              Read the <Link href="/privacy">Privacy Policy</Link>,{" "}
              <Link href="/disclaimer">Disclaimer and limitations</Link>, or{" "}
              <Link href="/methods">Data and methods</Link>.
            </p>
          </section>
        </article>
      </main>

      <style jsx>{`
        .legalPage {
          min-height: 100vh;
          padding: 32px 16px;
          background: #f8fafc;
          color: #0f172a;
        }
        .legalShell {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
        }
        .legalHeader {
          margin-bottom: 22px;
        }
        :global(.imprintBackLink) {
          display: inline-block;
          margin-bottom: 14px;
        }
        .eyebrow {
          margin-bottom: 8px;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 800;
        }
        h1 {
          margin: 0 0 10px;
          font-size: clamp(2rem, 5vw, 3rem);
          line-height: 1.05;
        }
        h2 {
          margin: 24px 0 8px;
          font-size: 1.12rem;
        }
        p,
        address {
          margin: 0;
          color: #334155;
          font-style: normal;
          line-height: 1.7;
        }
        p + p {
          margin-top: 10px;
        }
        a {
          color: #3730a3;
          font-weight: 700;
          text-decoration: none;
        }
        a:hover {
          text-decoration: underline;
        }
        .updated {
          margin-top: 12px;
          color: #64748b;
          font-size: 0.95rem;
          font-weight: 700;
        }
        .identity {
          margin: 20px 0 24px;
          padding: 18px;
          border: 1px solid #c7d2fe;
          border-left: 4px solid #4f46e5;
          border-radius: 8px;
          background: #eef2ff;
        }
        .identity h2 {
          margin-top: 0;
        }
        .related {
          margin-top: 28px;
          padding-top: 2px;
          border-top: 1px solid #e2e8f0;
        }
        @media (max-width: 600px) {
          .legalPage {
            padding: 16px 10px;
          }
          .legalShell {
            padding: 20px 16px;
            border-radius: 12px;
          }
        }
      `}</style>
    </>
  );
}
