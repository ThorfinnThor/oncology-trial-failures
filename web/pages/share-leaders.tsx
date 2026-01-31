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
  if (!Number.isFinite(x)) return "--";
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
  { key: "OTHER/UNKNOWN", label: "Missing", buckets: ["OTHER/UNKNOWN"] }
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

function ControlsRow({
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
    <div className="sl-controls">
      <label className="sl-field">
        <div className="sl-label">Bucket</div>
        <select className="input select" value={bucketKey} onChange={(e) => setBucketKey(e.target.value)} aria-label="Bucket">
          {BUCKETS.map((b) => (
            <option key={b.key} value={b.key}>
              {b.label}
            </option>
          ))}
        </select>
      </label>

      <label className="sl-field">
        <div className="sl-label">Min trials</div>
        <input
          className="input sl-min"
          type="number"
          min={1}
          step={1}
          value={minTrials}
          onChange={(e) => setMinTrials(Math.max(1, parseInt(e.target.value || "1", 10)))}
          aria-label="Minimum trials"
        />
      </label>
    </div>
  );
}

function ShareTable({ rows, getHref }: { rows: ShareRow[]; getHref: (r: ShareRow) => string }) {
  const maxShare = rows.length ? rows[0].share : 0;

  return (
    <div className="sl-tableWrap" role="region" aria-label="Ranked share table">
      <table className="sl-table">
        <thead>
          <tr>
            <th className="sl-th sl-rank">Rank</th>
            <th className="sl-th">Name</th>
            <th className="sl-th sl-num">Share</th>
            <th className="sl-th sl-num">Trials</th>
            <th className="sl-th sl-num">In bucket</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((r, i) => (
            <tr key={r.key} className="sl-tr">
              <td className="sl-td sl-rank muted">{i + 1}</td>
              <td className="sl-td">
                <div className="sl-name">
                  <Link className="sl-link" href={getHref(r)}>
                    {r.label}
                  </Link>
                  <div className="sl-bar" aria-hidden="true">
                    <div className="sl-barFill" style={{ width: `${maxShare > 0 ? (r.share / maxShare) * 100 : 0}%` }} />
                  </div>
                </div>
              </td>
              <td className="sl-td sl-num" style={{ fontWeight: 800 }}>
                {safePct(r.share)}
              </td>
              <td className="sl-td sl-num">{r.total}</td>
              <td className="sl-td sl-num">{r.inBucket}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      getKey: (r) => normEntity(r.lead_sponsor),
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
      getKey: (r) => normEntity(r.disease_area),
      getLabel: (k) => k,
      unknownLabel: "Other"
    });
  }, [allRows, bioOnly, minTrialsArea, bucketSetArea]);

  const companyBucketList = useMemo(() => (BUCKETS.find((b) => b.key === bucketCompany) || BUCKETS[0]).buckets, [bucketCompany]);
  const areaBucketList = useMemo(() => (BUCKETS.find((b) => b.key === bucketArea) || BUCKETS[0]).buckets, [bucketArea]);

  return (
    <>
      <Head>
        <title>Share leaders - Clinical trial failures</title>
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
          <header className="sl-header">
            <div className="sl-headerLeft">
              <h1 className="sl-title">Share leaders</h1>
              <div className="muted sl-sub">
                Identify sponsors and disease areas that disproportionately show up in a selected stop-reason bucket. Toggle scientific failures to focus on likely
                biology-driven failures.
              </div>
            </div>

            <div className="sl-headerRight">
              <div className="chip">
                Trials&nbsp;<b>{scopedCount.toLocaleString()}</b>
              </div>
              <label className="sl-bioToggle">
                <input type="checkbox" checked={bioOnly} onChange={(e) => setBioOnly(e.target.checked)} />
                <span>Scientific failures only</span>
              </label>
            </div>
          </header>

          {err ? <div className="card p-4 error">{err}</div> : null}
          {loading ? <div className="card p-4 muted">Loading...</div> : null}

          {!loading && !err ? (
            <section className="sl-grid" aria-label="Share leader panels">
              <div className="card sl-panel">
                <div className="sl-panelHead">
                  <div>
                    <div className="sl-kicker">Company</div>
                    <h2 className="sl-h2">Which company has the highest share of...</h2>
                    <div className="muted sl-help">Share = (trials in selected bucket) / (all trials for that sponsor) within the current scope.</div>
                  </div>
                </div>

                <ControlsRow bucketKey={bucketCompany} setBucketKey={setBucketCompany} minTrials={minTrialsCompany} setMinTrials={setMinTrialsCompany} />

                <div className="sl-topline">
                  <div className="sl-topLabel">Top sponsor</div>
                  <div className="sl-topValue">{companyTable[0]?.label || "--"}</div>
                  {companyTable[0] ? (
                    <div className="muted sl-topSub">
                      {safePct(companyTable[0].share)} ({companyTable[0].inBucket}/{companyTable[0].total})
                    </div>
                  ) : null}
                </div>

                <ShareTable
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

              <div className="card sl-panel">
                <div className="sl-panelHead">
                  <div>
                    <div className="sl-kicker">Disease area</div>
                    <h2 className="sl-h2">Which disease area has the highest share of failures...</h2>
                    <div className="muted sl-help">Same share calculation, grouped by disease area within the current scope.</div>
                  </div>
                </div>

                <ControlsRow bucketKey={bucketArea} setBucketKey={setBucketArea} minTrials={minTrialsArea} setMinTrials={setMinTrialsArea} />

                <div className="sl-topline">
                  <div className="sl-topLabel">Top disease area</div>
                  <div className="sl-topValue">{areaTable[0]?.label || "--"}</div>
                  {areaTable[0] ? (
                    <div className="muted sl-topSub">
                      {safePct(areaTable[0].share)} ({areaTable[0].inBucket}/{areaTable[0].total})
                    </div>
                  ) : null}
                </div>

                <ShareTable
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

          <div className="muted sl-foot">Tip: Shares can be unstable for small denominators - increase "Min trials" to focus on larger samples.</div>
        </main>

        <style jsx>{`
          .sl-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
          }
          .sl-title {
            margin: 0;
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.01em;
          }
          .sl-sub {
            margin-top: 6px;
            font-size: 13px;
            max-width: 820px;
            line-height: 1.4;
          }
          .sl-headerRight {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .sl-bioToggle {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--surface);
            font-size: 13px;
            color: rgba(15, 23, 42, 0.88);
            white-space: nowrap;
            user-select: none;
          }
          .sl-bioToggle input {
            margin: 0;
          }

          .sl-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            align-items: start;
          }

          .sl-panel {
            overflow: hidden;
          }
          .sl-panelHead {
            padding: 14px 16px;
            border-bottom: 1px solid var(--border);
          }
          .sl-kicker {
            font-size: 12px;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .sl-h2 {
            margin: 6px 0 0;
            font-size: 16px;
            font-weight: 900;
            letter-spacing: -0.01em;
          }
          .sl-help {
            margin-top: 6px;
            font-size: 12px;
            line-height: 1.35;
          }

          .sl-controls {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
          }
          .sl-field {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .sl-label {
            font-size: 12px;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .sl-min {
            width: 120px;
            max-width: 120px;
          }

          .sl-topline {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border);
          }
          .sl-topLabel {
            font-size: 12px;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .sl-topValue {
            margin-top: 4px;
            font-size: 18px;
            font-weight: 900;
            color: var(--text);
          }
          .sl-topSub {
            font-size: 13px;
            margin-top: 2px;
          }

          .sl-tableWrap {
            max-height: 520px;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
          }
          .sl-table {
            width: 100%;
            min-width: 680px;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 13px;
          }
          .sl-th {
            position: sticky;
            top: 0;
            z-index: 2;
            background: var(--bg);
            border-bottom: 1px solid var(--border);
            text-align: left;
            padding: 10px 12px;
            font-size: 12px;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          .sl-td {
            padding: 10px 12px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
          }
          .sl-num {
            text-align: right;
            white-space: nowrap;
          }
          .sl-rank {
            width: 54px;
          }
          .sl-name {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .sl-link {
            font-weight: 850;
            color: var(--accent);
          }
          .sl-link:hover {
            text-decoration: underline;
          }
          .sl-bar {
            height: 8px;
            background: rgba(15, 23, 42, 0.06);
            border-radius: 999px;
            overflow: hidden;
          }
          .sl-barFill {
            height: 100%;
            background: rgba(79, 70, 229, 0.65);
          }

          .sl-foot {
            font-size: 12px;
            margin-top: 12px;
          }

          @media (min-width: 980px) {
            .sl-grid {
              grid-template-columns: 1fr 1fr;
            }
          }
          @media (max-width: 520px) {
            .sl-header {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </>
  );
}
