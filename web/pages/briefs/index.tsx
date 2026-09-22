// web/pages/briefs/index.tsx

import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import briefsIndex from "@/data/briefs_index.json";
import { LICENSING_EMAIL } from "@/lib/licensing";

const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/briefs`;
const TITLE = "Discontinuation briefs — how often trials of each mechanism stop early";
const DESCRIPTION =
  "One brief per mechanism class: the share of closed trials stopped early for efficacy, safety or benefit–risk reasons, against the rate for the whole disease area, with the trials behind every number.";

type Brief = (typeof briefsIndex.briefs)[number];

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const n = (v: number) => v.toLocaleString("en-US");

export default function BriefsIndexPage() {
  const all = briefsIndex.briefs as Brief[];
  const areas = briefsIndex.areas as string[];
  const [area, setArea] = useState<string>("All");
  const shown = area === "All" ? all : all.filter((b) => b.area === area);

  // What leads the page is what survives a multiplicity correction, not what is largest.
  // Ranking 52 overlapping segments by rate and showing the top of the list is the selection
  // effect this whole page is trying not to commit.
  const survivors = all.filter((b: any) => b.survives_fdr_10pct);
  const featured = (survivors.length ? survivors : all.slice(0, 3)) as Brief[];

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
            <PrimaryNav active="briefs" />
          </div>
        </div>
      </header>

      <main className="page">
        <div className="wrap">
          <section className="intro">
            <div className="eyebrow">Discontinuation briefs</div>
            <h1>How often do trials of this mechanism stop early?</h1>
            <p className="lead">
              {briefsIndex.brief_count} briefs, one per mechanism class. Each gives the share of closed trials stopped early for an
              efficacy, safety or benefit–risk reason, the rate for the whole disease area to compare it against, and the trials
              behind the number with their registry stop reasons. Rebuilt weekly.
            </p>
          </section>

          <section className="section">
            <h2>What survives a multiplicity correction</h2>
            <p className="lead sub">
              {survivors.length} of {briefsIndex.brief_count} segments are still unusual once the correction for having screened
              all of them is applied — a one-sided exact binomial test against a like-for-like baseline, with a
              Benjamini–Yekutieli false-discovery rate valid under the heavy overlap between segments. The rest are published too,
              and are worth reading as leads; they are not findings.
            </p>
            <div className="featured grid">
              {featured.map((b) => (
                <Link key={b.slug} href={`/briefs/${b.slug}`} className="briefCard briefCardHero">
                  <div className="tileTop">
                    <span className="tileArea">{b.area}</span>
                  </div>
                  <div className="tileName">{b.segment}</div>
                  <div className="tileLead">
                    <b>{(b as any).failure_signature ? (b as any).failure_signature.molecules : "—"}</b>
                    <span>molecules</span>
                    {(b as any).failure_signature?.shared_modality ? (
                      <em>· all {(b as any).failure_signature.shared_modality.toLowerCase()}s</em>
                    ) : null}
                  </div>
                  <div className="tileMeta">
                    {(b as any).failure_signature ? (b as any).failure_signature.sentence : ""}{" "}
                    {pct(b.rate)} of closed trials against {pct(b.baseline_resolved_rate ?? b.baseline_rate)}
                    {typeof (b as any).q_value_by === "number" ? ` · q=${(b as any).q_value_by.toPrecision(2)}` : ""}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="section">
            <div className="listHead">
              <h2>
                All {briefsIndex.brief_count} briefs
                {area === "All" ? "" : ` · ${shown.length} in ${area}`}
              </h2>
              <div className="filters">
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

            <div className="grid">
              {shown.map((b) => {
                const sig = (b as any).failure_signature;
                const q = (b as any).q_value_by;
                return (
                  <Link key={b.slug} href={`/briefs/${b.slug}`} className="briefCard">
                    <div className="tileTop">
                      <span className="tileArea">{b.area}</span>
                    </div>
                    <div className="tileName">{b.segment}</div>
                    <div className="tileLead">
                      <b>{sig ? sig.molecules : "—"}</b>
                      <span>{sig && sig.molecules === 1 ? "molecule" : "molecules"}</span>
                      {sig && sig.shared_modality ? (
                        <em>· all {sig.shared_modality.toLowerCase()}s</em>
                      ) : null}
                    </div>
                    <div className="tileMeta">
                      {b.biological_stops} of {n(b.closed)} closed trials stopped early — {pct(b.rate)} against{" "}
                      {pct(b.baseline_resolved_rate ?? b.baseline_rate)}
                    </div>
                    <div className="tileFoot">
                      <span>{b.stop_programmes ?? "—"} programmes</span>
                      <span>95% CI {pct(b.ci95[0])}–{pct(b.ci95[1])}</span>
                      <span>{typeof q === "number" ? `q=${q.toPrecision(2)}` : "q —"}</span>
                    </div>
                    {b.has_pdf ? (
                      <span
                        className="tilePdf"
                        role="link"
                        tabIndex={0}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          window.open(`/briefs/${b.file_stem}.pdf`, "_blank", "noopener");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            window.open(`/briefs/${b.file_stem}.pdf`, "_blank", "noopener");
                          }
                        }}
                      >
                        PDF ↗
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
            <p className="fine">
              A brief without a mark above is not a weaker brief. Most segments simply have too few closed trials for any
              correction to clear, and a rate close to its comparator is a finding rather than a shortcoming — the numbers are
              built the same way throughout.
            </p>
            <p className="fine">
              The big number on each tile is <b>how many distinct drugs</b> are behind the stopped trials — the number to read
              first. A sponsor who abandons a molecule closes every trial of it at once, so seven stopped trials can be four
              molecules, or one. The rate counts registry records and cannot tell you which.
            </p>
            <p className="fine">
              <b>q</b> is the false-discovery rate at which a segment would still be called unusual, computed over every segment
              screened in its area rather than only those published here. Bold means it clears 10%. A q near 1 does not mean the
              segment is uninteresting — small cohorts cannot clear any correction — but it does mean the rate alone is not
              evidence of anything unusual.
            </p>
            <p className="fine">
              Every brief is free to read and free to download — the gate is on the evidence package, which is the thing being
              sold. These are screens, not tests. Every segment with enough data is published here rather than only the striking ones, but
              picking the top of a ranked list is itself a selection effect and no interval on this page corrects for it. A zero is
              &ldquo;no qualifying termination observed in this cohort&rdquo; — not evidence that a mechanism is safe. Each brief
              gives the trials behind its number so the screen can be checked rather than believed.
            </p>
          </section>

          <div className="cta">
            <div>
              <div className="ctaTitle">Every mechanism, sponsor and indication — updated weekly</div>
              <p className="muted">
                A brief covers the trials that stopped. The evidence package for the same cohort adds every other trial the
                rate was computed from, the rules that define it, and the time-to-event curve — delivered immediately, because
                it is built with the weekly release.
              </p>
            </div>
            <div className="ctaActions">
              <Link className="btnPrimary" href="/pricing#evidence-package">
                Evidence packages
              </Link>
              <Link className="btnGhost" href="/newsletter">
                Get the fortnightly mail
              </Link>
              <a className="btnGhost" href={`mailto:${LICENSING_EMAIL}?subject=${encodeURIComponent("Discontinuation briefs")}`}>
                Ask a question
              </a>
            </div>
          </div>
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
          margin: 8px 0 0;
          font-size: 30px;
          line-height: 1.12;
          font-weight: 900;
          letter-spacing: -0.02em;
          max-width: 34ch;
        }
        .lead {
          margin: 12px 0 0;
          font-size: 15px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 92ch;
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
        .listHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .chip {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--text-muted);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 5px 12px;
          cursor: pointer;
          font-family: inherit;
        }
        .chipOn {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        .featured {
          margin-top: 14px;
        }
        :global(.briefCardHero) {
          padding: 18px 20px 16px;
        }
        :global(.briefCardHero) .tileLead b {
          font-size: 36px;
        }
        :global(.briefCardHero) .tileName {
          font-size: 16.5px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(268px, 1fr));
          gap: 12px;
          margin-top: 14px;
        }
        :global(.briefCard) {
          display: block;
          text-decoration: none;
          color: inherit;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px 16px 12px;
          transition: border-color 0.12s ease, transform 0.12s ease;
        }
        :global(.briefCard):hover {
          border-color: rgba(79, 70, 229, 0.45);
          transform: translateY(-1px);
        }
        .tileTop {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          min-height: 18px;
        }
        .tileArea {
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #fff;
          background: var(--accent);
          border-radius: 999px;
          padding: 2px 7px;
        }
        .badge.open {
          background: #0f766e;
        }
        .tileName {
          margin-top: 7px;
          font-size: 15px;
          font-weight: 850;
          line-height: 1.25;
        }
        .tileLead {
          margin-top: 8px;
          display: flex;
          align-items: baseline;
          gap: 5px;
          flex-wrap: wrap;
        }
        .tileLead b {
          font-size: 27px;
          font-weight: 900;
          letter-spacing: -0.025em;
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .tileLead span {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
        }
        .tileLead em {
          font-style: normal;
          font-size: 12.5px;
          color: var(--text-muted);
        }
        .tileMeta {
          margin-top: 6px;
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--text-muted);
        }
        .tilePdf {
          display: inline-block;
          margin-top: 8px;
          font-size: 11.5px;
          font-weight: 800;
          color: var(--accent);
          cursor: pointer;
        }
        .tilePdf:hover {
          text-decoration: underline;
        }
        .tileFoot {
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--surface-2);
          display: flex;
          justify-content: space-between;
          gap: 8px;
          font-size: 11.5px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
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
        .pass {
          color: var(--accent);
          font-weight: 850;
        }
        .sub {
          margin-top: 8px;
          font-size: 14px;
        }
        .fine {
          margin: 14px 0 0;
          font-size: 12.5px;
          line-height: 1.55;
          color: var(--text-muted);
          max-width: 100ch;
        }
        .cta {
          margin-top: 36px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow-soft);
          padding: 20px 22px;
          display: flex;
          gap: 20px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .ctaTitle {
          font-size: 15px;
          font-weight: 850;
        }
        .cta p {
          margin: 4px 0 0;
          font-size: 13.5px;
          line-height: 1.5;
          max-width: 70ch;
        }
        .ctaActions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        :global(.btnPrimary),
        :global(.btnGhost) {
          border-radius: 12px;
          padding: 10px 16px;
          font-size: 13.5px;
          font-weight: 800;
          text-decoration: none;
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
        @media (max-width: 900px) {
          .featured {
            grid-template-columns: 1fr;
          }
          h1 {
            font-size: 25px;
          }
        }
      `}</style>
    </>
  );
}
