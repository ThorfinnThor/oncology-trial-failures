// web/pages/trial/[trialId].tsx

import Head from "next/head";
import { serializeJsonLd } from "@/lib/serializeJsonLd";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { loadDetail, loadMeta } from "@/lib/data";
import { DatasetMeta, TrialDetail } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { extractNctId, trialPath } from "@/lib/seoUrls";
import { areaHubPath, isIndexableTrial, phaseHubPath, reasonHubPath } from "@/lib/seoHubs";
import { buildTrialSeoMetadata } from "@/lib/seoMetadata";
import EvidenceStandard from "@/components/EvidenceStandard";
import PrimaryNav from "@/components/PrimaryNav";

const SITE_URL = "https://clinicaltrialfailures.com";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

type TrialPageProps = {
  initialMeta: DatasetMeta | null;
  initialTrial: TrialDetail | null;
};

function phaseChipClass(phaseKey: string) {
  const p = (phaseKey || "").toUpperCase();
  if (p === "EARLY_PHASE1" || p === "PHASE1") return "chip chip-phase-1";
  if (p === "PHASE1/PHASE2" || p === "PHASE2") return "chip chip-phase-2";
  if (p === "PHASE2/PHASE3" || p === "PHASE3") return "chip chip-phase-3";
  if (p === "PHASE4") return "chip chip-phase-4";
  return "chip chip-neutral";
}

function bucketChipClass(bucket: string) {
  const b = (bucket || "").toUpperCase();
  if (b === "SAFETY") return "chip chip-bucket-safety";
  if (b === "EFFICACY/FUTILITY" || b === "EFFICACY_FUTILITY") return "chip chip-bucket-efficacy";
  if (b === "ENROLLMENT" || b === "RECRUITMENT") return "chip chip-bucket-enrollment";
  if (b === "FUNDING") return "chip chip-bucket-funding";
  if (b === "REGULATORY") return "chip chip-bucket-regulatory";
  if (b === "STRATEGIC" || b === "BUSINESS_STRATEGY") return "chip chip-bucket-strategic";
  if (
    b === "OPERATIONAL" ||
    b === "OPERATIONAL_OTHER" ||
    b === "STAFFING_RESOURCES" ||
    b === "PROTOCOL_FEASIBILITY" ||
    b === "SUPPLY_MANUFACTURING"
  ) {
    return "chip chip-bucket-operational";
  }
  return "chip chip-neutral";
}

const OUTCOME_LABELS: Record<string, string> = {
  BIOLOGICAL_FAILURE: "Biological failure signal",
  NON_BIOLOGICAL: "Non-biological stop",
  MIXED_CAUSES: "Mixed causes",
  NON_FAILURE_TRANSITION: "Non-failure transition",
  CAUSE_NOT_STATED: "Cause not stated",
  UNKNOWN: "Review required",
  UNRESOLVED: "Review required",
};

const REASON_LABELS: Record<string, string> = {
  EFFICACY_FUTILITY: "Efficacy / futility",
  "EFFICACY/FUTILITY": "Efficacy / futility",
  SAFETY: "Safety",
  BIOLOGICAL_UNSPECIFIED: "Biological, unspecified",
  RECRUITMENT: "Recruitment",
  ENROLLMENT: "Recruitment",
  BUSINESS_STRATEGY: "Business strategy",
  STRATEGIC: "Business strategy",
  FUNDING: "Funding",
  STAFFING_RESOURCES: "Staffing / resources",
  PROTOCOL_FEASIBILITY: "Protocol feasibility",
  SUPPLY_MANUFACTURING: "Supply / manufacturing",
  REGULATORY: "Regulatory",
  EXTERNAL_DISRUPTION: "External disruption",
  OPERATIONAL_OTHER: "Operational",
  OPERATIONAL: "Operational",
  DECISION_WITHOUT_STATED_CAUSE: "Decision without stated cause",
  PROGRAM_ACTION_WITHOUT_STATED_CAUSE: "Program action without stated cause",
  UNSPECIFIED: "Unspecified",
  OTHER_UNKNOWN: "Other / unknown",
};

function normalizedCode(value: string | undefined): string {
  return (value || "").replace(/[\s/-]+/g, "_").toUpperCase().trim();
}

function trialOutcomeCode(trial: TrialDetail): string {
  const finalOutcome = normalizedCode(trial.classification_final_outcome);
  if (finalOutcome && finalOutcome !== "UNRESOLVED") return finalOutcome;
  return normalizedCode(trial.classification_outcome_v2 || trial.classification_label) || "UNKNOWN";
}

function trialReasonCode(trial: TrialDetail, fallbackBucket: string): string {
  const finalReason = normalizedCode(
    trial.classification_final_category || trial.classification_primary_reason_v2
  );
  if (finalReason && !finalReason.startsWith("UNRESOLVED_")) return finalReason;
  return normalizedCode(trial.classification_reason || fallbackBucket) || "UNSPECIFIED";
}

function classificationInterpretation(outcome: string, reason: string): string {
  if (outcome === "BIOLOGICAL_FAILURE" && reason === "EFFICACY_FUTILITY") {
    return "The source statement points to efficacy, lack of benefit, failed activity, or futility. Classification V2 therefore treats this record as a biological failure signal.";
  }
  if (outcome === "BIOLOGICAL_FAILURE" && reason === "SAFETY") {
    return "The source statement points to safety, toxicity, tolerability, or an unfavorable benefit-risk assessment. Classification V2 therefore treats this record as a biological failure signal.";
  }
  if (outcome === "BIOLOGICAL_FAILURE") {
    return "The available source language supports a biological failure signal, but it is not specific enough to separate efficacy or futility from safety with confidence.";
  }
  if (outcome === "NON_BIOLOGICAL") {
    return "The available source language supports a non-biological reason for stopping. The stopped status should not be read as evidence that the intervention itself failed.";
  }
  if (outcome === "NON_FAILURE_TRANSITION") {
    return "The record appears to describe a transition or program change rather than evidence of failed biology. The original source should still be reviewed for context.";
  }
  if (outcome === "MIXED_CAUSES") {
    return "The source language supports more than one type of cause. Classification V2 keeps the outcome mixed instead of reducing the record to a single explanation.";
  }
  if (outcome === "CAUSE_NOT_STATED") {
    return "The registry records that the study stopped but does not state a usable cause. No biological or non-biological conclusion should be inferred from status alone.";
  }
  return "The available registry language is not specific enough for a defensible outcome. This record remains review-gated rather than being forced into a category.";
}

function safeReturnPath(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value || "";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/explore";
}

export default function TrialPage({ initialMeta, initialTrial }: TrialPageProps) {
  const router = useRouter();

  const trialParam = useMemo(
    () => (router.query.trialId ? String(router.query.trialId) : initialTrial?.nct_id || ""),
    [router.query.trialId, initialTrial]
  );
  const trialId = useMemo(() => extractNctId(trialParam), [trialParam]);
  const from = useMemo(() => safeReturnPath(router.query.from), [router.query.from]);

  const [meta, setMeta] = useState<DatasetMeta | null>(initialMeta ?? null);
  const [trial, setTrial] = useState<TrialDetail | null>(initialTrial ?? null);
  const [err, setErr] = useState<string | null>(null);

  // Keep existing client behavior after hydration (no functionality/design changes).
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!trialId) return;
      try {
        setErr(null);
        const [m, t] = await Promise.all([loadMeta(), loadDetail(trialId)]);
        if (!alive) return;
        setMeta(m);
        setTrial(t);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load trial.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [trialId]);

  const phaseKey = useMemo(
    () => (trial ? parsePhases(trial.phases || "")[0] || "UNKNOWN" : "UNKNOWN"),
    [trial]
  );
  const bucket = useMemo(() => (trial ? reasonBucket(trial) : "OTHER/UNKNOWN"), [trial]);
  const outcomeCode = useMemo(() => (trial ? trialOutcomeCode(trial) : "UNKNOWN"), [trial]);
  const reasonCode = useMemo(
    () => (trial ? trialReasonCode(trial, bucket) : "UNSPECIFIED"),
    [trial, bucket]
  );

  const conditionText = trial?.condition_first || trial?.conditions || "stopped clinical trial";
  const { title, description } = buildTrialSeoMetadata(trial, trialId);
  const canonicalUrl = trial ? `${SITE_URL}${trialPath(trial)}` : trialId ? `${SITE_URL}/trial/${encodeURIComponent(trialId)}` : `${SITE_URL}/explore`;
  const indexable = trial ? isIndexableTrial(trial) : false;
  const outcomeLabel = OUTCOME_LABELS[outcomeCode] || "Review required";
  const reasonLabel = REASON_LABELS[reasonCode] || reasonCode.replace(/_/g, " ").toLowerCase();
  const sourceReason = (trial?.why_stopped || trial?.why_stopped_short || "").trim();
  const sourceUrl = trial?.url || (trialId ? `https://clinicaltrials.gov/study/${trialId}` : SITE_URL);
  const interpretation = classificationInterpretation(outcomeCode, reasonCode);
  const reasonHubHref = ["DECISION ONLY", "PROGRAM STOP ONLY"].includes(bucket)
    ? null
    : reasonHubPath(bucket);
  const classificationStatus = trial?.classification_needs_review
    ? "Review required"
    : trial?.classification_resolution_status === "RESOLVED"
      ? "Resolved"
      : "Source review advised";

  const jsonLd = trial
    ? [
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Explore", item: `${SITE_URL}/explore` },
            { "@type": "ListItem", position: 3, name: trial.nct_id, item: canonicalUrl },
          ],
        },
        {
          "@context": "https://schema.org",
          "@type": "MedicalStudy",
          name: trial.brief_title || trial.nct_id,
          identifier: trial.nct_id,
          url: canonicalUrl,
          description,
          sponsor: trial.lead_sponsor
            ? {
                "@type": "Organization",
                name: trial.lead_sponsor,
              }
            : undefined,
          studySubject: conditionText,
          status: trial.overall_status || undefined,
          sameAs: sourceUrl,
        },
      ]
    : [];

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content={indexable ? "index,follow" : "noindex,follow"} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Clinical Trial Failures database preview" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={OG_IMAGE} />
        {trial ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
          />
        ) : null}
      </Head>

      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <PrimaryNav />
            </div>

            <div className="topbar-right">
              <Link href={from} className="btn">
                Back
              </Link>
            </div>
          </div>
        </header>

        <main className="page">
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {err && <div className="card p-4 error">{err}</div>}
            {!trial && !err && <div className="card p-4 muted">Loading…</div>}

            {trial && (
              <>
                <nav className="trialBreadcrumb muted" aria-label="Breadcrumb">
                  <Link className="link" href="/">
                    Home
                  </Link>{" "}
                  /{" "}
                  <Link className="link" href="/explore">
                    Explore
                  </Link>{" "}
                  / <span>{trial.nct_id}</span>
                </nav>
                <div className="trialHeroGrid">
                  <section className="card trialPanel trialHeroPanel">
                    <div className="trialEyebrow">Clinical trial evidence record</div>
                    <h1 className="trialHeading">{trial.nct_id}</h1>
                    <p className="trialTitle">{trial.brief_title || "Stopped clinical trial record"}</p>

                    <div className="trialChips" aria-label="Trial classifications">
                      <span className={phaseChipClass(phaseKey)}>{phaseLabel(phaseKey)}</span>
                      <span className="chip chip-neutral">
                        {(trial.overall_status || "UNKNOWN").toUpperCase()}
                      </span>
                      <span className={bucketChipClass(reasonCode)}>{reasonLabel}</span>
                      <span className="chip chip-neutral">{outcomeLabel}</span>
                    </div>

                    <p className="trialStatusNote">
                      Registry status and Classification V2 answer different questions: status records
                      what happened to the study; the evidence classification summarizes the stated cause.
                    </p>
                  </section>

                  <article className="card trialPanel trialSummary" data-ai-summary="true">
                    <div className="trialEyebrow">Factual summary</div>
                    <h2>Key evidence</h2>
                    <dl className="trialSummaryList">
                      <div>
                        <dt>Registry ID</dt>
                        <dd className="trialMono">{trial.nct_id}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{(trial.overall_status || "Unknown").toUpperCase()}</dd>
                      </div>
                      <div>
                        <dt>V2 outcome</dt>
                        <dd>{outcomeLabel}</dd>
                      </div>
                      <div>
                        <dt>Primary reason</dt>
                        <dd>{reasonLabel}</dd>
                      </div>
                      <div>
                        <dt>Classification status</dt>
                        <dd>{classificationStatus}</dd>
                      </div>
                      <div>
                        <dt>Confidence</dt>
                        <dd>{trial.classification_confidence || "Not stated"}</dd>
                      </div>
                    </dl>
                  </article>
                </div>

                <div className="trialEvidenceGrid">
                  <section className="card trialPanel trialReasonPanel">
                    <div className="trialEyebrow">Official ClinicalTrials.gov stop reason</div>
                    <h2>Why {trial.nct_id} was stopped</h2>
                    {sourceReason ? (
                      <blockquote>{sourceReason}</blockquote>
                    ) : (
                      <p className="muted">
                        The registry record does not provide a usable stop-reason statement.
                      </p>
                    )}
                    <a className="trialSourceLink" href={sourceUrl} target="_blank" rel="noreferrer">
                      Verify the primary registry record <span aria-hidden="true">↗</span>
                    </a>
                  </section>

                  <section className="card trialPanel trialInterpretationPanel">
                    <div className="trialEyebrow">Classification V2 interpretation</div>
                    <h2>{outcomeLabel}</h2>
                    <p>{interpretation}</p>
                    <p className="trialCaution">
                      This is an analytical screening signal, not a medical conclusion. Review the
                      protocol, endpoints, publications, sponsor disclosures, and primary record before
                      relying on the classification.
                    </p>
                  </section>
                </div>

                <section className="card trialPanel trialContextPanel">
                  <div className="trialSectionHeading">
                    <div>
                      <div className="trialEyebrow">Study context</div>
                      <h2>Trial facts</h2>
                    </div>
                    <span className="muted">Source-linked registry fields</span>
                  </div>
                  <dl className="trialFactsGrid">
                    <div>
                      <dt>Sponsor</dt>
                      <dd>{trial.lead_sponsor || "Not stated"}</dd>
                    </div>
                    <div>
                      <dt>Phase</dt>
                      <dd>{phaseLabel(phaseKey)}</dd>
                    </div>
                    <div>
                      <dt>Condition</dt>
                      <dd>{trial.conditions || trial.condition_first || "Not stated"}</dd>
                    </div>
                    <div>
                      <dt>Intervention</dt>
                      <dd>{trial.intervention_names || trial.intervention_first || "Not stated"}</dd>
                    </div>
                    <div>
                      <dt>Disease area</dt>
                      <dd>{trial.disease_area || "Other"}</dd>
                    </div>
                    <div>
                      <dt>Collaborators</dt>
                      <dd>{trial.collaborators || "None stated"}</dd>
                    </div>
                  </dl>
                </section>

                <EvidenceStandard
                  datasetVersion={meta?.version || "current build"}
                  latestRegistryUpdate={trial.last_update_post_date}
                  source={meta?.source}
                />

                <section className="trialProvenance" aria-label="Primary source actions">
                  <div>
                    <div className="trialEyebrow">Verify this record</div>
                    <p>
                      Classification {trial.classification_version ? `V${trial.classification_version}` : "V2"}
                      {" · "}Source record {trial.nct_id}
                    </p>
                  </div>
                  <div className="trialActions">
                    <Link className="btn" href="/methods">
                      How classification works
                    </Link>
                    <a className="btn btn-primary" href={sourceUrl} target="_blank" rel="noreferrer">
                      Open ClinicalTrials.gov <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                </section>

                <nav className="trialRelated" aria-label="Related evidence">
                  <span>Continue exploring:</span>
                  {trial.disease_area ? (
                    <Link href={areaHubPath(trial.disease_area)}>
                      {trial.disease_area} evidence hub
                    </Link>
                  ) : null}
                  <Link href={phaseHubPath(phaseKey)}>{phaseLabel(phaseKey)} evidence hub</Link>
                  {reasonHubHref ? <Link href={reasonHubHref}>{reasonLabel} evidence hub</Link> : null}
                  {trial.lead_sponsor ? (
                    <Link href={`/explore?sponsor=${encodeURIComponent(trial.lead_sponsor)}`}>
                      More from {trial.lead_sponsor}
                    </Link>
                  ) : null}
                  {outcomeCode === "BIOLOGICAL_FAILURE" ? (
                    <Link href="/failed-clinical-trials">Biological failure signals</Link>
                  ) : (
                    <Link href="/clinical-trial-failures">Clinical trial failures guide</Link>
                  )}
                </nav>
              </>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        .trialBreadcrumb {
          margin-bottom: 14px;
          font-size: 13px;
        }
        .trialBreadcrumb :global(.link) {
          color: var(--accent);
        }
        .trialHeroGrid,
        .trialEvidenceGrid {
          display: grid;
          gap: 16px;
          align-items: stretch;
        }
        .trialHeroGrid {
          grid-template-columns: minmax(0, 1.18fr) minmax(310px, 0.82fr);
        }
        .trialEvidenceGrid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 16px;
        }
        .trialPanel {
          min-width: 0;
          padding: 24px;
        }
        .trialHeroPanel,
        .trialSummary,
        .trialReasonPanel,
        .trialInterpretationPanel {
          height: 100%;
        }
        .trialEyebrow {
          margin-bottom: 9px;
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .trialHeading {
          margin: 0;
          font-family: var(--font-mono);
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          line-height: 1.08;
          letter-spacing: 0;
        }
        .trialTitle {
          max-width: 720px;
          margin: 13px 0 0;
          color: #334155;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.45;
        }
        .trialChips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 18px;
        }
        .trialStatusNote {
          margin: 20px 0 0;
          padding-top: 16px;
          border-top: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.55;
        }
        .trialSummary h2,
        .trialReasonPanel h2,
        .trialInterpretationPanel h2,
        .trialContextPanel h2 {
          margin: 0;
          font-size: 20px;
          line-height: 1.25;
          letter-spacing: 0;
        }
        .trialSummaryList,
        .trialFactsGrid {
          margin: 18px 0 0;
        }
        .trialSummaryList > div {
          display: grid;
          grid-template-columns: minmax(110px, 0.8fr) minmax(0, 1.2fr);
          gap: 14px;
          padding: 9px 0;
          border-top: 1px solid var(--border);
        }
        .trialSummaryList dt,
        .trialFactsGrid dt {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .trialSummaryList dd,
        .trialFactsGrid dd {
          min-width: 0;
          margin: 0;
          color: var(--text);
          font-size: 13px;
          font-weight: 700;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .trialMono {
          font-family: var(--font-mono);
        }
        .trialReasonPanel blockquote {
          margin: 18px 0;
          padding: 16px 18px;
          border-left: 4px solid var(--accent);
          background: #eef2ff;
          color: #1e293b;
          font-size: 16px;
          font-weight: 650;
          line-height: 1.6;
        }
        .trialSourceLink {
          color: var(--accent);
          font-size: 13px;
          font-weight: 750;
        }
        .trialSourceLink:hover,
        .trialRelated a:hover {
          text-decoration: underline;
        }
        .trialInterpretationPanel > p {
          margin: 14px 0 0;
          color: #334155;
          font-size: 15px;
          line-height: 1.65;
        }
        .trialInterpretationPanel .trialCaution {
          padding-top: 14px;
          border-top: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 13px;
        }
        .trialContextPanel {
          margin-top: 16px;
        }
        .trialSectionHeading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 20px;
        }
        .trialSectionHeading .muted {
          font-size: 12px;
        }
        .trialFactsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-top: 1px solid var(--border);
          border-left: 1px solid var(--border);
        }
        .trialFactsGrid > div {
          min-width: 0;
          min-height: 96px;
          padding: 16px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .trialFactsGrid dd {
          margin-top: 8px;
          font-size: 14px;
        }
        .trialProvenance {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-top: 16px;
          padding: 20px 4px;
          border-top: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
        }
        .trialProvenance p {
          margin: 0;
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.6;
        }
        .trialActions {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 10px;
        }
        .trialRelated {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 18px;
          padding: 20px 4px 8px;
          color: var(--text-muted);
          font-size: 13px;
        }
        .trialRelated span {
          font-weight: 800;
        }
        .trialRelated a {
          color: var(--accent);
          font-weight: 700;
        }
        @media (max-width: 800px) {
          .trialHeroGrid,
          .trialEvidenceGrid {
            grid-template-columns: 1fr;
          }
          .trialFactsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .trialProvenance {
            align-items: flex-start;
            flex-direction: column;
          }
          .trialActions {
            justify-content: flex-start;
          }
        }
        @media (max-width: 520px) {
          .trialPanel {
            padding: 18px;
          }
          .trialTitle {
            font-size: 16px;
          }
          .trialSummaryList > div {
            grid-template-columns: 1fr;
            gap: 5px;
          }
          .trialFactsGrid {
            grid-template-columns: 1fr;
          }
          .trialFactsGrid > div {
            min-height: 0;
          }
          .trialSectionHeading {
            align-items: flex-start;
            flex-direction: column;
            gap: 6px;
          }
          .trialActions,
          .trialActions :global(.btn),
          .trialActions :global(.btn-primary) {
            width: 100%;
          }
          .trialActions :global(.btn),
          .trialActions :global(.btn-primary) {
            display: inline-flex;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}

// Vercel/Next runtime: generate pages on-demand (best for large datasets).
export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<TrialPageProps> = async (ctx) => {
  const trialId = extractNctId(String(ctx.params?.trialId || "").trim());
  if (!trialId) return { notFound: true };

  const { loadMetaServer, loadDetailServer } = await import("@/lib/server-data");
  const [meta, trial] = await Promise.all([loadMetaServer(), loadDetailServer(trialId)]);

  if (!trial) {
    return { notFound: true, revalidate: 3600 };
  }

  return {
    props: {
      initialMeta: meta,
      initialTrial: trial,
    },
    // ISR: refresh the static HTML occasionally without changing UX/design.
    revalidate: 24 * 60 * 60,
  };
};
