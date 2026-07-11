// web/pages/top-entities.tsx

import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { loadIndex } from "@/lib/data";
import { TrialIndexRow, UrlState } from "@/lib/types";
import { encodeState } from "@/lib/urlState";
import { isLikelyScientificFailure, reasonBucket } from "@/lib/filtering";
import GuidesMenu from "@/components/GuidesMenu";

const TITLE = "Top sponsors and disease areas in stopped clinical trials";
const DESCRIPTION =
  "See top sponsors and disease areas across stopped clinical trials, with filters for efficacy, safety, operational, and regulatory stop-reason buckets.";
const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/top-entities`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

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

/**
 * IMPORTANT: Only include these four buckets in the share-leaders filters.
 */
const BUCKETS: BucketOption[] = [
  { key: "EFFICACY/FUTILITY", label: "Efficacy/Futility", buckets: ["EFFICACY/FUTILITY"] },
  { key: "SAFETY", label: "Safety", buckets: ["SAFETY"] },
  { key: "OPERATIONAL", label: "Operational", buckets: ["OPERATIONAL"] },
  { key: "REGULATORY", label: "Regulatory", buckets: ["REGULATORY"] }
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
    <div className="slControls">
      <div className="slControl">
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

      <div className="slControl">
        <div className="facet-title">Min trials</div>
        <input
          className="input slMinTrials"
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
  getHref,
  ariaLabel
}: {
  rows: ShareRow[];
  getHref: (r: ShareRow) => string;
  ariaLabel: string;
}) {
  const shown = rows;
  const maxShare = shown.length ? shown[0].share : 0;

  return (
    <div className="slRankWrap" role="region" aria-label={ariaLabel}>
      <div className="slRankMeta muted slSmall">
        Showing <b>{shown.length.toLocaleString()}</b> results
      </div>

      <div className="slScrollHint">
        Scroll inside table ↓ (wheel/trackpad). On phones: swipe ↔ for wide columns.
      </div>

      {/* Same structure as pharma-intelligence */}
      <div className="hScroll vScroll" role="region" aria-label={`${ariaLabel} (scrollable)`} tabIndex={0}>
        <div className="hScrollInner">
          <table className="tblMini tblShareLeaders" aria-label={ariaLabel}>
            <thead>
              <tr>
                <th style={{ width: 64 }}>Rank</th>
                <th>Name</th>
                <th className="num" style={{ width: 92 }}>
                  Share
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
              {shown.map((r, i) => (
                <tr key={r.key}>
                  <td className="muted">{i + 1}</td>
                  <td>
                    <div className="slNameCell">
                      <Link className="link" href={getHref(r)}>
                        {r.label}
                      </Link>

                      <div className="slMiniBar" aria-hidden="true">
                        <div
                          className="slMiniBarFill"
                          style={{ width: `${maxShare > 0 ? (r.share / maxShare) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="num">{safePct(r.share)}</td>
                  <td className="num">{r.total.toLocaleString()}</td>
                  <td className="num">{r.inBucket.toLocaleString()}</td>
                </tr>
              ))}

              {!shown.length ? (
                <tr>
                  <td className="muted" colSpan={5} style={{ padding: "10px" }}>
                    No results (try lowering “Min trials”).
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

export default function TopEntitiesPage() {
  const [allRows, setAllRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<"sponsors" | "diseases">("sponsors");
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

      <div className="shareLeaders min-h-screen">
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
                <Link className="navlink" href="/sponsor-insights">
                  Sponsor insights
                </Link>
                <Link className="navlink" href="/outliers">
                  Outliers
                </Link>
                <Link className="navlink" href="/top-entities" aria-current="page">
                  Top entities
                </Link>
                <Link className="navlink" href="/methods">
                  Methods
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="page">
          <header className="slHeader">
            <div className="slHeaderLeft">
              <h1 className="slTitle">Top entities</h1>
              <div className="muted slSubtitle">
                Rank sponsors and disease areas by their share of a selected stop-reason bucket.
              </div>
            </div>

            <div className="slHeaderRight">
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
            <section className="slGrid1" aria-label="Top entities">
              <div className="card p-4 slPanel">
                <div className="slPanelHead">
                  <div className="muted slSmall">Top entities</div>
                  <div className="slPanelTitle">Rank sponsors and disease areas by their share of…</div>

                  <div className="teTabs" role="tablist" aria-label="Entity type" style={{ marginTop: 10 }}>
                    <button
                      className={tab === "sponsors" ? "btn btn-primary teTabBtn" : "btn teTabBtn"}
                      onClick={() => setTab("sponsors")}
                      role="tab"
                      aria-selected={tab === "sponsors"}
                    >
                      Sponsors
                    </button>
                    <button
                      className={tab === "diseases" ? "btn btn-primary teTabBtn" : "btn teTabBtn"}
                      onClick={() => setTab("diseases")}
                      role="tab"
                      aria-selected={tab === "diseases"}
                    >
                      Diseases
                    </button>
                  </div>

                  <div className="muted slSmall" style={{ marginTop: 10 }}>
                    Share = (trials in selected bucket) / (all trials for the entity) within the current scope.
                  </div>
                </div>

                {tab === "sponsors" ? (
                  <>
                    <div className="teSectionLabel muted slSmall" style={{ marginTop: 14 }}>
                      Sponsor
                    </div>

                    <ControlGroup
                      label="Sponsor"
                      bucketKey={bucketCompany}
                      setBucketKey={setBucketCompany}
                      minTrials={minTrialsCompany}
                      setMinTrials={setMinTrialsCompany}
                    />

                    <div className="slTopPick">
                      <div className="facet-title">Top sponsor</div>
                      <div className="slTopPickName">
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
                        <div className="muted slSmall" style={{ marginTop: 4 }}>
                          {safePct(topCompany.share)} ({topCompany.inBucket}/{topCompany.total}) in {companyBucketLabel}
                        </div>
                      ) : null}
                    </div>

                    <RankTable
                      ariaLabel="Sponsor share leaders"
                      rows={companyTable}
                      getHref={(r) =>
                        exploreHref(bioOnly, {
                          sponsor: [r.key],
                          bucket: companyBucketList,
                          bio: bioOnly ? true : undefined
                        })
                      }
                    />
                  </>
                ) : (
                  <>
                    <div className="teSectionLabel muted slSmall" style={{ marginTop: 14 }}>
                      Disease area
                    </div>

                    <ControlGroup
                      label="Disease area"
                      bucketKey={bucketArea}
                      setBucketKey={setBucketArea}
                      minTrials={minTrialsArea}
                      setMinTrials={setMinTrialsArea}
                    />

                    <div className="slTopPick">
                      <div className="facet-title">Top disease area</div>
                      <div className="slTopPickName">
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
                        <div className="muted slSmall" style={{ marginTop: 4 }}>
                          {safePct(topArea.share)} ({topArea.inBucket}/{topArea.total}) in {areaBucketLabel}
                        </div>
                      ) : null}
                    </div>

                    <RankTable
                      ariaLabel="Disease area share leaders"
                      rows={areaTable}
                      getHref={(r) =>
                        exploreHref(bioOnly, {
                          area: [r.key],
                          bucket: areaBucketList,
                          bio: bioOnly ? true : undefined
                        })
                      }
                    />
                  </>
                )}
              </div>
            </section>
          ) : null}

          {!loading && !err ? (
            <div className="muted slFoot">
              Tip: shares can be unstable for small denominators — increase “Min trials” to focus on larger samples.
            </div>
          ) : null}
        </main>

        {/* Global styles scoped under .shareLeaders (so they apply inside child components) */}
        <style jsx global>{`
          .shareLeaders .slHeader {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
            flex-wrap: wrap;
          }
          .shareLeaders .slTitle {
            margin: 0;
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.01em;
          }
          .shareLeaders .slSubtitle {
            margin-top: 8px;
            font-size: 14px;
            line-height: 1.45;
            max-width: 820px;
          }
          .shareLeaders .slHeaderRight {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .shareLeaders .slGrid2 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            align-items: start;
          }
          .shareLeaders .slGrid1 {
            display: grid;
            grid-template-columns: 1fr;
            gap: 14px;
            align-items: start;
          }
          @media (min-width: 980px) {
            .shareLeaders .slGrid2 {
              grid-template-columns: 1fr 1fr;
            }
          }
          @media (max-width: 520px) {
            .shareLeaders .slHeader {
              flex-direction: column;
            }
            .shareLeaders .slHeaderRight {
              justify-content: flex-start;
            }
          }

          /* critical in CSS grid: allow children to shrink (prevents one table forcing the other to lose columns) */
          .shareLeaders .slPanel {
            padding: 18px !important;
            min-width: 0;
            overflow: hidden;
          }
          .shareLeaders .slGrid2 > * {
            min-width: 0;
          }
          .shareLeaders .slGrid1 > * {
            min-width: 0;
          }

          .shareLeaders .slPanelHead {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: end;
            gap: 6px 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
          }
          .shareLeaders .slPanelTitle {
            margin-top: 4px;
            font-size: 16px;
            font-weight: 900;
            letter-spacing: -0.01em;
          }

          /* Tabs (Top entities) */
          .shareLeaders .teTabs {
            display: inline-flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            grid-column: 2;
            grid-row: 1 / span 2;
            margin-top: 0 !important;
          }
          .shareLeaders .teTabBtn {
            padding: 6px 10px;
            font-size: 13px;
          }
          .shareLeaders .slSmall {
            font-size: 12px;
          }
          .shareLeaders .slPanelHead > .muted:last-child {
            grid-column: 1 / -1;
            margin-top: 4px !important;
          }

          /* Controls */
          .shareLeaders .slControls {
            margin-top: 14px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            align-items: flex-end;
          }
          .shareLeaders .slControl {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 0;
          }
          .shareLeaders .slMinTrials {
            width: 132px;
            max-width: 132px;
          }
          @media (max-width: 520px) {
            .shareLeaders .slControls {
              grid-template-columns: 1fr;
              align-items: stretch;
            }
            .shareLeaders .slPanel {
              padding: 14px !important;
            }
            .shareLeaders .slPanelHead {
              display: block;
              padding-bottom: 10px;
            }
            .shareLeaders .teTabs {
              margin-top: 10px !important;
            }
            .shareLeaders .slMinTrials {
              width: 100%;
              max-width: 100%;
            }
          }

          .shareLeaders .slTopPick {
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px solid var(--border);
          }
          .shareLeaders .slTopPickName {
            margin-top: 4px;
            font-size: 18px;
            font-weight: 900;
            line-height: 1.25;
          }

          .shareLeaders .slRankWrap {
            margin-top: 14px;
            border-top: 1px solid var(--border);
            padding-top: 14px;
          }
          .shareLeaders .slRankMeta {
            margin-bottom: 8px;
          }
          .shareLeaders .slScrollHint {
            color: var(--text-muted);
            font-weight: 750;
            font-size: 12px;
            margin-bottom: 10px;
          }

          /* === pharma-intelligence scroll containers === */
          .shareLeaders .hScroll {
            width: 100%;
            max-width: 100%;
            overflow-x: auto; /* auto so we don't force a scrollbar when not needed */
            scrollbar-gutter: stable both-edges;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-x;
            overscroll-behavior-x: contain;
            border-radius: 12px;
            transform: translateZ(0);
          }

          /* Clamp on all sizes (you explicitly want tables not to get too long) */
          .shareLeaders .hScroll.vScroll {
            max-height: 520px;
            overflow-y: auto;
            touch-action: pan-x pan-y;
            overscroll-behavior: contain;
          }
          @media (max-width: 520px) {
            .shareLeaders .hScroll.vScroll {
              max-height: 320px;
            }
          }

          @media (min-width: 721px) {
            .shareLeaders .hScroll.vScroll thead th {
              position: sticky;
              top: 0;
              background: #fff;
              z-index: 2;
            }
          }

          .shareLeaders .hScrollInner {
            display: block;
            width: 100%;
            padding-bottom: 2px;
          }

          /* Desktop: keep the rightmost columns from sitting under the vertical scrollbar
             (Windows/Chrome can overlay the scrollbar on the scrollport). */
          @media (min-width: 721px) {
            .shareLeaders .hScroll.vScroll .hScrollInner {
              padding-right: 18px;
            }
          }
          .shareLeaders .hScrollInner > table {
            width: 100%;
          }

          /* === Table styling (match pharma-intelligence look) === */
          .shareLeaders .tblMini {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;

            /* IMPORTANT CHANGE:
               Do NOT force min-width on desktop (2-col grid). */
            min-width: 0;
          }

          /* On mobile, force horizontal scroll for wide tables */
          @media (max-width: 720px) {
            .shareLeaders .tblMini.tblShareLeaders {
              min-width: 760px; /* ensures overflow on phones */
            }
          }

          .shareLeaders .tblMini th,
          .shareLeaders .tblMini td {
            border-bottom: 1px solid var(--border);
            padding: 8px 10px;
            vertical-align: top;
          }
          .shareLeaders .tblMini th {
            text-align: left;
            font-size: 12px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.06em;
            white-space: nowrap;
          }
          .shareLeaders .tblMini th.num {
            text-align: right;
          }
          .shareLeaders .num {
            text-align: right;
            white-space: nowrap;
            font-weight: 800;
          }

          /* Allow long sponsor names to wrap instead of widening the table */
          .shareLeaders .tblShareLeaders td:nth-child(2) {
            white-space: normal;
            word-break: break-word;
          }

          .shareLeaders .slNameCell {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 0;
          }

          .shareLeaders .slMiniBar {
            height: 9px;
            background: rgba(15, 23, 42, 0.08);
            border-radius: 999px;
            overflow: hidden;
          }
          .shareLeaders .slMiniBarFill {
            height: 100%;
            background: rgba(79, 70, 229, 0.65);
          }

          .shareLeaders .slFoot {
            margin-top: 12px;
            font-size: 12px;
          }
        `}</style>
      </div>
    </>
  );
}
