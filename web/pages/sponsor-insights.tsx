// web/pages/sponsor-insights.tsx
import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { loadIndex, loadMeta } from "@/lib/data";
import { DatasetMeta, TrialIndexRow, UrlState } from "@/lib/types";
import { encodeState } from "@/lib/urlState";
import { isLikelyScientificFailure, parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import GuidesMenu from "@/components/GuidesMenu";

const TITLE = "Sponsor insights for stopped clinical trials | Clinical Trial Failures";
const DESCRIPTION =
  "Compare sponsors across stopped clinical trials, including stop reasons, phases, disease areas, and likely biological failure signals.";
const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/sponsor-insights`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

function SponsorInsightsSeoHead() {
  return (
    <Head>
      <title>{TITLE}</title>
      <meta name="description" content={DESCRIPTION} />
      <meta name="robots" content="index,follow" />
      <link rel="canonical" href={CANONICAL_URL} />
      <meta property="og:title" content={TITLE} />
      <meta property="og:description" content={DESCRIPTION} />
      <meta property="og:url" content={CANONICAL_URL} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta name="twitter:title" content={TITLE} />
      <meta name="twitter:description" content={DESCRIPTION} />
      <meta name="twitter:image" content={OG_IMAGE} />
    </Head>
  );
}

/**
 * Mobile responsiveness strategy (robust on iOS Safari):
 * - Any truly wide content is inside an explicit horizontal scroll region with touch-friendly settings.
 * - "Reason buckets": stays a table but forces overflow via min-width on the table.
 * - "Phase × bucket matrix": desktop = table; mobile = per-phase horizontal card strips
 *   (avoids scroll-freeze issues caused by sticky table cells inside overflow containers on mobile Safari).
 *
 * Primary feature:
 * - Sponsor insights: sponsor selector + profile (top buckets/phases/disease areas) with Explore drill-downs.
 */

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
  topAreas: { area: string; count: number }[];
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


/**
 * =========================
 * PHASE NORMALIZATION
 * =========================
 */
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

const CANON_PHASES = new Set(PHASE_ORDER);

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
 * Keep parity with the original intent: do not show ENROLLMENT as its own bucket here.
 * Collapse ENROLLMENT -> OTHER/UNKNOWN for all computations on this page.
 */
const CORE_BUCKETS: BucketKey[] = ["EFFICACY/FUTILITY", "SAFETY", "OPERATIONAL", "REGULATORY", "OTHER/UNKNOWN"];

function normalizeBucketForDisplay(b: string): BucketKey {
  const u = (b || "").toUpperCase().trim() || "OTHER/UNKNOWN";
  if (u === "ENROLLMENT") return "OTHER/UNKNOWN";
  return u as BucketKey;
}

/**
 * Helper: choose Explore filter strategy for sponsor/condition.
 * Explore currently supports q + status/phase/area/bucket/bio.
 * So sponsor/condition drill-downs are implemented via q search.
 */
function sponsorQueryHref(leadSponsor: string, scientificOnly?: boolean, patch?: Partial<UrlState>): string {
  return exploreHref({ q: leadSponsor, ...(scientificOnly ? { bio: true } : {}), ...(patch || {}) });
}

function conditionQueryHref(conditionLabel: string, patch?: Partial<UrlState>): string {
  return exploreHref({ q: conditionLabel, ...(patch || {}) });
}

/**
 * Simple bucket tag styling (works with global theme vars).
 */
function bucketPillClass(bucket: string): string {
  const b = (bucket || "").toUpperCase();
  if (b === "SAFETY") return "pill pillSafety";
  if (b === "EFFICACY/FUTILITY") return "pill pillEfficacy";
  if (b === "OPERATIONAL") return "pill pillOperational";
  if (b === "REGULATORY") return "pill pillRegulatory";
  return "pill pillNeutral";
}

function phasePillClass(phase: string): string {
  const p = (phase || "").toUpperCase();
  if (p.includes("PHASE1") || p === "EARLY_PHASE1") return "pill pillPhase1";
  if (p.includes("PHASE2")) return "pill pillPhase2";
  if (p.includes("PHASE3")) return "pill pillPhase3";
  if (p.includes("PHASE4")) return "pill pillPhase4";
  return "pill pillNeutral";
}

export default function SponsorInsightsPage() {
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [allRows, setAllRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [focusBio, setFocusBio] = useState<boolean>(false);

  // Sponsor selection
  const [selectedSponsor, setSelectedSponsor] = useState<string>("");

  // Sponsor selector w/ typeahead
  const [sponsorQuery, setSponsorQuery] = useState<string>("");
  const [sponsorMenuOpen, setSponsorMenuOpen] = useState<boolean>(false);
  const sponsorBoxRef = useRef<HTMLDivElement | null>(null);

  // Exclude "Healthy" toggle (applies to global top conditions only)
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

    const byConf: Record<"HIGH" | "MEDIUM" | "LOW" | "UNKNOWN", number> = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      UNKNOWN: 0
    };

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
   * =========================
   * Failure taxonomy: bucket stats (ENROLLMENT collapsed)
   * =========================
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

    // Keep core buckets first; append extras; ENROLLMENT already collapsed
    return [...CORE_BUCKETS, ...extras];
  }, [bucketStatsAll]);

  const bucketStats = useMemo<BucketStat[]>(() => {
    const m = new Map<string, BucketStat>();
    for (const b of bucketStatsAll) m.set(b.bucket, b);
    return displayedBuckets.map((bucket) => m.get(bucket) || { bucket, total: 0, bio: 0, bioShare: 0 });
  }, [bucketStatsAll, displayedBuckets]);

  const bucketMax = useMemo(() => Math.max(1, ...bucketStats.map((b) => b.total)), [bucketStats]);

  /**
   * =========================
   * Failure taxonomy: phase keys
   * =========================
   */
  const phaseKeys = useMemo<PhaseKey[]>(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(representativePhase(r));
    const arr = Array.from(s);
    arr.sort((a, b) => PHASE_ORDER.indexOf(a) - PHASE_ORDER.indexOf(b));
    return arr.length ? arr : ["UNKNOWN"];
  }, [rows]);

  /**
   * =========================
   * Failure taxonomy: phase × bucket matrix
   * =========================
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
      const b = normalizeBucketForDisplay(reasonBucket(r) || "");
      if (!m.has(p)) {
        const inner = new Map<BucketKey, { total: number; bio: number }>();
        for (const bb of displayedBuckets) inner.set(bb, { total: 0, bio: 0 });
        m.set(p, inner);
      }
      const inner = m.get(p)!;
      if (!inner.has(b)) inner.set(b, { total: 0, bio: 0 });
      const cell = inner.get(b)!;
      cell.total += 1;
      if (isLikelyScientificFailure(r)) cell.bio += 1;
    }

    const cells: PhaseBucketCell[] = [];
    for (const p of phaseKeys) {
      const inner = m.get(p);
      if (!inner) continue;
      for (const b of displayedBuckets) {
        const v = inner.get(b) || { total: 0, bio: 0 };
        cells.push({ phase: p, bucket: b, total: v.total, bio: v.bio });
      }
    }
    return cells;
  }, [rows, phaseKeys, displayedBuckets]);

  const matrixMax = useMemo(() => Math.max(1, ...phaseBucketMatrix.map((c) => c.total)), [phaseBucketMatrix]);

  /**
   * =========================
   * Indication landscape
   * =========================
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

  const topConditionStats = useMemo<SimpleRow[]>(() => {
    const map = new Map<string, { total: number; bio: number; label: string }>();

    for (const r of rows) {
      const c0 = normEntity(r.condition_first || "");
      if (!c0) continue;

      const key = normalizeConditionKey(c0);
      if (!key) continue;
      if (excludeHealthy && isHealthyConditionKey(key)) continue;

      if (!map.has(key)) map.set(key, { total: 0, bio: 0, label: c0 });
      const cur = map.get(key)!;
      cur.total += 1;
      if (isLikelyScientificFailure(r)) cur.bio += 1;
    }

    const out: SimpleRow[] = Array.from(map.entries()).map(([key, v]) => ({
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
   * =========================
   * Sponsor intelligence
   * =========================
   */
  const sponsorList = useMemo(() => {
    const s = new Set<string>();
    for (const r of allRows) {
      const sp = normEntity(r.lead_sponsor);
      if (sp) s.add(sp);
    }
    const arr = Array.from(s);
    arr.sort((a, b) => a.localeCompare(b));
    return arr;
  }, [allRows]);

  const sponsorSuggestions = useMemo(() => {
    const q = (sponsorQuery || "").trim().toLowerCase();
    const pool = sponsorList;

    if (!q) return pool.slice(0, 50);

    // prefer prefix matches, then substring matches
    const prefix: string[] = [];
    const sub: string[] = [];
    for (const s of pool) {
      const sl = s.toLowerCase();
      if (sl.startsWith(q)) prefix.push(s);
      else if (sl.includes(q)) sub.push(s);
    }
    return [...prefix, ...sub].slice(0, 50);
  }, [sponsorQuery, sponsorList]);

  useEffect(() => {
    if (!selectedSponsor && sponsorList.length) setSelectedSponsor(sponsorList[0]);
  }, [selectedSponsor, sponsorList]);

  // Keep input in sync with selected sponsor
  useEffect(() => {
    setSponsorQuery(selectedSponsor || "");
  }, [selectedSponsor]);

  // Close sponsor menu on outside click / escape
  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = sponsorBoxRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setSponsorMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSponsorMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const sponsorProfile = useMemo<SponsorProfile | null>(() => {
    const sponsor = normEntity(selectedSponsor);
    if (!sponsor) return null;

    // Respect focusBio toggle: the page is a "mode"; sponsor summaries follow it.
    const sRows = rows.filter((r) => normEntity(r.lead_sponsor) === sponsor);
    const total = sRows.length;
    const bio = sRows.filter((r) => isLikelyScientificFailure(r)).length;
    const bioShare = total > 0 ? bio / total : 0;

    const bucketCounts = new Map<string, number>();
    const phaseCounts = new Map<string, number>();
    const areaCounts = new Map<string, number>();

    for (const r of sRows) {
      const b = normalizeBucketForDisplay(reasonBucket(r) || "");
      bucketCounts.set(b, (bucketCounts.get(b) || 0) + 1);

      const p = representativePhase(r);
      phaseCounts.set(p, (phaseCounts.get(p) || 0) + 1);

      const a = normEntity(r.disease_area || "Other/Unknown") || "Other/Unknown";
      areaCounts.set(a, (areaCounts.get(a) || 0) + 1);
    }

    const topBuckets = Array.from(bucketCounts.entries())
      .map(([bucket, count]) => ({ bucket, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const topPhases = Array.from(phaseCounts.entries())
      .map(([phase, count]) => ({ phase, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const topAreas = Array.from(areaCounts.entries())
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { sponsor, rows: sRows, total, bio, bioShare, topBuckets, topPhases, topAreas };
  }, [rows, selectedSponsor]);

  const sponsorBucketMax = useMemo(() => Math.max(1, ...(sponsorProfile?.topBuckets.map((x) => x.count) || [0])), [sponsorProfile]);
  const sponsorPhaseMax = useMemo(() => Math.max(1, ...(sponsorProfile?.topPhases.map((x) => x.count) || [0])), [sponsorProfile]);
  const sponsorAreaMax = useMemo(() => Math.max(1, ...(sponsorProfile?.topAreas.map((x) => x.count) || [0])), [sponsorProfile]);

  // Precompute for wide table min-width (desktop)
  const matrixMinWidth = useMemo(() => {
    // Phase col (~180) + per-bucket col (~150)
    return 180 + displayedBuckets.length * 150;
  }, [displayedBuckets.length]);

  if (loading) {
    return (
      <>
        <SponsorInsightsSeoHead />
        <div className="min-h-screen">
          <header className="topbar">
            <div className="topbar-inner">
              <div className="topbar-left">
                <Link href="/" className="brand">
                  Clinical trial failures
                </Link>
                                <nav className="nav" aria-label="Primary">
                  <Link className="navlink" href="/explore">
                    Explore
                  </Link>
                  <Link className="navlink" href="/overview">
                    Overview
                  </Link>
                  <GuidesMenu />
                  <Link className="navlink" href="/sponsor-insights" aria-current="page">
                    Sponsor insights
                  </Link>
                  <Link className="navlink" href="/outliers">
                    Outliers
                  </Link>
                  <Link className="navlink" href="/top-entities">
                    Top entities
                  </Link>
                  <Link className="navlink" href="/methods">
                    Methods
                  </Link>
                </nav>
              </div>
            </div>
          </header>

          <div className="page">
            <div className="card p-4">Loading…</div>
          </div>
        </div>
      </>
    );
  }

  if (err) {
    return (
      <>
        <SponsorInsightsSeoHead />
        <div className="min-h-screen">
          <header className="topbar">
            <div className="topbar-inner">
              <div className="topbar-left">
                <Link href="/" className="brand">
                  Clinical trial failures
                </Link>
                                <nav className="nav" aria-label="Primary">
                  <Link className="navlink" href="/explore">
                    Explore
                  </Link>
                  <Link className="navlink" href="/overview">
                    Overview
                  </Link>
                  <GuidesMenu />
                  <Link className="navlink" href="/sponsor-insights" aria-current="page">
                    Sponsor insights
                  </Link>
                  <Link className="navlink" href="/outliers">
                    Outliers
                  </Link>
                  <Link className="navlink" href="/top-entities">
                    Top entities
                  </Link>
                  <Link className="navlink" href="/methods">
                    Methods
                  </Link>
                </nav>
              </div>
            </div>
          </header>
          <div className="page">
            <div className="card p-4">
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Error</div>
              <div className="muted">{err}</div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SponsorInsightsSeoHead />

      <div className="min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
                              <nav className="nav" aria-label="Primary">
                  <Link className="navlink" href="/explore">
                    Explore
                  </Link>
                  <Link className="navlink" href="/overview">
                    Overview
                  </Link>
                  <GuidesMenu />
                  <Link className="navlink" href="/sponsor-insights" aria-current="page">
                    Sponsor insights
                  </Link>
                  <Link className="navlink" href="/outliers">
                    Outliers
                  </Link>
                  <Link className="navlink" href="/top-entities">
                    Top entities
                  </Link>
                  <Link className="navlink" href="/methods">
                    Methods
                  </Link>
                </nav>
            </div>
          </div>
        </header>

        <div className="page">
          {/* ===== Header ===== */}
          <header className="header">
            <div className="headerLeft">
              <h1 className="title">Sponsor insights</h1>
              <div className="muted subtitle">
              </div>
            </div>

            <div className="headerRight">
              <div className="chip">
                Trials&nbsp;<b>{totals.total.toLocaleString()}</b>
              </div>
              <div className="chip">
                Bio share&nbsp;<b>{safePct(totals.bioShare)}</b>
              </div>
              <div className="chip">
                Window&nbsp;
                <b>
                  {totals.minDate || "—"} → {totals.maxDate || "—"}
                </b>
              </div>
            </div>
          </header>

          {/* ===== Sponsor comparison ===== */}
          <section className="section" aria-label="Sponsor comparison">
            <div className="sectionHead">
              
              <div className="muted small">Sponsor drill-downs use Explore free-text search (q) plus bucket/phase/area where applicable.</div>
            </div>

            <div className="card p-4">
              <div className="sponsorTopRow">
                <div className="sponsorSelect">
                  <div className="muted small" style={{ marginBottom: 6 }}>
                    Sponsor
                  </div>
                  <div ref={sponsorBoxRef} className="comboWrap">
                    <input
                      className="input"
                      value={sponsorQuery}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSponsorQuery(v);
                        setSponsorMenuOpen(true);
                      }}
                      onFocus={() => setSponsorMenuOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const first = sponsorSuggestions[0] || "";
                          const exact = sponsorList.find((s) => s.toLowerCase() === sponsorQuery.trim().toLowerCase());
                          const next = exact || first;
                          if (next) {
                            setSelectedSponsor(next);
                            setSponsorMenuOpen(false);
                          }
                        }
                        if (e.key === "ArrowDown") setSponsorMenuOpen(true);
                      }}
                      placeholder="Type a sponsor…"
                      aria-label="Sponsor"
                    />

                    {sponsorMenuOpen && sponsorSuggestions.length ? (
                      <div className="comboMenu" role="listbox" aria-label="Sponsor suggestions">
                        {sponsorSuggestions.slice(0, 12).map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="comboItem"
                            role="option"
                            onMouseDown={(ev) => {
                              // Prevent input blur before selection
                              ev.preventDefault();
                              setSelectedSponsor(s);
                              setSponsorMenuOpen(false);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="sponsorBtns">
                  <Link className="btn" href={sponsorQueryHref(selectedSponsor, focusBio)}>
                    Open in Explore
                  </Link>
                </div>
              </div>

              {sponsorProfile ? (
                <div className="sponsorLayout" aria-label="Sponsor profile">
                  <div className="sCard sSummary">
                      <div className="sCardHeader">
                        <div className="min0">
                          <div className="sEyebrow">Sponsor totals</div>
                          <div className="sTitle">{sponsorProfile.sponsor}</div>
                        </div>
                        <div className="sModePill" aria-label="Sponsor mode">
                          {focusBio ? "Scientific failures" : "All stopped trials"}
                        </div>
                      </div>

                      <div className="sKpis" aria-label="Sponsor KPIs">
                        <div className="sKpi">
                          <div className="sKpiLabel">Trials</div>
                          <div className="sKpiVal">{sponsorProfile.total.toLocaleString()}</div>
                        </div>
                        <div className="sKpi">
                          <div className="sKpiLabel">Bio share</div>
                          <div className="sKpiVal">{safePct(sponsorProfile.bioShare)}</div>
                        </div>
                        <div className="sKpi">
                          <div className="sKpiLabel">Bio trials</div>
                          <div className="sKpiVal">{sponsorProfile.bio.toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="muted small" style={{ marginTop: 10 }}>
                        Drill-downs open Explore with sponsor pre-filled (q) plus bucket/phase/area where applicable.
                      </div>
                  </div>

                  <div className="sCard sAreas" aria-label="Top disease areas">
                    <div className="sCardHeader compact">
                      <div className="sEyebrow">Top disease areas</div>
                      <Link className="sLink" href={sponsorQueryHref(sponsorProfile.sponsor, focusBio)}>
                        View all
                      </Link>
                    </div>

                    <div className="sScroll" role="region" aria-label="Top disease areas table" tabIndex={0}>
                      <table className="sTable" aria-label="Sponsor top disease areas">
                        <thead>
                          <tr>
                            <th>Disease area</th>
                            <th className="sNum">Trials</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sponsorProfile.topAreas.map((x) => (
                            <tr key={x.area}>
                              <td>
                                <Link className="sRowLink" href={sponsorQueryHref(sponsorProfile.sponsor, focusBio, { area: [x.area] })}>
                                  <span className="pill pillNeutral">{x.area}</span>
                                </Link>
                              </td>
                              <td className="sNum" aria-label={`${x.count} trials`}>
                                <div className="sNumTop">{x.count.toLocaleString()}</div>
                                <div className="sBar" aria-hidden="true">
                                  <div className="sFill" style={{ width: `${Math.max(3, Math.round((x.count / sponsorAreaMax) * 100))}%` }} />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="sCard sBuckets" aria-label="Top buckets">
                    <div className="sCardHeader compact">
                      <div className="sEyebrow">Top buckets</div>
                      <Link className="sLink" href={sponsorQueryHref(sponsorProfile.sponsor, focusBio)}>
                        View all
                      </Link>
                    </div>

                    <table className="sTable" aria-label="Sponsor top buckets">
                      <tbody>
                        {sponsorProfile.topBuckets.map((x) => (
                          <tr key={x.bucket}>
                            <td>
                              <Link className="sRowLink" href={sponsorQueryHref(sponsorProfile.sponsor, focusBio, { bucket: [x.bucket] })}>
                                <span className={bucketPillClass(x.bucket)}>{x.bucket}</span>
                              </Link>
                            </td>
                            <td className="sNum" aria-label={`${x.count} trials`}>
                              <div className="sNumTop">{x.count.toLocaleString()}</div>
                              <div className="sBar" aria-hidden="true">
                                <div className="sFill" style={{ width: `${Math.max(3, Math.round((x.count / sponsorBucketMax) * 100))}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="sCard sPhases" aria-label="Top phases">
                    <div className="sCardHeader compact">
                      <div className="sEyebrow">Top phases</div>
                      <Link className="sLink" href={sponsorQueryHref(sponsorProfile.sponsor, focusBio)}>
                        View all
                      </Link>
                    </div>

                    <table className="sTable" aria-label="Sponsor top phases">
                      <tbody>
                        {sponsorProfile.topPhases.map((x) => (
                          <tr key={x.phase}>
                            <td>
                              <Link className="sRowLink" href={sponsorQueryHref(sponsorProfile.sponsor, focusBio, { phase: [x.phase] })}>
                                <span className={phasePillClass(x.phase)}>{phaseLabel(x.phase)}</span>
                              </Link>
                            </td>
                            <td className="sNum" aria-label={`${x.count} trials`}>
                              <div className="sNumTop">{x.count.toLocaleString()}</div>
                              <div className="sBar" aria-hidden="true">
                                <div className="sFill" style={{ width: `${Math.max(3, Math.round((x.count / sponsorPhaseMax) * 100))}%` }} />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* ===== Footer ===== */}
          <footer className="footer muted">
            Dataset version: <b>{meta?.version || "—"}</b>
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
      </div>

      <style jsx>{`
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .headerLeft {
          min-width: 0;
          flex: 1 1 520px;
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
          margin-top: 4px;
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
        .h3 {
          margin: 0;
          font-size: 14px;
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

        code {
          font-size: 0.95em;
        }

        .grid3 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
          /* Mobile/tablet: allow natural heights */
          align-items: start;
        }
        .grid2 {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        /* Desktop: use more horizontal real estate without affecting mobile layouts. */
        @media (min-width: 1100px) {
          :global(.page) {
            max-width: 1320px;
            margin-left: auto;
            margin-right: auto;
          }
        }


        /* Wide desktop: show all 4 KPI cards in one row */
        @media (min-width: 1180px) {
          .grid3 {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          /* Drill-down: compact 2×2 button grid */
          .btnRow {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .btnRow .btn {
            width: 100%;
            justify-content: center;
          }
        }

        .kpi {
          margin-top: 4px;
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

        .confGrid {
          display: none; /* mobile unchanged */
          margin-top: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .confCell {
          border: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.02);
          border-radius: 14px;
          padding: 10px 12px;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }
        .confLabel {
          color: var(--text-muted);
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-size: 11px;
          line-height: 1.2;
        }
        .confVal {
          font-weight: 950;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
        }

        /* Desktop: replace inline strip with 2×2 stat tiles */
        @media (min-width: 981px) {
          /* Desktop-only: avoid wasted "gutter" whitespace inside scroll regions.
             Base styles use overflow-x: scroll and scrollbar-gutter: stable both-edges.
             On Windows (non-overlay scrollbars), that can reserve extra space and make
             the mini tables look like they have a lot of empty room.

             On desktop we switch to overflow-x: auto (no forced empty scrollbar) and
             reserve a single stable gutter on the right (not both edges) so all scroll
             regions keep identical inner widths without creating extra blank space. */
          .hScroll {
            overflow-x: auto;
            overflow-y: auto;
            scrollbar-gutter: stable;
            touch-action: pan-x pan-y;
          }

          .miniRow {
            display: none;
          }
          .confGrid {
            display: grid;
          }

          /* Desktop KPI row: make all 4 cards equal height */
          .grid3 {
            align-items: stretch;
          }
          .grid3 > .card {
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          /* Balance vertical rhythm inside equal-height KPI cards */
          .grid3 > .card .kpi + .muted.small {
            margin-top: auto !important;
          }
          .grid3 > .card .btnRow {
            margin-top: auto;
          }
          .grid3 > .card .confGrid {
            margin-top: auto;
          }
          /* Desktop: align numeric columns across all mini tables (Reason buckets, Disease area, Conditions, etc.)
             The main culprit was vertical scrollbar gutter in vScroll tables causing a narrower content box.
             Fix: ensure all mini table scroll regions reserve a stable vertical gutter on desktop and use a shared fixed column schema. */
          .hScrollMini {
            overflow-y: auto; /* makes it a y-scroll container, enabling stable gutter even when not overflowing */
            scrollbar-gutter: stable; /* reserve space so vScroll and non-vScroll regions have identical inner widths */
          }

          .tblMini {
            min-width: 0; /* remove mobile overflow forcing on desktop */
            table-layout: fixed;
          }
          .tblMini.tblWide,
          .tblMini.tblReason {
            min-width: 0;
            width: 100%;
          }

          /* Shared column widths: [label] | trials | bio share | bar */
          .tblMini.tblWide th:nth-child(2),
          .tblMini.tblWide td:nth-child(2),
          .tblMini.tblReason th:nth-child(2),
          .tblMini.tblReason td:nth-child(2) {
            width: 112px;
          }
          .tblMini.tblWide th:nth-child(3),
          .tblMini.tblWide td:nth-child(3),
          .tblMini.tblReason th:nth-child(3),
          .tblMini.tblReason td:nth-child(3) {
            width: 88px;
          }

        }

        .btnRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        /* Match bucket pill colors for the Fast drill-down buttons. */
        :global(.btn.btnBucketEfficacy) {
          background: rgba(79, 70, 229, 0.10) !important;
          border-color: rgba(79, 70, 229, 0.25) !important;
        }
        :global(.btn.btnBucketSafety) {
          background: rgba(220, 38, 38, 0.08) !important;
          border-color: rgba(220, 38, 38, 0.25) !important;
        }
        :global(.btn.btnBucketOperational) {
          background: rgba(234, 179, 8, 0.12) !important;
          border-color: rgba(234, 179, 8, 0.25) !important;
        }
        :global(.btn.btnBucketRegulatory) {
          background: rgba(2, 132, 199, 0.10) !important;
          border-color: rgba(2, 132, 199, 0.25) !important;
        }

        :global(.btn.btnBucketEfficacy:hover),
        :global(.btn.btnBucketSafety:hover),
        :global(.btn.btnBucketOperational:hover),
        :global(.btn.btnBucketRegulatory:hover) {
          filter: brightness(0.98);
        }

        :global(.btn.btnBucketEfficacy:active),
        :global(.btn.btnBucketSafety:active),
        :global(.btn.btnBucketOperational:active),
        :global(.btn.btnBucketRegulatory:active) {
          filter: brightness(0.95);
        }
        
        :global(.btn.btnBucketEfficacy:focus-visible),
        :global(.btn.btnBucketSafety:focus-visible),
        :global(.btn.btnBucketOperational:focus-visible),
        :global(.btn.btnBucketRegulatory:focus-visible) {
          outline: none;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
        }

        .panelTitleRow {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .note {
          margin-top: 12px;
          padding: 10px 12px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.02);
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.35;
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
          max-width: 100%;
          overflow-x: scroll;
          scrollbar-gutter: stable both-edges;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x;
          overscroll-behavior-x: contain;
          border-radius: 12px;
          transform: translateZ(0);
        }

        /* Desktop: clamp long tables inside cards and allow vertical scrolling. */
        @media (min-width: 721px) {
          .hScroll.vScroll {
            max-height: 480px;
            overflow-y: auto;
            /* allow both axes when a user scrolls inside the table region */
            touch-action: pan-x pan-y;
            overscroll-behavior: contain;
          }

          /* Keep headers visible while scrolling vertically inside the card */
          .hScroll.vScroll thead th {
            position: sticky;
            top: 0;
            background: #fff;
            z-index: 2;
          }
        }

        .hScrollInner {
          display: block;
          width: 100%;
          padding-bottom: 2px;
        }
        .hScrollInner > table {
          width: 100%;
        }

        /* ====== Pill tags ====== */
        .pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: 0.01em;
          border: 1px solid var(--border);
          background: var(--surface);
          line-height: 1;
          white-space: nowrap;
        }
        .pillNeutral {
          background: rgba(15, 23, 42, 0.02);
        }
        .pillSafety {
          background: rgba(220, 38, 38, 0.08);
          border-color: rgba(220, 38, 38, 0.25);
        }
        .pillEfficacy {
          background: rgba(79, 70, 229, 0.10);
          border-color: rgba(79, 70, 229, 0.25);
        }
        .pillOperational {
          background: rgba(234, 179, 8, 0.12);
          border-color: rgba(234, 179, 8, 0.25);
        }
        .pillRegulatory {
          background: rgba(2, 132, 199, 0.10);
          border-color: rgba(2, 132, 199, 0.25);
        }
        .pillPhase1 {
          background: rgba(14, 165, 233, 0.10);
          border-color: rgba(14, 165, 233, 0.25);
        }
        .pillPhase2 {
          background: rgba(16, 185, 129, 0.10);
          border-color: rgba(16, 185, 129, 0.25);
        }
        .pillPhase3 {
          background: rgba(168, 85, 247, 0.10);
          border-color: rgba(168, 85, 247, 0.25);
        }
        .pillPhase4 {
          background: rgba(244, 63, 94, 0.10);
          border-color: rgba(244, 63, 94, 0.25);
        }

        /* ====== Tables ====== */
        .tblMini {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          min-width: 640px;
        }
        .tblMini th,
        .tblMini td {
          border-bottom: 1px solid var(--border);
          padding: 8px 10px;
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
        .tblMini th.num {
          text-align: right;
        }
        .tblWide {
          min-width: 720px;
        }
        .tblReason {
          min-width: 760px; /* ensure overflow on phones */
        }
        .num {
          text-align: right;
          white-space: nowrap;
          font-weight: 800;
        }

        .cellTop {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .cellSub {
          margin-top: 4px;
          font-size: 12px;
        }

        .exploreInline {
          margin-left: auto;
          font-size: 12px;
          font-weight: 800;
          white-space: nowrap;
        }

        /* Desktop: keep "Explore" on the primary row and reduce vertical noise.
           Mobile remains unchanged (the inline link is hidden). */
        @media (min-width: 721px) {
          .cellSub {
            display: none;
          }
          .exploreInline {
            opacity: 0;
            pointer-events: none;
            transition: opacity 120ms ease;
          }
          .tblMini tbody tr:hover .exploreInline,
          .tblMini tbody tr:focus-within .exploreInline {
            opacity: 1;
            pointer-events: auto;
          }
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
          font-size: 13px;
        }
        .tblMatrix th,
        .tblMatrix td {
          border-bottom: 1px solid var(--border);
          padding: 9px 10px;
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
          min-width: 150px;
        }
        .phaseCell {
          min-width: 180px;
        }
        .matrixCell {
          min-width: 150px;
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
          scroll-snap-type: x proximity;
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
          scroll-snap-align: start;
          width: 210px;
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

        /* ===== Sponsor typeahead ===== */
        .comboWrap {
          position: relative;
        }
        .comboMenu {
          position: absolute;
          left: 0;
          right: 0;
          top: calc(100% + 6px);
          z-index: 60;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface);
          box-shadow: var(--shadow-soft);
          max-height: 280px;
          overflow: auto;
          padding: 6px;
        }
        .comboItem {
          width: 100%;
          text-align: left;
          border: 0;
          background: transparent;
          padding: 9px 10px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
        }
        .comboItem:hover {
          background: rgba(79, 70, 229, 0.06);
        }
        .comboItem:active {
          background: rgba(79, 70, 229, 0.10);
        }

        /* ===== Sponsor ===== */
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

        /* Sponsor panel redesign (desktop only). Mobile remains stacked by default. */
        .min0 {
          min-width: 0;
        }

        .sponsorLayout {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-top: 12px;
        }

        .sCard {
          display: flex;
          flex-direction: column;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 14px;
          min-width: 0;
          overflow: hidden;
        }
        .sSummary {
          padding: 16px;
        }

        .sCardHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .sCardHeader.compact {
          align-items: center;
          margin-bottom: 8px;
        }

        .sEyebrow {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .sTitle {
          font-size: 18px;
          font-weight: 950;
          line-height: 1.15;
          margin-top: 4px;
          word-break: break-word;
        }

        .sModePill {
          font-size: 12px;
          font-weight: 900;
          border: 1px solid var(--border);
          background: var(--surface);
          border-radius: 999px;
          padding: 6px 10px;
          white-space: nowrap;
          color: var(--text);
        }

        .sKpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 6px;
        }
        .sKpi {
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid rgba(15, 23, 42, 0.06);
          border-radius: 14px;
          padding: 10px 10px;
          min-width: 0;
        }
        .sKpiLabel {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .sKpiVal {
          margin-top: 4px;
          font-size: 18px;
          font-weight: 950;
          font-variant-numeric: tabular-nums;
        }

        .sLink {
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .sScroll {
          max-height: 420px;
          overflow: auto;
          border-radius: 14px;
        }

        .sTable {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 13px;
        }
        .sTable th,
        .sTable td {
          border-bottom: 1px solid var(--border);
          padding: 10px 10px;
          vertical-align: top;
        }
        .sTable th {
          text-align: left;
          font-size: 12px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: var(--surface-2);
        }

        .sTable tbody tr:hover {
          background: rgba(79, 70, 229, 0.04);
        }

        .sRowLink {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          max-width: 100%;
        }

        .sNum {
          width: 132px;
          text-align: right;
          font-weight: 950;
        }
        .sNumTop {
          font-variant-numeric: tabular-nums;
        }
        .sBar {
          height: 6px;
          margin-top: 6px;
          background: rgba(15, 23, 42, 0.10);
          border-radius: 999px;
          overflow: hidden;
        }
        .sFill {
          height: 100%;
          background: rgba(79, 70, 229, 0.55);
          border-radius: 999px;
        }

        .sAreas thead th {
          position: sticky;
          top: 0;
          z-index: 2;
        }

        @media (min-width: 980px) {
          .sponsorTopRow {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 14px;
            align-items: end;
          }
          .sponsorSelect {
            min-width: 420px;
          }
        }

        @media (min-width: 1100px) {
          .sponsorLayout {
            display: grid;
            grid-template-columns: repeat(12, minmax(0, 1fr));
            grid-template-areas:
              "summary summary summary summary summary summary areas areas areas areas areas areas"
              "buckets buckets buckets phases phases phases areas areas areas areas areas areas";
            gap: 16px;
            align-items: stretch;
          }
          .sSummary {
            grid-area: summary;
          }
          .sBuckets {
            grid-area: buckets;
          }
          .sPhases {
            grid-area: phases;
          }
          .sAreas {
            grid-area: areas;
          }
          .sCard {
            height: 100%;
          }
          .sAreas .sScroll {
            flex: 1 1 auto;
            max-height: none;
          }
          .sScroll {
            max-height: 360px;
          }
        }

        @media (max-width: 420px) {
          .sKpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
          }
          .sCard {
            border-radius: 14px;
            padding: 12px;
          }
          .sSummary {
            padding: 13px;
          }
          .sKpi {
            padding: 8px 7px;
            border-radius: 11px;
          }
          .sKpiLabel {
            font-size: 10px;
            letter-spacing: 0.04em;
          }
          .sKpiVal {
            font-size: 16px;
          }
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

        @media (max-width: 1100px) {
          .sponsorPanels3 {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 980px) {
          .grid3 {
            grid-template-columns: 1fr;
          }
          .grid2 {
            grid-template-columns: 1fr;
          }
          .scrollHint {
            display: block;
          }
        }

        @media (max-width: 820px) {
          .sponsorPanels3 {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .title {
            font-size: 20px;
          }
          .subtitle {
            font-size: 12px;
          }


/* Mobile: prevent iOS Safari flex-wrap gap in the page header.
   On some Safari builds, a wrapping flex header can create a large internal
   vertical gap that pushes the second flex line (chips/button) far down.
   The robust fix is to stop using flex for the header on phones. */
.header {
  display: block !important;
}
.headerRight {
  width: 100%;
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start !important;
  gap: 10px;
}
.headerRight .chip {
  width: 100%;
}
.headerRight button {
  width: 100%;
  justify-content: center;
}
          .h2 {
            font-size: 15px;
          }
          .h3 {
            font-size: 13px;
          }

          /* Tighten section spacing on phones */
          .section {
            margin-top: 14px;
          }

          /* Mobile: avoid negative margins (can clip on devices where the parent padding isn't 16px).
             Keep scroll areas contained so the right edge is always reachable. */
          .hScroll {
            margin: 0;
            padding: 0;
          }

          /* Mobile: keep horizontal scroll tables as intrinsic-width */
          .hScrollInner {
            display: inline-block;
            min-width: max-content;
          }
          .hScrollInner > table {
            width: max-content;
          }

          /* Mobile: hide bar column to keep header/value alignment tight */
          .tblMini.tblWide th:nth-child(4),
          .tblMini.tblWide td:nth-child(4),
          .tblMini.tblReason th:nth-child(4),
          .tblMini.tblReason td:nth-child(4) {
            display: none;
          }
          /* Ensure page respects safe areas and doesn't clip the right edge */
          :global(.page) {
            padding-left: max(12px, env(safe-area-inset-left));
            padding-right: max(12px, env(safe-area-inset-right));
          }

          /* Reduce card padding on mobile to tighten layout */
          :global(.p-4) {
            padding: 12px;
          }

          /* Prevent any grid children from forcing overflow */
          .grid2 > *,
          .grid3 > * {
            min-width: 0;
          }

          .tblMini {
            font-size: 12px;
          }
          .tblMini th,
          .tblMini td {
            padding: 8px 8px;
          }

          /* Ensure the reason buckets table keeps overflow visible on mobile */
          .tblReason {
            min-width: 760px;
          }

          .miniRow {
            grid-template-columns: repeat(4, auto);
          }
          /* Mobile: keep "Explore →" on its own line; hide the inline link. */
          .exploreInline {
            display: none;
          }



          .desktopOnly {
            display: none;
          }
          .mobileOnly {
            display: block;
          }

          /* Sponsor controls stack nicely */
          .sponsorTopRow {
            flex-direction: column;
            align-items: stretch;
          }
          .sponsorSelect {
            min-width: 0;
            flex: 0 0 auto;
            width: 100%;
          }
          .sponsorBtns {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr 1fr;
          }
          :global(.sponsorBtns .btn),
          :global(.sponsorBtns .btn-primary) {
            width: 100%;
            justify-content: center;
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
