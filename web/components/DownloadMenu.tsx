import { useMemo, useState } from "react";
import { TrialIndexRow, UrlState, DatasetMeta } from "@/lib/types";
import { exportCSV, exportJSON } from "@/lib/export";

type Props = {
  meta: DatasetMeta | null;
  state: UrlState;
  rows: TrialIndexRow[]; // current filtered results (already applied)
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function DownloadMenu({ meta, state, rows }: Props) {
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    if (state.bio) return "Filtered results (likely scientific failure)";
    if (state.area?.length) return `Filtered results (${state.area.length} area${state.area.length > 1 ? "s" : ""})`;
    return "Filtered results";
  }, [state]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition border bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-2)]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Download
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow)] overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-semibold">Export</div>
            <div className="text-xs text-[var(--text-muted)]">{label}</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              {rows.length.toLocaleString()} rows
            </div>
          </div>

          <button
            role="menuitem"
            className={clsx(
              "w-full text-left px-4 py-3 text-sm font-semibold hover:bg-[var(--surface-2)]"
            )}
            onClick={() => {
              exportCSV(meta, state, rows);
              setOpen(false);
            }}
            type="button"
          >
            Download CSV
            <div className="text-xs font-normal text-[var(--text-muted)]">Includes metadata header</div>
          </button>

          <button
            role="menuitem"
            className={clsx(
              "w-full text-left px-4 py-3 text-sm font-semibold hover:bg-[var(--surface-2)] border-t border-[var(--border)]"
            )}
            onClick={() => {
              exportJSON(meta, state, rows);
              setOpen(false);
            }}
            type="button"
          >
            Download JSON
            <div className="text-xs font-normal text-[var(--text-muted)]">Includes metadata + records</div>
          </button>

          <button
            role="menuitem"
            className="w-full text-left px-4 py-3 text-sm font-semibold hover:bg-[var(--surface-2)] border-t border-[var(--border)]"
            onClick={() => setOpen(false)}
            type="button"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
