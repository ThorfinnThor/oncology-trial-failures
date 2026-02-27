import Head from "next/head";
import Link from "next/link";

const SITE_NAME = "Clinical Trial Failures";
const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "Clinical Trial Failures | Explore why clinical trials stop early";
const DESCRIPTION =
  "Clinical Trial Failures is a searchable web app for exploring terminated, suspended, and withdrawn clinical trials, with filters for phase, sponsor, condition, and likely reasons for failure.";

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/explore?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={SITE_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <main className="homePage">
        <header className="hero">
          <div className="heroInner">
            <p className="eyebrow">Clinical Trial Intelligence</p>
            <h1>Clinical trial failures, in one searchable database</h1>
            <p className="lede">
              Clinical Trial Failures helps you explore terminated, suspended, and withdrawn
              clinical trials. Use the app to review why trials stop early, compare sponsors,
              inspect trends by phase and disease area, and quickly move from raw trial records to
              practical insight.
            </p>

            <div className="actions">
              <Link href="/explore" className="primaryBtn">
                Explore clinical trial failures
              </Link>
              <Link href="/overview" className="secondaryBtn">
                View overview
              </Link>
            </div>
          </div>
        </header>

        <section className="section">
          <div className="sectionInner grid2">
            <div>
              <h2>What this web app does</h2>
              <p>
                This web app organizes publicly available clinical trial records into a cleaner,
                easier-to-analyze experience. Instead of manually reviewing individual entries, you
                can filter clinical trial failures by status, phase, sponsor, condition, location,
                and likely stop reason.
              </p>
              <p>
                It is built for people who want to understand patterns behind failed clinical
                trials—from biotech operators and investors to researchers, consultants, and anyone
                tracking how and why clinical development programs stop.
              </p>
            </div>
            <div className="cardList">
              <div className="card">
                <h3>Searchable trial data</h3>
                <p>Review terminated, suspended, and withdrawn clinical trials in a structured format.</p>
              </div>
              <div className="card">
                <h3>Reason-based analysis</h3>
                <p>Filter for likely efficacy, safety, operational, regulatory, and unclear failure patterns.</p>
              </div>
              <div className="card">
                <h3>Fast navigation</h3>
                <p>Jump from the homepage to deeper views for exploration, methods, and sponsor-level insights.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section muted">
          <div className="sectionInner">
            <h2>Start with the view that matches your question</h2>
            <div className="linksGrid">
              <Link href="/explore" className="navCard">
                <strong>Explore</strong>
                <span>Search and filter individual clinical trial failures.</span>
              </Link>
              <Link href="/overview" className="navCard">
                <strong>Overview</strong>
                <span>See high-level patterns across the dataset.</span>
              </Link>
              <Link href="/sponsor-insights" className="navCard">
                <strong>Sponsor Insights</strong>
                <span>Compare sponsors and look for repeated failure patterns.</span>
              </Link>
              <Link href="/methods" className="navCard">
                <strong>Methods</strong>
                <span>Review how trial records are collected and categorized.</span>
              </Link>
              <Link href="/privacy" className="navCard">
                <strong>Privacy</strong>
                <span>Read the compact privacy policy for this web app.</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="sectionInner faqWrap">
            <h2>Common questions about clinical trial failures</h2>
            <div className="faqGrid">
              <article className="faqItem">
                <h3>What counts as a clinical trial failure?</h3>
                <p>
                  In this app, the focus is on trials that were terminated, suspended, or withdrawn.
                  Not every stopped trial failed scientifically, but these records are where many of
                  the most useful signals around clinical trial failure appear.
                </p>
              </article>
              <article className="faqItem">
                <h3>Why do clinical trials fail?</h3>
                <p>
                  Clinical trials can stop because of weak efficacy, safety issues, operational
                  problems, sponsor decisions, funding constraints, or regulatory factors. This web
                  app helps surface those patterns across many studies instead of one at a time.
                </p>
              </article>
              <article className="faqItem">
                <h3>Who is this useful for?</h3>
                <p>
                  The dataset is useful for biotech teams, pharma analysts, investors, academics,
                  and anyone researching failed clinical trials or studying clinical development risk.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .homePage {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
        }
        .hero {
          background: linear-gradient(180deg, #ffffff 0%, #eef4ff 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        .heroInner,
        .sectionInner {
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px 20px;
        }
        .heroInner {
          padding-top: 48px;
          padding-bottom: 40px;
        }
        .eyebrow {
          margin: 0 0 12px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #475569;
        }
        h1 {
          margin: 0;
          font-size: clamp(2rem, 5vw, 4rem);
          line-height: 1.05;
          max-width: 820px;
        }
        .lede {
          margin: 18px 0 0;
          font-size: clamp(1rem, 2.2vw, 1.2rem);
          line-height: 1.7;
          max-width: 760px;
          color: #334155;
        }
        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 24px;
        }
        .primaryBtn,
        .secondaryBtn,
        .navCard {
          text-decoration: none;
        }
        .primaryBtn,
        .secondaryBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          padding: 12px 16px;
          font-weight: 700;
        }
        .primaryBtn {
          background: #0f172a;
          color: #ffffff;
        }
        .secondaryBtn {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
        }
        .section {
          padding: 8px 0;
        }
        .muted {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }
        .grid2,
        .linksGrid,
        .cardList,
        .faqGrid {
          display: grid;
          gap: 16px;
        }
        .grid2 {
          grid-template-columns: 1.2fr 1fr;
          align-items: start;
        }
        h2 {
          margin: 0 0 14px;
          font-size: clamp(1.5rem, 3vw, 2.25rem);
          line-height: 1.2;
        }
        h3 {
          margin: 0 0 8px;
          font-size: 1.05rem;
          line-height: 1.35;
        }
        p {
          margin: 0 0 14px;
          line-height: 1.7;
          color: #334155;
        }
        .card,
        .navCard,
        .faqItem {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
        }
        .cardList {
          grid-template-columns: 1fr;
        }
        .linksGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .navCard {
          display: block;
          color: inherit;
        }
        .navCard span {
          display: block;
          margin-top: 6px;
          line-height: 1.6;
          color: #475569;
        }
        .faqWrap {
          padding-top: 12px;
          padding-bottom: 32px;
        }
        .faqGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .faqItem p,
        .card p {
          margin-bottom: 0;
        }
        @media (max-width: 900px) {
          .grid2,
          .linksGrid,
          .faqGrid {
            grid-template-columns: 1fr;
          }
          .heroInner {
            padding-top: 32px;
            padding-bottom: 28px;
          }
        }
        @media (max-width: 640px) {
          .heroInner,
          .sectionInner {
            padding-left: 16px;
            padding-right: 16px;
          }
          .primaryBtn,
          .secondaryBtn {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
