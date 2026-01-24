// web/components/DownloadMenu.tsx

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

  const scopeDisabled = scope === "selected" && selectedRows.length === 0;

  const OptionRow = ({
    checked,
    onChange,
    label,
    count
  }: {
    checked: boolean;
    onChange: () => void;
    label: string;
    count: number;
  }) => (
    <label
      style={{
        display: "grid",
        gridTemplateColumns: "18px 1fr auto",
        alignItems: "center",
        gap: 10,
        width: "100%",
        cursor: "pointer",
        userSelect: "none"
      }}
    >
      <input type="radio" checked={checked} onChange={onChange} />
      <span style={{ minWidth: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
        {count.toLocaleString()}
      </span>
    </label>
  );

  return (
    <div className="relative">
      <button className="btn" type="button" onClick={() => setOpen((x) => !x)}>
        Download
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 card p-3 z-50"
          style={{ width: 420 }} // wider so options never collide
          role="dialog"
          aria-label="Download menu"
        >
          <div style={{ fontSize: 14, fontWeight: 800 }}>Download</div>
          <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Choose scope and format. ({rows.length.toLocaleString()} rows)
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="facet-title" style={{ marginBottom: 8 }}>
              Scope
            </div>

            <OptionRow
              checked={scope === "filtered"}
              onChange={() => setScope("filtered")}
              label="Current filtered view"
              count={filteredRows.length}
            />

            <div style={{ height: 8 }} />

            <OptionRow
              checked={scope === "selected"}
              onChange={() => setScope("selected")}
              label="Selected (compare)"
              count={selectedRows.length}
            />

            <div style={{ height: 8 }} />

            <OptionRow
              checked={scope === "all"}
              onChange={() => setScope("all")}
              label="Everything"
              count={allRows.length}
            />

            {scope === "selected" && selectedRows.length === 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#b45309" }}>
                Select 1+ rows using the checkbox column to enable “Selected”.
              </div>
            )}
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="facet-title" style={{ marginBottom: 8 }}>
              Format
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" checked={format === "csv"} onChange={() => setFormat("csv")} />
              <span>CSV</span>
            </label>

            <div style={{ height: 8 }} />

            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="radio" checked={format === "json"} onChange={() => setFormat("json")} />
              <span>JSON</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="btn-primary" type="button" onClick={doDownload} disabled={scopeDisabled} style={{ flex: 1 }}>
              Download
            </button>
            <button className="btn" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
