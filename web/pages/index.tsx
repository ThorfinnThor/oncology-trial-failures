import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { loadDatasetClient, splitSemicolonValues } from "@/lib/data";
import { DatasetMeta, TrialRow } from "@/lib/types";
import { Filters } from "@/components/Filters";
import { TrialTable } from "@/components/TrialTable";
import { Pagination } from "@/components/Pagination";

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

  return (
    <>
      <Head>
        <title>Stopped Trials Explorer</title>
        <meta
          name="description"
          content="Explore suspended/terminated drug and biologic trials and classify stop reasons from registry text."
        />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Stopped Trials Explorer</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Interventional DRUG/BIOLOGICAL trials with status <span className="font-medium">SUSPENDED</span> or{" "}
                  <span className="font-medium">TERMINATED</span>, with stop-reason classification from “why stopped”.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    mode === "bio" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => { setMode("bio"); resetToFirstPage(); }}
                >
                  Biological failures (recommended)
                </button>
                <button
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    mode === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={() => { setMode("all"); resetToFirstPage(); }}
                >
                  All stopped trials
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <a className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/biological_failure_trials.csv">
                Download bio CSV
              </a>
              <a className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/biological_failure_trials.json">
                Download bio JSON
              </a>
              <a className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/all_stopped_trials.csv">
                Download all CSV
              </a>
              <a className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/all_stopped_trials.json">
                Download all JSON
              </a>
              <a className="rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-50" href="/dataset_meta.json">
                Metadata
              </a>
            </div>

            <div className="mt-3 text-xs text-gray-500">
              {meta ? (
                <>
                  Dataset version: <span className="font-medium">{meta.version}</span> • Generated:{" "}
                  <span className="font-medium">{meta.generated_at_utc}</span> • Records (all):{" "}
                  <span className="font-medium">{meta.all.record_count}</span> • Records (bio):{" "}
                  <span className="font-medium">{meta.biological_failure.record_count}</span>
                </>
              ) : (
                <>Loading metadata…</>
              )}
            </div>

            {meta?.top_areas?.length ? (
              <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-gray-900">Top 10 disease areas in the fetched dataset</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {meta.top_areas.map((t) => (
                    <button
                      key={t.area}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        area === t.area ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                      onClick={() => { setArea(area === t.area ? "" : t.area); resetToFirstPage(); }}
                      title="Click to filter"
                    >
                      {t.area} <span className="text-gray-400">{t.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-sm">
            <div className="text-base font-semibold text-gray-900">About</div>
            <p className="mt-2">
              This project classifies stop reasons using transparent, rule-based scoring of the registry’s “why stopped” text.
              The classifier looks for weighted safety/efficacy signals, accounts for explicit negations (e.g., “not due to safety”),
              and down-weights common operational/business reasons (e.g., recruitment, funding, strategic prioritization).
            </p>
            <p className="mt-2">
              The <span className="font-medium">Confidence</span> field reflects the strength and consistency of matched signals in the text.
              It is not a clinical conclusion and should be interpreted as “how strongly the registry text supports this label”.
            </p>
          </div>

          {loading && (
            <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700 shadow-sm">Loading dataset…</div>
          )}

          {err && (
            <div className="rounded-2xl border border-red-200 bg-white p-4 text-sm text-red-700 shadow-sm">{err}</div>
          )}

          {!loading && !err && (
            <>
              <Filters
                q={q}
                setQ={(v) => { setQ(v); resetToFirstPage(); }}
                area={area}
                setArea={(v) => { setArea(v); resetToFirstPage(); }}
                reason={reason}
                setReason={(v) => { setReason(v); resetToFirstPage(); }}
                status={status}
                setStatus={(v) => { setStatus(v); resetToFirstPage(); }}
                phase={phase}
                setPhase={(v) => { setPhase(v); resetToFirstPage(); }}
                confidence={confidence}
                setConfidence={(v) => { setConfidence(v); resetToFirstPage(); }}
                sort={sort}
                setSort={(v) => { setSort(v); resetToFirstPage(); }}
                areas={facets.areas}
                reasons={facets.reasons}
                statuses={facets.statuses}
                phases={facets.phases}
                confidences={facets.confidences}
              />

              <Pagination page={safePage} pageSize={pageSize} total={total} onPageChange={setPage} />

              <TrialTable rows={pageRows} />

              <Pagination page={safePage} pageSize={pageSize} total={total} onPageChange={setPage} />
            </>
          )}
        </main>
      </div>
    </>
  );
}
