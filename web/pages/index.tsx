import Head from "next/head";
import Link from "next/link";

const SITE_NAME = "Clinical Trial Failures";
const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "Clinical Trial Failures | Explore clinical trial failures and biological failure signals";
const DESCRIPTION =
  "Clinical Trial Failures is a searchable database for terminated, suspended, and withdrawn clinical trials, with a focus on biological failure signals such as weak efficacy, futility, and safety-driven stops.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export default function HomePage() {
  const jsonLd = [
    {
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
    },
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Clinical trial failure signals",
      description:
        "A structured view of terminated, suspended, and withdrawn clinical trial records with stop-reason classifications.",
      url: SITE_URL,
      isBasedOn: "ClinicalTrials.gov registry records",
      creator: {
        "@type": "Organization",
        name: SITE_NAME,
      },
      keywords: [
        "clinical trial failures",
        "terminated clinical trials",
        "withdrawn clinical trials",
        "oncology clinical trials",
        "ClinicalTrials.gov",
      ],
    },
  ];

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
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Clinical Trial Failures database preview" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>

      <div className="homePage">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand homeBrand" aria-current="page" aria-label="Go to homepage">
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
                  <Link href="/explore" className="primaryBtn" aria-label="Explore clinical trial failures">
                    <span>Explore clinical trial failures</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link href="/methods" className="secondaryBtn" aria-label="See methodology">
                    <span>See methodology</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <dl className="trustStrip" aria-label="Dataset trust summary">
                  <div>
                    <dt>Primary source</dt>
                    <dd>ClinicalTrials.gov registry records</dd>
                  </div>
                  <div>
                    <dt>Scope</dt>
                    <dd>Terminated, suspended, and withdrawn trials</dd>
                  </div>
                  <div>
                    <dt>Use with care</dt>
                    <dd>Classification is an analytical signal, not medical advice</dd>
                  </div>
                </dl>
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
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/overview" className="navCard">
                  <span className="navCardTitle">Overview</span>
                  <span className="navCardText">See high-level patterns across the dataset.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/sponsor-insights" className="navCard">
                  <span className="navCardTitle">Sponsor insights</span>
                  <span className="navCardText">Extract key data per sponsor.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/methods" className="navCard">
                  <span className="navCardTitle">Methods</span>
                  <span className="navCardText">Review the methodology and concept.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/outliers" className="navCard">
                  <span className="navCardTitle">Outliers</span>
                  <span className="navCardText">Inspect over-represented sponsors and indications.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/top-entities" className="navCard">
                  <span className="navCardTitle">Top entities</span>
                  <span className="navCardText">See the sponsors and disease areas that appear most often.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
              </div>
            </div>
          </section>

          <section className="section trustSection">
            <div className="container">
              <div className="sectionHeading">
                <h2>Source, scope, and verification</h2>
                <p>
                  Medical and clinical-trial data needs context. This site summarizes registry records and
                  highlights likely failure signals, but each trial should still be verified against its primary
                  ClinicalTrials.gov record and related sponsor publications.
                </p>
              </div>
              <div className="trustGrid">
                <article className="cardSurface">
                  <h3>Registry-based source</h3>
                  <p>
                    Records are derived from structured trial registry fields and sponsor-provided stop
                    language where available.
                  </p>
                </article>
                <article className="cardSurface">
                  <h3>Transparent classification</h3>
                  <p>
                    Stop reasons are grouped into practical buckets such as efficacy/futility, safety,
                    operational, enrollment, funding, regulatory, and other/unknown.
                  </p>
                </article>
                <article className="cardSurface">
                  <h3>Research support only</h3>
                  <p>
                    The labels are screening signals for analysis. They are not clinical guidance, investment
                    advice, or a substitute for reviewing primary source documents.
                  </p>
                </article>
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
          width: 100%;
          max-width: 1160px;
          margin: 0 auto;
          padding-left: 20px;
          padding-right: 20px;
        }
        .hero {
          padding: 32px 0 24px;
          background: linear-gradient(180deg, #ffffff 0%, #f2f6ff 100%);
          border-bottom: 1px solid #e2e8f0;
        }
        .heroGrid,
        .sectionGrid {
          display: grid;
          gap: 24px;
          align-items: start;
        }
        .heroGrid {
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
          gap: 28px;
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
          max-width: 720px;
          font-size: clamp(2.15rem, 4.6vw, 3.25rem);
          line-height: 1.07;
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
          margin-top: 16px;
          max-width: 720px;
          font-size: clamp(1rem, 2vw, 1.1rem);
        }
        .supporting {
          margin-top: 14px;
          max-width: 700px;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 20px;
        }
        .trustStrip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 22px 0 0;
        }
        .trustStrip div {
          min-width: 0;
          padding: 12px;
          border: 1px solid #dbeafe;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.82);
        }
        .trustStrip dt {
          margin: 0 0 4px;
          color: #475569;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .trustStrip dd {
          margin: 0;
          color: #0f172a;
          font-size: 0.88rem;
          font-weight: 700;
          line-height: 1.35;
        }
        :global(.homePage .homeBrand) {
          display: inline-flex;
          align-items: center;
          position: relative;
          z-index: 2;
          padding-right: 4px;
        }
        :global(.homePage .homeBrand),
        :global(.topbar .navlink) {
          text-decoration-thickness: 1.5px;
          text-underline-offset: 0.18em;
        }
        :global(.homePage .homeBrand:hover),
        :global(.homePage .homeBrand:focus-visible),
        :global(.topbar .navlink:hover),
        :global(.topbar .navlink:focus-visible) {
          text-decoration: underline;
        }
        :global(.homePage .primaryBtn),
        :global(.homePage .secondaryBtn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 12px 16px;
          text-decoration: none;
          font-weight: 800;
          border-radius: 12px;
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background-color 0.16s ease;
        }
        :global(.homePage .primaryBtn) {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
        }
        :global(.homePage .secondaryBtn) {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #94a3b8;
        }
        :global(.homePage .primaryBtn:hover),
        :global(.homePage .primaryBtn:focus-visible),
        :global(.homePage .secondaryBtn:hover),
        :global(.homePage .secondaryBtn:focus-visible) {
          transform: translateY(-1px);
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.12);
          text-decoration: underline;
          text-underline-offset: 0.2em;
          text-decoration-thickness: 1.5px;
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
          align-items: stretch;
        }
        .section {
          padding: 34px 0;
        }
        .sectionGrid {
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
        }
        .cardSurface,
        .panelCard,
        :global(.homePage .navCard) {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
        }
        .panelCard,
        .cardSurface {
          min-width: 0;
        }
        .miniCard,
        .stackGrid .cardSurface,
        .faqGrid .cardSurface,
        .trustGrid .cardSurface {
          height: 100%;
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
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        :global(.homePage .navCard) {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-decoration: none;
          min-height: 132px;
          cursor: pointer;
          transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
        }
        :global(.homePage .navCard:hover),
        :global(.homePage .navCard:focus-visible) {
          transform: translateY(-1px);
          border-color: #93c5fd;
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.09);
        }
        :global(.homePage .navCardTitle) {
          display: block;
          color: #0f172a;
          font-weight: 800;
          line-height: 1.3;
          text-decoration: underline;
          text-decoration-thickness: 1.5px;
          text-underline-offset: 0.18em;
          text-decoration-color: rgba(15, 23, 42, 0.28);
        }
        :global(.homePage .navCardText) {
          display: block;
          color: #475569;
          line-height: 1.6;
        }
        :global(.homePage .navCardFooter) {
          display: inline-flex;
          align-items: center;
          margin-top: auto;
          color: #1d4ed8;
          font-weight: 700;
          line-height: 1.3;
        }
        .faqGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .trustGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        @media (max-width: 1040px) {
          .heroGrid,
          .sectionGrid,
          .faqGrid,
          .trustGrid {
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
          .faqGrid,
          .trustGrid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .trustStrip {
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 16px;
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
          :global(.homePage .navCard),
          .sectionIntro {
            padding: 14px;
            border-radius: 12px;
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
          :global(.homePage .primaryBtn),
          :global(.homePage .secondaryBtn) {
            width: 100%;
            min-height: 44px;
          }
          .heroPanel,
          .stackGrid,
          .faqGrid {
            gap: 12px;
          }
          :global(.homePage .navCard) {
            min-height: 0;
            gap: 6px;
          }
          :global(.homePage .navCardFooter) {
            margin-top: 2px;
          }
          :global(.homePage .navCardTitle),
          :global(.homePage .navCardText) {
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
          :global(.homePage .navCard),
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
