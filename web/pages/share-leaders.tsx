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
  buckets: string[]; // reasonBucket tokens used for filtering + Explore drilldown
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

function Bar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="barWrap" aria-label={label}>
      <div className="barTrack">
        <div className="barFill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

function ControlGroup({
  bucketKey,
  setBucketKey,
  minTrials,
  setMinTrials
}: {
  bucketKey: string;
  setBucketKey: (v: string) => void;
  minTrials: number;
  setMinTrials: (n: number) => void;
}) {
  return (
    <div className="controls">
      <div className="control">
        <div className="facet-title">Bucket</div>
        <select className="input select" value={bucketKey} onChange={(e) => setBucketKey(e.target.value)} aria-label="Bucket">
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
          aria-label="Minimum trials"
        />
      </div>
    </div>
  );
}

function RankTable({
  rows,
  getHref,
  maxRows = 50
}: {
  rows: ShareRow[];
  getHref: (r: ShareRow) => string;
  maxRows?: number;
}) {
  const shown = rows.slice(0, maxRows);
  const maxShare = shown.length ? shown[0].share : 0;

  return (
    <div className="tblWrap" role="region" aria-label="Ranked results">
      <div className="tblScroll">
        <table className="tblMini tblWide">
          <thead>
            <tr>
              <th style={{ width: 56 }}>Rank</th>
              <th>Name</th>
              <th className="num">Share</th>
              <th className="barCol" />
              <th className="num">Trials</th>
              <th className="num">In bucket</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.key}>
                <td className="muted">{i + 1}</td>
                <td>
                  <Link className="link" href={getHref(r)}>
                    {r.label}
                  </Link>
                </td>
                <td className="num">{safePct(r.share)}</td>
                <td className="barCol">
                  <Bar value={r.share} max={maxShare} label={`${safePct(r.share)} bar`} />
                </td>
                <td className="num">{r.total.toLocaleString()}</td>
                <td className="num">{r.inBucket.toLocaleString()}</td>
              </tr>
            ))}
            {!shown.length ? (
              <tr>
                <td className="muted" colSpan={6}>
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

  const [focusBio, setFocusBio] = useState(false);

  const [bucketCompany, setBucketCompany] = useState(BUCKETS[0].key);
  const [bucketArea, setBucketArea] = useState(BUCKETS[0].key);

  const [minTrialsCompany, setMinTrialsCompany] = useState(25);
  const [minTrialsArea, setMinTrialsArea] = useState(25);

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

  const scopedRows = useMemo(() => {
    if (!focusBio) return allRows;
    return allRows.filter((r) => isLikelyScientificFailure(r));
  }, [allRows, focusBio]);

  const scopedCount = scopedRows.length;

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
      bioOnly: focusBio,
      minTrials: Math.max(1, minTrialsCompany || 1),
      bucketSet: bucketSetCompany,
      getKey: (r) => normEntity(r.lead_sponsor),
      getLabel: (k) => k,
      unknownLabel: "Unknown"
    });
  }, [allRows, focusBio, minTrialsCompany, bucketSetCompany]);

  const areaTable = useMemo(() => {
    return computeShareTable({
      rows: allRows,
      bioOnly: focusBio,
      minTrials: Math.max(1, minTrialsArea || 1),
      bucketSet: bucketSetArea,
      getKey: (r) => normEntity(r.disease_area),
      getLabel: (k) => k,
      unknownLabel: "Other"
    });
  }, [allRows, focusBio, minTrialsArea, bucketSetArea]);

  const companyBucketList = useMemo(() => (BUCKETS.find((b) => b.key === bucketCompany) || BUCKETS[0]).buckets, [bucketCompany]);
  const areaBucketList = useMemo(() => (BUCKETS.find((b) => b.key === bucketArea) || BUCKETS[0]).buckets, [bucketArea]);

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

        <div className="page">
          <header className="header">
            <div className="headerLeft">
              <h1 className="title">Share leaders</h1>
              <div className="muted subtitle">
                Identify sponsors and disease areas that disproportionately appear in a selected stop-reason bucket. Use the toggle to restrict to likely
                biology-driven failures.
              </div>
            </div>

            <div className="headerRight">
              <div className="chip">
                Trials&nbsp;<b>{scopedCount.toLocaleString()}</b>
              </div>

              <button className={focusBio ? "btn-primary" : "btn"} onClick={() => setFocusBio((v) => !v)}>
                {focusBio ? "Showing scientific failures" : "Show scientific failures"}
              </button>
            </div>
          </header>

          {err ? <div className="card p-4 error">{err}</div> : null}
          {loading ? <div className="card p-4 muted">Loading…</div> : null}

          {!loading && !err ? (
            <section className="grid2" aria-label="Share leaders panels">
              <div className="card p-4">
                <div className="muted small">Company</div>
                <div className="panelTitle">Which company has the highest share of…</div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  Share = (trials in selected bucket) / (all trials for that sponsor) within the current scope.
                </div>

                <div className="divider" />

                <ControlGroup bucketKey={bucketCompany} setBucketKey={setBucketCompany} minTrials={minTrialsCompany} setMinTrials={setMinTrialsCompany} />

                <div className="divider" />

                <div className="facet-title">Top sponsor</div>
                <div className="topPick">
                  {topCompany ? (
                    <>
                      <div className="topPickName">
                        <Link
                          className="link"
                          href={exploreHref(focusBio, { sponsor: [topCompany.key], bucket: companyBucketList, bio: focusBio ? true : undefined })}
                        >
                          {topCompany.label}
                        </Link>
                      </div>
                      <div className="muted small" style={{ marginTop: 4 }}>
                        {safePct(topCompany.share)} ({topCompany.inBucket}/{topCompany.total}) in {companyBucketLabel}
                      </div>
                    </>
                  ) : (
                    <div className="muted">—</div>
                  )}
                </div>

                <div className="divider" />

                <RankTable
                  rows={companyTable}
                  getHref={(r) =>
                    exploreHref(focusBio, {
                      sponsor: [r.key],
                      bucket: companyBucketList,
                      bio: focusBio ? true : undefined
                    })
                  }
                />
              </div>

              <div className="card p-4">
                <div className="muted small">Disease area</div>
                <div className="panelTitle">Which disease area has the highest share of failures…</div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  Same share calculation, grouped by disease area within the current scope.
                </div>

                <div className="divider" />

                <ControlGroup bucketKey={bucketArea} setBucketKey={setBucketArea} minTrials={minTrialsArea} setMinTrials={setMinTrialsArea} />

                <div className="divider" />

                <div className="facet-title">Top disease area</div>
                <div className="topPick">
                  {topArea ? (
                    <>
                      <div className="topPickName">
                        <Link className="link" href={exploreHref(focusBio, { area: [topArea.key], bucket: areaBucketList, bio: focusBio ? true : undefined })}>
                          {topArea.label}
                        </Link>
                      </div>
                      <div className="muted small" style={{ marginTop: 4 }}>
                        {safePct(topArea.share)} ({topArea.inBucket}/{topArea.total}) in {areaBucketLabel}
                      </div>
                    </>
                  ) : (
                    <div className="muted">—</div>
                  )}
                </div>

                <div className="divider" />

                <RankTable
                  rows={areaTable}
                  getHref={(r) =>
                    exploreHref(focusBio, {
                      area: [r.key],
                      bucket: areaBucketList,
                      bio: focusBio ? true : undefined
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
        </div>

        <style jsx>{`
          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
          }
          .headerLeft {
            min-width: 0;
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

          .panelTitle {
            margin-top: 4px;
            font-size: 16px;
            font-weight: 900;
            letter-spacing: -0.01em;
          }
          .small {
            font-size: 12px;
          }
          .divider {
            height: 1px;
            background: var(--border);
            margin: 12px 0;
          }

          .controls {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: flex-end;
          }
          .minTrials {
            width: 120px;
            max-width: 120px;
          }

          .topPick {
            margin-top: 2px;
          }
          .topPickName {
            margin-top: 2px;
            font-size: 18px;
            font-weight: 900;
            line-height: 1.2;
          }

          /* Match pharma-intelligence accent coloring */
          .link {
            color: rgba(79, 70, 229, 0.92);
            font-weight: 750;
          }
          .link:hover {
            text-decoration: underline;
          }

          /* Tables (style aligned with pharma-intelligence) */
          .tblWrap {
            width: 100%;
          }
          .tblScroll {
            max-height: 520px;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
            border-radius: 12px;
          }
          .tblMini {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            min-width: 720px;
          }
          .tblMini th,
          .tblMini td {
            border-bottom: 1px solid var(--border);
            padding: 8px 10px;
            vertical-align: top;
          }
          .tblMini th {
            position: sticky;
            top: 0;
            z-index: 2;
            background: var(--surface);
            text-align: left;
            font-size: 12px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            white-space: nowrap;
          }
          .tblWide {
            min-width: 760px;
          }
          .num {
            text-align: right;
            white-space: nowrap;
            font-weight: 800;
          }
          .barCol {
            width: 140px;
          }

          /* Bars (match pharma-intelligence) */
          .barWrap {
            display: flex;
            justify-content: flex-end;
            width: 100%;
          }
          .barTrack {
            width: 100%;
            max-width: 140px;
            height: 8px;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.08);
            overflow: hidden;
          }
          .barFill {
            height: 100%;
            background: rgba(79, 70, 229, 0.55);
            border-radius: 999px;
          }

          .foot {
            margin-top: 12px;
            font-size: 12px;
          }
        `}</style>
      </div>
    </>
  );
}
