import { WorkbenchState } from "@/lib/types";

type Props = {
  state: WorkbenchState;
  resultCount: number;
  onRemove: (patch: Partial<WorkbenchState>) => void;
  onCopyLink: () => void;
  onExport: () => void;
  onCite: () => void;
  onReset: () => void;
  sort: string;
  setSort: (v: string) => void;
};

function chip(label: string, onRemove: () => void) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
      onClick={onRemove}
    >
      {label}
      <span aria-hidden className="text-gray-400">×</span>
    </button>
  );
}

export function QuerySummaryBar({
  state, resultCount, onRemove, onCopyLink, onExport, onCite, onReset, sort, setSort
}: Props) {
  const chips: JSX.Element[] = [];

  if (state.q) chips.push(chip(`Search: ${state.q}`, () => onRemove({ q: undefined })));
  if (state.bio) chips.push(chip("Likely biological failures", () => onRemove({ bio: undefined })));

  const mkMulti = (name: string, key: keyof WorkbenchState) => {
    const v = state[key] as string[] | undefined;
    if (!v?.length) return;
    const label = v.length === 1 ? `${name}: ${v[0]}` : `${name}: ${v.length} selected`;
    chips.push(chip(label, () => onRemove({ [key]: undefined } as any)));
  };

  mkMulti("Phase", "phase");
  mkMulti("Status", "status");
  mkMulti("Area", "area");
  mkMulti("Country", "country");
  mkMulti("Reason", "reason" as any);
  mkMulti("Condition", "condition");
  mkMulti("Intervention", "intervention");
  mkMulti("Sponsor", "sponsor");

  if (state.date_from) chips.push(chip(`From: ${state.date_from}`, () => onRemove({ date_from: undefined })));
  if (state.date_to) chips.push(chip(`To: ${state.date_to}`, () => onRemove({ date_to: undefined })));

  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-semibold text-gray-900" aria-live="polite">
            {resultCount.toLocaleString()} results
          </div>
          {chips.length ? <div className="flex flex-wrap gap-2">{chips}</div> : (
            <div className="text-xs text-gray-500">No filters applied.</div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">Sort</label>
          <select
            className="rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="date_desc">Last update (newest)</option>
            <option value="date_asc">Last update (oldest)</option>
            <option value="sponsor_asc">Sponsor (A→Z)</option>
            <option value="sponsor_desc">Sponsor (Z→A)</option>
            <option value="phase_asc">Phase (A→Z)</option>
            <option value="phase_desc">Phase (Z→A)</option>
            <option value="confidence_desc">Confidence (high→low)</option>
            <option value="confidence_asc">Confidence (low→high)</option>
          </select>

          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50" onClick={onCopyLink} type="button">
            Copy link
          </button>
          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50" onClick={onExport} type="button">
            Export
          </button>
          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50" onClick={onCite} type="button">
            Cite
          </button>
          <button className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800" onClick={onReset} type="button">
            Reset all
          </button>
        </div>
      </div>
    </div>
  );
}
