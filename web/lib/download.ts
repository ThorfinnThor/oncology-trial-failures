import { DatasetMeta, TrialIndexRow, UrlState } from "./types";

export type DownloadScope = "all" | "filtered" | "selected";
export type DownloadFormat = "csv" | "json";

function nowIso() {
  return new Date().toISOString();
}

function safe(s: any) {
  return (s ?? "").toString();
}

function csvEscape(s: string) {
  const t = safe(s);
  if (t.includes('"') || t.includes(",") || t.includes("\n")) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function buildMetadata(meta: DatasetMeta | null, state: UrlState, count: number) {
  return {
    exported_at_utc: nowIso(),
    dataset: meta?.version || "Unknown dataset",
    source: meta?.source || "Unknown",
    filters: state,
    result_count: count
  };
}

function downloadBlob(filename: string, mime: string, content: string) {
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

export function downloadTrials(
  meta: DatasetMeta | null,
  state: UrlState,
  rows: TrialIndexRow[],
  scope: DownloadScope,
  format: DownloadFormat
) {
  const md = buildMetadata(meta, state, rows.length);

  const baseName =
    scope === "all"
      ? "all_trials"
      : scope === "filtered"
      ? "filtered_trials"
      : "selected_trials";

  if (format === "json") {
    const payload = { metadata: md, records: rows };
    downloadBlob(`${baseName}.json`, "application/json;charset=utf-8", JSON.stringify(payload, null, 2));
    return;
  }

  // CSV (metadata as commented header lines)
  const header = [
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
    "url"
  ];

  const metaLines = [
    `# exported_at_utc: ${md.exported_at_utc}`,
    `# dataset: ${md.dataset}`,
    `# source: ${md.source}`,
    `# result_count: ${md.result_count}`,
    `# filters: ${JSON.stringify(md.filters)}`
  ].join("\n");

  const lines = rows.map((r) =>
    header
      .map((k) => csvEscape((r as any)[k]))
      .join(",")
  );

  const csv = `${metaLines}\n${header.join(",")}\n${lines.join("\n")}`;
  downloadBlob(`${baseName}.csv`, "text/csv;charset=utf-8", csv);
}
