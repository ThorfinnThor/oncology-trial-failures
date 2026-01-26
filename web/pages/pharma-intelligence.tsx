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

type SimpleRow = {
  key: string;
  label: string;
  total: number;
  bio: number;
  bioShare: number;
};

type SponsorProfile = {
  sponsor: string;
  rows: TrialIndexRow[];
  total: number;
  bio: number;
  bioShare: number;
  topBuckets: { bucket: string; count: number }[];
  topPhases: { phase: string; count: number }[];
  topConds: { condition: string; count: number }[];
};

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

function exploreHref(patch: Partial<UrlState>): string {
  const base: UrlState = { sort: "date_desc" };
  return `/explore${encodeState({ ...base, ...patch })}`;
}

function TopK<T>(arr: T[], k: number): T[] {
  return arr.slice(0, Math.max(0, k));
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

/**
 * PHASE NORMALIZATION
 * Fixes “Unknown” duplication by forcing all non-canonical tokens into UNKNOWN.
 */
const CANON_PHASES = new Set([
  "EARLY_PHASE1",
  "PHASE1",
  "PHASE1/PHASE2",
  "PHASE2",
  "PHASE2/PHASE3",
  "PHASE3",
  "PHASE4",
  "UNKNOWN"
]);

const PHASE_ORDER: string[] = [
  "EARLY_PHASE1",
  "PHASE1",
  "PHASE1/PHASE2",
  "PHASE2",
  "PHASE2/PHASE3",
  "PHASE3",
  "PHASE4",
  "UNKNOWN"
];

function normalizePhaseToken(p: string): PhaseKey {
  const u = (p || "").toUpperCase().trim();
  if (!u) return "UNKNOWN";
  return CANON_PHASES.has(u) ? u : "UNKNOWN";
}

/**
 * Representative phase for counting. For multi-phase strings,
 * we pick the earliest meaningful phase by PHASE_ORDER.
 */
function representativePhase(r: TrialIndexRow): PhaseKey {
  const raw = parsePhases(r.phases || "");
  if (!raw.length) return "UNKNOWN";
  const tokens = Array.from(new Set(raw.map(normalizePhaseToken)));
  tokens.sort((a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b));
  return tokens[0] || "UNKNOWN";
}

/**
 * CONDITION NORMALIZATION
 * Fixes COVID-19 / Covid19 / COVID 19 duplication and similar spelling issues.
 * Also allows “exclude healthy volunteer” behavior.
 */
function normalizeConditionKey(s: string): string {
  const t = (s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[()]/g, " ")
    .replace(/[-_/]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Canonical COVID handling
  const compact = t.replace(/\s+/g, "");
  if (compact === "covid19" || compact === "covid2019" || compact === "coronavirusdisease2019") return "covid-19";

  return t;
}

function canonicalConditionLabel(key: string, fallback: string): string {
  const k = (key || "").trim();
  if (k === "covid-19") return "COVID-19";
  // Default: prefer the most common observed label; fallback to original
  return fallback || key;
}

function isHealthyConditionKey(key: string): boolean {
  const k = (key || "").toLowerCase().trim();
  // Keep conservative. Only exclude “healthy” style.
  if (k === "healthy") return true;
  if (k === "healthy volunteers") return true;
  if (k === "healthy volunteer") return true;
  // Registry sometimes uses “healthy subjects”
  if (k === "healthy subjects") return true;
  if (k === "healthy subject") return true;
  return false;
}

/**
 * BUCKET DISPLAY POLICY
 * Aligns with Explore by always showing core buckets, and only showing other
 * buckets if they actually appear (>0).
 */
const CORE_BUCKETS: BucketKey[] = [
  "EFFICACY/FUTILITY",
  "SAFETY",
  "ENROLLMENT",
  "OPERATIONAL",
  "OTHER/UNKNOWN"
];

export default function PharmaIntelligencePage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [allRows, setAllRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Local intel toggles (do not affect Explore)
  const [focusBio, setFocusBio] = useState<boolean>(false);
  const [excludeHealthy, setExcludeHealthy] = useState<boolean>(true);

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

    for (const r of allRows) {
      if (!isLikelyScientificFailure(r)) continue;
      byConf[confKey(r.classification_confidence)] += 1;
    }

    let minDate = "";
    let maxDate = "";
    for (const r of allRows) {
      const d = (r.last_update_post_date || r.date || "").slice(0, 10);
      if (!d) continue;
      if (!minDate || d < minDate) minDate = d;
      if (!maxDate || d > maxDate) maxDate = d;
    }

    return { total, bio, bioShare: total > 0 ? bio / total : 0, byConf, minDate, maxDate };
  }, [allRows]);

  /**
   * BUCKET STATS
   */
  const bucketStatsAll = useMemo<BucketStat[]>(() => {
    const map = new Map<string, { total: number; bio: number }>();

    for (const r of rows) {
      const b = (reasonBucket(r) || "").toUpperCase().trim() || "OTHER/UNKNOWN";
      if (!map.has(b)) map.set(b, { total: 0, bio: 0 });
      const cur = map.get(b)!;
      cur.total += 1;
      if (isLikelyScientificFailure(r)) cur.bio += 1;
    }

    const out: BucketStat[] = Array.from(map.entries()).map(([bucket, v]) => ({
      bucket,
      total: v.total,
      bio: v.bio,
      bioShare: v.total > 0 ? v.bio / v.total : 0
    }));

    out.sort((a, b) => b.total - a.total);
    return out;
  }, [rows]);

  const bucketTotalsMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bucketStatsAll) m.set(b.bucket, b.total);
    return m;
  }, [bucketStatsAll]);

  const displayedBuckets = useMemo<BucketKey[]>(() => {
    const presentExtras = bucketStatsAll
      .filter((b) => !CORE_BUCKETS.includes(b.bucket) && b.total > 0)
      .map((b) => b.bucket);

    // Core buckets always, extras only if they exist
    return [...CORE_BUCKETS, ...presentExtras];
  }, [bucketStatsAll]);

  const bucketStats = useMemo<BucketStat[]>(() => {
    const m = new Map<string, BucketStat>();
    for (const b of bucketStatsAll) m.set(b.bucket, b);

    return displayedBuckets
      .map((bucket) => {
        const s = m.get(bucket);
        if (s) return s;
        return { bucket, total: 0, bio: 0, bioShare: 0 };
      })
      .sort((a, b) => {
        const ai = CORE_BUCKETS.indexOf(a.bucket);
        const bi = CORE_BUCKETS.indexOf(b.bucket);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return (bucketTotalsMap.get(b.bucket) || 0) - (bucketTotalsMap.get(a.bucket) || 0);
      });
  }, [bucketStatsAll, displayedBuckets, bucketTotalsMap]);

  const bucketMax = useMemo(() => Math.max(1, ...bucketStats.map((b) => b.total)), [bucketStats]);

  /**
   * PHASE KEYS (normalized to avoid Unknown duplication)
   */
  const phaseKeys = useMemo<PhaseKey[]>(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(representativePhase(r));
    const arr = Array.from(s);
    arr.sort((a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b));
    return arr.length ? arr : ["UNKNOWN"];
  }, [rows]);

  /**
   * PHASE × BUCKET MATRIX (using representativePhase + displayedBuckets)
   */
  const phaseBucketMatrix = useMemo(() => {
    const m = new Map<PhaseKey, Map<BucketKey, { total: number; bio: number }>>();

    for (const p of phaseKeys) {
      const inner = new Map<BucketKey, { total: number; bio: number }>();
      for (const b of displayedBuckets) inner.set(b, { total: 0, bio: 0 });
      m.set(p, inner);
    }

    for (const r of rows) {
      const p = representativePhase(r);
      const bRaw = (reasonBucket(r) || "").toUpperCase().trim() || "OTHER/UNKNOWN";
      const b = displayedBuckets.includes(bRaw) ? bRaw : "OTHER/UNKNOWN";

      if (!m.has(p)) {
        const inner = new Map<BucketKey, { total: number; bio: number }>();
        for (const bb of displayedBuckets) inner.set(bb, { total: 0, bio: 0 });
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
      for (const b of displayedBuckets) {
        const v = inner.get(b);
        if (!v) continue;
        cells.push({ phase: p, bucket: b, total: v.total, bio: v.bio });
      }
    }
    return cells;
  }, [rows, phaseKeys, displayedBuckets]);

  const matrixMax = useMemo(() => Math.max(1, ...phaseBucketMatrix.map((c) => c.total)), [phaseBucketMatrix]);

  /**
   * DISEASE AREA STATS (as-is)
   */
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

  /**
   * CONDITION STATS (normalized + optional exclude healthy)
   */
  const conditionStats = useMemo<SimpleRow[]>(() => {
    type Agg = { total: number; bio: number; labelCounts: Map<string, number> };

    const map = new Map<string, Agg>();

    for (const r of rows) {
      const raw = normEntity(r.condition_first || "");
      if (!raw) continue;

      const key = normalizeConditionKey(raw);
      if (!key) continue;

      if (excludeHealthy && isHealthyConditionKey(key)) continue;

      if (!map.has(key)) map.set(key, { total: 0, bio: 0, labelCounts: new Map<string, number>() });
      const cur = map.get(key)!;
      cur.total += 1;
      if (isLikelyScientificFailure(r)) cur.bio += 1;
      cur.labelCounts.set(raw, (cur.labelCounts.get(raw) || 0) + 1);
    }

    const out: SimpleRow[] = Array.from(map.entries()).map(([key, v]) => {
      // Choose most frequent original label
      let bestLabel = "";
      let bestCount = -1;
      for (const [lab, c] of v.labelCounts.entries()) {
        if (c > bestCount) {
          bestCount = c;
          bestLabel = lab;
        }
      }
      const label = canonicalConditionLabel(key, bestLabel || key);

      return {
        key,
        label,
        total: v.total,
        bio: v.bio,
        bioShare: v.total > 0 ? v.bio / v.total : 0
      };
    });

    out.sort((a, b) => b.total - a.total);
    return TopK(out, 25);
  }, [rows, excludeHealthy]);

  /**
   * SPONSOR UNIVERSE (top by volume)
   * Note: Explore filtering does not have sponsor facet; drill-down uses q search.
   */
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
    if (!selectedSponsor && sponsorUniverse.length) setSelectedSponsor(sponsorUniverse[0].sponsor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sponsorUniverse.length]);

  /**
   * SPONSOR PROFILE (layout will be cleaner)
   * Conditions are normalized (same as top conditions).
   */
  const sponsorProfile = useMemo<SponsorProfile | null>(() => {
    const s = normEntity(selectedSponsor);
    if (!s) return null;

    const sponsorRows = rows.filter((r) => normEntity(r.lead_sponsor || "") === s);

    if (sponsorRows.length === 0) {
      return {
        sponsor: s,
        rows: [],
        total: 0,
        bio: 0,
        bioShare: 0,
        topBuckets: [],
        topPhases: [],
        topConds: []
      };
    }

    const total = sponsorRows.length;
    const bio = sponsorRows.filter((r) => isLikelyScientificFailure(r)).length;

    // Buckets (use displayedBuckets policy)
    const bucketMap = new Map<string, number>();
    for (const r of sponsorRows) {
      const b = (reasonBucket(r) || "").toUpperCase().trim() || "OTHER/UNKNOWN";
      const key = displayedBuckets.includes(b) ? b : "OTHER/UNKNOWN";
      bucketMap.set(key, (bucketMap.get(key) || 0) + 1);
    }
    const topBuckets = Array.from(bucketMap.entries())
      .map(([k, v]) => ({ bucket: k, count: v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Phases (representative + normalized)
    const phaseMap = new Map<string, number>();
    for (const r of sponsorRows) {
      const p = representativePhase(r);
      phaseMap.set(p, (phaseMap.get(p) || 0) + 1);
    }
    const topPhases = Array.from(phaseMap.entries())
      .map(([k, v]) => ({ phase: k, count: v }))
      .sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase));

    // Conditions (normalized)
    type Agg = { count: number; labelCounts: Map<string, number> };
    const condAgg = new Map<string, Agg>();

    for (const r of sponsorRows) {
      const raw = normEntity(r.condition_first || "");
      if (!raw) continue;
      const key = normalizeConditionKey(raw);
      if (!key) continue;
      if (excludeHealthy && isHealthyConditionKey(key)) continue;

      if (!condAgg.has(key)) condAgg.set(key, { count: 0, labelCounts: new Map<string, number>() });
      const cur = condAgg.get(key)!;
      cur.count += 1;
      cur.labelCounts.set(raw, (cur.labelCounts.get(raw) || 0) + 1);
    }

    const topConds = Array.from(condAgg.entries())
      .map(([key, v]) => {
        let bestLabel = "";
        let bestCount = -1;
        for (const [lab, c] of v.labelCounts.entries()) {
          if (c > bestCount) {
            bestCount = c;
            bestLabel = lab;
          }
        }
        const label = canonicalConditionLabel(key, bestLabel || key);
        return { condition: label, count: v.count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

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
  }, [rows, selectedSponsor, displayedBuckets, excludeHealthy]);

  return (
    <>
      <Head>
        <title>Pharma Intelligence — Clinical trial failures</title>
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
              Descriptive analytics over stopped trials in the registry. Use drill-down links to validate in Explore.
              {meta?.version ? (
                <span>
                  {" "}
                  Dataset: <strong>{meta.version}</strong>.
                </span>
              ) : null}
              {totals.minDate && totals.maxDate ? (
                <span>
                  {" "}
                  Last-update date range: <strong>{totals.minDate}</strong> to <strong>{totals.maxDate}</strong>.
                </span>
              ) : null}
            </div>
          </div>

          <div className="rightMeta">
            {meta?.source ? (
              <div className="chip">
                Source: <strong style={{ marginLeft: 6 }}>{meta.source}</strong>
              </div>
            ) : null}
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
                <div className="muted small">{focusBio ? "Filtered to likely scientific failures." : "All stopped trials in the dataset."}</div>
              </div>

              <div className="card p-4">
                <div className="muted small">Likely scientific failures (overall)</div>
                <div className="kpi">{totals.bio.toLocaleString()}</div>
                <div className="muted small">
                  Share of all stopped trials: <strong>{safePct(totals.bioShare)}</strong>
                </div>
                <div className="miniRow">
                  <div className="miniLabel">HIGH</div>
                  <div className="miniVal">{totals.byConf.HIGH.toLocaleString()}</div>
                  <div className="miniLabel">MED</div>
                  <div className="miniVal">{totals.byConf.MEDIUM.toLocaleString()}</div>
                  <div className="miniLabel">LOW</div>
                  <div className="miniVal">{totals.byConf.LOW.toLocaleString()}</div>
                  <div className="miniLabel">UNK</div>
                  <div className="miniVal">{totals.byConf.UNKNOWN.toLocaleString()}</div>
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
                  <Link className="btn" href={exploreHref({ bucket: ["OPERATIONAL"] })}>
                    Operational
                  </Link>
                </div>
              </div>
            </section>

            {/* Failure taxonomy */}
            <section className="section" aria-label="Failure taxonomy">
              <div className="sectionTitleRow">
                <h2 className="h2">Failure taxonomy</h2>
                <div className="muted small">
                  Buckets prefer pipeline field <code>classification_reason</code>; heuristic fallback uses <code>why_stopped_short</code>.
                </div>
              </div>

              <div className="grid2">
                <div className="card p-4">
                  <h3 className="h3">Reason buckets</h3>
                  <div className="muted small">
                    Aligned with Explore: core buckets are always shown; other buckets appear only if present in the dataset.
                  </div>

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
                        {bucketStats.map((b) => (
                          <tr key={b.bucket}>
                            <td>
                              <Link className="link" href={exploreHref({ bucket: [b.bucket] })}>
                                {b.bucket}
                              </Link>
                              <div className="muted small">{b.bio.toLocaleString()} likely scientific failures</div>
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
                    If you want more buckets in Explore (e.g., Regulatory/Funding/Strategic), it should come from the pipeline label (not raw keyword hits),
                    otherwise you will misclassify mixed-language stop descriptions.
                  </div>
                </div>

                <div className="card p-4">
                  <h3 className="h3">Phase × bucket matrix</h3>
                  <div className="muted small">Phase tokens are normalized; all non-canonical phases roll into “Unknown”.</div>

                  <div className="tableWrap" style={{ marginTop: 10 }}>
                    <table className="matrixTbl" aria-label="Phase by bucket matrix">
                      <thead>
                        <tr>
                          <th>Phase</th>
                          {displayedBuckets.map((b) => (
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
                            {displayedBuckets.map((b) => {
                              const cell = phaseBucketMatrix.find((x) => x.phase === p && x.bucket === b);
                              const total = cell?.total || 0;
                              const bio = cell?.bio || 0;
                              const cellHref = exploreHref({
                                phase: [p],
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
                    Counting uses a single representative phase per trial (avoids double counting multi-phase records).
                  </div>
                </div>
              </div>
            </section>

            {/* Indication landscape */}
            <section className="section" aria-label="Indication landscape">
              <div className="sectionTitleRow">
                <h2 className="h2">Indication landscape</h2>
                <div className="muted small">Conditions are normalized (e.g., COVID-19 variants are grouped). “Healthy” can be excluded.</div>
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
                  <div className="note">Drill-down uses the existing Explore “area” filter (URL state).</div>
                </div>

                <div className="card p-4">
                  <div className="condHeader">
                    <h3 className="h3">Top conditions</h3>
                    <label className="chip" style={{ cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={excludeHealthy}
                        onChange={(e) => setExcludeHealthy(e.target.checked)}
                        style={{ marginRight: 8 }}
                      />
                      Exclude “Healthy”
                    </label>
                  </div>

                  <div className="muted small">
                    Explore drill-down uses search (q). Condition variants are grouped before ranking.
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
                              <Link className="link" href={exploreHref({ q: c.label })}>
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
                    “Healthy” appears because many registry trials enroll healthy volunteers; it can dominate top lists unless excluded.
                  </div>
                </div>
              </div>
            </section>

            {/* Sponsor mix (REDESIGNED) */}
            <section className="section" aria-label="Sponsor mix">
              <div className="sectionTitleRow">
                <h2 className="h2">Sponsor mix</h2>
                <div className="muted small">
                  Descriptive only; sponsor naming variance and corporate structure can affect grouping. Use drill-down to validate.
                </div>
              </div>

              <div className="card p-4">
                <div className="sponsorTop">
                  <div className="sponsorSelect">
                    <div className="muted small" style={{ marginBottom: 6 }}>
                      Select sponsor (top by volume)
                    </div>
                    <select className="input" value={selectedSponsor} onChange={(e) => setSelectedSponsor(e.target.value)} aria-label="Select sponsor">
                      {sponsorUniverse.map((s) => (
                        <option key={s.sponsor} value={s.sponsor}>
                          {s.sponsor} ({s.total})
                        </option>
                      ))}
                    </select>
                    <div className="toggleRow">
                      <label className="chip" style={{ cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={excludeHealthy}
                          onChange={(e) => setExcludeHealthy(e.target.checked)}
                          style={{ marginRight: 8 }}
                        />
                        Exclude “Healthy”
                      </label>
                    </div>
                  </div>

                  <div className="sponsorBtns">
                    <Link className="btn" href={exploreHref({ q: selectedSponsor || undefined })}>
                      Open in Explore (search)
                    </Link>
                    <Link className="btn" href={exploreHref({ q: selectedSponsor || undefined, bio: true })}>
                      Explore (bio focus)
                    </Link>
                  </div>
                </div>

                {!sponsorProfile || sponsorProfile.total === 0 ? (
                  <div className="note">No trials found for this sponsor under the current page focus.</div>
                ) : (
                  <div className="sponsorGrid">
                    {/* Left: summary + top buckets */}
                    <div className="card p-4 sponsorPanel">
                      <h3 className="h3">{sponsorProfile.sponsor}</h3>
                      <div className="kpiSm">{sponsorProfile.total.toLocaleString()} trials</div>
                      <div className="muted small">
                        Likely scientific failures: <strong>{sponsorProfile.bio.toLocaleString()}</strong> ({safePct(sponsorProfile.bioShare)})
                      </div>

                      <div className="subsection">
                        <div className="subhead">Top reason buckets</div>
                        <div className="tableWrap">
                          <table className="compactTbl" aria-label="Sponsor bucket mix">
                            <thead>
                              <tr>
                                <th>Bucket</th>
                                <th style={{ width: 90, textAlign: "right" }}>Trials</th>
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
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Right: stacked cards */}
                    <div className="sponsorRight">
                      <div className="card p-4 sponsorPanel">
                        <h3 className="h3">Phase mix</h3>
                        <div className="tableWrap">
                          <table className="compactTbl" aria-label="Sponsor phase mix">
                            <thead>
                              <tr>
                                <th>Phase</th>
                                <th style={{ width: 90, textAlign: "right" }}>Trials</th>
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

                      <div className="card p-4 sponsorPanel">
                        <h3 className="h3">Top conditions</h3>
                        <div className="muted small">Grouped by normalized condition key.</div>
                        <div className="tableWrap" style={{ marginTop: 8 }}>
                          <table className="compactTbl" aria-label="Sponsor top conditions">
                            <thead>
                              <tr>
                                <th>Condition</th>
                                <th style={{ width: 90, textAlign: "right" }}>Trials</th>
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
                        <div className="note" style={{ marginTop: 10 }}>
                          Condition drill-down uses Explore search (q) because Explore does not currently apply a dedicated condition facet in filtering.
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

      {/* Local, scoped styles only */}
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

        .condHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
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

        /* Compact tables for sponsor section (no forced min-width) */
        .compactTbl {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .compactTbl th,
        .compactTbl td {
          border-bottom: 1px solid var(--border);
          padding: 10px 10px;
          vertical-align: top;
        }
        .compactTbl th {
          text-align: left;
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: var(--surface);
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

        /* Sponsor redesign */
        .sponsorTop {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .sponsorSelect {
          flex: 1 1 360px;
          min-width: 280px;
        }
        .toggleRow {
          margin-top: 10px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .sponsorBtns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
          flex: 0 0 auto;
        }
        .sponsorGrid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 14px;
          align-items: start;
        }
        .sponsorRight {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
        }
        .sponsorPanel {
          background: var(--surface-2);
        }
        .subsection {
          margin-top: 14px;
        }
        .subhead {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        @media (max-width: 980px) {
          .grid3 {
            grid-template-columns: 1fr;
          }
          .grid2 {
            grid-template-columns: 1fr;
          }
          .sectionHeader {
            flex-direction: column;
          }
          .rightMeta {
            justify-content: flex-start;
          }
          .sponsorGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
