import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

// The Pages Router currently hits a Next.js 16 Turbopack runtime-loader issue
// in workerd. Keep Vercel's normal build unchanged and use Webpack only for the
// OpenNext/Cloudflare bundle.
config.buildCommand = "npm run build:cloudflare";

export default config;
