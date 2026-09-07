// web/pages/explore.tsx

import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

import { loadIndex, loadMeta } from "@/lib/data";
import { DatasetMeta, TrialIndexRow, SortKey, UrlState } from "@/lib/types";
import { decodeState, encodeState, resetExploreState } from "@/lib/urlState";
import { computeFacets } from "@/lib/facets";
import { filterRows, sortRows } from "@/lib/filtering";

import ResultsGrid from "@/components/ResultsGrid";
import ResultsList from "@/components/ResultsList";
import DetailsDrawer from "@/components/DetailsDrawer";
import CompareModal from "@/components/CompareModal";
import DownloadMenu from "@/components/DownloadMenu";
import { Facet, ScientificFailureToggle } from "@/components/FacetRail";
import PrimaryNav from "@/components/PrimaryNav";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

const TITLE = "Explore clinical trial failures | Search stopped clinical trials";
const DESCRIPTION =
  "Search, filter, compare, and export terminated, suspended, and withdrawn clinical trials by sponsor, phase, disease area, intervention, and stop reason.";
const SITE_URL = "https://clinicaltrialfailures.com";
const CANONICAL_URL = `${SITE_URL}/explore`;
const OG_IMAGE = `${SITE_URL}/og-image.png`;

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).filter(Boolean);
}

type ExplorePageProps = {
  initialMeta: DatasetMeta | null;
  initialRows: TrialIndexRow[];
  initialTotal: number;
};

export default function ExplorePage({ initialMeta, initialRows, initialTotal }: ExplorePageProps) {
  const router = useRouter();
  const [urlStateReady, setUrlStateReady] = useState(false);

  useEffect(() => {
    if (router.isReady) setUrlStateReady(true);
  }, [router.isReady]);

  const state: UrlState = useMemo(
    () => (urlStateReady ? decodeState(router.asPath) : { sort: "date_desc" }),
    [router.asPath, urlStateReady]
  );

  const [meta, setMeta] = useState<DatasetMeta | null>(initialMeta);
  const [allRows, setAllRows] = useState<TrialIndexRow[]>(initialRows);
  const [loading, setLoading] = useState(initialRows.length === 0);
  const [err, setErr] = useState<string | null>(null);

  const [qInput, setQInput] = useState(state.q || "");
  useEffect(() => setQInput(state.q || ""), [state.q]);

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

  const facets = useMemo(() => computeFacets(allRows), [allRows]);

  const filtered = useMemo(() => filterRows(allRows, state), [allRows, state]);
  const sortKey: SortKey = (state.sort || "date_desc") as SortKey;
  const rows = useMemo(() => sortRows(filtered, sortKey), [filtered, sortKey]);

  const compareIds = state.compare || [];
  const compareRows = useMemo(() => {
    const set = new Set(compareIds);
    return allRows.filter((r) => set.has(r.nct_id));
  }, [allRows, compareIds]);

  const [compareOpen, setCompareOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const didHandleInitialCompare = useRef(false);
  const filterDialogRef = useDialogBehavior(filtersOpen, () => setFiltersOpen(false));

  useEffect(() => {
    if (!urlStateReady || didHandleInitialCompare.current) return;
    didHandleInitialCompare.current = true;
    const initialCompare = decodeState(router.asPath).compare || [];
    const rawCompare = new URL(router.asPath, "http://localhost").searchParams
      .get("compare")
      ?.split(",")
      .filter(Boolean) || [];
    if (rawCompare.length > 5) {
      const normalized = decodeState(router.asPath);
      void router.replace(`/explore${encodeState(normalized)}`, undefined, { shallow: true });
    }
    if (initialCompare.length >= 2) setCompareOpen(true);
  }, [urlStateReady]);

  function updateState(patch: Partial<UrlState>) {
    const base: UrlState = decodeState(router.asPath);
    const next: UrlState = { ...base, ...patch };

    next.status = next.status ? uniq(next.status) : undefined;
    next.phase = next.phase ? uniq(next.phase) : undefined;
    next.area = next.area ? uniq(next.area) : undefined;
    next.bucket = next.bucket ? uniq(next.bucket) : undefined;
    next.compare = next.compare ? uniq(next.compare) : undefined;

    (["status", "phase", "area", "bucket", "compare"] as const).forEach((k) => {
      const v = (next as any)[k];
      if (Array.isArray(v) && v.length === 0) (next as any)[k] = undefined;
    });

    if (!next.q) next.q = undefined;

    router.replace(`/explore${encodeState(next)}`, undefined, { shallow: true });
  }

  function toggleMulti(key: keyof UrlState, value: string) {
    const base: UrlState = decodeState(router.asPath);
    const current = new Set(((base as any)[key] as string[] | undefined) || []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    updateState({ [key]: Array.from(current) } as any);
  }

  function toggleCompare(id: string) {
    const base: UrlState = decodeState(router.asPath);
    const s = new Set(base.compare || []);
    if (s.has(id)) s.delete(id);
    else {
      if (s.size >= 5) return;
      s.add(id);
    }
    updateState({ compare: Array.from(s) });
  }

  function resetAll() {
    updateState(resetExploreState(decodeState(router.asPath)));
  }

  function copyLink() {
    const url = `${window.location.origin}/explore${encodeState(decodeState(router.asPath))}`;
    navigator.clipboard.writeText(url);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      const base = decodeState(router.asPath);
      const cur = (base.q || "").trim();
      const nxt = (qInput || "").trim();
      if (cur !== nxt) updateState({ q: nxt || undefined });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput, router.asPath]);

  const fromHref = useMemo(() => `/explore${encodeState(state)}`, [state]);
  const compareCount = (state.compare || []).length;
  const hasActiveFilters = !!(
    state.q ||
    state.status?.length ||
    state.phase?.length ||
    state.area?.length ||
    state.bucket?.length ||
    state.sponsor?.length ||
    state.intervention?.length ||
    state.condition?.length ||
    state.country?.length ||
    state.bio ||
    state.date_from ||
    state.date_to
  );
  const displayedCount = allRows.length === initialRows.length && !hasActiveFilters ? initialTotal : rows.length;

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

      <div className="min-h-screen">
        <header className="topbar topbar-explore">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/" className="brand">
                Clinical trial failures
              </Link>
              <PrimaryNav active="explore" />
            </div>

            <div className="topbar-center">
              <input
                className="input"
                placeholder="Search trials, sponsors, drugs, indications…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                aria-label="Search"
              />
            </div>

            <div className="topbar-right">
              <button className="btn mobile-only-inline" type="button" onClick={() => setFiltersOpen(true)}>
                Filters
              </button>

              <button className="btn" onClick={copyLink} type="button">
                Copy link
              </button>

              <button className="btn" type="button" onClick={() => setCompareOpen(true)}>
                Compare ({compareCount})
              </button>

              {compareCount === 5 ? (
                <span className="muted" role="status" style={{ fontSize: 12, fontWeight: 750 }}>
                  Maximum 5 selected
                </span>
              ) : null}

              <DownloadMenu meta={meta} state={state} allRows={allRows} filteredRows={rows} selectedRows={compareRows} />

              <button className="btn" onClick={resetAll} type="button">
                Reset
              </button>
            </div>
          </div>
        </header>

        <main className="page">
          <div className="layout">
            <aside className="rail">
              <div className="rail-scroll">
                <ScientificFailureToggle checked={!!state.bio} onChange={(v) => updateState({ bio: v || undefined })} />

                <Facet title="Status" options={facets.status} selected={state.status || []} onToggle={(v) => toggleMulti("status", v)} />
                <Facet title="Phase" options={facets.phase} selected={state.phase || []} onToggle={(v) => toggleMulti("phase", v)} />

                <Facet
                  title="Disease area (Top 10)"
                  options={facets.area.slice(0, 10)}
                  selected={state.area || []}
                  onToggle={(v) => toggleMulti("area", v)}
                  searchable
                />

                <Facet title="Reason bucket" options={facets.bucket} selected={state.bucket || []} onToggle={(v) => toggleMulti("bucket", v)} />
              </div>
            </aside>

            <section className="content">
              <div className="card pad-16">
                <div style={{ marginBottom: 12 }}>
                  <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.15 }}>
                    Explore terminated, suspended, and withdrawn clinical trials
                  </h1>
                  <p className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45 }}>
                    Search the ClinicalTrials.gov-derived stopped-trial dataset by sponsor, phase, disease area,
                    intervention, status, and classified stop reason.
                  </p>
                </div>
                <div className="results-header">
                  <div className="results-count">
                    <span className="count">{displayedCount.toLocaleString()}</span> results
                  </div>

                  <div className="results-controls">
                    <label className="muted">Sort</label>
                    <select className="input select" value={sortKey} onChange={(e) => updateState({ sort: e.target.value as SortKey })}>
                      <option value="date_desc">Date (newest)</option>
                      <option value="date_asc">Date (oldest)</option>
                      <option value="sponsor_asc">Sponsor (A–Z)</option>
                      <option value="sponsor_desc">Sponsor (Z–A)</option>
                      <option value="confidence_desc">Confidence (high–low)</option>
                      <option value="confidence_asc">Confidence (low–high)</option>
                    </select>
                  </div>
                </div>

                {err && <div className="error">{err}</div>}
                {loading && <div className="muted">Loading dataset…</div>}

                {!loading && !err && rows.length === 0 ? (
                  <div className="card p-4" role="status" style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>No matching trials</div>
                    <p className="muted" style={{ margin: "8px auto 14px", maxWidth: 520, lineHeight: 1.5 }}>
                      Try a broader search or remove one or more filters.
                    </p>
                    <button className="btn" type="button" onClick={resetAll}>
                      Clear search and filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="table-wrap desktop-only">
                      <ResultsGrid
                        rows={rows}
                        selectedIds={state.compare || []}
                        onToggleSelect={toggleCompare}
                        onOpenPanel={(id) => updateState({ trial: id })}
                        fromHref={fromHref}
                      />
                    </div>

                    <div className="mobile-only">
                      <ResultsList
                        rows={rows}
                        selectedIds={state.compare || []}
                        onToggleSelect={toggleCompare}
                        onOpenPanel={(id) => updateState({ trial: id })}
                        fromHref={fromHref}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </main>

        {/* Mobile filters drawer (same content as left rail) */}
        {filtersOpen && (
          <div
            ref={filterDialogRef}
            className="drawer-wrap"
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            tabIndex={-1}
          >
            <div className="overlay" onClick={() => setFiltersOpen(false)} />
            <div className="drawer-panel drawer-panel-left">
              <div className="drawer-hd">
                <div style={{ minWidth: 0 }}>
                  <div className="muted" style={{ fontSize: 12 }}>Filters</div>
                  <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>Refine results</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                    <span style={{ fontWeight: 800 }}>{rows.length.toLocaleString()}</span> results
                  </div>
                </div>

                <button className="btn" type="button" onClick={() => setFiltersOpen(false)}>
                  Close
                </button>
              </div>

              <div className="drawer-bd">
                <ScientificFailureToggle checked={!!state.bio} onChange={(v) => updateState({ bio: v || undefined })} />

                <div style={{ height: 12 }} />
                <Facet title="Status" options={facets.status} selected={state.status || []} onToggle={(v) => toggleMulti("status", v)} />

                <div style={{ height: 12 }} />
                <Facet title="Phase" options={facets.phase} selected={state.phase || []} onToggle={(v) => toggleMulti("phase", v)} />

                <div style={{ height: 12 }} />
                <Facet
                  title="Disease area (Top 10)"
                  options={facets.area.slice(0, 10)}
                  selected={state.area || []}
                  onToggle={(v) => toggleMulti("area", v)}
                  searchable
                />

                <div style={{ height: 12 }} />
                <Facet title="Reason bucket" options={facets.bucket} selected={state.bucket || []} onToggle={(v) => toggleMulti("bucket", v)} />

                <div style={{ height: 12 }} />
                <button className="btn" type="button" onClick={resetAll} style={{ width: "100%" }}>
                  Reset filters
                </button>
              </div>
            </div>
          </div>
        )}

        <DetailsDrawer
          open={!!state.trial}
          trialId={state.trial || null}
          onClose={() => updateState({ trial: undefined })}
          meta={meta}
          fromHref={fromHref}
        />

        <CompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          trials={compareRows}
          onRemove={(id) => {
            const base = decodeState(router.asPath);
            const s = new Set(base.compare || []);
            s.delete(id);
            updateState({ compare: Array.from(s) });
          }}
        />
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<ExplorePageProps> = async () => {
  const { loadMetaServer, loadIndexServer } = await import("@/lib/server-data");
  const { sortRows } = await import("@/lib/filtering");
  const [meta, rows] = await Promise.all([loadMetaServer(), loadIndexServer()]);
  const initialRows = sortRows(rows, "date_desc").slice(0, 50);

  return {
    props: {
      initialMeta: meta,
      initialRows,
      initialTotal: rows.length,
    },
    revalidate: 24 * 60 * 60,
  };
};
