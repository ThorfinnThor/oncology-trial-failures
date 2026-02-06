// web/pages/trial/[trialId].tsx

import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { loadDetail, loadMeta } from "@/lib/data";
import { DatasetMeta, TrialDetail } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

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

  const trialId = useMemo(
    () => (router.query.trialId ? String(router.query.trialId) : initialTrial?.nct_id || ""),
    [router.query.trialId, initialTrial]
  );
  const from = useMemo(
    () => (router.query.from ? String(router.query.from) : "/explore"),
    [router.query.from]
  );

  const [meta, setMeta] = useState<DatasetMeta | null>(initialMeta ?? null);
  const [trial, setTrial] = useState<TrialDetail | null>(initialTrial ?? null);
  const [err, setErr] = useState<string | null>(null);

  // Keep the existing runtime behavior: once hydrated, the page still fetches the same
  // client-side sources as before. This preserves functionality while enabling SSR/SSG.
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

  const title = trialId
    ? `${trialId} — Clinical trial failures`
    : "Trial — Clinical trial failures";

  const description = trial
    ? `${trial.brief_title || trial.nct_id} — ${bucket}. ${
        (trial.why_stopped || trial.why_stopped_short || "").trim() || "Stopped early."
      }`
        .replace(/\s+/g, " ")
        .slice(0, 180)
    : "Trial detail for a stopped clinical trial.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta name="twitter:title" content={title} />
      </Head>

      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/explore" className="brand">
                Clinical trial failures
              </Link>
              <nav className="nav">
                <Link className="navlink" href="/explore">
                  Explore
                </Link>
                <Link className="navlink" href="/pharma-intelligence">
                  Pharma intelligence
                </Link>
                <Link className="navlink" href="/outliers">
                  Outliers
                </Link>
                <Link className="navlink" href="/share-leaders">
                  Share leaders
                </Link>
                <Link className="navlink" href="/methods">
                  Methods
                </Link>
              </nav>
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
                <div className="card p-4">
                  <div className="muted" style={{ fontSize: 12 }}>
                    Trial
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{trial.nct_id}</div>
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

// SSG/ISR: pre-render trial pages so crawlers get real content without JS.
// We use fallback: "blocking" to avoid a huge build if there are many trials.
export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: "blocking",
  };
};

export const getStaticProps: GetStaticProps<TrialPageProps> = async (ctx) => {
  const trialId = String(ctx.params?.trialId || "").trim();
  if (!trialId) {
    return { notFound: true };
  }

  // Dynamic import prevents server-only fs/path code from ever entering the client bundle.
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
    // Re-generate periodically (ISR). This does not change UI, only freshness for crawlers.
    revalidate: 24 * 60 * 60,
  };
};
