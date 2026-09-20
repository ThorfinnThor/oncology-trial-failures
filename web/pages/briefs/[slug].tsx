// web/pages/briefs/[slug].tsx

import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import { FormEvent, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import briefsIndex from "@/data/briefs_index.json";
import { LICENSING_EMAIL } from "@/lib/licensing";

type Brief = (typeof briefsIndex.briefs)[number];
type Props = { brief: Brief };

const SITE_URL = "https://clinicaltrialfailures.com";
const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const n = (v: number) => v.toLocaleString("en-US");

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: (briefsIndex.briefs as Brief[]).map((b) => ({ params: { slug: b.slug } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<Props> = async ({ params }) => {
  const brief = (briefsIndex.briefs as Brief[]).find((b) => b.slug === params?.slug);
  if (!brief) return { notFound: true };
  return { props: { brief } };
};

export default function BriefPage({ brief }: Props) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  const area = brief.area.toLowerCase();
  const phases = brief.phases.join("/");
  const title = `${brief.segment}: ${pct(brief.rate)} of closed trials stopped early`;
  const description =
    `${brief.biological_stops} of ${brief.closed} closed Phase ${phases} ${area} trials of ${brief.segment} were ` +
    `terminated for an efficacy, safety or benefit–risk reason, against ${pct(brief.baseline_rate)} across ${area}. ` +
    `Trials, sponsors and registry stop reasons included.`;
  const hasReference = Math.abs(brief.reference_rate - brief.baseline_rate) > 1e-9;
  const maxRate = Math.max(brief.rate, brief.reference_rate, brief.baseline_rate) || 1;
  const width = (rate: number) => `${(rate / maxRate) * 100}%`;
  // A class segment can only hold trials whose drug resolved to a target, and those are not a
  // random sample of the area, so the like-for-like comparator is the resolved baseline.
  const comparator: number = brief.baseline_resolved_rate ?? brief.baseline_rate;
  const ratio = comparator ? brief.rate / comparator : 0;
  const cif = (brief.cumulative_incidence || []) as { months: number; cif: number; ci95: number[]; n_risk: number }[];
  const cif36 = cif.find((h) => h.months === 36);
  const baseCif36 = ((brief.baseline_cumulative_incidence || []) as typeof cif).find((h) => h.months === 36);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/brief-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), slug: brief.slug }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Request failed");
      setPdfUrl(data.pdfUrl || "");
      setStatus("done");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Request failed. Please email us instead.");
    }
  }

  return (
    <>
      <Head>
        <title>{`${title} — Clinical Trial Failures`}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="index,follow" />
        <link rel="canonical" href={`${SITE_URL}/briefs/${brief.slug}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE_URL}/briefs/${brief.slug}`} />
      </Head>

      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <Link href="/" className="brand">
              Clinical trial failures
            </Link>
            <PrimaryNav active="briefs" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <nav className="crumbs">
            <Link className="link" href="/briefs">
              Briefs
            </Link>
            <span aria-hidden="true"> · </span>
            <span className="muted">{brief.area}</span>
          </nav>

          <h1>
            {brief.segment}: {pct(brief.rate)} of closed trials stopped early for biological reasons
          </h1>
          <p className="lead">
            Against {pct(comparator)} across {area} trials whose drug resolves to a target — the like-for-like comparison, since
            a mechanism class can only contain those
            {ratio >= 1.5 ? ` — ${ratio.toFixed(1)}× that rate` : ""}. Rates count trials that stopped early for efficacy, safety
            or benefit–risk reasons; trials that completed and missed their endpoints are not counted.
          </p>

          <div className="stats">
            <div className="stat">
              <b>{pct(brief.rate)}</b>
              <span>
                {brief.biological_stops} of {n(brief.closed)} closed trials (95% CI {pct(brief.ci95[0])}–{pct(brief.ci95[1])})
              </span>
            </div>
            <div className="stat">
              <b>
                {brief.stops_efficacy_only} / {brief.stops_safety_only} / {brief.stops_efficacy_and_safety}
              </b>
              <span>efficacy / safety / both — adds to {brief.biological_stops}</span>
            </div>
            <div className="stat">
              <b>{pct(brief.closed_share, 0)}</b>
              <span>of {n(brief.trials_in_segment)} trials have closed, {n(brief.trials_in_segment - brief.closed)} still open</span>
            </div>
            <div className="stat">
              <b>{cif36 ? pct(cif36.cif) : "—"}</b>
              <span>
                {cif36 ? (
                  <>
                    stopped within 3 years of starting (95% CI {pct(cif36.ci95[0])}–{pct(cif36.ci95[1])})
                    {baseCif36 ? `, against ${pct(baseCif36.cif)} area-wide` : ""}
                  </>
                ) : (
                  "too few trials for a time-to-event estimate"
                )}
              </span>
            </div>
          </div>

          <section className="section">
            <h2>How this compares</h2>
            <div className="bars">
              <div className="barRow">
                <div className="barLabel">
                  <span>{brief.segment}</span>
                  <b>{pct(brief.rate)}</b>
                </div>
                <div className="barTrack">
                  <div className="barFill" style={{ width: width(brief.rate) }} />
                </div>
                <div className="barMeta">
                  {brief.biological_stops} of {n(brief.closed)} closed
                </div>
              </div>
              {hasReference ? (
                <div className="barRow">
                  <div className="barLabel">
                    <span>{brief.reference_label}</span>
                    <b>{pct(brief.reference_rate)}</b>
                  </div>
                  <div className="barTrack">
                    <div className="barFill ref" style={{ width: width(brief.reference_rate) }} />
                  </div>
                  <div className="barMeta">
                    {brief.reference_stops} of {n(brief.reference_closed)} closed
                  </div>
                </div>
              ) : null}
              <div className="barRow">
                <div className="barLabel">
                  <span>All {area} Phase {phases}</span>
                  <b>{pct(brief.baseline_rate)}</b>
                </div>
                <div className="barTrack">
                  <div className="barFill ref" style={{ width: width(brief.baseline_rate) }} />
                </div>
                <div className="barMeta">
                  {brief.baseline_stops} of {n(brief.baseline_closed)} closed
                </div>
              </div>
            </div>
            <p className="fine">
              Intervals overlap where sample sizes are small — read the counts, not just the bars.
              {brief.closed_share < 0.5 ? (
                <>
                  {" "}
                  <b>This segment is immature:</b> only {pct(brief.closed_share, 0)} of its trials have closed. A trial that stops
                  early enters the denominator sooner than one that runs to completion, so a rate computed this early can overstate
                  the eventual figure. This is a closed-trial proportion, not a time-to-event estimate.
                </>
              ) : null}
            </p>
          </section>

          <section className="section">
            <h2>How much of this rests on one decision?</h2>
            <div className="robustGrid">
              <div className="robustCard">
                <div className="robustTitle">Independent decisions</div>
                <p>
                  The {brief.biological_stops} stops came from <b>{brief.stop_programmes}</b> sponsor–asset{" "}
                  {brief.stop_programmes === 1 ? "programme" : "programmes"} across <b>{brief.stop_sponsors}</b>{" "}
                  {brief.stop_sponsors === 1 ? "sponsor" : "sponsors"}.
                  {brief.largest_programme ? (
                    <>
                      {" "}
                      The largest ({brief.largest_programme}) contributed {brief.largest_programme_stops}.
                    </>
                  ) : null}
                  {typeof brief.rate_leave_one_programme_out === "number" ? (
                    <>
                      {" "}
                      Removing that programme&rsquo;s trials from both sides leaves{" "}
                      <b>{pct(brief.rate_leave_one_programme_out)}</b>.
                    </>
                  ) : null}{" "}
                  Ten registry records are not ten independent experiments; this is the check.
                </p>
              </div>
              <div className="robustCard">
                <div className="robustTitle">What we cannot read</div>
                <p>
                  {brief.unresolved_terminations ? (
                    <>
                      A further <b>{brief.unresolved_terminations}</b> closed trials here were terminated with no cause recorded in
                      the registry. They are not counted as biological stops, and they are not evidence of absence either: if every
                      one of them were biological, the rate would be{" "}
                      <b>{pct(brief.rate_if_all_unresolved_were_biological)}</b>. The honest headline is the band between the two.
                    </>
                  ) : (
                    <>
                      Every terminated trial in this segment states a cause the classifier could read, so there is no ambiguity band
                      above the headline rate.
                    </>
                  )}
                </p>
              </div>
              <div className="robustCard">
                <div className="robustTitle">Time, not maturity</div>
                <p>
                  A rate over closed trials moves with how mature the cohort is: stops happen sooner than completions, so a young
                  segment reads high. The cumulative incidence above uses every trial from its start date, with completion and
                  non-biological termination as competing events and ongoing trials censored at their last registry update, so it
                  does not.
                  {brief.median_followup_months ? ` Median follow-up here is ${Math.round(brief.median_followup_months)} months.` : ""}
                </p>
              </div>
            </div>
            <p className="fine">
              This segment is one of many screened the same way. Read it as a screen worth checking against the underlying trials,
              not as a tested hypothesis: picking the most striking of many segments is itself a selection effect, and no interval
              here corrects for it.
            </p>
          </section>

          {brief.cohorts.length ? (
            <section className="section">
              <h2>By start cohort</h2>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Trials started</th>
                      <th className="num">Stops</th>
                      <th className="num">Closed</th>
                      <th className="num">Rate</th>
                      <th className="num">95% CI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brief.cohorts.map((c) => (
                      <tr key={c.cohort}>
                        <td>{c.cohort}</td>
                        <td className="num">{c.biological_stops}</td>
                        <td className="num">{c.closed}</td>
                        <td className="num strong">{pct(c.rate)}</td>
                        <td className="num muted">
                          {pct(c.ci95[0])}–{pct(c.ci95[1])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="section">
            <h2>The stopped trials</h2>
            <p className="sectionSub">
              Every row is a trial that stopped early, with the reason exactly as the sponsor filed it.
            </p>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Trial</th>
                    <th>Ph</th>
                    <th>Sponsor</th>
                    <th>Experimental drugs</th>
                    <th>Stopped</th>
                    <th>Type</th>
                    <th>Registry stop reason</th>
                  </tr>
                </thead>
                <tbody>
                  {brief.trials_preview.map((t) => (
                    <tr key={t.nct_id}>
                      <td className="mono">
                        <a className="link" href={t.registry_url} target="_blank" rel="noopener noreferrer">
                          {t.nct_id}
                        </a>
                      </td>
                      <td>{t.phase}</td>
                      <td>
                        {t.sponsor_group}
                        {t.sponsor_ticker ? <span className="tk">{t.sponsor_ticker}</span> : null}
                      </td>
                      <td>{t.drugs}</td>
                      <td className="num">{t.stopped}</td>
                      <td>{t.type}</td>
                      <td className="reason">{t.why_stopped || <span className="muted">no reason recorded</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {brief.trial_count > brief.trials_preview.length ? (
              <p className="fine">
                Showing {brief.trials_preview.length} of {brief.trial_count} stopped trials. The remaining{" "}
                {brief.trial_count - brief.trials_preview.length} are in the PDF below, with the full stop-reason text.
              </p>
            ) : null}
          </section>

          {brief.open_access ? (
            <section className="section" id="pdf">
              <div className="pdfBox">
                <div>
                  <h2>This one is open — no form</h2>
                  <p className="sectionSub">
                    One brief is published in full so the method can be judged before anything is bought: every trial above rather
                    than a sample, the denominator built step by step on the methods page, the programme concentration, the
                    unreadable terminations, and the PDF itself. If the cohort construction does not survive your scrutiny here, it
                    will not survive it anywhere else on this site either.
                  </p>
                  <ul className="list">
                    <li>All {brief.trial_count} stopped trials listed above, with registry links</li>
                    <li>
                      <Link className="link" href="/validation">
                        The full path from the registry to this denominator
                      </Link>
                    </li>
                    <li>No email, no gate</li>
                  </ul>
                </div>
                <div className="pdfActions">
                  {brief.has_pdf ? (
                    <a className="btnPrimary" href={`/briefs/${brief.file_stem}.pdf`} target="_blank" rel="noopener noreferrer">
                      Download the PDF
                    </a>
                  ) : null}
                  <a className="btnGhost" href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent(`Evidence package: ${brief.segment}`)}`}>
                    Ask for this on your own asset
                  </a>
                </div>
              </div>
            </section>
          ) : brief.has_pdf ? (
          <section className="section" id="pdf">
            <div className="pdfBox">
              <div>
                <h2>Get the two-page PDF</h2>
                <p className="sectionSub">
                  The complete brief: every stopped trial with its registry reason, the cohort trend, the sponsors, and the method
                  behind the number. One email, no call.
                </p>
                <ul className="list">
                  <li>All {brief.trial_count} stopped trials in this segment</li>
                  <li>Formatted to forward to a colleague</li>
                  <li>Rebuilt weekly from ClinicalTrials.gov</li>
                </ul>
              </div>

              {status === "done" ? (
                <div className="formCard">
                  <div className="formTitle">Your brief is ready</div>
                  <a className="submit asLink" href={pdfUrl} download>
                    Download the PDF
                  </a>
                  <p className="formFoot">
                    For the dataset behind it,{" "}
                    <Link className="link" href="/data-licensing">
                      see licensing
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <form className="formCard" onSubmit={onSubmit}>
                  <div className="formTitle">Send me the brief</div>
                  <div className="field">
                    <label htmlFor="b-email">Work email</label>
                    <input id="b-email" className="input" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="field">
                    <label htmlFor="b-company">Company or institution</label>
                    <input id="b-company" className="input" name="company" type="text" required autoComplete="organization" />
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
                      I agree to be contacted about the dataset. See our{" "}
                      <Link className="link" href="/privacy">
                        privacy notice
                      </Link>
                      .
                    </span>
                  </label>
                  <button className="submit" type="submit" disabled={status === "sending"}>
                    {status === "sending" ? "Sending…" : "Get the PDF"}
                  </button>
                  {status === "error" ? <div className="formError">{message}</div> : null}
                </form>
              )}
            </div>
          </section>
          ) : null}

          <div className="legal">
            <div>
              <h3>Method</h3>
              <p>
                Denominator: ClinicalTrials.gov interventional Phase {phases} {area} trials started {brief.start_from}–
                {brief.start_to} that have closed (completed or terminated). Numerator: terminated trials whose registry stop reason
                is classified as biological (efficacy, safety or benefit–risk) by Classification V2 — held-out precision 95.5%,
                recall 95.3% (n=600). Drugs are linked to ChEMBL and the NCI Thesaurus, and a trial without a resolved target cannot
                enter a mechanism class. Intervals are Wilson 95%.{" "}
                <Link className="link" href="/validation">
                  How we validate
                </Link>
                .
              </p>
            </div>
            <div>
              <h3>Limits</h3>
              <p>
                Not a failure rate: trials that completed with negative results are not counted, and programmes discontinued after a
                completed trial do not appear. Stop reasons are sponsor-reported and optional, so a sponsor that files nothing looks
                clean here. Rates are proportions over closed trials, not time-to-event estimates, and they are descriptive: the
                segment and its comparison group differ in tumour type, line of therapy, trial size, sponsor and calendar year, so a
                gap is a reason to look, not evidence that the mechanism caused it. Where a trial was stopped for more than one
                reason the table says so rather than picking one. Recent cohorts have fewer closed trials, so their
                rates are less stable. Research signals, not clinical or investment advice. Questions:{" "}
                <a className="link" href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent(brief.segment + " brief")}`}>
                  {LICENSING_EMAIL}
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1000px;
          margin: 0 auto;
        }
        .crumbs {
          font-size: 13px;
          padding: 6px 0 10px;
        }
        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.14;
          font-weight: 900;
          letter-spacing: -0.02em;
          max-width: 24ch;
        }
        .lead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 80ch;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 20px;
        }
        .stat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          padding: 16px 18px;
        }
        .stat b {
          display: block;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }
        .stat span {
          display: block;
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.45;
          color: var(--text-muted);
        }
        .section {
          margin-top: 32px;
        }
        .section h2 {
          margin: 0;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        .sectionSub {
          margin: 6px 0 0;
          font-size: 14px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 78ch;
        }
        .bars {
          display: grid;
          gap: 14px;
          margin-top: 14px;
          max-width: 760px;
        }
        .barRow {
          display: grid;
          gap: 5px;
        }
        .barLabel {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 13.5px;
        }
        .barLabel b {
          font-weight: 850;
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
        .tableWrap {
          margin-top: 14px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          overflow-x: auto;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13.5px;
        }
        th {
          text-align: left;
          font-size: 11.5px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--text-muted);
          padding: 11px 14px;
          border-bottom: 1px solid var(--border);
          white-space: nowrap;
        }
        td {
          padding: 10px 14px;
          border-bottom: 1px solid var(--surface-2);
          vertical-align: top;
          line-height: 1.45;
        }
        tr:last-child td {
          border-bottom: 0;
        }
        .num {
          text-align: right;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .strong {
          font-weight: 850;
        }
        .muted {
          color: var(--text-muted);
        }
        .mono {
          font-family: var(--font-mono);
          font-size: 12.5px;
          white-space: nowrap;
        }
        .reason {
          min-width: 280px;
        }
        .tk {
          margin-left: 6px;
          font-size: 11px;
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 1px 4px;
          color: var(--text-muted);
        }
        .robustGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 14px;
        }
        .robustCard {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          padding: 16px 18px;
        }
        .robustTitle {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .robustCard p {
          margin: 8px 0 0;
          font-size: 13.5px;
          line-height: 1.55;
        }
        @media (max-width: 900px) {
          .robustGrid {
            grid-template-columns: 1fr;
          }
        }
        .fine {
          margin: 12px 0 0;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 92ch;
        }
        .pdfActions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-self: center;
        }
        .btnPrimary,
        .btnGhost {
          border-radius: 12px;
          padding: 11px 18px;
          font-size: 13.5px;
          font-weight: 800;
          text-decoration: none;
          text-align: center;
          white-space: nowrap;
        }
        .btnPrimary {
          background: var(--accent);
          color: #fff;
        }
        .btnGhost {
          background: var(--surface);
          color: var(--text);
          border: 1px solid var(--border);
        }
        .pdfBox {
          margin-top: 14px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
          gap: 24px;
          align-items: start;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          padding: 22px 24px;
        }
        .pdfBox h2 {
          margin: 0;
        }
        .list {
          margin: 14px 0 0;
          padding-left: 18px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .formCard {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 18px;
        }
        .formTitle {
          font-size: 14.5px;
          font-weight: 850;
          margin-bottom: 12px;
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
          padding: 11px 16px;
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
        .legal {
          margin-top: 36px;
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
        @media (max-width: 900px) {
          h1 {
            font-size: 25px;
          }
          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pdfBox,
          .legal {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
