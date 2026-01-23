import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { loadDatasetClient } from "@/lib/data";
import { buildViewTitle, exportCSV, exportJSON } from "@/lib/export";
import { decodeState } from "@/lib/urlState";
import { DatasetMeta, TrialRow } from "@/lib/types";
import { mapReasonBucket } from "@/lib/workbench";

function row(label: string, vals: (string | undefined)[]) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-xs font-semibold text-gray-600">{label}</td>
      {vals.map((v, i) => (
        <td key={i} className="px-3 py-2 text-sm text-gray-900 align-top whitespace-pre-wrap">
          {v || "—"}
        </td>
      ))}
    </tr>
  );
}

export default function Compare() {
  const router = useRouter();
  const state = useMemo(() => decodeState(router.query), [router.query]);

  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rowsAll, setRowsAll] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const ids = useMemo(() => (state.compare || []).slice(0, 5), [state.compare]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { meta, trials } = await loadDatasetClient("all");
      if (!alive) return;
      setMeta(meta);
      setRowsAll(trials);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const selected = useMemo(() => {
    const map = new Map(rowsAll.map((r) => [r.nct_id, r]));
    return ids.map((id) => map.get(id)).filter(Boolean) as TrialRow[];
  }, [rowsAll, ids]);

  const title = useMemo(() => `Compare trials — ${buildViewTitle(state)}`, [state]);

  const exportSelectedCSV = () => {
    if (!meta) return;
    exportCSV(meta, state, selected, "/compare", title);
  };
  const exportSelectedJSON = () => {
    if (!meta) return;
    exportJSON(meta, state, selected, "/compare", title);
  };

  return (
    <>
      <Head><title>{title}</title></Head>

      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm">
                <Link href="/explore" className="text-blue-700 hover:underline">← Back to Explore</Link>
              </div>
              <h1 className="mt-1 text-xl font-semibold text-gray-900">Compare trials</h1>
              <div className="mt-1 text-sm text-gray-600">Compare 2–5 selected trials side-by-side.</div>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50" onClick={exportSelectedCSV} type="button">
                Export CSV
              </button>
              <button className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50" onClick={exportSelectedJSON} type="button">
                Export JSON
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">
          {loading ? (
            <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-gray-700">Loading…</div>
          ) : selected.length < 2 ? (
            <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-gray-700">
              Select at least 2 trials from Explore to compare.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="overflow-auto">
                <table className="min-w-[900px] w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">Field</th>
                      {selected.map((t) => (
                        <th key={t.nct_id} className="px-3 py-3 text-left">
                          <div className="font-mono text-xs text-blue-700">{t.nct_id}</div>
                          <div className="mt-1 text-sm font-semibold text-gray-900 line-clamp-2">{t.brief_title}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {row("Status", selected.map((t) => t.overall_status))}
                    {row("Phase", selected.map((t) => t.phases))}
                    {row("Disease area", selected.map((t) => t.disease_area))}
                    {row("Countries", selected.map((t) => t.countries))}
                    {row("Conditions", selected.map((t) => t.conditions))}
                    {row("Interventions", selected.map((t) => t.intervention_names))}
                    {row("Sponsor", selected.map((t) => t.lead_sponsor))}
                    {row("Collaborators", selected.map((t) => t.collaborators))}
                    {row("Reason bucket", selected.map((t) => mapReasonBucket(t)))}
                    {row("Stop text", selected.map((t) => t.why_stopped))}
                    {row("Confidence", selected.map((t) => t.classification_confidence))}
                    {row("Evidence", selected.map((t) => t.classification_evidence))}
                    {row("Last update", selected.map((t) => t.last_update_post_date))}
                    {row("Source URL", selected.map((t) => t.url))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
