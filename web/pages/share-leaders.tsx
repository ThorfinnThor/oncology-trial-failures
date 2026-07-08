// web/pages/share-leaders.tsx
// Backwards-compatible redirect: "Share leaders" was renamed to "Top entities".

import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/top-entities",
      permanent: true,
    },
  };
};

export default function ShareLeadersRedirect() {
  return null;
}
