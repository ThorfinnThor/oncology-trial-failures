// web/pages/pharma-intelligence.tsx
// Backwards-compatible redirect: "Pharma intelligence" was renamed to "Overview".

import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/overview",
      permanent: true,
    },
  };
};

export default function PharmaIntelligenceRedirect() {
  return null;
}
