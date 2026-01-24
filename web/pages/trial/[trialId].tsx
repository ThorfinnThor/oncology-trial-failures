import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { loadDetail, loadMeta } from "@/lib/data";
import { DatasetMeta, TrialDetail } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

export default function TrialPage() {
  const router = useRouter();
  const trialId = useMemo(() => (router.query.trialId ? String(router.query.trialId) : ""), [router.query.trialId]);
  const from = useMemo(() => (router.query.from ? String(router.query.from) : "/explore"), [router.query.from]);

  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [trial, setTrial] = useState<TrialDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

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

  const phase = useMemo(() => (trial ? parsePhases(trial.phases || "")[0] || "UNKNOWN" : "UNKNOWN"), [trial]);
  const bucket = useMemo(() => (trial ? reasonBucket(trial) : "OTHER/UNKNOWN"), [trial]);

  return (
    <>
      <Head>
        <title>{trialId ? `${trialId} — Clinical trial failures` : "Trial — Clinical trial failures"}</title>
      </Head>

      <div className="min-h-screen">
        <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="mx-auto max-w-[1100px] px-4 py-4 flex items-center justify-between gap-3">
            <Link href={from} className="btn">
              ← Back
            </Link>

            <Link href="/explore" className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Clinical trial failures
            </Link>

            <div className="w-[80px]" />
          </div>
        </header>

        <main className="mx-auto max-w-[1100px] px-4 py-8">
          {err && <div className="card p-4 text-rose-700">{err}</div>}
          {!trial && !err && <div className="card p-4" style={{ color: "var(--text-muted)" }}>Loading…</div>}

          {trial && (
            <>
              <div className="card p-6">
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Trial
                </div>
                <div className="text-2xl font-semibold mt-1">{trial.nct_id}</div>
                <div className="text-lg font-semibold mt-3 leading-snug">{trial.brief_title || "—"}</div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="chip">{phaseLabel(phase as any)}</span>
                  <span className="chip">{(trial.overall_status || "UNKNOWN").toUpperCase()}</span>
                  <span className="chip">{bucket}</span>
                  {trial.classification_confidence ? (
                    <span className="chip">Confidence: {trial.classification_confidence}</span>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      Sponsor
                    </div>
                    <div className="mt-1">{trial.lead_sponsor || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      Collaborators
                    </div>
                    <div className="mt-1">{trial.collaborators || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      Condition
                    </div>
                    <div className="mt-1">{trial.conditions || trial.condition_first || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                      Intervention
                    </div>
                    <div className="mt-1">{trial.intervention_names || trial.intervention_first || "—"}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 card p-6">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Why stopped
                </div>
                <div className="mt-2 text-sm leading-relaxed whitespace-normal break-words">
                  {(trial.why_stopped || trial.why_stopped_short || "—").trim()}
                </div>
              </div>

              <div className="mt-4 card p-6">
                <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  Provenance
                </div>
                <div className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
                  Dataset: <span className="font-medium" style={{ color: "var(--text)" }}>{meta?.version || "—"}</span>
                  {meta?.source ? (
                    <>
                      {" "}• Source: <span className="font-medium" style={{ color: "var(--text)" }}>{meta.source}</span>
                    </>
                  ) : null}
                  {trial.last_update_post_date ? (
                    <>
                      {" "}• Last update: <span className="font-medium" style={{ color: "var(--text)" }}>{trial.last_update_post_date}</span>
                    </>
                  ) : null}
                </div>

                <div className="mt-3">
                  <a className="btn" href={trial.url} target="_blank" rel="noreferrer">
                    View on ClinicalTrials.gov
                  </a>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
