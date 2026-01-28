// web/pages/pharma-intelligence.tsx
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadIndex, loadMeta } from "@/lib/data";
import { DatasetMeta, TrialIndexRow, UrlState } from "@/lib/types";
import { encodeState } from "@/lib/urlState";
import { isLikelyScientificFailure, parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

/**
 * Mobile responsiveness strategy (robust on iOS Safari):
 * - "Reason buckets": keep as table but force overflow with a mobile min-width.
 * - "Phase × bucket matrix": desktop = table; mobile = per-phase horizontal card strips
 *   (avoids sticky/overflow table bugs that can freeze scrolling on mobile Safari).
 */

type BucketStat = {
  bucket: string;
  total: number;
  bio: number;
};

type PhaseStat = {
  phase: string;
  byBucket: Record<string, { total: number; bio: number }>;
};

const PHASE_ORDER = [
  "EARLY_PHASE1",
  "PHASE1",
  "PHASE1/PHASE2",
  "PHASE2",
  "PHASE2/PHASE3",
  "PHASE3",
  "PHASE4",
  "UNKNOWN"
];

function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

function normalizePhaseKeyFromRow(r: TrialIndexRow): string {
  const raw = parsePhases(r.phases || "");
  if (!raw.length) return "UNKNOWN";
  // pick "earliest" phase token to avoid double counting multi-phase trials
  const uniq = Array.from(new Set(raw.map((x) => (x || "").toUpperCase().trim()).filter(Boolean)));
  uniq.sort((a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b));
  return uniq[0] || "UNKNOWN";
}

function exploreHref(patch: Partial<UrlState>): string {
  const base: UrlState = { sort: "date_desc" };
  return `/explore${encodeState({ ...base, ...patch })}`;
}

function bucketChipClass(bucket: string): string {
  const b = (bucket || "").toUpperCase();
  if (b === "SAFETY") return "chip chip-bucket-safety";
  if (b === "EFFICACY/FUTILITY") return "chip chip-bucket-efficacy";
  if (b === "ENROLLMENT") return "chip chip-bucket-enrollment";
  if (b === "FUNDING") return "chip chip-bucket-funding";
  if (b === "REGULATORY") return "chip chip-bucket-regulatory";
  if (b === "STRATEGIC") return "chip chip-bucket-strategic";
  if (b === "OPERATIONAL") return "chip chip-bucket-operational";
  return "chip chip-neutral";
}

function phaseChipClass(phaseKey: string): string {
  const p = (phaseKey || "").toUpperCase();
  if (p.includes("PHASE1") || p === "EARLY_PHASE1") return "chip chip-phase-1";
  if (p.includes("PHASE2")) return "chip chip-phase-2";
  if (p.includes("PHASE3")) return "chip chip-phase-3";
  if (p.includes("PHASE4")) return "chip chip-phase-4";
  return "chip chip-neutral";
}

export default function PharmaIntelligencePage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [bioOnly, setBioOnly] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [m, idx] = await Promise.all([loadMeta(), loadIndex()]);
        if (!alive) return;
        setMeta(m);
        setRows(idx);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load dataset.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!bioOnly) return rows;
    return rows.filter((r) => isLikelyScientificFailure(r));
  }, [rows, bioOnly]);

  const totals = useMemo(() => {
    const total = rows.length;
    const bio = rows.filter((r) => isLikelyScientificFailure(r)).length;
    return { total, bio };
  }, [rows]);

  const bucketStats = useMemo<BucketStat[]>(() => {
    const m = new Map<string, { total: number; bio: number }>();
    for (const r of filtered) {
      const b = (reasonBucket(r) || "OTHER/UNKNOWN").toUpperCase();
      const cur = m.get(b) || { total: 0, bio: 0 };
      cur.total += 1;
      if (isLikelyScientificFailure(r)) cur.bio += 1;
      m.set(b, cur);
    }
    const out = Array.from(m.entries()).map(([bucket, v]) => ({ bucket, total: v.total, bio: v.bio }));
    out.sort((a, b) => b.total - a.total);
    return out;
  }, [filtered]);

  const bucketMax = useMemo(() => Math.max(1, ...bucketStats.map((x) => x.total)), [bucketStats]);

  const buckets = useMemo(() => bucketStats.map((x) => x.bucket), [bucketStats]);

  const phaseStats = useMemo<PhaseStat[]>(() => {
    const m = new Map<string, PhaseStat>();

    for (const r of filtered) {
      const phase = normalizePhaseKeyFromRow(r);
      if (!m.has(phase)) {
        const byBucket: PhaseStat["byBucket"] = {};
        for (const b of buckets) byBucket[b] = { total: 0, bio: 0 };
        m.set(phase, { phase, byBucket });
      }
      const s = m.get(phase)!;

      const b = (reasonBucket(r) || "OTHER/UNKNOWN").toUpperCase();
      if (!s.byBucket[b]) s.byBucket[b] = { total: 0, bio: 0 };
      s.byBucket[b].total += 1;
      if (isLikelyScientificFailure(r)) s.byBucket[b].bio += 1;
    }

    const arr = Array.from(m.values());
    arr.sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase));
    return arr;
  }, [filtered, buckets]);

  const matrixMax = useMemo(() => {
    const values: number[] = [];
    for (const p of phaseStats) {
      for (const b of buckets) values.push(p.byBucket[b]?.total || 0);
    }
    return Math.max(1, ...values);
  }, [phaseStats, buckets]);

  if (loading) {
    return (
      <div className="page">
        <div className="card p-4">Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="page">
        <div className="card p-4">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Error</div>
          <div className="muted">{err}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Pharma intelligence</title>
      </Head>

      <div className="page">
        <header className="header">
          <div className="headerLeft">
            <h1 className="title">Pharma intelligence</h1>
            <div className="muted subtitle">
              Snapshot derived from stopped interventional drug/biologic trials on ClinicalTrials.gov (API v2).
            </div>
          </div>

          <div className="headerRight">
            <div className="chip">
              Trials&nbsp;<b>{totals.total.toLocaleString()}</b>
            </div>
            <div className="chip">
              Bio failures&nbsp;<b>{totals.bio.toLocaleString()}</b>
            </div>
            <button className={bioOnly ? "btn-primary" : "btn"} onClick={() => setBioOnly((v) => !v)}>
              {bioOnly ? "Showing scientific failures" : "Show scientific failures"}
            </button>
          </div>
        </header>

        {/* ======= SECTION: Reason buckets ======= */}
        <section className="section">
          <div className="sectionHead">
            <h2 className="h2">Reason buckets</h2>
            <div className="muted small">On mobile, swipe horizontally to see all columns.</div>
          </div>

          <div className="card p-4">
            <div className="scrollHint">Swipe horizontally →</div>

            <div className="hScroll" role="region" aria-label="Reason buckets (horizontally scrollable)" tabIndex={0}>
              <table className="tblMini tblReason" aria-label="Reason buckets table">
                <thead>
                  <tr>
                    <th>Bucket</th>
                    <th className="num">Trials</th>
                    <th className="num">Bio share</th>
                    <th className="barCol" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {bucketStats.map((b) => (
                    <tr key={b.bucket}>
                      <td>
                        <div className="cellTop">
                          <span className={bucketChipClass(b.bucket)}>{b.bucket}</span>
                        </div>
                        <div className="cellSub muted">
                          <Link
                            className="link"
                            href={exploreHref({ bucket: [b.bucket], bio: bioOnly ? true : undefined })}
                          >
                            Explore →
                          </Link>
                        </div>
                      </td>
                      <td className="num">{b.total.toLocaleString()}</td>
                      <td className="num">{pct(bioOnly ? b.total : b.bio, b.total)}</td>
                      <td className="barCol">
                        <div className="barTrack" aria-hidden="true">
                          <div className="barFill" style={{ width: `${(b.total / bucketMax) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ======= SECTION: Phase x bucket ======= */}
        <section className="section">
          <div className="sectionHead">
            <h2 className="h2">Phase × bucket matrix</h2>
            <div className="muted small">
              Desktop uses a matrix table. Mobile uses swipeable bucket cards per phase (more reliable than scrollable
              tables on iOS).
            </div>
          </div>

          <div className="card p-4">
            {/* Desktop/table version */}
            <div className="desktopOnly">
              <div className="scrollHint">Scroll horizontally →</div>
              <div className="hScroll" role="region" aria-label="Phase by bucket matrix (scrollable)" tabIndex={0}>
                <table className="tblMatrix" aria-label="Phase by bucket matrix">
                  <thead>
                    <tr>
                      <th>Phase</th>
                      {buckets.map((b) => (
                        <th key={b} title={b} className="bucketHead">
                          {b}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {phaseStats.map((p) => (
                      <tr key={p.phase}>
                        <td className="phaseCell">
                          <span className={phaseChipClass(p.phase)}>{phaseLabel(p.phase)}</span>
                          <div className="muted tiny">{p.phase}</div>
                        </td>
                        {buckets.map((b) => {
                          const cell = p.byBucket[b] || { total: 0, bio: 0 };
                          const href = exploreHref({
                            phase: [p.phase],
                            bucket: [b],
                            bio: bioOnly ? true : undefined
                          });
                          return (
                            <td key={`${p.phase}_${b}`} className="matrixCell">
                              <Link className="cellLink" href={href}>
                                <div className="cellNums">
                                  <span className="big">{cell.total.toLocaleString()}</span>
                                  {!bioOnly && <span className="muted tiny">{cell.bio.toLocaleString()} bio</span>}
                                </div>
                                <div className="cellBarTrack" aria-hidden="true">
                                  <div className="cellBarFill" style={{ width: `${(cell.total / matrixMax) * 100}%` }} />
                                </div>
                              </Link>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile version */}
            <div className="mobileOnly">
              {phaseStats.map((p) => (
                <div key={p.phase} className="phaseRow">
                  <div className="phaseRowHead">
                    <span className={phaseChipClass(p.phase)}>{phaseLabel(p.phase)}</span>
                    <span className="muted tiny">{p.phase}</span>
                  </div>

                  <div
                    className="bucketStrip"
                    role="region"
                    aria-label={`${phaseLabel(p.phase)} buckets (horizontally scrollable)`}
                    tabIndex={0}
                  >
                    {buckets.map((b) => {
                      const cell = p.byBucket[b] || { total: 0, bio: 0 };
                      const href = exploreHref({
                        phase: [p.phase],
                        bucket: [b],
                        bio: bioOnly ? true : undefined
                      });
                      return (
                        <Link key={`${p.phase}_${b}`} href={href} className="bucketCard">
                          <div className="bucketCardTop">
                            <span className={bucketChipClass(b)}>{b}</span>
                          </div>
                          <div className="bucketCardNum">{cell.total.toLocaleString()}</div>
                          {!bioOnly && <div className="muted tiny">{cell.bio.toLocaleString()} bio</div>}
                          <div className="cardBarTrack" aria-hidden="true">
                            <div className="cardBarFill" style={{ width: `${(cell.total / matrixMax) * 100}%` }} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="footer muted">
          Dataset: <b>{meta?.version || "—"}</b>
          {meta?.generated_at_utc ? (
            <>
              {" "}
              • Generated: <b>{meta.generated_at_utc}</b>
            </>
          ) : null}
          {meta?.source ? (
            <>
              {" "}
              • Source: <b>{meta.source}</b>
            </>
          ) : null}
        </footer>
      </div>

      <style jsx>{`
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
        }
        .headerLeft {
          min-width: 0;
        }
        .headerRight {
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
        }

        .title {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }
        .subtitle {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.35;
        }

        .section {
          margin-top: 18px;
        }
        .sectionHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
        }

        .small {
          font-size: 12px;
          line-height: 1.35;
        }
        .tiny {
          font-size: 11px;
          line-height: 1.25;
        }

        .scrollHint {
          display: none;
          color: var(--text-muted);
          font-weight: 750;
          font-size: 12px;
          margin-bottom: 10px;
        }

        .hScroll {
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x;
          overscroll-behavior-x: contain;
          border-radius: 12px;
        }

        /* ====== Reason buckets table ====== */
        .tblMini {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .tblMini th,
        .tblMini td {
          border-bottom: 1px solid var(--border);
          padding: 12px 10px;
          vertical-align: top;
        }
        .tblMini th {
          text-align: left;
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .tblReason {
          /* Force overflow so a horizontal scrollbar MUST exist on narrow screens */
          min-width: 720px;
        }
        .num {
          text-align: right;
          white-space: nowrap;
          font-weight: 800;
        }
        .barCol {
          width: 130px;
        }
        .barTrack {
          height: 8px;
          width: 110px;
          background: rgba(15, 23, 42, 0.08);
          border-radius: 999px;
          overflow: hidden;
          margin-left: auto;
        }
        .barFill {
          height: 100%;
          background: rgba(79, 70, 229, 0.55);
          border-radius: 999px;
        }
        .cellTop {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .cellSub {
          margin-top: 6px;
          font-size: 12px;
        }
        .link {
          color: rgba(79, 70, 229, 0.92);
          font-weight: 750;
        }
        .link:hover {
          text-decoration: underline;
        }

        /* ====== Matrix table (desktop) ====== */
        .tblMatrix {
          width: 100%;
          border-collapse: collapse;
          min-width: 980px; /* force overflow for many buckets */
          font-size: 13px;
        }
        .tblMatrix th,
        .tblMatrix td {
          border-bottom: 1px solid var(--border);
          padding: 10px 10px;
          vertical-align: top;
        }
        .tblMatrix th {
          text-align: left;
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .bucketHead {
          min-width: 140px;
        }
        .phaseCell {
          min-width: 170px;
        }
        .matrixCell {
          min-width: 140px;
        }

        .cellLink {
          display: block;
          border-radius: 12px;
          padding: 8px;
          background: rgba(15, 23, 42, 0.02);
        }
        .cellLink:hover {
          background: rgba(79, 70, 229, 0.06);
        }
        .cellNums {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }
        .big {
          font-weight: 900;
        }
        .cellBarTrack {
          margin-top: 8px;
          height: 8px;
          background: rgba(15, 23, 42, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .cellBarFill {
          height: 100%;
          background: rgba(79, 70, 229, 0.55);
          border-radius: 999px;
        }

        /* ====== Mobile matrix (per-phase bucket strip) ====== */
        .phaseRow {
          padding: 10px 0 14px;
          border-bottom: 1px solid var(--border);
        }
        .phaseRow:last-child {
          border-bottom: none;
        }
        .phaseRowHead {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .bucketStrip {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x;
          overscroll-behavior-x: contain;
          padding-bottom: 4px;
        }
        .bucketCard {
          flex: 0 0 auto;
          width: 220px;
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 14px;
          padding: 12px;
          box-shadow: var(--shadow-soft);
        }
        .bucketCard:active {
          transform: scale(0.99);
        }
        .bucketCardTop {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .bucketCardNum {
          margin-top: 10px;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }
        .cardBarTrack {
          margin-top: 10px;
          height: 8px;
          background: rgba(15, 23, 42, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .cardBarFill {
          height: 100%;
          background: rgba(79, 70, 229, 0.55);
          border-radius: 999px;
        }

        .footer {
          margin-top: 18px;
          font-size: 12px;
        }

        /* Visibility toggles */
        .mobileOnly {
          display: none;
        }
        .desktopOnly {
          display: block;
        }

        @media (max-width: 860px) {
          .header {
            flex-direction: column;
          }
          .headerRight {
            justify-content: flex-start;
          }
          .scrollHint {
            display: block;
          }
        }

        @media (max-width: 720px) {
          .title {
            font-size: 20px;
          }
          .subtitle {
            font-size: 12px;
          }
          .h2 {
            font-size: 15px;
          }

          /* Make the scroll areas go edge-to-edge like other sections */
          .hScroll {
            margin: 0 -16px;
            padding: 0 16px;
          }

          .tblMini {
            font-size: 12px;
          }
          .tblMini th,
          .tblMini td {
            padding: 10px 8px;
          }
          .barTrack {
            width: 88px;
          }

          .desktopOnly {
            display: none;
          }
          .mobileOnly {
            display: block;
          }

          .bucketCard {
            width: 200px;
            padding: 11px;
          }
          .bucketCardNum {
            font-size: 18px;
          }
        }
      `}</style>
    </>
  );
}
