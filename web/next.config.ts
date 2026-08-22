/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.WORKERS_CI === "1"
    ? {}
    : {
        // /trial/[trialId] reads a computed shard path at runtime. Vercel needs
        // these assets explicitly traced into its serverless function. Cloudflare
        // serves the same files through the ASSETS binding instead.
        outputFileTracingIncludes: {
          "/trial/*": [
            "./public/trial-shards/**/*.json",
            "./public/trials-index.json",
            "./public/dataset_meta.json",
          ],
        },
      }),
  async redirects() {
    return [
      {
        source: "/insights/clinical-trial-prediction-markets-are-not-clinical-evidence",
        destination: "/insights/why-i-would-not-bet-on-clinical-trial-outcomes",
        permanent: true,
      },
      {
        source: "/insights/latest-stopped-clinical-trial-updates-two-week-review",
        destination: "/reports/latest-two-week-stopped-trial-updates",
        permanent: true,
      },
      {
        source: "/methodology",
        destination: "/methods",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
