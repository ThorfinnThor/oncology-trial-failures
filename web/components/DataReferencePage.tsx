import Head from "next/head";
import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";
import type { ReferencePageProps } from "@/lib/seoReferenceData";

const SITE_URL = "https://clinicaltrialfailures.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

function compactReason(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 210 ? `${clean.slice(0, 207).trim()}...` : clean;
}

export default function DataReferencePage(props: ReferencePageProps) {
  const canonicalUrl = `${SITE_URL}${props.canonicalPath}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: props.h1,
      description: props.description,
      url: canonicalUrl,
      dateModified: props.updated,
      isBasedOn: "https://clinicaltrials.gov",
      sameAs: "https://clinicaltrials.gov",
      isAccessibleForFree: true,
      creator: { "@type": "Organization", name: "Clinical Trial Failures", url: SITE_URL },
      includedInDataCatalog: {
        "@type": "DataCatalog",
        name: "Clinical Trial Failures Database",
        url: `${SITE_URL}/explore`,
      },
      variableMeasured: [
        "Stopped clinical trial count",
        "Likely biological failure signal count",
        "Efficacy or futility stop count",
        "Safety stop count",
        "Operational stop count",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: props.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Failure data", item: `${SITE_URL}/failures` },
        { "@type": "ListItem", position: 3, name: props.h1, item: canonicalUrl },
      ],
    },
  ];

  return (
    <>
      <Head>
        <title>{props.title}</title>
        <meta name="description" content={props.description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={props.title} />
        <meta property="og:description" content={props.description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={props.title} />
        <meta name="twitter:description" content={props.description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </Head>

      <div className="referencePage min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">Clinical trial failures</Link>
              <PrimaryNav active="guides" />
            </div>
          </div>
        </header>

        <main className="referenceMain">
          <nav className="referenceBreadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span><Link href="/failures">Failure data</Link><span>/</span><span>{props.eyebrow}</span>
          </nav>

          <article>
            <header className="referenceHero">
              <div className="referenceHeroCopy">
                <p className="facet-title">{props.eyebrow}</p>
                <h1>{props.h1}</h1>
                <p className="referenceLede">{props.lede}</p>
                <aside className="referenceAnswer" data-ai-summary="true">
                  <strong>Key interpretation</strong>
                  <p>{props.quickAnswer}</p>
                </aside>
              </div>
              <div className="referenceSummary" aria-label="Dataset summary">
                {props.summary.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </header>

            <section className="referenceTableSection" aria-labelledby="reference-table-title">
              <div className="referenceSectionHeading">
                <div>
                  <p className="facet-title">Current dataset</p>
                  <h2 id="reference-table-title">{props.tableTitle}</h2>
                </div>
                <p>{props.tableIntro}</p>
              </div>

              <div className="referenceTableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>{props.firstColumn}</th>
                      <th>Total stopped</th>
                      <th>Likely biological</th>
                      <th>Efficacy / futility</th>
                      <th>Safety</th>
                      <th>Operational</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.rows.map((row) => (
                      <tr key={row.label}>
                        <td>
                          <Link href={row.href}>{row.label}</Link>
                          <span>{row.note}</span>
                        </td>
                        <td>{row.total.toLocaleString()}</td>
                        <td><strong>{row.biological.toLocaleString()}</strong><span>{row.share} of stopped</span></td>
                        <td>{row.efficacy.toLocaleString()}</td>
                        <td>{row.safety.toLocaleString()}</td>
                        <td>{row.operational.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="referenceMobileRows" aria-label={`${props.tableTitle}, mobile view`}>
                {props.rows.map((row) => (
                  <article key={row.label}>
                    <div className="referenceMobileHeader">
                      <div><Link href={row.href}>{row.label}</Link><span>{row.note}</span></div>
                      <strong>{row.total.toLocaleString()}<small> stopped</small></strong>
                    </div>
                    <dl>
                      <div><dt>Biological</dt><dd>{row.biological.toLocaleString()} ({row.share})</dd></div>
                      <div><dt>Efficacy</dt><dd>{row.efficacy.toLocaleString()}</dd></div>
                      <div><dt>Safety</dt><dd>{row.safety.toLocaleString()}</dd></div>
                      <div><dt>Operational</dt><dd>{row.operational.toLocaleString()}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>

            <section className="referenceInterpretation" aria-labelledby="interpretation-title">
              <div className="referenceSectionHeading compact">
                <div>
                  <p className="facet-title">How to use the data</p>
                  <h2 id="interpretation-title">What this comparison does and does not show</h2>
                </div>
              </div>
              <div className="referenceInterpretationGrid">
                {props.interpretation.map((item) => (
                  <article key={item.heading}>
                    <h3>{item.heading}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="referenceMethod" aria-labelledby="method-title">
              <div>
                <p className="facet-title">Method and limitations</p>
                <h2 id="method-title">Read the classification as a screening signal</h2>
              </div>
              <div>
                {props.methodology.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                <Link href="/methods">How classification works →</Link>
              </div>
            </section>

            <section className="referenceExamples" aria-labelledby="examples-title">
              <div className="referenceSectionHeading compact">
                <div>
                  <p className="facet-title">Source-linked examples</p>
                  <h2 id="examples-title">Records behind the comparison</h2>
                </div>
                <p>Examples are selected from the current ingest and link to the corresponding NCT evidence page.</p>
              </div>
              <div className="referenceExampleGrid">
                {props.examples.map((example) => (
                  <article key={example.nctId}>
                    <div className="referenceExampleMeta"><span>{example.category}</span><span>{example.nctId}</span></div>
                    <h3>{example.title}</h3>
                    <p className="referenceSponsor">{example.sponsor}</p>
                    <p>{compactReason(example.reason)}</p>
                    <Link href={example.href}>Open source-linked record →</Link>
                  </article>
                ))}
              </div>
            </section>

            <section className="referenceFaq" aria-labelledby="faq-title">
              <div className="referenceSectionHeading compact">
                <div><p className="facet-title">FAQ</p><h2 id="faq-title">Questions about this comparison</h2></div>
              </div>
              <div className="referenceFaqGrid">
                {props.faqs.map((faq) => <article key={faq.question}><h3>{faq.question}</h3><p>{faq.answer}</p></article>)}
              </div>
            </section>

            <section className="referenceRelated" aria-labelledby="related-title">
              <h2 id="related-title">Continue the analysis</h2>
              <div>
                {props.related.map((item) => (
                  <Link href={item.href} key={item.href}><strong>{item.label}</strong><span>{item.text}</span><em>Open →</em></Link>
                ))}
              </div>
            </section>
          </article>
        </main>
      </div>

      <style jsx>{`
        .referencePage { background: #f7f9fc; color: var(--text); }
        .referenceMain { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 18px 0 54px; }
        .referenceBreadcrumb { display: flex; flex-wrap: wrap; gap: 7px; margin: 0 0 14px; color: var(--text-muted); font-size: 13px; }
        .referenceBreadcrumb a { color: inherit; text-decoration: none; }
        .referenceBreadcrumb a:hover { color: var(--accent); }
        .referenceHero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr); gap: 28px; padding: clamp(22px, 3vw, 36px); border: 1px solid var(--border); border-radius: 12px; background: #fff; box-shadow: 0 18px 44px rgba(15, 23, 42, .06); }
        .referenceHeroCopy { min-width: 0; }
        .referenceHero h1 { max-width: 760px; margin: 5px 0 0; font-size: clamp(2.1rem, 4.5vw, 3.55rem); line-height: 1.03; letter-spacing: 0; }
        .referenceLede { max-width: 760px; margin: 15px 0 0; color: var(--text-muted); font-size: 18px; line-height: 1.62; }
        .referenceAnswer { margin-top: 21px; border-left: 4px solid var(--accent); padding: 3px 0 3px 16px; }
        .referenceAnswer strong { font-size: 13px; text-transform: uppercase; }
        .referenceAnswer p { margin: 6px 0 0; line-height: 1.6; }
        .referenceSummary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-content: stretch; }
        .referenceSummary div { display: flex; min-width: 0; flex-direction: column; justify-content: flex-start; border: 1px solid var(--border); border-radius: 10px; background: var(--surface-2); padding: 14px; }
        .referenceSummary span { color: var(--text-muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
        .referenceSummary strong { margin-top: 7px; font-size: 24px; line-height: 1.08; overflow-wrap: anywhere; }
        .referenceSummary p { margin: 7px 0 0; color: var(--text-muted); font-size: 12px; line-height: 1.42; }
        .referenceTableSection, .referenceInterpretation, .referenceExamples, .referenceFaq, .referenceRelated { margin-top: 28px; }
        .referenceSectionHeading { display: grid; grid-template-columns: minmax(0, .85fr) minmax(320px, 1.15fr); gap: 28px; align-items: end; margin-bottom: 14px; padding: 0 4px; }
        .referenceSectionHeading.compact { align-items: start; }
        .referenceSectionHeading h2, .referenceMethod h2, .referenceRelated h2 { margin: 3px 0 0; font-size: clamp(1.45rem, 2.4vw, 2rem); line-height: 1.14; letter-spacing: 0; }
        .referenceSectionHeading > p { margin: 0; color: var(--text-muted); line-height: 1.55; }
        .referenceTableWrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; background: #fff; box-shadow: 0 14px 34px rgba(15, 23, 42, .045); }
        table { width: 100%; min-width: 900px; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 13px 12px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
        th { background: var(--surface-2); color: var(--text-muted); font-size: 11px; font-weight: 900; text-transform: uppercase; }
        tbody tr:last-child td { border-bottom: 0; }
        td:first-child { width: 28%; }
        td a { display: block; color: var(--accent); font-weight: 850; text-decoration: none; }
        td span { display: block; margin-top: 4px; color: var(--text-muted); font-size: 12px; line-height: 1.35; }
        .referenceMobileRows { display: none; }
        .referenceInterpretationGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .referenceInterpretationGrid article { border-top: 2px solid var(--border); padding: 15px 4px 0; }
        .referenceInterpretationGrid h3 { margin: 0; font-size: 17px; line-height: 1.3; }
        .referenceInterpretationGrid p { margin: 8px 0 0; color: var(--text-muted); line-height: 1.65; }
        .referenceMethod { display: grid; grid-template-columns: minmax(250px, .7fr) minmax(0, 1.3fr); gap: 32px; margin-top: 34px; border-block: 1px solid var(--border); padding: 28px 4px; }
        .referenceMethod p { margin: 0; color: var(--text-muted); line-height: 1.7; }
        .referenceMethod p + p { margin-top: 12px; }
        .referenceMethod a { display: inline-flex; margin-top: 16px; color: var(--accent); font-weight: 850; }
        .referenceExampleGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .referenceExampleGrid article { display: flex; min-width: 0; min-height: 270px; flex-direction: column; border: 1px solid var(--border); border-radius: 12px; background: #fff; padding: 17px; box-shadow: 0 12px 28px rgba(15, 23, 42, .04); }
        .referenceExampleMeta { display: flex; justify-content: space-between; gap: 8px; color: var(--text-muted); font-size: 11px; font-weight: 850; text-transform: uppercase; }
        .referenceExampleGrid h3 { margin: 12px 0 0; font-size: 16px; line-height: 1.34; }
        .referenceExampleGrid p { margin: 10px 0 0; color: var(--text-muted); font-size: 14px; line-height: 1.55; }
        .referenceExampleGrid .referenceSponsor { color: var(--text); font-weight: 750; }
        .referenceExampleGrid a { margin-top: auto; padding-top: 16px; color: var(--accent); font-weight: 850; }
        .referenceFaqGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .referenceFaqGrid article { border: 1px solid var(--border); border-radius: 12px; background: #fff; padding: 17px; }
        .referenceFaqGrid h3 { margin: 0; font-size: 16px; line-height: 1.35; }
        .referenceFaqGrid p { margin: 9px 0 0; color: var(--text-muted); line-height: 1.6; }
        .referenceRelated { border: 1px solid var(--border); border-radius: 12px; background: #fff; padding: 22px; }
        .referenceRelated > div { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 14px; }
        .referenceRelated a { display: flex; min-width: 0; flex-direction: column; border: 1px solid var(--border); border-radius: 10px; padding: 14px; color: var(--text); text-decoration: none; }
        .referenceRelated a:hover { border-color: rgba(79, 70, 229, .4); background: var(--surface-2); }
        .referenceRelated span { margin-top: 7px; color: var(--text-muted); font-size: 13px; line-height: 1.45; }
        .referenceRelated em { margin-top: 12px; color: var(--accent); font-style: normal; font-weight: 850; }
        @media (max-width: 900px) {
          .referenceHero { grid-template-columns: 1fr; }
          .referenceSectionHeading, .referenceMethod { grid-template-columns: 1fr; gap: 10px; }
          .referenceExampleGrid, .referenceFaqGrid, .referenceRelated > div { grid-template-columns: 1fr; }
          .referenceExampleGrid article { min-height: 0; }
        }
        @media (max-width: 680px) {
          .referenceMain { width: min(100% - 24px, 1180px); padding-top: 12px; }
          .referenceHero { gap: 20px; padding: 18px; }
          .referenceHero h1 { font-size: 2.2rem; }
          .referenceLede { font-size: 16px; }
          .referenceSummary { grid-template-columns: 1fr 1fr; }
          .referenceSummary div { padding: 12px; }
          .referenceSummary strong { font-size: 19px; }
          .referenceTableWrap { display: none; }
          .referenceMobileRows { display: grid; gap: 10px; }
          .referenceMobileRows article { border: 1px solid var(--border); border-radius: 10px; background: #fff; padding: 14px; }
          .referenceMobileHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
          .referenceMobileHeader div { min-width: 0; }
          .referenceMobileHeader a { color: var(--accent); font-weight: 850; text-decoration: none; }
          .referenceMobileHeader span { display: block; margin-top: 4px; color: var(--text-muted); font-size: 11px; }
          .referenceMobileHeader > strong { flex: 0 0 auto; font-size: 18px; }
          .referenceMobileHeader small { color: var(--text-muted); font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .referenceMobileRows dl { display: grid; grid-template-columns: 1fr 1fr; gap: 9px 12px; margin: 13px 0 0; border-top: 1px solid var(--border); padding-top: 12px; }
          .referenceMobileRows dl div { min-width: 0; }
          .referenceMobileRows dt { color: var(--text-muted); font-size: 10px; font-weight: 850; text-transform: uppercase; }
          .referenceMobileRows dd { margin: 3px 0 0; font-weight: 800; }
          .referenceInterpretationGrid { grid-template-columns: 1fr; }
          .referenceMethod { padding: 22px 4px; }
          .referenceRelated { padding: 17px; }
        }
      `}</style>
    </>
  );
}
