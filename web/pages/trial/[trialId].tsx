// web/pages/trial/[trialId].tsx

import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { loadDetail, loadMeta } from "@/lib/data";
import { DatasetMeta, TrialDetail } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { extractNctId, trialPath } from "@/lib/seoUrls";
import { isIndexableTrial } from "@/lib/seoHubs";
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
  if (b === "EFFICACY/FUTILITY") return "chip chip-bucket-efficacy";
  if (b === "ENROLLMENT") return "chip chip-bucket-enrollment";
  if (b === "FUNDING") return "chip chip-bucket-funding";
  if (b === "REGULATORY") return "chip chip-bucket-regulatory";
  if (b === "STRATEGIC") return "chip chip-bucket-strategic";
  if (b === "OPERATIONAL") return "chip chip-bucket-operational";
  return "chip chip-neutral";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4" style={{ marginTop: 14 }}>
      <div className="facet-title">{title}</div>
      {children}
    </div>
  );
}

function cleanText(value: string | undefined, fallback = "Not available") {
  const text = (value || "").replace(/\s+/g, " ").trim();
  return text || fallback;
}

function registryUrl(trial: TrialDetail) {
  return trial.url || `https://clinicaltrials.gov/study/${encodeURIComponent(trial.nct_id)}`;
}

export default function TrialPage({ initialMeta, initialTrial }: TrialPageProps) {
  const router = useRouter();

  const trialParam = useMemo(
    () => (router.query.trialId ? String(router.query.trialId) : initialTrial?.nct_id || ""),
    [router.query.trialId, initialTrial]
  );
  const trialId = useMemo(() => extractNctId(trialParam), [trialParam]);
  const from = useMemo(
    () => (router.query.from ? String(router.query.from) : "/explore"),
    [router.query.from]
  );

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

  const phaseText = phaseLabel(phaseKey);
  const conditionText = trial?.condition_first || trial?.conditions || "stopped clinical trial";
  const interventionText = trial?.intervention_first || trial?.intervention_names || trial?.brief_title || trialId;
  const sponsorText = trial?.lead_sponsor || "the listed sponsor";
  const stopReasonText = (trial?.why_stopped || trial?.why_stopped_short || bucket || "stopped early").trim();

  const title = trial
    ? `${trial.nct_id}: ${interventionText} ${conditionText} trial | Clinical Trial Failures`
    : trialId
      ? `${trialId} clinical trial record | Clinical Trial Failures`
      : "Trial record | Clinical Trial Failures";

  const description = trial
    ? `${interventionText} — ${phaseText} ${conditionText} trial by ${sponsorText}, stopped for ${stopReasonText}. See the source record and failure signals.`
        .replace(/\s+/g, " ")
        .slice(0, 170)
    : "Trial detail for a stopped clinical trial.";
  const canonicalUrl = trial ? `${SITE_URL}${trialPath(trial)}` : trialId ? `${SITE_URL}/trial/${encodeURIComponent(trialId)}` : `${SITE_URL}/explore`;
  const indexable = trial ? isIndexableTrial(trial) : false;

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
          sameAs: registryUrl(trial),
          sponsor: trial.lead_sponsor
            ? {
                "@type": "Organization",
                name: trial.lead_sponsor,
              }
            : undefined,
          studySubject: conditionText,
          studyStatus: trial.overall_status || undefined,
          phase: phaseText,
          healthCondition: conditionText
            ? {
                "@type": "MedicalCondition",
                name: conditionText,
              }
            : undefined,
        },
        {
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Clinical Trial Failures Database",
          description:
            "An analytical database of terminated, suspended, and withdrawn clinical trial records with stop-reason classifications.",
          url: SITE_URL,
          isBasedOn: "ClinicalTrials.gov registry records",
          creator: {
            "@type": "Organization",
            name: "Clinical Trial Failures",
          },
          citation: registryUrl(trial),
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
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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

        <main className="page trialTerminal">
          <div className="terminalWrap">
            {err && <div className="card p-4 error">{err}</div>}
            {!trial && !err && <div className="card p-4 muted">Loading…</div>}

            {trial && (
              <>
                <nav className="terminalBreadcrumb" aria-label="Breadcrumb">
                  <Link className="link" href="/">
                    Home
                  </Link>{" "}
                  /{" "}
                  <Link className="link" href="/explore">
                    Explore
                  </Link>{" "}
                  / <span>{trial.nct_id}</span>
                </nav>

                <section className="terminalHero">
                  <div className="terminalHeroTop">
                    <Link className="terminalBack" href={from}>
                      Back to directory
                    </Link>
                    <div className="verifyPill">
                      <span aria-hidden="true" />
                      Verified source-linked record
                    </div>
                  </div>

                  <p className="terminalEyebrow">Clinical trial analysis</p>
                  <h1>{trial.nct_id}</h1>
                  <p className="terminalTitle">
                    {trial.brief_title || "—"}
                  </p>

                  <div className="terminalBadges" aria-label="Trial classification">
                    <span className={phaseChipClass(phaseKey)}>{phaseLabel(phaseKey)}</span>
                    <span className="chip chip-neutral">
                      {(trial.overall_status || "UNKNOWN").toUpperCase()}
                    </span>
                    <span className={bucketChipClass(bucket)}>{bucket}</span>
                    {trial.classification_confidence ? (
                      <span className="chip chip-neutral">Confidence: {trial.classification_confidence}</span>
                    ) : null}
                  </div>
                </section>

                <div className="terminalGrid">
                  <aside className="terminalPanel aiSummary">
                    <div className="panelLabel">Factual quick summary</div>
                    <article data-ai-summary="true" className="aiFactList">
                      <p>
                        <strong>Registry ID:</strong> <span>{trial.nct_id}</span>
                      </p>
                      <p>
                        <strong>Sponsor entity:</strong> <span>{cleanText(trial.lead_sponsor)}</span>
                      </p>
                      <p>
                        <strong>Clinical phase:</strong> <span>{phaseText}</span>
                      </p>
                      <p>
                        <strong>Condition / area:</strong>{" "}
                        <span>{cleanText(trial.conditions || trial.condition_first || trial.disease_area)}</span>
                      </p>
                      <p>
                        <strong>Intervention:</strong>{" "}
                        <span>{cleanText(trial.intervention_names || trial.intervention_first)}</span>
                      </p>
                      <p>
                        <strong>Status:</strong> <span>{cleanText(trial.overall_status)}</span>
                      </p>
                      <p>
                        <strong>Stop-reason classification:</strong> <span>{bucket}</span>
                      </p>
                    </article>
                  </aside>

                  <section className="terminalPanel classificationPanel">
                    <div className="panelLabel">Classification</div>
                    <div className="classificationBadges">
                      <span className={bucketChipClass(bucket)}>{bucket}</span>
                      <span className={phaseChipClass(phaseKey)}>{phaseText}</span>
                      <span className="chip chip-neutral">{cleanText(trial.disease_area, "Disease area unknown")}</span>
                    </div>

                    <div className="registryReason">
                      <div className="panelLabel">Official registry stop reason statement</div>
                      <blockquote>{cleanText(trial.why_stopped || trial.why_stopped_short, "No stop reason was available in the compact dataset.")}</blockquote>
                    </div>

                    <dl className="terminalMetaGrid">
                      <div>
                        <dt>Sponsor</dt>
                        <dd>{cleanText(trial.lead_sponsor)}</dd>
                      </div>
                      <div>
                        <dt>Collaborators</dt>
                        <dd>{cleanText(trial.collaborators)}</dd>
                      </div>
                      <div>
                        <dt>Condition</dt>
                        <dd>{cleanText(trial.conditions || trial.condition_first)}</dd>
                      </div>
                      <div>
                        <dt>Intervention</dt>
                        <dd>{cleanText(trial.intervention_names || trial.intervention_first)}</dd>
                      </div>
                    </dl>
                  </section>
                </div>

                <section className="terminalPanel provenancePanel">
                  <div className="panelLabel">Provenance</div>
                  <dl className="provenanceList">
                    <div>
                      <dt>Dataset version</dt>
                      <dd>{meta?.version || "Not available"}</dd>
                    </div>
                    <div>
                      <dt>Primary source</dt>
                      <dd>{meta?.source || "ClinicalTrials.gov"}</dd>
                    </div>
                    <div>
                      <dt>Last registry update</dt>
                      <dd>{trial.last_update_post_date || "Not available"}</dd>
                    </div>
                    <div>
                      <dt>Use limitation</dt>
                      <dd>Analytical screening signal, not medical advice.</dd>
                    </div>
                  </dl>
                  <a className="sourceTextLink" href={registryUrl(trial)} target="_blank" rel="noreferrer">
                    View primary ClinicalTrials.gov record
                  </a>
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      <style jsx global>{`
        .trialTerminal {
          background:
            linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(241, 245, 249, 0.92)),
            radial-gradient(circle at top right, rgba(79, 70, 229, 0.08), transparent 34%);
        }
        .trialTerminal .terminalWrap {
          max-width: 1120px;
          margin: 0 auto;
        }
        .trialTerminal .terminalBreadcrumb {
          color: var(--text-muted);
          font-size: 13px;
          margin-bottom: 12px;
        }
        .trialTerminal .terminalHero,
        .trialTerminal .terminalPanel {
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
        }
        .trialTerminal .terminalHero {
          padding: 22px;
        }
        .trialTerminal .terminalHeroTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 22px;
        }
        .trialTerminal .terminalBack {
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 800;
          text-decoration: none;
        }
        .trialTerminal .terminalBack:hover {
          color: var(--text);
        }
        .trialTerminal .verifyPill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 1px solid rgba(22, 163, 74, 0.24);
          border-radius: 999px;
          background: #f0fdf4;
          color: #166534;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }
        .trialTerminal .verifyPill span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #16a34a;
        }
        .trialTerminal .terminalEyebrow,
        .trialTerminal .panelLabel {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .trialTerminal h1 {
          margin: 7px 0 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
          font-size: 38px;
          line-height: 1;
          letter-spacing: 0;
        }
        .trialTerminal .terminalTitle {
          max-width: 850px;
          margin: 12px 0 0;
          color: #1e293b;
          font-size: 20px;
          font-weight: 850;
          line-height: 1.3;
        }
        .trialTerminal .terminalBadges,
        .trialTerminal .classificationBadges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
        }
        .trialTerminal .terminalGrid {
          display: grid;
          grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.4fr);
          gap: 16px;
          margin-top: 16px;
        }
        .trialTerminal .terminalPanel {
          padding: 18px;
        }
        .trialTerminal .aiFactList {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }
        .trialTerminal .aiFactList p {
          margin: 0;
          color: #475569;
          font-size: 14px;
          line-height: 1.45;
        }
        .trialTerminal .aiFactList strong {
          color: #0f172a;
        }
        .trialTerminal .registryReason {
          margin-top: 18px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 12px;
          background: #f8fafc;
          padding: 14px;
        }
        .trialTerminal blockquote {
          margin: 8px 0 0;
          color: #334155;
          font-size: 15px;
          line-height: 1.65;
        }
        .trialTerminal .terminalMetaGrid,
        .trialTerminal .provenanceList {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 18px 0 0;
        }
        .trialTerminal dt {
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .trialTerminal dd {
          margin: 5px 0 0;
          color: #0f172a;
          font-size: 14px;
          font-weight: 750;
          line-height: 1.35;
          word-break: break-word;
        }
        .trialTerminal .terminalButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          border-radius: 10px;
          background: #fff;
          color: #334155;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }
        .trialTerminal .terminalButton:hover,
        .trialTerminal .terminalButton:focus-visible {
          border-color: rgba(79, 70, 229, 0.45);
          background: #f8fafc;
          transform: translateY(-1px);
          outline: none;
        }
        .trialTerminal .terminalButton.primary {
          border-color: #2563eb;
          background: #2563eb;
          color: #fff;
        }
        .trialTerminal .terminalButton.primary:hover,
        .trialTerminal .terminalButton.primary:focus-visible {
          background: #1d4ed8;
        }
        .trialTerminal .terminalButton.ghost {
          width: 100%;
          margin-top: 16px;
        }
        .trialTerminal .provenancePanel {
          margin-top: 16px;
        }
        .trialTerminal .sourceTextLink {
          display: inline-flex;
          margin-top: 14px;
          color: #2563eb;
          font-size: 13px;
          font-weight: 850;
          text-decoration: none;
        }
        .trialTerminal .sourceTextLink:hover,
        .trialTerminal .sourceTextLink:focus-visible {
          text-decoration: underline;
          text-underline-offset: 0.18em;
          outline: none;
        }
        @media (max-width: 900px) {
          .trialTerminal .terminalHeroTop {
            align-items: flex-start;
            flex-direction: column;
          }
          .trialTerminal .terminalGrid,
          .trialTerminal .terminalMetaGrid,
          .trialTerminal .provenanceList {
            grid-template-columns: 1fr;
          }
          .trialTerminal h1 {
            font-size: 30px;
          }
          .trialTerminal .terminalTitle {
            font-size: 18px;
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
