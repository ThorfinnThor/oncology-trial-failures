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
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ sometimes reports as Mac; touchpoints heuristic
  const iPadOS = navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1;
  return iOS || iPadOS;
}

async function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });

  // Best mobile UX when available: Web Share with a File
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
    // If user cancels share or it fails, continue to fallback below
  }

  const url = URL.createObjectURL(blob);

  // iOS Safari: <a download> is unreliable. Opening the blob URL is more consistent.
  if (isIOSLike()) {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    if (!w) {
      // If popup blocked, navigate current tab
      window.location.href = url;
    }

    // Do NOT revoke immediately (can break open on slower devices)
    window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    return;
  }

  // Desktop + most non-iOS mobile browsers
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Do NOT revoke immediately; can cancel downloads on some mobile browsers
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
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
    header.map((k) => csvEscape((r as any)[k])).join(",")
  );

  const csv = `${metaLines}\n${header.join(",")}\n${lines.join("\n")}`;
  await downloadBlob(`${baseName}.csv`, "text/csv;charset=utf-8", csv);
}
