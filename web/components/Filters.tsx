type Props = {
  q: string;
  setQ: (v: string) => void;

  reason: string;
  setReason: (v: string) => void;
  confidence: string;
  setConfidence: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  phase: string;
  setPhase: (v: string) => void;

  sort: string;
  setSort: (v: string) => void;

  reasons: string[];
  confidences: string[];
  statuses: string[];
  phases: string[];
};

export function Filters(props: Props) {
  const {
    q, setQ,
    reason, setReason,
    confidence, setConfidence,
    status, setStatus,
    phase, setPhase,
    sort, setSort,
    reasons, confidences, statuses, phases,
  } = props;

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
        <div className="md:col-span-5">
          <label className="block text-xs font-medium text-gray-600">Search</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Title, sponsor, drug, why stopped, condition, NCT…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600">Reason</label>
          <select className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">All</option>
            {reasons.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600">Confidence</label>
          <select className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
            <option value="">All</option>
            {confidences.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600">Status</label>
          <select className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-1">
          <label className="block text-xs font-medium text-gray-600">Phase</label>
          <select className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="">All</option>
            {phases.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-12">
          <label className="block text-xs font-medium text-gray-600">Sort</label>
          <select className="mt-1 w-full rounded-md border px-2 py-2 text-sm" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="updated_desc">Last update (newest)</option>
            <option value="updated_asc">Last update (oldest)</option>
            <option value="title_asc">Title (A→Z)</option>
            <option value="title_desc">Title (Z→A)</option>
            <option value="sponsor_asc">Sponsor (A→Z)</option>
            <option value="sponsor_desc">Sponsor (Z→A)</option>
          </select>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500">
        This is a static dataset built at deploy time. No live API calls occur on page views.
      </div>
    </div>
  );
}
