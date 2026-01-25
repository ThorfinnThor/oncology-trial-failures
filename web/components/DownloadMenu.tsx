// web/components/DownloadMenu.tsx

import { useEffect, useMemo, useState } from "react";
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

  const scopeDisabled = scope === "selected" && selectedRows.length === 0;

  function doDownload() {
    downloadTrials(meta, state, rows, scope, format);
    setOpen(false);
  }

  // iOS: prevent background scroll + “invisible drawer” issues
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPos = document.body.style.position;
    const prevTop = document.body.style.top;

    // Lock body scroll without changing layout
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPos;
      document.body.style.top = prevTop;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

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
        userSelect: "none",
        padding: "8px 10px",
        borderRadius: 12
      }}
      onMouseEnter={(e) => ((e.currentTarget.style.background = "rgba(15,23,42,.03)"))}
      onMouseLeave={(e) => ((e.currentTarget.style.background = "transparent"))}
    >
      <input type="radio" checked={checked} onChange={onChange} />
      <span style={{ minWidth: 0, fontSize: 14, fontWeight: 650, color: "rgba(15,23,42,.92)" }}>{label}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
        {count.toLocaleString()}
      </span>
    </label>
  );

  return (
    <>
      <button className="btn" type="button" onClick={() => setOpen(true)}>
        Download
      </button>

      {open && (
        // Same structure/classes as DetailsDrawer (“Open panel”)
        <div className="drawer-wrap" role="dialog" aria-modal="true" aria-label="Download trials">
          <div className="overlay" onClick={() => setOpen(false)} />

          <div className="drawer-panel">
            <div className="drawer-hd">
              <div style={{ minWidth: 0 }}>
                <div className="muted" style={{ fontSize: 12 }}>
                  Download
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>
                  Export trials
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  Choose scope and format.{" "}
                  <span style={{ fontWeight: 800 }}>{rows.length.toLocaleString()}</span> rows.
                </div>
              </div>

              <button className="btn" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            <div className="drawer-bd">
              <div className="card p-4">
                <div className="facet-title">Scope</div>

                <OptionRow
                  checked={scope === "filtered"}
                  onChange={() => setScope("filtered")}
                  label="Current filtered view"
                  count={filteredRows.length}
                />

                <OptionRow
                  checked={scope === "selected"}
                  onChange={() => setScope("selected")}
                  label="Selected (compare)"
                  count={selectedRows.length}
                />

                <OptionRow
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  label="Everything"
                  count={allRows.length}
                />

                {scope === "selected" && selectedRows.length === 0 && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#b45309" }}>
                    Select 1+ rows using the “Sel” checkbox column to enable “Selected”.
                  </div>
                )}
              </div>

              <div style={{ height: 14 }} />

              <div className="card p-4">
                <div className="facet-title">Format</div>

                <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, cursor: "pointer" }}>
                  <input type="radio" checked={format === "csv"} onChange={() => setFormat("csv")} />
                  <span style={{ fontSize: 14, fontWeight: 650, color: "rgba(15,23,42,.92)" }}>CSV</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 12, cursor: "pointer" }}>
                  <input type="radio" checked={format === "json"} onChange={() => setFormat("json")} />
                  <span style={{ fontSize: 14, fontWeight: 650, color: "rgba(15,23,42,.92)" }}>JSON</span>
                </label>
              </div>

              <div style={{ height: 14 }} />

              <div className="card p-4">
                <div className="facet-title">What you will get</div>
                <div className="muted" style={{ fontSize: 13, lineHeight: 1.45 }}>
                  Exports include the displayed fields (title, phase, sponsor, disease area, inferred reason bucket, and stop reason).
                  For “Selected”, the export uses your checkbox selection.
                </div>

                {meta?.version ? (
                  <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                    Dataset version: <span style={{ color: "var(--text)", fontWeight: 800 }}>{meta.version}</span>
                    {meta.source ? (
                      <>
                        {" "}• Source: <span style={{ color: "var(--text)", fontWeight: 800 }}>{meta.source}</span>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div style={{ height: 14 }} />

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-primary" type="button" onClick={doDownload} disabled={scopeDisabled} style={{ flex: 1 }}>
                  Download
                </button>
                <button className="btn" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>

              <div className="note">
                Tip: “Everything” exports all {allRows.length.toLocaleString()} trials and may be a large download.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
