import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { loadIndex, loadMeta } from "@/lib/data";
import { DatasetMeta, TrialIndexRow, SortKey, UrlState } from "@/lib/types";
import { decodeState, encodeState } from "@/lib/urlState";
import { computeFacets } from "@/lib/facets";
import { filterRows, sortRows } from "@/lib/filtering";

import ResultsGrid from "@/components/ResultsGrid";
import ResultsList from "@/components/ResultsList";
import DetailsDrawer from "@/components/DetailsDrawer";
import CompareModal from "@/components/CompareModal";
import DownloadMenu from "@/components/DownloadMenu";
import { Facet, ScientificFailureToggle } from "@/components/FacetRail";

function uniq(arr: string[]) {
  return Array.from(new Set(arr)).filter(Boolean);
}

export default function ExplorePage() {
  const router = useRouter();

  // URL-driven state (shareable), but we avoid event-bubbling issues via stopPropagation in components.
  const state: UrlState = useMemo(() => decodeState(router.asPath), [router.asPath]);

  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [allRows, setAllRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Local search input; we only write to URL on change.
  const [qInput, setQInput] = useState(state.q || "");
  useEffect(() => setQInput(state.q || ""), [state.q]);

  // Load dataset once
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

  function updateState(patch: Partial<UrlState>) {
    const next: UrlState = { ...state, ...patch };

    // normalize
    next.status = next.status ? uniq(next.status) : undefined;
    next.phase = next.phase ? uniq(next.phase) : undefined;
    next.area = next.area ? uniq(next.area) : undefined;
    next.bucket = next.bucket ? uniq(next.bucket) : undefined;
    next.compare = next.compare ? uniq(next.compare) : undefined;

    // remove empties
    (["status", "phase", "area", "bucket", "compare"] as const).forEach((k) => {
      const v = (next as any)[k];
      if (Array.isArray(v) && v.length === 0) (next as any)[k] = undefined;
    });

    if (!next.q) next.q = undefined;

    router.replace(`/explore${encodeState(next)}`, undefined, { shallow: true });
  }

  function toggleMulti(key: keyof UrlState, value: string) {
    const current = new Set(((state as any)[key] as string[] | undefined) || []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    updateState({ [key]: Array.from(current) } as any);
  }

  function toggleCompare(id: string) {
    const s = new Set(state.compare || []);
    if (s.has(id)) s.delete(id);
    else {
      if (s.size >= 5) return;
      s.add(id);
    }
    updateState({ compare: Array.from(s) });
  }

  function resetAll() {
    updateState({
      q: undefined,
      status: undefined,
      phase: undefined,
      area: undefined,
      bucket: undefined,
      bio: undefined,
      date_from: undefined,
      date_to: undefined,
      sort: "date_desc",
      trial: undefined,
      compare: undefined
    });
  }

  function copyLink() {
    const url = `${window.location.origin}/explore${encodeState(state)}`;
    navigator.clipboard.writeText(url);
  }

  // write q to URL with debounce
  useEffect(() => {
    const t = setTimeout(() => {
      const cur = (state.q || "").trim();
      const nxt = (qInput || "").trim();
      if (cur !== nxt) updateState({ q: nxt || undefined });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const fromHref = useMemo(() => `/explore${encodeState(state)}`, [state]);

  return (
    <>
      <Head>
        <title>Clinical trial failures</title>
      </Head>

      <div className="min-h-screen">
        {/* Top bar — keep same layout */}
        <header className="topbar">
          <div className="topbar-inner">
            <div className="topbar-left">
              <Link href="/explore" className="brand">
                Clinical trial failures
              </Link>
              <nav className="nav">
                <Link className="navlink" href="/explore">
                  Explore
                </Link>
                <Link className="navlink" href="/methods">
                  Methods
                </Link>
              </nav>
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
              <button className="btn" onClick={copyLink} type="button">
                Copy link
              </button>
              <DownloadMenu meta={meta} state={state} allRows={allRows} filteredRows={rows} selectedRows={compareRows} />
              <button className="btn" onClick={resetAll} type="button">
                Reset
              </button>
            </div>
          </div>
        </header>

        <main className="page">
          {/* Layout matches screenshot: left rail + center table */}
          <div className="layout">
            {/* LEFT FILTER RAIL — NOW SCROLLABLE */}
            <aside className="rail">
              <div className="rail-scroll">
                <ScientificFailureToggle
                  checked={!!state.bio}
                  onChange={(v) => updateState({ bio: v || undefined })}
                />

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

            {/* CENTER RESULTS */}
            <section className="content">
              <div className="card pad-16">
                <div className="results-header">
                  <div className="results-count">
                    <span className="count">{rows.length.toLocaleString()}</span> results
                  </div>

                  <div className="results-controls">
                    <label className="muted">Sort</label>
                    <select
                      className="input select"
                      value={sortKey}
                      onChange={(e) => updateState({ sort: e.target.value as SortKey })}
                    >
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

                <div className="below-actions">
                  <button
                    className="btn"
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    disabled={(state.compare || []).length < 2}
                  >
                    Compare ({(state.compare || []).length})
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>

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
            const s = new Set(state.compare || []);
            s.delete(id);
            updateState({ compare: Array.from(s) });
          }}
        />
      </div>
    </>
  );
}
