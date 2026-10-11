// web/pages/outliers.tsx

import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { useEffect, useMemo, useState } from "react";

import { loadSpecialness } from "@/lib/data";
import { UrlState } from "@/lib/types";
import { encodeState } from "@/lib/urlState";
import PrimaryNav from "@/components/PrimaryNav";

const TITLE = "Clinical trial failure outliers | Sponsors and disease areas";
const DESCRIPTION =
  "Find sponsors and disease areas that appear unusually often in specific clinical trial stop-reason buckets, with shrinkage-adjusted outlier calculations.";
const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/outliers`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

type ScopeKey = "all" | "bio";
type GroupByKey = "company" | "disease_area";
type PhaseKey = "all" | "phase1" | "phase2" | "phase3" | "phase4";
type BucketKey = "EFFICACY/FUTILITY" | "SAFETY" | "OPERATIONAL" | "REGULATORY" | "OTHER/UNKNOWN";

type Baseline = { n: number; k: number; rate: number };

type OutlierCountRow = {
  group: string;
  n: number;
  // per-bucket hit counts in the same order as data.bucket_order / BUCKET_OPTS
  k: number[];
};

type OutlierRow = {
  group: string;
  n: number;
  k: number;
  raw_rate: number;
  posterior_mean: number;
  ci90_low: number;
  ci90_high: number;
  baseline_rate: number;
  lift: number | null;
  prob_gt_baseline: number;
};

type SpecialnessIndex = {
  generated_at_utc?: string;
  prior?: { a: number; b: number; interval?: string };
  scopes?: string[];
  group_bys?: string[];
  phases?: string[];
  buckets?: string[];
  baselines: Record<ScopeKey, Record<PhaseKey, Record<BucketKey, Baseline>>>;
  bucket_order?: string[];
  results: Record<ScopeKey, Record<GroupByKey, Record<PhaseKey, OutlierCountRow[]>>>;
  notes?: string;
};

type OutliersSnapshot = {
  generatedAt: string;
  baseline: Baseline | null;
  rows: OutlierRow[];
};

type OutliersPageProps = {
  initialSnapshot: OutliersSnapshot;
};

function safePct(x: number): string {
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function safeProb(x: number): string {
  if (!Number.isFinite(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

function erf(x: number): number {
  // Abramowitz & Stegun 7.1.26
  // max error ~1.5e-7
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const p = 0.3275911;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const t = 1.0 / (1.0 + p * ax);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function phi(z: number): number {
  return 0.5 * (1.0 + erf(z / Math.sqrt(2)));
}

function betaMeanCi90(alpha: number, beta: number): { mean: number; lo: number; hi: number; sd: number } {
  const denom = alpha + beta;
  if (!(denom > 0)) return { mean: 0, lo: 0, hi: 0, sd: 0 };
  const mean = alpha / denom;
  const v = (alpha * beta) / (denom * denom * (denom + 1));
  const sd = Math.sqrt(Math.max(0, v));
  const z = 1.645; // ~90% two-sided
  return {
    mean,
    lo: Math.max(0, mean - z * sd),
    hi: Math.min(1, mean + z * sd),
    sd
  };
}

function probBetaGtBaseline(alpha: number, beta: number, p0: number): number {
  const { mean, sd } = betaMeanCi90(alpha, beta);
  if (!(sd > 0)) {
    if (mean > p0) return 1;
    if (mean < p0) return 0;
    return 0.5;
  }
  const z = (mean - p0) / sd;
  return phi(z);
}

function safeLift(x: number | null): string {
  if (x == null || !Number.isFinite(x)) return "—";
  // one decimal is enough; avoid false precision
  return `${Math.round(x * 10) / 10}×`;
}

function normEntity(s?: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

function exploreHref(patch: Partial<UrlState>): string {
  const base: UrlState = { sort: "date_desc" };
  return `/explore${encodeState({ ...base, ...patch })}`;
}

const PHASE_OPTS: { key: PhaseKey; label: string; exploreTokens?: string[] }[] = [
  { key: "all", label: "All phases" },
  {
    key: "phase1",
    label: "Phase I",
    exploreTokens: ["EARLY_PHASE1", "PHASE1", "PHASE1/PHASE2"]
  },
  {
    key: "phase2",
    label: "Phase II",
    exploreTokens: ["PHASE2", "PHASE1/PHASE2", "PHASE2/PHASE3"]
  },
  {
    key: "phase3",
    label: "Phase III",
    exploreTokens: ["PHASE3", "PHASE2/PHASE3"]
  },
  { key: "phase4", label: "Phase IV", exploreTokens: ["PHASE4"] }
];

const BUCKET_OPTS: { key: BucketKey; label: string }[] = [
  { key: "EFFICACY/FUTILITY", label: "Efficacy / futility" },
  { key: "SAFETY", label: "Safety" },
  { key: "OPERATIONAL", label: "Operational" },
  { key: "REGULATORY", label: "Regulatory" },
  { key: "OTHER/UNKNOWN", label: "Other / unknown" }
];

const GROUP_OPTS: { key: GroupByKey; label: string; unknownLabel: string }[] = [
  { key: "company", label: "Company / sponsor", unknownLabel: "Unknown" },
  { key: "disease_area", label: "Disease area", unknownLabel: "Other" }
];

function Table({
  rows,
  getHref,
  ariaLabel
}: {
  rows: OutlierRow[];
  getHref: (r: OutlierRow) => string;
  ariaLabel: string;
}) {
  return (
    <div className="olRankWrap" role="region" aria-label={ariaLabel}>
      <div className="olRankMeta muted olSmall">
        Showing <b>{rows.length.toLocaleString()}</b> results
      </div>

      <div className="olScrollHint">Scroll inside table ↓ (wheel/trackpad). On phones: swipe ↔ for wide columns.</div>

      <div className="hScroll vScroll" role="region" aria-label={`${ariaLabel} (scrollable)`} tabIndex={0}>
        <div className="hScrollInner">
          <table className="tblMini tblOutliers" aria-label={ariaLabel}>
            <thead>
              <tr>
                <th style={{ width: 64 }}>Rank</th>
                <th>Name</th>
                <th className="num" style={{ width: 120 }}>
                  P(&gt;baseline)
                </th>
                <th className="num" style={{ width: 96 }}>
                  Lift
                </th>
                <th className="num" style={{ width: 120 }}>
                  Shrunk rate
                </th>
                <th className="num" style={{ width: 160 }}>
                  90% CI
                </th>
                <th className="num" style={{ width: 92 }}>
                  Trials
                </th>
                <th className="num" style={{ width: 110 }}>
                  In bucket
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.group}__${i}`}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <div className="olNameCell">
                      <Link className="link" href={getHref(r)}>
                        {r.group}
                      </Link>
                      <div className="muted olSmall" style={{ marginTop: 4 }}>
                        Raw: {safePct(r.raw_rate)} • Baseline: {safePct(r.baseline_rate)}
                      </div>
                    </div>
                  </td>
                  <td className="num">{safeProb(r.prob_gt_baseline)}</td>
                  <td className="num">{safeLift(r.lift)}</td>
                  <td className="num">{safePct(r.posterior_mean)}</td>
                  <td className="num">
                    {safePct(r.ci90_low)}–{safePct(r.ci90_high)}
                  </td>
                  <td className="num">{r.n.toLocaleString()}</td>
                  <td className="num">{r.k.toLocaleString()}</td>
                </tr>
              ))}

              {!rows.length ? (
                <tr>
                  <td className="muted" colSpan={8} style={{ padding: "10px" }}>
                    No results (try lowering “Min trials” / “Min bucket hits”).
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function computeOutlierRows(
  data: SpecialnessIndex,
  scope: ScopeKey,
  groupBy: GroupByKey,
  phase: PhaseKey,
  bucket: BucketKey,
  minTrials: number,
  minHits: number
): OutlierRow[] {
  const baseline = data.baselines?.[scope]?.[phase]?.[bucket] || null;
  const raw: OutlierCountRow[] = data.results?.[scope]?.[groupBy]?.[phase] || [];
  const p0 = baseline?.rate ?? 0;
  const priorA = data.prior?.a ?? 1;
  const priorB = data.prior?.b ?? 1;
  const order = (data.bucket_order || BUCKET_OPTS.map((option) => option.key)).map((value) => String(value).toUpperCase());
  const bucketIndex = Math.max(0, order.indexOf(String(bucket).toUpperCase()));
  const computed: OutlierRow[] = [];

  for (const row of raw) {
    const n = row?.n || 0;
    const k = (row?.k && row.k.length > bucketIndex ? row.k[bucketIndex] : 0) || 0;
    if (n < Math.max(1, minTrials || 1) || k < Math.max(0, minHits || 0)) continue;
    const alpha = priorA + k;
    const beta = priorB + (n - k);
    const { mean, lo, hi } = betaMeanCi90(alpha, beta);
    computed.push({
      group: row.group,
      n,
      k,
      raw_rate: n > 0 ? k / n : 0,
      posterior_mean: mean,
      ci90_low: lo,
      ci90_high: hi,
      baseline_rate: p0,
      lift: p0 > 0 ? mean / p0 : null,
      prob_gt_baseline: probBetaGtBaseline(alpha, beta, p0),
    });
  }

  return computed.sort((a, b) => {
    if (b.prob_gt_baseline !== a.prob_gt_baseline) return b.prob_gt_baseline - a.prob_gt_baseline;
    const bLift = b.lift ?? -Infinity;
    const aLift = a.lift ?? -Infinity;
    if (bLift !== aLift) return bLift - aLift;
    if (b.n !== a.n) return b.n - a.n;
    return a.group.localeCompare(b.group);
  });
}

function buildOutliersSnapshot(data: SpecialnessIndex): OutliersSnapshot {
  return {
    generatedAt: data.generated_at_utc || "current dataset",
    baseline: data.baselines?.all?.phase2?.SAFETY || null,
    rows: computeOutlierRows(data, "all", "company", "phase2", "SAFETY", 10, 3).slice(0, 8),
  };
}

export function OutliersServerSnapshot({ snapshot }: { snapshot: OutliersSnapshot }) {
  const number = (value: number) => value.toLocaleString("en-US");
  return (
    <section className="card p-4 olPanel" aria-labelledby="outliers-snapshot-title">
      <p className="facet-title">Server-rendered evidence snapshot</p>
      <h2 id="outliers-snapshot-title" className="h2">Phase II sponsor safety outliers</h2>
      <p className="muted olSubtitle">
        This default comparison uses shrinkage-adjusted estimates for sponsors with at least 10 stopped Phase II
        records and at least three safety-classified stops. It is a screening signal, not a sponsor failure rate.
      </p>
      {snapshot.baseline ? (
        <p><strong>Comparison baseline:</strong> {safePct(snapshot.baseline.rate)} ({number(snapshot.baseline.k)} of {number(snapshot.baseline.n)} records).</p>
      ) : null}
      <div className="hScroll" role="region" aria-label="Phase II sponsor safety snapshot" tabIndex={0}>
        <table className="tblMini tblOutliers">
          <thead><tr><th>Sponsor</th><th className="num">P(&gt;baseline)</th><th className="num">Lift</th><th className="num">Trials</th><th className="num">Safety stops</th></tr></thead>
          <tbody>{snapshot.rows.map((row) => (
            <tr key={row.group}><td>{row.group}</td><td className="num">{safeProb(row.prob_gt_baseline)}</td><td className="num">{safeLift(row.lift)}</td><td className="num">{number(row.n)}</td><td className="num">{number(row.k)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <p className="muted olSmall" style={{ margin: "12px 0 0" }}>Snapshot generated from {snapshot.generatedAt}. Loading the interactive cohort controls…</p>
    </section>
  );
}

export default function OutliersPage({ initialSnapshot }: OutliersPageProps) {
  const [data, setData] = useState<SpecialnessIndex | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [scope, setScope] = useState<ScopeKey>("all");
  const [groupBy, setGroupBy] = useState<GroupByKey>("company");
  const [phase, setPhase] = useState<PhaseKey>("phase2");
  const [bucket, setBucket] = useState<BucketKey>("SAFETY");
  const [minTrials, setMinTrials] = useState(10);
  const [minHits, setMinHits] = useState(3);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const x = (await loadSpecialness()) as SpecialnessIndex;
        if (!alive) return;
        setData(x);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load specialness_index.json");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Guard for older/missing payloads
  const hasBio = useMemo(() => {
    const scopes = (data?.scopes || []).map((x) => String(x).toLowerCase());
    return scopes.includes("bio");
  }, [data]);

  useEffect(() => {
    if (scope === "bio" && !hasBio) setScope("all");
  }, [scope, hasBio]);

  const baseline = useMemo(() => {
    if (!data) return null;
    return data.baselines?.[scope]?.[phase]?.[bucket] || null;
  }, [data, scope, phase, bucket]);

  const rows = useMemo(() => {
    if (!data) return [] as OutlierRow[];
    return computeOutlierRows(data, scope, groupBy, phase, bucket, minTrials, minHits);
  }, [data, scope, groupBy, phase, bucket, minTrials, minHits]);

  const topPick = rows[0];

  const phaseOpt = PHASE_OPTS.find((p) => p.key === phase) || PHASE_OPTS[0];
  const bucketOpt = BUCKET_OPTS.find((b) => b.key === bucket) || BUCKET_OPTS[0];

  const drilldownHref = (r: OutlierRow): string => {
    const patch: Partial<UrlState> = {
      sort: "date_desc",
      bucket: [bucket],
      bio: scope === "bio" ? true : undefined
    };

    if (phaseOpt.exploreTokens?.length) patch.phase = phaseOpt.exploreTokens;

    if (groupBy === "company") patch.sponsor = [normEntity(r.group)];
    if (groupBy === "disease_area") patch.area = [normEntity(r.group)];

    return exploreHref(patch);
  };

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
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Head>

      <div className="outliers min-h-screen">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <PrimaryNav active="outliers" />
            </div>
          </div>
        </header>

        <main className="page">
          <header className="olHeader">
            <div className="olHeaderLeft">
              <h1 className="olTitle">Outliers</h1>
              <div className="muted olSubtitle">
                Identify sponsors or disease areas that appear unusually often in a specific stop-reason bucket within a comparable cohort (e.g.
                Safety in Phase II).
              </div>
              <div className="muted olSmall" style={{ marginTop: 8 }}>
                Unsure how baseline, lift, shrunk rate, CI, or P(&gt;baseline) are computed? See{' '}
                <Link className="link" href="/methods#outliers-calculations">
                  Methods
                </Link>
                .
              </div>
            </div>

            <div className="olHeaderRight">
              {baseline ? (
                <div className="chip">
                  Baseline: <b>{safePct(baseline.rate)}</b>
                  <span className="muted" style={{ marginLeft: 8 }}>
                    ({baseline.k.toLocaleString()}/{baseline.n.toLocaleString()})
                  </span>
                </div>
              ) : (
                <div className="chip">
                  Baseline: <b>—</b>
                </div>
              )}

              {hasBio ? (
                <button
                  className={scope === "bio" ? "btn btn-primary" : "btn"}
                  onClick={() => setScope((v) => (v === "bio" ? "all" : "bio"))}
                  aria-pressed={scope === "bio"}
                >
                  {scope === "bio" ? "Showing scientific failures" : "Show scientific failures"}
                </button>
              ) : null}
            </div>
          </header>

          {err ? <div className="card p-4 error">{err}</div> : null}
          {loading ? <OutliersServerSnapshot snapshot={initialSnapshot} /> : null}

          {!loading && !err && data ? (
            <section className="card p-4 olPanel" aria-label="Outlier controls and table">
              <div className="olControls">
                <div className="olControl">
                  <div className="facet-title">Group by</div>
                  <select
                    className="input select"
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as GroupByKey)}
                    aria-label="Group by"
                  >
                    {GROUP_OPTS.map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="olControl">
                  <div className="facet-title">Phase cohort</div>
                  <select
                    className="input select"
                    value={phase}
                    onChange={(e) => setPhase(e.target.value as PhaseKey)}
                    aria-label="Phase cohort"
                  >
                    {PHASE_OPTS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="olControl">
                  <div className="facet-title">Bucket</div>
                  <select
                    className="input select"
                    value={bucket}
                    onChange={(e) => setBucket(e.target.value as BucketKey)}
                    aria-label="Bucket"
                  >
                    {BUCKET_OPTS.map((b) => (
                      <option key={b.key} value={b.key}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="olControl">
                  <div className="facet-title">Min trials</div>
                  <input
                    className="input olMin"
                    type="number"
                    min={1}
                    step={1}
                    value={minTrials}
                    onChange={(e) => setMinTrials(Math.max(1, parseInt(e.target.value || "1", 10)))}
                    aria-label="Minimum trials"
                  />
                </div>

                <div className="olControl">
                  <div className="facet-title">Min bucket hits</div>
                  <input
                    className="input olMin"
                    type="number"
                    min={0}
                    step={1}
                    value={minHits}
                    onChange={(e) => setMinHits(Math.max(0, parseInt(e.target.value || "0", 10)))}
                    aria-label="Minimum bucket hits"
                  />
                </div>
              </div>

              <div className="olTopPick">
                <div className="facet-title">Top outlier</div>
                <div className="olTopPickName">
                  {topPick ? (
                    <Link className="link" href={drilldownHref(topPick)}>
                      {topPick.group}
                    </Link>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
                {topPick ? (
                  <div className="muted olSmall" style={{ marginTop: 4 }}>
                    {bucketOpt.label} • {phaseOpt.label} • P(&gt;baseline) {safeProb(topPick.prob_gt_baseline)} • Lift{" "}
                    {safeLift(topPick.lift)}
                  </div>
                ) : null}
              </div>

              <Table ariaLabel="Outliers table" rows={rows} getHref={(r) => drilldownHref(r)} />

              <div className="muted olFoot">
                Notes: “Shrunk rate” uses a Beta prior to reduce noise for small denominators. Use “Min trials” to focus on stable signals.
              </div>
            </section>
          ) : null}
        </main>

        <style jsx global>{`
          .outliers .olHeader {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
            flex-wrap: wrap;
          }
          .outliers .olTitle {
            margin: 0;
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.01em;
          }
          .outliers .olSubtitle {
            margin-top: 8px;
            font-size: 14px;
            line-height: 1.45;
            max-width: 880px;
          }
          .outliers .olHeaderRight {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .outliers .olPanel {
            padding: 16px;
            min-width: 0;
          }

          .outliers .olControls {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: 12px;
            align-items: flex-end;
            margin-bottom: 14px;
          }
          .outliers .olControl {
            min-width: 0;
          }
          .outliers .olMin {
            width: 100%;
          }

          .outliers .olTopPick {
            border: 1px dashed var(--border);
            border-radius: 14px;
            padding: 11px 12px;
            margin: 10px 0 14px;
            background: rgba(15, 23, 42, 0.02);
          }
          .outliers .olTopPickName {
            font-size: 16px;
            font-weight: 900;
            margin-top: 6px;
          }
          .outliers .olSmall {
            font-size: 12px;
          }

          /* ====== Horizontal/vertical scroll regions (copied from pharma-intelligence for parity) ====== */
          .outliers .hScroll {
            width: 100%;
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: var(--surface);
          }
          .outliers .hScroll.vScroll {
            max-height: 560px;
            overflow-y: auto;
          }
          .outliers .hScroll.vScroll thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: var(--surface);
          }
          .outliers .hScrollInner {
            min-width: 900px;
          }
          .outliers .hScrollInner > table {
            width: 100%;
          }

          /* ====== Tables ====== */
          .outliers .tblMini {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            min-width: 920px;
          }
          .outliers .tblMini th,
          .outliers .tblMini td {
            border-bottom: 1px solid var(--border);
            padding: 8px 10px;
            vertical-align: top;
          }
          .outliers .tblMini th {
            text-align: left;
            font-size: 12px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            white-space: nowrap;
          }
          .outliers .tblMini th.num {
            text-align: right;
          }
          .outliers .num {
            text-align: right;
            white-space: nowrap;
            font-weight: 800;
          }

          .outliers .link {
            color: rgba(79, 70, 229, 0.92);
            font-weight: 750;
          }
          .outliers .link:hover {
            text-decoration: underline;
          }

          .outliers .olRankMeta {
            margin-bottom: 8px;
          }
          .outliers .olScrollHint {
            margin: 6px 0 10px;
            font-size: 12px;
            color: var(--text-muted);
          }
          .outliers .olFoot {
            margin-top: 12px;
            font-size: 12px;
          }

          @media (max-width: 760px) {
            .outliers .olHeader {
              flex-direction: column;
              align-items: flex-start;
            }
            .outliers .olControl {
              min-width: 0;
            }
            .outliers .olPanel {
              padding: 12px;
            }
            .outliers .select,
            .outliers .olMin {
              width: 100%;
            }
            .outliers .hScrollInner {
              min-width: 980px;
            }
          }
        `}</style>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<OutliersPageProps> = async () => {
  const { readJsonServerAsset } = await import("@/lib/server-data");
  const data = await readJsonServerAsset<SpecialnessIndex>("public/specialness_index.json");
  return {
    props: { initialSnapshot: buildOutliersSnapshot(data) },
    revalidate: 86_400,
  };
};
