import { TrialRow } from "./types";

/**
 * Convert rows to CSV using a stable column order.
 * This is deliberately simple and robust (no external deps).
 */
export function trialsToCSV(rows: TrialRow[]): string {
  const columns: { key: keyof TrialRow; header: string }[] = [
    { key: "nct_id", header: "nct_id" },
    { key: "brief_title", header: "brief_title" },
    { key: "overall_status", header: "overall_status" },
    { key: "disease_area", header: "disease_area" },
    { key: "classification_label", header: "classification_label" },
    { key: "classification_reason", header: "classification_reason" },
    { key: "classification_confidence", header: "classification_confidence" },
    { key: "lead_sponsor", header: "lead_sponsor" },
    { key: "collaborators", header: "collaborators" },
    { key: "conditions", header: "conditions" },
    { key: "mesh_terms", header: "mesh_terms" },
    { key: "intervention_names", header: "intervention_names" },
    { key: "intervention_types", header: "intervention_types" },
    { key: "phases", header: "phases" },
    { key: "why_stopped", header: "why_stopped" },
    { key: "last_update_post_date", header: "last_update_post_date" },
    { key: "url", header: "url" },
  ];

  const escape = (value: any) => {
    const s = value === null || value === undefined ? "" : String(value);
    // Escape quotes and wrap in quotes if needed
    const needsQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const headerLine = columns.map((c) => escape(c.header)).join(",");
  const lines = rows.map((r) => columns.map((c) => escape((r as any)[c.key])).join(","));
  return [headerLine, ...lines].join("\n");
};

export function downloadTextFile(filename: string, content: string, mime: string) {
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

export function downloadTrialsCSV(filename: string, rows: TrialRow[]) {
  const csv = trialsToCSV(rows);
  downloadTextFile(filename, csv, "text/csv;charset=utf-8");
}

export function downloadTrialsJSON(filename: string, rows: TrialRow[]) {
  const json = JSON.stringify(rows, null, 2);
  downloadTextFile(filename, json, "application/json;charset=utf-8");
}
