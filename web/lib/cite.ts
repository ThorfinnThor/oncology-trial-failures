import { DatasetMeta, UrlState } from "./types";
import { encodeState } from "./urlState";

/**
 * Build a shareable URL for the current view.
 * - In the browser, pass baseUrl = window.location.origin
 * - In SSR, pass your known origin (or empty string and it will return a path-only URL)
 */
export function buildShareUrl(state: UrlState, baseUrl: string, path = "/explore"): string {
  const qs = encodeState(state);
  if (!baseUrl) return `${path}${qs}`;
  return `${baseUrl}${path}${qs}`;
}

function titleFromState(state: UrlState): string {
  const parts: string[] = ["Clinical trial failures"];
  if (state.bio) parts.push("Likely scientific failure");
  if (state.bucket?.length) parts.push(`Reason: ${state.bucket.length > 2 ? `${state.bucket.length} selected` : state.bucket.join(", ")}`);
  if (state.area?.length) parts.push(`Area: ${state.area.length > 2 ? `${state.area.length} selected` : state.area.join(", ")}`);
  if (state.phase?.length) parts.push(`Phase: ${state.phase.join(", ")}`);
  if (state.status?.length) parts.push(`Status: ${state.status.join(", ")}`);
  if (state.q) parts.push(`Query: "${state.q}"`);
  return parts.join(" — ");
}

/**
 * Returns a copy-ready citation block for the view.
 */
export function buildCitation(meta: DatasetMeta | null, state: UrlState, shareUrl: string): string {
  const title = titleFromState(state);
  const accessed = new Date().toISOString();
  const version = meta?.version || "unknown";
  return `${title}\nAccessed: ${accessed}\nDataset version: ${version}\nURL: ${shareUrl}`;
}
