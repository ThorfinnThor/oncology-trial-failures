/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
