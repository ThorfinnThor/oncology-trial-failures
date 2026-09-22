/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /trial/[trialId] reads a computed shard path at runtime. Explicitly include
  // only these data assets in that route's server trace so the runtime can
  // serve small shards without falling back to the full dataset.
  outputFileTracingIncludes: {
    "/trial/*": [
      "./public/trial-shards/**/*.json",
      "./public/trials-index-shards/**/*.json",
      "./public/dataset_meta.json",
    ],
  },
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
      {
        // The nav has said Pricing for a while; the URL and the browser tab still said
        // Data & licensing. Google has the old path indexed, so it redirects rather than 404s.
        source: "/data-licensing",
        destination: "/pricing",
        permanent: true,
      },
      {
        source: "/oncology-clinical-trial-failures",
        destination: "/failures/oncology",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
