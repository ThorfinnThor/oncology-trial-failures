// web/pages/share-leaders.tsx

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadIndex } from "@/lib/data";
import { TrialIndexRow, UrlState } from "@/lib/types";
import { encodeState } from "@/lib/urlState";
import { isLikelyScientificFailure, reasonBucket } from "@/lib/filtering";

type BucketOption = {
  key: string;
  label: string;
  buckets: string[];
};

type ShareRow = {
  key: string;
  label: string;
  total: number;
  inBucket: number;
  share: number;
};

function normEntity(s?: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function safePct(x: number): string {
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function exploreHref(bioOnly: boolean, patch: Partial<UrlState>): string {
  const base: UrlState = { sort: "date_desc", bio: bioOnly ? true : undefined };
  return `/explore${encodeState({ ...base, ...patch })}`;
}

const BUCKETS: BucketOption[] = [
  { key: "EFFICACY/FUTILITY", label: "Efficacy/Futility", buckets: ["EFFICACY/FUTILITY"] },
  { key: "SAFETY", label: "Safety", buckets: ["SAFETY"] },
  { key: "OPERATIONAL", label: "Operational", buckets: ["OPERATIONAL"] },
  { key: "REGULATORY", label: "Regulatory", buckets: ["REGULATORY"] },
  { key: "STRATEGIC", label: "Strategic", buckets: ["STRATEGIC"] },
  { key: "FUNDING", label: "Funding", buckets: ["FUNDING"] },
  { key: "ENROLLMENT", label: "Enrollment", buckets: ["ENROLLMENT"] },
  { key: "OTHER/UNKNOWN", label: "Missing/Unknown", buckets: ["OTHER/UNKNOWN"] }
];

function computeShareTable(args: {
  rows: TrialIndexRow[];
  minTrials: number;
  bioOnly: boolean;
  bucketSet: Set<string>;
  getKey: (r: TrialIndexRow) => string;
  getLabel: (k: string) => string;
  unknownLabel: string;
}): ShareRow[] {
  const { rows, minTrials, bioOnly, bucketSet, getKey, getLabel, unknownLabel } = args;

  const totals = new Map<string, number>();
  const hits = new Map<string, number>();

  for (const r of rows) {
    if (bioOnly && !isLikelyScientificFailure(r)) continue;

    const k = normEntity(getKey(r)) || unknownLabel;
    totals.set(k, (totals.get(k) || 0) + 1);

    const b = (reasonBucket(r) || "OTHER/UNKNOWN").toUpperCase();
    if (bucketSet.has(b)) hits.set(k, (hits.get(k) || 0) + 1);
  }

  const out: ShareRow[] = [];
  for (const [k, total] of totals.entries()) {
    if (total < minTrials) continue;
    const inBucket = hits.get(k) || 0;
    out.push({
      key: k,
      label: getLabel(k) || k,
      total,
      inBucket,
      share: total > 0 ? inBucket / total : 0
    });
  }

  out.sort((a, b) => {
    if (b.share !== a.share) return b.share - a.share;
    if (b.inBucket !== a.inBucket) return b.inBucket - a.inBucket;
    return b.total - a.total;
  });

  return out;
}

function ControlGroup({
  bucketKey,
  setBucketKey,
  minTrials,
  setMinTrials,
  label
}: {
  bucketKey: string;
  setBucketKey: (v: string) => void;
  minTrials: number;
  setMinTrials: (n: number) => void;
  label: string;
}) {
  return (
    <div className="controls">
      <div className="control">
        <div className="facet-title">Bucket</div>
        <select
          className="input select"
          value={bucketKey}
          onChange={(e) => setBucketKey(e.target.value)}
          aria-label={`${label} bucket`}
        >
          {BUCKETS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <div className="control">
        <div className="facet-title">Min trials</div>
        <input
          className="input minTrials"
          type="number"
          min={1}
          step={1}
          value={minTrials}
          onChange={(e) => setMinTrials(Math.max(1, parseInt(e.target.value || "1", 10)))}
          aria-label={`${label} minimum trials`}
        />
      </div>
    </div>
  );
}

function RankTable({
  rows,
  getHref
}: {
  rows: ShareRow[];
  getHref: (r: ShareRow) => string;
}) {
  const shown = rows;
  const maxShare = shown.length ? shown[0].share : 0;

  return (
    <div className="rankWrap" role="region" aria-label="Ranked results">
      <div className="rankMeta muted small">
        Showing <b>{shown.length.toLocaleString()}</b> results
      </div>

      <div className="scrollHint" aria-hidden="true">
        Swipe to scroll →
      </div>

      {/* IMPORTANT: THIS is the clamped scrolling region */}
      <div className="rankScroller" tabIndex={0} role="region" aria-label="Scrollable results table">
        <table className="rankTbl" aria-label="Ranked table">
          <thead>
            <tr>
              <th className="th thRank">Rank</th>
              <th className="th thName">Name</th>
              <th className="th thNum">Share</th>
              <th className="th thNum">Trials</th>
              <th className="th thNum thNoWrap">In&nbsp;bucket</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.key} className="tr">
                <td className="td tdRank muted">{i + 1}</td>
                <td className="td tdName">
                  <div className="nameCell">
                    <Link className="link" href={getHref(r)}>
                      {r.label}
                    </Link>
                    <div className="miniBar" aria-hidden="true">
                      <div
                        className="miniBarFill"
                        style={{ width: `${maxShare > 0 ? (r.share / maxShare) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="td tdNum strong">{safePct(r.share)}</td>
                <td className="td tdNum">{r.total.toLocaleString()}</td>
                <td className="td tdNum">{r.inBucket.toLocaleString()}</td>
              </tr>
            ))}

            {!shown.length ? (
              <tr>
                <td className="td muted" colSpan={5}>
                  No results (try lowering “Min trials”).
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ShareLeadersPage() {
  const [allRows, setAllRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [bioOnly, setBioOnly] = useState(false);

  const [bucketCompany, setBucketCompany] = useState(BUCKETS[0].key);
  const [bucketArea, setBucketArea] = useState(BUCKETS[0].key);

  const [minTrialsCompany, setMinTrialsCompany] = useState(10);
  const [minTrialsArea, setMinTrialsArea] = useState(10);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const idx = await loadIndex();
        if (!alive) return;
        setAllRows(idx);
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

  const scopedCount = useMemo(() => {
    if (!bioOnly) return allRows.length;
    return allRows.filter((r) => isLikelyScientificFailure(r)).length;
  }, [allRows, bioOnly]);

  const bucketSetCompany = useMemo(() => {
    const opt = BUCKETS.find((b) => b.key === bucketCompany) || BUCKETS[0];
    return new Set(opt.buckets.map((x) => x.toUpperCase()));
  }, [bucketCompany]);

  const bucketSetArea = useMemo(() => {
    const opt = BUCKETS.find((b) => b.key === bucketArea) || BUCKETS[0];
    return new Set(opt.buckets.map((x) => x.toUpperCase()));
  }, [bucketArea]);

  const companyTable = useMemo(() => {
    return computeShareTable({
      rows: allRows,
      bioOnly,
      minTrials: Math.max(1, minTrialsCompany || 1),
      bucketSet: bucketSetCompany,
      getKey: (r) => normEntity((r as any).lead_sponsor),
      getLabel: (k) => k,
      unknownLabel: "Unknown"
    });
  }, [allRows, bioOnly, minTrialsCompany, bucketSetCompany]);

  const areaTable = useMemo(() => {
    return computeShareTable({
      rows: allRows,
      bioOnly,
      minTrials: Math.max(1, minTrialsArea || 1),
      bucketSet: bucketSetArea,
      getKey: (r) => normEntity((r as any).disease_area),
      getLabel: (k) => k,
      unknownLabel: "Other"
    });
  }, [allRows, bioOnly, minTrialsArea, bucketSetArea]);

  const companyBucketList = useMemo(
    () => (BUCKETS.find((b) => b.key === bucketCompany) || BUCKETS[0]).buckets,
    [bucketCompany]
  );
  const areaBucketList = useMemo(
    () => (BUCKETS.find((b) => b.key === bucketArea) || BUCKETS[0]).buckets,
    [bucketArea]
  );

  const topCompany = companyTable[0];
  const topArea = areaTable[0];

  const companyBucketLabel = (BUCKETS.find((b) => b.key === bucketCompany) || BUCKETS[0]).label;
  const areaBucketLabel = (BUCKETS.find((b) => b.key === bucketArea) || BUCKETS[0]).label;

  return (
    <>
      <Head>
        <title>Share leaders — Clinical trial failures</title>
      </Head>

      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/explore" className="brand">
                Clinical trial failures
              </Link>
              <nav className="nav" aria-label="Primary">
                <Link className="navlink" href="/explore">
                  Explore
                </Link>
                <Link className="navlink" href="/pharma-intelligence">
                  Pharma intelligence
                </Link>
                <Link className="navlink" href="/share-leaders" aria-current="page">
                  Share leaders
                </Link>
                <Link className="navlink" href="/methods">
                  Methods
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="page">
          <header className="header">
            <div className="headerLeft">
              <h1 className="title">Share leaders</h1>
              <div className="muted subtitle">
                Identify sponsors and disease areas that disproportionately appear in a selected stop-reason bucket.
              </div>
            </div>

            <div className="headerRight">
              <div className="chip">
                Trials&nbsp;<b>{scopedCount.toLocaleString()}</b>
              </div>

              <button
                className={bioOnly ? "btn btn-primary" : "btn"}
                onClick={() => setBioOnly((v) => !v)}
                aria-pressed={bioOnly}
              >
                {bioOnly ? "Showing scientific failures" : "Show scientific failures"}
              </button>
            </div>
          </header>

          {err ? <div className="card p-4 error">{err}</div> : null}
          {loading ? <div className="card p-4 muted">Loading…</div> : null}

          {!loading && !err ? (
            <section className="grid2" aria-label="Share leaders panels">
              <div className="card p-4 panel">
                <div className="panelHead">
                  <div className="muted small">Company</div>
                  <div className="panelTitle">Which company has the highest share of…</div>
                  <div className="muted small" style={{ marginTop: 6 }}>
                    Share = (trials in selected bucket) / (all trials for that sponsor) within the current scope.
                  </div>
                </div>

                <ControlGroup
                  label="Company"
                  bucketKey={bucketCompany}
                  setBucketKey={setBucketCompany}
                  minTrials={minTrialsCompany}
                  setMinTrials={setMinTrialsCompany}
                />

                <div className="topPick">
                  <div className="facet-title">Top sponsor</div>
                  <div className="topPickName">
                    {topCompany ? (
                      <Link
                        className="link"
                        href={exploreHref(bioOnly, {
                          sponsor: [topCompany.key],
                          bucket: companyBucketList,
                          bio: bioOnly ? true : undefined
                        })}
                      >
                        {topCompany.label}
                      </Link>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </div>
                  {topCompany ? (
                    <div className="muted small" style={{ marginTop: 4 }}>
                      {safePct(topCompany.share)} ({topCompany.inBucket}/{topCompany.total}) in {companyBucketLabel}
                    </div>
                  ) : null}
                </div>

                <RankTable
                  rows={companyTable}
                  getHref={(r) =>
                    exploreHref(bioOnly, {
                      sponsor: [r.key],
                      bucket: companyBucketList,
                      bio: bioOnly ? true : undefined
                    })
                  }
                />
              </div>

              <div className="card p-4 panel">
                <div className="panelHead">
                  <div className="muted small">Disease area</div>
                  <div className="panelTitle">Which disease area has the highest share of failures…</div>
                  <div className="muted small" style={{ marginTop: 6 }}>
                    Same share calculation, grouped by disease area within the current scope.
                  </div>
                </div>

                <ControlGroup
                  label="Disease area"
                  bucketKey={bucketArea}
                  setBucketKey={setBucketArea}
                  minTrials={minTrialsArea}
                  setMinTrials={setMinTrialsArea}
                />

                <div className="topPick">
                  <div className="facet-title">Top disease area</div>
                  <div className="topPickName">
                    {topArea ? (
                      <Link
                        className="link"
                        href={exploreHref(bioOnly, {
                          area: [topArea.key],
                          bucket: areaBucketList,
                          bio: bioOnly ? true : undefined
                        })}
                      >
                        {topArea.label}
                      </Link>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </div>
                  {topArea ? (
                    <div className="muted small" style={{ marginTop: 4 }}>
                      {safePct(topArea.share)} ({topArea.inBucket}/{topArea.total}) in {areaBucketLabel}
                    </div>
                  ) : null}
                </div>

                <RankTable
                  rows={areaTable}
                  getHref={(r) =>
                    exploreHref(bioOnly, {
                      area: [r.key],
                      bucket: areaBucketList,
                      bio: bioOnly ? true : undefined
                    })
                  }
                />
              </div>
            </section>
          ) : null}

          {!loading && !err ? (
            <div className="muted foot">
              Tip: shares can be unstable for small denominators — increase “Min trials” to focus on larger samples.
            </div>
          ) : null}
        </main>

        <style jsx>{`
          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
          }
          .title {
            margin: 0;
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.01em;
          }
          .subtitle {
            margin-top: 8px;
            font-size: 14px;
            line-height: 1.45;
            max-width: 820px;
          }
          .headerRight {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .grid2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            align-items: start;
          }
          @media (min-width: 980px) {
            .grid2 {
              grid-template-columns: 1fr 1fr;
            }
          }
          @media (max-width: 520px) {
            .header {
              flex-direction: column;
            }
            .headerRight {
              justify-content: flex-start;
            }
          }

          .panel {
            padding: 18px !important;
          }

          .panelHead {
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
          }
          .panelTitle {
            margin-top: 4px;
            font-size: 16px;
            font-weight: 900;
            letter-spacing: -0.01em;
          }
          .small {
            font-size: 12px;
          }

          .controls {
            margin-top: 14px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: flex-end;
          }
          .control {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .minTrials {
            width: 132px;
            max-width: 132px;
          }
          @media (max-width: 520px) {
            .controls {
              flex-direction: column;
              align-items: stretch;
            }
            .control {
              width: 100%;
            }
            .minTrials {
              width: 100%;
              max-width: 100%;
            }
          }

          .topPick {
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px solid var(--border);
          }
          .topPickName {
            margin-top: 4px;
            font-size: 18px;
            font-weight: 900;
            line-height: 1.25;
          }

          .rankWrap {
            margin-top: 14px;
            border-top: 1px solid var(--border);
            padding-top: 14px;
          }
          .rankMeta {
            margin-bottom: 8px;
          }

          .scrollHint {
            display: none;
            color: var(--text-muted);
            font-weight: 750;
            font-size: 12px;
            margin-bottom: 10px;
          }
          @media (max-width: 720px) {
            .scrollHint {
              display: block;
            }
          }

          /*
            THIS IS THE IMPORTANT PART:
            - Fixed/max height => internal vertical overflow
            - overflow-y: scroll => scrollbar track exists whenever overflow container exists
            - overflow-x: auto + min-width table => horizontal scroll on narrow screens
          */
          .rankScroller {
            display: block;
            width: 100%;

            overflow-x: auto;
            overflow-y: scroll; /* <— force a vertical scrollbar when clamped */
            scrollbar-gutter: stable both-edges;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;

            border-radius: 12px;
            border: 1px solid var(--border);
            background: var(--surface);

            max-height: 360px; /* <— prevents the page from getting too long */
            box-shadow: inset 0 -12px 12px -12px rgba(15, 23, 42, 0.22);
          }

          @media (max-width: 520px) {
            .rankScroller {
              max-height: 280px;
            }
          }
          @media (min-width: 1200px) {
            .rankScroller {
              max-height: 420px;
            }
          }

          /* Desktop sticky header only (mobile Safari can be weird with sticky inside overflow) */
          @media (min-width: 721px) {
            .rankScroller thead th {
              position: sticky;
              top: 0;
              z-index: 2;
              background: var(--surface);
            }
          }

          .rankTbl {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 13.5px;
            line-height: 1.25;
            font-variant-numeric: tabular-nums;
          }

          /* Forces horizontal scroll on small screens */
          @media (max-width: 980px) {
            .rankTbl {
              min-width: 740px;
            }
          }

          .th {
            border-bottom: 1px solid var(--border);
            text-align: left;
            padding: 12px 14px;
            font-size: 12px;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            white-space: nowrap;
          }
          .thNoWrap {
            white-space: nowrap !important;
          }

          .td {
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
          }

          .thRank,
          .tdRank {
            width: 64px;
          }
          .thNum,
          .tdNum {
            width: 120px;
            text-align: right;
            white-space: nowrap;
          }

          tbody tr:nth-child(even) .td {
            background: rgba(15, 23, 42, 0.02);
          }
          tbody tr:hover .td {
            background: rgba(79, 70, 229, 0.06);
          }

          .nameCell {
            display: flex;
            flex-direction: column;
            gap: 10px;
            min-width: 0;
          }
          .link {
            font-weight: 850;
            color: rgb(79 70 229);
          }
          .link:hover {
            text-decoration: underline;
          }

          .miniBar {
            height: 9px;
            background: rgba(15, 23, 42, 0.08);
            border-radius: 999px;
            overflow: hidden;
          }
          .miniBarFill {
            height: 100%;
            background: rgba(79, 70, 229, 0.65);
          }

          .strong {
            font-weight: 900;
          }

          .foot {
            margin-top: 12px;
            font-size: 12px;
          }

          /* Optional: make scrollbars more obvious (works in Firefox; WebKit uses OS settings) */
          .rankScroller {
            scrollbar-width: auto;
          }
        `}</style>
      </div>
    </>
  );
}
