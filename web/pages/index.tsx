import fs from "fs";
import path from "path";

import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";

import { GUIDE_LINKS } from "@/components/GuidesMenu";
import PrimaryNav from "@/components/PrimaryNav";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { trialPath } from "@/lib/seoUrls";
import type { TrialIndexRow } from "@/lib/types";

const SITE_NAME = "Clinical Trial Failures";
const SITE_URL = "https://clinicaltrialfailures.com";
const ORG_NAME = "Clinical Trial Failures";
const TITLE = "Clinical Trial Failures Database | Why clinical trials stop";
const DESCRIPTION =
  "Search stopped clinical trials from ClinicalTrials.gov. Find terminated, suspended, and withdrawn studies by likely stop reason, sponsor, phase, and source evidence.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

type SampleTrial = {
  nctId: string;
  title: string;
  sponsor: string;
  phase: string;
  status: string;
  bucket: string;
  stopLanguage: string;
  href: string;
};

type HomeStats = {
  trialCount: number;
  scientificCount: number;
  updated: string;
  updatedIso: string;
  source: string;
};

type HomePageProps = {
  stats: HomeStats;
  sampleTrials: SampleTrial[];
};

function asString(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join("; ");
  if (typeof value === "string") return value;
  return String(value);
}

function firstFromSemicolon(value: string): string {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)[0] || "";
}

function mapRawTrial(row: any): TrialIndexRow {
  const phasesRaw =
    row.phases ??
    row.phase ??
    row.phase_list ??
    row.phase_raw ??
    row.phases_raw ??
    "";

  const conditionsRaw =
    row.conditions ??
    row.condition ??
    row.condition_list ??
    row.condition_name ??
    row.condition_names ??
    row.condition_terms ??
    "";

  const interventionsRaw =
    row.intervention_names ??
    row.interventions ??
    row.intervention ??
    row.intervention_list ??
    row.intervention_name ??
    "";

  const whyRaw =
    row.why_stopped ??
    row.why_stopped_reason ??
    row.why_stopped_text ??
    row.reason_stopped ??
    row.reason ??
    "";

  return {
    nct_id: asString(row.nct_id).trim(),
    brief_title: asString(row.brief_title || row.title || row.official_title || "").trim(),
    overall_status: asString(row.overall_status || row.status || "").trim(),
    phases: asString(phasesRaw).trim(),
    disease_area: asString(row.disease_area ?? row.area ?? row.condition_area ?? row.therapeutic_area ?? "Other").trim(),
    lead_sponsor: asString(row.lead_sponsor || row.sponsor || row.organization || "").trim(),
    collaborators: asString(row.collaborators || row.collab || "").trim(),
    condition_first: firstFromSemicolon(asString(conditionsRaw)),
    intervention_first: firstFromSemicolon(asString(interventionsRaw)),
    why_stopped_short: asString(whyRaw).trim(),
    classification_label: asString(row.classification_label || row.label || "").trim(),
    classification_reason: asString(row.classification_reason || row.reason_bucket || "").trim(),
    classification_confidence: asString(row.classification_confidence || row.confidence || "").trim(),
    classification_evidence: asString(row.classification_evidence || row.evidence || "").trim(),
    last_update_post_date: asString(row.last_update_post_date || row.last_update || row.updated || "").trim(),
    url: row.url || (row.nct_id ? `https://clinicaltrials.gov/study/${encodeURIComponent(row.nct_id)}` : ""),
  };
}

function compactNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function cleanDateLabel(value: string): string {
  if (!value) return "latest dataset";
  return value.slice(0, 10);
}

function excerpt(value: string, maxLength = 120): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function bucketClass(bucket: string): string {
  const normalized = bucket.toUpperCase();
  if (normalized === "SAFETY") return "reasonTag reasonTagSafety";
  if (normalized === "EFFICACY/FUTILITY") return "reasonTag reasonTagEfficacy";
  if (normalized === "FUNDING") return "reasonTag reasonTagFunding";
  if (normalized === "OPERATIONAL") return "reasonTag reasonTagOps";
  if (normalized === "REGULATORY") return "reasonTag reasonTagRegulatory";
  return "reasonTag reasonTagOther";
}

function bucketLabel(bucket: string): string {
  if (bucket.toUpperCase() === "EFFICACY/FUTILITY") return "Efficacy / futility";
  if (bucket.toUpperCase() === "OTHER/UNKNOWN") return "Other / unknown";
  return bucket.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildSampleTrials(rows: TrialIndexRow[]): SampleTrial[] {
  const bucketOrder = ["EFFICACY/FUTILITY", "SAFETY", "OPERATIONAL", "FUNDING", "REGULATORY"];
  const chosen: SampleTrial[] = [];
  const seen = new Set<string>();

  for (const wantedBucket of bucketOrder) {
    const row = rows.find((candidate) => {
      if (!candidate.nct_id || seen.has(candidate.nct_id)) return false;
      if (reasonBucket(candidate).toUpperCase() !== wantedBucket) return false;
      if (!candidate.lead_sponsor || !candidate.why_stopped_short) return false;
      if ((candidate.why_stopped_short || "").length < 18) return false;
      return true;
    });

    if (!row) continue;
    seen.add(row.nct_id);
    const phaseKey = parsePhases(row.phases || "")[0] || "UNKNOWN";
    chosen.push({
      nctId: row.nct_id,
      title: row.brief_title || row.nct_id,
      sponsor: row.lead_sponsor || "Unknown sponsor",
      phase: phaseLabel(phaseKey),
      status: row.overall_status || "Stopped",
      bucket: reasonBucket(row),
      stopLanguage: excerpt(row.why_stopped_short || "", 118),
      href: trialPath(row),
    });
  }

  return chosen.slice(0, 5);
}

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const metaPath = path.join(process.cwd(), "public", "dataset_meta.json");
  const dataPath = path.join(process.cwd(), "public", "all_stopped_trials.json");

  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const rawRows = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const rows = rawRows.map(mapRawTrial).filter((row: TrialIndexRow) => row.nct_id);

  const stats: HomeStats = {
    trialCount: meta?.all?.record_count || rows.length,
    scientificCount: meta?.biological_failure?.record_count || rows.filter((row: TrialIndexRow) => reasonBucket(row) === "EFFICACY/FUTILITY").length,
    updated: cleanDateLabel(meta?.all?.max_last_update_post_date || meta?.version || ""),
    updatedIso: cleanDateLabel(meta?.all?.max_last_update_post_date || meta?.version || ""),
    source: meta?.source || "ClinicalTrials.gov",
  };

  return {
    props: {
      stats,
      sampleTrials: buildSampleTrials(rows),
    },
  };
};

export default function HomePage({ stats, sampleTrials }: HomePageProps) {
  const faqItems = [
    {
      question: "What counts as a clinical trial failure?",
      answer:
        "This site starts with stopped studies: terminated, suspended, and withdrawn clinical trials. Not every stopped trial is a failed drug or failed biology, so each record is classified as a screening signal rather than a final judgment.",
    },
    {
      question: "Why do clinical trials stop?",
      answer:
        "Trials can stop because of efficacy or futility signals, safety issues, operational problems, enrollment constraints, funding, sponsor strategy, regulatory issues, or unclear reasons in the registry record.",
    },
    {
      question: "Who is this for?",
      answer:
        "It is built for biotech and pharma teams, investors, consultants, analysts, and researchers who need fast evidence on whether a stopped trial looks like biological failure or something more operational.",
    },
    {
      question: "Is it free?",
      answer: "Yes, the database is free to use, with no account required.",
    },
  ];

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
      name: "Clinical Trial Failures Database",
      description:
        "A searchable database of terminated, suspended, and withdrawn clinical trials derived from ClinicalTrials.gov, each classified by likely stop reason and linked to its source NCT record.",
      url: `${SITE_URL}/explore`,
      isBasedOn: "https://clinicaltrials.gov",
      keywords: ["clinical trial failures", "terminated trials", "trial futility", "stopped clinical trials"],
      creator: {
        "@type": "Organization",
        name: ORG_NAME,
      },
      dateModified: stats.updatedIso,
      license: "https://clinicaltrials.gov/about-site/terms-conditions",
      measurementTechnique: "Rule-based classification of public ClinicalTrials.gov stopped-trial records",
      variableMeasured: ["overall status", "clinical phase", "sponsor", "therapeutic area", "stop reason", "classification bucket"],
      isAccessibleForFree: true,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
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

        <main className="homeMain">
          <section className="hero" aria-labelledby="home-hero-title">
            <div className="container heroGrid">
              <div className="heroCopy">
                <p className="eyebrow">Clinical trial failure database</p>
                <h1 id="home-hero-title">Why clinical trials stop - sorted, sourced, searchable</h1>
                <p className="lede">
                  We turn raw ClinicalTrials.gov stop records into a searchable database of terminated,
                  suspended, and withdrawn trials - each tagged with a likely stop reason and linked back to
                  its source NCT record.
                </p>

                <div className="actions">
                  <Link href="/explore" className="primaryBtn" aria-label="Open the clinical trial failure database">
                    <span>Open the database</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                  <Link href="/methods" className="secondaryBtn" aria-label="Read how classification works">
                    <span>How classification works</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <p className="ctaNote">Free · no sign-up required</p>

                <ul className="trustStrip" aria-label="Dataset facts">
                  <li>
                    <strong>{compactNumber(stats.trialCount)}</strong> stopped trials
                  </li>
                  <li>
                    Updated <strong>{stats.updated}</strong>
                  </li>
                  <li>Sourced from {stats.source}</li>
                  <li>
                    <strong>Free to use</strong>
                  </li>
                </ul>
              </div>

              <figure className="previewCard" aria-label="Sample of stopped trial records">
                <div className="previewBar" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="tableScroll">
                  <table className="sampleTable">
                    <caption>Every classification links back to the primary registry record.</caption>
                    <thead>
                      <tr>
                        <th scope="col">NCT ID</th>
                        <th scope="col">Sponsor / phase</th>
                        <th scope="col">Status</th>
                        <th scope="col">Stop reason and source language</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleTrials.map((trial) => (
                        <tr key={trial.nctId}>
                          <td>
                            <Link href={trial.href}>{trial.nctId}</Link>
                          </td>
                          <td>
                            <strong>{trial.sponsor}</strong>
                            <span className="tableSubline">{trial.phase}</span>
                          </td>
                          <td>{trial.status}</td>
                          <td>
                            <div className="reasonCell">
                              <span className={bucketClass(trial.bucket)}>{bucketLabel(trial.bucket)}</span>
                              <span>{trial.stopLanguage}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
            </div>
          </section>

          <section className="section" aria-labelledby="capabilities-title">
            <div className="container">
              <div className="sectionHeader sectionHeaderWide">
                <p className="eyebrow">What it does</p>
                <h2 id="capabilities-title">A faster way to move from stopped trial to usable evidence</h2>
                <p>
                  Built for biotech and pharma teams, investors, and analysts who need to separate biological
                  failure from operational, funding, and strategic decisions.
                </p>
              </div>

              <div className="capabilityGrid">
                <article className="infoCard">
                  <h3>Preclassified stop reasons</h3>
                  <p>
                    Review efficacy, futility, safety, operational, funding, regulatory, and unknown signals
                    without starting from raw registry text.
                  </p>
                </article>
                <article className="infoCard">
                  <h3>One-click to evidence</h3>
                  <p>
                    Jump from any row to the exact stop language, the NCT detail page, and the primary source
                    record when you need to verify the signal.
                  </p>
                </article>
                <article className="infoCard">
                  <h3>Sponsor and pattern views</h3>
                  <p>
                    Trace repeated stops across sponsors, phases, disease areas, and likely scientific failure
                    buckets.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="section softSection" aria-labelledby="deep-dives-title">
            <div className="container">
              <div className="sectionHeader sectionHeaderWide">
                <p className="eyebrow">Deep dives</p>
                <h2 id="deep-dives-title">Useful entry points, not keyword clutter</h2>
                <p>
                  These pages cover the core research angles while keeping the homepage focused on the actual
                  data product.
                </p>
              </div>

              <div className="deepDiveGrid">
                <Link href="/insights/terminated-clinical-trials-are-not-always-failures" className="deepDiveCard">
                  <span className="deepDiveKicker">Strongest angle</span>
                  <span className="deepDiveTitle">Terminated does not always mean failed</span>
                  <span className="deepDiveText">Use stopped-trial status carefully before calling something a drug failure.</span>
                  <span className="deepDiveAction">Read insight →</span>
                </Link>
                <Link href="/why-clinical-trials-fail" className="deepDiveCard">
                  <span className="deepDiveKicker">Guide</span>
                  <span className="deepDiveTitle">Why trials fail</span>
                  <span className="deepDiveText">Compare efficacy, safety, enrollment, funding, and operational causes.</span>
                  <span className="deepDiveAction">Open guide →</span>
                </Link>
                <Link href="/oncology-clinical-trial-failures" className="deepDiveCard">
                  <span className="deepDiveKicker">Therapeutic area</span>
                  <span className="deepDiveTitle">Oncology trial stops</span>
                  <span className="deepDiveText">Focus on cancer trial terminations, futility, and safety patterns.</span>
                  <span className="deepDiveAction">Open guide →</span>
                </Link>
                <Link href="/clinical-trial-futility" className="deepDiveCard">
                  <span className="deepDiveKicker">Signal type</span>
                  <span className="deepDiveTitle">Futility and failed endpoints</span>
                  <span className="deepDiveText">Find weak efficacy and futility language in stopped study records.</span>
                  <span className="deepDiveAction">Open guide →</span>
                </Link>
              </div>
              <Link href="/clinical-trial-failures" className="allGuidesLink">
                See all guides →
              </Link>
            </div>
          </section>

          <section className="section" aria-labelledby="trust-title">
            <div className="container trustGrid">
              <div className="trustCopy">
                <p className="eyebrow">Trust and method</p>
                <h2 id="trust-title">Medical-data shortcuts still need source discipline</h2>
                <p>
                  The database is derived from public ClinicalTrials.gov records. Classifications are screening
                  signals for analysis - not clinical guidance, investment advice, or a substitute for the primary
                  source record.
                </p>
              </div>
              <div className="methodCard">
                <dl>
                  <div>
                    <dt>Dataset version</dt>
                    <dd>{stats.updated}</dd>
                  </div>
                  <div>
                    <dt>Stopped records</dt>
                    <dd>{compactNumber(stats.trialCount)}</dd>
                  </div>
                  <div>
                    <dt>Likely biological signals</dt>
                    <dd>{compactNumber(stats.scientificCount)}</dd>
                  </div>
                  <div>
                    <dt>Primary source</dt>
                    <dd>{stats.source}</dd>
                  </div>
                  <div>
                    <dt>Built by</dt>
                    <dd>{ORG_NAME}</dd>
                  </div>
                </dl>
                <Link href="/about" className="textLink">
                  About and data trust →
                </Link>
              </div>
            </div>
          </section>

          <section className="section faqSection" aria-labelledby="faq-title">
            <div className="container">
              <div className="sectionHeader sectionHeaderWide">
                <p className="eyebrow">FAQ</p>
                <h2 id="faq-title">Three questions before using the data</h2>
              </div>
              <div className="faqGrid">
                {faqItems.map((item) => (
                  <article className="infoCard" key={item.question}>
                    <h3>{item.question}</h3>
                    <p>{item.answer}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <footer className="homeFooter">
            <div className="container footerInner">
              <div>
                <strong>{SITE_NAME}</strong>
                <p>Stopped clinical trials, sorted by likely reason and source evidence.</p>
              </div>
              <div className="footerLinks" aria-label="Footer links">
                <Link href="/explore">Database</Link>
                <Link href="/methods">Methods</Link>
                <Link href="/insights">Insights</Link>
                <Link href="/about">About</Link>
              </div>
              <div className="footerGuideLinks" aria-label="Guide links">
                <h3>Guides</h3>
                <ul>
                  {GUIDE_LINKS.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/explore" className="primaryBtn footerCta">
                Open the database <span aria-hidden="true">→</span>
              </Link>
            </div>
          </footer>
        </main>
      </div>

      <style jsx>{`
        .homePage {
          min-height: 100vh;
          background: #f8fafc;
          color: #0f172a;
        }

        .homeMain {
          background: #f8fafc;
        }

        .container {
          width: 100%;
          max-width: 1180px;
          margin: 0 auto;
          padding-left: 20px;
          padding-right: 20px;
        }

        .hero {
          padding: clamp(38px, 5.8vw, 70px) 0 clamp(34px, 5vw, 56px);
          background:
            radial-gradient(circle at 10% 12%, rgba(59, 130, 246, 0.08), transparent 30%),
            linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
        }

        .heroGrid {
          display: grid;
          grid-template-columns: minmax(360px, 0.88fr) minmax(560px, 1.12fr);
          gap: clamp(32px, 4vw, 52px);
          align-items: start;
        }

        .eyebrow {
          margin: 0 0 12px;
          color: #475569;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        h1,
        h2,
        h3,
        p {
          margin: 0;
        }

        h1 {
          max-width: 600px;
          font-size: clamp(2.25rem, 3.45vw, 3.45rem);
          font-weight: 850;
          line-height: 1.06;
          letter-spacing: 0;
        }

        h2 {
          max-width: 1040px;
          font-size: clamp(1.75rem, 3vw, 2.55rem);
          font-weight: 850;
          line-height: 1.12;
          letter-spacing: 0;
        }

        h3 {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 850;
          line-height: 1.3;
        }

        p {
          color: #334155;
          line-height: 1.7;
        }

        .lede {
          margin-top: 18px;
          max-width: 590px;
          font-size: clamp(1.02rem, 1.65vw, 1.18rem);
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 26px;
        }

        .ctaNote {
          margin-top: 10px;
          color: #64748b;
          font-size: 14px;
          font-weight: 750;
        }

        .primaryBtn,
        .secondaryBtn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 46px;
          padding: 12px 17px;
          border-radius: 12px;
          font-weight: 850;
          line-height: 1.1;
        }

        .primaryBtn {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.16);
        }

        .secondaryBtn {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
        }

        .primaryBtn:hover,
        .secondaryBtn:hover,
        .textLink:hover,
        .deepDiveCard:hover .deepDiveAction,
        .footerLinks a:hover {
          text-decoration: underline;
          text-underline-offset: 0.18em;
        }

        :global(.homePage .primaryBtn),
        :global(.homePage .secondaryBtn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 46px;
          padding: 12px 17px;
          border-radius: 12px;
          font-weight: 850;
          line-height: 1.1;
        }

        :global(.homePage .primaryBtn) {
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          box-shadow: 0 12px 26px rgba(15, 23, 42, 0.16);
        }

        :global(.homePage .secondaryBtn) {
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
        }

        :global(.homePage .primaryBtn:hover),
        :global(.homePage .secondaryBtn:hover),
        :global(.homePage .textLink:hover),
        :global(.homePage .deepDiveCard:hover .deepDiveAction),
        :global(.homePage .footerLinks a:hover),
        :global(.homePage .sampleTable a:hover) {
          text-decoration: underline;
          text-underline-offset: 0.18em;
        }

        .trustStrip {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          list-style: none;
          margin: 24px 0 0;
          padding: 0;
        }

        .trustStrip li {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 34px;
          padding: 7px 10px;
          border: 1px solid #dbeafe;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.76);
          color: #475569;
          font-size: 13px;
          font-weight: 750;
          text-align: center;
        }

        .trustStrip strong {
          color: #0f172a;
        }

        .previewCard {
          margin: 0;
          overflow: hidden;
          min-width: 0;
          border: 1px solid #d6e0ef;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 22px 60px rgba(15, 23, 42, 0.1);
        }

        .previewBar {
          display: flex;
          gap: 7px;
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .previewBar span {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: #cbd5e1;
        }

        .tableScroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .sampleTable {
          width: 100%;
          border-collapse: collapse;
          font-size: 12.5px;
          table-layout: fixed;
        }

        .sampleTable caption {
          caption-side: bottom;
          padding: 12px 14px;
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          text-align: left;
          font-size: 13px;
          line-height: 1.45;
        }

        .sampleTable th,
        .sampleTable td {
          padding: 10px 11px;
          border-bottom: 1px solid #e2e8f0;
          text-align: left;
          vertical-align: top;
        }

        .sampleTable th {
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .sampleTable td {
          color: #0f172a;
          line-height: 1.35;
          font-variant-numeric: tabular-nums;
        }

        .sampleTable tbody tr:last-child td {
          border-bottom: 0;
        }

        .sampleTable a {
          color: #4338ca;
          font-weight: 850;
        }

        :global(.homePage .sampleTable a) {
          color: #4338ca;
          font-weight: 850;
        }

        .sampleTable th:nth-child(1),
        .sampleTable td:nth-child(1) {
          width: 21%;
        }

        .sampleTable th:nth-child(2),
        .sampleTable td:nth-child(2) {
          width: 25%;
        }

        .sampleTable th:nth-child(3),
        .sampleTable td:nth-child(3) {
          width: 14%;
        }

        .sampleTable th:nth-child(4),
        .sampleTable td:nth-child(4) {
          width: 40%;
        }

        .sampleTable strong,
        .tableSubline,
        .reasonCell {
          display: block;
        }

        .sampleTable strong {
          font-weight: 850;
        }

        .tableSubline {
          margin-top: 4px;
          color: #64748b;
        }

        .reasonCell {
          display: grid;
          gap: 7px;
        }

        .reasonTag {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 850;
          white-space: nowrap;
        }

        .reasonTagEfficacy {
          background: var(--reason-efficacy-bg);
          color: var(--reason-efficacy-text);
        }

        .reasonTagSafety {
          background: var(--reason-safety-bg);
          color: var(--reason-safety-text);
        }

        .reasonTagOps {
          background: var(--reason-operational-bg);
          color: var(--reason-operational-text);
        }

        .reasonTagFunding {
          background: var(--reason-funding-bg);
          color: var(--reason-funding-text);
        }

        .reasonTagRegulatory {
          background: rgba(14, 165, 233, 0.13);
          color: #075985;
        }

        .reasonTagOther {
          background: rgba(15, 23, 42, 0.06);
          color: #334155;
        }

        .section {
          padding: clamp(38px, 5.2vw, 66px) 0;
        }

        .softSection {
          background: #eef4fb;
          border-top: 1px solid #dbe4f0;
          border-bottom: 1px solid #dbe4f0;
        }

        .sectionHeader {
          max-width: 820px;
          margin-bottom: 24px;
        }

        .sectionHeaderWide {
          max-width: 1040px;
        }

        .sectionHeader p,
        .trustCopy p {
          margin-top: 14px;
          font-size: 1rem;
        }

        .capabilityGrid,
        .deepDiveGrid,
        .faqGrid {
          display: grid;
          gap: 14px;
        }

        .capabilityGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .faqGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .deepDiveGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .infoCard,
        .deepDiveCard,
        .methodCard {
          border: 1px solid #dbe4f0;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
        }

        .infoCard {
          padding: 20px;
        }

        .infoCard p {
          margin-top: 10px;
        }

        .deepDiveCard {
          display: flex;
          min-height: 218px;
          flex-direction: column;
          gap: 10px;
          padding: 18px;
          color: inherit;
        }

        :global(.homePage .deepDiveCard) {
          display: flex;
          min-height: 218px;
          flex-direction: column;
          gap: 10px;
          padding: 18px;
          color: inherit;
          border: 1px solid #dbe4f0;
          border-radius: 14px;
          background: #ffffff;
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
        }

        .deepDiveKicker {
          color: #64748b;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .deepDiveTitle {
          color: #0f172a;
          font-size: 1.05rem;
          font-weight: 850;
          line-height: 1.25;
        }

        .deepDiveText {
          color: #334155;
          line-height: 1.55;
        }

        .deepDiveAction {
          margin-top: auto;
          color: #4338ca;
          font-weight: 850;
        }

        .allGuidesLink {
          display: inline-flex;
          margin-top: 18px;
          color: #4338ca;
          font-weight: 850;
        }

        .trustGrid {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(320px, 0.7fr);
          gap: 26px;
          align-items: start;
        }

        .methodCard {
          padding: 20px;
        }

        .methodCard dl {
          display: grid;
          gap: 12px;
          margin: 0;
        }

        .methodCard div {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .methodCard div:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .methodCard dt {
          color: #64748b;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .methodCard dd {
          margin: 0;
          color: #0f172a;
          font-weight: 850;
          line-height: 1.4;
        }

        .textLink {
          display: inline-flex;
          margin-top: 18px;
          color: #4338ca;
          font-weight: 850;
        }

        :global(.homePage .textLink) {
          display: inline-flex;
          margin-top: 18px;
          color: #4338ca;
          font-weight: 850;
        }

        .faqSection {
          padding-top: 0;
        }

        .homeFooter {
          padding: 26px 0;
          border-top: 1px solid #dbe4f0;
          background: #ffffff;
        }

        .footerInner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(180px, auto) minmax(220px, auto) auto;
          gap: 18px;
          align-items: center;
        }

        .footerInner p {
          margin-top: 4px;
          color: #64748b;
          font-size: 14px;
        }

        .footerLinks {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
          color: #475569;
          font-weight: 750;
        }

        .footerGuideLinks h3 {
          margin: 0 0 8px;
          color: #0f172a;
          font-size: 14px;
          font-weight: 850;
        }

        .footerGuideLinks ul {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px 12px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .footerGuideLinks a {
          color: #475569;
          font-size: 13px;
          font-weight: 750;
        }

        :global(.homePage .footerLinks a) {
          color: #475569;
          font-weight: 750;
        }

        :global(.homePage .allGuidesLink),
        :global(.homePage .footerGuideLinks a) {
          text-decoration-thickness: 1.5px;
          text-underline-offset: 0.18em;
        }

        :global(.homePage .allGuidesLink:hover),
        :global(.homePage .allGuidesLink:focus-visible),
        :global(.homePage .footerGuideLinks a:hover),
        :global(.homePage .footerGuideLinks a:focus-visible) {
          text-decoration: underline;
        }

        .footerCta {
          min-height: 42px;
          padding: 10px 14px;
        }

        :global(.homePage .homeBrand),
        :global(.homePage .navlink) {
          text-decoration-thickness: 1.5px;
          text-underline-offset: 0.18em;
        }

        :global(.homePage .homeBrand:hover),
        :global(.homePage .homeBrand:focus-visible),
        :global(.homePage .navlink:hover),
        :global(.homePage .navlink:focus-visible) {
          text-decoration: underline;
        }

        @media (max-width: 900px) {
          .heroGrid,
          .trustGrid,
          .footerInner {
            grid-template-columns: 1fr;
          }

          .heroCopy,
          h1,
          .lede {
            max-width: none;
          }

          .capabilityGrid,
          .deepDiveGrid,
          .faqGrid {
            grid-template-columns: 1fr;
          }

          .footerLinks {
            justify-content: flex-start;
          }
        }

        @media (max-width: 640px) {
          .container {
            padding-left: 14px;
            padding-right: 14px;
          }

          .hero {
            padding-top: 30px;
          }

          h1 {
            font-size: clamp(2.05rem, 12vw, 2.85rem);
          }

          .actions,
          .primaryBtn,
          .secondaryBtn,
          .footerCta {
            width: 100%;
          }

          .primaryBtn,
          .secondaryBtn,
          .footerCta {
            justify-content: center;
          }

          .trustStrip {
            display: grid;
            grid-template-columns: 1fr;
          }

          .sampleTable {
            min-width: 680px;
          }

          .methodCard div {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }
      `}</style>
    </>
  );
}
