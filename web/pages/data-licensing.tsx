// web/pages/data-licensing.tsx

import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { FormEvent, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import productSummary from "@/data/product_summary.json";
import { readJsonServerAsset } from "@/lib/server-data";
import { EXPORT_ROW_LIMIT, LICENSING_EMAIL } from "@/lib/licensing";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/data-licensing`;
const TITLE = "Data & licensing — Clinical trial failure datasets";
const DESCRIPTION =
  "License the complete classified stopped-trial dataset and the Oncology Failure Signals dataset: biological failure labels linked to drugs, targets, sponsors, tickers and publications.";

type Props = {
  datasetVersion: string;
  totalRecords: number;
  biologicalRecords: number;
  heldoutPrecision: number | null;
  heldoutRecall: number | null;
};

const pct = (v: number | null | undefined) => (typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "—");
const n = (v: number) => v.toLocaleString("en-US");

export const getStaticProps: GetStaticProps<Props> = async () => {
  const meta = await readJsonServerAsset<any>("public/dataset_meta.json").catch(() => ({}));
  const heldout = meta?.classification_v2?.heldout_validation || {};
  return {
    props: {
      datasetVersion: meta?.version || productSummary.dataset_version,
      totalRecords: meta?.all?.record_count || 0,
      biologicalRecords: meta?.biological_failure?.record_count || 0,
      heldoutPrecision: heldout.biological_precision ?? null,
      heldoutRecall: heldout.biological_recall ?? null,
    },
  };
};

export default function DataLicensingPage({ datasetVersion, totalRecords, biologicalRecords, heldoutPrecision, heldoutRecall }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [sampleUrl, setSampleUrl] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/sample-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Request failed");
      setSampleUrl(data.sampleUrl || "");
      setStatus("done");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Request failed. Please email us instead.");
    }
  }

  const s = productSummary;
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={CANONICAL_URL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
            <PrimaryNav active="data" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <div className="card body">
            <h1 className="h1">Data &amp; licensing</h1>
            <p className="muted lead">
              The website is free to explore. For teams that need clinical trial failure evidence in their own models, screens and
              research workflows, we license bulk files and recurring releases. The datasets are derived from public registries and
              reference databases; the classifications, linkages, validation and curation are produced by Clinical Trial Failures.
            </p>

            <div className="trustPanel">
              <div>
                <div className="trustTitle">{n(s.trial_count)} oncology failure signals</div>
                <p className="muted">
                  {n(s.industry_phase2_3_trial_count)} industry-sponsored Phase 2/3 trials; {n(s.unique_assets)} linked drugs;{" "}
                  {n(s.assets_with_repeated_safety_signal)} drugs with repeated safety signals.
                </p>
              </div>
              <div>
                <div className="trustTitle">Validated labels</div>
                <p className="muted">
                  Held-out biological failure precision {pct(heldoutPrecision)}, recall {pct(heldoutRecall)}.{" "}
                  <Link className="link" href="/methods#validation">
                    How we validate
                  </Link>
                </p>
              </div>
              <div>
                <div className="trustTitle">Source-linked</div>
                <p className="muted">
                  Every record links to ClinicalTrials.gov; drugs to ChEMBL/RxNorm; sponsors to SEC filings; trials to PubMed.
                </p>
              </div>
            </div>

            <h2 className="h2">Datasets</h2>
            <p className="muted">Both datasets are rebuilt every week from the latest ClinicalTrials.gov snapshot and licensed as dated releases.</p>
            <div className="trustPanel">
              <div>
                <div className="trustTitle">Oncology Failure Signals</div>
                <p className="muted">
                  Stopped oncology trials with efficacy, safety or unspecified biological failure. Each record adds the investigational
                  drug and research codes, canonical ChEMBL/RxNorm IDs ({pct(s.trials_with_resolved_focus_asset)} of trials), mechanism,
                  target genes ({pct(s.trials_with_focus_target_gene)}), highest development phase, arm roles, sponsor group and ticker (
                  {pct(s.industry_trials_with_sec_issuer)} of industry trials), and PubMed publications.
                </p>
              </div>
              <div>
                <div className="trustTitle">Complete classified dataset</div>
                <p className="muted">
                  All {n(totalRecords)} stopped trials across therapeutic areas with outcome, primary and secondary cause, confidence,
                  rule evidence and review status — including {n(biologicalRecords)} biological failure records. Delivered as CSV or JSON.
                </p>
              </div>
              <div>
                <div className="trustTitle">Weekly releases</div>
                <p className="muted">
                  Each release includes a change report covering newly stopped trials, status changes and reclassifications, so you can
                  update your own screens without reprocessing the full file.
                </p>
              </div>
            </div>

            <h2 className="h2">Licensing options</h2>
            <ul className="muted list">
              <li>
                <span className="strong">Snapshot license</span> — one dataset release for internal research and analysis.
              </li>
              <li>
                <span className="strong">Annual subscription</span> — all releases during the term plus change reports.
              </li>
              <li>
                <span className="strong">Enterprise &amp; AI use</span> — model training or evaluation rights, multiple teams, custom
                file delivery.
              </li>
            </ul>
            <p className="muted">
              Pilot pricing is available for early customers. Free exports on this site are limited to {EXPORT_ROW_LIMIT} rows per
              download. The underlying registry and reference facts remain public at their sources; licenses cover our derived
              classifications, linkages, validation, curation and delivery. Fields derived from ChEMBL (targets, mechanisms, development
              phase) remain subject to ChEMBL&apos;s CC BY-SA 3.0 license.
            </p>

            <h2 id="sample" className="h2">
              Request the free sample
            </h2>
            <p className="muted">
              {s.sample_record_count} records from Oncology Failure Signals (dataset {datasetVersion}) with the full column set, for
              evaluation.
            </p>

            {status === "done" ? (
              <div className="trustPanel">
                <div>
                  <div className="trustTitle">Your sample is ready</div>
                  <p className="muted">
                    <a className="link" href={sampleUrl} download>
                      Download the sample (CSV)
                    </a>
                    . For pricing or a larger evaluation extract, email{" "}
                    <a className="link" href={`mailto:${LICENSING_EMAIL}?subject=Oncology%20Failure%20Signals%20licensing`}>
                      {LICENSING_EMAIL}
                    </a>
                    .
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="card p-4" style={{ display: "grid", gap: 12, maxWidth: 560 }}>
                <label className="muted">
                  Work email
                  <input className="input" name="email" type="email" required autoComplete="email" style={{ width: "100%" }} />
                </label>
                <label className="muted">
                  Name
                  <input className="input" name="name" type="text" autoComplete="name" style={{ width: "100%" }} />
                </label>
                <label className="muted">
                  Company or institution
                  <input className="input" name="company" type="text" required autoComplete="organization" style={{ width: "100%" }} />
                </label>
                <label className="muted">
                  Primary use case
                  <select className="input" name="useCase" required defaultValue="" style={{ width: "100%" }}>
                    <option value="" disabled>
                      Choose one
                    </option>
                    <option value="investment">Biotech investing / equity research</option>
                    <option value="competitive-intelligence">Competitive intelligence / BD</option>
                    <option value="clinical-development">Clinical development / trial design</option>
                    <option value="ai-ml">AI / ML model development</option>
                    <option value="academic">Academic research</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px" }} />
                <label className="muted" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input name="consent" type="checkbox" required />
                  <span>
                    I will use the sample for evaluation only and agree to be contacted about the dataset. See our{" "}
                    <Link className="link" href="/privacy">
                      privacy notice
                    </Link>
                    .
                  </span>
                </label>
                <button className="btn-primary" type="submit" disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Get the sample"}
                </button>
                {status === "error" ? <div style={{ color: "#b91c1c", fontSize: 13 }}>{message}</div> : null}
              </form>
            )}

            <h2 className="h2">Sources &amp; attribution</h2>
            <p className="muted">
              ClinicalTrials.gov (U.S. National Library of Medicine); RxNorm and RxClass (NLM); ChEMBL (EMBL-EBI, CC BY-SA 3.0); PubMed
              (NCBI); SEC EDGAR. Classifications, linkages and derived features are produced by Clinical Trial Failures. Data are
              analytical research signals, not clinical or investment advice. Coverage figures on this page are computed from the
              current release.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
