// web/pages/pharma-intelligence.tsx

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadIndex, loadMeta } from "@/lib/data";
import { DatasetMeta, TrialIndexRow, UrlState } from "@/lib/types";
import { encodeState } from "@/lib/urlState";
import { isLikelyScientificFailure, parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

type BucketKey = string;
type PhaseKey = string;

type BucketStat = {
  bucket: BucketKey;
  total: number;
  bio: number;
  bioShare: number; // 0..1
};

type PhaseBucketCell = {
  phase: PhaseKey;
  bucket: BucketKey;
  total: number;
  bio: number;
};

type SimpleRow = { key: string; label: string; total: number; bio: number; bioShare: number };

function normEntity(s?: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function safePct(x: number): string {
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function confKey(s?: string): "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" {
  const v = (s || "").toUpperCase().trim();
  if (v === "HIGH") return "HIGH";
  if (v === "MEDIUM") return "MEDIUM";
  if (v === "LOW") return "LOW";
  return "UNKNOWN";
}

function primaryPhase(r: TrialIndexRow): PhaseKey {
  const ps = parsePhases(r.phases || "");
  if (ps.length === 0) return "UNKNOWN";
  // Prefer a single representative phase token for counting (avoids double-counting multi-phase strings)
  return ps[0] || "UNKNOWN";
}

function exploreHref(patch: Partial<UrlState>): string {
  const base: UrlState = {
    sort: "date_desc"
  };
  return `/explore${encodeState({ ...base, ...patch })}`;
}

function TopK<T>(arr: T[], k: number): T[] {
  return arr.slice(0, Math.max(0, k));
}

function Bar({
  value,
  max,
  label
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div className="barWrap" aria-label={label}>
      <div className="barTrack">
        <div className="barFill" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

export default function PharmaIntelligencePage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [allRows, setAllRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Local “intel page” focus toggle (does not affect Explore)
  const [focusBio, setFocusBio] = useState<boolean>(false);

  // Sponsor selection
  const [selectedSponsor, setSelectedSponsor] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const [m, idx] = await Promise.all([loadMeta(), loadIndex()]);
        if (!alive) return;
        setMeta(m);
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

  const rows = useMemo(() => {
    if (!focusBio) return allRows;
    return allRows.filter((r) => isLikelyScientificFailure(r));
  }, [allRows, focusBio]);

  const totals = useMemo(() => {
    const total = allRows.length;
    const bio = allRows.filter((r) => isLikelyScientificFailure(r)).length;

    const byConf = { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 } as Record<
      "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN",
      number
    >;

    // Confidence distribution on likely scientific failures only
    for (const r of allRows) {
      if (!isLikelyScientificFailure(r)) continue;
      byConf[confKey(r.classification_confidence)] += 1;
    }

    // Last updated range (descriptive only)
    let minDate = "";
    let maxDate = "";
    for (const r of allRows) {
      const d = (r.last_update_post_date || r.date || "").slice(0, 10);
      if (!d) continue;
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }

    return {
      total,
      bio,
      bioShare: total > 0 ? bio / total : 0,
      byConf,
      minDate,
      maxDate
    };
  }, [allRows]);

  const bucketOrder: BucketKey[] = useMemo(
    () => [
      "EFFICACY/FUTILITY",
      "SAFETY",
      "ENROLLMENT",
      "OPERATIONAL",
      "FUNDING",
      "REGULATORY",
      "STRATEGIC",
      "OTHER/UNKNOWN"
    ],
    []
  );

  const bucketStats = useMemo<BucketStat[]>(() => {
    const map = new Map<BucketKey, { total: number; bio: number }>();
    for (const b of bucketOrder) map.set(b, { total: 0, bio: 0 });

    for (const r of rows) {
      const b = reasonBucket(r).toUpperCase().trim() || "OTHER/UNKNOWN";
      const key = map.has(b) ? b : "OTHER/UNKNOWN";
      const cur = map.get(key)!;
      cur.total += 1;
      if (isLikelyScientificFailure(r)) cur.bio += 1;
    }

    const out: BucketStat[] = Array.from(map.entries()).map(([bucket, v]) => ({
      bucket,
      total: v.total,
      bio: v.bio,
      bioShare: v.total > 0 ? v.bio / v.total : 0
    }));

    // If data produces buckets outside canonical order, append them
    const extra: BucketStat[] = [];
    const known = new Set(bucketOrder);
    for (const r of rows) {
      const b = reasonBucket(r).toUpperCase().trim() || "OTHER/UNKNOWN";
      if (!known.has(b) && b) {
        if (!extra.find((x) => x.bucket === b)) extra.push({ bucket: b, total: 0, bio: 0, bioShare: 0 });
      }
    }
    if (extra.length) {
      const extraMap = new Map<string, { total: number; bio: number }>();
      for (const e of extra) extraMap.set(e.bucket, { total: 0, bio: 0 });
      for (const r of rows) {
        const b = reasonBucket(r).toUpperCase().trim() || "OTHER/UNKNOWN";
        if (!extraMap.has(b)) continue;
        const cur = extraMap.get(b)!;
        cur.total += 1;
        if (isLikelyScientificFailure(r)) cur.bio += 1;
      }
      for (const [bucket, v] of extraMap.entries()) {
        extra.push({ bucket, total: v.total, bio: v.bio, bioShare: v.total > 0 ? v.bio / v.total : 0 });
      }
      // Rebuild extra as unique
      const uniqExtra = new Map<string, BucketStat>();
      for (const e of extra) uniqExtra.set(e.bucket, e);
      return [...out, ...Array.from(uniqExtra.values())].sort((a, b) => b.total - a.total);
    }

    return out;
  }, [rows, bucketOrder]);

  const bucketMax = useMemo(() => Math.max(1, ...bucketStats.map((b) => b.total)), [bucketStats]);

  const phaseKeys = useMemo<PhaseKey[]>(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(primaryPhase(r));
    const arr = Array.from(s);
    // Preferred ordering
    const preferred = [
      "EARLY_PHASE1",
      "PHASE1",
      "PHASE1/PHASE2",
      "PHASE2",
      "PHASE2/PHASE3",
      "PHASE3",
      "PHASE4",
      "UNKNOWN"
    ];
    arr.sort((a, b) => {
      const ia = preferred.indexOf(a);
      const ib = preferred.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return arr;
  }, [rows]);

  const phaseBucketMatrix = useMemo(() => {
    // Map[phase][bucket] = {total,bio}
    const m = new Map<PhaseKey, Map<BucketKey, { total: number; bio: number }>>();
    for (const p of phaseKeys) {
      const inner = new Map<BucketKey, { total: number; bio: number }>();
      for (const b of bucketOrder) inner.set(b, { total: 0, bio: 0 });
      m.set(p, inner);
    }

    for (const r of rows) {
      const p = primaryPhase(r);
      const bRaw = reasonBucket(r).toUpperCase().trim() || "OTHER/UNKNOWN";
      const b = bucketOrder.includes(bRaw) ? bRaw : "OTHER/UNKNOWN";
      if (!m.has(p)) {
        const inner = new Map<BucketKey, { total: number; bio: number }>();
        for (const bb of bucketOrder) inner.set(bb, { total: 0, bio: 0 });
        m.set(p, inner);
      }
      const cell = m.get(p)!.get(b)!;
      cell.total += 1;
      if (isLikelyScientificFailure(r)) cell.bio += 1;
    }

    const cells: PhaseBucketCell[] = [];
    for (const p of phaseKeys) {
      const inner = m.get(p);
      if (!inner) continue;
      for (const b of bucketOrder) {
        const v = inner.get(b);
        if (!v) continue;
        cells.push({ phase: p, bucket: b, total: v.total, bio: v.bio });
      }
    }
    return cells;
  }, [rows, phaseKeys, bucketOrder]);

  const matrixMax = useMemo(() => Math.max(1, ...phaseBucketMatrix.map((c) => c.total)), [phaseBucketMatrix]);

  const diseaseAreaStats = useMemo<SimpleRow[]>(() => {
    const map = new Map<string, { total: number; bio: number }>();
    for (const r of rows) {
      const a = normEntity(r.disease_area || "Other") || "Other";
      if (!map.has(a)) map.set(a, { total: 0, bio: 0 });
      const cur = map.get(a)!;
      cur.total += 1;
      if (isLikelyScientificFailure(r)) cur.bio += 1;
    }
    const out: SimpleRow[] = Array.from(map.entries()).map(([k, v]) => ({
      key: k,
      label: k,
      total: v.total,
      bio: v.bio,
      bioShare: v.total > 0 ? v.bio / v.total : 0
    }));
    out.sort((a, b) => b.total - a.total);
    return TopK(out, 20);
  }, [rows]);

  const conditionStats = useMemo<SimpleRow[]>(() => {
    const map = new Map<string, { total: number; bio: number }>();
    for (const r of rows) {
      const c = normEntity(r.condition_first || "");
      if (!c) continue;
      if (!map.has(c)) map.set(c, { total: 0, bio: 0 });
      const cur = map.get(c)!;
      cur.total += 1;
      if (isLikelyScientificFailure(r)) cur.bio += 1;
    }
    const out: SimpleRow[] = Array.from(map.entries()).map(([k, v]) => ({
      key: k,
      label: k,
      total: v.total,
      bio: v.bio,
      bioShare: v.total > 0 ? v.bio / v.total : 0
    }));
    out.sort((a, b) => b.total - a.total);
    return TopK(out, 25);
  }, [rows]);

  const sponsorUniverse = useMemo(() => {
    const map = new Map<string, { total: number; bio: number }>();
    for (const r of allRows) {
      const s = normEntity(r.lead_sponsor || "");
      if (!s) continue;
      if (!map.has(s)) map.set(s, { total: 0, bio: 0 });
      const cur = map.get(s)!;
      cur.total += 1;
      if (isLikelyScientificFailure(r)) cur.bio += 1;
    }
    const list = Array.from(map.entries())
      .map(([s, v]) => ({ sponsor: s, total: v.total, bio: v.bio, bioShare: v.total > 0 ? v.bio / v.total : 0 }))
      .sort((a, b) => b.total - a.total);

    return TopK(list, 80);
  }, [allRows]);

  useEffect(() => {
    // Initialize selected sponsor once we have a list
    if (!selectedSponsor && sponsorUniverse.length) setSelectedSponsor(sponsorUniverse[0].sponsor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsorUniverse.length]);

  const sponsorProfile = useMemo(() => {
    const s = normEntity(selectedSponsor);
    if (!s) return null;
    const sponsorRows = rows.filter((r) => normEntity(r.lead_sponsor || "") === s);
    if (!sponsorRows.length) return { sponsor: s, rows: [] as TrialIndexRow[] };

    const total = sponsorRows.length;
    const bio = sponsorRows.filter((r) => isLikelyScientificFailure(r)).length;

    // Buckets
    const bucketMap = new Map<string, number>();
    for (const r of sponsorRows) {
      const b = reasonBucket(r).toUpperCase().trim() || "OTHER/UNKNOWN";
      bucketMap.set(b, (bucketMap.get(b) || 0) + 1);
    }
    const topBuckets = Array.from(bucketMap.entries())
      .map(([k, v]) => ({ bucket: k, count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Phases
    const phaseMap = new Map<string, number>();
    for (const r of sponsorRows) {
      const p = primaryPhase(r);
      phaseMap.set(p, (phaseMap.get(p) || 0) + 1);
    }
    const topPhases = Array.from(phaseMap.entries())
      .map(([k, v]) => ({ phase: k, count: v }))
      .sort((a, b) => b.count - a.count);

    // Conditions
    const condMap = new Map<string, number>();
    for (const r of sponsorRows) {
      const c = normEntity(r.condition_first || "");
      if (!c) continue;
      condMap.set(c, (condMap.get(c) || 0) + 1);
    }
    const topConds = Array.from(condMap.entries())
      .map(([k, v]) => ({ condition: k, count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return {
      sponsor: s,
      rows: sponsorRows,
      total,
      bio,
      bioShare: total > 0 ? bio / total : 0,
      topBuckets,
      topPhases,
      topConds
    };
  }, [rows, selectedSponsor]);

  return (
    <>
      <Head>
        <title>Pharma Intelligence — Clinical trial failures</title>
      </Head>

      {/* Use the same “topbar” class that Explore relies on (mobile behavior already defined in globals.css) */}
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
              <Link className="navlink" href="/pharma-intelligence" aria-current="page" style={{ color: "var(--text)" }}>
                Pharma intelligence
              </Link>
              <Link className="navlink" href="/methods">
                Methods
              </Link>
            </nav>
          </div>

          <div className="topbar-center" />

          <div className="topbar-right">
            <label className="chip" style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={focusBio}
                onChange={(e) => setFocusBio(e.target.checked)}
                style={{ marginRight: 8 }}
              />
              Focus: likely scientific failures
            </label>

            <Link className="btn" href={exploreHref({ bio: focusBio ? true : undefined })}>
              Open Explore with focus
            </Link>
          </div>
        </div>
      </header>

      <main className="page">
        <div className="sectionHeader">
          <div>
            <h1 className="h1">Pharma Intelligence</h1>
            <div className="muted small">
              Descriptive analytics over stopped trials in the registry. Use “drill-down” links to validate in Explore.
              {meta?.version ? <span> Dataset: <strong>{meta.version}</strong>.</span> : null}
              {totals.minDate && totals.maxDate ? (
                <span> Last-update date range: <strong>{totals.minDate}</strong> to <strong>{totals.maxDate}</strong>.</span>
              ) : null}
            </div>
          </div>

          <div className="rightMeta">
            {meta?.source ? <div className="chip">Source: <strong style={{ marginLeft: 6 }}>{meta.source}</strong></div> : null}
          </div>
        </div>

        {loading ? (
          <div className="card p-4">Loading…</div>
        ) : err ? (
          <div className="card p-4 error">{err}</div>
        ) : (
          <>
            {/* KPI tiles */}
            <section className="grid3" aria-label="Key metrics">
              <div className="card p-4">
                <div className="muted small">Stopped trials (current focus)</div>
                <div className="kpi">{rows.length.toLocaleString()}</div>
                <div className="muted small">
                  {focusBio ? "Filtered to likely scientific failures." : "All stopped trials in the dataset."}
                </div>
              </div>

              <div className="card p-4">
                <div className="muted small">Likely scientific failures (overall)</div>
                <div className="kpi">{totals.bio.toLocaleString()}</div>
                <div className="muted small">Share of all stopped trials: <strong>{safePct(totals.bioShare)}</strong></div>
                <div className="miniRow">
                  <div className="miniLabel">HIGH</div><div className="miniVal">{totals.byConf.HIGH.toLocaleString()}</div>
                  <div className="miniLabel">MED</div><div className="miniVal">{totals.byConf.MEDIUM.toLocaleString()}</div>
                  <div className="miniLabel">LOW</div><div className="miniVal">{totals.byConf.LOW.toLocaleString()}</div>
                  <div className="miniLabel">UNK</div><div className="miniVal">{totals.byConf.UNKNOWN.toLocaleString()}</div>
                </div>
              </div>

              <div className="card p-4">
                <div className="muted small">Fast drill-down</div>
                <div className="muted small" style={{ marginTop: 6 }}>
                  Use bucket/phase/area links below to open Explore with pre-applied filters.
                </div>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Link className="btn" href={exploreHref({ bucket: ["EFFICACY/FUTILITY"] })}>
                    Efficacy/Futility
                  </Link>
                  <Link className="btn" href={exploreHref({ bucket: ["SAFETY"] })}>
                    Safety
                  </Link>
                  <Link className="btn" href={exploreHref({ bucket: ["ENROLLMENT"] })}>
                    Enrollment
                  </Link>
                </div>
              </div>
            </section>

            {/* Failure taxonomy */}
            <section className="section" aria-label="Failure taxonomy">
              <div className="sectionTitleRow">
                <h2 className="h2">Failure taxonomy</h2>
                <div className="muted small">
                  Buckets use structured fields where available, otherwise rule-based parsing of recorded stop reason text.
                </div>
              </div>

              <div className="grid2">
                <div className="card p-4">
                  <h3 className="h3">Reason buckets</h3>
                  <div className="muted small">Counts are within the current page focus (toggle in header).</div>

                  <div className="tableWrap" style={{ marginTop: 10 }}>
                    <table className="miniTbl" aria-label="Reason bucket table">
                      <thead>
                        <tr>
                          <th>Bucket</th>
                          <th style={{ width: 120, textAlign: "right" }}>Trials</th>
                          <th style={{ width: 140, textAlign: "right" }}>Bio share</th>
                          <th style={{ width: 120 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {bucketStats
                          .slice()
                          .sort((a, b) => b.total - a.total)
                          .map((b) => (
                            <tr key={b.bucket}>
                              <td>
                                <Link className="link" href={exploreHref({ bucket: [b.bucket] })}>
                                  {b.bucket}
                                </Link>
                                <div className="muted small">
                                  {b.bio.toLocaleString()} likely scientific failures
                                </div>
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 750 }}>{b.total.toLocaleString()}</td>
                              <td style={{ textAlign: "right" }}>{safePct(b.bioShare)}</td>
                              <td>
                                <Bar value={b.total} max={bucketMax} label={`${b.bucket} volume`} />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="note">
                    Interpretation: “Bio share” is a descriptive fraction of trials in that bucket flagged as likely scientific failure.
                  </div>
                </div>

                <div className="card p-4">
                  <h3 className="h3">Phase × bucket matrix</h3>
                  <div className="muted small">
                    Click a cell to open Explore with both filters applied.
                  </div>

                  <div className="tableWrap" style={{ marginTop: 10 }}>
                    <table className="matrixTbl" aria-label="Phase by bucket matrix">
                      <thead>
                        <tr>
                          <th>Phase</th>
                          {bucketOrder.map((b) => (
                            <th key={b} title={b} style={{ minWidth: 140 }}>
                              {b}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {phaseKeys.map((p) => (
                          <tr key={p}>
                            <td style={{ fontWeight: 750 }}>{phaseLabel(p)}</td>
                            {bucketOrder.map((b) => {
                              const cell = phaseBucketMatrix.find((x) => x.phase === p && x.bucket === b);
                              const total = cell?.total || 0;
                              const bio = cell?.bio || 0;
                              const cellHref = exploreHref({
                                phase: p === "UNKNOWN" ? ["UNKNOWN"] : [p],
                                bucket: [b],
                                bio: focusBio ? true : undefined
                              });
                              return (
                                <td key={`${p}_${b}`}>
                                  <Link className="cellLink" href={cellHref} title={`${phaseLabel(p)} × ${b}`}>
                                    <div className="cellTop">
                                      <span className="cellNum">{total.toLocaleString()}</span>
                                      <span className="cellSub muted small">{bio.toLocaleString()} bio</span>
                                    </div>
                                    <div className="cellBar">
                                      <div className="cellBarFill" style={{ width: `${(total / matrixMax) * 100}%` }} />
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

                  <div className="note">
                    Counting uses a single “primary” phase token per trial (avoids double-counting trials that list multiple phase tokens).
                  </div>
                </div>
              </div>
            </section>

            {/* Indication landscape */}
            <section className="section" aria-label="Indication landscape">
              <div className="sectionTitleRow">
                <h2 className="h2">Indication landscape</h2>
                <div className="muted small">
                  Disease area uses the dataset’s area field; conditions use the trial’s first listed condition term.
                </div>
              </div>

              <div className="grid2">
                <div className="card p-4">
                  <h3 className="h3">By disease area</h3>
                  <div className="tableWrap" style={{ marginTop: 10 }}>
                    <table className="miniTbl" aria-label="Disease area table">
                      <thead>
                        <tr>
                          <th>Disease area</th>
                          <th style={{ width: 120, textAlign: "right" }}>Trials</th>
                          <th style={{ width: 140, textAlign: "right" }}>Bio share</th>
                          <th style={{ width: 120 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {diseaseAreaStats.map((a) => (
                          <tr key={a.key}>
                            <td>
                              <Link className="link" href={exploreHref({ area: [a.key] })}>
                                {a.label}
                              </Link>
                              <div className="muted small">{a.bio.toLocaleString()} likely scientific failures</div>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 750 }}>{a.total.toLocaleString()}</td>
                            <td style={{ textAlign: "right" }}>{safePct(a.bioShare)}</td>
                            <td>
                              <Bar value={a.total} max={Math.max(1, ...diseaseAreaStats.map((x) => x.total))} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="note">Drill-down uses the existing Explore “area” filter (URL state), so behavior stays consistent.</div>
                </div>

                <div className="card p-4">
                  <h3 className="h3">Top conditions</h3>
                  <div className="muted small">
                    Explore does not currently support a structured “condition” URL facet; drill-down uses search query (q).
                  </div>

                  <div className="tableWrap" style={{ marginTop: 10 }}>
                    <table className="miniTbl" aria-label="Condition table">
                      <thead>
                        <tr>
                          <th>Condition</th>
                          <th style={{ width: 120, textAlign: "right" }}>Trials</th>
                          <th style={{ width: 140, textAlign: "right" }}>Bio share</th>
                          <th style={{ width: 120 }} />
                        </tr>
                      </thead>
                      <tbody>
                        {conditionStats.map((c) => (
                          <tr key={c.key}>
                            <td>
                              <Link className="link" href={exploreHref({ q: c.key })}>
                                {c.label}
                              </Link>
                              <div className="muted small">{c.bio.toLocaleString()} likely scientific failures</div>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 750 }}>{c.total.toLocaleString()}</td>
                            <td style={{ textAlign: "right" }}>{safePct(c.bioShare)}</td>
                            <td>
                              <Bar value={c.total} max={Math.max(1, ...conditionStats.map((x) => x.total))} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="note">
                    Because this uses text search, results may include trials mentioning the condition in title/reason text, not only structured condition fields.
                  </div>
                </div>
              </div>
            </section>

            {/* Sponsor mix */}
            <section className="section" aria-label="Sponsor mix">
              <div className="sectionTitleRow">
                <h2 className="h2">Sponsor mix</h2>
                <div className="muted small">
                  Sponsor analytics are descriptive; naming variance and corporate structure can affect grouping. Use drill-down to validate.
                </div>
              </div>

              <div className="card p-4">
                <div className="sponsorRow">
                  <div style={{ minWidth: 280, flex: "1 1 320px" }}>
                    <div className="muted small" style={{ marginBottom: 6 }}>Select sponsor (top by volume)</div>
                    <select
                      className="input"
                      value={selectedSponsor}
                      onChange={(e) => setSelectedSponsor(e.target.value)}
                      aria-label="Select sponsor"
                    >
                      {sponsorUniverse.map((s) => (
                        <option key={s.sponsor} value={s.sponsor}>
                          {s.sponsor} ({s.total})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sponsorActions">
                    <Link className="btn" href={exploreHref({ q: selectedSponsor || undefined })}>
                      Open in Explore (search)
                    </Link>
                    <Link className="btn" href={exploreHref({ q: selectedSponsor || undefined, bio: true })}>
                      Explore (bio focus)
                    </Link>
                  </div>
                </div>

                {!sponsorProfile || sponsorProfile.rows.length === 0 ? (
                  <div className="note">No trials found for this sponsor under the current page focus.</div>
                ) : (
                  <div className="grid2" style={{ marginTop: 14 }}>
                    <div className="card p-4" style={{ background: "var(--surface-2)" }}>
                      <h3 className="h3">{sponsorProfile.sponsor}</h3>
                      <div className="kpiSm">{sponsorProfile.total.toLocaleString()} trials</div>
                      <div className="muted small">
                        Likely scientific failures: <strong>{sponsorProfile.bio.toLocaleString()}</strong> ({safePct(sponsorProfile.bioShare)})
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div className="muted small" style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>
                          Top reason buckets
                        </div>
                        <div className="tableWrap" style={{ marginTop: 8 }}>
                          <table className="miniTbl" aria-label="Sponsor bucket mix">
                            <thead>
                              <tr>
                                <th>Bucket</th>
                                <th style={{ width: 120, textAlign: "right" }}>Trials</th>
                                <th style={{ width: 120 }} />
                              </tr>
                            </thead>
                            <tbody>
                              {sponsorProfile.topBuckets.map((b) => (
                                <tr key={b.bucket}>
                                  <td>
                                    <Link className="link" href={exploreHref({ q: sponsorProfile.sponsor, bucket: [b.bucket] })}>
                                      {b.bucket}
                                    </Link>
                                  </td>
                                  <td style={{ textAlign: "right", fontWeight: 750 }}>{b.count.toLocaleString()}</td>
                                  <td>
                                    <Bar value={b.count} max={Math.max(1, ...sponsorProfile.topBuckets.map((x) => x.count))} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div className="card p-4" style={{ background: "var(--surface-2)" }}>
                      <h3 className="h3">Phase and indication mix</h3>

                      <div className="splitCols">
                        <div>
                          <div className="muted small" style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>
                            Phases
                          </div>
                          <div className="tableWrap" style={{ marginTop: 8 }}>
                            <table className="miniTbl" aria-label="Sponsor phase mix">
                              <thead>
                                <tr>
                                  <th>Phase</th>
                                  <th style={{ width: 120, textAlign: "right" }}>Trials</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sponsorProfile.topPhases.map((p) => (
                                  <tr key={p.phase}>
                                    <td>
                                      <Link className="link" href={exploreHref({ q: sponsorProfile.sponsor, phase: [p.phase] })}>
                                        {phaseLabel(p.phase)}
                                      </Link>
                                    </td>
                                    <td style={{ textAlign: "right", fontWeight: 750 }}>{p.count.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div>
                          <div className="muted small" style={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em" }}>
                            Top conditions
                          </div>
                          <div className="tableWrap" style={{ marginTop: 8 }}>
                            <table className="miniTbl" aria-label="Sponsor top conditions">
                              <thead>
                                <tr>
                                  <th>Condition</th>
                                  <th style={{ width: 120, textAlign: "right" }}>Trials</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sponsorProfile.topConds.map((c) => (
                                  <tr key={c.condition}>
                                    <td>
                                      <Link className="link" href={exploreHref({ q: c.condition })}>
                                        {c.condition}
                                      </Link>
                                    </td>
                                    <td style={{ textAlign: "right", fontWeight: 750 }}>{c.count.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="note">
                            Condition drill-down uses Explore search (q) because condition facets are not encoded in Explore URLs today.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="note" style={{ marginTop: 14 }}>
                  Guardrail: do not interpret sponsor volume as “worse”; it may reflect portfolio size, registry practices, or acquisitions.
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Local, scoped styles for responsiveness without touching global CSS */}
      <style jsx>{`
        .sectionHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }
        .rightMeta {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 850;
          letter-spacing: -0.01em;
        }
        .h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 850;
        }
        .h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 850;
        }
        .small {
          font-size: 12px;
          line-height: 1.35;
        }
        .kpi {
          margin-top: 6px;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }
        .kpiSm {
          margin-top: 6px;
          font-size: 18px;
          font-weight: 900;
        }
        .miniRow {
          margin-top: 10px;
          display: grid;
          grid-template-columns: auto auto auto auto auto auto auto auto;
          gap: 6px 10px;
          align-items: center;
          font-size: 12px;
        }
        .miniLabel {
          color: var(--text-muted);
          font-weight: 900;
          letter-spacing: 0.06em;
        }
        .miniVal {
          font-weight: 850;
        }

        .grid3 {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        .grid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .section {
          margin-top: 18px;
        }
        .sectionTitleRow {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .tableWrap {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .miniTbl,
        .matrixTbl {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          min-width: 680px;
        }
        .miniTbl th,
        .miniTbl td,
        .matrixTbl th,
        .matrixTbl td {
          border-bottom: 1px solid var(--border);
          padding: 10px 10px;
          vertical-align: top;
        }
        .miniTbl th,
        .matrixTbl th {
          text-align: left;
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          position: sticky;
          top: 0;
          background: var(--surface);
          z-index: 1;
        }

        .barWrap {
          display: flex;
          justify-content: flex-end;
        }
        .barTrack {
          width: 100px;
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

        .cellLink {
          display: block;
          border-radius: 12px;
          padding: 8px;
          background: rgba(15, 23, 42, 0.02);
        }
        .cellLink:hover {
          background: rgba(79, 70, 229, 0.06);
        }
        .cellTop {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }
        .cellNum {
          font-weight: 900;
        }
        .cellBar {
          margin-top: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.08);
          overflow: hidden;
        }
        .cellBarFill {
          height: 100%;
          background: rgba(79, 70, 229, 0.55);
          border-radius: 999px;
        }

        .sponsorRow {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .sponsorActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          flex: 1 1 240px;
        }
        .splitCols {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 12px;
        }

        @media (max-width: 980px) {
          .grid3 {
            grid-template-columns: 1fr;
          }
          .grid2 {
            grid-template-columns: 1fr;
          }
          .splitCols {
            grid-template-columns: 1fr;
          }
          .sectionHeader {
            flex-direction: column;
          }
          .rightMeta {
            justify-content: flex-start;
          }
        }
      `}</style>
    </>
  );
}
