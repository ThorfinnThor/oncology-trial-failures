import { SortKey, UrlState } from "@/lib/types";

function chipLabel(k: string, v: string | string[]) {
  const val = Array.isArray(v) ? (v.length > 3 ? `${v.length} selected` : v.join(", ")) : v;
  return `${k}: ${val}`;
}

function Chip({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
      onClick={onRemove}
      aria-label={`Remove ${text}`}
    >
      {text}
      <span aria-hidden="true" className="text-[var(--text-muted)]">×</span>
    </button>
  );
}

type Props = {
  state: UrlState;
  setState: (next: UrlState) => void;

  resultsCount: number;

  sort: SortKey;
  setSort: (s: SortKey) => void;

  onCopyLink: () => void;
  onExport: () => void;
  onReset: () => void;
};

export function QuerySummaryBar({ state, setState, resultsCount, sort, setSort, onCopyLink, onExport, onReset }: Props) {
  const chips: { key: string; value: string | string[]; remove: () => void }[] = [];

  if (state.bio) chips.push({ key: "Likely scientific failure", value: "On", remove: () => setState({ ...state, bio: false }) });
  if (state.q) chips.push({ key: "Search", value: state.q, remove: () => setState({ ...state, q: "" }) });
  if (state.status?.length) chips.push({ key: "Status", value: state.status, remove: () => setState({ ...state, status: [] }) });
  if (state.phase?.length) chips.push({ key: "Phase", value: state.phase, remove: () => setState({ ...state, phase: [] }) });
  if (state.area?.length) chips.push({ key: "Area", value: state.area, remove: () => setState({ ...state, area: [] }) });
  if (state.bucket?.length) chips.push({ key: "Reason", value: state.bucket as any, remove: () => setState({ ...state, bucket: [] }) });
  if (state.sponsor?.length) chips.push({ key: "Sponsor", value: state.sponsor, remove: () => setState({ ...state, sponsor: [] }) });
  if (state.intervention?.length) chips.push({ key: "Intervention", value: state.intervention, remove: () => setState({ ...state, intervention: [] }) });
  if (state.condition?.length) chips.push({ key: "Condition", value: state.condition, remove: () => setState({ ...state, condition: [] }) });
  if (state.date_from) chips.push({ key: "From", value: state.date_from, remove: () => setState({ ...state, date_from: "" }) });
  if (state.date_to) chips.push({ key: "To", value: state.date_to, remove: () => setState({ ...state, date_to: "" }) });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {chips.length ? chips.map((c, idx) => (
            <Chip key={`${c.key}-${idx}`} text={chipLabel(c.key, c.value)} onRemove={c.remove} />
          )) : (
            <div className="text-sm text-[var(--text-muted)]">No filters applied.</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="text-sm font-semibold text-[var(--text)]" aria-live="polite">
            {resultsCount.toLocaleString()} results
          </div>

          <label className="text-xs font-semibold text-[var(--text)]">
            Sort{" "}
            <select
              className="ml-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              <option value="date_desc">Date (newest)</option>
              <option value="date_asc">Date (oldest)</option>
              <option value="sponsor_asc">Sponsor (A→Z)</option>
              <option value="sponsor_desc">Sponsor (Z→A)</option>
              <option value="phase_asc">Phase (A→Z)</option>
              <option value="phase_desc">Phase (Z→A)</option>
              <option value="confidence_desc">Confidence (high→low)</option>
              <option value="confidence_asc">Confidence (low→high)</option>
            </select>
          </label>

          <button className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]" onClick={onCopyLink} type="button">
            Copy link
          </button>
          <button className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]" onClick={onExport} type="button">
            Export
          </button>
          <button className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]" onClick={onReset} type="button">
            Reset all
          </button>
        </div>
      </div>
    </div>
  );
}
