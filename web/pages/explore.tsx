import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";

import { loadIndex, loadMeta } from "@/lib/data";
import { TrialIndexRow, UrlState, DatasetMeta, SortKey } from "@/lib/types";
import { decodeState, encodeState } from "@/lib/urlState";
import { filterRows, sortRows } from "@/lib/filtering";
import { computeFacets } from "@/lib/facets";

import ResultsGrid from "@/components/ResultsGrid";
import ResultsList from "@/components/ResultsList";
import DetailsDrawer from "@/components/DetailsDrawer";
import CompareModal from "@/components/CompareModal";
import DownloadMenu from "@/components/DownloadMenu";
import { Facet, ScientificFailureToggle } from "@/components/FacetRail";
import { buildShareUrl, buildCitation } from "@/lib/exporting";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function clampArray(a?: string[]) {
  return (a || []).filter(Boolean);
}

export default function ExplorePage() {
  const router = useRouter();
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [allRows, setAllRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // URL-driven state
  const stateFromUrl = useMemo<UrlState>(() => decodeState(router.asPath), [router.asPath]);
  const [state, setState] = useState<UrlState>(stateFromUrl);
  useEffect(() => setState(stateFromUrl), [stateFromUrl]);

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

  const [qInput, setQInput] = useState(state.q || "");
  useEffect(() => setQInput(state.q || ""), [state.q]);
  const qDebounced = useDebounced(qInput, 250);

  useEffect(() => {
    if ((state.q || "") === qDebounced) return;
    updateState({ q: qDebounced || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced]);

  const facets = useMemo(() => computeFacets(allRows), [allRows]);
  const filtered = useMemo(() => filterRows(allRows, state), [allRows, state]);
  const sortKey: SortKey = (state.sort || "date_desc") as SortKey;
  const rows = useMemo(() => sortRows(filtered, sortKey), [filtered, sortKey]);

  const railOpen = state.rail ?? true;

  function updateState(patch: Partial<UrlState>) {
    const next: UrlState = {
      ...state,
      ...patch,
      status: clampArray(patch.status ?? state.status),
      phase: clampArray(patch.phase ?? state.phase),
      area: clampArray(patch.area ?? state.area),
      bucket: clampArray(patch.bucket ?? state.bucket),
      compare: clampArray(patch.compare ?? state.compare)
    };

    (["status", "phase", "area", "bucket", "compare"] as const).forEach((k) => {
      const v = (next as any)[k];
      if (Array.isArray(v) && v.length === 0) (next as any)[k] = undefined;
    });

    if (!next.q) next.q = undefined;

    setState(next);
    const qs = encodeState(next);
    router.replace(`/explore${qs}`, undefined, { shallow: true });
  }

  function toggleMulti(key: keyof UrlState, value: string) {
    const arr = new Set(((state as any)[key] as string[] | undefined) || []);
    if (arr.has(value)) arr.delete(value);
    else arr.add(value);
    updateState({ [key]: Array.from(arr) } as any);
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
      compare: undefined,
      rail: true
    });
  }

  function copyLink() {
    const url = buildShareUrl(state, window.location.origin, "/explore");
    navigator.clipboard.writeText(url);
  }

  function citeView() {
    const url = buildShareUrl(state, window.location.origin, "/explore");
    const txt = buildCitation(meta, state, url);
    navigator.clipboard.writeText(txt);
  }

  const compareIds = state.compare || [];
  const compareRows = useMemo(() => {
    const set = new Set(compareIds);
    return allRows.filter((r) => set.has(r.nct_id));
  }, [allRows, compareIds]);

  const [compareOpen, setCompareOpen] = useState(false);

  const fromHref = useMemo(() => `/explore${encodeState(state)}`, [state]);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;

  return (
    <>
      <Head>
        <title>Clinical trial failures</title>
      </Head>

      <div className="min-h-screen">
        <header className="sticky top-0 z-30 border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-3">
            <Link href="/explore" className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Clinical trial failures
            </Link>

            <nav className="ml-2 hidden sm:flex items-center gap-3 text-sm">
              <Link href="/explore" className="text-[var(--text-muted)] hover:text-[var(--text)]">Explore</Link>
              <Link href="/methods" className="text-[var(--text-muted)] hover:text-[var(--text)]">Methods</Link>
            </nav>

            <div className="flex-1" />

            <div className="hidden md:block w-[420px]">
              <input
                className="input"
                placeholder="Search trials, sponsors, drugs, indications…"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                aria-label="Search"
              />
            </div>

            <div className="flex items-center gap-2">
              <button className="btn md:hidden" onClick={() => updateState({ rail: !(state.rail ?? true) })} type="button">
                Filters
              </button>

              <button className="btn" onClick={copyLink} type="button">Copy link</button>

              <DownloadMenu
                meta={meta}
                state={state}
                allRows={allRows}
                filteredRows={rows}
                selectedRows={compareRows}
              />

              <button className="btn" onClick={resetAll} type="button">Reset</button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-4 pt-8 pb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            Clinical trial failures
          </h1>
          <p className="mt-2 text-sm sm:text-base" style={{ color: "var(--text-muted)" }}>
            Browse stopped trials and the recorded stop reasons. Use filters to quickly narrow to the subset you care about.
          </p>
          <p className="mt-2 text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
            Labels are inferred from registry text and may be incomplete. Verify using primary sources.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="chip">
              Dataset: <span className="font-semibold">{meta?.version || "…"}</span>
            </span>

            <button className="btn" type="button" onClick={() => updateState({ rail: !railOpen })}>
              {railOpen ? "Hide filters" : "Show filters"}
            </button>

            <button
              className="btn"
              type="button"
              onClick={() => setCompareOpen(true)}
              disabled={(state.compare || []).length < 2}
              aria-disabled={(state.compare || []).length < 2}
            >
              Compare ({(state.compare || []).length})
            </button>

            <button className="btn" type="button" onClick={citeView}>
              Cite this view
            </button>
          </div>

          <div className="md:hidden mt-4">
            <input
              className="input"
              placeholder="Search trials, sponsors, drugs, indications…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              aria-label="Search"
            />
          </div>
        </div>

        <main className="mx-auto max-w-[1400px] px-4 pb-10">
          <div className="grid grid-cols-12 gap-4">
            <aside className={["col-span-12 lg:col-span-3", railOpen ? "" : "hidden lg:block"].join(" ")}>
              <div className="sticky top-[72px] space-y-4">
                <ScientificFailureToggle
                  checked={!!state.bio}
                  onChange={(v) => updateState({ bio: v || undefined })}
                  onInfo={() =>
                    alert(
                      "Likely scientific failure means the stop reason suggests the intervention did not work as intended (e.g., lack of efficacy/futility). This is inferred from registry text and may be incomplete."
                    )
                  }
                />

                <Facet
                  title="Status"
                  options={facets.status}
                  selected={state.status || []}
                  onToggle={(v) => toggleMulti("status", v)}
                  maxVisible={8}
                />

                <Facet
                  title="Phase"
                  options={facets.phase}
                  selected={state.phase || []}
                  onToggle={(v) => toggleMulti("phase", v)}
                  maxVisible={10}
                />

                <Facet
                  title="Disease area (Top 10)"
                  options={facets.area.slice(0, 10)}
                  selected={state.area || []}
                  onToggle={(v) => toggleMulti("area", v)}
                  searchable
                  maxVisible={10}
                />

                <Facet
                  title="Reason bucket"
                  options={facets.bucket}
                  selected={state.bucket || []}
                  onToggle={(v) => toggleMulti("bucket", v)}
                  maxVisible={8}
                />
              </div>
            </aside>

            <section className={railOpen ? "col-span-12 lg:col-span-9" : "col-span-12"}>
              <div className="card">
                <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                      <span className="font-semibold" style={{ color: "var(--text)" }}>
                        {rows.length.toLocaleString()}
                      </span>{" "}
                      results
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm" style={{ color: "var(--text-muted)" }}>
                        Sort
                      </label>
                      <select
                        className="input !w-[190px]"
                        value={sortKey}
                        onChange={(e) => updateState({ sort: e.target.value as SortKey })}
                        aria-label="Sort"
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

                  {err && <div className="mt-3 text-sm text-rose-700">{err}</div>}
                  {loading && <div className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>Loading dataset…</div>}
                </div>

                <div className="p-2 sm:p-3">
                  <div className="hidden lg:block">
                    <ResultsGrid
                      rows={rows}
                      selectedIds={state.compare || []}
                      onToggleSelect={(id) => {
                        const s = new Set(state.compare || []);
                        if (s.has(id)) s.delete(id);
                        else {
                          if (s.size >= 5) return;
                          s.add(id);
                        }
                        updateState({ compare: Array.from(s) });
                      }}
                      onOpenPanel={(id) => updateState({ trial: id })}
                      fromHref={fromHref}
                    />
                  </div>

                  <div className="lg:hidden">
                    <ResultsList
                      rows={rows}
                      selectedIds={state.compare || []}
                      onToggleSelect={(id) => {
                        const s = new Set(state.compare || []);
                        if (s.has(id)) s.delete(id);
                        else {
                          if (s.size >= 5) return;
                          s.add(id);
                        }
                        updateState({ compare: Array.from(s) });
                      }}
                      onOpenPanel={(id) => updateState({ trial: id })}
                      fromHref={fromHref}
                    />
                  </div>
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
