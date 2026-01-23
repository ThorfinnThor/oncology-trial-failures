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

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-wide text-gray-600 uppercase">{label}</label>
      <select
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </div>
  );
}

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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Search */}
        <div className="lg:col-span-6">
          <label className="block text-[11px] font-semibold tracking-wide text-gray-600 uppercase">Search</label>
          <input
            className="mt-1 w-full rounded-xl border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            placeholder="Search trials, sponsors, collaborators, drugs, conditions, NCT…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="mt-1 text-xs text-gray-500">
            Tip: try a drug name, company, NCT ID, or a disease keyword.
          </div>
        </div>

        {/* Primary filters */}
        <div className="lg:col-span-3">
          <Select label="Disease area" value={area} onChange={setArea}>
            <option value="">All areas</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </Select>
        </div>

        <div className="lg:col-span-3">
          <Select label="Stop reason" value={reason} onChange={setReason}>
            <option value="">All reasons</option>
            {reasons.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        </div>

        <div className="lg:col-span-3">
          <Select label="Status" value={status} onChange={setStatus}>
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>

        <div className="lg:col-span-3">
          <Select label="Phase" value={phase} onChange={setPhase}>
            <option value="">All phases</option>
            {phases.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </div>

        <div className="lg:col-span-3">
          <Select label="Sort" value={sort} onChange={setSort}>
            <option value="updated_desc">Last update (newest)</option>
            <option value="updated_asc">Last update (oldest)</option>
            <option value="title_asc">Title (A→Z)</option>
            <option value="title_desc">Title (Z→A)</option>
            <option value="sponsor_asc">Sponsor (A→Z)</option>
            <option value="sponsor_desc">Sponsor (Z→A)</option>
            <option value="area_asc">Disease area (A→Z)</option>
            <option value="area_desc">Disease area (Z→A)</option>
          </Select>
        </div>

        {/* Advanced */}
        <div className="lg:col-span-12">
          <button
            type="button"
            className="inline-flex items-center rounded-xl border bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            {advancedOpen ? "Hide advanced options" : "Show advanced options"}
          </button>

          {advancedOpen && (
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Select label="Confidence (advanced)" value={confidence} onChange={setConfidence}>
                  <option value="">All</option>
                  {confidences.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <div className="mt-1 text-xs text-gray-500">
                  Confidence indicates how strongly the stop-reason text supports the label.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
