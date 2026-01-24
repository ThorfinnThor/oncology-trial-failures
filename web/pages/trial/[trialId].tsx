import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { DatasetMeta, TrialRow } from "@/lib/types";
import { loadMeta } from "@/lib/data";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { ConfidencePill, ReasonPill, Pill } from "@/components/Badges";

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "force-cache" });
  if (!r.ok) throw new Error(`Failed to load ${url}`);
  return (await r.json()) as T;
}

export default function TrialDetailPage() {
  const router = useRouter();
  const { trialId, from } = router.query;

  const id = useMemo(() => (typeof trialId === "string" ? trialId : ""), [trialId]);
  const backHref = useMemo(() => (typeof from === "string" && from ? from : "/"), [from]);

  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [trial, setTrial] = useState<TrialRow | null>(null);
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

        // Load ALL trials for robust lookup
        const all = await fetchJson<TrialRow[]>("/all_stopped_trials.json");
        const found = all.find((t) => t.nct_id === id) || null;

        // Fallback to biological_failure dataset if not found
        if (!found) {
          const bio = await fetchJson<TrialRow[]>("/biological_failure_trials.json");
          const found2 = bio.find((t) => t.nct_id === id) || null;
          if (!alive) return;
          setTrial(found2);
        } else {
          if (!alive) return;
          setTrial(found);
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load trial details.");
      }
    })();

    return () => { alive = false; };
  }, [id]);

  const phKey = trial ? (parsePhases(trial.phases || "")[0] || "Unknown") : "Unknown";
  const bucket = trial ? reasonBucket(trial) : "Other/Unknown";

  return (
    <>
      <Head>
        <title>{id ? `${id} • Clinical trial failures` : "Trial • Clinical trial failures"}</title>
      </Head>

      <div className="min-h-screen bg-[var(--bg)]">
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-4xl px-4 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--text)]">Clinical trial failures</div>
              <Link
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                href={backHref}
              >
                Back to Explore
              </Link>
            </div>
            <div className="mt-2 text-xs text-[var(--text-muted)]">
              Expanded view for one registry record. Verify with the primary source.
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6">
          {err && (
            <div className="rounded-2xl border border-[var(--error)]/30 bg-[var(--surface)] p-4 text-sm text-[var(--error)] shadow-sm">
              {err}
            </div>
          )}

          {!err && !trial && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)] shadow-sm">
              Loading…
            </div>
          )}

          {trial && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill>{trial.nct_id}</Pill>
                  <Pill>{phaseLabel(phKey as any)}</Pill>
                  <Pill>{(trial.overall_status || "—").toUpperCase()}</Pill>
                  <ReasonPill value={bucket} />
                  <ConfidencePill value={trial.classification_confidence || "—"} />
                  {trial.classification_label === "BIOLOGICAL_FAILURE" ? <Pill>Likely scientific failure</Pill> : null}
                </div>

                <h1 className="mt-3 text-xl font-semibold text-[var(--text)]">
                  {trial.brief_title || "—"}
                </h1>

                <div className="mt-3 text-sm text-[var(--text)]">
                  <div><span className="font-semibold">Sponsor:</span> {trial.lead_sponsor || "—"}</div>
                  <div className="mt-1"><span className="font-semibold">Collaborators:</span> {trial.collaborators || "—"}</div>
                  <div className="mt-1"><span className="font-semibold">Disease area:</span> {trial.disease_area || "Other"}</div>
                  <div className="mt-1"><span className="font-semibold">Last update:</span> {trial.last_update_post_date || "—"}</div>
                </div>

                <div className="mt-4">
                  <a className="text-sm font-semibold text-[var(--accent-primary)] hover:underline" href={trial.url} target="_blank" rel="noreferrer">
                    Open primary source (ClinicalTrials.gov)
                  </a>
                  <span className="mx-2 text-[var(--text-muted)]">•</span>
                  <Link className="text-sm font-semibold text-[var(--accent-primary)] hover:underline" href="/methods#bio-failures">
                    What does “Likely scientific failure” mean?
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Stop reason (full text)</div>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
                  {trial.why_stopped || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Key fields</div>
                <div className="mt-2 text-sm text-[var(--text)] space-y-2">
                  <div><span className="font-semibold">Conditions:</span> {trial.conditions || "—"}</div>
                  <div><span className="font-semibold">Interventions:</span> {trial.intervention_names || "—"}</div>
                  <div><span className="font-semibold">Intervention types:</span> {trial.intervention_types || "—"}</div>
                  <div><span className="font-semibold">Phases (raw):</span> {trial.phases || "—"}</div>
                  <div><span className="font-semibold">MeSH terms:</span> {trial.mesh_terms || "—"}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Provenance</div>
                <div className="mt-2 text-sm text-[var(--text)] space-y-2">
                  <div><span className="font-semibold">Primary identifier:</span> {trial.nct_id}</div>
                  <div><span className="font-semibold">Primary source:</span> ClinicalTrials.gov</div>
                  <div>
                    <span className="font-semibold">Dataset version:</span>{" "}
                    {meta ? `${meta.version} (generated ${meta.generated_at_utc})` : "—"}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Note: Labels are inferred from registry text and may be incomplete. Verify using primary sources.
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
