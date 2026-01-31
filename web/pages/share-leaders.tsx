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
  buckets: string[]; // uppercased reasonBucket tokens used for filtering
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

function exploreHref(patch: Partial<UrlState>): string {
  // This page is explicitly scoped to scientific failures only.
  const base: UrlState = { sort: "date_desc", bio: true };
  return `/explore${encodeState({ ...base, ...patch })}`;
}

const BUCKETS: BucketOption[] = [
  { key: "EFFICACY/FUTILITY", label: "Efficacy/Futility", buckets: ["EFFICACY/FUTILITY"] },
  { key: "SAFETY", label: "Safety", buckets: ["SAFETY"] },
  { key: "OPERATIONAL", label: "Operational", buckets: ["OPERATIONAL"] },
  { key: "ENROLLMENT", label: "Enrollment", buckets: ["ENROLLMENT"] },
  { key: "FUNDING", label: "Funding", buckets: ["FUNDING"] },
  { key: "REGULATORY", label: "Regulatory", buckets: ["REGULATORY"] },
  { key: "STRATEGIC", label: "Strategic", buckets: ["STRATEGIC"] },
  { key: "OTHER/UNKNOWN", label: "Missing/Unknown", buckets: ["OTHER/UNKNOWN"] }
];

function computeShareTable(args: {
  rows: TrialIndexRow[];
  minTrials: number;
  bucketSet: Set<string>;
  getKey: (r: TrialIndexRow) => string;
  getLabel: (k: string) => string;
}): ShareRow[] {
  const { rows, minTrials, bucketSet, getKey, getLabel } = args;

  const totals = new Map<string, number>();
  const hits = new Map<string, number>();

  for (const r of rows) {
    // Always scope to scientific failures (bio=true).
    if (!isLikelyScientificFailure(r)) continue;

    const k = normEntity(getKey(r)) || "Unknown";
    totals.set(k, (totals.get(k) || 0) + 1);

    const b = reasonBucket(r).toUpperCase();
    if (bucketSet.has(b)) hits.set(k, (hits.get(k) || 0) + 1);
  }

  const out: ShareRow[] = [];
  for (const [k, total] of totals.entries()) {
    if (total < minTrials) continue;
    const inBucket = hits.get(k) || 0;
    const share = total > 0 ? inBucket / total : 0;
    out.push({ key: k, label: getLabel(k) || k, total, inBucket, share });
  }

  out.sort((a, b) => {
    if (b.share !== a.share) return b.share - a.share;
    if (b.inBucket !== a.inBucket) return b.inBucket - a.inBucket;
    return b.total - a.total;
  });

  return out;
}

function CardShell({ title, subtitle, children }: { title: string; subtitle: string; children: any }) {
  return (
    <section className="card">
      <div className="cardHead">
        <div>
          <h2 className="h2">{title}</h2>
          <div className="muted small">{subtitle}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

function ShareTable({
  rows,
  showExploreLink
}: {
  rows: ShareRow[];
  showExploreLink: (r: ShareRow) => string;
}) {
  const max = rows.length ? rows[0].share : 0;
  return (
    <div className="tableWrap" role="region" aria-label="Share rankings">
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th className="num">Share</th>
            <th className="num">Trials</th>
            <th className="num">In bucket</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((r, i) => (
            <tr key={r.key}>
              <td className="muted">{i + 1}</td>
              <td>
                <div className="nameCell">
                  <Link className="nameLink" href={showExploreLink(r)}>
                    {r.label}
                  </Link>
                  <div className="barTrack" aria-hidden="true">
                    <div
                      className="barFill"
                      style={{ width: `${max > 0 ? (r.share / max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="num strong">{safePct(r.share)}</td>
              <td className="num">{r.total}</td>
              <td className="num">{r.inBucket}</td>
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
      minTrials: Math.max(1, minTrialsCompany || 1),
      bucketSet: bucketSetCompany,
      getKey: (r) => normEntity(r.lead_sponsor) || "Unknown",
      getLabel: (k) => k
    });
  }, [allRows, minTrialsCompany, bucketSetCompany]);

  const areaTable = useMemo(() => {
    return computeShareTable({
      rows: allRows,
      minTrials: Math.max(1, minTrialsArea || 1),
      bucketSet: bucketSetArea,
      getKey: (r) => normEntity(r.disease_area) || "Other",
      getLabel: (k) => k
    });
  }, [allRows, minTrialsArea, bucketSetArea]);

  function bucketLabel(key: string): string {
    return (BUCKETS.find((b) => b.key === key) || BUCKETS[0]).label;
  }

  return (
    <>
      <Head>
        <title>Scientific-failure share leaders — Clinical trial failures</title>
      </Head>

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
        <div className="wrap">
          <div className="hero">
            <h1 className="h1">Scientific-failure share leaders</h1>
            <p className="muted lead">
              Identify disease areas and sponsors that disproportionately fail for a specific scientific reason bucket (e.g., safety or efficacy).
            </p>
            <p className="muted small" style={{ marginTop: 6 }}>
              This page is <span className="strong">scientific failures only</span> (bio=true).
            </p>
          </div>

          {err ? <div className="card error">{err}</div> : null}
          {loading ? <div className="card muted">Loading…</div> : null}

          {!loading && !err ? (
            <div className="grid">
              <CardShell
                title="Which company has the highest share of…"
                subtitle="Share = (scientific-failure trials in selected bucket) / (all scientific-failure trials for that sponsor)."
              >
                <div className="controls">
                  <label className="field">
                    <span className="label">Bucket</span>
                    <select value={bucketCompany} onChange={(e) => setBucketCompany(e.target.value)}>
                      {BUCKETS.map((b) => (
                        <option key={b.key} value={b.key}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span className="label">Min trials</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={minTrialsCompany}
                      onChange={(e) => setMinTrialsCompany(parseInt(e.target.value || "1", 10))}
                    />
                  </label>
                </div>

                <div className="kpiRow">
                  <div className="kpi">
                    <div className="kpiLabel">Top sponsor</div>
                    <div className="kpiValue">{companyTable[0]?.label || "—"}</div>
                    <div className="muted small">
                      {companyTable[0]
                        ? `${safePct(companyTable[0].share)} (${companyTable[0].inBucket}/${companyTable[0].total}) in ${bucketLabel(bucketCompany)}`
                        : ""}
                    </div>
                  </div>
                </div>

                <ShareTable
                  rows={companyTable}
                  showExploreLink={(r) =>
                    exploreHref({ sponsor: [r.key], bucket: BUCKETS.find((b) => b.key === bucketCompany)!.buckets })
                  }
                />
              </CardShell>

              <CardShell
                title="Which disease area has the highest share of failures…"
                subtitle="Same share calculation (scientific failures only), grouped by disease area."
              >
                <div className="controls">
                  <label className="field">
                    <span className="label">Bucket</span>
                    <select value={bucketArea} onChange={(e) => setBucketArea(e.target.value)}>
                      {BUCKETS.map((b) => (
                        <option key={b.key} value={b.key}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span className="label">Min trials</span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={minTrialsArea}
                      onChange={(e) => setMinTrialsArea(parseInt(e.target.value || "1", 10))}
                    />
                  </label>
                </div>

                <div className="kpiRow">
                  <div className="kpi">
                    <div className="kpiLabel">Top disease area</div>
                    <div className="kpiValue">{areaTable[0]?.label || "—"}</div>
                    <div className="muted small">
                      {areaTable[0]
                        ? `${safePct(areaTable[0].share)} (${areaTable[0].inBucket}/${areaTable[0].total}) in ${bucketLabel(bucketArea)}`
                        : ""}
                    </div>
                  </div>
                </div>

                <ShareTable
                  rows={areaTable}
                  showExploreLink={(r) =>
                    exploreHref({ area: [r.key], bucket: BUCKETS.find((b) => b.key === bucketArea)!.buckets })
                  }
                />
              </CardShell>
            </div>
          ) : null}

          <div className="foot muted small">
            Tip: Shares can be unstable for small denominators — increase “Min trials” to focus on larger samples.
          </div>
        </div>
      </main>

      <style jsx>{`
        .wrap {
          max-width: 1400px;
          margin: 0 auto;
        }
        .hero {
          margin-bottom: 12px;
        }
        .h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 900;
          letter-spacing: -0.01em;
        }
        .lead {
          margin-top: 8px;
          font-size: 14px;
          line-height: 1.45;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .card {
          border: 1px solid var(--border);
          border-radius: 16px;
          background: white;
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.02);
        }
        .error {
          padding: 12px;
          border-color: #fecaca;
          background: #fff1f2;
          color: #991b1b;
          font-size: 13px;
        }
        .cardHead {
          padding: 14px 14px 10px;
          border-bottom: 1px solid var(--border);
        }
        .h2 {
          margin: 0;
          font-size: 15px;
          font-weight: 850;
        }
        .small {
          font-size: 12px;
        }
        .muted {
          color: var(--muted);
        }
        .strong {
          font-weight: 850;
          color: var(--text);
        }

        .controls {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
        }
        .field {
          display: grid;
          gap: 4px;
        }
        .label {
          font-size: 12px;
          color: var(--muted);
          font-weight: 800;
        }
        select,
        input {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 8px 10px;
          font-size: 13px;
          min-width: 210px;
          background: white;
          color: var(--text);
        }
        input {
          min-width: 120px;
          width: 140px;
        }

        .kpiRow {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border);
        }
        .kpiLabel {
          font-size: 12px;
          color: var(--muted);
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .kpiValue {
          margin-top: 4px;
          font-size: 16px;
          font-weight: 900;
          color: var(--text);
        }

        .tableWrap {
          max-height: 420px;
          overflow: auto;
          border-radius: 0 0 16px 16px;
        }
        .table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 660px;
        }
        thead th {
          position: sticky;
          top: 0;
          z-index: 2;
          background: #f8fafc;
          border-bottom: 1px solid var(--border);
          padding: 10px;
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.02em;
          text-align: left;
        }
        tbody td {
          padding: 10px;
          border-bottom: 1px solid var(--border);
          font-size: 13px;
          color: var(--text);
          vertical-align: top;
        }
        .num {
          text-align: right;
          white-space: nowrap;
        }
        .nameCell {
          display: grid;
          gap: 6px;
        }
        .nameLink {
          font-weight: 850;
          color: #1d4ed8;
          text-decoration: none;
        }
        .nameLink:hover {
          text-decoration: underline;
        }
        .barTrack {
          height: 6px;
          background: #eef2ff;
          border-radius: 999px;
          overflow: hidden;
        }
        .barFill {
          height: 100%;
          background: #6366f1;
        }
        .foot {
          margin-top: 12px;
        }

        @media (min-width: 980px) {
          .grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 720px) {
          select {
            min-width: 100%;
          }
          input {
            width: 100%;
          }
          .table {
            min-width: 640px;
          }
          .tableWrap {
            max-height: 380px;
          }
        }
      `}</style>
    </>
  );
}
