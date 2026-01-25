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

function isIOSLike() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPadOS 13+ can report as Mac; use touchpoints heuristic.
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  return iOS || iPadOS;
}

/**
 * Trigger a file download.
 *
 * Notes on mobile Safari (iOS):
 * - `a[download]` + blob URLs are unreliable and sometimes no-op.
 * - The most robust UX is using Web Share API (when available) to hand off a real file.
 * - Fallback is opening the blob URL in a new tab (user can then share/save).
 */
async function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });

  // Best-effort: Web Share (iOS/Android) when supported.
  try {
    const navAny = navigator as any;
    if (navAny?.share && typeof File !== "undefined") {
      const file = new File([blob], filename, { type: mime });
      if (!navAny.canShare || navAny.canShare({ files: [file] })) {
        await navAny.share({ files: [file], title: filename });
        return;
      }
    }
  } catch {
    // If the user cancels share, fall back to the traditional flow.
  }

  const url = URL.createObjectURL(blob);

  // iOS Safari: open in a new tab as a reliable fallback.
  // Other browsers: attempt a standard download via <a download>.
  const a = document.createElement("a");
  a.href = url;
  a.style.display = "none";
  a.rel = "noopener";

  if (isIOSLike()) {
    a.target = "_blank";
    // `download` is often ignored on iOS, but harmless.
    a.download = filename;
  } else {
    a.download = filename;
  }

  document.body.appendChild(a);
  a.click();
  a.remove();

  // Do NOT revoke immediately; mobile browsers can cancel the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function downloadTrials(
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
    await downloadBlob(`${baseName}.json`, "application/json;charset=utf-8", JSON.stringify(payload, null, 2));
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
  await downloadBlob(`${baseName}.csv`, "text/csv;charset=utf-8", csv);
}
