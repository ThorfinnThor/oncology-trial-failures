import Head from "next/head";
import { serializeJsonLd } from "@/lib/serializeJsonLd";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { FormEvent, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { trialPath } from "@/lib/seoUrls";
import type { TrialIndexRow } from "@/lib/types";
import homeOutcomes from "@/data/home_outcomes.json";

type OutcomeExample = {
  nct_id: string;
  sponsor: string | null;
  phase: string;
  drugs: string;
  evidence: string;
  evidence_source: string;
  posted: string | null;
  href: string;
  external: boolean;
};

type OutcomeCard = {
  key: string;
  status: string;
  label: string;
  count: number;
  count_label: string;
  example: OutcomeExample | null;
};

const SITE_NAME = "Clinical Trial Failures";
const SITE_URL = "https://clinicaltrialfailures.com";
const TITLE = "Clinical Trial Failures: why clinical trials stop";
const DESCRIPTION =
  "Search 23,000+ stopped clinical trials classified by why they stopped. Find efficacy, futility, safety, recruitment, business, funding, and regulatory stop signals linked to ClinicalTrials.gov.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;
const ASSET_EXAMPLES = ["PD-L1", "KRAS", "HER2 ADC", "osimertinib"];

type SampleTrial = {
  nctId: string;
  sponsor: string;
  phase: string;
  bucket: string;
  stopLanguage: string;
  href: string;
};

type ClassificationStats = {
  version: string;
  resolved: number;
  reviewGated: number;
  biological: number;
  efficacy: number;
  safety: number;
  biologicalUnspecified: number;
  recruitment: number;
  business: number;
  funding: number;
  regulatory: number;
  supply: number;
  mixed: number;
  decisionOnly: number;
  assertionPrecision: number;
  biologicalPrecision: number;
  heldoutBiologicalPrecision: number;
  heldoutBiologicalRecall: number;
  heldoutAssertionAgreement: number;
  heldoutSampleSize: number;
};

type HomeStats = {
  trialCount: number;
  updated: string;
  updatedIso: string;
  source: string;
  classification: ClassificationStats;
};

type BrowseLink = {
  href: string;
  label: string;
  total?: number;
};

type HomeBrowse = {
  areas: BrowseLink[];
  sponsors: BrowseLink[];
  insights: BrowseLink[];
};

type HomePageProps = {
  stats: HomeStats;
  sampleTrials: SampleTrial[];
  browse: HomeBrowse;
};

// How many hub and insight links the home page carries: enough that every large area and sponsor
// hub is one click from the home page, few enough to stay a readable index.
const BROWSE_AREA_LIMIT = 16;
const BROWSE_SPONSOR_LIMIT = 24;
const BROWSE_INSIGHT_LIMIT = 8;

function compactNumber(value: number): string {
  return value.toLocaleString("en-US");
}

function cleanDateLabel(value: string): string {
  if (!value) return "latest dataset";
  return value.slice(0, 10);
}

function percent(value: number, total: number): string {
  if (!total) return "0%";
  const result = (value / total) * 100;
  return `${result >= 10 ? result.toFixed(0) : result.toFixed(1)}%`;
}

function qualityPercent(value: number): string {
  return value ? `${(value * 100).toFixed(1)}%` : "Validated";
}

function excerpt(value: string, maxLength = 112): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function bucketClass(bucket: string): string {
  const normalized = bucket.toUpperCase();
  if (normalized === "SAFETY") return "v2Tag v2TagSafety";
  if (normalized === "EFFICACY/FUTILITY") return "v2Tag v2TagEfficacy";
  if (normalized === "FUNDING") return "v2Tag v2TagFunding";
  if (normalized === "REGULATORY") return "v2Tag v2TagRegulatory";
  if (normalized === "DECISION ONLY") return "v2Tag v2TagDecision";
  return "v2Tag v2TagOperational";
}

function bucketLabel(bucket: string): string {
  if (bucket.toUpperCase() === "EFFICACY/FUTILITY") return "Efficacy / futility";
  if (bucket.toUpperCase() === "OTHER/UNKNOWN") return "Review gated";
  if (bucket.toUpperCase() === "DECISION ONLY") return "Decision only";
  return bucket.toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildSampleTrials(rows: TrialIndexRow[]): SampleTrial[] {
  const bucketOrder = ["EFFICACY/FUTILITY", "SAFETY", "FUNDING", "REGULATORY", "DECISION ONLY"];
  const chosen: SampleTrial[] = [];
  const seen = new Set<string>();

  for (const wantedBucket of bucketOrder) {
    const row = rows.find((candidate) => {
      if (!candidate.nct_id || seen.has(candidate.nct_id)) return false;
      if (reasonBucket(candidate).toUpperCase() !== wantedBucket) return false;
      if (!candidate.lead_sponsor || !candidate.why_stopped_short) return false;
      return candidate.why_stopped_short.length >= 24;
    });
    if (!row) continue;
    seen.add(row.nct_id);
    const phaseKey = parsePhases(row.phases || "")[0] || "UNKNOWN";
    chosen.push({
      nctId: row.nct_id,
      sponsor: row.lead_sponsor || "Unknown sponsor",
      phase: phaseLabel(phaseKey),
      bucket: reasonBucket(row),
      stopLanguage: excerpt(row.why_stopped_short || ""),
      href: trialPath(row),
    });
  }
  return chosen.slice(0, 5);
}

export const getStaticProps: GetStaticProps<HomePageProps> = async () => {
  const { loadIndexServer, readJsonServerAsset } = await import("@/lib/server-data");
  const { buildFailureHubs, buildSponsorHubs } = await import("@/lib/seoHubs");
  const { INSIGHT_ARTICLES, insightPath, sortInsightArticlesByDate } = await import("@/lib/insights");
  const [meta, rows] = await Promise.all([
    readJsonServerAsset<any>("public/dataset_meta.json"),
    loadIndexServer(),
  ]);
  const outcomes = meta?.classification_v2?.outcomes || {};
  const reasons = meta?.classification_v2?.primary_reasons || {};
  const quality = meta?.classification_v2?.quality || {};
  const heldout = meta?.classification_v2?.heldout_validation || {};
  const trialCount = meta?.all?.record_count || rows.length;
  const reviewGated = meta?.classification_v2?.needs_review || outcomes.UNKNOWN || 0;

  return {
    props: {
      stats: {
        trialCount,
        updated: cleanDateLabel(meta?.all?.max_last_update_post_date || meta?.version || ""),
        updatedIso: cleanDateLabel(meta?.all?.max_last_update_post_date || meta?.version || ""),
        source: meta?.source || "ClinicalTrials.gov API v2",
        classification: {
          version: meta?.classification_v2?.version || "2.7.0",
          resolved: trialCount - reviewGated,
          reviewGated,
          biological: outcomes.BIOLOGICAL_FAILURE || meta?.biological_failure?.record_count || 0,
          efficacy: reasons.EFFICACY_FUTILITY || 0,
          safety: reasons.SAFETY || 0,
          biologicalUnspecified: reasons.BIOLOGICAL_UNSPECIFIED || 0,
          recruitment: reasons.RECRUITMENT || 0,
          business: reasons.BUSINESS_STRATEGY || 0,
          funding: reasons.FUNDING || 0,
          regulatory: reasons.REGULATORY || 0,
          supply: reasons.SUPPLY_MANUFACTURING || 0,
          mixed: outcomes.MIXED_CAUSES || 0,
          decisionOnly: reasons.DECISION_WITHOUT_STATED_CAUSE || 0,
          assertionPrecision: quality.assertion_precision || 0,
          biologicalPrecision: quality.biological_precision || 0,
          heldoutBiologicalPrecision: heldout.biological_precision || 0,
          heldoutBiologicalRecall: heldout.biological_recall || 0,
          heldoutAssertionAgreement: heldout.assertion_no_material_disagreement || 0,
          heldoutSampleSize: heldout.sample_size || 0,
        },
      },
      sampleTrials: buildSampleTrials(rows),
      browse: {
        areas: buildFailureHubs(rows)
          .filter((hub) => hub.kind === "area")
          .sort((a, b) => b.total - a.total)
          .slice(0, BROWSE_AREA_LIMIT)
          .map((hub) => ({ href: hub.path, label: hub.label, total: hub.total })),
        sponsors: buildSponsorHubs(rows)
          .slice(0, BROWSE_SPONSOR_LIMIT)
          .map((hub) => ({ href: hub.path, label: hub.label, total: hub.total })),
        insights: sortInsightArticlesByDate(INSIGHT_ARTICLES)
          .slice(0, BROWSE_INSIGHT_LIMIT)
          .map((article) => ({ href: insightPath(article), label: article.title })),
      },
    },
  };
};

export default function HomePage({ stats, sampleTrials, browse }: HomePageProps) {
  const v2 = stats.classification;
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [newsletterMessage, setNewsletterMessage] = useState("");
  const [newsletterAddress, setNewsletterAddress] = useState("");

  async function subscribeToNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const address = String(form.get("email") || "").trim();
    setNewsletterAddress(address);
    setNewsletterStatus("sending");
    setNewsletterMessage("");

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not sign you up.");
      setNewsletterMessage(data.message || "");
      setNewsletterStatus("done");
    } catch (error: any) {
      setNewsletterMessage(error?.message || "Could not sign you up. Please try again.");
      setNewsletterStatus("error");
    }
  }

  const biologicalCategories = [
    {
      label: "Efficacy / futility",
      value: v2.efficacy,
      detail: "Lack of benefit, failed endpoints, futility, or insufficient activity.",
      href: "/explore?bucket=EFFICACY%2FFUTILITY",
      className: "v2BioEfficacy",
    },
    {
      label: "Safety",
      value: v2.safety,
      detail: "Toxicity, tolerability, adverse events, or an adverse safety assessment.",
      href: "/explore?bucket=SAFETY",
      className: "v2BioSafety",
    },
    {
      label: "Biological, unspecified",
      value: v2.biologicalUnspecified,
      detail: "A biological signal is supported, but the source does not isolate safety from efficacy.",
      href: "/clinical-trial-failures",
      className: "v2BioUnspecified",
    },
  ];
  const operationalCategories = [
    { label: "Recruitment", value: v2.recruitment, href: "/explore?bucket=OPERATIONAL" },
    { label: "Business strategy", value: v2.business, href: "/sponsor-insights" },
    { label: "Funding", value: v2.funding, href: "/explore?bucket=FUNDING" },
    { label: "Decision, cause not stated", value: v2.decisionOnly, href: "/methods" },
    { label: "Supply / manufacturing", value: v2.supply, href: "/explore?bucket=OPERATIONAL" },
    { label: "Regulatory", value: v2.regulatory, href: "/explore?bucket=REGULATORY" },
  ];
  const maxOperational = Math.max(...operationalCategories.map((category) => category.value), 1);

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
      description: "Evidence-classified terminated, suspended, and withdrawn clinical trials derived from ClinicalTrials.gov.",
      url: `${SITE_URL}/explore`,
      isBasedOn: "https://clinicaltrials.gov",
      dateModified: stats.updatedIso,
      version: v2.version,
      isAccessibleForFree: true,
      license: "https://creativecommons.org/licenses/by-nc/4.0/",
      identifier: "https://doi.org/10.5281/zenodo.23558833",
      creator: [
        { "@type": "Person", name: "Schayan Yousefian" },
        { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      ],
      measurementTechnique: "Audited rule-based semantic classification with explicit review gating",
      variableMeasured: ["trial status", "clinical phase", "sponsor", "disease area", "registered stop reason", "classification outcome", "classification reason"],
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
        <meta property="og:image:alt" content="Clinical Trial Failures database" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      </Head>

      <div className="v2Home">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand" aria-current="page" aria-label="Go to homepage">Clinical trial failures</Link>
              <PrimaryNav />
            </div>
          </div>
        </header>

        <main>
          <section className="v2Hero" aria-labelledby="v2-hero-title">
            <div className="v2Container v2HeroGrid">
              <div className="v2HeroCopy">
                <div className="v2ReleaseLine">
                  <span className="v2Pulse" aria-hidden="true" />
                  <span>Classification V{v2.version}</span>
                  <span className="v2ReleaseDivider" aria-hidden="true" />
                  <span>{compactNumber(v2.resolved)} resolved records</span>
                </div>
                <h1 id="v2-hero-title">Has a drug with your target<span>failed before?</span></h1>
                <p className="v2HeroLede">
                  Name a molecule, target or mechanism. See which trials against it were stopped for efficacy, futility or safety — kept apart from recruitment, funding and strategy stops — and which completed trials missed their primary endpoint.
                </p>

                {/* The buyer's question first: the asset check reads ?q= and runs on arrival. */}
                <form className="v2Search" action="/asset-check" method="get" role="search">
                  <label className="sr-only" htmlFor="v2-home-asset">Check a molecule, target or mechanism</label>
                  <span className="v2SearchPrompt" aria-hidden="true">/</span>
                  <input id="v2-home-asset" name="q" type="search" placeholder="Molecule, target or mechanism" autoComplete="off" />
                  <button type="submit">Check a molecule</button>
                </form>
                <div className="v2HeroExamples">
                  <span>Try</span>
                  {ASSET_EXAMPLES.map((example) => (
                    <Link href={`/asset-check?q=${encodeURIComponent(example)}`} key={example}>{example}</Link>
                  ))}
                </div>

                <Link href="/validation" className="v2HeroValidation" aria-label="Held-out validation results">
                  <dl className="v2HeroMetrics">
                    <div><dt>Biological precision</dt><dd>{qualityPercent(v2.heldoutBiologicalPrecision)}</dd></div>
                    <div><dt>Biological recall</dt><dd>{qualityPercent(v2.heldoutBiologicalRecall)}</dd></div>
                    <div><dt>Stopped trials read</dt><dd>{compactNumber(stats.trialCount)}</dd></div>
                  </dl>
                  <span className="v2HeroValidationNote">
                    Held-out validation, blind double annotation, n={v2.heldoutSampleSize || 600} <span aria-hidden="true">→</span>
                  </span>
                </Link>

                <div className="v2HeroActions">
                  <Link href="/explore" className="v2SecondaryAction">Search all {compactNumber(stats.trialCount)} trials</Link>
                  <Link href="/methods" className="v2SecondaryAction">Read the method</Link>
                </div>
              </div>

              <div className="v2Console" aria-label="Live sample of classified trial records">
                <div className="v2ConsoleHeader">
                  <div><span className="v2ConsoleDot" aria-hidden="true" /><span>CLASSIFICATION_FEED</span></div>
                  <span>SNAPSHOT {stats.updated}</span>
                </div>
                <div className="v2ConsoleSummary">
                  <div><span>resolved</span><strong>{compactNumber(v2.resolved)}</strong></div>
                  <div><span>review gated</span><strong>{compactNumber(v2.reviewGated)}</strong></div>
                  <div><span>mixed cause</span><strong>{compactNumber(v2.mixed)}</strong></div>
                </div>
                <div className="v2ResolutionBar" aria-label={`${percent(v2.resolved, stats.trialCount)} resolved`}>
                  <span style={{ width: percent(v2.resolved, stats.trialCount) }} />
                </div>
                <div className="v2ConsoleRows">
                  {sampleTrials.slice(0, 4).map((trial, index) => (
                    <Link href={trial.href} className="v2ConsoleRow" key={trial.nctId}>
                      <span className="v2RowIndex">{String(index + 1).padStart(2, "0")}</span>
                      <span className="v2TrialIdentity"><strong>{trial.nctId}</strong><small>{trial.sponsor} · {trial.phase}</small></span>
                      <span className={bucketClass(trial.bucket)}>{bucketLabel(trial.bucket)}</span>
                      <span className="v2Evidence">{trial.stopLanguage}</span>
                      <span className="v2RowArrow" aria-hidden="true">↗</span>
                    </Link>
                  ))}
                </div>
                <div className="v2ConsoleFooter"><span>Source-linked evidence</span><span>Free · no sign-up</span></div>
              </div>
            </div>
          </section>

          <section className="v2Newsletter" aria-labelledby="v2-newsletter-title">
            <div className="v2Container">
              <div className="v2NewsletterBox">
                <div className="v2NewsletterCopy">
                  <p className="v2Kicker">Free newsletter</p>
                  <h2 id="v2-newsletter-title">Get newly stopped clinical trials in your inbox.</h2>
                  <p className="v2NewsletterLede">
                    Every two weeks, we email the trials newly added to our database, the records sponsors changed,
                    and the stop rates that moved. Every item links back to its source.
                  </p>
                  <ul className="v2NewsletterBenefits">
                    <li><strong>New trial stops</strong><span>The reason the sponsor posted</span></li>
                    <li><strong>Sponsor updates</strong><span>What changed in the registry record</span></li>
                    <li><strong>Stop-rate changes</strong><span>Where the numbers moved</span></li>
                  </ul>
                  <Link href="/newsletter" className="v2NewsletterExample">See the latest newsletter →</Link>
                </div>

                <div className="v2NewsletterSignup">
                  {newsletterStatus === "done" ? (
                    <div className="v2NewsletterSuccess" role="status">
                      <span aria-hidden="true">✓</span>
                      <h3>Check your inbox</h3>
                      <p>
                        We sent a confirmation link{newsletterAddress ? <> to <strong>{newsletterAddress}</strong></> : null}.
                        Your subscription starts after you confirm it.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={subscribeToNewsletter}>
                      <div className="v2NewsletterFormHead">
                        <span>FREE NEWSLETTER</span>
                        <strong>Subscribe by email</strong>
                      </div>
                      <div className="v2NewsletterField">
                        <label htmlFor="home-newsletter-email">Email address</label>
                        <input
                          id="home-newsletter-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@company.com"
                          required
                        />
                      </div>
                      <div className="v2NewsletterField">
                        <label htmlFor="home-newsletter-company">Company or institution <span>optional</span></label>
                        <input
                          id="home-newsletter-company"
                          name="company"
                          type="text"
                          autoComplete="organization"
                          placeholder="Organization"
                        />
                      </div>
                      <input
                        name="website"
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="v2NewsletterHoneypot"
                      />
                      <button type="submit" disabled={newsletterStatus === "sending"}>
                        {newsletterStatus === "sending" ? "Signing you up…" : "Subscribe to the free newsletter"}
                      </button>
                      {newsletterStatus === "error" ? (
                        <p className="v2NewsletterError" role="alert">{newsletterMessage}</p>
                      ) : null}
                      <p className="v2NewsletterPrivacy">
                        One email every two weeks. No account. Confirm by email. Unsubscribe with one click. See our{" "}
                        <Link href="/privacy">privacy notice</Link>.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="v2QuestionMap" aria-labelledby="v2-question-map-title">
            <div className="v2Container">
              <div className="v2QuestionIntro">
                <p className="v2Kicker">Choose the evidence question</p>
                <h2 id="v2-question-map-title">A stopped status is a starting point, not a diagnosis.</h2>
                <p>Start with the question you need to answer. Each route keeps source language and uncertainty visible instead of treating every stopped study as the same event.</p>
              </div>
              <div className="v2QuestionGrid">
                <Link href="/clinical-trial-futility" className="v2QuestionCard biological">
                  <span>01 · Scientific signal</span>
                  <strong>Did the intervention appear not to work or become unsafe?</strong>
                  <p>{compactNumber(v2.efficacy)} efficacy/futility and {compactNumber(v2.safety)} safety records provide the closest registry evidence.</p>
                  <em>Review biological evidence →</em>
                </Link>
                <Link href="/overview" className="v2QuestionCard operational">
                  <span>02 · Execution and strategy</span>
                  <strong>Did recruitment, funding, supply, or a portfolio decision stop the study?</strong>
                  <p>{compactNumber(v2.recruitment)} recruitment and {compactNumber(v2.business)} business/strategy records need a different interpretation.</p>
                  <em>Compare stop reasons →</em>
                </Link>
                <Link href="/methods" className="v2QuestionCard uncertain">
                  <span>03 · Unresolved evidence</span>
                  <strong>Is the registry wording too incomplete to support a confident classification?</strong>
                  <p>{compactNumber(v2.reviewGated)} records remain review-gated rather than being forced into a dramatic conclusion.</p>
                  <em>See the review policy →</em>
                </Link>
              </div>
            </div>
          </section>

          {/* Four ways a trial ends, one real record each. "Stopped" and "failed" are different
              questions; this is where a visitor sees that the site answers both. The examples are
              picked by rule in scripts/universe/build_home_outcomes.py, never by hand. */}
          <section className="v2Outcomes" aria-labelledby="v2-outcomes-title">
            <div className="v2Container">
              <div className="v2SectionIntro">
                <div><p className="v2Kicker">Two ways a trial fails</p><h2 id="v2-outcomes-title">Stopped is not the same as failed.</h2></div>
                <p>A trial can be stopped early — for efficacy, for safety, or for reasons that say nothing about the drug. Or it can run to the end and miss its primary endpoint, which a stop reason never shows. We read both from the registry, each with the record it came from.</p>
              </div>
              <div className="v2OutcomeGrid">
                {(homeOutcomes.cards as OutcomeCard[]).map((card) => (
                  <article className={`v2Outcome v2Outcome-${card.key}`} key={card.key}>
                    <div className="v2OutcomeHead">
                      <span className="v2OutcomeStatus">{card.status}</span>
                      <h3>{card.label}</h3>
                    </div>
                    <div className="v2OutcomeCount">
                      <strong>{compactNumber(card.count)}</strong>
                      <span>{card.count_label}</span>
                    </div>
                    {card.example ? (
                      <div className="v2OutcomeExample">
                        <div className="v2OutcomeId">
                          <strong>{card.example.nct_id}</strong>
                          <small>
                            {[card.example.sponsor, card.example.phase, card.example.drugs].filter(Boolean).join(" · ")}
                          </small>
                        </div>
                        <p className="v2OutcomeEvidence">{card.example.evidence}</p>
                        <p className="v2OutcomeSource">From {card.example.evidence_source}.</p>
                        {card.example.posted ? (
                          <p className="v2OutcomePosted"><b>Posted results:</b> {card.example.posted}</p>
                        ) : null}
                        {card.example.external ? (
                          <a className="v2OutcomeLink" href={card.example.href} target="_blank" rel="noreferrer">
                            Check the results tab <span aria-hidden="true">↗</span>
                          </a>
                        ) : (
                          <Link className="v2OutcomeLink" href={card.example.href}>
                            Open the record <span aria-hidden="true">→</span>
                          </Link>
                        )}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              <p className="v2OutcomeNote">
                Stopped: terminated, suspended or withdrawn trials whose sponsor-stated primary reason is efficacy, futility
                or safety. Completed: Phase 2/3
                trials whose posted primary result can be read — {compactNumber(homeOutcomes.readable_completed)} so far
                {homeOutcomes.read_on ? `, read ${homeOutcomes.read_on}` : ""}. Most completed trials post nothing readable,
                so these are floors. Met is not approval, and missed is not a verdict on the drug.{" "}
                <Link href="/methods#completed-endpoints">How it is read →</Link>
              </p>
            </div>
          </section>

          <section className="v2Signals" aria-labelledby="biological-signals-title">
            <div className="v2Container">
              <div className="v2SectionIntro">
                <div><p className="v2Kicker">Signal architecture</p><h2 id="biological-signals-title">Start with the biological question.</h2></div>
                <p>The classification separates a likely scientific stop signal from the much larger set of trials that stopped for operational, strategic, financial, regulatory, or unspecified reasons.</p>
              </div>

              <div className="v2SignalLayout">
                <article className="v2BiologicalPanel">
                  <div className="v2PanelHeading">
                    <div><span className="v2PanelCode">OUTCOME_01</span><h3>Likely biological failure signals</h3></div>
                    <div className="v2PanelTotal"><strong>{compactNumber(v2.biological)}</strong><span>{percent(v2.biological, stats.trialCount)} of stopped records</span></div>
                  </div>
                  <div className="v2BiologicalBar" aria-hidden="true">
                    <span className="v2BioBarEfficacy" style={{ width: percent(v2.efficacy, v2.biological) }} />
                    <span className="v2BioBarSafety" style={{ width: percent(v2.safety, v2.biological) }} />
                    <span className="v2BioBarUnspecified" style={{ width: percent(v2.biologicalUnspecified, v2.biological) }} />
                  </div>
                  <div className="v2BiologicalGrid">
                    {biologicalCategories.map((category) => (
                      <Link href={category.href} className={`v2BiologicalItem ${category.className}`} key={category.label}>
                        <span className="v2CategoryMarker" aria-hidden="true" />
                        <strong>{compactNumber(category.value)}</strong>
                        <h4>{category.label}</h4>
                        <p>{category.detail}</p>
                        <span className="v2InlineAction">Inspect records →</span>
                      </Link>
                    ))}
                  </div>
                </article>

                <aside className="v2CauseIndex" aria-label="Other major stop reason categories">
                  <div className="v2CauseIndexHeader">
                    <div><span className="v2PanelCode">CAUSE_INDEX</span><h3>Other major causes</h3></div>
                    <Link href="/overview">View full overview →</Link>
                  </div>
                  <div className="v2CauseRows">
                    {operationalCategories.map((category) => (
                      <Link href={category.href} className="v2CauseRow" key={category.label}>
                        <span className="v2CauseLabel">{category.label}</span>
                        <span className="v2CauseTrack" aria-hidden="true"><span style={{ width: percent(category.value, maxOperational) }} /></span>
                        <strong>{compactNumber(category.value)}</strong>
                      </Link>
                    ))}
                  </div>
                  <div className="v2ReviewNote">
                    <strong>{compactNumber(v2.reviewGated)} remain explicitly unresolved.</strong>
                    <p>Missing or ambiguous source language is review-gated instead of being forced into a category.</p>
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <section className="v2Method" aria-labelledby="v2-method-title">
            <div className="v2Container">
              <div className="v2MethodHeader">
                <div><p className="v2Kicker">Classification engine</p><h2 id="v2-method-title">Evidence in. Auditable signal out.</h2></div>
                <Link href="/methods" className="v2MethodLink">Full methodology →</Link>
              </div>
              <ol className="v2Pipeline">
                <li><span>01</span><strong>Registry source</strong><p>Read the sponsor-provided stop language and structured ClinicalTrials.gov fields.</p></li>
                <li><span>02</span><strong>Semantic evidence</strong><p>Apply polarity-aware rules for efficacy, safety, recruitment, funding, strategy, and more.</p></li>
                <li><span>03</span><strong>Outcome + cause</strong><p>Store the high-level outcome separately from the stated primary and secondary causes.</p></li>
                <li><span>04</span><strong>Review gate</strong><p>Keep missing, directionless, mixed, or novel language visible without inventing certainty.</p></li>
              </ol>
              <div className="v2AuditStrip">
                <span>Classifier V{v2.version}</span>
                <span>{qualityPercent(v2.heldoutBiologicalPrecision)} biological precision</span>
                <span>{qualityPercent(v2.heldoutBiologicalRecall)} biological recall</span>
                <Link href="/validation">Held-out validation, n={v2.heldoutSampleSize || 600}</Link>
                <span>{stats.source}</span>
                <span>Updated {stats.updated}</span>
              </div>
            </div>
          </section>

          <section className="v2Workflows" aria-labelledby="v2-workflows-title">
            <div className="v2Container">
              <div className="v2SectionIntro v2SectionIntroCompact"><div><p className="v2Kicker">Research entry points</p><h2 id="v2-workflows-title">Move from question to source record.</h2></div></div>
              <div className="v2WorkflowGrid">
                <Link href="/top-10-oncology-clinical-trial-failures" className="v2Workflow"><span>01 / BIOLOGY</span><h3>Which interventions show repeated biological stop signals?</h3><p>Compare efficacy, futility, and safety patterns without treating every termination as drug failure.</p><strong>Open signal ranking →</strong></Link>
                <Link href="/sponsor-insights" className="v2Workflow"><span>02 / SPONSORS</span><h3>Where do sponsor-level stop patterns repeat?</h3><p>Review stopped-trial volume alongside biological, strategic, funding, and operational classifications.</p><strong>Compare sponsors →</strong></Link>
                <Link href="/reports/latest-two-week-stopped-trial-updates" className="v2Workflow"><span>03 / MONITOR</span><h3>What changed in the latest ingest?</h3><p>Inspect newly added and recently updated stopped trials through a repeatable reporting view.</p><strong>Open latest report →</strong></Link>
              </div>
            </div>
          </section>

          <section className="v2Browse" aria-labelledby="v2-browse-title">
            <div className="v2Container">
              <div className="v2SectionIntro v2SectionIntroCompact"><div><p className="v2Kicker">Browse the evidence</p><h2 id="v2-browse-title">Stopped trials by disease area, sponsor and question.</h2></div></div>
              <div className="v2BrowseGrid">
                <nav aria-labelledby="v2-browse-areas">
                  <h3 id="v2-browse-areas">Disease areas</h3>
                  <ul>{browse.areas.map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link>{item.total ? <span>{compactNumber(item.total)}</span> : null}</li>)}</ul>
                  <Link href="/failures" className="v2BrowseMore">All failure hubs →</Link>
                </nav>
                <nav aria-labelledby="v2-browse-sponsors">
                  <h3 id="v2-browse-sponsors">Sponsors</h3>
                  <ul>{browse.sponsors.map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link>{item.total ? <span>{compactNumber(item.total)}</span> : null}</li>)}</ul>
                  <Link href="/sponsors" className="v2BrowseMore">All sponsors →</Link>
                </nav>
                <nav aria-labelledby="v2-browse-insights">
                  <h3 id="v2-browse-insights">Latest insights</h3>
                  <ul>{browse.insights.map((item) => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}</ul>
                  <Link href="/insights" className="v2BrowseMore">All insights →</Link>
                  <Link href="/briefs" className="v2BrowseMore">Mechanism briefs →</Link>
                </nav>
              </div>
            </div>
          </section>

          <section className="v2Trust" aria-labelledby="v2-trust-title">
            <div className="v2Container v2TrustInner">
              <div><p className="v2Kicker">Source discipline</p><h2 id="v2-trust-title">A screening signal, not a final medical conclusion.</h2></div>
              <p>Every important finding should be verified against the linked ClinicalTrials.gov record. The database supports research and screening; it does not provide clinical guidance, guarantee source accuracy, or replace scientific, statistical, regulatory, or medical review.</p>
              <div className="v2TrustLinks"><Link href="/about">Data trust</Link><Link href="/disclaimer">Disclaimer</Link><Link href="/contact">Contact</Link></div>
            </div>
          </section>
        </main>

        <footer className="v2Footer">
          <div className="v2Container v2FooterInner">
            <div><strong>{SITE_NAME}</strong><p>Stopped clinical trials, classified by evidence and linked to source.</p></div>
            <nav aria-label="Footer"><Link href="/explore">Database</Link><Link href="/clinical-trial-failures">Clinical trial failures guide</Link><Link href="/methods">Methods</Link><Link href="/insights">Insights</Link><Link href="/about">About</Link><Link href="/privacy">Privacy</Link><Link href="/imprint">Imprint</Link></nav>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        .v2Home{--v2-ink:#0f172a;--v2-ink-soft:#1e293b;--v2-paper:#f7f8fb;--v2-line:rgba(15,23,42,.10);--v2-copy:#334155;--v2-muted:#64748b;--v2-green:#818cf8;--v2-green-deep:#4f46e5;--v2-cyan:#38bdf8;--v2-coral:#fb7185;--v2-amber:#f59e0b;min-height:100vh;background:var(--v2-paper);color:var(--v2-ink)}
        .v2Container{width:100%;max-width:1280px;margin:0 auto;padding:0 24px}
        .v2Hero{padding:58px 0 52px;background:var(--v2-ink);color:#f8fafc;border-bottom:5px solid var(--v2-green-deep)}
        .v2HeroGrid{display:grid;grid-template-columns:minmax(0,.86fr) minmax(560px,1.14fr);gap:52px;align-items:center}
        .v2ReleaseLine{display:flex;align-items:center;flex-wrap:wrap;gap:9px;margin-bottom:22px;color:#cbd4d0;font-family:var(--font-mono);font-size:11px;font-weight:700;text-transform:uppercase}
        .v2Pulse{width:8px;height:8px;border-radius:50%;background:var(--v2-green);box-shadow:0 0 0 4px rgba(129,140,248,.18)}
        .v2ReleaseDivider{width:1px;height:14px;background:#4e5a5e}
        .v2Hero h1,.v2Signals h2,.v2Method h2,.v2Workflows h2,.v2Trust h2,.v2Home h3,.v2Home h4,.v2Home p{margin:0;letter-spacing:0}
        .v2Hero h1{max-width:620px;font-size:clamp(2.6rem,4.1vw,4.2rem);font-weight:850;line-height:1}
        .v2Hero h1 span{display:block;color:var(--v2-green)}
        .v2HeroLede{max-width:650px;margin-top:24px!important;color:#c8d0cd;font-size:17px;line-height:1.65}
        .v2Search{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;max-width:650px;min-height:56px;margin-top:28px;border:1px solid #485259;background:#171d21}
        .v2SearchPrompt{padding-left:16px;color:var(--v2-green);font-family:var(--font-mono);font-size:20px}
        .v2Search input{min-width:0;height:54px;border:0;outline:0;padding:0 12px;background:transparent;color:#fff;font-family:var(--font-mono);font-size:13px}
        .v2Search input::placeholder{color:#94a3b8}.v2Search button{align-self:stretch;border:0;border-left:1px solid #475569;background:var(--v2-green-deep);color:#fff;padding:0 18px;font-size:13px;font-weight:850;cursor:pointer}.v2Search button:hover,.v2Search button:focus-visible{background:#4338ca}
        .v2HeroActions{display:flex;flex-wrap:wrap;align-items:center;gap:18px;margin-top:20px}.v2PrimaryAction,.v2SecondaryAction{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:43px;font-size:13px;font-weight:800}.v2PrimaryAction{padding:0 16px;background:#f7faf6;color:var(--v2-ink)}.v2SecondaryAction{color:#d9e0dd;text-decoration:underline;text-underline-offset:4px}
        .v2HeroExamples{display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:650px;margin-top:12px;font-size:12px}.v2HeroExamples>span{color:#94a3b8;font-family:var(--font-mono);font-size:10px;font-weight:700;text-transform:uppercase}.v2HeroExamples a{padding:4px 9px;border:1px solid #475569;color:#e2e8f0;font-family:var(--font-mono);font-size:11px}.v2HeroExamples a:hover,.v2HeroExamples a:focus-visible{border-color:var(--v2-green);color:#fff}
        .v2HeroValidation{display:block;max-width:650px;margin-top:26px;color:inherit}.v2HeroValidation .v2HeroMetrics{margin-top:0}.v2HeroValidationNote{display:block;margin-top:9px;color:#a5b4fc;font-family:var(--font-mono);font-size:10px;font-weight:700;text-transform:uppercase}.v2HeroValidation:hover .v2HeroValidationNote,.v2HeroValidation:focus-visible .v2HeroValidationNote{color:#fff;text-decoration:underline;text-underline-offset:3px}
        .v2HeroMetrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));max-width:650px;margin:30px 0 0;padding:0;border-top:1px solid #3c454a;border-bottom:1px solid #3c454a}.v2HeroMetrics div{padding:15px 15px 16px 0;border-right:1px solid #3c454a}.v2HeroMetrics div+div{padding-left:15px}.v2HeroMetrics div:last-child{border-right:0}.v2HeroMetrics dt{color:#879398;font-family:var(--font-mono);font-size:10px;font-weight:700;text-transform:uppercase}.v2HeroMetrics dd{margin:7px 0 0;color:#fff;font-family:var(--font-mono);font-size:18px;font-weight:800;font-variant-numeric:tabular-nums}
        .v2Console{min-width:0;overflow:hidden;border:1px solid #475569;background:#111827;box-shadow:18px 22px 0 rgba(79,70,229,.18)}
        .v2ConsoleHeader,.v2ConsoleFooter{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 14px;color:#94a3b8;font-family:var(--font-mono);font-size:10px;font-weight:700;text-transform:uppercase}.v2ConsoleHeader{border-bottom:1px solid #334155}.v2ConsoleHeader div{display:flex;align-items:center;gap:8px}.v2ConsoleDot{width:7px;height:7px;border-radius:50%;background:var(--v2-green)}
        .v2ConsoleSummary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-bottom:1px solid #3c454a}.v2ConsoleSummary div{padding:14px;border-right:1px solid #3c454a}.v2ConsoleSummary div:last-child{border-right:0}.v2ConsoleSummary span,.v2ConsoleSummary strong{display:block}.v2ConsoleSummary span{color:#7f8a8f;font-family:var(--font-mono);font-size:9px;text-transform:uppercase}.v2ConsoleSummary strong{margin-top:5px;color:#fff;font-family:var(--font-mono);font-size:18px;font-variant-numeric:tabular-nums}
        .v2ResolutionBar{height:4px;background:#273449}.v2ResolutionBar span{display:block;height:100%;background:var(--v2-green-deep)}.v2ConsoleRows{min-height:364px}
        .v2ConsoleRow{display:grid;grid-template-columns:28px minmax(125px,.8fr) minmax(108px,auto) minmax(170px,1.3fr) 16px;gap:12px;align-items:start;min-height:91px;padding:14px;border-bottom:1px solid #343d42;color:#dce3e0}.v2ConsoleRow:hover{background:#1d2529}.v2RowIndex{color:#657177;font-family:var(--font-mono);font-size:10px}.v2TrialIdentity strong,.v2TrialIdentity small{display:block}.v2TrialIdentity strong{color:var(--v2-cyan);font-family:var(--font-mono);font-size:11px}.v2TrialIdentity small{margin-top:6px;color:#98a4a8;font-size:10px;line-height:1.35}
        .v2Tag{display:inline-flex;align-items:center;width:fit-content;min-height:22px;padding:3px 7px;border:1px solid currentColor;font-family:var(--font-mono);font-size:9px;font-weight:800;line-height:1.2}.v2TagEfficacy{color:var(--v2-green)}.v2TagSafety{color:var(--v2-coral)}.v2TagFunding{color:var(--v2-amber)}.v2TagRegulatory{color:var(--v2-cyan)}.v2TagDecision{color:#c4b5fd}.v2TagOperational{color:#cbd5e1}.v2Evidence{color:#aeb8c8;font-size:10px;line-height:1.45}.v2RowArrow{color:var(--v2-green);font-size:13px}.v2ConsoleFooter{border-top:1px solid #334155}
        .v2Newsletter{padding:32px 0;background:#eef2ff;border-bottom:1px solid #dbe3f2}.v2NewsletterBox{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(370px,.82fr);border:1px solid #cbd5e1;background:#fff;box-shadow:10px 10px 0 rgba(79,70,229,.10)}
        .v2NewsletterCopy{padding:34px 38px}.v2NewsletterCopy h2{max-width:720px;margin-top:10px;color:var(--v2-ink);font-size:clamp(1.8rem,3vw,2.8rem);font-weight:850;line-height:1.08}.v2NewsletterLede{max-width:730px;margin-top:16px!important;color:var(--v2-copy);font-size:15px;line-height:1.65}.v2NewsletterBenefits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0;margin:24px 0 0;padding:0;border-top:1px solid var(--v2-line);border-bottom:1px solid var(--v2-line);list-style:none}.v2NewsletterBenefits li{padding:14px 15px 14px 0;border-right:1px solid var(--v2-line)}.v2NewsletterBenefits li+li{padding-left:15px}.v2NewsletterBenefits li:last-child{border-right:0}.v2NewsletterBenefits strong,.v2NewsletterBenefits span{display:block}.v2NewsletterBenefits strong{font-size:12px}.v2NewsletterBenefits span{margin-top:4px;color:var(--v2-muted);font-size:10px;line-height:1.4}.v2NewsletterExample{display:inline-block;margin-top:18px;color:var(--v2-green-deep);font-size:12px;font-weight:850;text-decoration:underline;text-underline-offset:3px}
        .v2NewsletterSignup{display:flex;min-width:0;padding:30px;border-left:1px solid #cbd5e1;background:var(--v2-ink);color:#fff}.v2NewsletterSignup form{position:relative;display:flex;width:100%;flex-direction:column}.v2NewsletterFormHead span,.v2NewsletterFormHead strong{display:block}.v2NewsletterFormHead span{color:#a5b4fc;font-family:var(--font-mono);font-size:9px;font-weight:850;letter-spacing:.06em}.v2NewsletterFormHead strong{margin-top:6px;font-size:18px}.v2NewsletterField{margin-top:17px}.v2NewsletterField label{display:block;margin-bottom:6px;color:#cbd5e1;font-size:11px;font-weight:750}.v2NewsletterField label span{color:#7f8da3;font-weight:500}.v2NewsletterField input{width:100%;height:44px;border:1px solid #475569;border-radius:0;outline:0;padding:0 12px;background:#111827;color:#fff;font:inherit;font-size:13px}.v2NewsletterField input::placeholder{color:#64748b}.v2NewsletterField input:focus{border-color:#a5b4fc;box-shadow:0 0 0 2px rgba(165,180,252,.16)}.v2NewsletterSignup button{min-height:46px;margin-top:18px;border:0;background:var(--v2-green-deep);color:#fff;font-size:12px;font-weight:850;cursor:pointer}.v2NewsletterSignup button:hover,.v2NewsletterSignup button:focus-visible{background:#6366f1}.v2NewsletterSignup button:disabled{cursor:wait;opacity:.7}.v2NewsletterPrivacy{margin-top:11px!important;color:#94a3b8;font-size:10px;line-height:1.5}.v2NewsletterPrivacy a{color:#c7d2fe;text-decoration:underline}.v2NewsletterError{margin-top:10px!important;color:#fda4af;font-size:11px}.v2NewsletterHoneypot{position:absolute!important;left:-9999px!important}.v2NewsletterSuccess{align-self:center}.v2NewsletterSuccess>span{display:inline-flex;width:34px;height:34px;align-items:center;justify-content:center;background:var(--v2-green-deep);color:#fff;font-size:18px}.v2NewsletterSuccess h3{margin-top:18px!important;color:#fff;font-size:22px}.v2NewsletterSuccess p{margin-top:10px!important;color:#cbd5e1;font-size:13px;line-height:1.6}.v2NewsletterSuccess strong{color:#fff;overflow-wrap:anywhere}
        .v2QuestionMap{padding:68px 0;background:#fff;border-bottom:1px solid var(--v2-line)}.v2QuestionIntro{display:grid;grid-template-columns:minmax(0,.9fr) minmax(360px,.7fr);gap:12px 56px;align-items:end}.v2QuestionIntro .v2Kicker{grid-column:1/-1}.v2QuestionIntro h2{max-width:760px;color:var(--v2-ink);font-size:clamp(2rem,3.6vw,3.4rem);font-weight:850;line-height:1.04}.v2QuestionIntro>p:last-child{color:var(--v2-copy);font-size:16px;line-height:1.65}.v2QuestionGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:30px;border:1px solid var(--v2-line)}.v2QuestionCard{display:flex;min-height:285px;flex-direction:column;border-right:1px solid var(--v2-line);border-top:5px solid #b7791f;padding:24px;color:var(--v2-ink);text-decoration:none}.v2QuestionCard:last-child{border-right:0}.v2QuestionCard.operational{border-top-color:#426b82}.v2QuestionCard.uncertain{border-top-color:#737b86}.v2QuestionCard>span{color:#647078;font-family:var(--font-mono);font-size:10px;font-weight:800;text-transform:uppercase}.v2QuestionCard>strong{margin-top:20px;font-size:21px;line-height:1.28}.v2QuestionCard>p{margin-top:13px;color:var(--v2-copy);font-size:14px;line-height:1.62}.v2QuestionCard>em{margin-top:auto;padding-top:20px;color:#315b4d;font-style:normal;font-weight:850}.v2QuestionCard:hover,.v2QuestionCard:focus-visible{background:#f5f7f5}.v2Outcomes{padding:72px 0;background:var(--v2-paper);border-bottom:1px solid var(--v2-line)}.v2Outcomes h2{max-width:760px;margin-top:10px;color:var(--v2-ink);font-size:clamp(2rem,3.6vw,3.4rem);font-weight:850;line-height:1.04}
        .v2OutcomeGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin-top:34px;border:1px solid var(--v2-line);background:#fff}
        .v2Outcome{display:flex;flex-direction:column;min-width:0;padding:22px 20px;border-right:1px solid var(--v2-line);border-top:4px solid var(--v2-green-deep)}.v2Outcome:last-child{border-right:0}
        .v2Outcome-stopped_safety{border-top-color:#be123c}.v2Outcome-completed_missed{border-top-color:#b45309}.v2Outcome-completed_met{border-top-color:#0f766e}
        .v2OutcomeStatus{color:var(--v2-muted);font-family:var(--font-mono);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
        .v2Outcome h3{margin-top:6px!important;color:var(--v2-ink);font-size:17px;font-weight:850;line-height:1.25}
        .v2OutcomeCount{margin-top:16px}.v2OutcomeCount strong,.v2OutcomeCount span{display:block}.v2OutcomeCount strong{font-family:var(--font-mono);font-size:28px;font-variant-numeric:tabular-nums;color:var(--v2-ink)}.v2OutcomeCount span{margin-top:2px;color:var(--v2-muted);font-size:11px}
        .v2OutcomeExample{display:flex;flex-direction:column;flex:1;margin-top:18px;padding-top:16px;border-top:1px solid var(--v2-line)}
        .v2OutcomeId strong,.v2OutcomeId small{display:block}.v2OutcomeId strong{color:var(--v2-green-deep);font-family:var(--font-mono);font-size:12px}.v2OutcomeId small{margin-top:4px;color:var(--v2-muted);font-size:11px;line-height:1.4}
        .v2OutcomeEvidence{margin-top:12px!important;color:var(--v2-copy);font-size:13px;line-height:1.55}
        .v2OutcomeSource{margin-top:6px!important;color:var(--v2-muted);font-size:11px}
        .v2OutcomePosted{margin-top:10px!important;padding:9px 10px;background:var(--v2-paper);color:var(--v2-copy);font-size:12px;line-height:1.5}
        .v2OutcomeLink{margin-top:auto;padding-top:16px;color:var(--v2-green-deep);font-size:12px;font-weight:850}.v2OutcomeLink:hover{text-decoration:underline}
        .v2OutcomeNote{max-width:980px;margin-top:16px!important;color:var(--v2-muted);font-size:12px;line-height:1.6}.v2OutcomeNote a{color:var(--v2-green-deep);font-weight:800}
        @media(max-width:1080px){.v2OutcomeGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.v2Outcome:nth-child(2){border-right:0}.v2Outcome:nth-child(-n+2){border-bottom:1px solid var(--v2-line)}}
        @media(max-width:600px){.v2Outcomes{padding:56px 0}.v2Outcomes h2{font-size:2.15rem}.v2OutcomeGrid{grid-template-columns:1fr}.v2Outcome{border-right:0;border-bottom:1px solid var(--v2-line)}.v2Outcome:last-child{border-bottom:0}}
        .v2Signals{padding:78px 0;background:#fff}.v2SectionIntro,.v2MethodHeader,.v2TrustInner{display:grid;grid-template-columns:minmax(0,.9fr) minmax(360px,.7fr);gap:56px;align-items:end}.v2Kicker,.v2PanelCode{color:#647078;font-family:var(--font-mono);font-size:10px;font-weight:800;text-transform:uppercase}.v2Signals h2,.v2Method h2,.v2Workflows h2,.v2Trust h2{max-width:760px;margin-top:10px;color:var(--v2-ink);font-size:clamp(2rem,3.6vw,3.4rem);font-weight:850;line-height:1.04}.v2SectionIntro>p{color:var(--v2-copy);font-size:16px;line-height:1.65}
        .v2SignalLayout{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(360px,.75fr);gap:18px;margin-top:36px;align-items:stretch}.v2BiologicalPanel,.v2CauseIndex{border:1px solid var(--v2-line);background:var(--v2-paper)}.v2PanelHeading,.v2CauseIndexHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:22px;border-bottom:1px solid var(--v2-line)}.v2PanelHeading h3,.v2CauseIndexHeader h3{margin-top:7px;color:var(--v2-ink);font-size:18px;font-weight:850}.v2PanelTotal{text-align:right}.v2PanelTotal strong,.v2PanelTotal span{display:block}.v2PanelTotal strong{font-family:var(--font-mono);font-size:27px;font-variant-numeric:tabular-nums}.v2PanelTotal span{margin-top:4px;color:var(--v2-muted);font-size:11px}
        .v2BiologicalBar{display:flex;height:8px;background:#e2e8f0}.v2BiologicalBar span{display:block;height:100%}.v2BioBarEfficacy{background:var(--v2-green-deep)}.v2BioBarSafety{background:var(--v2-coral)}.v2BioBarUnspecified{background:var(--v2-cyan)}.v2BiologicalGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.v2BiologicalItem{position:relative;min-height:264px;padding:24px 21px 22px;border-right:1px solid var(--v2-line)}.v2BiologicalItem:last-child{border-right:0}.v2BiologicalItem:hover{background:#fff}.v2CategoryMarker{display:block;width:12px;height:12px;margin-bottom:25px;background:currentColor}.v2BioEfficacy{color:var(--v2-green-deep)}.v2BioSafety{color:#be123c}.v2BioUnspecified{color:#0369a1}.v2BiologicalItem>strong{display:block;color:var(--v2-ink);font-family:var(--font-mono);font-size:30px;font-variant-numeric:tabular-nums}.v2BiologicalItem h4{margin-top:7px;color:var(--v2-ink);font-size:15px;font-weight:850}.v2BiologicalItem p{margin-top:13px;color:var(--v2-copy);font-size:12px;line-height:1.55}.v2InlineAction{position:absolute;left:21px;bottom:22px;color:currentColor;font-size:12px;font-weight:850}
        .v2CauseIndex{display:flex;flex-direction:column}.v2CauseIndexHeader a{color:var(--v2-copy);font-size:11px;font-weight:800}.v2CauseRows{flex:1}.v2CauseRow{display:grid;grid-template-columns:minmax(128px,1fr) minmax(70px,.75fr) 58px;align-items:center;gap:12px;min-height:49px;padding:0 18px;border-bottom:1px solid var(--v2-line)}.v2CauseRow:hover{background:#fff}.v2CauseLabel{color:var(--v2-copy);font-size:12px;font-weight:750}.v2CauseRow strong{text-align:right;font-family:var(--font-mono);font-size:12px;font-variant-numeric:tabular-nums}.v2CauseTrack{display:block;height:5px;background:#e2e8f0}.v2CauseTrack span{display:block;height:100%;background:var(--v2-ink-soft)}.v2ReviewNote{padding:17px 18px;border-top:3px solid var(--v2-amber)}.v2ReviewNote strong{font-size:12px}.v2ReviewNote p{margin-top:6px;color:var(--v2-muted);font-size:11px;line-height:1.45}
        .v2Method{padding:76px 0;background:#eef2ff;border-top:1px solid #dbe3f2;border-bottom:1px solid #dbe3f2}.v2MethodHeader{align-items:end}.v2MethodLink{justify-self:end;font-size:13px;font-weight:850;text-decoration:underline;text-underline-offset:4px}.v2Pipeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin:34px 0 0;padding:0;border:1px solid #cbd5e1;list-style:none}.v2Pipeline li{min-height:218px;padding:21px;border-right:1px solid #cbd5e1}.v2Pipeline li:last-child{border-right:0}.v2Pipeline li>span{color:var(--v2-green-deep);font-family:var(--font-mono);font-size:11px;font-weight:850}.v2Pipeline strong{display:block;margin-top:30px;font-size:15px}.v2Pipeline p{margin-top:12px;color:var(--v2-copy);font-size:12px;line-height:1.55}.v2AuditStrip{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px 22px;padding:13px 15px;border-right:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1;border-left:1px solid #cbd5e1;color:#526079;font-family:var(--font-mono);font-size:9px;font-weight:700;text-transform:uppercase}
        .v2Browse{padding:64px 0;background:var(--v2-paper);border-top:1px solid var(--v2-line)}.v2Browse h2{max-width:760px;margin-top:10px;color:var(--v2-ink);font-size:clamp(1.8rem,3vw,2.8rem);font-weight:850;line-height:1.08}.v2BrowseGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:32px;margin-top:30px}.v2BrowseGrid h3{font-size:15px;font-weight:850}.v2BrowseGrid ul{margin:12px 0 0;padding:0;list-style:none;border-top:1px solid var(--v2-line)}.v2BrowseGrid li{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--v2-line);font-size:13px;line-height:1.4}.v2BrowseGrid li a{color:var(--v2-ink)}.v2BrowseGrid li a:hover,.v2BrowseGrid li a:focus-visible{color:var(--v2-green-deep);text-decoration:underline;text-underline-offset:3px}.v2BrowseGrid li span{flex:none;color:var(--v2-muted);font-family:var(--font-mono);font-size:11px;font-variant-numeric:tabular-nums}.v2BrowseMore{display:inline-block;margin:12px 16px 0 0;font-size:13px;font-weight:800}
        .v2Workflows{padding:76px 0;background:#fff}.v2SectionIntroCompact{grid-template-columns:1fr}.v2WorkflowGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:34px;border-top:1px solid var(--v2-line);border-bottom:1px solid var(--v2-line)}.v2Workflow{display:flex;min-height:290px;flex-direction:column;padding:24px;border-right:1px solid var(--v2-line)}.v2Workflow:last-child{border-right:0}.v2Workflow:hover{background:var(--v2-paper)}.v2Workflow>span{color:var(--v2-muted);font-family:var(--font-mono);font-size:10px;font-weight:800}.v2Workflow h3{margin-top:36px;font-size:20px;line-height:1.25}.v2Workflow p{margin-top:15px;color:var(--v2-copy);font-size:13px;line-height:1.6}.v2Workflow>strong{margin-top:auto;padding-top:24px;font-size:13px}
        .v2Trust{padding:58px 0;background:#eef2ff;border-top:1px solid #dbe3f2}.v2TrustInner{grid-template-columns:minmax(260px,.85fr) minmax(360px,1fr) auto;align-items:center}.v2Trust h2{max-width:470px;font-size:clamp(1.65rem,2.6vw,2.5rem)}.v2TrustInner>p{color:var(--v2-copy);font-size:13px;line-height:1.65}.v2TrustLinks{display:grid;gap:9px;min-width:100px}.v2TrustLinks a{color:var(--v2-green-deep);font-size:12px;font-weight:850;text-decoration:underline;text-underline-offset:3px}
        .v2Footer{padding:28px 0;background:var(--v2-ink);color:#fff}.v2FooterInner{display:flex;align-items:center;justify-content:space-between;gap:32px}.v2Footer strong{font-size:13px}.v2Footer p{margin:5px 0 0;color:#94a3b8;font-size:11px}.v2Footer nav{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:18px}.v2Footer a{color:#cbd5e1;font-size:11px;font-weight:750}.v2Footer a:hover{color:var(--v2-green)}
        @media(max-width:1080px){.v2HeroGrid{grid-template-columns:1fr}.v2HeroCopy{max-width:760px}.v2Console{max-width:860px}.v2NewsletterBox{grid-template-columns:1fr}.v2NewsletterSignup{border-top:1px solid #cbd5e1;border-left:0}.v2NewsletterSignup form{max-width:620px}.v2SignalLayout{grid-template-columns:1fr}.v2CauseIndex{min-height:410px}.v2TrustInner{grid-template-columns:1fr 1fr}.v2TrustLinks{grid-column:1/-1;grid-template-columns:repeat(3,auto);justify-content:start}}
        @media(max-width:780px){.v2Container{padding:0 16px}.v2Hero{padding:42px 0 40px}.v2HeroGrid{gap:38px}.v2Hero h1{font-size:clamp(2.4rem,11vw,3.4rem)}.v2Newsletter{padding:20px 0}.v2NewsletterCopy,.v2NewsletterSignup{padding:26px 24px}.v2NewsletterBenefits{grid-template-columns:1fr}.v2NewsletterBenefits li,.v2NewsletterBenefits li+li{padding:11px 0;border-right:0;border-bottom:1px solid var(--v2-line)}.v2NewsletterBenefits li:last-child{border-bottom:0}.v2SectionIntro,.v2MethodHeader,.v2TrustInner,.v2QuestionIntro{grid-template-columns:1fr;gap:20px}.v2QuestionGrid{grid-template-columns:1fr}.v2QuestionCard{min-height:0;border-right:0;border-bottom:1px solid var(--v2-line)}.v2QuestionCard:last-child{border-bottom:0}.v2QuestionCard>em{margin-top:22px}.v2MethodLink{justify-self:start}.v2BiologicalGrid{grid-template-columns:1fr}.v2BiologicalItem{min-height:210px;border-right:0;border-bottom:1px solid var(--v2-line)}.v2BiologicalItem:last-child{border-bottom:0}.v2Pipeline{grid-template-columns:repeat(2,minmax(0,1fr))}.v2Pipeline li:nth-child(2){border-right:0}.v2Pipeline li:nth-child(-n+2){border-bottom:1px solid #cbd5e1}.v2WorkflowGrid,.v2BrowseGrid{grid-template-columns:1fr}.v2Workflow{min-height:230px;border-right:0;border-bottom:1px solid var(--v2-line)}.v2Workflow:last-child{border-bottom:0}.v2FooterInner{align-items:flex-start;flex-direction:column}.v2Footer nav{justify-content:flex-start}}
        @media(max-width:600px){.v2ReleaseLine{align-items:flex-start}.v2ReleaseDivider{display:none}.v2HeroLede{font-size:15px}.v2Search{grid-template-columns:auto minmax(0,1fr)}.v2Search button{grid-column:1/-1;min-height:44px;border-top:1px solid #475569;border-left:0}.v2HeroActions{align-items:stretch;flex-direction:column;gap:10px}.v2PrimaryAction,.v2SecondaryAction{width:100%}.v2HeroMetrics{grid-template-columns:1fr}.v2HeroMetrics div,.v2HeroMetrics div+div{padding:12px 0;border-right:0;border-bottom:1px solid #334155}.v2HeroMetrics div:last-child{border-bottom:0}.v2Console{box-shadow:8px 10px 0 rgba(79,70,229,.18)}.v2ConsoleSummary{grid-template-columns:1fr 1fr}.v2ConsoleSummary div:nth-child(2){border-right:0}.v2ConsoleSummary div:last-child{grid-column:1/-1;border-top:1px solid #334155}.v2ConsoleRows{min-height:0}.v2ConsoleRow{grid-template-columns:24px minmax(0,1fr) 16px;min-height:0}.v2ConsoleRow .v2Tag,.v2Evidence{grid-column:2/-1}.v2RowArrow{grid-column:3;grid-row:1}.v2ConsoleFooter{align-items:flex-start;flex-direction:column}.v2Signals,.v2Method,.v2Workflows{padding:56px 0}.v2Signals h2,.v2Method h2,.v2Workflows h2{font-size:2.15rem}.v2PanelHeading,.v2CauseIndexHeader{align-items:flex-start;flex-direction:column}.v2PanelTotal{text-align:left}.v2CauseRow{grid-template-columns:minmax(0,1fr) 58px}.v2CauseTrack{grid-column:1/-1;grid-row:2;margin-bottom:9px}.v2CauseRow strong{grid-column:2;grid-row:1}.v2Pipeline{grid-template-columns:1fr}.v2Pipeline li{min-height:180px;border-right:0;border-bottom:1px solid #cbd5e1}.v2Pipeline li:nth-child(2){border-right:0}.v2Pipeline li:last-child{border-bottom:0}.v2AuditStrip{align-items:flex-start;flex-direction:column}.v2TrustLinks{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
