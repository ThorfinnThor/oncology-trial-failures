import Link from "next/link";

import DatasetPageShell, { DatasetNextSteps } from "@/components/DatasetPageShell";
import { DATASETS, HF_URL, RELEASE, SITE_URL, ZENODO_URL, datasetJsonLd } from "@/lib/datasets";

const TITLE = "Clinical trial failure datasets and free samples | Clinical Trial Failures";
const DESCRIPTION =
  "Datasets of stopped clinical trials from ClinicalTrials.gov: labelled by why they stopped, by posted primary results, and oncology failure signals with drug and target context. Free samples as CSV.";
const CANONICAL = `${SITE_URL}/datasets`;

export default function DatasetsPage() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "DataCatalog",
      name: "Clinical Trial Failures datasets",
      description: DESCRIPTION,
      url: CANONICAL,
      publisher: { "@type": "Organization", name: "Clinical Trial Failures", url: SITE_URL },
      dataset: DATASETS.map(datasetJsonLd),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Datasets", item: CANONICAL },
      ],
    },
  ];
  return (
    <DatasetPageShell title={TITLE} description={DESCRIPTION} canonical={CANONICAL} jsonLd={jsonLd}>
      <section className="card p-4" style={{ maxWidth: 920, margin: "0 auto" }}>
        <p className="facet-title">Datasets · release {RELEASE}</p>
        <h1 style={{ margin: "0 0 12px", fontSize: 30, lineHeight: 1.15 }}>Stopped clinical trials, labelled. Free samples to download.</h1>
        <p className="muted" style={{ fontSize: 16, lineHeight: 1.7, margin: 0 }}>
          Three datasets built from ClinicalTrials.gov and rebuilt every week. Each has a free sample you can download right here,
          without a form, a data dictionary, and the validation behind its labels.
        </p>
      </section>

      {DATASETS.map((d) => (
        <section key={d.slug} className="card p-4" style={{ maxWidth: 920, margin: "16px auto 0" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>
            <Link className="link" href={`/datasets/${d.slug}`}>
              {d.name}
            </Link>
          </h2>
          <p className="muted" style={{ lineHeight: 1.6, margin: "0 0 8px" }}>
            {d.short}
          </p>
          <p style={{ margin: "0 0 10px", lineHeight: 1.6 }}>{d.size}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <a className="btn btn-primary" href={d.downloads[0].href} download>
              {d.downloads[0].label}
            </a>
            <Link className="btn" href={`/datasets/${d.slug}`}>
              What is in it
            </Link>
          </div>
        </section>
      ))}

      <section className="card p-4" style={{ maxWidth: 920, margin: "16px auto 0" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Also on Hugging Face and Zenodo</h2>
        <p className="muted" style={{ lineHeight: 1.7, margin: 0 }}>
          The labelled sample is on{" "}
          <a className="link" href={HF_URL} rel="noopener">
            Hugging Face
          </a>{" "}
          (loadable with the datasets library, pandas or Polars), and archived releases are citable on{" "}
          <a className="link" href={ZENODO_URL} rel="noopener">
            Zenodo
          </a>
          . How the labels are checked:{" "}
          <Link className="link" href="/validation">
            validation
          </Link>
          . Free for non-commercial use under CC BY-NC 4.0.
        </p>
      </section>

      <DatasetNextSteps datasetName="Clinical Trial Failures datasets" />
    </DatasetPageShell>
  );
}
