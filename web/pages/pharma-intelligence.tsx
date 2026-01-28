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
  bioShare: number;
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
 * =========================
 * PHASE NORMALIZATION
 * =========================
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

function representativePhase(r: TrialIndexRow): PhaseKey {
  const raw = parsePhases(r.phases || "");
  if (!raw.length) return "UNKNOWN";
  const tokens = Array.from(new Set(raw.map(normalizePhaseToken)));
  tokens.sort((a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b));
  return tokens[0] || "UNKNOWN";
}

/**
 * =========================
 * CONDITION NORMALIZATION
 * =========================
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

  const compact = t.replace(/\s+/g, "");
  if (compact === "covid19" || compact === "covid2019" || compact === "coronavirusdisease2019") return "covid-19";
  return t;
}

function canonicalConditionLabel(key: string, fallback: string): string {
  if (key === "covid-19") return "COVID-19";
  return fallback || key;
}

function isHealthyConditionKey(key: string): boolean {
  const k = (key || "").toLowerCase().trim();
  return (
    k === "healthy" ||
    k === "healthy volunteers" ||
    k === "healthy volunteer" ||
    k === "healthy subjects" ||
    k === "healthy subject"
  );
}

/**
 * =========================
 * BUCKET POLICY
 * =========================
 * ENROLLMENT must not show on this page.
 * Collapse ENROLLMENT -> OTHER/UNKNOWN for all computations on this page.
 */
const CORE_BUCKETS: BucketKey[] = ["EFFICACY/FUTILITY", "SAFETY", "OPERATIONAL", "OTHER/UNKNOWN"];

function normalizeBucketForDisplay(b: string): BucketKey {
  const u = (b || "").toUpperCase().trim() || "OTHER/UNKNOWN";
  if (u === "ENROLLMENT") return "OTHER/UNKNOWN";
  return u as BucketKey;
}

export default function PharmaIntelligencePage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [allRows, setAllRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [focusBio, setFocusBio] = useState<boolean>(false);

  // Sponsor selection
  const [selectedSponsor, setSelectedSponsor] = useState<string>("");

  // Exclude "Healthy" toggle MUST be in Indication landscape Top conditions panel (global)
  // We apply it consistently to both global condition lists and sponsor condition list.
  const [excludeHealthy, setExcludeHealthy] = useState<boolean>(true);

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
   * BUCKET STATS (ENROLLMENT removed)
   */
  const bucketStatsAll = useMemo<BucketStat[]>(() => {
    const map = new Map<string, { total: number; bio: number }>();

    for (const r of rows) {
      const b = normalizeBucketForDisplay(reasonBucket(r) || "");
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

  const displayedBuckets = useMemo<BucketKey[]>(() => {
    const extras = bucketStatsAll
      .filter((b) => !CORE_BUCKETS.includes(b.bucket) && b.total > 0)
      .map((b) => b.bucket);

    return [...CORE_BUCKETS, ...extras].filter((b) => b !== "ENROLLMENT");
  }, [bucketStatsAll]);

  const bucketStats = useMemo<BucketStat[]>(() => {
    const m = new Map<string, BucketStat>();
    for (const b of bucketStatsAll) m.set(b.bucket, b);
    return displayedBuckets.map((bucket) => m.get(bucket) || { bucket, total: 0, bio: 0, bioShare: 0 });
  }, [bucketStatsAll, displayedBuckets]);

  const bucketMax = useMemo(() => Math.max(1, ...bucketStats.map((b) => b.total)), [bucketStats]);

  /**
   * PHASE KEYS (normalized)
   */
  const phaseKeys = useMemo<PhaseKey[]>(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(representativePhase(r));
    const arr = Array.from(s);
    arr.sort((a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b));
    return arr.length ? arr : ["UNKNOWN"];
  }, [rows]);

  /**
   * PHASE × BUCKET MATRIX
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
      const bRaw = normalizeBucketForDisplay(reasonBucket(r) || "");
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
   * Disease area stats
   */
  const diseaseAreaStats = useMemo<SimpleRow[]>(() => {
    const map = new Map<string, { total: number; bio: number }>();
    for (const r of rows) {
      const a = normEntity(r.disease_area || "Other/Unknown") || "Other/Unknown";
      if (!map.has(a)) map.set(a, { total: 0, bio: 0 });
      const cur = map.get(a)!;
      cur.total += 1;
      if (isLikelyScientificFailure(r)) cur.bio += 1;
    }

    const out: SimpleRow[] = Array.from(map.entries()).map(([key, v]) => ({
      key,
      label: key,
      total: v.total,
      bio: v.bio,
      bioShare: v.total > 0 ? v.bio / v.total : 0
    }));

    out.sort((a, b) => b.total - a.total);
    return TopK(out, 12);
  }, [rows]);

  /**
   * Conditions: normalize and group (global)
   */
  const topConditionStats = useMemo(() => {
    const map = new Map<string, { total: number; bio: number; label: string }>();

    for (const r of rows) {
      const conds = (r.conditions || "").split("|").map((x) => x.trim()).filter(Boolean);
      for (const c of conds) {
        const key = normalizeConditionKey(c);
        if (!key) continue;
        if (excludeHealthy && isHealthyConditionKey(key)) continue;

        if (!map.has(key)) map.set(key, { total: 0, bio: 0, label: c });
        const cur = map.get(key)!;
        cur.total += 1;
        if (isLikelyScientificFailure(r)) cur.bio += 1;
      }
    }

    const out = Array.from(map.entries()).map(([key, v]) => ({
      key,
      label: canonicalConditionLabel(key, v.label),
      total: v.total,
      bio: v.bio,
      bioShare: v.total > 0 ? v.bio / v.total : 0
    }));

    out.sort((a, b) => b.total - a.total);
    return TopK(out, 14);
  }, [rows, excludeHealthy]);

  /**
   * Sponsors: build list and profile
   */
  const sponsorList = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const sp = normEntity(r.sponsor);
      if (sp) s.add(sp);
    }
    const arr = Array.from(s);
    arr.sort((a, b) => a.localeCompare(b));
    return arr;
  }, [rows]);

  useEffect(() => {
    if (!selectedSponsor && sponsorList.length) setSelectedSponsor(sponsorList[0]);
  }, [selectedSponsor, sponsorList]);

  const sponsorProfile = useMemo<SponsorProfile | null>(() => {
    const sponsor = normEntity(selectedSponsor);
    if (!sponsor) return null;

    const sRows = rows.filter((r) => normEntity(r.sponsor) === sponsor);
    const total = sRows.length;
    const bio = sRows.filter((r) => isLikelyScientificFailure(r)).length;
    const bioShare = total > 0 ? bio / total : 0;

    const bucketCounts = new Map<string, number>();
    const phaseCounts = new Map<string, number>();
    const condCounts = new Map<string, number>();

    for (const r of sRows) {
      const b = normalizeBucketForDisplay(reasonBucket(r) || "");
      bucketCounts.set(b, (bucketCounts.get(b) || 0) + 1);

      const p = representativePhase(r);
      phaseCounts.set(p, (phaseCounts.get(p) || 0) + 1);

      const conds = (r.conditions || "").split("|").map((x) => x.trim()).filter(Boolean);
      for (const c of conds) {
        const key = normalizeConditionKey(c);
        if (!key) continue;
        if (excludeHealthy && isHealthyConditionKey(key)) continue;
        condCounts.set(key, (condCounts.get(key) || 0) + 1);
      }
    }

    const topBuckets = Array.from(bucketCounts.entries())
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const topPhases = Array.from(phaseCounts.entries())
      .map(([phase, count]) => ({ phase, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const topConds = Array.from(condCounts.entries())
      .map(([condition, count]) => ({ condition, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { sponsor, rows: sRows, total, bio, bioShare, topBuckets, topPhases, topConds };
  }, [rows, selectedSponsor, excludeHealthy]);

  const sponsorBucketMax = useMemo(() => {
    if (!sponsorProfile) return 1;
    return Math.max(1, ...sponsorProfile.topBuckets.map((x) => x.count));
  }, [sponsorProfile]);

  const sponsorPhaseMax = useMemo(() => {
    if (!sponsorProfile) return 1;
    return Math.max(1, ...sponsorProfile.topPhases.map((x) => x.count));
  }, [sponsorProfile]);

  const sponsorCondMax = useMemo(() => {
    if (!sponsorProfile) return 1;
    return Math.max(1, ...sponsorProfile.topConds.map((x) => x.count));
  }, [sponsorProfile]);

  if (loading) {
    return (
      <>
        <Head>
          <title>Pharma intelligence</title>
        </Head>
        <div className="container">
          <div className="card p-4">Loading…</div>
        </div>
      </>
    );
  }

  if (err) {
    return (
      <>
        <Head>
          <title>Pharma intelligence</title>
        </Head>
        <div className="container">
          <div className="card p-4">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Error</div>
            <div className="muted">{err}</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Pharma intelligence</title>
      </Head>

      <div className="container">
        <header className="sectionHeader">
          <div>
            <h1 className="h1">Pharma intelligence</h1>
            <div className="muted small" style={{ marginTop: 6 }}>
              Snapshot derived from stopped interventional drug/biologic trials on ClinicalTrials.gov (API v2). Use Explore
              for full filtering.
            </div>
          </div>

          <div className="rightMeta">
            <div className="chip">
              <span className="chipLabel">Trials</span>
              <span className="chipVal">{totals.total.toLocaleString()}</span>
            </div>
            <div className="chip">
              <span className="chipLabel">Bio share</span>
              <span className="chipVal">{safePct(totals.bioShare)}</span>
            </div>
            <div className="chip">
              <span className="chipLabel">Window</span>
              <span className="chipVal">
                {totals.minDate || "—"} → {totals.maxDate || "—"}
              </span>
            </div>

            <button className={`btn ${focusBio ? "btnPrimary" : ""}`} onClick={() => setFocusBio((v) => !v)}>
              {focusBio ? "Showing scientific failures" : "Show scientific failures"}
            </button>
          </div>
        </header>

        {/* Quick totals */}
        <section className="grid3" aria-label="Top totals">
          <div className="card p-4">
            <div className="muted small">Stopped trials</div>
            <div className="kpi">{totals.total.toLocaleString()}</div>
            <div className="muted small" style={{ marginTop: 4 }}>
              Interventional, drug/biologic only.
            </div>
          </div>

          <div className="card p-4">
            <div className="muted small">Likely scientific failures</div>
            <div className="kpi">{totals.bio.toLocaleString()}</div>
            <div className="muted small" style={{ marginTop: 4 }}>
              Model: conservative rule-based label.
            </div>
          </div>

          <div className="card p-4">
            <div className="muted small">Confidence breakdown (bio subset)</div>
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
              Buckets prefer pipeline field <code>classification_reason</code>; heuristic fallback uses{" "}
              <code>why_stopped_short</code>.
            </div>
          </div>

          <div className="grid2">
            <div className="card p-4">
              <h3 className="h3">Reason buckets</h3>
              <div className="muted small">Enrollment is removed on this page (collapsed into Other/Unknown).</div>

              <div
                className="tableWrap tableWrapEdge hScroll"
                style={{ marginTop: 10 }}
                role="region"
                aria-label="Reason buckets table (horizontally scrollable)"
                tabIndex={0}
              >
                <table className="miniTbl reasonTbl" aria-label="Reason bucket table">
                  <thead>
                    <tr>
                      <th>Bucket</th>
                      <th className="colTrials">Trials</th>
                      <th className="colShare">Bio share</th>
                      <th className="colBar" aria-hidden="true" />
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
                        <td className="colTrials">{b.total.toLocaleString()}</td>
                        <td className="colShare">{safePct(b.bioShare)}</td>
                        <td className="colBar">
                          <Bar value={b.total} max={bucketMax} label={`${b.bucket} volume`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="note">
                Keep in mind: we should not widen Explore facets based purely on heuristic keyword parsing of stop text.
                Pipeline-first is the safe path.
              </div>
            </div>

            <div className="card p-4">
              <h3 className="h3">Phase × bucket matrix</h3>
              <div className="muted small">Phase tokens are normalized; non-canonical phases roll into “Unknown”.</div>

              <div className="scrollHint">Swipe horizontally to see all buckets →</div>

              <div
                className="tableWrap tableWrapEdge hScroll"
                style={{ marginTop: 10 }}
                role="region"
                aria-label="Phase by bucket matrix (horizontally scrollable)"
                tabIndex={0}
              >
                <table className="matrixTbl" aria-label="Phase by bucket matrix">
                  <thead>
                    <tr>
                      <th>Phase</th>
                      {displayedBuckets.map((b) => (
                        <th key={b} title={b} style={{ minWidth: 120 }}>
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
            <div className="muted small">Conditions are normalized (e.g., COVID-19 variants are grouped).</div>
          </div>

          <div className="grid2">
            <div className="card p-4">
              <h3 className="h3">By disease area</h3>

              <div className="tableWrap tableWrapEdge" style={{ marginTop: 10 }}>
                <table className="miniTbl" aria-label="Disease area table">
                  <thead>
                    <tr>
                      <th>Disease area</th>
                      <th className="colTrials">Trials</th>
                      <th className="colShare">Bio share</th>
                      <th className="colBar" aria-hidden="true" />
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
                        <td className="colTrials">{a.total.toLocaleString()}</td>
                        <td className="colShare">{safePct(a.bioShare)}</td>
                        <td className="colBar">
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
              <div className="panelTitleRow">
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

              <div className="tableWrap tableWrapEdge" style={{ marginTop: 10 }}>
                <table className="miniTbl" aria-label="Top conditions table">
                  <thead>
                    <tr>
                      <th>Condition</th>
                      <th className="colTrials">Trials</th>
                      <th className="colShare">Bio share</th>
                      <th className="colBar" aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {topConditionStats.map((c) => (
                      <tr key={c.key}>
                        <td>
                          <Link className="link" href={exploreHref({ q: c.label })}>
                            {c.label}
                          </Link>
                          <div className="muted small">{c.bio.toLocaleString()} likely scientific failures</div>
                        </td>
                        <td className="colTrials">{c.total.toLocaleString()}</td>
                        <td className="colShare">{safePct(c.bioShare)}</td>
                        <td className="colBar">
                          <Bar value={c.total} max={Math.max(1, ...topConditionStats.map((x) => x.total))} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="note">Condition filtering uses Explore free-text search (URL query).</div>
            </div>
          </div>
        </section>

        {/* Sponsor intelligence */}
        <section className="section" aria-label="Sponsor intelligence">
          <div className="sectionTitleRow">
            <h2 className="h2">Sponsor intelligence</h2>
            <div className="muted small">Select a sponsor to see its distribution across buckets/phases/conditions.</div>
          </div>

          <div className="card p-4">
            <div className="sponsorTopRow">
              <div className="sponsorSelect">
                <div className="muted small" style={{ marginBottom: 6 }}>
                  Sponsor
                </div>
                <select
                  className="select"
                  value={selectedSponsor}
                  onChange={(e) => setSelectedSponsor(e.target.value)}
                  style={{ width: "100%" }}
                >
                  {sponsorList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sponsorBtns">
                <Link className="btn" href={exploreHref({ sponsor: [selectedSponsor] })}>
                  Open in Explore
                </Link>
                <button className={`btn ${focusBio ? "btnPrimary" : ""}`} onClick={() => setFocusBio((v) => !v)}>
                  {focusBio ? "Showing scientific failures" : "Show scientific failures"}
                </button>
              </div>
            </div>

            {sponsorProfile && (
              <div className="sponsorPanels3">
                <div className="sPanel">
                  <div className="panelHeader">
                    <div>
                      <div className="subhead">Sponsor totals</div>
                      <div className="panelTitle">{sponsorProfile.sponsor}</div>
                      <div className="muted small" style={{ marginTop: 6 }}>
                        Trials: <b>{sponsorProfile.total.toLocaleString()}</b> • Bio share:{" "}
                        <b>{safePct(sponsorProfile.bioShare)}</b>
                      </div>
                    </div>

                    <div className="panelKpis">
                      <div className="chip">
                        <span className="chipLabel">Trials</span>
                        <span className="chipVal">{sponsorProfile.total.toLocaleString()}</span>
                      </div>
                      <div className="chip">
                        <span className="chipLabel">Bio</span>
                        <span className="chipVal">{sponsorProfile.bio.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="note" style={{ marginTop: 12 }}>
                    Drill-down links below open Explore with sponsor filters applied.
                  </div>
                </div>

                <div className="sPanel">
                  <div className="panelTitleRow">
                    <div className="subhead">Top buckets</div>
                    <Link className="link" href={exploreHref({ sponsor: [sponsorProfile.sponsor] })}>
                      View all →
                    </Link>
                  </div>

                  <table className="compactTbl" aria-label="Sponsor top buckets table">
                    <thead>
                      <tr>
                        <th>Bucket</th>
                        <th style={{ width: 110, textAlign: "right" }}>Trials</th>
                        <th style={{ width: 120 }} aria-hidden="true" />
                      </tr>
                    </thead>
                    <tbody>
                      {sponsorProfile.topBuckets.map((x) => (
                        <tr key={x.bucket}>
                          <td>
                            <Link className="link cellTrunc" href={exploreHref({ sponsor: [sponsorProfile.sponsor], bucket: [x.bucket] })}>
                              {x.bucket}
                            </Link>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800 }}>{x.count.toLocaleString()}</td>
                          <td>
                            <Bar value={x.count} max={sponsorBucketMax} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="sPanel">
                  <div className="panelTitleRow">
                    <div className="subhead">Top phases</div>
                    <Link className="link" href={exploreHref({ sponsor: [sponsorProfile.sponsor] })}>
                      View all →
                    </Link>
                  </div>

                  <table className="compactTbl" aria-label="Sponsor top phases table">
                    <thead>
                      <tr>
                        <th>Phase</th>
                        <th style={{ width: 110, textAlign: "right" }}>Trials</th>
                        <th style={{ width: 120 }} aria-hidden="true" />
                      </tr>
                    </thead>
                    <tbody>
                      {sponsorProfile.topPhases.map((x) => (
                        <tr key={x.phase}>
                          <td>
                            <Link className="link cellTrunc" href={exploreHref({ sponsor: [sponsorProfile.sponsor], phase: [x.phase] })}>
                              {phaseLabel(x.phase)}
                            </Link>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800 }}>{x.count.toLocaleString()}</td>
                          <td>
                            <Bar value={x.count} max={sponsorPhaseMax} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="subhead" style={{ marginTop: 16 }}>
                    Top conditions
                  </div>

                  <table className="compactTbl" aria-label="Sponsor top conditions table">
                    <thead>
                      <tr>
                        <th>Condition</th>
                        <th style={{ width: 110, textAlign: "right" }}>Trials</th>
                        <th style={{ width: 120 }} aria-hidden="true" />
                      </tr>
                    </thead>
                    <tbody>
                      {sponsorProfile.topConds.map((x) => (
                        <tr key={x.condition}>
                          <td>
                            <Link className="link cellTrunc" href={exploreHref({ sponsor: [sponsorProfile.sponsor], q: x.condition })}>
                              {canonicalConditionLabel(x.condition, x.condition)}
                            </Link>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 800 }}>{x.count.toLocaleString()}</td>
                          <td>
                            <Bar value={x.count} max={sponsorCondMax} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <section className="section" aria-label="Footer">
          <div className="muted small">
            Dataset version: <b>{meta?.version || "—"}</b>. Last generated: <b>{meta?.generated_at || "—"}</b>.
          </div>
        </section>
      </div>

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

        /* Improves touch/trackpad horizontal scroll behavior */
        .hScroll {
          overscroll-behavior-x: contain;
        }

        /* Edge-to-edge scroll on small screens (used for wide tables) */
        .tableWrapEdge {
          padding-bottom: 2px;
        }

        .scrollHint {
          display: none;
          margin-top: 8px;
          margin-bottom: 8px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 650;
        }

        /* Column helpers for mini tables (lets us hide/squeeze on phones) */
        .miniTbl .colTrials,
        .miniTbl .colShare {
          text-align: right;
          white-space: nowrap;
        }
        .miniTbl td.colTrials {
          font-weight: 750;
        }
        .miniTbl .colTrials {
          width: 120px;
        }
        .miniTbl .colShare {
          width: 90px;
        }
        .miniTbl .colBar {
          width: 120px;
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

        /* Sponsor */
        .sponsorTopRow {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .sponsorSelect {
          flex: 1 1 520px;
          min-width: 280px;
        }
        .sponsorBtns {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .sponsorPanels3 {
          display: grid !important;
          grid-template-columns: 1.15fr 1fr 1fr;
          gap: 14px;
          align-items: start;
        }

        .sPanel {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 14px;
          min-width: 0;
          overflow: hidden;
        }

        .panelHeader {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .panelTitle {
          font-weight: 900;
          font-size: 16px;
          margin-top: 2px;
          line-height: 1.2;
        }
        .panelKpis {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          min-width: 220px;
        }
        .panelKpiVal {
          font-weight: 900;
          font-size: 16px;
          margin-top: 2px;
        }
        .panelTitleRow {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .subhead {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .compactTbl {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          table-layout: fixed;
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

        .cellTrunc {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 1100px) {
          .sponsorPanels3 {
            grid-template-columns: 1fr 1fr;
          }
        }

        /* Phones: collapse sponsor panels into a single column */
        @media (max-width: 820px) {
          .sponsorPanels3 {
            grid-template-columns: 1fr;
          }
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
        }

        /* MOBILE DESIGN FIXES */
        @media (max-width: 720px) {
          /* Make the page genuinely phone-friendly */
          .sponsorTopRow {
            flex-direction: column;
            align-items: stretch;
          }
          /* Wide table UX */
          .scrollHint {
            display: block;
          }
          .tableWrapEdge {
            margin: 0 -16px;
            padding: 0 16px;
          }
          .h3 {
            font-size: 13px;
          }
          .small {
            font-size: 11px;
            line-height: 1.3;
          }

          .miniTbl th,
          .miniTbl td,
          .matrixTbl th,
          .matrixTbl td {
            padding: 8px 8px;
          }
          .miniTbl {
            font-size: 12px;
            table-layout: auto;
          }
          .miniTbl .colTrials,
          .miniTbl .colShare {
            width: auto;
          }

          /* Default: hide bar column to keep narrow tables readable */
          .miniTbl .colBar {
            display: none;
          }

          /* Reason buckets: keep bars + force horizontal scroll */
          .reasonTbl {
            min-width: 640px;
          }
          .reasonTbl .colBar {
            display: table-cell;
          }

          .miniRow {
            grid-template-columns: repeat(4, auto);
          }
          .barTrack {
            width: 72px;
          }

          /* Matrix is intentionally wide; make the phase column sticky so it stays visible while scrolling */
          .matrixTbl {
            min-width: 620px;
            font-size: 12px;
          }
          .matrixTbl th:first-child,
          .matrixTbl td:first-child {
            position: sticky;
            left: 0;
            background: var(--surface);
            z-index: 3;
          }
          .cellLink {
            padding: 6px;
            border-radius: 10px;
          }
          .cellBar {
            margin-top: 6px;
            height: 6px;
          }

          /* Topbar becomes a clean stacked layout */
          :global(.topbar-inner) {
            flex-direction: column;
            align-items: stretch;
            gap: 10px;
          }
          :global(.topbar-left) {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            flex-wrap: wrap;
          }
          :global(.nav) {
            gap: 10px;
            flex-wrap: wrap;
          }
          :global(.navlink) {
            font-size: 13px;
          }
          :global(.topbar-right) {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            align-items: center;
          }
          /* Make controls feel deliberate and avoid “floating” */
          :global(.topbar-right .btn) {
            width: 100%;
            justify-content: center;
          }
          :global(.topbar-right .chip) {
            width: 100%;
            justify-content: flex-start;
          }

          /* Header spacing */
          .sectionHeader {
            gap: 10px;
            margin-bottom: 10px;
          }

          /* Sponsor controls: clean stack + full width buttons */
          .sponsorTopRow {
            flex-direction: column;
            align-items: stretch;
          }
          .sponsorSelect {
            min-width: 0;
            width: 100%;
          }
          .sponsorBtns {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          :global(.sponsorBtns .btn) {
            width: 100%;
            justify-content: center;
          }

          /* Sponsor panels stack */
          .sponsorPanels3 {
            grid-template-columns: 1fr;
          }
          .sPanel {
            padding: 12px;
          }

          /* Tables: reduce stickiness artifacts on very small screens */
          .miniTbl th,
          .matrixTbl th {
            position: static;
          }
        }
      `}</style>
    </>
  );
}
