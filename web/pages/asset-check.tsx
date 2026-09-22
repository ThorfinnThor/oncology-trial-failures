// web/pages/asset-check.tsx
//
// The question every visitor actually arrives with — has something like my molecule already
// failed — asked directly, for free, before anything is sold.
//
// What comes back is counts: how many of the molecules that failed in a cohort share this one's
// target, its pathway, or only its modality, and how often trials of that class stopped early.
// The names of those molecules are what the package is for. Anyone can tell from this whether the
// answer is worth a hundred euros, which is the only honest way to sell it.

import Head from "next/head";
import Link from "next/link";
import { FormEvent, useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import { PACKAGE_PRICE } from "@/components/BriefVsPackage";
import catalogue from "@/data/evidence_catalogue.json";
import { LICENSING_EMAIL } from "@/lib/licensing";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/asset-check`;
const TITLE = "Asset check — has a molecule like yours already been stopped?";
const DESCRIPTION =
  "Name a molecule. We say how many drugs that share its target, its pathway or its modality were stopped early in trials, in which mechanism classes, and how that compares with the disease area. Free.";

const EXAMPLES = ["osimertinib", "PD-L1", "HER2 ADC", "KRAS", "lecanemab", "BCMA CAR-T"];

type Match = {
  cohort: string;
  area: string;
  /** Null where no rate was published for this class — too few closed trials to put one on. */
  rate: number | null;
  /** Null where there is no package to sell for this class. */
  slug: string | null;
  counts: { total_in_cohort: number; closed: number; stopped: number; still_open: number };
  molecules: number;
  same_target_and_modality: number;
  same_target: number;
  same_pathway: number;
  same_modality_only: number;
  by: "class" | "molecule";
  best: "closest" | "related" | "weak" | "distant" | "unknown" | null;
};

type Result =
  | {
      ok: true;
      resolved: true;
      asset: { kind: "molecule" | "target"; name: string; note: string; chembl_id: string; modality: string; target_genes: string[] };
      matches: Match[];
    }
  | { ok: true; resolved: false; query: string; message: string; suggestions: { label: string; kind: string }[] };

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const n = (v: number) => v.toLocaleString("en-US");

const BEST_LABEL: Record<string, string> = {
  closest: "Same target, same modality",
  related: "Related",
  weak: "Same modality only",
  distant: "Different hypothesis",
  unknown: "Cannot be compared",
};

export default function AssetCheckPage() {
  const [status, setStatus] = useState<"idle" | "checking" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [value, setValue] = useState("");
  const [order, setOrder] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [orderMessage, setOrderMessage] = useState("");
  const [accessUrl, setAccessUrl] = useState("");

  async function check(asset: string) {
    if (!asset.trim()) return;
    setStatus("checking");
    setMessage("");
    try {
      const response = await fetch(`/api/asset-check?asset=${encodeURIComponent(asset.trim())}`);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not check that molecule.");
      setResult(data as Result);
      setStatus("done");
    } catch (error: any) {
      setStatus("error");
      setMessage(error?.message || "Could not check that molecule. Please try again.");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrder("idle");
    setAccessUrl("");
    void check(value);
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setOrder("sending");
    setOrderMessage("");
    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), asset: resolved?.asset.name || value }),
      });
      const data = await response.json();
      if (!data.ok) throw new Error(data.error || "Could not complete the order.");
      setAccessUrl(data.url || "");
      setOrderMessage(data.message || "");
      setOrder("done");
    } catch (error: any) {
      setOrder("error");
      setOrderMessage(error?.message || "Could not complete the order. Please try again.");
    }
  }

  const resolved = result && result.resolved ? result : null;
  const matches = resolved ? resolved.matches : [];
  // Sharing only a modality is not a precedent: almost every oncology cohort contains a small
  // molecule, so showing thirty-five cards would bury the four that mean something. The weak ones
  // are counted in one line instead of each being given the weight of a card.
  // A class the molecule belongs to is always worth showing, even when nothing in it resolved to
  // a molecule we can compare — "we track this, four trials terminated, none for a reason we can
  // read" is an answer. Sharing only a modality is not, and goes in the one-line tail.
  const strong = matches.filter((m) => m.by === "class" || m.best === "closest" || m.best === "related");
  const modalityOnly = matches.filter((m) => m.by !== "class" && m.best === "weak");
  // What €99 covers: a shared target, not a shared pathway. The price says so on the pricing page,
  // and a promise that is wider in the code than on the page is one nobody can check.
  const withTarget = matches.filter((m) => m.slug && m.same_target_and_modality + m.same_target > 0);

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
            <PrimaryNav active="asset-check" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <section className="hero">
            <div className="eyebrow">Asset check · free</div>
            <h1>Has something like yours already been stopped?</h1>
            <p className="heroLead">
              Name a molecule, a target, a gene or a mechanism — <b>osimertinib</b>, <b>PD-L1</b>, <b>ERBB2</b>,{" "}
              <b>HER2 ADC</b>. We resolve what it acts on and compare it against every drug behind a trial that was
              stopped early for an efficacy, safety or benefit–risk reason, across {catalogue.package_count} mechanism
              classes in oncology, neurology and immunology. You get the counts and the rates now, free. The names of
              those molecules and the trials behind them are what a package costs {PACKAGE_PRICE}.
            </p>

            <form className="ask" onSubmit={onSubmit}>
              <input
                className="input big"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Molecule, target, gene or mechanism class"
                aria-label="Molecule, target or mechanism"
                autoComplete="off"
              />
              <button className="submit" type="submit" disabled={status === "checking"}>
                {status === "checking" ? "Checking…" : "Check it"}
              </button>
            </form>
            <div className="examples">
              <span>Try</span>
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setValue(example);
                    void check(example);
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
            {status === "error" ? <p className="err">{message}</p> : null}
          </section>

          {result && !result.resolved ? (
            <section className="section">
              <div className="card note">
                <h2>{result.suggestions?.length ? "Did you mean" : "Not in the index"}</h2>
                <p>{result.message}</p>
                {result.suggestions?.length ? (
                  <div className="suggestions">
                    {result.suggestions.map((s) => (
                      <button
                        key={`${s.kind}:${s.label}`}
                        type="button"
                        className="chip"
                        onClick={() => {
                          setValue(s.label);
                          void check(s.label);
                        }}
                      >
                        {s.label}
                        <span className="chipKind">{s.kind}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className="fine">
                  <a className="link" href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent(`Asset check: ${result.query}`)}`}>
                    Send us the target and modality
                  </a>{" "}
                  and we will run the same comparison by hand — it costs us a minute and tells you whether there is
                  anything to buy.
                </p>
              </div>
            </section>
          ) : null}

          {resolved ? (
            <section className="section">
              <div className="assetLine">
                <b>{resolved.asset.name}</b>
                <span>
                  {resolved.asset.note}
                  {resolved.asset.chembl_id ? ` · ChEMBL ${resolved.asset.chembl_id}` : ""}
                </span>
              </div>

              {strong.length === 0 ? (
                <div className="card note">
                  <h2>Nothing in our data looks like it</h2>
                  <p>
                    No mechanism class we cover contains a stopped molecule that shares this one&rsquo;s target or its
                    pathway.
                    {modalityOnly.length
                      ? ` ${modalityOnly.length} ${modalityOnly.length === 1 ? "cohort has" : "cohorts have"} failures that share only its modality, which says something about how hard the modality is and nothing about this target.`
                      : ""}{" "}
                    That is a real answer and it is worth having: there is no precedent here to argue with, and no
                    package of ours would tell you otherwise.
                  </p>
                </div>
              ) : (
                <>
                  <div className="sectionHead">
                    <h2>
                      {strong.length} {strong.length === 1 ? "cohort" : "cohorts"} we can say something about
                    </h2>
                    <span className="count">closest first</span>
                  </div>
                  <p className="sectionSub">
                    Each row is a mechanism class we have already built. &ldquo;Same target, same modality&rdquo; is the
                    history you would have to answer for in a diligence meeting; &ldquo;same pathway&rdquo; is the same
                    bet placed on a different protein.
                  </p>

                  <div className="matches">
                    {strong.map((m) => (
                      <div key={m.slug} className={`match m-${m.best}`}>
                        <div className="matchTop">
                          <div>
                            <div className="matchArea">{m.area}</div>
                            <div className="matchName">{m.cohort}</div>
                          </div>
                          <span className={`verdict v-${m.best || "tracked"}`}>
                          {m.best ? BEST_LABEL[m.best] : "We track this class"}
                        </span>
                        </div>

                        <div className="matchRate">
                          {m.rate !== null ? (
                            <>
                              <b>{pct(m.rate)}</b>
                              <span>
                                of {n(m.counts.closed)} closed trials stopped early · {n(m.counts.total_in_cohort)} in
                                the cohort, {n(m.counts.still_open)} still running
                              </span>
                            </>
                          ) : (
                            <span className="noRate">
                              <b>
                                {m.counts.stopped} of {n(m.counts.closed)}
                              </b>{" "}
                              closed trials stopped early — too few to publish a rate on, so we do not quote one.{" "}
                              {n(m.counts.total_in_cohort)} trials in the cohort, {n(m.counts.still_open)} still
                              running.
                            </span>
                          )}
                        </div>

                        <div className="bars">
                          {m.same_target_and_modality > 0 ? (
                            <div className="bar b1">
                              <b>{m.same_target_and_modality}</b> same target and modality
                            </div>
                          ) : null}
                          {m.same_target > 0 ? (
                            <div className="bar b2">
                              <b>{m.same_target}</b> same target, other modality
                            </div>
                          ) : null}
                          {m.same_pathway > 0 ? (
                            <div className="bar b3">
                              <b>{m.same_pathway}</b> same pathway
                            </div>
                          ) : null}
                          {m.same_modality_only > 0 ? (
                            <div className="bar b4">
                              <b>{m.same_modality_only}</b> same modality only
                            </div>
                          ) : null}
                          <div className="bar b0">
                            {m.molecules > 0 ? (
                              <>
                                <b>{m.molecules}</b> molecules behind {m.counts.stopped} stopped trials
                              </>
                            ) : (
                              <>no molecule behind a stop here could be resolved, so nothing to compare against</>
                            )}
                          </div>
                        </div>

                        {m.slug ? (
                          <Link className="matchCta" href={`/packages/${m.slug}`}>
                            Which molecules, and what stopped them →
                          </Link>
                        ) : (
                          <span className="matchNone">
                            No package: {m.counts.closed < 10
                              ? "too few closed trials to build one on"
                              : "not enough stops with a cause we can read"}
                            . The trials are in the dataset —{" "}
                            <a className="link" href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent(`Cohort: ${m.cohort}`)}`}>
                              ask and we will say what the data can answer
                            </a>
                            .
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {modalityOnly.length ? (
                    <p className="alsoRan">
                      A further <b>{modalityOnly.length}</b> {modalityOnly.length === 1 ? "cohort has" : "cohorts have"}{" "}
                      failures that share only this molecule&rsquo;s modality and nothing else. That is worth knowing
                      about the modality in this disease and is not a precedent for this target, so it is not listed
                      here.{" "}
                      <Link className="link" href="/packages">
                        All {catalogue.package_count} cohorts
                      </Link>
                    </p>
                  ) : null}

                  {withTarget.length ? (
                  <div className="buy">
                    {order === "done" ? (
                      <div>
                        <div className="buyTitle">Ready</div>
                        <p className="buySub">{orderMessage}</p>
                        <Link className="buyCta" href={accessUrl}>
                          Open your access
                        </Link>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="buyTitle">
                            Get the {withTarget.length} {withTarget.length === 1 ? "package" : "packages"} that share
                            its target — {PACKAGE_PRICE}
                          </div>
                          <p className="buySub">
                            Every cohort above where a molecule that failed acts on the same target, each in full: all
                            trials, the cohort rules, the attribution, the time-to-event curve — and each one opening
                            with {resolved.asset.name} already compared against the molecules that failed there. One
                            link, current for a year.
                          </p>
                        </div>
                        <form className="buyForm" onSubmit={placeOrder}>
                          <input
                            className="input"
                            name="email"
                            type="email"
                            required
                            placeholder="Work email"
                            aria-label="Work email"
                            autoComplete="email"
                          />
                          <input
                            className="input"
                            name="company"
                            type="text"
                            required
                            placeholder="Company or institution"
                            aria-label="Company or institution"
                            autoComplete="organization"
                          />
                          <input
                            name="website"
                            type="text"
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                            style={{ position: "absolute", left: "-9999px" }}
                          />
                          <button className="submit" type="submit" disabled={order === "sending"}>
                            {order === "sending" ? "Preparing…" : "Get them"}
                          </button>
                          {order === "error" ? <div className="buyError">{orderMessage}</div> : null}
                        </form>
                      </>
                    )}
                  </div>
                  ) : null}

                  <p className="fine">
                    What is withheld here is deliberate and small: the names of the molecules, the trials behind each,
                    and whether a stop was that trial&rsquo;s own result or a programme decision taken elsewhere. That is
                    the package, at {PACKAGE_PRICE}, and it opens with this comparison already run for your molecule.
                    The brief for each class is free either way.
                  </p>
                </>
              )}
            </section>
          ) : null}

          {!result ? (
            <section className="section">
              <div className="how">
                <div className="step">
                  <h3>What you can type</h3>
                  <p>
                    A molecule by name, INN, brand or research code; a gene symbol; the short name a target goes by; a
                    mechanism class; or a target with a modality, like <code>EGFR antibody</code>. If nothing matches we
                    offer what would have.
                  </p>
                </div>
                <div className="step">
                  <h3>What is not</h3>
                  <p>
                    Patient population, line of therapy, dose, biomarker selection, endpoint. Those usually decide
                    whether a historical failure transfers, and no structural comparison can see them.
                  </p>
                </div>
                <div className="step">
                  <h3>What it is not saying</h3>
                  <p>
                    That your asset will fail. A rate counts registry records: a sponsor abandoning one drug closes
                    every trial of it at once. The package separates those.
                  </p>
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
        .hero {
          padding: 14px 0 0;
        }
        .eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent);
        }
        h1 {
          margin: 10px 0 0;
          font-size: 34px;
          line-height: 1.12;
          font-weight: 900;
          letter-spacing: -0.022em;
          max-width: 20ch;
        }
        .heroLead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 78ch;
        }
        .ask {
          display: flex;
          gap: 10px;
          margin-top: 22px;
          flex-wrap: wrap;
        }
        .big {
          flex: 1 1 320px;
          min-width: 0;
          font-size: 16px;
          padding: 13px 15px;
        }
        .submit {
          background: var(--accent);
          color: #fff;
          border: 0;
          border-radius: 12px;
          padding: 13px 24px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          font-family: inherit;
        }
        .submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .examples {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
        }
        .examples span {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .chip {
          border: 1px solid var(--border);
          background: var(--surface);
          color: inherit;
          border-radius: 999px;
          padding: 5px 11px;
          font-size: 12.5px;
          font-weight: 650;
          font-family: inherit;
          cursor: pointer;
        }
        .chip:hover {
          border-color: rgba(79, 70, 229, 0.45);
        }
        .chipKind {
          margin-left: 6px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          opacity: 0.55;
        }
        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }
        .err {
          margin-top: 12px;
          color: #b91c1c;
          font-size: 13.5px;
        }

        .section {
          margin-top: 30px;
        }
        .sectionHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
        }
        .section h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        .count {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
        .sectionSub {
          margin: 6px 0 0;
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 84ch;
        }
        .note {
          padding: 20px 22px;
        }
        .note h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 900;
        }
        .note p {
          margin: 8px 0 0;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-muted);
        }

        .assetLine {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 10px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 18px;
        }
        .assetLine b {
          font-size: 18px;
          font-weight: 900;
        }
        .assetLine span {
          font-size: 13px;
          color: var(--text-muted);
        }

        .matches {
          display: grid;
          gap: 12px;
          margin-top: 16px;
        }
        .match {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px 18px;
        }
        .m-closest {
          border-color: rgba(154, 52, 18, 0.35);
          background: rgba(154, 52, 18, 0.04);
        }
        .matchTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }
        .matchArea {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .matchName {
          margin-top: 4px;
          font-size: 17px;
          font-weight: 850;
          line-height: 1.25;
        }
        .verdict {
          font-size: 10.5px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 4px 9px;
          border-radius: 999px;
          color: #fff;
          white-space: nowrap;
        }
        .v-closest {
          background: #9a3412;
        }
        .v-related {
          background: #b45309;
        }
        .v-weak {
          background: #6b7280;
        }
        .v-distant,
        .v-unknown {
          background: #9ca3af;
        }
        .v-tracked {
          background: #64748b;
        }
        .noRate {
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--text-muted);
        }
        .noRate b {
          color: var(--text);
          font-weight: 850;
          font-variant-numeric: tabular-nums;
        }
        .matchNone {
          display: block;
          margin-top: 14px;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .matchRate {
          margin-top: 12px;
          display: flex;
          align-items: baseline;
          gap: 9px;
          flex-wrap: wrap;
        }
        .matchRate b {
          font-size: 20px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }
        .matchRate span {
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .bars {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }
        .bar {
          font-size: 12px;
          border-radius: 8px;
          padding: 5px 10px;
          background: #fff;
          border: 1px solid var(--border);
          color: var(--text-muted);
        }
        .bar b {
          font-weight: 900;
          color: var(--text);
          font-variant-numeric: tabular-nums;
        }
        .b1 {
          border-color: rgba(154, 52, 18, 0.45);
          color: #9a3412;
        }
        .b2 {
          border-color: rgba(180, 83, 9, 0.4);
          color: #b45309;
        }
        :global(.matchCta) {
          display: inline-block;
          margin-top: 14px;
          font-size: 13.5px;
          font-weight: 800;
          color: var(--accent);
          text-decoration: none;
        }
        .buy {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 0.72fr);
          gap: 22px;
          align-items: center;
          margin-top: 18px;
          padding: 20px 22px;
          border-radius: 16px;
          border: 1px solid rgba(79, 70, 229, 0.3);
          background: rgba(79, 70, 229, 0.04);
        }
        .buyTitle {
          font-size: 16px;
          font-weight: 900;
          line-height: 1.3;
        }
        .buySub {
          margin: 8px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .buyForm {
          display: grid;
          gap: 9px;
        }
        .buyError {
          font-size: 12.5px;
          line-height: 1.5;
          color: #b91c1c;
        }
        :global(.buyCta) {
          display: inline-block;
          margin-top: 12px;
          background: var(--accent);
          color: #fff;
          border-radius: 12px;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
        }
        @media (max-width: 860px) {
          .buy {
            grid-template-columns: minmax(0, 1fr);
          }
        }
        .alsoRan {
          margin: 14px 0 0;
          padding: 12px 16px;
          border: 1px dashed var(--border);
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        .alsoRan b {
          color: var(--text);
          font-weight: 900;
        }
        .fine {
          margin-top: 16px;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 96ch;
        }

        .how {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .step {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px 18px;
        }
        .step h3 {
          margin: 0;
          font-size: 14.5px;
          font-weight: 850;
        }
        .step p {
          margin: 6px 0 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--text-muted);
        }

        @media (max-width: 860px) {
          h1 {
            font-size: 26px;
          }
          .how {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
}
