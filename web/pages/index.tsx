import Head from "next/head";
import Link from "next/link";

const SITE_NAME = "Clinical Trial Failures";
const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "Clinical Trial Failures | Explore clinical trial failures and biological failure signals";
const DESCRIPTION =
  "Clinical Trial Failures is a searchable database for terminated, suspended, and withdrawn clinical trials, with a focus on biological failure signals such as weak efficacy, futility, and safety-driven stops.";

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

      <div className="homePage">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand" aria-current="page">
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
                <Link className="navlink" href="/outliers">
                  Outliers
                </Link>
                <Link className="navlink" href="/top-entities">
                  Top entities
                </Link>
                <Link className="navlink" href="/methods">
                  Methods
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main>
          <section className="hero">
            <div className="container heroGrid">
              <div className="heroCopy">
                <p className="eyebrow">Search clinical trial failures</p>
                <h1>Find the biological reasons clinical trials stop early</h1>
                <p className="lede">
                  Clinical Trial Failures is a searchable database of terminated, suspended, and withdrawn
                  clinical trials. It is built to surface the strongest biological failure signals in registry
                  text, especially weak efficacy, futility, safety issues, and other signs that an intervention
                  did not work as intended.
                </p>
                <p className="supporting">
                  Instead of reading thousands of trial records manually, you can review clinical trial failures
                  by phase, sponsor, disease area, condition, intervention, geography, and stop reason.
                </p>
                <div className="actions">
                  <Link href="/explore" className="primaryBtn">
                    Explore clinical trial failures
                  </Link>
                  <Link href="/methods" className="secondaryBtn">
                    See methodology
                  </Link>
                </div>
              </div>

              <aside className="heroPanel" aria-label="Key analysis paths">
                <div className="panelCard emphasisCard">
                  <span className="panelLabel">Primary focus</span>
                  <h2>Biological failure signals</h2>
                  <p>
                    Prioritize trials whose stop reasons point to efficacy, futility, or safety problems,
                    rather than purely administrative or strategic changes.
                  </p>
                </div>
                <div className="miniGrid">
                  <div className="panelCard miniCard">
                    <h3>Efficacy and futility</h3>
                    <p>Screen for weak efficacy, lack of benefit, or failed endpoints.</p>
                  </div>
                  <div className="panelCard miniCard">
                    <h3>Safety-driven stops</h3>
                    <p>Review adverse events, tolerability issues, and risk signals.</p>
                  </div>
                  <div className="panelCard miniCard">
                    <h3>Fast comparison</h3>
                    <p>Compare sponsors, repeated patterns, and trial-level stop language.</p>
                  </div>
                  <div className="panelCard miniCard">
                    <h3>Structured filtering</h3>
                    <p>Filter by status, phase, disease area, reason bucket, and likely scientific failure.</p>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="section">
            <div className="container sectionGrid">
              <div className="sectionIntro cardSurface">
                <h2>What this web app actually helps you answer</h2>
                <p>
                  The app is designed for biotech and pharma teams, investors, consultants, and researchers who
                  want a faster way to study why clinical trials fail. The strongest use case is identifying
                  whether a stopped study reflects a likely biological failure versus an operational, strategic,
                  or funding decision.
                </p>
                <ul className="bulletList">
                  <li>Find failed clinical trials linked to efficacy or futility concerns.</li>
                  <li>Separate safety-led stops from operational or sponsor-led stops.</li>
                  <li>Trace sponsor patterns across repeated terminated, suspended, and withdrawn trials.</li>
                  <li>Move from broad dataset views into trial-level stop language quickly.</li>
                </ul>
              </div>

              <div className="stackGrid">
                <div className="cardSurface">
                  <h3>Searchable records</h3>
                  <p>Browse terminated, suspended, and withdrawn clinical trial records in one place.</p>
                </div>
                <div className="cardSurface">
                  <h3>Reason-based filtering</h3>
                  <p>Focus on likely efficacy, safety, operational, and other failure patterns.</p>
                </div>
                <div className="cardSurface">
                  <h3>Biological vs non-biological stops</h3>
                  <p>Use the failure framing to distinguish scientific signals from administrative noise.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section altSection">
            <div className="container">
              <div className="sectionHeading">
                <h2>Explore the dataset</h2>
                <p>
                  Start with the explorer, then move into summary pages to understand patterns behind clinical
                  trial failures at both the portfolio and trial level.
                </p>
              </div>
              <div className="linkGrid">
                <Link href="/explore" className="navCard">
                  <span className="navCardTitle">Explore</span>
                  <span className="navCardText">Search and filter individual clinical trial failures.</span>
                </Link>
                <Link href="/overview" className="navCard">
                  <span className="navCardTitle">Overview</span>
                  <span className="navCardText">See high-level patterns across the dataset.</span>
                </Link>
                <Link href="/sponsor-insights" className="navCard">
                  <span className="navCardTitle">Sponsor insights</span>
                  <span className="navCardText">Compare sponsors and repeated stop patterns.</span>
                </Link>
                <Link href="/methods" className="navCard">
                  <span className="navCardTitle">Methods</span>
                  <span className="navCardText">Review how records are collected and classified.</span>
                </Link>
                <Link href="/outliers" className="navCard">
                  <span className="navCardTitle">Outliers</span>
                  <span className="navCardText">Inspect unusual or extreme stop patterns worth deeper review.</span>
                </Link>
                <Link href="/privacy" className="navCard">
                  <span className="navCardTitle">Privacy</span>
                  <span className="navCardText">Read the short privacy policy.</span>
                </Link>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="container">
              <div className="sectionHeading">
                <h2>Frequently asked questions</h2>
                <p>
                  These are the main questions people ask when they are researching clinical trial failures and
                  the biological reasons trials stop.
                </p>
              </div>
              <div className="faqGrid">
                <article className="cardSurface">
                  <h3>What counts as a clinical trial failure?</h3>
                  <p>
                    This site focuses on trials that were terminated, suspended, or withdrawn. Not every stopped
                    study failed scientifically, but these records often contain the clearest signals behind
                    clinical trial failures.
                  </p>
                </article>
                <article className="cardSurface">
                  <h3>Why do clinical trials fail?</h3>
                  <p>
                    Clinical trials can stop because of weak efficacy, futility, safety issues, operational
                    problems, funding constraints, sponsor strategy changes, or regulatory factors. The app is
                    most useful when you want to isolate probable biological failure from those other causes.
                  </p>
                </article>
                <article className="cardSurface">
                  <h3>Who is this useful for?</h3>
                  <p>
                    It is built for teams and researchers who want faster access to structured failed clinical
                    trial intelligence, including operators, analysts, consultants, and investors.
                  </p>
                </article>
              </div>
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`

        .homePage {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
        }
        .container {
          max-width: 1180px;
          margin: 0 auto;
          padding-left: 20px;
          padding-right: 20px;
        }
        .hero {
          padding: 36px 0 24px;
          background: linear-gradient(180deg, #ffffff 0%, #eef4ff 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        .heroGrid,
        .sectionGrid {
          display: grid;
          gap: 24px;
          align-items: start;
        }
        .heroGrid {
          grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
        }
        .heroCopy {
          padding: 10px 0;
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
          max-width: 760px;
          font-size: clamp(2rem, 5vw, 3.6rem);
          line-height: 1.05;
        }
        h2 {
          margin: 0 0 12px;
          font-size: clamp(1.45rem, 3.8vw, 2.4rem);
          line-height: 1.1;
        }
        h3 {
          margin: 0 0 8px;
          font-size: 1.05rem;
          line-height: 1.35;
        }
        p {
          margin: 0;
          color: #334155;
          line-height: 1.7;
        }
        .lede {
          margin-top: 18px;
          max-width: 760px;
          font-size: clamp(1.02rem, 2.2vw, 1.15rem);
        }
        .supporting {
          margin-top: 14px;
          max-width: 700px;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 22px;
        }
        .primaryBtn,
        .secondaryBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          text-decoration: none;
          font-weight: 700;
          border-radius: 12px;
        }
        .primaryBtn {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
        }
        .secondaryBtn {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
        }
        .heroPanel,
        .miniGrid,
        .stackGrid,
        .linkGrid,
        .faqGrid {
          display: grid;
          gap: 14px;
        }
        .heroPanel {
          gap: 16px;
        }
        .miniGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .section {
          padding: 28px 0;
        }
        .sectionGrid {
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
        }
        .cardSurface,
        .panelCard,
        .navCard {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }
        .emphasisCard {
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border-color: #dbeafe;
        }
        .panelLabel {
          display: inline-block;
          margin-bottom: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #475569;
        }
        .sectionIntro {
          padding: 22px;
        }
        .bulletList {
          margin: 16px 0 0;
          padding-left: 18px;
          color: #334155;
          display: grid;
          gap: 10px;
        }
        .altSection {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }
        .sectionHeading {
          margin-bottom: 16px;
        }
        .sectionHeading p {
          max-width: 760px;
        }
        .linkGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .navCard {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-decoration: none;
          min-height: 118px;
        }
        .navCardTitle {
          display: block;
          color: #0f172a;
          font-weight: 800;
          line-height: 1.3;
        }
        .navCardText {
          display: block;
          color: #475569;
          line-height: 1.6;
        }
        .faqGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (max-width: 1040px) {
          .heroGrid,
          .sectionGrid,
          .faqGrid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 900px) {
          .miniGrid,
          .linkGrid {
            grid-template-columns: 1fr;
          }
          .hero {
            padding-top: 28px;
          }
        }
        @media (max-width: 720px) {
          .container {
            padding-left: 14px;
            padding-right: 14px;
          }
          .hero,
          .section {
            padding: 18px 0;
          }
          .hero {
            background: #f8fafc;
          }
          .altSection {
            background: transparent;
          }
          .heroGrid,
          .sectionGrid,
          .miniGrid,
          .stackGrid,
          .linkGrid,
          .faqGrid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .heroCopy {
            padding: 0;
          }
          h1 {
            font-size: clamp(1.9rem, 10vw, 2.45rem);
            line-height: 1.08;
            max-width: none;
          }
          h2 {
            font-size: clamp(1.45rem, 7vw, 1.9rem);
            line-height: 1.12;
          }
          h3 {
            font-size: 1rem;
            margin-bottom: 6px;
          }
          .lede,
          .supporting,
          .sectionHeading p {
            max-width: none;
          }
          .lede {
            margin-top: 12px;
            font-size: 1rem;
            line-height: 1.58;
          }
          .supporting {
            margin-top: 10px;
            line-height: 1.6;
          }
          .sectionHeading {
            margin-bottom: 12px;
            display: grid;
            gap: 8px;
          }
          .cardSurface,
          .panelCard,
          .navCard,
          .sectionIntro {
            padding: 14px;
            border-radius: 14px;
          }
          .sectionIntro {
            display: grid;
            gap: 10px;
          }
          .actions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 16px;
          }
          .primaryBtn,
          .secondaryBtn {
            width: 100%;
            min-height: 44px;
          }
          .heroPanel,
          .stackGrid,
          .faqGrid {
            gap: 12px;
          }
          .navCard {
            min-height: 0;
            gap: 6px;
          }
          .navCardTitle,
          .navCardText {
            line-height: 1.45;
          }
          .bulletList {
            gap: 8px;
            margin-top: 12px;
            padding-left: 18px;
          }
        }

        @media (max-width: 520px) {
          .container {
            padding-left: 12px;
            padding-right: 12px;
          }
          .hero,
          .section {
            padding: 16px 0;
          }
          h1 {
            font-size: clamp(1.85rem, 11vw, 2.2rem);
          }
          .cardSurface,
          .panelCard,
          .navCard,
          .sectionIntro {
            padding: 13px;
          }
          .miniGrid,
          .stackGrid,
          .linkGrid,
          .faqGrid,
          .heroPanel {
            gap: 10px;
          }
        }
            `}</style>
    </>
  );
}
