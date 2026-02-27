import Head from "next/head";
import Link from "next/link";

const SITE_NAME = "Clinical Trial Failures";
const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "Clinical Trial Failures | Search why clinical trials stop";
const DESCRIPTION =
  "Clinical Trial Failures is a searchable web app for exploring terminated, suspended, and withdrawn clinical trials, including likely reasons for clinical trial failure.";

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
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <main className="homePage">
        <header className="hero">
          <div className="container heroInner">
            <p className="eyebrow">Clinical trial analytics</p>
            <h1>Clinical trial failures in one searchable database</h1>
            <p className="lede">
              Clinical Trial Failures is a web app for exploring terminated, suspended, and withdrawn
              clinical trials. It helps you understand why clinical trials stop early by organizing
              trial records into a faster, more useful interface for search, filtering, and analysis.
            </p>
            <div className="actions">
              <Link href="/explore" className="primaryBtn">Explore clinical trial failures</Link>
              <Link href="/overview" className="secondaryBtn">View overview</Link>
            </div>
          </div>
        </header>

        <section className="section">
          <div className="container twoCol">
            <div>
              <h2>What this web app does</h2>
              <p>
                Instead of manually reading individual registry entries, you can search clinical trial
                failures by phase, sponsor, condition, geography, and likely stop reason. The app is
                designed to make failed clinical trials easier to review and compare.
              </p>
              <p>
                It is useful for biotech and pharma teams, investors, consultants, and researchers who
                want a cleaner way to study clinical trial risk, development patterns, and early stop signals.
              </p>
            </div>
            <div className="featureGrid">
              <div className="card">
                <h3>Searchable records</h3>
                <p>Browse terminated, suspended, and withdrawn clinical trial records in one place.</p>
              </div>
              <div className="card">
                <h3>Reason-based filters</h3>
                <p>Screen for likely efficacy, safety, operational, and other failure patterns.</p>
              </div>
              <div className="card">
                <h3>Faster navigation</h3>
                <p>Move quickly between the explorer, overview pages, methods, and sponsor insights.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="container">
            <h2>Explore the dataset</h2>
            <div className="linkGrid">
              <Link href="/explore" className="navCard"><strong>Explore</strong><span>Search and filter individual clinical trial failures.</span></Link>
              <Link href="/overview" className="navCard"><strong>Overview</strong><span>See high-level patterns across the dataset.</span></Link>
              <Link href="/sponsor-insights" className="navCard"><strong>Sponsor insights</strong><span>Compare sponsors and repeated stop patterns.</span></Link>
              <Link href="/methods" className="navCard"><strong>Methods</strong><span>Review how records are collected and classified.</span></Link>
              <Link href="/privacy" className="navCard"><strong>Privacy</strong><span>Read the short privacy policy.</span></Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <h2>Frequently asked questions</h2>
            <div className="faqGrid">
              <article className="card">
                <h3>What counts as a clinical trial failure?</h3>
                <p>
                  This site focuses on trials that were terminated, suspended, or withdrawn. Not every
                  stopped study failed scientifically, but these records often contain the clearest signals
                  behind clinical trial failures.
                </p>
              </article>
              <article className="card">
                <h3>Why do clinical trials fail?</h3>
                <p>
                  Clinical trials can stop because of weak efficacy, safety issues, operational problems,
                  funding decisions, sponsor strategy changes, or regulatory factors. The app helps surface
                  those patterns across many studies.
                </p>
              </article>
              <article className="card">
                <h3>Who is this useful for?</h3>
                <p>
                  It is built for people researching failed clinical trials, including operators, analysts,
                  investors, and researchers who want faster access to structured trial intelligence.
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
        .container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 0 20px;
        }
        .heroInner {
          padding-top: 56px;
          padding-bottom: 44px;
        }
        .section {
          padding: 28px 0;
        }
        .alt {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }
        .eyebrow {
          margin: 0 0 10px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #475569;
        }
        h1 {
          margin: 0;
          max-width: 840px;
          font-size: clamp(2rem, 6vw, 4rem);
          line-height: 1.04;
        }
        h2 {
          margin: 0 0 14px;
          font-size: clamp(1.5rem, 4vw, 2.25rem);
        }
        h3 {
          margin: 0 0 8px;
          font-size: 1.05rem;
        }
        .lede {
          margin: 18px 0 0;
          max-width: 760px;
          color: #334155;
          font-size: clamp(1rem, 2.5vw, 1.15rem);
          line-height: 1.7;
        }
        p {
          line-height: 1.7;
          color: #334155;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 24px;
        }
        .primaryBtn,
        .secondaryBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          border-radius: 12px;
          text-decoration: none;
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
        .twoCol {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .featureGrid,
        .faqGrid,
        .linkGrid {
          display: grid;
          gap: 14px;
        }
        .featureGrid,
        .faqGrid {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }
        .linkGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .card,
        .navCard {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }
        .navCard {
          text-decoration: none;
          display: block;
        }
        .navCard strong {
          display: block;
          color: #0f172a;
          margin-bottom: 6px;
        }
        .navCard span {
          color: #475569;
          line-height: 1.6;
        }
        @media (max-width: 800px) {
          .twoCol,
          .linkGrid {
            grid-template-columns: 1fr;
          }
          .heroInner {
            padding-top: 40px;
            padding-bottom: 32px;
          }
          .section {
            padding: 22px 0;
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
