// web/pages/data-licensing.tsx

import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { FormEvent, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import productSummary from "@/data/product_summary.json";
import { readJsonServerAsset } from "@/lib/server-data";
import { EXPORT_ROW_LIMIT, LICENSING_EMAIL } from "@/lib/licensing";

// Prices are list prices for a one-year term, excluding VAT. Edit here; the page follows.
const PRICING = [
  {
    name: "Snapshot",
    prefix: "",
    price: "€1,500",
    unit: "one-time",
    for: "Research, a one-off analysis, or evaluation before a subscription.",
    includes: ["One dated release, all files", "Benchmark pack and class tables", "Internal use, one team"],
    cta: "Request a quote",
  },
  {
    name: "Annual licence",
    prefix: "",
    price: "€4,900",
    unit: "per year",
    for: "Investment research, competitive intelligence and trial design.",
    includes: [
      "Weekly releases for twelve months",
      "Benchmark pack and every mechanism-class brief",
      "Weekly change report",
      "Internal use, one team · email support",
    ],
    cta: "Start a licence",
    highlight: true,
    badge: "Most teams",
  },
  {
    name: "Enterprise & AI",
    prefix: "from ",
    price: "€15,000",
    unit: "per year",
    for: "Multiple teams, model training, or redistribution inside a product.",
    includes: [
      "Everything in the annual licence",
      "Model training and evaluation rights",
      "Custom segments and briefs on request",
      "Custom delivery (S3 or file drop)",
    ],
    cta: "Talk to us",
  },
];

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/data-licensing`;
const TITLE = "Data & licensing — Clinical trial failure datasets";
const DESCRIPTION =
  "License the complete classified stopped-trial dataset, the Oncology Failure Signals dataset and discontinuation benchmarks with denominators: biological failure labels linked to drugs, targets, sponsors, tickers and publications.";

type Props = {
  datasetVersion: string;
  totalRecords: number;
  biologicalRecords: number;
  heldoutPrecision: number | null;
  heldoutRecall: number | null;
};

const pct = (v: number | null | undefined, digits = 1) => (typeof v === "number" ? `${(v * 100).toFixed(digits)}%` : "—");
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

  const s: any = productSummary;
  const bench = s.benchmarks;
  const featured = s.featured_benchmark;
  const featuredBars: any[] = featured ? [featured.segment, featured.reference, featured.baseline].filter(Boolean) : [];
  const maxRate = featuredBars.length ? Math.max(...featuredBars.map((b) => b.rate)) : 1;
  const mailto = (subject: string) => `mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent(subject)}`;

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
          {/* ---------------- hero ---------------- */}
          <section className="hero">
            <div className="heroMain">
              <div className="eyebrow">Data licensing</div>
              <h1>Trial failure evidence, with the denominators</h1>
              <p className="heroLead">
                {n(s.trial_count)} oncology trials stopped for efficacy, safety or benefit–risk reasons — each linked to the drug, its
                target and mechanism, the sponsor and its ticker — plus the full trial universe behind them, so every rate has a
                denominator. Licensed as weekly dated releases in CSV and JSON.
              </p>
              <div className="ctaRow">
                <a className="btnPrimary" href="#sample">
                  Get the free sample
                </a>
                <a className="btnGhost" href="#pricing">
                  See pricing
                </a>
              </div>
              <p className="ctaNote">
                {s.sample_record_count} records with the full column set. No payment details, no call required.
              </p>
              <div className="sourceStrip">
                <span>ClinicalTrials.gov</span>
                <span>ChEMBL</span>
                <span>NCI Thesaurus</span>
                <span>RxNorm</span>
                <span>PubMed</span>
                <span>SEC EDGAR</span>
              </div>
            </div>

            <aside className="release">
              <div className="releaseHead">
                <div className="releaseTitle">Current release</div>
                <div className="pill">{datasetVersion}</div>
              </div>
              <div className="releaseRow">
                <span>Oncology failure signals</span>
                <b>{n(s.trial_count)}</b>
              </div>
              <div className="releaseRow">
                <span>Classified stopped trials</span>
                <b>{n(totalRecords)}</b>
              </div>
              {bench ? (
                <div className="releaseRow">
                  <span>Benchmark segments</span>
                  <b>{n(bench.segments)}</b>
                </div>
              ) : null}
              {s.brief_count ? (
                <div className="releaseRow">
                  <span>Mechanism-class briefs</span>
                  <b>{n(s.brief_count)}</b>
                </div>
              ) : null}
              <div className="releaseRow">
                <span>Update cadence</span>
                <b>Weekly</b>
              </div>
              <div className="releaseRow">
                <span>Delivery</span>
                <b>CSV · JSON · S3</b>
              </div>
            </aside>
          </section>

          {/* ---------------- stat band ---------------- */}
          <div className="stats">
            <div className="stat">
              <div className="statValue">{pct(heldoutPrecision)}</div>
              <div className="statLabel">Held-out precision</div>
              <div className="statNote">
                recall {pct(heldoutRecall)} on a blind-annotated sample.{" "}
                <Link className="link" href="/methods#validation">
                  How we validate
                </Link>
              </div>
            </div>
            <div className="stat">
              <div className="statValue">{n(s.trial_count)}</div>
              <div className="statLabel">Oncology failure signals</div>
              <div className="statNote">
                {n(s.industry_phase2_3_trial_count)} industry Phase 2/3 trials, {n(s.unique_assets)} linked drugs
              </div>
            </div>
            <div className="stat">
              <div className="statValue">{bench ? n(bench.segments) : "—"}</div>
              <div className="statLabel">Benchmark segments</div>
              <div className="statNote">{bench ? `${bench.mechanism_classes} mechanism classes, each with a 95% interval` : ""}</div>
            </div>
            <div className="stat">
              <div className="statValue">{bench ? n(bench.universe_closed_trials) : "—"}</div>
              <div className="statLabel">Closed trials as denominator</div>
              <div className="statNote">
                {bench
                  ? `Phase ${bench.window.phases.join("/")} oncology, starts ${bench.window.start_year_from}–${bench.window.start_year_to}`
                  : ""}
              </div>
            </div>
          </div>

          {/* ---------------- datasets ---------------- */}
          <section className="section">
            <h2>What you license</h2>
            <p className="sectionSub">
              Rebuilt every week from the latest ClinicalTrials.gov snapshot and shipped as dated releases you can reproduce an analysis
              against.
            </p>
            <div className="grid2">
              <div className="card dsCard">
                <div className="dsTitle">Oncology Failure Signals</div>
                <p className="dsBody">
                  Stopped oncology trials with an efficacy, safety or unspecified biological cause. Each record carries the
                  investigational drug and research codes, canonical ChEMBL/RxNorm IDs ({pct(s.trials_with_resolved_focus_asset)}),
                  mechanism and target genes ({pct(s.trials_with_focus_target_gene)}), highest development phase, arm roles, sponsor
                  group and ticker ({pct(s.industry_trials_with_sec_issuer)} of industry trials) and PubMed publications.
                </p>
                <div className="tagRow">
                  <span className="tag">{n(s.trial_count)} records</span>
                  {s.signals_column_count ? <span className="tag">{s.signals_column_count} columns</span> : null}
                  <span className="tag">CSV · JSON</span>
                </div>
              </div>

              <div className="card dsCard">
                <div className="dsTitle">Complete classified dataset</div>
                <p className="dsBody">
                  All {n(totalRecords)} stopped trials across every therapeutic area with outcome, primary and secondary cause,
                  confidence, the rule evidence behind each label and review status — including {n(biologicalRecords)} biological
                  failure records.
                </p>
                <div className="tagRow">
                  <span className="tag">{n(totalRecords)} records</span>
                  <span className="tag">All therapeutic areas</span>
                  <span className="tag">CSV · JSON</span>
                </div>
              </div>

              <div className="card dsCard">
                <div className="dsTitle">Discontinuation benchmarks</div>
                <p className="dsBody">
                  Rates with denominators for every mechanism class, phase, modality, start cohort and sponsor group, each with a 95%
                  Wilson interval — plus a two-page brief per class listing the underlying trials and their registry stop reasons.
                </p>
                <div className="tagRow">
                  {bench ? <span className="tag">{bench.segments} segments</span> : null}
                  {s.brief_count ? <span className="tag">{s.brief_count} briefs</span> : null}
                  <span className="tag">JSON · CSV · PDF</span>
                </div>
              </div>

              <div className="card dsCard">
                <div className="dsTitle">Weekly change report</div>
                <p className="dsBody">
                  Newly stopped trials, status changes and reclassifications since the previous release, so you can update your own
                  screens and models without reprocessing the full file.
                </p>
                <div className="tagRow">
                  <span className="tag">Weekly</span>
                  <span className="tag">Dated releases</span>
                  <span className="tag">Diff format</span>
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- benchmark proof ---------------- */}
          {featured ? (
            <section className="section">
              <h2>Denominators, not anecdotes</h2>
              <p className="sectionSub">
                A list of failed trials tells you what happened. A rate against a comparable group tells you whether it is unusual.
              </p>
              <div className="card proof">
                <div className="proofGrid">
                  <div>
                    <div className="dsTitle">{featured.segment.label}</div>
                    <p className="dsBody">
                      {pct(featured.segment.rate)} of closed trials in this segment stopped early for a biological reason —{" "}
                      {(featured.segment.rate / (featured.baseline.rate || 1)).toFixed(1)}× the oncology baseline, with an interval that
                      clears it. Every mechanism class is measured the same way, so a headline like this can be checked rather than
                      believed.
                    </p>
                    <p className="proofNote">
                      Share of closed Phase {bench ? bench.window.phases.join("/") : "2/3"} oncology trials (completed or terminated)
                      terminated for an efficacy, safety or benefit–risk reason recorded in the registry. Not a failure rate: trials
                      that completed and missed their endpoints are not counted.
                    </p>
                  </div>
                  <div className="bars">
                    {featuredBars.map((b, i) => (
                      <div className="barRow" key={b.label}>
                        <div className="barLabel">
                          <span>{b.label}</span>
                          <b>{pct(b.rate)}</b>
                        </div>
                        <div className="barTrack">
                          <div className={i === 0 ? "barFill" : "barFill ref"} style={{ width: `${(b.rate / maxRate) * 100}%` }} />
                        </div>
                        <div className="barMeta">
                          {n(b.stops)} of {n(b.closed)} closed trials · 95% CI {pct(b.ci95[0])}–{pct(b.ci95[1])}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {/* ---------------- pricing ---------------- */}
          <section className="section" id="pricing">
            <h2>Pricing</h2>
            <p className="sectionSub">
              List prices for a twelve-month term, excluding VAT. Academic and single-analyst rates on request.
            </p>
            <div className="tiers">
              {PRICING.map((tier) => (
                <div className={tier.highlight ? "card tier featured" : "card tier"} key={tier.name}>
                  {tier.badge ? <div className="tierBadge">{tier.badge}</div> : null}
                  <div className="tierName">{tier.name}</div>
                  <div className="tierPrice">
                    {tier.prefix ? <span className="tierFrom">{tier.prefix}</span> : null}
                    {tier.price}
                    <span className="tierUnit">{tier.unit}</span>
                  </div>
                  <p className="tierFor">{tier.for}</p>
                  <ul className="tierList">
                    {tier.includes.map((line) => (
                      <li key={line}>
                        <svg className="check" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="tierCta">
                    <a
                      className={tier.highlight ? "solid" : "outline"}
                      href={mailto(`${tier.name} — Oncology Failure Signals`)}
                    >
                      {tier.cta}
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <p className="fine">
              Free exports on this site are limited to {EXPORT_ROW_LIMIT} rows per download. The underlying registry and reference facts
              remain public at their sources; a licence covers our derived classifications, linkages, validation, curation and delivery.
              Fields derived from ChEMBL (targets, mechanisms, development phase) remain subject to ChEMBL&apos;s CC BY-SA 3.0 licence.
            </p>
          </section>

          {/* ---------------- sample ---------------- */}
          <section className="section" id="sample">
            <h2>Try it on {s.sample_record_count} records</h2>
            <div className="sampleGrid">
              <div>
                <p className="sectionSub">
                  A stratified extract from Oncology Failure Signals with every column of the licensed file, so you can test the linkage
                  and the labels against your own list before you buy.
                </p>
                <ul className="sampleList">
                  <li>
                    <span className="dot">1</span>
                    <span>
                      <b>Full column set.</b> Drug and research codes, ChEMBL/RxNorm IDs, mechanism, target genes, sponsor group and
                      ticker, publications and the registry stop reason.
                    </span>
                  </li>
                  <li>
                    <span className="dot">2</span>
                    <span>
                      <b>Stratified, not cherry-picked.</b> Efficacy, safety, mixed and unspecified causes in fixed proportions, all
                      industry-sponsored and drug-resolved.
                    </span>
                  </li>
                  <li>
                    <span className="dot">3</span>
                    <span>
                      <b>Checkable.</b> Every row carries its NCT ID and registry URL, so each label can be verified at the source.
                    </span>
                  </li>
                </ul>
                {Array.isArray(s.sample_columns) && s.sample_columns.length ? (
                  <>
                    <div className="colsTitle">Columns in the sample</div>
                    <div className="tagRow">
                      {s.sample_columns.map((c: string) => (
                        <span className="tag mono" key={c}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {status === "done" ? (
                <div className="card form">
                  <div className="formTitle">Your sample is ready</div>
                  <p className="formSub">Evaluation use only. The licensed file has the same columns for every record.</p>
                  <a className="submit asLink" href={sampleUrl} download>
                    Download the sample (CSV)
                  </a>
                  <p className="formFoot">
                    For a larger evaluation extract or pricing, email{" "}
                    <a className="link" href={mailto("Oncology Failure Signals licensing")}>
                      {LICENSING_EMAIL}
                    </a>
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="card form">
                  <div className="formTitle">Request the free sample</div>
                  <p className="formSub">
                    {s.sample_record_count} records from dataset {datasetVersion}, delivered as CSV.
                  </p>
                  <div className="field">
                    <label htmlFor="lic-email">Work email</label>
                    <input id="lic-email" className="input" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="field">
                    <label htmlFor="lic-name">Name</label>
                    <input id="lic-name" className="input" name="name" type="text" autoComplete="name" />
                  </div>
                  <div className="field">
                    <label htmlFor="lic-company">Company or institution</label>
                    <input id="lic-company" className="input" name="company" type="text" required autoComplete="organization" />
                  </div>
                  <div className="field">
                    <label htmlFor="lic-use">Primary use case</label>
                    <select id="lic-use" className="input" name="useCase" required defaultValue="">
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
                  </div>
                  <input
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: "absolute", left: "-9999px" }}
                  />
                  <label className="consent">
                    <input name="consent" type="checkbox" required />
                    <span>
                      I will use the sample for evaluation only and agree to be contacted about the dataset. See our{" "}
                      <Link className="link" href="/privacy">
                        privacy notice
                      </Link>
                      .
                    </span>
                  </label>
                  <button className="submit" type="submit" disabled={status === "sending"}>
                    {status === "sending" ? "Sending…" : "Get the sample"}
                  </button>
                  {status === "error" ? <div className="formError">{message}</div> : null}
                  <p className="formFoot">
                    Or email{" "}
                    <a className="link" href={mailto("Oncology Failure Signals licensing")}>
                      {LICENSING_EMAIL}
                    </a>
                  </p>
                </form>
              )}
            </div>
          </section>

          {/* ---------------- faq ---------------- */}
          <section className="section">
            <h2>Licensing questions</h2>
            <div className="faqGrid">
              <div className="faq">
                <h3>How is the data delivered?</h3>
                <p>
                  A dated release with CSV and JSON files, the benchmark pack and the change report, by download link — or into your S3
                  bucket on the enterprise tier.
                </p>
              </div>
              <div className="faq">
                <h3>How current is it?</h3>
                <p>
                  Rebuilt weekly from the ClinicalTrials.gov snapshot. Every release is dated and kept, so an analysis can be reproduced
                  against the exact file it used.
                </p>
              </div>
              <div className="faq">
                <h3>Can we train models on it?</h3>
                <p>
                  Model training, evaluation and redistribution inside a product are covered by the enterprise licence. The other tiers
                  are for internal use by one team.
                </p>
              </div>
              <div className="faq">
                <h3>How good are the labels?</h3>
                <p>
                  Measured, not asserted: {pct(heldoutPrecision)} precision and {pct(heldoutRecall)} recall for biological failure on a
                  held-out sample of blind-annotated stop reasons.{" "}
                  <Link className="link" href="/methods#validation">
                    See the validation
                  </Link>
                  .
                </p>
              </div>
            </div>
          </section>

          {/* ---------------- legal ---------------- */}
          <div className="legal">
            <div>
              <h3>Method &amp; limits</h3>
              <p>
                A discontinuation rate is the share of closed trials (completed or terminated) that were terminated for an efficacy,
                safety or benefit–risk reason recorded in the registry, with a 95% Wilson interval. It is not a failure rate: trials
                that completed and missed their endpoints are not counted, and programmes dropped after a completed trial do not appear.
                Stop reasons are sponsor-reported. Drug linkage covers 86% of experimental-arm drugs in industry oncology trials; 70%
                carry a target.
              </p>
            </div>
            <div>
              <h3>Sources &amp; attribution</h3>
              <p>
                ClinicalTrials.gov (U.S. National Library of Medicine); RxNorm and RxClass (NLM); ChEMBL (EMBL-EBI, CC BY-SA 3.0); NCI
                Thesaurus (NCI); PubMed (NCBI); SEC EDGAR. Classifications, linkages and derived features are produced by Clinical Trial
                Failures. Data are analytical research signals, not clinical or investment advice. Coverage figures on this page are
                computed from the current release.
              </p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1120px;
          margin: 0 auto;
        }

        /* ---------- hero ---------- */
        .hero {
          position: relative;
          overflow: hidden;
          border-radius: 20px;
          color: #fff;
          background: radial-gradient(1100px 380px at 88% -10%, rgba(79, 70, 229, 0.55), transparent 60%),
            linear-gradient(160deg, #0f172a 0%, #131f38 60%, #172447 100%);
          padding: 34px;
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.85fr);
          gap: 30px;
          align-items: start;
        }
        .heroMain {
          min-width: 0;
        }
        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #a5b4fc;
        }
        .hero h1 {
          margin: 10px 0 0;
          font-size: 36px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.022em;
          max-width: 22ch;
        }
        .heroLead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.76);
          max-width: 58ch;
        }
        .ctaRow {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 20px;
        }
        .btnPrimary,
        .btnGhost {
          border-radius: 12px;
          padding: 11px 18px;
          font-size: 14px;
          text-decoration: none;
          display: inline-block;
        }
        .btnPrimary {
          background: var(--accent);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.18);
          font-weight: 800;
        }
        .btnGhost {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.22);
          font-weight: 700;
        }
        .ctaNote {
          margin: 10px 0 0;
          font-size: 12.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .sourceStrip {
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          font-size: 11.5px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.5);
        }
        .release {
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 16px;
          padding: 18px;
        }
        .releaseHead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.14);
        }
        .releaseTitle {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.62);
        }
        .pill {
          font-size: 12px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 999px;
          background: rgba(165, 180, 252, 0.18);
          color: #c7d2fe;
          border: 1px solid rgba(165, 180, 252, 0.3);
          white-space: nowrap;
        }
        .releaseRow {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding: 9px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 13px;
        }
        .releaseRow:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }
        .releaseRow span {
          color: rgba(255, 255, 255, 0.6);
        }
        .releaseRow b {
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        /* ---------- stat band ---------- */
        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 14px;
        }
        .stat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          padding: 16px 18px;
        }
        .statValue {
          font-size: 27px;
          font-weight: 900;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .statLabel {
          margin-top: 4px;
          font-size: 13px;
          font-weight: 800;
        }
        .statNote {
          margin-top: 2px;
          font-size: 12px;
          color: var(--text-muted);
          line-height: 1.45;
        }

        /* ---------- sections ---------- */
        .section {
          margin-top: 40px;
        }
        .section h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        .sectionSub {
          margin: 6px 0 0;
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.55;
          max-width: 76ch;
        }
        .grid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }
        .dsCard {
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
        }
        .dsTitle {
          font-size: 15px;
          font-weight: 850;
          letter-spacing: -0.01em;
        }
        .dsBody {
          margin: 6px 0 0;
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.55;
        }
        .tagRow {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .dsCard .tagRow {
          margin-top: auto;
          padding-top: 12px;
        }
        .tag {
          font-size: 11.5px;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.62);
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 3px 9px;
        }
        .tag.mono {
          font-family: var(--font-mono);
          font-weight: 600;
          font-size: 11px;
        }

        /* ---------- benchmark proof ---------- */
        .proof {
          padding: 22px 24px;
          margin-top: 18px;
        }
        .proofGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
          gap: 28px;
          align-items: start;
        }
        .bars {
          display: grid;
          gap: 14px;
        }
        .barRow {
          display: grid;
          gap: 5px;
        }
        .barLabel {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13px;
        }
        .barLabel b {
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .barTrack {
          height: 16px;
          background: var(--surface-2);
          border-radius: 4px;
          overflow: hidden;
        }
        .barFill {
          height: 16px;
          border-radius: 0 4px 4px 0;
          background: var(--accent);
        }
        .barFill.ref {
          background: #c7cbe8;
        }
        .barMeta {
          font-size: 12px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }
        .proofNote {
          margin: 14px 0 0;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-muted);
        }

        /* ---------- pricing ---------- */
        .tiers {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
          align-items: stretch;
        }
        .tier {
          padding: 22px 20px;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .tier.featured {
          border-color: rgba(79, 70, 229, 0.45);
          box-shadow: 0 0 0 1px rgba(79, 70, 229, 0.25), 0 14px 40px rgba(79, 70, 229, 0.13);
        }
        .tierBadge {
          position: absolute;
          top: -10px;
          left: 20px;
          background: var(--accent);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .tierName {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .tierPrice {
          margin-top: 10px;
          font-size: 32px;
          font-weight: 900;
          letter-spacing: -0.025em;
          font-variant-numeric: tabular-nums;
        }
        .tierFrom {
          font-size: 17px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: -0.01em;
        }
        .tierUnit {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          margin-left: 6px;
          letter-spacing: 0;
        }
        .tierFor {
          margin: 8px 0 0;
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.5;
          min-height: 42px;
        }
        .tierList {
          list-style: none;
          margin: 16px 0 0;
          padding: 0;
          display: grid;
          gap: 9px;
        }
        .tierList li {
          display: grid;
          grid-template-columns: 16px 1fr;
          gap: 9px;
          align-items: start;
          font-size: 13.5px;
          line-height: 1.45;
        }
        .check {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          color: var(--accent);
        }
        .tierCta {
          margin-top: auto;
          padding-top: 18px;
        }
        .tierCta a {
          display: block;
          text-align: center;
          text-decoration: none;
          border-radius: 12px;
          padding: 10px 14px;
          font-weight: 800;
          font-size: 13.5px;
        }
        .tierCta .solid {
          background: var(--accent);
          color: #fff;
        }
        .tierCta .outline {
          background: var(--surface);
          color: var(--text);
          border: 1px solid var(--border);
        }
        .fine {
          margin-top: 14px;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 96ch;
        }

        /* ---------- sample ---------- */
        .sampleGrid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(340px, 0.9fr);
          gap: 24px;
          margin-top: 18px;
          align-items: start;
        }
        .sampleList {
          list-style: none;
          margin: 16px 0 0;
          padding: 0;
          display: grid;
          gap: 12px;
        }
        .sampleList li {
          display: grid;
          grid-template-columns: 18px 1fr;
          gap: 10px;
          align-items: start;
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-muted);
        }
        .sampleList b {
          color: var(--text);
          font-weight: 800;
        }
        .dot {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: rgba(79, 70, 229, 0.1);
          color: var(--accent);
          font-size: 11px;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 2px;
        }
        .colsTitle {
          margin: 22px 0 10px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .form {
          padding: 22px;
        }
        .formTitle {
          font-size: 15px;
          font-weight: 850;
        }
        .formSub {
          margin: 4px 0 16px;
          font-size: 13px;
          color: var(--text-muted);
        }
        .field {
          display: grid;
          gap: 6px;
          margin-bottom: 12px;
        }
        .field label {
          font-size: 12.5px;
          font-weight: 700;
          color: rgba(15, 23, 42, 0.72);
        }
        .consent {
          display: flex;
          gap: 9px;
          align-items: flex-start;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-muted);
          margin: 4px 0 14px;
        }
        .submit {
          width: 100%;
          background: var(--accent);
          color: #fff;
          border: 0;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
        }
        .submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .submit.asLink {
          display: block;
          text-align: center;
          text-decoration: none;
        }
        .formError {
          margin-top: 10px;
          color: #b91c1c;
          font-size: 13px;
        }
        .formFoot {
          margin: 10px 0 0;
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
        }

        /* ---------- faq + legal ---------- */
        .faqGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px 28px;
          margin-top: 18px;
        }
        .faq h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 850;
        }
        .faq p {
          margin: 5px 0 0;
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.55;
        }
        .legal {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 28px;
        }
        .legal h3 {
          margin: 0 0 6px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .legal p {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
        }

        @media (max-width: 1000px) {
          .hero {
            grid-template-columns: 1fr;
            padding: 26px;
          }
          .hero h1 {
            font-size: 28px;
          }
          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .proofGrid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .tiers {
            grid-template-columns: 1fr;
          }
          .tier.featured {
            order: -1;
          }
          .sampleGrid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 700px) {
          .hero h1 {
            font-size: 25px;
          }
          .stats,
          .grid2,
          .faqGrid,
          .legal {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
