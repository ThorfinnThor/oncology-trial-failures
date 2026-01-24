import { useMemo, useState } from "react";
import { DatasetMeta, TrialIndexRow, UrlState } from "@/lib/types";
import { downloadTrials, DownloadFormat, DownloadScope } from "@/lib/download";

export default function DownloadMenu({
  meta,
  state,
  allRows,
  filteredRows,
  selectedRows
}: {
  meta: DatasetMeta | null;
  state: UrlState;
  allRows: TrialIndexRow[];
  filteredRows: TrialIndexRow[];
  selectedRows: TrialIndexRow[];
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<DownloadScope>("filtered");
  const [format, setFormat] = useState<DownloadFormat>("csv");

  const rows = useMemo(() => {
    if (scope === "all") return allRows;
    if (scope === "selected") return selectedRows;
    return filteredRows;
  }, [scope, allRows, filteredRows, selectedRows]);

  function doDownload() {
    downloadTrials(meta, state, rows, scope, format);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button className="btn" type="button" onClick={() => setOpen((x) => !x)}>
        Download
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-[320px] card p-3 z-50"
          role="dialog"
          aria-label="Download menu"
        >
          <div className="text-sm font-semibold">Download</div>
          <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            Choose scope and format. ({rows.length.toLocaleString()} rows)
          </div>

          <div className="mt-3 space-y-3 text-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                Scope
              </div>

              <label className="flex items-center gap-2">
                <input type="radio" name="scope" checked={scope === "filtered"} onChange={() => setScope("filtered")} />
                Current filtered view
              </label>

              <label className="flex items-center gap-2 mt-2">
                <input type="radio" name="scope" checked={scope === "selected"} onChange={() => setScope("selected")} />
                Selected (compare)
                <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                  {selectedRows.length}
                </span>
              </label>

              <label className="flex items-center gap-2 mt-2">
                <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} />
                Everything
                <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
                  {allRows.length}
                </span>
              </label>
            </div>

            <div>
              <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
                Format
              </div>

              <label className="flex items-center gap-2">
                <input type="radio" name="format" checked={format === "csv"} onChange={() => setFormat("csv")} />
                CSV
              </label>

              <label className="flex items-center gap-2 mt-2">
                <input type="radio" name="format" checked={format === "json"} onChange={() => setFormat("json")} />
                JSON
              </label>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button className="btn-primary flex-1" type="button" onClick={doDownload} disabled={scope === "selected" && selectedRows.length === 0}>
                Download
              </button>
              <button className="btn" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            {scope === "selected" && selectedRows.length === 0 && (
              <div className="text-xs text-amber-700">
                Select 1+ rows using the checkbox column to enable “Selected”.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
