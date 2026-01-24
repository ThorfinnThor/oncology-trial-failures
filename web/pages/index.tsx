import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { loadDatasetClient } from "@/lib/data";
import { DatasetMeta, TrialRow, UrlState } from "@/lib/types";
import { parseUrlState, stateToQuery, buildShareUrl } from "@/lib/urlState";
import { buildFacets } from "@/lib/facets";
import { filterTrials, sortTrials } from "@/lib/filtering";
import { buildExportMetadata, downloadFile, exportCSV, exportJSON } from "@/lib/exporting";
import { citeThisView } from "@/lib/cite";
import { useMediaQuery } from "@/hooks/useMediaQuery";

import { TopBar } from "@/components/TopBar";
import { FacetRail } from "@/components/FacetRail";
import { QuerySummaryBar } from "@/components/QuerySummaryBar";
import { ResultsGrid } from "@/components/ResultsGrid";
import { DetailsDrawer } from "@/components/DetailsDrawer";
import { CompareModal } from "@/components/CompareModal";
import { Modal } from "@/components/Modal";
import { TableSkeleton } from "@/components/Skeleton";

import { MobileToolbar } from "@/components/MobileToolbar";
import { ResultsList } from "@/components/ResultsList";
import { Sheet } from "@/components/Sheet";

function clampCompare(ids: string[]) {
  const uniq = Array.from(new Set(ids));
  return uniq.slice(0, 5);
}

export default function Explore() {
  const router = useRouter();

  // breakpoints
  const isXL = useMediaQuery("(min-width: 1280px)");
  const isMobile = useMediaQuery("(max-width: 768px)");

  const [meta, setMeta] = useState<DatasetMeta | null>(null);

  const [bioTrials, setBioTrials] = useState<TrialRow[] | null>(null);
  const [allTrials, setAllTrials] = useState<TrialRow[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // UI sheets/modals
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsOpenMobile, setDetailsOpenMobile] = useState(false);

  const [compareOpen, setCompareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [citeOpen, setCiteOpen] = useState(false);
  const [citeText, setCiteText] = useState("");

  // URL state
  const state: UrlState = useMemo(() => parseUrlState(router.query), [router.query]);

  const needsAll = state.bio === false;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { meta, trials: bio } = await loadDatasetClient("bio");
        if (!alive) return;
        setMeta(meta);
        setBioTrials(bio);

        if (needsAll) {
          const { trials: all } = await loadDatasetClient("all");
          if (!alive) return;
          setAllTrials(all);
        }
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
  }, [needsAll]);

  const baseTrials = needsAll ? allTrials : bioTrials;

  const facets = useMemo(() => {
    if (!baseTrials) return null;
    return buildFacets(baseTrials);
  }, [baseTrials]);

  const filteredSorted = useMemo(() => {
    if (!baseTrials) return [];
    const filtered = filterTrials(baseTrials, state);
    return sortTrials(filtered, state.sort!);
  }, [baseTrials, state]);

  const openTrial = useMemo(() => {
    if (!state.trial || !baseTrials) return null;
    return baseTrials.find((t) => t.nct_id === state.trial) || null;
  }, [state.trial, baseTrials]);

  const compareIds = clampCompare(state.compare || []);
  const compareTrials = useMemo(() => {
    const src = baseTrials || [];
    return compareIds.map((id) => src.find((t) => t.nct_id === id)).filter(Boolean) as TrialRow[];
  }, [compareIds, baseTrials]);

  const setState = (next: UrlState) => {
    const query = stateToQuery(next);
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const openTrialById = (id: string) => {
    setState({ ...state, trial: id });
    if (!isXL) setDetailsOpenMobile(true);
  };

  const closeTrial = () => {
    setState({ ...state, trial: "" });
    setDetailsOpenMobile(false);
  };

  const setCompare = (ids: string[]) => setState({ ...state, compare: clampCompare(ids) });

  const onCopyLink = async () => {
    const url = buildShareUrl(window.location.href, state);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      prompt("Copy this link:", url);
    }
  };

  const onReset = () => {
    setState({
      q: "",
      bio: true,
      status: [],
      phase: [],
      area: [],
      bucket: [],
      sponsor: [],
      intervention: [],
      condition: [],
      date_from: "",
      date_to: "",
      sort: "date_desc",
      trial: "",
      compare: [],
      rail: true,
    });
  };

  const doExport = (format: "csv" | "json", scope: "filtered" | "page" | "compare") => {
    if (!meta) return;

    const pageSize = 50;
    const pageRecords = filteredSorted.slice(0, pageSize);

    const records =
      scope === "filtered" ? filteredSorted :
      scope === "page" ? pageRecords :
      compareTrials;

    const exportMeta = buildExportMetadata(meta.version, state, scope, records.length);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const fnameBase = `clinical_trial_failures_${yyyy}-${mm}-${dd}_${scope}`;

    if (format === "csv") {
      downloadFile(`${fnameBase}.csv`, exportCSV(records, exportMeta), "text/csv;charset=utf-8");
    } else {
      downloadFile(`${fnameBase}.json`, exportJSON(records, exportMeta), "application/json;charset=utf-8");
    }

    setExportOpen(false);
  };

  const onCite = () => {
    if (!meta) return;
    const text = citeThisView(meta, state, window.location.origin + router.pathname);
    setCiteText(text);
    setCiteOpen(true);
  };

  return (
    <>
      <Head>
        <title>Clinical trial failures</title>
      </Head>

      <TopBar
        q={state.q || ""}
        setQ={(v) => setState({ ...state, q: v })}
        onCopyLink={onCopyLink}
        onExport={() => setExportOpen(true)}
        onReset={onReset}
      />

      {/* Mobile/tablet toolbar */}
      {!isXL && !loading && !err && baseTrials && facets && (
        <MobileToolbar
          resultsCount={filteredSorted.length}
          compareCount={compareIds.length}
          onOpenFilters={() => setFiltersOpen(true)}
          onOpenExport={() => setExportOpen(true)}
          onOpenCompare={() => setCompareOpen(true)}
        />
      )}

      <main className="mx-auto max-w-[1600px] px-4 py-5">
        {loading && <TableSkeleton rows={10} />}

        {err && (
          <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 shadow-sm">
            {err}
            <div className="mt-2">
              <button
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                onClick={() => router.reload()}
                type="button"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !err && baseTrials && facets && (
          <>
            {/* Desktop: 3-pane */}
            {isXL ? (
              <div className="grid gap-4 xl:grid-cols-[320px_1fr_420px]">
                <FacetRail
                  status={facets.status}
                  phase={facets.phase}
                  area={facets.area}
                  bucket={facets.bucket}
                  sponsor={facets.sponsor}
                  intervention={facets.intervention}
                  condition={facets.condition}
                  uniqueCounts={facets.counts}
                  selStatus={state.status || []}
                  setSelStatus={(v) => setState({ ...state, status: v })}
                  selPhase={state.phase || []}
                  setSelPhase={(v) => setState({ ...state, phase: v })}
                  selArea={state.area || []}
                  setSelArea={(v) => setState({ ...state, area: v })}
                  selBucket={(state.bucket as unknown as string[]) || []}
                  setSelBucket={(v) => setState({ ...state, bucket: v as any })}
                  selSponsor={state.sponsor || []}
                  setSelSponsor={(v) => setState({ ...state, sponsor: v })}
                  selIntervention={state.intervention || []}
                  setSelIntervention={(v) => setState({ ...state, intervention: v })}
                  selCondition={state.condition || []}
                  setSelCondition={(v) => setState({ ...state, condition: v })}
                  bio={!!state.bio}
                  setBio={(v) => setState({ ...state, bio: v })}
                  dateFrom={state.date_from || ""}
                  setDateFrom={(v) => setState({ ...state, date_from: v })}
                  dateTo={state.date_to || ""}
                  setDateTo={(v) => setState({ ...state, date_to: v })}
                />

                <div className="space-y-4">
                  <QuerySummaryBar
                    state={state}
                    setState={setState}
                    resultsCount={filteredSorted.length}
                    sort={state.sort!}
                    setSort={(s) => setState({ ...state, sort: s })}
                    onCopyLink={onCopyLink}
                    onExport={() => setExportOpen(true)}
                    onReset={onReset}
                  />

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-600">
                      Dataset: <span className="font-semibold">{meta ? meta.version : "—"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                        onClick={() => setCompareOpen(true)}
                        disabled={compareIds.length < 2}
                        type="button"
                      >
                        Compare ({compareIds.length})
                      </button>

                      <button
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                        onClick={onCite}
                        type="button"
                      >
                        Cite this view
                      </button>
                    </div>
                  </div>

                  <ResultsGrid
                    rows={filteredSorted}
                    openTrialId={state.trial}
                    onOpen={openTrialById}
                    compare={compareIds}
                    setCompare={setCompare}
                  />
                </div>

                <DetailsDrawer
                  meta={meta}
                  allTrials={baseTrials}
                  trial={openTrial}
                  onClose={closeTrial}
                  compare={compareIds}
                  setCompare={setCompare}
                />
              </div>
            ) : (
              /* Mobile/tablet: list + sheets */
              <div className="space-y-4">
                <QuerySummaryBar
                  state={state}
                  setState={setState}
                  resultsCount={filteredSorted.length}
                  sort={state.sort!}
                  setSort={(s) => setState({ ...state, sort: s })}
                  onCopyLink={onCopyLink}
                  onExport={() => setExportOpen(true)}
                  onReset={onReset}
                />

                <ResultsList
                  rows={filteredSorted}
                  onOpen={openTrialById}
                  compare={compareIds}
                  setCompare={setCompare}
                />
              </div>
            )}
          </>
        )}

        {/* Filters sheet (mobile/tablet) */}
        <Sheet title="Filters" open={filtersOpen} onClose={() => setFiltersOpen(false)} side="left" widthClass="w-[360px]">
          {facets && (
            <FacetRail
              status={facets.status}
              phase={facets.phase}
              area={facets.area}
              bucket={facets.bucket}
              sponsor={facets.sponsor}
              intervention={facets.intervention}
              condition={facets.condition}
              uniqueCounts={facets.counts}
              selStatus={state.status || []}
              setSelStatus={(v) => setState({ ...state, status: v })}
              selPhase={state.phase || []}
              setSelPhase={(v) => setState({ ...state, phase: v })}
              selArea={state.area || []}
              setSelArea={(v) => setState({ ...state, area: v })}
              selBucket={(state.bucket as unknown as string[]) || []}
              setSelBucket={(v) => setState({ ...state, bucket: v as any })}
              selSponsor={state.sponsor || []}
              setSelSponsor={(v) => setState({ ...state, sponsor: v })}
              selIntervention={state.intervention || []}
              setSelIntervention={(v) => setState({ ...state, intervention: v })}
              selCondition={state.condition || []}
              setSelCondition={(v) => setState({ ...state, condition: v })}
              bio={!!state.bio}
              setBio={(v) => setState({ ...state, bio: v })}
              dateFrom={state.date_from || ""}
              setDateFrom={(v) => setState({ ...state, date_from: v })}
              dateTo={state.date_to || ""}
              setDateTo={(v) => setState({ ...state, date_to: v })}
            />
          )}
        </Sheet>

        {/* Details sheet (mobile/tablet) */}
        <Sheet
          title="Trial details"
          open={!isXL && detailsOpenMobile && !!openTrial}
          onClose={closeTrial}
          side="bottom"
        >
          <DetailsDrawer
            meta={meta}
            allTrials={baseTrials || []}
            trial={openTrial}
            onClose={closeTrial}
            compare={compareIds}
            setCompare={setCompare}
          />
        </Sheet>

        <CompareModal
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          trials={compareTrials}
          onRemove={(id) => setCompare(compareIds.filter((x) => x !== id))}
        />

        <Modal title="Export" open={exportOpen} onClose={() => setExportOpen(false)}>
          <div className="space-y-4">
            <div className="text-sm text-gray-700">
              Exports include metadata (timestamp, dataset version, filters, sort, and URL state).
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border p-3">
                <div className="text-sm font-semibold text-gray-900">Current filtered results</div>
                <div className="mt-2 flex flex-col gap-2">
                  <button className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => doExport("csv", "filtered")}>
                    CSV
                  </button>
                  <button className="rounded-xl border px-3 py-2 text-sm font-semibold" onClick={() => doExport("json", "filtered")}>
                    JSON
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border p-3">
                <div className="text-sm font-semibold text-gray-900">Current page</div>
                <div className="mt-2 flex flex-col gap-2">
                  <button className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => doExport("csv", "page")}>
                    CSV
                  </button>
                  <button className="rounded-xl border px-3 py-2 text-sm font-semibold" onClick={() => doExport("json", "page")}>
                    JSON
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border p-3">
                <div className="text-sm font-semibold text-gray-900">Compare set</div>
                <div className="mt-1 text-xs text-gray-600">2–5 selected</div>
                <div className="mt-2 flex flex-col gap-2">
                  <button className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white" onClick={() => doExport("csv", "compare")} disabled={compareTrials.length < 2}>
                    CSV
                  </button>
                  <button className="rounded-xl border px-3 py-2 text-sm font-semibold" onClick={() => doExport("json", "compare")} disabled={compareTrials.length < 2}>
                    JSON
                  </button>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              CSV prepends metadata as “# …” comment lines. JSON wraps records with a metadata object.
            </div>
          </div>
        </Modal>

        <Modal title="Cite this view" open={citeOpen} onClose={() => setCiteOpen(false)}>
          <div className="space-y-3">
            <div className="text-sm text-gray-700">
              Copy and paste the citation below. It includes the dataset version and a shareable URL that reproduces this view.
            </div>

            <textarea className="w-full min-h-[200px] rounded-xl border p-3 text-sm font-mono" readOnly value={citeText} />

            <div className="flex gap-2">
              <button
                className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(citeText);
                  } catch {
                    alert("Copy failed. Please select and copy manually.");
                  }
                }}
                type="button"
              >
                Copy citation
              </button>
              <button className="rounded-xl border px-3 py-2 text-sm font-semibold" onClick={() => setCiteOpen(false)} type="button">
                Done
              </button>
            </div>
          </div>
        </Modal>
      </main>
    </>
  );
}
