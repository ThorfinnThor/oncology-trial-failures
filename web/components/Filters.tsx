import { useState } from "react";

type Props = {
  q: string;
  setQ: (v: string) => void;

  area: string;
  setArea: (v: string) => void;

  reason: string;
  setReason: (v: string) => void;

  status: string;
  setStatus: (v: string) => void;

  phase: string;
  setPhase: (v: string) => void;

  // Advanced
  confidence: string;
  setConfidence: (v: string) => void;

  sort: string;
  setSort: (v: string) => void;

  areas: string[];
  reasons: string[];
  statuses: string[];
  phases: string[];
  confidences: string[];
};

export function Filters(props: Props) {
  const {
    q, setQ,
    area, setArea,
    reason, setReason,
    status, setStatus,
    phase, setPhase,
    confidence, setConfidence,
    sort, setSort,
    areas, reasons, statuses, phases, confidences,
  } = props;

  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <label className="block text-xs font-medium text-gray-600">Search</label>
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            placeholder="Title, sponsor, collaborator, drug, condition, why stopped, NCT…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-gray-600">Disease area</label>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-600">Reason</label>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="">All</option>
            {reasons.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-600">Status</label>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-gray-600">Sort</label>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="updated_desc">Last update (newest)</option>
            <option value="updated_asc">Last update (oldest)</option>
            <option value="title_asc">Title (A→Z)</option>
            <option value="title_desc">Title (Z→A)</option>
            <option value="sponsor_asc">Sponsor (A→Z)</option>
            <option value="sponsor_desc">Sponsor (Z→A)</option>
            <option value="area_asc">Disease area (A→Z)</option>
            <option value="area_desc">Disease area (Z→A)</option>
          </select>
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-gray-600">Phase</label>
          <select
            className="mt-1 w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
          >
            <option value="">All</option>
            {phases.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-12">
          <button
            type="button"
            className="mt-1 inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {advancedOpen ? "Hide advanced" : "Show advanced"}
          </button>

          {advancedOpen && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-gray-600">Confidence (advanced)</label>
                <select
                  className="mt-1 w-full rounded-lg border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                >
                  <option value="">All</option>
                  {confidences.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-gray-500">
                  Confidence is derived from rule-based scoring of the “why stopped” text (evidence and negations).
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
