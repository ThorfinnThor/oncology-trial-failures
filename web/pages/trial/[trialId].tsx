import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { loadDetail, loadMeta } from "@/lib/data";
import { TrialDetail, DatasetMeta } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

export default function TrialDetailPage() {
  const router = useRouter();
  const { trialId, from } = router.query;

  const id = useMemo(() => (typeof trialId === "string" ? trialId : ""), [trialId]);
  const backHref = useMemo(() => (typeof from === "string" && from ? from : "/"), [from]);

  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [trial, setTrial] = useState<TrialDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      try {
        setErr(null);
        const m = await loadMeta();
        if (!alive) return;
        setMeta(m);

        const t = await loadDetail(id);
        if (!alive) return;
        setTrial(t);
        if (!t) setErr("Trial not found in dataset.");
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load trial details.");
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const phKey = trial ? (parsePhases(trial.phases || "")[0] || "Unknown") : "Unknown";

  return (
    <>
      <Head>
        <title>{id ? `${id} • Clinical trial failures` : "Trial • Clinical trial failures"}</title>
      </Head>

      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
            <div className="font-semibold">Clinical trial failures</div>
            <Link className="rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white" href={backHref}>
              Back to Explore
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6">
          {err && (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)] text-sm">
              {err}
            </div>
          )}

          {!err && !trial && (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)] text-sm text-[var(--text-muted)]">
              Loading…
            </div>
          )}

          {trial && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]">
                <div className="text-xs text-[var(--text-muted)]">
                  Dataset version: <span className="font-semibold text-[var(--text)]">{meta?.version || "—"}</span>
                </div>

                <h1 className="mt-2 text-xl font-semibold">{trial.brief_title || "—"}</h1>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">{trial.nct_id}</span>
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">{phaseLabel(phKey as any)}</span>
                  <span className="rounded-full bg-[var(--surface-2)] px-3 py-1">{(trial.overall_status || "—").toUpperCase()}</span>
                </div>

                <div className="mt-4 grid gap-2 text-sm">
                  <div><span className="font-semibold">Sponsor:</span> {trial.lead_sponsor || "—"}</div>
                  <div><span className="font-semibold">Collaborators:</span> {trial.collaborators || "—"}</div>
                  <div><span className="font-semibold">Disease area:</span> {trial.disease_area || "Other"}</div>
                  <div><span className="font-semibold">Last update:</span> {trial.last_update_post_date || "—"}</div>
                </div>

                <div className="mt-4">
                  <a className="text-sm font-semibold" href={trial.url} target="_blank" rel="noreferrer">
                    Open primary source
                  </a>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Stated stop reason (full)</div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {trial.why_stopped || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Key fields</div>
                <div className="mt-2 text-sm space-y-2">
                  <div><span className="font-semibold">Conditions:</span> {trial.conditions || "—"}</div>
                  <div><span className="font-semibold">Interventions:</span> {trial.intervention_names || "—"}</div>
                  <div><span className="font-semibold">MeSH terms:</span> {trial.mesh_terms || "—"}</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
