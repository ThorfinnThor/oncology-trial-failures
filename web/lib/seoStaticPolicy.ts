export type StaticNoindexReason = "utility" | "thin_content";

export const STATIC_NOINDEX_DECISIONS = {
  "/explore": "utility",
  "/asset-check": "utility",
  "/newsletter": "utility",
  "/contact": "utility",
  "/sponsor-insights": "thin_content",
} as const satisfies Record<string, StaticNoindexReason>;

export type StaticNoindexPath = keyof typeof STATIC_NOINDEX_DECISIONS;

function hasStaticNoindexDecision(path: string): path is StaticNoindexPath {
  return Object.prototype.hasOwnProperty.call(STATIC_NOINDEX_DECISIONS, path);
}

export function staticRobotsForPath(path: string): "index,follow" | "noindex,follow" {
  return hasStaticNoindexDecision(path) ? "noindex,follow" : "index,follow";
}

export function includeStaticPathInSitemap(path: string): boolean {
  return !hasStaticNoindexDecision(path);
}
