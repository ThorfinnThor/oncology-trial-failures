// Worker entry (wrangler.jsonc "main"): the OpenNext worker, with browser caching fixed for HTML.
// Everything else, including the Durable Object classes OpenNext exports, passes through unchanged.
import handler from "./.open-next/worker.js";
import { withBrowserHtmlCache } from "./worker-html-cache.mjs";

export * from "./.open-next/worker.js";

const worker = {
  ...handler,
  async fetch(request, env, ctx) {
    return withBrowserHtmlCache(await handler.fetch(request, env, ctx));
  },
};

export default worker;
