import Head from "next/head";
import Link from "next/link";
import type { ReactNode } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import { serializeJsonLd } from "@/lib/serializeJsonLd";

type Props = { title: string; description: string; canonical: string; jsonLd: unknown[]; children: ReactNode };

// Shared frame of the dataset pages: head, JSON-LD, the top bar with the "Free data" item active.
export default function DatasetPageShell({ title, description, canonical, jsonLd, children }: Props) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://clinicaltrialfailures.com/og-image.png" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
      </Head>
      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <PrimaryNav active="datasets" />
            </div>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </>
  );
}

// The three ways forward from any dataset page, in the order a data buyer takes them.
export function DatasetNextSteps({ datasetName }: { datasetName: string }) {
  const subject = encodeURIComponent(`Sample request: ${datasetName}`);
  const body = encodeURIComponent(
    "Therapeutic areas:\nPhases:\nWhat you would use the data for (e.g. model training, diligence):\nOrganisation:\n"
  );
  return (
    <section className="card p-4" style={{ maxWidth: 920, margin: "16px auto 0" }} aria-labelledby="next-steps">
      <h2 id="next-steps" style={{ margin: "0 0 8px", fontSize: 20 }}>
        Need more than the sample?
      </h2>
      <ol className="muted" style={{ lineHeight: 1.7, paddingLeft: 20, margin: "0 0 12px" }}>
        <li>
          <strong>A sample for your scope.</strong> Tell us the therapeutic areas and phases you work on; we send a sample of exactly
          that, in the format a licence delivers.
        </li>
        <li>
          <strong>The full dataset.</strong> All disease areas, weekly updates, and the clinician-reviewed labels as review proceeds,
          licensed for commercial use and model training.
        </li>
        <li>
          <strong>Every new stopped trial.</strong> The newsletter brings what changed in the registry every two weeks, free.
        </li>
      </ol>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <a className="btn btn-primary" href={`mailto:contact@clinicaltrialfailures.com?subject=${subject}&body=${body}`}>
          Request a sample for your scope
        </a>
        <Link className="btn" href="/pricing">
          Licence the full dataset
        </Link>
        <Link className="btn" href="/newsletter">
          Get the newsletter
        </Link>
      </div>
    </section>
  );
}
