import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { loadDatasetClient, splitSemicolonValues } from "@/lib/data";
import { DatasetMeta, TrialRow } from "@/lib/types";
import { Filters } from "@/components/Filters";
import { TrialTable } from "@/components/TrialTable";
import { Pagination } from "@/components/Pagination";
import { DownloadMenu } from "@/components/DownloadMenu";

function includesAny(haystack: string, needle: string) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export default function Home() {
  const [mode, setMode] = useState<"bio" | "all">("bio");

  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [trials, setTrials] = useState<TrialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("");
  const [phase, setPhase] = useState("");
  const [confidence, setConfidence] = useState(""); // advanced
  const [sort, setSort] = useState("updated_desc");

  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { meta, trials } = await loadDatasetClient(mode === "all" ? "all" : "bio");
        if (!alive) return;
        setMeta(meta);
        setTrials(trials);
        setErr(null);

        // Reset pagination when mode changes
        setPage(1);
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
  }, [mode]);

  const facets = useMemo(() => {
    const areas = Array.from(new Set(trials.map((t) => (t.disease_area || "Other")).filter(Boolean))).sort();
    const reasons = Array.from(new Set(trials.map((t) => t.classification_reason).filter(Boolean))).sort();
    const statuses = Array.from(new Set(trials.map((t) => t.overall_status).filter(Boolean))).sort();
    const confidences = Array.from(new Set(trials.map((t) => t.classification_confidence).filter(Boolean))).sort();

    const phaseSet = new Set<string>();
    for (const t of trials) {
      for (const p of splitSemicolonValues(t.phases || "")) phaseSet.add(p);
    }
    const phases = Array.from(phaseSet).sort();

    return { areas, reasons, statuses, phases, confidences };
  }, [trials]);

  const filtered = useMemo(() => {
    let rows = trials;

    const qq = q.trim();
    if (qq) {
      rows = rows.filter((r) => {
        const blob = [
          r.nct_id,
          r.brief_title,
          r.lead_sponsor,
          r.collaborators,
          r.conditions,
          r.intervention_names,
          r.why_stopped,
          r.disease_area,
          r.mesh_terms,
        ]
          .filter(Boolean)
          .join(" | ");
        return includesAny(blob, qq);
      });
    }

    if (area) rows = rows.filter((r) => (r.disease_area || "Other") === area);
    if (reason) rows = rows.filter((r) => r.classification_reason === reason);
    if (status) rows = rows.filter((r) => r.overall_status === status);
    if (phase) rows = rows.filter((r) => splitSemicolonValues(r.phases || "").includes(phase));
    if (confidence) rows = rows.filter((r) => r.classification_confidence === confidence);

    rows = [...rows];
    switch (sort) {
      case "updated_asc":
        rows.sort((a, b) => (a.last_update_post_date || "").localeCompare(b.last_update_post_date || ""));
        break;
      case "title_asc":
        rows.sort((a, b) => (a.brief_title || "").localeCompare(b.brief_title || ""));
        break;
      case "title_desc":
        rows.sort((a, b) => (b.brief_title || "").localeCompare(a.brief_title || ""));
        break;
      case "sponsor_asc":
        rows.sort((a, b) => (a.lead_sponsor || "").localeCompare(b.lead_sponsor || ""));
        break;
      case "sponsor_desc":
        rows.sort((a, b) => (b.lead_sponsor || "").localeCompare(a.lead_sponsor || ""));
        break;
      case "area_asc":
        rows.sort((a, b) => (a.disease_area || "").localeCompare(b.disease_area || ""));
        break;
      case "area_desc":
        rows.sort((a, b) => (b.disease_area || "").localeCompare(a.disease_area || ""));
        break;
      case "updated_desc":
      default:
        rows.sort((a, b) => (b.last_update_post_date || "").localeCompare(a.last_update_post_date || ""));
        break;
    }

    return rows;
  }, [trials, q, area, reason, status, phase, confidence, sort]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage]);

  const resetToFirstPage = () => setPage(1);

  // For "top 10 chips" UX shortcut
  const topAreas = meta?.top_areas || [];

  // totalAll for download menu: depends on mode (bio/all)
  const totalAll =
    mode === "bio" ? (meta?.biological_failure?.record_count ?? trials.length) : (meta?.all?.record_count ?? trials.length);

  return (
    <>
      <Head>
        <title>Clinical trial failures</title>
        <meta name="description" content="Browse stopped clinical trials and explore why they were stopped." />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-2xl font-semibold text-gray-900">Clinical trial failures</h1>
                <p className="mt-1 text-sm text-gray-600">
                  This site lists clinical trials that were suspended or terminated.
                  You can search and filter to understand the stated reason and who sponsored the study.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    mode === "bio"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-800 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setMode("bio");
                    resetToFirstPage();
                  }}
                  type="button"
                  title="Trials with stronger signals suggesting efficacy/safety-related stops"
                >
                  Focus: likely biological failures
                </button>

                <button
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    mode === "all"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-800 hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setMode("all");
                    resetToFirstPage();
                  }}
                  type="button"
                  title="All suspended/terminated trials in the dataset"
                >
                  Show all stopped trials
                </button>

                <DownloadMenu
                  mode={mode}
                  totalAll={totalAll}
                  totalFiltered={total}
                  filteredRows={filtered}
                  currentArea={area}
                />
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              {meta ? (
                <>
                  Updated: <span className="font-medium">{meta.generated_at_utc}</span> • Records:{" "}
                  <span className="font-medium">
                    {mode === "bio" ? meta.biological_failure.record_count : meta.all.record_count}
                  </span>
                  {area ? (
                    <>
                      {" "}
                      • Area filter: <span className="font-medium">{area}</span>
                    </>
                  ) : null}
                </>
              ) : (
                <>Loading dataset information…</>
              )}
            </div>

            {/* Top 10 shortcut chips */}
            {topAreas.length > 0 && (
              <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm font-semibold text-gray-900">Popular disease areas</div>
                  <div className="text-xs text-gray-500">Quick filters (dropdown includes all areas)</div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {topAreas.map((t) => (
                    <button
                      key={t.area}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        area === t.area
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-800 hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        setArea(area === t.area ? "" : t.area);
                        resetToFirstPage();
                      }}
                      type="button"
                      title="Click to filter"
                    >
                      {t.area} <span className="ml-1 text-gray-400">{t.count}</span>
                    </button>
                  ))}

                  {/* Helpful shortcut */}
                  <button
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      area === "Other"
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-800 hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setArea(area === "Other" ? "" : "Other");
                      resetToFirstPage();
                    }}
                    type="button"
                    title="Trials that do not strongly match a disease area keyword"
                  >
                    Other
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
          {loading && (
            <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-sm">
              Loading data…
            </div>
          )}

          {err && (
            <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 shadow-sm">
              {err}
            </div>
          )}

          {!loading && !err && (
            <>
              <Filters
                q={q}
                setQ={(v) => {
                  setQ(v);
                  resetToFirstPage();
                }}
                area={area}
                setArea={(v) => {
                  setArea(v);
                  resetToFirstPage();
                }}
                reason={reason}
                setReason={(v) => {
                  setReason(v);
                  resetToFirstPage();
                }}
                status={status}
                setStatus={(v) => {
                  setStatus(v);
                  resetToFirstPage();
                }}
                phase={phase}
                setPhase={(v) => {
                  setPhase(v);
                  resetToFirstPage();
                }}
                confidence={confidence}
                setConfidence={(v) => {
                  setConfidence(v);
                  resetToFirstPage();
                }}
                sort={sort}
                setSort={(v) => {
                  setSort(v);
                  resetToFirstPage();
                }}
                areas={facets.areas}
                reasons={facets.reasons}
                statuses={facets.statuses}
                phases={facets.phases}
                confidences={facets.confidences}
              />

              <Pagination page={safePage} pageSize={pageSize} total={total} onPageChange={setPage} />

              <TrialTable rows={pageRows} />

              <Pagination page={safePage} pageSize={pageSize} total={total} onPageChange={setPage} />

              <div className="rounded-2xl border bg-white p-4 text-xs text-gray-600 shadow-sm">
                <div className="font-semibold text-gray-900">Notes</div>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>“Reason” is derived from the trial’s stated stop text. Always confirm using the official trial page.</li>
                  <li>Confidence is shown as a small badge and reflects how strongly the stop text supports the label.</li>
                </ul>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
