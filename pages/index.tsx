// web/pages/index.tsx

import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/explore",
      permanent: false,
    },
  };
};

export default function Index() {
  // This component never renders because of the server-side redirect.
  return null;
}
