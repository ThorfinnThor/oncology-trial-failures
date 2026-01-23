import { useMemo, useState } from "react";
import { splitSemicolonValues } from "@/lib/data";
import { mapReasonBucket } from "@/lib/workbench";
import { DatasetMeta, TrialRow } from "@/lib/types";

type Props = {
  meta: DatasetMeta;
  rows: TrialRow[];
  trialId: string | null;
  onClose: () => void;
  onAddCompare: (id: string) => void;
};

function KV({ k, v }: { k: string; v?: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1">
      <div className="text-xs font-semibold text-gray-600">{k}</div>
      <div className="col-span-2 text-sm text-gray-900 whitespace-pre-wrap">{v || "—"}</div>
    </div>
  );
}

export function TrialDrawer({ meta, rows, trialId, onClose, onAddCompare }: Props) {
  const [tab, setTab] = useState<"overview" | "rationale" | "timeline" | "sources">("overview");

  const trial = useMemo(() => {
    if (!trialId) return null;
    return rows.find((r) => r.nct_id === trialId) || null;
  }, [rows, trialId]);

  const related = useMemo(() => {
    if (!trial) return { sponsor: [], intervention: [], condition: [] as TrialRow[] };

    const sponsor = trial.lead_sponsor;
    const intr = splitSemicolonValues(trial.intervention_names || "")[0];
    const cond = splitSemicolonValues(trial.conditions || "")[0];

    const bySponsor = sponsor ? rows.filter((r) => r.nct_id !== trial.nct_id && r.lead_sponsor === sponsor).slice(0, 5) : [];
    const byIntr = intr ? rows.filter((r) => r.nct_id !== trial.nct_id && (r.intervention_names || "").includes(intr)).slice(0, 5) : [];
    const byCond = cond ? rows.filter((r) => r.nct_id !== trial.nct_id && (r.conditions || "").includes(cond)).slice(0, 5) : [];

    return { sponsor: bySponsor, intervention: byIntr, condition: byCond };
  }, [trial, rows]);

  if (!trialId) return null;

  return (
    <aside className="h-full w-full border-l bg-white">
      <div className="flex h-full flex-col">
        <div className="border-b p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Trial</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">
                {trial?.brief_title || trialId}
              </div>
              <div className="mt-1 font-mono text-xs text-gray-600">{trialId}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold">{(trial?.overall_status || "—").toUpperCase()}</span>
                <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold">{trial?.phases || "—"}</span>
                <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold">{mapReasonBucket(trial as any)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50" onClick={onClose} type="button">
                Close
              </button>
              <button
                className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                onClick={() => onAddCompare(trialId)}
                type="button"
              >
                Add to compare
              </button>
              {trial?.url ? (
                <a className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50 text-center" href={trial.url} target="_blank" rel="noreferrer">
                  Open source
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {(["overview","rationale","timeline","sources"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                  tab === t ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                onClick={() => setTab(t)}
              >
                {t === "overview" ? "Overview" : t === "rationale" ? "Stop rationale" : t === "timeline" ? "Timeline" : "Sources"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {!trial ? (
            <div className="text-sm text-gray-700">Trial not found in the current dataset.</div>
          ) : (
            <>
              {tab === "overview" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Key fields</div>
                    <div className="mt-2">
                      <KV k="Disease area" v={trial.disease_area} />
                      <KV k="Countries" v={trial.countries} />
                      <KV k="Conditions" v={trial.conditions} />
                      <KV k="Interventions" v={trial.intervention_names} />
                      <KV k="Sponsor" v={trial.lead_sponsor} />
                      <KV k="Collaborators" v={trial.collaborators} />
                    </div>
                  </div>

                  <div className="rounded-2xl border p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Related trials</div>
                    <div className="mt-2 space-y-2 text-sm">
                      <div>
                        <div className="text-xs font-semibold text-gray-600">Same sponsor</div>
                        {related.sponsor.length ? (
                          <ul className="mt-1 list-disc pl-5">
                            {related.sponsor.map((r) => <li key={r.nct_id}>{r.nct_id} — {r.brief_title}</li>)}
                          </ul>
                        ) : <div className="text-gray-500">None found.</div>}
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-600">Same intervention</div>
                        {related.intervention.length ? (
                          <ul className="mt-1 list-disc pl-5">
                            {related.intervention.map((r) => <li key={r.nct_id}>{r.nct_id} — {r.brief_title}</li>)}
                          </ul>
                        ) : <div className="text-gray-500">None found.</div>}
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-gray-600">Same condition</div>
                        {related.condition.length ? (
                          <ul className="mt-1 list-disc pl-5">
                            {related.condition.map((r) => <li key={r.nct_id}>{r.nct_id} — {r.brief_title}</li>)}
                          </ul>
                        ) : <div className="text-gray-500">None found.</div>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "rationale" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Structured label</div>
                    <div className="mt-2 space-y-2">
                      <KV k="Reason bucket" v={mapReasonBucket(trial)} />
                      <KV k="Classifier reason" v={trial.classification_reason} />
                      <KV k="Confidence" v={trial.classification_confidence} />
                      <div className="text-xs text-gray-500">
                        Confidence reflects how strongly the stop text supports the label (matched signals and negations). It is not medical certainty.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Recorded stop text</div>
                    <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">{trial.why_stopped || "—"}</div>
                  </div>

                  <div className="rounded-2xl border p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Explainability</div>
                    <div className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">{trial.classification_evidence || "—"}</div>
                    <a href="/methods#reason-buckets" className="mt-2 inline-block text-xs font-semibold text-blue-700 hover:underline">
                      How buckets are defined
                    </a>
                  </div>
                </div>
              )}

              {tab === "timeline" && (
                <div className="rounded-2xl border p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Timeline</div>
                  <div className="mt-2">
                    <KV k="Start date" v={trial.start_date} />
                    <KV k="Primary completion" v={trial.primary_completion_date} />
                    <KV k="Completion" v={trial.completion_date} />
                    <KV k="Last update" v={trial.last_update_post_date} />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Date filters are currently based on “last update” (registry update date).
                  </div>
                </div>
              )}

              {tab === "sources" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Provenance</div>
                    <div className="mt-2">
                      <KV k="Primary ID" v={trial.nct_id} />
                      <KV k="Source" v={meta.source} />
                      <KV k="Dataset version" v={meta.version} />
                      <KV k="Dataset generated" v={meta.generated_at_utc} />
                      <KV k="Registry last update (field)" v={trial.last_update_post_date} />
                    </div>
                  </div>

                  <details className="rounded-2xl border p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-900">View raw record</summary>
                    <pre className="mt-3 overflow-auto rounded-xl bg-gray-50 p-3 text-xs text-gray-800">
{JSON.stringify(trial, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
