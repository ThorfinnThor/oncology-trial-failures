import { DatasetMeta, TrialIndexRow, UrlState } from "./types";

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadTrialsCSV(meta: DatasetMeta | null, state: UrlState, rows: TrialIndexRow[]) {
  const headerMeta = [
    `# exported_at_utc=${new Date().toISOString()}`,
    `# dataset_version=${meta?.version || "unknown"}`,
    `# filters=${JSON.stringify(state)}`,
    `# total_rows=${rows.length}`,
  ].join("\n");

  const cols = [
    "nct_id",
    "brief_title",
    "overall_status",
    "phases",
    "disease_area",
    "lead_sponsor",
    "collaborators",
    "condition_first",
    "intervention_first",
    "why_stopped_short",
    "classification_label",
    "classification_reason",
    "classification_confidence",
    "classification_evidence",
    "last_update_post_date",
    "url",
  ];

  const esc = (v: any) => {
    const s = String(v ?? "");
    const needs = s.includes(",") || s.includes('"') || s.includes("\n");
    const out = s.replaceAll('"', '""');
    return needs ? `"${out}"` : out;
  };

  const body = [cols.join(",")]
    .concat(rows.map((r) => cols.map((c) => esc((r as any)[c])).join(",")))
    .join("\n");

  downloadBlob("trialfailures_export.csv", `${headerMeta}\n${body}`, "text/csv;charset=utf-8");
}

export function downloadTrialsJSON(meta: DatasetMeta | null, state: UrlState, rows: TrialIndexRow[]) {
  const payload = {
    metadata: {
      exported_at_utc: new Date().toISOString(),
      dataset_version: meta?.version || "unknown",
      filters: state,
      total_rows: rows.length,
    },
    records: rows,
  };
  downloadBlob("trialfailures_export.json", JSON.stringify(payload, null, 2), "application/json");
}
