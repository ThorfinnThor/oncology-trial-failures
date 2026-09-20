// web/pages/data-licensing.tsx

import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { FormEvent, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import productSummary from "@/data/product_summary.json";
import briefsIndex from "@/data/briefs_index.json";
import { readJsonServerAsset } from "@/lib/server-data";
import { EXPORT_ROW_LIMIT, LICENSING_EMAIL } from "@/lib/licensing";

// Prices are list prices, excluding VAT. Edit here; the page follows.
//
// The offer is deliberately built around a deliverable rather than around access to a file.
// A dated copy of a database is worth what the buyer's own SQL would cost; the work they
// cannot do cheaply is assembling a defensible cohort for one asset and showing what is and
// is not comparable. That is what the entry tier sells, and the subscription is the version
// of it that keeps running.
const PRICING = [
  {
    name: "Evidence package",
    prefix: "",
    price: "€1,500",
    unit: "one cohort",
    for: "One asset, target or mechanism you are evaluating now — diligence, a licensing decision, a trial design.",
    includes: [
      "A cohort you define, with the inclusion and exclusion rules written out",
      "Every trial in it, with its registry stop reason and a link to the record",
      "Stops attributable to that trial's own data, separated from programme-wide decisions",
      "Discontinuation rate and time-to-event curve against a like-for-like comparator",
      "Unresolved and unreadable cases listed, not hidden",
      "Written interpretation, kept separate from the extracted facts",
    ],
    cta: "Scope a package",
    href: "#evidence-package",
  },
  {
    name: "Annual licence",
    prefix: "",
    price: "€4,900",
    unit: "per year",
    for: "A team that returns to the same questions: competitive intelligence, portfolio review, investment research.",
    includes: [
      "Four evidence packages a year, cohorts of your choosing",
      "Watchlists on named assets, targets and sponsors",
      "Weekly alerts, split into registry events and our own pipeline changes",
      "The full dataset, rate tables and every mechanism brief, updated weekly",
      "Corrections tracked and dated · email support",
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
    for: "Several teams, delivery into your own systems, or redistribution inside a product you sell.",
    includes: [
      "Everything in the annual licence, across every disease area we cover",
      "Delivery into your S3 or file drop, and API access",
      "Redistribution inside your product, and model training and evaluation rights",
      "Cohort rules built to your definitions and held stable across releases",
      "Named contact and an agreed correction turnaround",
    ],
    cta: "Talk to us",
  },
];

// Said plainly, in the buyer's own words, because the alternative is that they assume it.
const HONESTY = [
  {
    title: "What you are buying",
    body: "Traceable evidence and a cohort you can audit. Every headline moves to the trials behind it, every trial to its "
      + "registry record. The work this replaces is a week of an analyst's searching and reconciling.",
  },
  {
    title: "What this is not",
    body: "Extraction, classification and interpretation are automated. No clinician has reviewed these records, and we do not "
      + "price as though one has. Where the evidence does not settle a question, the output says so rather than filling the gap.",
  },
  {
    title: "What the numbers do and do not estimate",
    body: "A discontinuation rate describes trials that have already closed in a stated cohort. It is not a forecast of whether "
      + "your asset will fail, and a mechanism with no observed stops is not a validated mechanism — it is a cohort in which "
      + "none were recorded.",
  },
];

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/data-licensing`;
const TITLE = "Data & licensing — Clinical trial failure datasets";
const DESCRIPTION =
  "License the complete classified stopped-trial dataset, the Oncology Failure Signals dataset and discontinuation rates with denominators: biological failure labels linked to drugs, targets, sponsors, tickers and publications.";

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
  const [pkgStatus, setPkgStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [pkgMessage, setPkgMessage] = useState("");

  async function submitPackage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPkgStatus("sending");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/package-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Request failed");
      setPkgMessage(data.message || "Thanks — we'll be in touch.");
      setPkgStatus("done");
    } catch (error: any) {
      setPkgMessage(error?.message || "Request failed. Please email us instead.");
      setPkgStatus("error");
    }
  }

  // The strongest briefs lead the teaser: the ones that clear a multiplicity correction.
  const featuredBriefs = (briefsIndex.briefs as any[]).filter((b) => b.survives_fdr_10pct).slice(0, 4);

  const rates = s.discontinuation_rates;
  const featured = s.featured_segment;
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
              {rates ? (
                <div className="releaseRow">
                  <span>Segments with a rate</span>
                  <b>{n(rates.segments)}</b>
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
                <Link className="link" href="/validation">
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
              <div className="statValue">{rates ? n(rates.segments) : "—"}</div>
              <div className="statLabel">Segments with a rate</div>
              <div className="statNote">{rates ? `${rates.mechanism_classes} mechanism classes, each with a 95% interval` : ""}</div>
            </div>
            <div className="stat">
              <div className="statValue">{rates ? n(rates.universe_closed_trials) : "—"}</div>
              <div className="statLabel">Closed trials as denominator</div>
              <div className="statNote">
                {rates
                  ? `Phase ${rates.window.phases.join("/")} oncology, starts ${rates.window.start_year_from}–${rates.window.start_year_to}`
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
                <div className="dsTitle">Discontinuation rates</div>
                <p className="dsBody">
                  Rates with denominators for every mechanism class, phase, modality, start cohort and sponsor group, each with a 95%
                  Wilson interval — plus a two-page brief per class listing the underlying trials and their registry stop reasons.
                </p>
                <div className="tagRow">
                  {rates ? <span className="tag">{rates.segments} segments</span> : null}
                  {s.brief_count ? <span className="tag">{s.brief_count} briefs</span> : null}
                  <span className="tag">JSON · CSV · HTML + PDF</span>
                </div>
              </div>

              <div className="card dsCard">
                <div className="dsTitle">Weekly change report</div>
                <p className="dsBody">
                  A diff against the previous release, by trial: newly stopped trials, trials that left the dataset, registry status
                  and stop-reason changes, reclassifications and new drug linkages. JSON for your pipeline, Markdown to read. Update
                  your own screens without reprocessing the full file.
                </p>
                <div className="tagRow">
                  <span className="tag">Weekly</span>
                  <span className="tag">Dated releases</span>
                  <span className="tag">JSON · Markdown</span>
                </div>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="honestGrid">
              {HONESTY.map((h) => (
                <div className="honestCard" key={h.title}>
                  <div className="honestTitle">{h.title}</div>
                  <p>{h.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="sectionHead">
              <h2>{briefsIndex.brief_count} mechanism briefs, free to read</h2>
              <Link className="btnGhost" href="/briefs">
                Browse all {briefsIndex.brief_count}
              </Link>
            </div>
            <p className="sectionSub">
              One per mechanism class, rebuilt weekly. Each leads with how many distinct molecules are behind the stopped
              trials, because a sponsor abandoning one drug closes every trial of it at once. These four are the ones still
              unusual after correcting for having screened every class.
            </p>
            <div className="briefGrid">
              {featuredBriefs.map((b) => (
                <Link key={b.slug} href={`/briefs/${b.slug}`} className="briefTile">
                  <div className="briefArea">{b.area}</div>
                  <div className="briefName">{b.segment}</div>
                  <div className="briefBig">
                    {b.failure_signature ? b.failure_signature.molecules : "—"}
                    <span> molecules</span>
                  </div>
                  <div className="briefMeta">
                    {b.biological_stops} of {b.closed} closed trials stopped early
                    {b.failure_signature?.shared_modality ? `, all ${b.failure_signature.shared_modality.toLowerCase()}s` : ""}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ---------------- evidence package request ---------------- */}
          <section className="section" id="evidence-package">
            <div className="pkgBox">
              <div>
                <h2>Ask for an evidence package</h2>
                <p className="sectionSub">
                  Name the mechanism, target or asset you are evaluating. You get the cohort with its rules written out, every
                  trial in it with the registry stop reason, which stops were that trial&rsquo;s own verdict and which followed a
                  decision taken elsewhere, the rate and time-to-event curve against a like-for-like comparator, and the cases we
                  could not resolve — listed, not hidden. €1,500 for one cohort.
                </p>
                <ul className="list">
                  <li>We reply with the cohort as we would define it before anything is built or paid</li>
                  <li>If the data cannot answer your question, we say so and there is no package</li>
                  <li>Automated analysis — no clinician has reviewed these records, and we do not price as though one has</li>
                </ul>
              </div>
              {pkgStatus === "done" ? (
                <div className="formDone">{pkgMessage}</div>
              ) : (
                <form className="form" onSubmit={submitPackage}>
                  <div className="field">
                    <label htmlFor="pkg-cohort">Mechanism, target or asset</label>
                    <input id="pkg-cohort" className="input" name="cohort" type="text" required
                           placeholder="e.g. anti-tau antibodies, or BACE1" />
                  </div>
                  <div className="field">
                    <label htmlFor="pkg-asset">The asset you are evaluating <span className="opt">optional</span></label>
                    <input id="pkg-asset" className="input" name="asset" type="text"
                           placeholder="Name or code — we compare it against every molecule that failed" />
                  </div>
                  <div className="field">
                    <label htmlFor="pkg-context">What you need to decide <span className="opt">optional</span></label>
                    <textarea id="pkg-context" className="input" name="context" rows={3}
                              placeholder="A licensing decision, a trial design, a diligence meeting next week…" />
                  </div>
                  <div className="field">
                    <label htmlFor="pkg-email">Work email</label>
                    <input id="pkg-email" className="input" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="field">
                    <label htmlFor="pkg-company">Company or institution</label>
                    <input id="pkg-company" className="input" name="company" type="text" required
                           autoComplete="organization" />
                  </div>
                  <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
                         style={{ position: "absolute", left: "-9999px" }} />
                  <label className="consent">
                    <input name="marketing" type="checkbox" />
                    <span>
                      Optional: email me about the dataset too. Leave it unticked and we only reply about this request.
                    </span>
                  </label>
                  <button className="submit" type="submit" disabled={pkgStatus === "sending"}>
                    {pkgStatus === "sending" ? "Sending…" : "Ask for a package"}
                  </button>
                  {pkgStatus === "error" ? <div className="formError">{pkgMessage}</div> : null}
                </form>
              )}
            </div>
          </section>

          {/* ---------------- rate proof ---------------- */}
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
                      Share of closed Phase {rates ? rates.window.phases.join("/") : "2/3"} oncology trials (completed or terminated)
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
                      href={(tier as any).href ?? mailto(`${tier.name} — Oncology Failure Signals`)}
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
                      <b>Every column.</b> All {s.signals_column_count} columns of the licensed file plus the sponsor&apos;s SEC
                      ticker — drug and research codes, ChEMBL IDs, mechanism, targets and target genes, sponsor group and class,
                      publications and the registry stop reason.
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
                      Plain UTF-8 CSV — it opens in Excel, Numbers or pandas without cleaning.
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
                  {s.sample_readme_file ? (
                    <p className="formFoot">
                      <a className="link" href={s.sample_readme_file} download>
                        Sources and terms (README)
                      </a>
                    </p>
                  ) : null}
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
                    {s.sample_record_count} records from dataset {datasetVersion}, as a CSV with {s.sample_columns?.length ?? ""} columns.
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
                      I will use the sample for evaluation only.
                    </span>
                  </label>
                  <label className="consent">
                    <input name="marketing" type="checkbox" />
                    <span>
                      Optional: email me about the dataset. Leave it unticked and you still get the sample — we will only reply
                      about this request. See our{" "}
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
                  A dated release with CSV and JSON files, the discontinuation rate tables and the change report, by download link — or into your S3
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
                  <Link className="link" href="/validation">
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

        .sectionHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .briefGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 12px;
          margin-top: 14px;
        }
        .briefTile {
          display: block;
          text-decoration: none;
          color: inherit;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px;
        }
        .briefTile:hover {
          border-color: rgba(79, 70, 229, 0.45);
        }
        .briefArea {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .briefName {
          margin-top: 6px;
          font-size: 14.5px;
          font-weight: 850;
          line-height: 1.25;
        }
        .briefBig {
          margin-top: 8px;
          font-size: 27px;
          font-weight: 900;
          letter-spacing: -0.025em;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .briefBig span {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0;
        }
        .briefMeta {
          margin-top: 6px;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-muted);
        }
        .pkgBox {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 28px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: var(--shadow-soft);
          padding: 24px 26px;
          margin-top: 14px;
        }
        .pkgBox h2 {
          margin-top: 0;
        }
        .opt {
          font-weight: 600;
          color: var(--text-muted);
          text-transform: none;
          letter-spacing: 0;
        }
        textarea.input {
          resize: vertical;
          font-family: inherit;
        }
        @media (max-width: 900px) {
          .pkgBox {
            grid-template-columns: 1fr;
          }
        }
        .honestGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .honestCard {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px 20px;
        }
        .honestTitle {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .honestCard p {
          margin: 8px 0 0;
          font-size: 13.5px;
          line-height: 1.55;
        }
        @media (max-width: 900px) {
          .honestGrid {
            grid-template-columns: 1fr;
          }
        }

        /* ---------- rate proof ---------- */
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
