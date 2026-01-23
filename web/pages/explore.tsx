import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";

import { loadDatasetClient } from "@/lib/data";
import { buildCitation, buildViewTitle, exportCSV, exportJSON } from "@/lib/export";
import { decodeState, encodeState } from "@/lib/urlState";
import { applyFilters, computeFacets, sortRows } from "@/lib/workbench";
import { DatasetMeta, TrialRow, WorkbenchState } from "@/lib/types";

import { TopBar } from "@/components/TopBar";
import { FacetRail } from "@/components/FacetRail";
import { QuerySummaryBar } from "@/components/QuerySummaryBar";
import { ResultsGrid } from "@/components/ResultsGrid";
import { TrialDrawer } from "@/components/TrialDrawer";

function toArray(v?: string[]) { return v || []; }

function clampCompare(ids: string[]) {
  const uniq = Array.from(new Set(ids)).filter(Boolean);
  return uniq.slice(0, 5);
}

export default function Explore() {
  const router = useRouter();
  const pathname = "/explore";

  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [rows, setRows] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Local UI state driven by URL
  const state = useMemo<WorkbenchState>(() => decodeState(router.query), [router.query]);

  // Load dataset based on bio facet
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const mode = state.bio ? "bio" : "all";
        const { meta, trials } = await loadDatasetClient(mode);
        if (!alive) return;
        setMeta(meta);
        setRows(trials);
        setErr(null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load dataset.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [state.bio]);

  const filtered = useMemo(() => {
    const f = applyFilters(rows, state);
    return sortRows(f, state.sort);
  }, [rows, state]);

  const facets = useMemo(() => computeFacets(rows), [rows]);

  const selected = useMemo(() => ({
    phase: toArray(state.phase),
    status: toArray(state.status),
    area: toArray(state.area),
    country: toArray(state.country),
    reason: toArray(state.reason as any),
    condition: toArray(state.condition),
    intervention: toArray(state.intervention),
    sponsor: toArray(state.sponsor),
  }), [state]);

  const selectedIds = useMemo(() => new Set(toArray(state.compare)), [state.compare]);

  const updateURL = (patch: Partial<WorkbenchState>, replace = true) => {
    const next: WorkbenchState = {
      ...state,
      ...patch,
    };

    // cleanup
    if (patch.compare) next.compare = clampCompare(patch.compare);
    const q = encodeState(next);
    const method = replace ? router.replace : router.push;
    method({ pathname, query: q }, undefined, { shallow: true });
  };

  const copyLink = async () => {
    const url = window.location.href;
    await navigator.clipboard.writeText(url);
  };

  const openExport = () => {
    if (!meta) return;
    const title = buildViewTitle(state);
    // default export = current filtered results as CSV + JSON buttons via prompt
    // Minimal UI: immediate download CSV + JSON
    exportCSV(meta, state, filtered, pathname, title);
  };

  const openCite = async () => {
    if (!meta) return;
    const cite = buildCitation(meta, state, pathname);
    await navigator.clipboard.writeText(cite);
    alert("Citation copied to clipboard.");
  };

  const resetAll = () => {
    router.replace({ pathname, query: {} }, undefined, { shallow: true });
  };

  const removeChip = (patch: Partial<WorkbenchState>) => {
    // Also close drawer if it becomes inconsistent (e.g., reset all)
    updateURL(patch, true);
  };

  const onFacetChange = (nextSelected: typeof selected) => {
    updateURL({
      phase: nextSelected.phase,
      status: nextSelected.status,
      area: nextSelected.area,
      country: nextSelected.country,
      reason: nextSelected.reason as any,
      condition: nextSelected.condition,
      intervention: nextSelected.intervention,
      sponsor: nextSelected.sponsor,
    });
  };

  const setBio = (v: boolean) => updateURL({ bio: v ? true : undefined, trial: undefined }, true);

  const setDateFrom = (v: string) => updateURL({ date_from: v || undefined }, true);
  const setDateTo = (v: string) => updateURL({ date_to: v || undefined }, true);

  const openTrial = (id: string) => updateURL({ trial: id }, true);
  const closeTrial = () => updateURL({ trial: undefined }, true);

  const toggleSelect = (id: string) => {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id);
    else s.add(id);

    updateURL({ compare: clampCompare(Array.from(s)) }, true);
  };

  const addCompare = (id: string) => {
    const s = new Set(selectedIds);
    s.add(id);
    updateURL({ compare: clampCompare(Array.from(s)) }, true);
  };

  const compareCount = selectedIds.size;

  const goCompare = () => {
    const q = encodeState({ ...state, compare: Array.from(selectedIds) });
    router.push({ pathname: "/compare", query: q }, undefined, { shallow: true });
  };

  // Export menu (simple): CSV + JSON (both include metadata)
  const exportJSONNow = () => {
    if (!meta) return;
    const title = buildViewTitle(state);
    exportJSON(meta, state, filtered, pathname, title);
  };

  const exportCSVNow = () => {
    if (!meta) return;
    const title = buildViewTitle(state);
    exportCSV(meta, state, filtered, pathname, title);
  };

  const exportSelected = (fmt: "csv" | "json") => {
    if (!meta) return;
    const ids = Array.from(selectedIds);
    const recs = filtered.filter((r) => ids.includes(r.nct_id));
    const title = `Selected trials — ${buildViewTitle(state)}`;
    if (fmt === "csv") exportCSV(meta, state, recs, pathname, title);
    else exportJSON(meta, state, recs, pathname, title);
  };

  return (
    <>
      <Head>
        <title>Clinical trial failures</title>
      </Head>

      <TopBar
        q={state.q || ""}
        setQ={(v) => updateURL({ q: v || undefined }, true)}
        onCopyLink={copyLink}
        onExport={exportCSVNow}
        onCite={openCite}
        onReset={resetAll}
      />

      <main className="mx-auto grid max-w-7xl grid-cols-12 gap-4 px-4 py-4">
        {/* Left rail */}
        <div className="col-span-12 lg:col-span-3">
          {loading ? (
            <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-gray-700">Loading filters…</div>
          ) : err ? (
            <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm text-sm text-red-700">{err}</div>
          ) : (
            <FacetRail
              facets={facets}
              selected={selected}
              onSelectedChange={onFacetChange}
              bio={!!state.bio}
              setBio={setBio}
              dateFrom={state.date_from || ""}
              dateTo={state.date_to || ""}
              setDateFrom={setDateFrom}
              setDateTo={setDateTo}
            />
          )}
        </div>

        {/* Center results */}
        <div className="col-span-12 lg:col-span-6 space-y-3">
          <div className="rounded-2xl border bg-white p-4 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">Clinical trial failures</h1>
            <p className="mt-1 text-sm text-gray-600">
              Browse trials that were suspended, withdrawn, or terminated.
              Use filters to narrow down what was recorded as the reason.
            </p>
            {meta ? (
              <div className="mt-2 text-xs text-gray-500">
                Dataset updated {meta.generated_at_utc} • Version {meta.version}
              </div>
            ) : null}
          </div>

          <QuerySummaryBar
            state={state}
            resultCount={filtered.length}
            onRemove={removeChip}
            onCopyLink={copyLink}
            onExport={() => {
              // lightweight export chooser
              const choice = window.prompt("Export format: type 'csv' or 'json' (current filtered results)");
              if (choice?.toLowerCase() === "json") exportJSONNow();
              else exportCSVNow();
            }}
            onCite={openCite}
            onReset={resetAll}
            sort={state.sort || "date_desc"}
            setSort={(v) => updateURL({ sort: v as any }, true)}
          />

          {/* Compare CTA */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-gray-600">
              Select 2–5 trials to compare. Press <span className="font-mono">Space</span> on a focused row to select.
            </div>
            <div className="flex items-center gap-2">
              {compareCount > 0 && (
                <button
                  className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                  onClick={() => updateURL({ compare: [] }, true)}
                  type="button"
                >
                  Clear selection ({compareCount})
                </button>
              )}
              <button
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  compareCount >= 2 ? "bg-gray-900 text-white hover:bg-gray-800" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
                onClick={compareCount >= 2 ? goCompare : undefined}
                type="button"
                aria-disabled={compareCount < 2}
              >
                Compare ({compareCount})
              </button>

              <button
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                onClick={() => exportSelected("csv")}
                type="button"
                disabled={compareCount === 0}
              >
                Export selected
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-gray-700">Loading results…</div>
          ) : err ? (
            <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm text-sm text-red-700">
              {err}{" "}
              <button className="ml-2 underline" onClick={() => router.replace(router.asPath)} type="button">
                Retry
              </button>
            </div>
          ) : (
            <ResultsGrid
              rows={filtered}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onOpen={openTrial}
              focusedId={focusedId}
              setFocusedId={setFocusedId}
            />
          )}
        </div>

        {/* Right drawer */}
        <div className="col-span-12 lg:col-span-3">
          {meta ? (
            <TrialDrawer
              meta={meta}
              rows={rows}
              trialId={state.trial || null}
              onClose={closeTrial}
              onAddCompare={addCompare}
            />
          ) : (
            <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-gray-700">
              Select a trial to view details.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
