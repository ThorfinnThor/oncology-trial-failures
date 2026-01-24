import { UrlState, TrialRow } from "./types";
import { stateToQuery } from "./urlState";

export type ExportScope = "filtered" | "page" | "compare";

export type ExportMetadata = {
  exported_at_iso: string;
  dataset_version: string;
  scope: ExportScope;
  total_records_in_scope: number;
  url_query: Record<string, string>;
  filters: UrlState;
};

function escapeCsvCell(v: any) {
  const s = v === null || v === undefined ? "" : String(v);
  const needsQuotes = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function exportJSON(
  records: TrialRow[],
  meta: ExportMetadata
): string {
  return JSON.stringify({ metadata: meta, records }, null, 2);
}

export function exportCSV(
  records: TrialRow[],
  meta: ExportMetadata
): string {
  const columns: { key: keyof TrialRow; header: string }[] = [
    { key: "nct_id", header: "nct_id" },
    { key: "brief_title", header: "brief_title" },
    { key: "overall_status", header: "overall_status" },
    { key: "disease_area", header: "disease_area" },
    { key: "phases", header: "phases" },
    { key: "lead_sponsor", header: "lead_sponsor" },
    { key: "collaborators", header: "collaborators" },
    { key: "conditions", header: "conditions" },
    { key: "intervention_names", header: "intervention_names" },
    { key: "classification_label", header: "classification_label" },
    { key: "classification_reason", header: "classification_reason" },
    { key: "classification_confidence", header: "classification_confidence" },
    { key: "why_stopped", header: "why_stopped" },
    { key: "last_update_post_date", header: "last_update_post_date" },
    { key: "url", header: "url" },
  ];

  const metaLines = [
    `# exported_at_iso: ${meta.exported_at_iso}`,
    `# dataset_version: ${meta.dataset_version}`,
    `# scope: ${meta.scope}`,
    `# total_records_in_scope: ${meta.total_records_in_scope}`,
    `# url_query: ${JSON.stringify(meta.url_query)}`,
  ];

  const header = columns.map((c) => escapeCsvCell(c.header)).join(",");
  const lines = records.map((r) => columns.map((c) => escapeCsvCell((r as any)[c.key])).join(","));

  return [...metaLines, header, ...lines].join("\n");
}

export function downloadFile(filename: string, content: string, mime: string) {
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

export function buildExportMetadata(datasetVersion: string, state: UrlState, scope: ExportScope, count: number): ExportMetadata {
  const exported_at_iso = new Date().toISOString();
  const url_query = stateToQuery(state);
  return {
    exported_at_iso,
    dataset_version: datasetVersion,
    scope,
    total_records_in_scope: count,
    url_query,
    filters: state,
  };
}
