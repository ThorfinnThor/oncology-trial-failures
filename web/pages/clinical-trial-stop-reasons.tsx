import type { GetStaticProps } from "next";

import DataReferencePage from "@/components/DataReferencePage";
import { buildReferencePage, type ReferencePageProps } from "@/lib/seoReferenceData";

export const getStaticProps: GetStaticProps<ReferencePageProps> = async () => {
  const { loadIndexServer, loadMetaServer } = await import("@/lib/server-data");
  const [rows, meta] = await Promise.all([loadIndexServer(), loadMetaServer()]);
  return { props: buildReferencePage("reason", rows, meta) };
};

export default DataReferencePage;
