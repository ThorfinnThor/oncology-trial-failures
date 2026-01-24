import { DatasetMeta, TrialIndexRow, UrlState } from "./types";
import { encodeState } from "./urlState";

export type ExportScope = "filtered" | "page" | "compare";

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

export function buildViewTitle(state: UrlState): string {
  const parts: string[] = ["Clinical trial failures"];
  if (state.bio) parts.push("Likely scientific failure");
  if (state.bucket?.length) parts.push(`Reason: ${state.bucket.length > 2 ? `${state.bucket.length} selected` : state.bucket.join(", ")}`);
  if (state.area?.length) parts.push(`Area: ${state.area.length > 2 ? `${state.area.length} selected` : state.area.join(", ")}`);
  if (state.phase?.length) parts.push(`Phase: ${state.phase.join(", ")}`);
  if (state.status?.length) parts.push(`Status: ${state.status.join(", ")}`);
  if (state.q) parts.push(`Query: "${state.q}"`);
  return parts.join(" — ");
}

export function buildShareUrl(state: UrlState, baseUrl: string, path = "/explore"): string {
  const qs = encodeState(state);
  if (!baseUrl) return `${path}${qs}`;
  return `${baseUrl}${path}${qs}`;
}

export function exportCSV(meta: DatasetMeta | null, state: UrlState, rows: TrialIndexRow[], filename = "trialfailures_export.csv") {
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

  downloadBlob(filename, `${headerMeta}\n${body}`, "text/csv;charset=utf-8");
}

export function exportJSON(meta: DatasetMeta | null, state: UrlState, rows: TrialIndexRow[], filename = "trialfailures_export.json") {
  const payload = {
    metadata: {
      exported_at_utc: new Date().toISOString(),
      dataset_version: meta?.version || "unknown",
      filters: state,
      total_rows: rows.length,
    },
    records: rows,
  };
  downloadBlob(filename, JSON.stringify(payload, null, 2), "application/json");
}

export function buildCitation(meta: DatasetMeta | null, state: UrlState, shareUrl: string): string {
  const title = buildViewTitle(state);
  const accessed = new Date().toISOString();
  const version = meta?.version || "unknown";
  return `${title}\nAccessed: ${accessed}\nDataset version: ${version}\nURL: ${shareUrl}`;
}
