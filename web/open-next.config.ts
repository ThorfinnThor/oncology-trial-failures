import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Serve prerendered pages from the build's static assets instead of rendering them in the
// Worker on every request. With the default (dummy) cache every page was a MISS, and most
// pages load the full trial index (~36 MB of JSON), which exceeded the Worker memory limit.
// The data only changes with a deploy, so the read-only cache needs no revalidation; a page
// that is not prerendered (trial pages, new drug slugs) still renders in the Worker.
const config = defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});

// The Pages Router currently hits a Next.js 16 Turbopack runtime-loader issue
// in workerd. Keep Vercel's normal build unchanged and use Webpack only for the
// OpenNext/Cloudflare bundle.
config.buildCommand = "npm run build:cloudflare";

export default config;
