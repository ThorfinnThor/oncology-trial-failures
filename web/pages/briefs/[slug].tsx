// web/pages/briefs/[slug].tsx

import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";

import BriefVsPackage from "@/components/BriefVsPackage";
import PrimaryNav from "@/components/PrimaryNav";
import SampleCallout from "@/components/SampleCallout";
import SalesFunnel from "@/components/SalesFunnel";
import briefsIndex from "@/data/briefs_index.json";
import catalogue from "@/data/evidence_catalogue.json";
import { pluralModality } from "@/lib/modality";
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

  const area = brief.area.toLowerCase();
  const AREA_LABEL: Record<string, string> = {
    "Immunology & Autoimmune": "immunology and autoimmune disease",
    "Psychiatry & Mental Health": "psychiatry",
    "Gastroenterology & Hepatology": "gastroenterology and hepatology",
    "Endocrine & Metabolic": "endocrine and metabolic disease",
  };
  const areaLabel = AREA_LABEL[brief.area] ?? area;
  const phases = brief.phases.join("/");
  // Some classes fail by running to the end and missing, not by stopping. Their brief leads with
  // the completed trials that missed; the stop rate is still shown, second.
  const endpointLed = (brief as any).lead === "endpoints";
  const epLead = (brief as any).endpoints || {};
  const endpointTrials = ((brief as any).endpoint_trials || []) as {
    nct_id: string;
    phase: string;
    sponsor_group: string;
    drugs: string;
    started: string;
    evidence: string;
    results_url: string;
  }[];
  const title = endpointLed
    ? `${brief.segment}: completed trials that missed their endpoint in ${areaLabel}`
    : `${brief.segment} trial stops in ${areaLabel}`;
  const description = endpointLed
    ? `${epLead.missed} of ${epLead.readable} completed Phase ${phases} ${areaLabel} trials of ${brief.segment} with a ` +
      `readable result missed their primary endpoint, across ${epLead.missed_sponsors} sponsors. Trials, sponsors and ` +
      `the posted results included.`
    : `${brief.biological_stops} of ${brief.closed} closed Phase ${phases} ${areaLabel} trials of ${brief.segment} were ` +
      `terminated for an efficacy, safety or benefit–risk reason, against ${pct(brief.baseline_rate)} across ${area}. ` +
      `Trials, sponsors and registry stop reasons included.`;
  const hasReference = Math.abs(brief.reference_rate - brief.baseline_rate) > 1e-9;
  const maxRate = Math.max(brief.rate, brief.reference_rate, brief.baseline_rate) || 1;
  const width = (rate: number) => `${(rate / maxRate) * 100}%`;
  // A class segment can only hold trials whose drug resolved to a target, and those are not a
  // random sample of the area, so the like-for-like comparator is the resolved baseline.
  const comparator: number = brief.baseline_resolved_rate ?? brief.baseline_rate;
  const ratio = comparator ? brief.rate / comparator : 0;
  // The report that extends this brief: same cohort, the rest of the trials.
  const pkg = (catalogue.packages as any[]).find((p) => p.brief_stem === brief.file_stem);
  // Absent in an index built before the endpoint verdicts existed: the block is simply not shown.
  const ep = (brief as any).endpoints as
    | {
        available: boolean;
        completed: number;
        readable: number;
        missed: number;
        met: number;
        mixed: number;
        // Absent in an index built before the disclosure gap was counted.
        results_due?: number;
        results_not_posted?: number;
      }
    | null
    | undefined;
  const sig = (brief as any).failure_signature;
  const attr = (brief as any).stop_attribution;
  const cif = (brief.cumulative_incidence || []) as { months: number; cif: number; ci95: number[]; n_risk: number }[];
  const cif36 = cif.find((h) => h.months === 36);
  const baseCif36 = ((brief.baseline_cumulative_incidence || []) as typeof cif).find((h) => h.months === 36);

  const watchTerms =
    brief.area === "Oncology"
      ? [
          ...new Set(
            ((brief as any).failure_signature?.assets || []).flatMap((a: any) => [
              ...(a.resolved && a.asset ? [String(a.asset)] : []),
              ...(a.target_genes || []),
            ]),
          ),
        ].slice(0, 12) as string[]
      : [];

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

          <h1>{title}</h1>
          {endpointLed ? (
            <>
              <p className="lead strongLead">
                {epLead.missed} of {epLead.readable} completed trials with a readable primary result missed it — across{" "}
                {epLead.missed_sponsors} sponsors and {epLead.missed_molecules} molecules. {epLead.met} met it.
              </p>
              <p className="lead">
                This class fails at the end rather than being stopped: only {brief.biological_stops} of {n(brief.closed)}{" "}
                closed trials were terminated for efficacy or safety ({pct(brief.rate)}), too few for a stop rate to say
                much. So it is read through the sponsors&rsquo; own posted results, each held to the threshold the sponsor
                wrote down. Most completed trials post nothing readable, so the count is a floor, not a rate.
              </p>
            </>
          ) : null}
          {!endpointLed && sig ? <p className="lead strongLead">{sig.sentence}</p> : null}
          {endpointLed ? null : (
          <p className="lead">
            {attr && attr.stops_from_programme_cascade ? (
              <>
                {attr.stops_from_own_data} of the stops were the trial&rsquo;s own verdict and{" "}
                {attr.stops_from_programme_cascade} followed a decision taken elsewhere
                {attr.stops_unclear ? `; ${attr.stops_unclear} cannot be established` : ""}.{" "}
              </>
            ) : null}
            The cohort rate is {pct(brief.rate)} against {pct(comparator)} across {area} trials whose drug resolves to a target —
            the like-for-like comparison, since a mechanism class can only contain those
            {ratio >= 1.5 ? `, ${ratio.toFixed(1)}× that rate` : ""}. A rate counts registry records, and records are not
            experiments: read it together with the molecule count above.
          </p>
          )}

          <div className="stats">
            {endpointLed ? (
              <div className="stat">
                <b>
                  {epLead.missed} of {epLead.readable}
                </b>
                <span>completed trials with a readable primary result missed it</span>
              </div>
            ) : null}
            {endpointLed ? null : (
            <div className="stat">
              <b>{sig ? sig.molecules : "—"}</b>
              <span>
                distinct molecules behind {brief.biological_stops} stopped trials
                {sig && sig.shared_modality ? `, all ${pluralModality(sig.shared_modality)}` : ""}
              </span>
            </div>
            )}
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

          <SalesFunnel current="brief" title="You are reading the free brief — the next two steps are free too" />

          {ep && ep.available ? (
            // The second number, and kept visibly apart from the rate block above. A stop and a
            // miss are different events; putting them in one figure would be the easiest way to
            // make this page say something it cannot support.
            <div className="endp">
              <b>{ep.readable ? `${ep.missed} of ${ep.readable}` : "—"}</b>
              <span>
                <strong>Completed and missed the primary endpoint.</strong>{" "}
                {ep.readable ? (
                  <>
                    Of {n(ep.completed)} completed trials in this segment, {n(ep.readable)} posted a primary result on
                    ClinicalTrials.gov that can be read — the sponsor&apos;s own comparison held to the sponsor&apos;s own
                    threshold, or its statement that the endpoint was missed: {ep.missed} missed and {ep.met} met
                    {ep.mixed ? `, ${ep.mixed} split across co-primary endpoints` : ""}. Counted separately and never in
                    the rate above; a floor, not a rate.
                  </>
                ) : (
                  <>
                    {ep.completed
                      ? `None of the ${n(ep.completed)} completed trials in this segment posted a primary result that can be read, so nothing can be said here either way.`
                      : "No trial in this segment has completed yet, so there is no posted result to read either way."}
                  </>
                )}
                {ep.results_due ? (
                  <>
                    {" "}
                    {n(ep.results_not_posted ?? 0)} of the {n(ep.results_due)} completed trials that finished more than a
                    year ago have posted no results at all — a gap in what can be known, not a sign of failure.
                  </>
                ) : null}
              </span>
            </div>
          ) : null}

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

          {!endpointLed && sig && sig.assets && sig.assets.length ? (
            <section className="section">
              <h2>The molecules behind the number</h2>
              <p className="sectionSub">
                {sig.stops} stopped trials are {sig.molecules}{" "}
                {sig.molecules === 1 ? "development programme" : "development programmes"}. Whether this history applies to an
                asset under review depends on whether it shares the molecule, the target, the population or the endpoint.
              </p>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Molecule</th>
                      <th>Modality</th>
                      <th>Sponsor</th>
                      <th className="num">Stopped trials</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sig.assets.map((a: any) => (
                      <tr key={a.asset + a.trials.join()}>
                        <td className="strong">{a.asset}</td>
                        <td className="muted">{a.modalities.join(", ") || "—"}</td>
                        <td className="muted">{a.sponsors.join(", ")}</td>
                        <td className="num">{a.trial_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

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
                <div className="robustTitle">What is in this class</div>
                <p>
                  {(brief as any).composition ? (
                    <>
                      {(brief as any).composition.distinct_assets} distinct experimental drugs across{" "}
                      {n(brief.trials_in_segment)} trials
                      {Object.keys((brief as any).composition.modalities || {}).length ? (
                        <>
                          {" "}
                          ({Object.entries((brief as any).composition.modalities)
                            .slice(0, 3)
                            .map(([k, v]) => `${String(k).toLowerCase()} ${v}`)
                            .join(", ")})
                        </>
                      ) : null}
                      . A class groups drugs by what they act on, and a pathway label is not automatically one risk class — check
                      that the grouping is one you would make before reading the rate as a property of the mechanism.
                    </>
                  ) : (
                    "Composition not available for this segment."
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
              {typeof (brief as any).q_value_by === "number" ? (
                <>
                  Screened alongside {(brief as any).family_size} other segments in {area},{" "}
                  {(brief as any).survives_fdr_10pct ? (
                    <>
                      the rate <b>stays unusual</b> after a 10% false-discovery correction (q=
                      {(brief as any).q_value_by.toPrecision(2)}, Benjamini–Yekutieli). It is still a screen over registry
                      records rather than a controlled comparison, but the gap is not explained by having looked at many
                      classes.
                    </>
                  ) : (
                    <>
                      the rate is within what screening that many classes could produce (q=
                      {(brief as any).q_value_by.toPrecision(2)}), so it is not by itself a claim that this class stops more
                      often. The record is a different matter: the molecules and trials listed here failed, and for a molecule
                      against the same target they are the precedent that matters, whatever the rate.
                    </>
                  )}
                </>
              ) : (
                <>
                  Picking the most striking of many segments is itself a selection effect, and no interval here corrects for it.
                  Read this as a screen worth checking against the underlying trials.
                </>
              )}
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

          {endpointLed && endpointTrials.length ? (
            <section className="section">
              <h2>The completed trials that missed</h2>
              <p className="sectionSub">
                Each ran to the end. The right-hand column is what the verdict was read from: the sponsor&rsquo;s own
                sentence, or the posted comparison with the threshold it was held to.
              </p>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Trial</th>
                      <th>Ph</th>
                      <th>Sponsor</th>
                      <th>Experimental drugs</th>
                      <th>Started</th>
                      <th>What the posted result says</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpointTrials.map((t) => (
                      <tr key={t.nct_id}>
                        <td className="mono">
                          <a className="link" href={t.results_url} target="_blank" rel="noopener noreferrer">
                            {t.nct_id}
                          </a>
                        </td>
                        <td>{t.phase}</td>
                        <td>{t.sponsor_group}</td>
                        <td>{t.drugs}</td>
                        <td className="num">{t.started}</td>
                        <td className="reason">{t.evidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {epLead.missed > endpointTrials.length ? (
                <p className="fine">
                  Showing {endpointTrials.length} of {epLead.missed}. The diligence report lists every one, with the numbers
                  or the sentence each verdict was read from.
                </p>
              ) : null}
            </section>
          ) : null}

          {brief.trials_preview.length ? (
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
                {brief.trial_count - brief.trials_preview.length} are available in the diligence report.
              </p>
            ) : null}
          </section>
          ) : null}

          <section className="section" id="pdf">
            <div className="pdfBox">
              <div>
                <h2>Take it with you</h2>
                <p className="sectionSub">
                  The same brief as a document: every molecule behind the stops, the comparison, selected trials and the
                  method. No form — if the work does not stand up to reading, an email address is worth nothing anyway.
                </p>
                <ul className="list">
                  <li>Rebuilt weekly from ClinicalTrials.gov</li>
                  <li>Formatted to forward to a colleague</li>
                  <li>
                    Every number traces to{" "}
                    <Link className="link" href="/validation">
                      the cohort it was built from
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="pdfActions">
                {brief.has_pdf ? (
                  <a className="btnPrimary" href={`/briefs/${brief.file_stem}.pdf`} target="_blank" rel="noopener noreferrer">
                    Download the PDF
                  </a>
                ) : null}
                <a className="btnGhost" href={`/briefs/${brief.file_stem}.html`} target="_blank" rel="noopener noreferrer">
                  Open as a web page
                </a>
                {pkg ? null : (
                  <a
                    className="btnGhost"
                    href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent(`Diligence report: ${brief.segment}`)}`}
                  >
                    Ask for this on your own asset
                  </a>
                )}
              </div>
            </div>
          </section>

          <SampleCallout />

          {pkg ? <BriefVsPackage pkg={pkg} briefSlug={null} emphasis="brief" /> : null}

          {watchTerms.length ? (
            <section className="section" id="watch">
              <div className="watchBox">
                <div>
                  <h2>Hear about the next one</h2>
                  <p className="sectionSub">
                    This brief is a snapshot. The registry keeps moving: a sponsor changes a status, posts a stop reason, or
                    pushes a completion date. Put the molecules and targets behind these stops on a watchlist and you get one
                    mail in the week any of them moves — and nothing in the weeks they do not.
                  </p>
                  <div className="watchTerms">
                    {watchTerms.map((term) => (
                      <span key={term} className="watchTerm">
                        {term}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pdfActions">
                  <Link className="btnPrimary" href="/newsletter">
                    Get the fortnightly mail
                  </Link>
                  <span className="watchFine">Free, no account, one click to stop.</span>
                </div>
              </div>
            </section>
          ) : null}

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
        .endp {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: baseline;
          margin: 14px 0 0;
          padding: 14px 18px;
          border: 1px solid var(--border);
          border-left: 3px solid #475569;
          border-radius: 12px;
          background: var(--surface);
        }
        .endp > b {
          font-size: 24px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .endp span {
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-muted);
        }
        .endp strong {
          color: var(--text);
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
        .strongLead {
          font-weight: 700;
          color: var(--text);
        }
        .robustGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
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
        :global(.btnPrimary),
        :global(.btnGhost) {
          border-radius: 12px;
          padding: 11px 18px;
          font-size: 13.5px;
          font-weight: 800;
          text-decoration: none;
          text-align: center;
          white-space: nowrap;
        }
        :global(.btnPrimary) {
          background: var(--accent);
          color: #fff;
        }
        :global(.btnGhost) {
          background: var(--surface);
          color: var(--text);
          border: 1px solid var(--border);
        }
        .watchBox {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(220px, 0.42fr);
          gap: 24px;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 22px 24px;
        }
        .watchTerms {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 14px;
        }
        .watchTerm {
          font-size: 12px;
          font-weight: 700;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 4px 10px;
          color: var(--text-muted);
          background: #fff;
        }
        .watchFine {
          font-size: 12px;
          color: var(--text-muted);
          text-align: center;
        }
        @media (max-width: 860px) {
          .watchBox {
            grid-template-columns: minmax(0, 1fr);
          }
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
