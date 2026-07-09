import Head from "next/head";
import Link from "next/link";

import { OG_IMAGE, SITE_URL, type SeoLandingPageConfig } from "../lib/seoLandingPages";

type SeoLandingPageProps = {
  page: SeoLandingPageConfig;
};

export default function SeoLandingPage({ page }: SeoLandingPageProps) {
  const canonicalUrl = `${SITE_URL}${page.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.h1,
      description: page.metaDescription,
      url: canonicalUrl,
      image: OG_IMAGE,
      author: {
        "@type": "Organization",
        name: "Clinical Trial Failures",
        url: SITE_URL,
      },
      publisher: {
        "@type": "Organization",
        name: "Clinical Trial Failures",
      },
      mainEntityOfPage: canonicalUrl,
      about: ["clinical trial failures", "terminated clinical trials", "ClinicalTrials.gov"],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.eyebrow,
          item: canonicalUrl,
        },
      ],
    },
  ];

  return (
    <>
      <Head>
        <title>{page.title}</title>
        <meta name="description" content={page.metaDescription} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.metaDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Clinical Trial Failures database preview" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.title} />
        <meta name="twitter:description" content={page.metaDescription} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <div className="seoPage">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand" aria-label="Go to homepage">
                Clinical trial failures
              </Link>
              <nav className="nav" aria-label="Primary">
                <Link className="navlink" href="/explore">
                  Explore
                </Link>
                <Link className="navlink" href="/overview">
                  Overview
                </Link>
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

        <main>
          <section className="seoHero">
            <div className="seoContainer seoHeroGrid">
              <div>
                <p className="seoEyebrow">{page.eyebrow}</p>
                <h1>{page.h1}</h1>
                <p className="seoLede">{page.lede}</p>
                <div className="seoActions">
                  <Link href={page.primaryCta.href} className="seoPrimaryBtn">
                    <span>{page.primaryCta.label}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link href={page.secondaryCta.href} className="seoSecondaryBtn">
                    <span>{page.secondaryCta.label}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>

              <aside className="seoSignalCard" aria-label="Key points">
                <span className="seoCardLabel">Fast summary</span>
                <h2>What to know</h2>
                <ul>
                  {page.keyPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </aside>
            </div>
          </section>

          <section className="seoSection">
            <div className="seoContainer seoContentGrid">
              <article className="seoArticle">
                {page.sections.map((section) => (
                  <section key={section.heading} className="seoArticleBlock">
                    <h2>{section.heading}</h2>
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </section>
                ))}
              </article>

              <aside className="seoAside" aria-label="Research links">
                <div className="seoAsideCard">
                  <h2>Research workflow</h2>
                  <ol>
                    <li>Start with a keyword or sponsor search.</li>
                    <li>Filter by phase, status, disease area, and stop reason.</li>
                    <li>Open the source registry record before making decisions.</li>
                  </ol>
                </div>
                <div className="seoAsideCard">
                  <h2>Source note</h2>
                  <p>
                    The database is based on ClinicalTrials.gov registry records and sponsor-provided stop
                    language. Labels are screening signals for research and should be verified against primary
                    records.
                  </p>
                </div>
              </aside>
            </div>
          </section>

          <section className="seoSection seoAlt">
            <div className="seoContainer">
              <div className="seoSectionHeading">
                <h2>Related clinical trial failure research</h2>
                <p>Use these pages to move between broad failure concepts and the live dataset.</p>
              </div>
              <div className="seoRelatedGrid">
                {page.related.map((item) => (
                  <Link href={item.href} className="seoRelatedCard" key={item.href}>
                    <span className="seoRelatedTitle">{item.label}</span>
                    <span className="seoRelatedText">{item.text}</span>
                    <span className="seoRelatedFooter">Open page →</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="seoSection">
            <div className="seoContainer">
              <div className="seoSectionHeading">
                <h2>Frequently asked questions</h2>
              </div>
              <div className="seoFaqGrid">
                {page.faqs.map((faq) => (
                  <article className="seoFaqCard" key={faq.question}>
                    <h3>{faq.question}</h3>
                    <p>{faq.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .seoPage {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
        }
        .seoContainer {
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
          padding-left: 20px;
          padding-right: 20px;
        }
        .seoHero {
          padding: 34px 0 30px;
          background: linear-gradient(180deg, #ffffff 0%, #f2f6ff 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        .seoHeroGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(280px, 0.72fr);
          gap: 28px;
          align-items: start;
        }
        .seoEyebrow,
        .seoCardLabel {
          display: block;
          margin: 0 0 10px;
          color: #475569;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        h1 {
          margin: 0;
          max-width: 760px;
          font-size: clamp(2.05rem, 4.6vw, 3.2rem);
          line-height: 1.08;
          letter-spacing: 0;
        }
        h2 {
          margin: 0 0 12px;
          font-size: clamp(1.35rem, 3.1vw, 2rem);
          line-height: 1.16;
          letter-spacing: 0;
        }
        h3 {
          margin: 0 0 8px;
          font-size: 1.05rem;
          line-height: 1.35;
          letter-spacing: 0;
        }
        p,
        li {
          color: #334155;
          line-height: 1.72;
        }
        p {
          margin: 0;
        }
        .seoLede {
          margin-top: 16px;
          max-width: 760px;
          font-size: clamp(1rem, 2vw, 1.1rem);
        }
        .seoActions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 22px;
        }
        :global(.seoPage .seoPrimaryBtn),
        :global(.seoPage .seoSecondaryBtn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 46px;
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 800;
          text-decoration: none;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }
        :global(.seoPage .seoPrimaryBtn) {
          background: #0f172a;
          border: 1px solid #0f172a;
          color: #ffffff;
        }
        :global(.seoPage .seoSecondaryBtn) {
          background: #ffffff;
          border: 1px solid #94a3b8;
          color: #0f172a;
        }
        :global(.seoPage .seoPrimaryBtn:hover),
        :global(.seoPage .seoPrimaryBtn:focus-visible),
        :global(.seoPage .seoSecondaryBtn:hover),
        :global(.seoPage .seoSecondaryBtn:focus-visible),
        :global(.seoPage .seoRelatedCard:hover),
        :global(.seoPage .seoRelatedCard:focus-visible) {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
          text-decoration: underline;
          text-underline-offset: 0.2em;
        }
        .seoSignalCard,
        .seoAsideCard,
        .seoFaqCard,
        :global(.seoPage .seoRelatedCard) {
          min-width: 0;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }
        .seoSignalCard {
          padding: 20px;
        }
        .seoSignalCard ul,
        .seoAsideCard ol {
          margin: 0;
          padding-left: 20px;
        }
        .seoSignalCard li + li,
        .seoAsideCard li + li {
          margin-top: 8px;
        }
        .seoSection {
          padding: 34px 0;
        }
        .seoAlt {
          background: #eef4ff;
          border-top: 1px solid #dbeafe;
          border-bottom: 1px solid #dbeafe;
        }
        .seoContentGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
          gap: 24px;
          align-items: start;
        }
        .seoArticle {
          min-width: 0;
        }
        .seoArticleBlock + .seoArticleBlock {
          margin-top: 30px;
        }
        .seoArticleBlock p + p {
          margin-top: 14px;
        }
        .seoAside {
          display: grid;
          gap: 14px;
          position: sticky;
          top: 86px;
        }
        .seoAsideCard,
        .seoFaqCard {
          padding: 18px;
        }
        .seoSectionHeading {
          max-width: 720px;
          margin-bottom: 18px;
        }
        .seoRelatedGrid,
        .seoFaqGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        :global(.seoPage .seoRelatedCard) {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 18px;
          color: inherit;
          text-decoration: none;
          transition: transform 0.16s ease, box-shadow 0.16s ease;
        }
        :global(.seoPage .seoRelatedTitle) {
          color: #0f172a;
          font-weight: 850;
          line-height: 1.3;
        }
        :global(.seoPage .seoRelatedText) {
          color: #334155;
          line-height: 1.55;
        }
        :global(.seoPage .seoRelatedFooter) {
          margin-top: auto;
          color: #2563eb;
          font-weight: 800;
        }
        .seoFaqCard p {
          margin-top: 8px;
        }
        :global(.seoPage .brand) {
          text-decoration-thickness: 1.5px;
          text-underline-offset: 0.18em;
        }
        :global(.seoPage .brand:hover),
        :global(.seoPage .brand:focus-visible),
        :global(.seoPage .navlink:hover),
        :global(.seoPage .navlink:focus-visible) {
          text-decoration: underline;
        }
        @media (max-width: 900px) {
          .seoHeroGrid,
          .seoContentGrid,
          .seoRelatedGrid,
          .seoFaqGrid {
            grid-template-columns: 1fr;
          }
          .seoAside {
            position: static;
          }
        }
        @media (max-width: 640px) {
          .seoContainer {
            padding-left: 16px;
            padding-right: 16px;
          }
          .seoHero {
            padding-top: 26px;
          }
          .seoSection {
            padding: 28px 0;
          }
          :global(.seoPage .seoPrimaryBtn),
          :global(.seoPage .seoSecondaryBtn) {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
