// Browser caching for HTML from the Worker (see worker-entry.mjs).
//
// Prerendered pages come out of OpenNext with "s-maxage=31536000, stale-while-revalidate=2592000".
// s-maxage is meant for shared caches, but browsers that honour stale-while-revalidate (Firefox)
// then show a stored copy of the page for up to 30 days and refresh it in the background. After a
// deploy that stored copy points at script files that no longer exist, and the page never starts
// (the atlas stayed on its loading screen). Browsers get revalidated HTML instead.

export const BROWSER_HTML_CACHE_CONTROL = "public, max-age=0, must-revalidate";

/** The response with browser-safe caching if it is HTML that carries shared-cache directives. */
export function withBrowserHtmlCache(response) {
  const type = response.headers.get("content-type") || "";
  const cache = response.headers.get("cache-control") || "";
  if (!type.toLowerCase().startsWith("text/html")) return response;
  if (!/s-maxage|stale-while-revalidate/i.test(cache)) return response;
  const out = new Response(response.body, response);
  out.headers.set("cache-control", BROWSER_HTML_CACHE_CONTROL);
  return out;
}
