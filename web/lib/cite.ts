import { DatasetMeta, UrlState } from "./types";
import { buildShareUrl } from "./urlState";

function titleFromState(state: UrlState): string {
  const parts: string[] = ["Clinical trial failures"];

  if (state.bio) parts.push("likely biological failures");
  if (state.phase?.length) parts.push(`Phase ${state.phase.join(", ")}`);
  if (state.bucket?.length) parts.push(`Reason: ${state.bucket.join(", ")}`);
  if (state.area?.length) parts.push(`Area: ${state.area.join(", ")}`);
  if (state.status?.length) parts.push(`Status: ${state.status.join(", ")}`);

  return parts.join(" — ");
}

export function citeThisView(meta: DatasetMeta, state: UrlState, baseUrl: string): string {
  const viewTitle = titleFromState(state);
  const now = new Date().toISOString();
  const url = buildShareUrl(baseUrl, state);

  return [
    viewTitle,
    `Accessed: ${now}`,
    `Dataset version: ${meta.version} (generated ${meta.generated_at_utc})`,
    `Source: ${meta.source}`,
    `URL: ${url}`,
    "",
    "Note: Labels are inferred from registry text and may be incomplete. Verify with primary sources.",
  ].join("\n");
}
