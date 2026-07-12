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
          sponsor: trial.lead_sponsor
            ? {
                "@type": "Organization",
                name: trial.lead_sponsor,
              }
            : undefined,
          studySubject: conditionText,
          status: trial.overall_status || undefined,
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

        <main className="page">
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            {err && <div className="card p-4 error">{err}</div>}
            {!trial && !err && <div className="card p-4 muted">Loading…</div>}

            {trial && (
              <>
                <nav className="muted" aria-label="Breadcrumb" style={{ fontSize: 13, marginBottom: 12 }}>
                  <Link className="link" href="/">
                    Home
                  </Link>{" "}
                  /{" "}
                  <Link className="link" href="/explore">
                    Explore
                  </Link>{" "}
                  / <span>{trial.nct_id}</span>
                </nav>
                <div className="card p-4">
                  <div className="muted" style={{ fontSize: 12 }}>
                    Trial
                  </div>
                  <h1 style={{ fontSize: 22, fontWeight: 900, margin: "4px 0 0" }}>{trial.nct_id}</h1>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 10, lineHeight: 1.25 }}>
                    {trial.brief_title || "—"}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    <span className={phaseChipClass(phaseKey)}>{phaseLabel(phaseKey)}</span>
                    <span className="chip chip-neutral">
                      {(trial.overall_status || "UNKNOWN").toUpperCase()}
                    </span>
                    <span className={bucketChipClass(bucket)}>{bucket}</span>
                    {trial.classification_confidence ? (
                      <span className="chip chip-neutral">Confidence: {trial.classification_confidence}</span>
                    ) : null}
                  </div>

                  <div
                    style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}
                  >
                    <div>
                      <div className="facet-title" style={{ marginBottom: 6 }}>
                        Sponsor
                      </div>
                      <div style={{ fontSize: 14 }}>{trial.lead_sponsor || "—"}</div>
                    </div>
                    <div>
                      <div className="facet-title" style={{ marginBottom: 6 }}>
                        Collaborators
                      </div>
                      <div style={{ fontSize: 14 }}>{trial.collaborators || "—"}</div>
                    </div>
                    <div>
                      <div className="facet-title" style={{ marginBottom: 6 }}>
                        Condition
                      </div>
                      <div style={{ fontSize: 14 }}>{trial.conditions || trial.condition_first || "—"}</div>
                    </div>
                    <div>
                      <div className="facet-title" style={{ marginBottom: 6 }}>
                        Intervention
                      </div>
                      <div style={{ fontSize: 14 }}>
                        {trial.intervention_names || trial.intervention_first || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <Section title="Why stopped">
                  <div
                    style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "normal", wordBreak: "break-word" }}
                  >
                    {(trial.why_stopped || trial.why_stopped_short || "—").trim()}
                  </div>
                </Section>

                <Section title="Provenance">
                  <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                    Dataset:{" "}
                    <span style={{ color: "var(--text)", fontWeight: 700 }}>{meta?.version || "—"}</span>
                    {meta?.source ? (
                      <>
                        {" "}
                        • Source:{" "}
                        <span style={{ color: "var(--text)", fontWeight: 700 }}>{meta.source}</span>
                      </>
                    ) : null}
                    {trial.last_update_post_date ? (
                      <>
                        {" "}
                        • Last update:{" "}
                        <span style={{ color: "var(--text)", fontWeight: 700 }}>
                          {trial.last_update_post_date}
                        </span>
                      </>
                    ) : null}
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <a className="btn" href={trial.url} target="_blank" rel="noreferrer">
                      View on ClinicalTrials.gov
                    </a>
                  </div>
                </Section>
              </>
            )}
          </div>
        </main>
      </div>
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
