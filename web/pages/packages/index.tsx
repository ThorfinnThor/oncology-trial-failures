// web/pages/packages/index.tsx
//
// The shop. Until this existed the 51 packages were reachable only from the bottom of a brief
// or from six tiles buried in the licensing page, which meant the thing being sold had no
// address of its own — and a reader who had not already read a brief could not find it at all.
//
// Every tile carries the four numbers that decide whether a cohort is worth buying, because
// the alternative is a list of names that all look equally plausible.

import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import SampleCallout from "@/components/SampleCallout";
import { PACKAGE_PRICE, trialsBeyondTheBrief } from "@/components/BriefVsPackage";
import catalogue from "@/data/evidence_catalogue.json";
import briefsIndex from "@/data/briefs_index.json";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/packages`;
const TITLE = "Evidence packages — the whole cohort behind a discontinuation rate";
const DESCRIPTION =
  "One package per mechanism class: every trial the rate was computed from, the rules that define the cohort, which stops were the trial's own result, and the time-to-event curve. Delivered immediately.";

type Pkg = (typeof catalogue.packages)[number];

const n = (v: number) => v.toLocaleString("en-US");
const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;

export default function PackagesIndexPage() {
  // A cohort whose every trial is already in the free brief has no package worth selling; it is
  // reachable from its own brief, and saying so there is honest. Listing it in a shop is not.
  const all = (catalogue.packages as Pkg[]).filter((p) => trialsBeyondTheBrief(p) > 0);
  const areas = [...new Set(all.map((p) => p.area))].sort();
  const [area, setArea] = useState("All");
  // Size is the neutral default, but it puts the least interesting cohorts first: the biggest
  // classes sit closest to the area average almost by construction. The second order is the
  // one a buyer actually wants — where this cohort departs from its comparator.
  const [order, setOrder] = useState<"size" | "signal">("size");

  // Searching by gene matters more than searching by class name: somebody looking for the HER2
  // package is reading a slide that says ERBB2, and a shop of 53 names is unusable without it.
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = (p: Pkg) => {
    if (!needle) return true;
    const genes = ((p as any).genes || []) as string[];
    return (
      p.cohort.toLowerCase().includes(needle)
      || p.area.toLowerCase().includes(needle)
      || genes.some((g) => g.toLowerCase().includes(needle))
    );
  };

  const shown = (area === "All" ? all : all.filter((p) => p.area === area))
    .filter(matches)
    .slice()
    .sort((a, b) =>
      order === "size"
        ? b.counts.total_in_cohort - a.counts.total_in_cohort
        : b.headline.rate - b.headline.comparator_rate - (a.headline.rate - a.headline.comparator_rate),
    );

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
            <PrimaryNav active="packages" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <section className="intro">
            <div className="eyebrow">Evidence packages</div>
            <h1>The whole cohort, not only the trials that stopped</h1>
            <p className="lead">
              A <Link className="link" href="/briefs">brief</Link> is free and shows the trials in a mechanism class that
              stopped early, and why. A package is the evidence under that finding: every trial the rate was computed
              from — the ones that closed without stopping and the ones still running — the rules that decide which trial
              belongs in the cohort, which stops were the trial&rsquo;s own result rather than a programme decision made
              elsewhere, and the probability of a stop over time against a like-for-like comparator.
            </p>
            <p className="lead">
              Not sure which of them is yours?{" "}
              <Link className="link" href="/asset-check">
                Name your molecule and we will say which cohorts contain drugs like it
              </Link>{" "}
              — free, before you buy anything.
            </p>
            <div className="strip">
              <span>{all.length} cohorts</span>
              <span>{PACKAGE_PRICE} each</span>
              <span>Delivered immediately</span>
              <span>Rebuilt weekly</span>
            </div>
          </section>

          <SampleCallout />

          <section className="section">
            <div className="listHead">
              <h2>
                {needle || area !== "All"
                  ? `${shown.length} of ${all.length} cohorts`
                  : `All ${all.length} cohorts`}
              </h2>
              <div className="filters">
                <input
                  className="search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Class, gene or area — ERBB2, PARP, neurology"
                  aria-label="Filter cohorts by class, gene or disease area"
                />
                <span className="filterLabel">Sort</span>
                <button
                  type="button"
                  className={order === "size" ? "chip chipOn" : "chip"}
                  onClick={() => setOrder("size")}
                  aria-pressed={order === "size"}
                >
                  Largest
                </button>
                <button
                  type="button"
                  className={order === "signal" ? "chip chipOn" : "chip"}
                  onClick={() => setOrder("signal")}
                  aria-pressed={order === "signal"}
                >
                  Furthest above the area
                </button>
                <span className="filterLabel">Area</span>
                {["All", ...areas].map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={a === area ? "chip chipOn" : "chip"}
                    onClick={() => setArea(a)}
                    aria-pressed={a === area}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {shown.length === 0 ? (
              <p className="lead">
                Nothing matches “{query}”. The catalogue covers mechanism classes, so a molecule name will not match —
                try its target, or{" "}
                <Link className="link" href="/asset-check">
                  check the molecule itself
                </Link>
                .
              </p>
            ) : null}
            <div className="grid">
              {shown.map((p) => {
                const c = p.counts;
                const above = p.headline.rate > p.headline.comparator_rate;
                return (
                  <Link key={p.slug} href={`/packages/${p.slug}`} className="pkg">
                    <div className="pkgArea">{p.area}</div>
                    <div className="pkgName">{p.cohort}</div>
                    {/* A cohort that fails at the end rather than by stopping leads with that, as its brief does. */}
                    {(c as any).endpoint_missed > c.stopped ? (
                      <div className="pkgRate">
                        <b className="up">
                          {n((c as any).endpoint_missed)} of {n((c as any).endpoint_readable)}
                        </b>
                        <span>
                          completed trials missed their primary endpoint
                          <br />
                          {pct(p.headline.rate)} stopped early
                        </span>
                      </div>
                    ) : (
                      <div className="pkgRate">
                        <b className={above ? "up" : ""}>{pct(p.headline.rate)}</b>
                        <span>
                          of {n(c.closed)} closed trials stopped early
                          <br />
                          {pct(p.headline.comparator_rate)} for {p.area.toLowerCase()} as a whole
                        </span>
                      </div>
                    )}
                    <div className="pkgNums">
                      <div>
                        <b>{n(c.total_in_cohort)}</b>
                        <span>in the cohort</span>
                      </div>
                      <div>
                        <b>{n(c.stopped)}</b>
                        <span>stopped</span>
                      </div>
                      <div>
                        <b>{n(c.still_open)}</b>
                        <span>still running</span>
                      </div>
                      <div>
                        <b>{n(c.unreadable_terminations)}</b>
                        <span>no readable cause</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1120px;
          margin: 0 auto;
        }
        .intro {
          padding: 10px 0 4px;
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
          font-size: 32px;
          line-height: 1.14;
          font-weight: 900;
          letter-spacing: -0.02em;
          max-width: 24ch;
        }
        .lead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 82ch;
        }
        .strip {
          margin-top: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          font-size: 11.5px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          font-weight: 800;
          color: var(--text-muted);
        }
        .section {
          margin-top: 32px;
        }
        .listHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .section h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.015em;
        }
        .filters {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
        }
        .filterLabel {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
          margin-left: 4px;
        }
        .filterLabel:first-child {
          margin-left: 0;
        }
        .search {
          flex: 1 1 260px;
          min-width: 200px;
          padding: 8px 12px;
          border: 1px solid var(--line, #e2e8f0);
          border-radius: 999px;
          font: inherit;
          font-size: 13px;
          background: #fff;
          color: inherit;
        }
        .search:focus {
          outline: 2px solid #4f46e5;
          outline-offset: 1px;
        }
        .chip {
          border: 1px solid var(--border);
          background: var(--surface);
          color: inherit;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }
        .chipOn {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        :global(.pkg) {
          display: block;
          text-decoration: none;
          color: inherit;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px 18px;
        }
        :global(.pkg:hover) {
          border-color: rgba(79, 70, 229, 0.45);
        }
        .pkgArea {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .pkgName {
          margin-top: 6px;
          font-size: 16px;
          font-weight: 850;
          line-height: 1.25;
        }
        .pkgRate {
          margin-top: 10px;
          display: flex;
          align-items: baseline;
          gap: 9px;
        }
        .pkgRate b {
          flex: 0 0 auto;
          font-size: 21px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }
        .pkgRate b.up {
          color: var(--accent);
        }
        .pkgRate span {
          font-size: 11.5px;
          line-height: 1.4;
          color: var(--text-muted);
        }
        .pkgNums {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        .pkgNums b {
          display: block;
          font-size: 14px;
          font-weight: 850;
          font-variant-numeric: tabular-nums;
        }
        .pkgNums span {
          display: block;
          margin-top: 2px;
          font-size: 10.5px;
          line-height: 1.3;
          color: var(--text-muted);
        }
        .cta {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(240px, 0.5fr);
          gap: 22px;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 20px 22px;
        }
        .ctaTitle {
          font-size: 16px;
          font-weight: 850;
        }
        .muted {
          margin: 6px 0 0;
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--text-muted);
        }
        .ctaActions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .btnPrimary,
        :global(.btnGhost) {
          border-radius: 12px;
          padding: 11px 18px;
          font-size: 13.5px;
          font-weight: 800;
          text-decoration: none;
          text-align: center;
        }
        .btnPrimary {
          background: var(--accent);
          color: #fff;
        }
        :global(.btnGhost) {
          background: #fff;
          color: inherit;
          border: 1px solid var(--border);
        }
        .fine {
          margin-top: 14px;
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--text-muted);
        }
        @media (max-width: 860px) {
          h1 {
            font-size: 26px;
          }
          .cta {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </>
  );
}
