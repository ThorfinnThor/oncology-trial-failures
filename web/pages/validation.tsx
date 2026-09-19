// web/pages/validation.tsx

import Head from "next/head";
import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";
import validation from "@/data/validation_v2.json";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/validation`;
const TITLE = "How the labels were validated — held-out sample, blind annotation, confusion matrix";
const DESCRIPTION =
  "The full evidence behind the classification quality figures: how the held-out sample was drawn, who annotated it blind, how disagreements were adjudicated, per-class precision and the confusion matrix.";

const OUTCOMES = [
  "BIOLOGICAL_FAILURE",
  "MIXED_CAUSES",
  "NON_BIOLOGICAL",
  "NON_FAILURE_TRANSITION",
  "CAUSE_NOT_STATED",
  "UNKNOWN",
] as const;

const pct = (v: number | null | undefined, digits = 1) => (typeof v === "number" ? `${(v * 100).toFixed(digits)}%` : "—");
const n = (v: number) => v.toLocaleString("en-US");
const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export default function ValidationPage() {
  const v: any = validation;
  const est = v.estimates;
  const ci = v.estimates_ci95;
  const perOutcome: Record<string, any> = v.per_predicted_outcome;
  const confusion: { predicted: string; reference: string; count: number }[] = v.confusion_pred_vs_ref;

  const headline = [
    ["Biological failure — precision", est.biological_precision, ci.biological_precision],
    ["Biological failure — recall", est.biological_recall, ci.biological_recall],
    ["Biological domain — precision", est.biological_domain_precision, ci.biological_domain_precision],
    ["Biological domain — recall", est.biological_domain_recall, ci.biological_domain_recall],
    ["Stated cause — precision", est.assertion_outcome_precision, ci.assertion_outcome_precision],
    ["No material disagreement", est.assertion_no_material_disagreement, ci.assertion_no_material_disagreement],
  ] as const;

  const cell = (predicted: string, reference: string) =>
    confusion.find((c) => c.predicted === predicted && c.reference === reference)?.count ?? 0;
  const rowTotal = (predicted: string) =>
    confusion.filter((c) => c.predicted === predicted).reduce((sum, c) => sum + c.count, 0);

  return (
    <>
      <Head>
        <title>{`${TITLE} — Clinical Trial Failures`}</title>
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
            <PrimaryNav active="methods" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <div className="eyebrow">Label quality</div>
          <h1>How the labels were validated</h1>
          <p className="lead">
            Every rate on this site rests on one judgement: whether a sponsor&apos;s free-text stop reason describes a biological
            cause. Two numbers are not evidence that the judgement is sound, so this is the whole procedure — the sample, the
            annotators, the adjudication, the per-class results and the confusion matrix. Classifier {v.classifier_version},
            dataset {v.dataset_version}, sample of {v.sample_size}.
          </p>

          <section className="section">
            <h2>Headline estimates</h2>
            <p className="sectionSub">
              Weighted back to the eligible population, so a class that was over-sampled does not distort the estimate. Intervals
              are 95%.
            </p>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Measure</th>
                    <th className="num">Estimate</th>
                    <th className="num">95% CI</th>
                  </tr>
                </thead>
                <tbody>
                  {headline.map(([name, value, interval]) => (
                    <tr key={name as string}>
                      <td>{name as string}</td>
                      <td className="num strong">{pct(value as number)}</td>
                      <td className="num muted">
                        {pct((interval as number[])[0])}–{pct((interval as number[])[1])}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine">
              &quot;Biological failure&quot; is the label the discontinuation rates depend on. &quot;Biological domain&quot; counts a
              mixed-cause trial with a biological component as biological, which is how the rates treat it. &quot;Stated cause&quot;
              is the stricter test of whether the exact cause was right, and it is lower — {pct(est.assertion_outcome_precision)} —
              because distinguishing, say, a sponsor decision from an unstated futility call is genuinely hard.
            </p>
          </section>

          <section className="section">
            <h2>How the sample was drawn</h2>
            <div className="grid2">
              <div className="card pad">
                <div className="cardTitle">Population and exclusions</div>
                <ul className="list">
                  <li>
                    <b>{n(v.population.records_total)}</b> classified stopped trials in the release
                  </li>
                  <li>
                    −{n(v.population.excluded_records.reviewed_exact)} already human-reviewed (their labels are not the
                    classifier&apos;s own)
                  </li>
                  <li>
                    −{n(v.population.excluded_records.tuning_or_audit_overlap)} used while building or auditing the rules, excluded
                    by normalised text hash so no tuning example can be scored
                  </li>
                  <li>−{n(v.population.excluded_records.empty_stop_reason)} with no stop-reason text to judge</li>
                  <li>
                    = <b>{n(v.population.eligible_records)}</b> eligible records
                  </li>
                </ul>
                <p className="fine">
                  Sampling is stratified by predicted outcome with a fixed seed ({v.sampling.seed}), over unique texts rather than
                  records, so one boilerplate sentence repeated across a sponsor&apos;s trials cannot be scored many times.
                </p>
              </div>
              <div className="card pad">
                <div className="cardTitle">Annotation and adjudication</div>
                <ul className="list">
                  {v.annotation.annotators.map((a: any) => (
                    <li key={a.id}>
                      {a.id.replace("_", " ")}: {a.model_family} — blind to the classifier&apos;s label
                    </li>
                  ))}
                  <li>
                    Disagreements adjudicated by {v.annotation.adjudicator.model_family}, also blind ({v.annotation.adjudicated}{" "}
                    records)
                  </li>
                  <li>
                    Agreement before adjudication: <b>{pct(v.annotation.outcome_agreement)}</b> on outcome, κ ={" "}
                    {v.annotation.outcome_kappa}
                  </li>
                  <li>
                    Agreement on outcome <i>and</i> primary reason: {pct(v.annotation.outcome_and_primary_agreement)}
                  </li>
                </ul>
                <p className="fine">
                  Annotators worked from written guidelines, not intuition, and saw only the stop-reason text — no drug, sponsor or
                  outcome. The guidelines ship with the dataset.
                </p>
              </div>
            </div>
          </section>

          <section className="section">
            <h2>Class prevalence and per-class precision</h2>
            <p className="sectionSub">
              How common each predicted class is in the eligible population, how many unique texts were sampled from it, and how
              often the prediction held up.
            </p>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Predicted outcome</th>
                    <th className="num">Eligible texts</th>
                    <th className="num">Sampled</th>
                    <th className="num">Outcome precision</th>
                    <th className="num">95% CI</th>
                    <th className="num">Outcome + cause</th>
                  </tr>
                </thead>
                <tbody>
                  {OUTCOMES.filter((o) => perOutcome[o]).map((o) => {
                    const row = perOutcome[o];
                    return (
                      <tr key={o}>
                        <td>{label(o)}</td>
                        <td className="num muted">{n(row.eligible_texts)}</td>
                        <td className="num muted">{row.sampled_texts}</td>
                        <td className="num strong">{pct(row.outcome_precision)}</td>
                        <td className="num muted">
                          {pct(row.outcome_precision_ci95[0])}–{pct(row.outcome_precision_ci95[1])}
                        </td>
                        <td className="num muted">{pct(row.outcome_and_primary_reason_precision)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <h2>Confusion matrix</h2>
            <p className="sectionSub">
              Rows are what the classifier predicted, columns what the blind annotators agreed the text actually says. Counts are
              sampled texts.
            </p>
            <div className="tableWrap">
              <table className="matrix">
                <thead>
                  <tr>
                    <th>Predicted ↓ / reference →</th>
                    {OUTCOMES.map((o) => (
                      <th key={o} className="num">
                        {label(o)}
                      </th>
                    ))}
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {OUTCOMES.map((predicted) => (
                    <tr key={predicted}>
                      <td>{label(predicted)}</td>
                      {OUTCOMES.map((reference) => {
                        const count = cell(predicted, reference);
                        const diagonal = predicted === reference;
                        return (
                          <td key={reference} className={`num ${diagonal ? "diag" : count ? "" : "zero"}`}>
                            {count || "·"}
                          </td>
                        );
                      })}
                      <td className="num muted">{rowTotal(predicted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="fine">
              {v.error_count_outcome_or_primary} of {v.sample_size} sampled texts differ from the reference on outcome or primary
              cause. Most sit between &quot;cause not stated&quot; and &quot;unknown&quot; — categories that do not affect a
              discontinuation rate, since neither counts as a biological stop.
            </p>
          </section>

          <section className="section">
            <h2>What this does not establish</h2>
            <div className="grid2">
              <div className="card pad">
                <div className="cardTitle">Bounds of the claim</div>
                <ul className="list">
                  <li>
                    The reference labels are LLM annotations against written guidelines, not clinician adjudication. They measure
                    whether the text was read correctly, not whether the sponsor told the truth.
                  </li>
                  <li>
                    No temporal hold-out: the sample is drawn from the same release the classifier was built against, so it does
                    not test performance on future stop-reason language.
                  </li>
                  <li>No external benchmark: there is no independent gold-standard corpus of registry stop reasons to compare to.</li>
                </ul>
              </div>
              <div className="card pad">
                <div className="cardTitle">Why it still supports the rates</div>
                <ul className="list">
                  <li>
                    The rates depend on one binary call — biological or not — and that call is the strongest measured:{" "}
                    {pct(est.biological_precision)} precision, {pct(est.biological_recall)} recall.
                  </li>
                  <li>
                    Tuning examples are excluded by text hash, so the estimate is not inflated by texts the rules were written
                    against.
                  </li>
                  <li>
                    Every trial behind every rate is listed with its NCT ID, so any number can be checked against the registry
                    rather than taken on trust.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <div className="legal">
            <p>
              Full method and rule design: <Link className="link" href="/methods">methods</Link>. The labelling guidelines, the
              blind sample, the reference labels and this metrics file ship with the licensed dataset, so a licensee can recompute
              every figure on this page. <Link className="link" href="/data-licensing">Data &amp; licensing</Link>.
            </p>
          </div>
        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1060px;
          margin: 0 auto;
        }
        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent);
          padding-top: 6px;
        }
        h1 {
          margin: 8px 0 0;
          font-size: 30px;
          line-height: 1.14;
          font-weight: 900;
          letter-spacing: -0.02em;
        }
        .lead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 82ch;
        }
        .section {
          margin-top: 34px;
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
          max-width: 82ch;
        }
        .grid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 14px;
        }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
        }
        .pad {
          padding: 18px 20px;
        }
        .cardTitle {
          font-size: 14.5px;
          font-weight: 850;
        }
        .list {
          margin: 10px 0 0;
          padding-left: 18px;
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .list li {
          margin: 5px 0;
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
          white-space: nowrap;
        }
        tr:last-child td {
          border-bottom: 0;
        }
        .num {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .strong {
          font-weight: 850;
        }
        .muted {
          color: var(--text-muted);
        }
        .matrix .diag {
          font-weight: 850;
          background: rgba(79, 70, 229, 0.08);
        }
        .matrix .zero {
          color: rgba(15, 23, 42, 0.3);
        }
        .fine {
          margin: 12px 0 0;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 94ch;
        }
        .legal {
          margin-top: 36px;
          padding-top: 18px;
          border-top: 1px solid var(--border);
        }
        .legal p {
          margin: 0;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 94ch;
        }
        @media (max-width: 900px) {
          h1 {
            font-size: 25px;
          }
          .grid2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
