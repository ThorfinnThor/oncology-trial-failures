import { useMemo, useState } from "react";
import { TrialIndexRow, DatasetMeta, UrlState } from "@/lib/types";
import { downloadTrialsCSV, downloadTrialsJSON } from "@/lib/download";

type Props = {
  meta: DatasetMeta | null;
  state: UrlState;
  rows: TrialIndexRow[]; // current filtered + sorted rows
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function DownloadMenu({ meta, state, rows }: Props) {
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    const n = rows.length;
    if (n === 0) return "Export";
    if (n === 1) return "Export (1 result)";
    return `Export (${n.toLocaleString()} results)`;
  }, [rows.length]);

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition border bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-2)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {label}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)] overflow-hidden z-20"
        >
          <button
            role="menuitem"
            className={clsx(
              "w-full text-left px-4 py-3 text-sm hover:bg-[var(--surface-2)]",
              "border-b border-[var(--border)]"
            )}
            onClick={() => {
              downloadTrialsCSV(meta, state, rows);
              setOpen(false);
            }}
            type="button"
          >
            Download CSV (this view)
            <div className="text-xs text-[var(--text-muted)] mt-1">Includes filters + dataset version.</div>
          </button>

          <button
            role="menuitem"
            className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--surface-2)]"
            onClick={() => {
              downloadTrialsJSON(meta, state, rows);
              setOpen(false);
            }}
            type="button"
          >
            Download JSON (this view)
            <div className="text-xs text-[var(--text-muted)] mt-1">Metadata + records.</div>
          </button>
        </div>
      )}
    </div>
  );
}
