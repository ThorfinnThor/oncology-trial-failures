import { DatasetMeta, TrialRow, WorkbenchState } from "./types";
import { buildShareURL } from "./urlState";

function nowISO() {
  return new Date().toISOString();
}

function safeFilename(s: string) {
  return (s || "export")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function downloadText(filename: string, content: string, mime: string) {
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

export function exportJSON(
  meta: DatasetMeta,
  state: WorkbenchState,
  records: TrialRow[],
  pathname: string,
  title: string
) {
  const payload = {
    metadata: {
      title,
      exported_at: nowISO(),
      dataset_version: meta.version,
      dataset_generated_at_utc: meta.generated_at_utc,
      source: meta.source,
      filters: state,
      url: buildShareURL(pathname, state),
      result_count: records.length,
    },
    records,
  };

  downloadText(`${safeFilename(title)}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}

export function exportCSV(
  meta: DatasetMeta,
  state: WorkbenchState,
  records: TrialRow[],
  pathname: string,
  title: string
) {
  const headerMeta = [
    `# title: ${title}`,
    `# exported_at: ${nowISO()}`,
    `# dataset_version: ${meta.version}`,
    `# dataset_generated_at_utc: ${meta.generated_at_utc}`,
    `# source: ${meta.source}`,
    `# url: ${buildShareURL(pathname, state)}`,
    `# filters: ${JSON.stringify(state)}`,
    `# result_count: ${records.length}`,
    "",
  ].join("\n");

  const cols: (keyof TrialRow)[] = [
    "nct_id","brief_title","overall_status","phases","disease_area","countries",
    "classification_reason","classification_label","classification_confidence",
    "lead_sponsor","collaborators","conditions","intervention_names","why_stopped",
    "last_update_post_date","url"
  ];

  const esc = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    const needs = /[",\n\r]/.test(s);
    const e = s.replace(/"/g, '""');
    return needs ? `"${e}"` : e;
  };

  const header = cols.join(",");
  const lines = records.map((r) => cols.map((c) => esc((r as any)[c])).join(","));
  const csv = headerMeta + header + "\n" + lines.join("\n");

  downloadText(`${safeFilename(title)}.csv`, csv, "text/csv;charset=utf-8");
}

export function buildViewTitle(state: WorkbenchState): string {
  const parts: string[] = ["Clinical trial failures"];
  if (state.bio) parts.push("likely biological failures");
  if (state.reason?.length) parts.push(`reason: ${state.reason.join("+")}`);
  if (state.phase?.length) parts.push(`phase: ${state.phase.join("+")}`);
  if (state.status?.length) parts.push(`status: ${state.status.join("+")}`);
  if (state.area?.length) parts.push(`area: ${state.area.join("+")}`);
  if (state.country?.length) parts.push(`country: ${state.country.join("+")}`);
  if (state.q) parts.push(`q: ${state.q}`);
  return parts.join(" — ");
}

export function buildCitation(meta: DatasetMeta, state: WorkbenchState, pathname: string): string {
  const title = buildViewTitle(state);
  const url = buildShareURL(pathname, state);
  return [
    `${title}.`,
    `Accessed ${new Date().toLocaleString()}.`,
    `Dataset version ${meta.version} (generated ${meta.generated_at_utc}).`,
    url,
  ].join(" ");
}
