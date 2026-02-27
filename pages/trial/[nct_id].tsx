import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { loadDatasetClient } from "@/lib/data";
import { DatasetMeta, TrialRow } from "@/lib/types";

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

export default function TrialPage() {
  const router = useRouter();
  const nct_id = typeof router.query.nct_id === "string" ? router.query.nct_id : "";

  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [trials, setTrials] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        // Use ALL dataset for detail page to maximize chance the trial exists
        const { meta, trials } = await loadDatasetClient("all");
        if (!alive) return;
        setMeta(meta);
        setTrials(trials);
        setErr(null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load dataset.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const trial = useMemo(() => {
    if (!nct_id) return null;
    return trials.find((t) => t.nct_id === nct_id) || null;
  }, [trials, nct_id]);

  return (
    <>
      <Head>
        <title>{nct_id ? `${nct_id} • Stopped Trials Explorer` : "Stopped Trials Explorer"}</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-4xl px-4 py-6">
            <div className="text-sm">
              <Link className="text-blue-700 hover:underline" href="/">
                ← Back to list
              </Link>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {meta ? (
                <>
                  Dataset version: <span className="font-medium">{meta.version}</span> • Generated:{" "}
                  <span className="font-medium">{meta.generated_at_utc}</span>
                </>
              ) : (
                <>Loading metadata…</>
              )}
            </div>

            <h1 className="mt-2 text-2xl font-semibold text-gray-900">{nct_id || "Trial"}</h1>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
          {loading && (
            <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-sm">
              Loading trial…
            </div>
          )}

          {err && (
            <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 shadow-sm">
              {err}
            </div>
          )}

          {!loading && !err && !trial && (
            <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-sm">
              Trial not found in the current dataset version.
            </div>
          )}

          {!loading && !err && trial && (
            <>
              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">{trial.brief_title}</h2>
                <div className="mt-2 text-sm text-gray-600">
                  <a className="text-blue-700 hover:underline" href={trial.url} target="_blank" rel="noreferrer">
                    Open on ClinicalTrials.gov
                  </a>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Field label="Status" value={trial.overall_status} />
                  <Field label="Disease area" value={trial.disease_area} />
                  <Field label="Reason" value={trial.classification_reason} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Sponsor" value={trial.lead_sponsor} />
                  <Field label="Collaborators" value={trial.collaborators} />
                </div>

                <div className="mt-4">
                  <Field label="Why stopped (raw)" value={trial.why_stopped} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Confidence (rule-based)" value={trial.classification_confidence} />
                  <Field label="Classifier evidence" value={trial.classification_evidence} />
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Conditions" value={trial.conditions} />
                  <Field label="MeSH terms" value={trial.mesh_terms} />
                  <Field label="Interventions" value={trial.intervention_names} />
                  <Field label="Intervention types" value={trial.intervention_types} />
                  <Field label="Phase(s)" value={trial.phases} />
                  <Field label="Study type" value={trial.study_type} />
                  <Field label="Last update" value={trial.last_update_post_date} />
                  <Field label="Start date" value={trial.start_date} />
                  <Field label="Primary completion" value={trial.primary_completion_date} />
                  <Field label="Completion" value={trial.completion_date} />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
