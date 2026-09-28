// The one evidence package published in full (scripts/signals/build_evidence_catalog.py writes
// it to public/samples/ with every release). The fallback covers a catalogue built before the
// catalogue carried the field: the file path and the cohort do not change between releases.
import catalogue from "@/data/evidence_catalogue.json";

type Sample = { slug: string; cohort: string; asset: string; path: string };

export const SAMPLE_PACKAGE: Sample = {
  slug: "oncology-tgf-pd-l-1",
  cohort: "TGF-β + PD-(L)1",
  asset: "Fresolimumab",
  path: "/samples/evidence-package-sample.html",
  ...(((catalogue as unknown as { sample?: Sample | null }).sample) || {}),
};
