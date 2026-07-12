import Head from "next/head";
import Link from "next/link";

import PrimaryNav from "../components/PrimaryNav";

const SITE_NAME = "Clinical Trial Failures";
const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "Clinical Trial Failures Database | Ready-to-use stopped trial evidence";
const DESCRIPTION =
  "Use a ready-to-use clinical trial failure database with preclassified stop reasons, one-click evidence links, sponsor tables, and ClinicalTrials.gov source records.";
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
              <PrimaryNav />
            </div>
          </div>
        </header>

        <main>
          <section className="hero">
            <div className="container heroGrid">
              <div className="heroCopy">
                <p className="eyebrow">Ready-to-use clinical trial failure database</p>
                <h1>Find stopped clinical trials with one-click evidence</h1>
                <p className="lede">
                  Clinical Trial Failures turns ClinicalTrials.gov stop records into a practical research
                  database. Search terminated, suspended, and withdrawn trials with preclassified failure
                  reasons, trial-level evidence, sponsor views, and ready-to-use tables.
                </p>
                <p className="supporting">
                  Instead of reading thousands of registry entries manually, move from a broad question to the
                  exact stopped trials, source links, and failure signals that support your analysis.
                </p>
                <div className="actions">
                  <Link href="/explore" className="primaryBtn" aria-label="Explore clinical trial failures">
                    <span>Open the database</span>
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
                    <dt>Ready tables</dt>
                    <dd>Preclassified stop reasons and sponsor views</dd>
                  </div>
                  <div>
                    <dt>Evidence links</dt>
                    <dd>One-click path from summary to trial record</dd>
                  </div>
                </dl>
              </div>

              <aside className="heroPanel" aria-label="Clinical trial failure data terminal preview">
                <div className="terminalPreview">
                  <div className="terminalChrome">
                    <span />
                    <span />
                    <span />
                    <strong>failure-signal-terminal</strong>
                  </div>
                  <div className="terminalCommand">
                    <span>$</span> query stopped_trials where reason in efficacy,futility,safety
                  </div>
                  <dl className="terminalStats">
                    <div>
                      <dt>Stopped records</dt>
                      <dd>23,452</dd>
                    </div>
                    <div>
                      <dt>Likely biological</dt>
                      <dd>1,813</dd>
                    </div>
                    <div>
                      <dt>Biological share</dt>
                      <dd>8%</dd>
                    </div>
                  </dl>
                  <div className="terminalRows" aria-label="Example data rows">
                    <div>
                      <span>NCT07014735</span>
                      <strong>Efficacy/futility</strong>
                      <em>source-linked</em>
                    </div>
                    <div>
                      <span>NCT05999968</span>
                      <strong>Endpoint signal</strong>
                      <em>oncology</em>
                    </div>
                    <div>
                      <span>NCT04867837</span>
                      <strong>Interim futility</strong>
                      <em>verified</em>
                    </div>
                  </div>
                  <div className="terminalFooter">
                    <span>ClinicalTrials.gov derived</span>
                    <span>Preclassified tables</span>
                  </div>
                </div>
              </aside>

              <div className="miniGrid" aria-label="Core analysis shortcuts">
                <div className="panelCard miniCard">
                  <h3>Preclassified stop reasons</h3>
                  <p>Screen efficacy, futility, safety, operational, and unknown stop signals.</p>
                </div>
                <div className="panelCard miniCard">
                  <h3>One-click evidence</h3>
                  <p>Jump from summary tables to the trial-level stop language and source record.</p>
                </div>
                <div className="panelCard miniCard">
                  <h3>Sponsor-ready views</h3>
                  <p>Compare sponsors, repeated patterns, disease areas, and stopped programs.</p>
                </div>
                <div className="panelCard miniCard">
                  <h3>Exportable analysis</h3>
                  <p>Filter by status, phase, disease area, reason bucket, and likely scientific failure.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="container sectionGrid">
              <div className="sectionIntro cardSurface">
                <h2>Ready-to-use evidence for trial failure research</h2>
                <p>
                  The database is designed for biotech and pharma teams, investors, consultants, and researchers
                  who need fast evidence on why clinical trials stop. The strongest use case is separating likely
                  biological failure from operational, strategic, enrollment, or funding decisions.
                </p>
                <ul className="bulletList">
                  <li>Find failed clinical trials linked to efficacy, futility, or safety concerns.</li>
                  <li>Open the trial-level evidence behind each stop-reason classification.</li>
                  <li>Trace sponsor patterns across repeated terminated, suspended, and withdrawn programs.</li>
                  <li>Move from broad tables into specific NCT records without rebuilding the dataset yourself.</li>
                </ul>
              </div>

              <div className="stackGrid">
                <div className="cardSurface">
                  <h3>Searchable stopped-trial database</h3>
                  <p>Browse terminated, suspended, and withdrawn clinical trial records in one place.</p>
                </div>
                <div className="cardSurface">
                  <h3>Prebuilt failure tables</h3>
                  <p>Use ready views by sponsor, disease area, phase, and stop-reason bucket.</p>
                </div>
                <div className="cardSurface">
                  <h3>Biological vs non-biological stops</h3>
                  <p>Separate scientific signals from operational, funding, and administrative noise.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="section altSection">
            <div className="container">
              <div className="sectionHeading">
                <h2>Explore ready-to-use tables</h2>
                <p>
                  Start with the searchable database, then move into prebuilt summary pages for sponsors,
                  disease areas, phases, stop reasons, and individual trial evidence.
                </p>
              </div>
              <div className="linkGrid">
                <Link href="/explore" className="navCard">
                  <span className="navCardTitle">Explore</span>
                  <span className="navCardText">Search and filter stopped trials with preclassified reasons.</span>
                  <span className="navCardFooter">Open database →</span>
                </Link>
                <Link href="/overview" className="navCard">
                  <span className="navCardTitle">Overview</span>
                  <span className="navCardText">See high-level patterns across the stopped-trial dataset.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/failures" className="navCard">
                  <span className="navCardTitle">Failure hubs</span>
                  <span className="navCardText">Browse disease, phase, and stop-reason evidence pages.</span>
                  <span className="navCardFooter">Open hubs →</span>
                </Link>
                <Link href="/sponsor-insights" className="navCard">
                  <span className="navCardTitle">Sponsor insights</span>
                  <span className="navCardText">Extract sponsor-level stop patterns and evidence tables.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/sponsors" className="navCard">
                  <span className="navCardTitle">Sponsor hubs</span>
                  <span className="navCardText">Open sponsor-specific stopped-trial evidence pages.</span>
                  <span className="navCardFooter">Open hubs →</span>
                </Link>
                <Link href="/methods" className="navCard">
                  <span className="navCardTitle">Methods</span>
                  <span className="navCardText">Review how the classifications and source checks work.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/about" className="navCard">
                  <span className="navCardTitle">About and data trust</span>
                  <span className="navCardText">Review source, scope, limitations, and medical-data trust notes.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/outliers" className="navCard">
                  <span className="navCardTitle">Outliers</span>
                  <span className="navCardText">Inspect over-represented sponsors, indications, and stop patterns.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
                <Link href="/top-entities" className="navCard">
                  <span className="navCardTitle">Top entities</span>
                  <span className="navCardText">See the sponsors and disease areas that appear most often.</span>
                  <span className="navCardFooter">Open page →</span>
                </Link>
              </div>

              <div className="sectionHeading guideHeading" id="research-guides">
                <h2>Clinical trial failure research guides</h2>
                <p>
                  These focused pages translate common search terms into data-backed views of clinical trial
                  failures, stopped studies, termination reasons, oncology trial stops, and futility signals.
                </p>
              </div>
              <div className="linkGrid">
                <Link href="/clinical-trial-failures" className="navCard">
                  <span className="navCardTitle">Clinical trial failures</span>
                  <span className="navCardText">Use the database to find stopped trials and evidence signals.</span>
                  <span className="navCardFooter">Open guide →</span>
                </Link>
                <Link href="/why-clinical-trials-fail" className="navCard">
                  <span className="navCardTitle">Why clinical trials fail</span>
                  <span className="navCardText">Compare efficacy, safety, enrollment, funding, and operational causes.</span>
                  <span className="navCardFooter">Open guide →</span>
                </Link>
                <Link href="/failed-clinical-trials" className="navCard">
                  <span className="navCardTitle">Failed clinical trials</span>
                  <span className="navCardText">Review how failure language appears in source registry records.</span>
                  <span className="navCardFooter">Open guide →</span>
                </Link>
                <Link href="/oncology-clinical-trial-failures" className="navCard">
                  <span className="navCardTitle">Oncology trial failures</span>
                  <span className="navCardText">Focus on cancer trial stops and biological failure patterns.</span>
                  <span className="navCardFooter">Open guide →</span>
                </Link>
                <Link href="/terminated-clinical-trials" className="navCard">
                  <span className="navCardTitle">Terminated clinical trials</span>
                  <span className="navCardText">Separate terminated status from scientific failure evidence.</span>
                  <span className="navCardFooter">Open guide →</span>
                </Link>
                <Link href="/clinical-trial-futility" className="navCard">
                  <span className="navCardTitle">Clinical trial futility</span>
                  <span className="navCardText">Search weak efficacy, futility, and failed endpoint signals.</span>
                  <span className="navCardFooter">Open guide →</span>
                </Link>
              </div>
            </div>
          </section>

          <section className="section trustSection">
            <div className="container">
              <div className="trustIntroGrid">
                <div className="sectionHeading">
                  <h2>Source, scope, and verification</h2>
                  <p>
                    Medical and clinical-trial data needs context. This site summarizes registry records and
                    highlights likely failure signals, but each trial should still be verified against its primary
                    ClinicalTrials.gov record and related sponsor publications.
                  </p>
                </div>
                <figure className="trustVisual" aria-label="Methodology and source verification visual">
                  <img
                    src="/images/clinical-trial-methodology-v12.webp"
                    alt="Close-up analytics screen with charts used to review clinical trial data patterns"
                    width={2000}
                    height={1439}
                    loading="lazy"
                  />
                </figure>
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
          background:
            radial-gradient(circle at 82% 0%, rgba(37, 99, 235, 0.10), transparent 34%),
            linear-gradient(180deg, #f8fafc 0%, #eef3f8 100%);
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
          position: relative;
          overflow: hidden;
          padding: 32px 0 12px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(241, 245, 249, 0.92) 100%),
            linear-gradient(135deg, rgba(15, 23, 42, 0.04), rgba(37, 99, 235, 0.08));
          border-bottom: 1px solid #e2e8f0;
        }
        .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.9) 42%, rgba(242,246,255,0.44) 100%);
          pointer-events: none;
        }
        .hero .container {
          position: relative;
          z-index: 2;
        }
        .heroGrid,
        .sectionGrid {
          display: grid;
          gap: 24px;
        }
        .heroGrid {
          align-items: stretch;
        }
        .sectionGrid {
          align-items: stretch;
        }
        .heroGrid {
          grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
          gap: 28px;
          row-gap: 16px;
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
          min-width: 0;
          height: 100%;
        }
        .terminalPreview {
          height: 100%;
          min-height: 410px;
          border: 1px solid rgba(100, 116, 139, 0.34);
          border-radius: 14px;
          background: #0f172a;
          color: #e2e8f0;
          box-shadow: 0 24px 55px rgba(15, 23, 42, 0.22);
          overflow: hidden;
        }
        .terminalChrome {
          display: flex;
          align-items: center;
          gap: 7px;
          min-height: 42px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(15, 23, 42, 0.92);
          padding: 0 14px;
        }
        .terminalChrome span {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: #64748b;
        }
        .terminalChrome span:nth-child(1) {
          background: #fb7185;
        }
        .terminalChrome span:nth-child(2) {
          background: #facc15;
        }
        .terminalChrome span:nth-child(3) {
          background: #34d399;
        }
        .terminalChrome strong {
          margin-left: 8px;
          color: #94a3b8;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
          letter-spacing: 0;
        }
        .terminalCommand {
          margin: 18px 18px 0;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 10px;
          background: rgba(2, 6, 23, 0.62);
          padding: 12px;
          color: #cbd5e1;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 12px;
          line-height: 1.5;
        }
        .terminalCommand span {
          color: #60a5fa;
          font-weight: 900;
        }
        .terminalStats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 16px 18px 0;
        }
        .terminalStats div {
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 10px;
          background: rgba(30, 41, 59, 0.72);
          padding: 12px;
        }
        .terminalStats dt {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .terminalStats dd {
          margin: 6px 0 0;
          color: #f8fafc;
          font-size: 22px;
          font-weight: 950;
          letter-spacing: 0;
        }
        .terminalRows {
          display: grid;
          gap: 8px;
          margin: 16px 18px 0;
        }
        .terminalRows div {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 10px;
          align-items: center;
          border: 1px solid rgba(148, 163, 184, 0.20);
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.70);
          padding: 10px 12px;
        }
        .terminalRows span,
        .terminalRows em {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 11px;
          letter-spacing: 0;
        }
        .terminalRows span {
          color: #93c5fd;
          font-weight: 900;
        }
        .terminalRows strong {
          color: #f8fafc;
          font-size: 12px;
        }
        .terminalRows em {
          color: #94a3b8;
          font-style: normal;
        }
        .terminalFooter {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 16px 18px 18px;
        }
        .terminalFooter span {
          border: 1px solid rgba(96, 165, 250, 0.25);
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.16);
          color: #bfdbfe;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 850;
        }
        .heroVisual,
        .trustVisual {
          margin: 0;
          overflow: hidden;
          border: 1px solid #dbeafe;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.08);
        }
        .heroVisual {
          aspect-ratio: 16 / 9;
          align-self: start;
        }
        .trustVisual {
          aspect-ratio: 16 / 9;
          align-self: start;
        }
        .heroVisual img,
        .trustVisual img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .heroVisual img {
          object-position: 58% center;
        }
        .trustVisual img {
          object-position: center;
        }
        .miniGrid {
          grid-column: 1 / -1;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: stretch;
        }
        .section {
          padding: 30px 0;
        }
        .hero + .section {
          padding-top: 24px;
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
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .emphasisCard h2 {
          font-size: clamp(1.55rem, 3vw, 2rem);
        }
        @media (min-width: 1041px) {
          .heroVisual {
            height: 100%;
            aspect-ratio: auto;
          }
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
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .stackGrid {
          grid-template-rows: repeat(3, minmax(0, 1fr));
          height: 100%;
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
        .guideHeading {
          margin-top: 30px;
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
        .trustIntroGrid {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(300px, 0.72fr);
          gap: 22px;
          align-items: center;
          margin-bottom: 16px;
        }
        @media (max-width: 1040px) {
          .heroGrid,
          .sectionGrid,
          .trustIntroGrid,
          .faqGrid,
          .trustGrid {
            grid-template-columns: 1fr;
          }
          .miniGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 900px) {
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
            overflow: visible;
          }
          .hero::before {
            display: none;
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
          .trustIntroGrid,
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
            justify-content: stretch;
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
          .heroVisual,
          .terminalPreview,
          .trustVisual {
            border-radius: 12px;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
          }
          .heroVisual,
          .terminalPreview {
            width: 100%;
            order: -1;
          }
          .terminalPreview {
            min-height: 0;
          }
          .terminalStats,
          .terminalRows div {
            grid-template-columns: 1fr;
          }
          .heroVisual img {
            object-position: 62% center;
          }
          .miniGrid {
            display: none;
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
