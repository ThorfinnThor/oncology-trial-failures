import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useVirtualizer } from "@tanstack/react-virtual";

import { loadIndex, loadMeta, loadDetail } from "@/lib/data";
import { DatasetMeta, TrialDetail, TrialIndexRow, UrlState } from "@/lib/types";
import { filterRows, parsePhases, phaseLabel, PHASE_ORDER, reasonBucket, sortRows } from "@/lib/filtering";
import { decodeState, encodeState } from "@/lib/urlState";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">
      {children}
    </span>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold transition border";
  const styles =
    variant === "primary"
      ? "bg-[var(--accent)] text-white border-transparent hover:opacity-95"
      : variant === "secondary"
      ? "bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface-2)]"
      : "bg-transparent text-[var(--text)] border-transparent hover:bg-[var(--surface-2)]";
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={clsx(base, styles, disabled && "opacity-50 cursor-not-allowed")}
    >
      {children}
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-2 text-sm text-[var(--text)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-[var(--border)]"
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</div>
      {children}
    </div>
  );
}

function buildViewTitle(state: UrlState) {
  const parts: string[] = ["Clinical trial failures"];
  if (state.bio) parts.push("Likely scientific failure");
  if (state.bucket?.length) parts.push(`Reason: ${state.bucket.length > 2 ? `${state.bucket.length} selected` : state.bucket.join(", ")}`);
  if (state.area?.length) parts.push(`Area: ${state.area.length > 2 ? `${state.area.length} selected` : state.area.join(", ")}`);
  if (state.phase?.length) parts.push(`Phase: ${state.phase.join(", ")}`);
  if (state.status?.length) parts.push(`Status: ${state.status.join(", ")}`);
  if (state.q) parts.push(`Query: "${state.q}"`);
  return parts.join(" — ");
}

function buildCitation(meta: DatasetMeta | null, state: UrlState, url: string) {
  const title = buildViewTitle(state);
  const ts = new Date().toISOString();
  const v = meta?.version || "unknown";
  return `${title}\nAccessed: ${ts}\nDataset version: ${v}\nURL: ${url}`;
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCSV(meta: DatasetMeta | null, state: UrlState, rows: TrialIndexRow[]) {
  const headerMeta = [
    `# exported_at_utc=${new Date().toISOString()}`,
    `# dataset_version=${meta?.version || "unknown"}`,
    `# filters=${JSON.stringify(state)}`,
    `# total_rows=${rows.length}`,
  ].join("\n");

  const cols = [
    "nct_id",
    "brief_title",
    "overall_status",
    "phases",
    "disease_area",
    "lead_sponsor",
    "collaborators",
    "condition_first",
    "intervention_first",
    "why_stopped_short",
    "classification_label",
    "classification_reason",
    "classification_confidence",
    "classification_evidence",
    "last_update_post_date",
    "url",
  ];

  const esc = (v: any) => {
    const s = String(v ?? "");
    const needs = s.includes(",") || s.includes('"') || s.includes("\n");
    const out = s.replaceAll('"', '""');
    return needs ? `"${out}"` : out;
  };

  const body = [cols.join(",")]
    .concat(rows.map((r) => cols.map((c) => esc((r as any)[c])).join(",")))
    .join("\n");

  downloadBlob("trialfailures_export.csv", `${headerMeta}\n${body}`, "text/csv;charset=utf-8");
}

function exportJSON(meta: DatasetMeta | null, state: UrlState, rows: TrialIndexRow[]) {
  const payload = {
    metadata: {
      exported_at_utc: new Date().toISOString(),
      dataset_version: meta?.version || "unknown",
      filters: state,
      total_rows: rows.length,
    },
    records: rows,
  };
  downloadBlob("trialfailures_export.json", JSON.stringify(payload, null, 2), "application/json");
}

export default function ExplorePage() {
  const router = useRouter();
  const [meta, setMeta] = useState<DatasetMeta | null>(null);
  const [allRows, setAllRows] = useState<TrialIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // URL state source-of-truth
  const state = useMemo(() => decodeState(router.asPath.split("?")[1] || ""), [router.asPath]);

  // Local controlled input for q to avoid lag; sync to URL with debounce
  const [qLocal, setQLocal] = useState(state.q || "");
  useEffect(() => setQLocal(state.q || ""), [state.q]);

  const qDebounced = useDebouncedValue(qLocal, 300);

  // Load index + meta once
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

  // Apply debounced q to URL (replaceState to avoid history spam)
  useEffect(() => {
    if (!router.isReady) return;
    if ((state.q || "") === qDebounced) return;
    const next: UrlState = { ...state, q: qDebounced || undefined };
    router.replace(`/explore${encodeState(next)}`, undefined, { shallow: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced]);

  const sortKey = state.sort || "date_desc";

  const filtered = useMemo(() => {
    return filterRows(allRows, { ...state, q: qDebounced || undefined });
  }, [allRows, state, qDebounced]);

  const rows = useMemo(() => sortRows(filtered, sortKey), [filtered, sortKey]);

  // Facets computed ONCE from full dataset for speed
  const facets = useMemo(() => {
    const counts = {
      area: new Map<string, number>(),
      sponsor: new Map<string, number>(),
      condition: new Map<string, number>(),
      intervention: new Map<string, number>(),
      status: new Map<string, number>(),
      phase: new Map<string, number>(),
      bucket: new Map<string, number>(),
    };

    for (const r of allRows) {
      const area = (r.disease_area || "Other") || "Other";
      counts.area.set(area, (counts.area.get(area) || 0) + 1);

      const sponsor = (r.lead_sponsor || "").trim();
      if (sponsor) counts.sponsor.set(sponsor, (counts.sponsor.get(sponsor) || 0) + 1);

      if (r.condition_first) counts.condition.set(r.condition_first, (counts.condition.get(r.condition_first) || 0) + 1);
      if (r.intervention_first) counts.intervention.set(r.intervention_first, (counts.intervention.get(r.intervention_first) || 0) + 1);

      const st = (r.overall_status || "").toUpperCase();
      if (st) counts.status.set(st, (counts.status.get(st) || 0) + 1);

      const p = parsePhases(r.phases || "")[0] || "Unknown";
      counts.phase.set(p, (counts.phase.get(p) || 0) + 1);

      const b = reasonBucket(r);
      counts.bucket.set(b, (counts.bucket.get(b) || 0) + 1);
    }

    const top = (m: Map<string, number>, n = 10) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, n);

    const allSorted = (m: Map<string, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1]);

    return {
      areaTop: top(counts.area, 10),
      areaAll: allSorted(counts.area),

      sponsorTop: top(counts.sponsor, 10),
      sponsorAll: allSorted(counts.sponsor),

      conditionTop: top(counts.condition, 10),
      conditionAll: allSorted(counts.condition),

      interventionTop: top(counts.intervention, 10),
      interventionAll: allSorted(counts.intervention),

      statusAll: allSorted(counts.status),
      bucketAll: allSorted(counts.bucket),

      phaseAll: PHASE_ORDER.map((p) => [p, counts.phase.get(p) || 0] as const).filter((x) => x[1] > 0),
    };
  }, [allRows]);

  // Drawer detail (lazy load)
  const [detail, setDetail] = useState<TrialDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const id = state.trial;
      if (!id) {
        setDetail(null);
        return;
      }
      setDetailLoading(true);
      const d = await loadDetail(id);
      if (!alive) return;
      setDetail(d);
      setDetailLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [state.trial]);

  function setState(patch: Partial<UrlState>) {
    const next: UrlState = { ...state, ...patch };
    router.push(`/explore${encodeState(next)}`, undefined, { shallow: true });
  }

  function toggleMulti(key: keyof UrlState, value: string) {
    const cur = (state[key] as string[] | undefined) || [];
    const set = new Set(cur);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    const arr = Array.from(set);
    setState({ [key]: arr.length ? arr : undefined } as any);
  }

  function clearAll() {
    router.push("/explore", undefined, { shallow: true });
  }

  // Compare
  const compare = state.compare || [];
  function toggleCompare(id: string) {
    const set = new Set(compare);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    const arr = Array.from(set).slice(0, 5);
    setState({ compare: arr.length ? arr : undefined });
  }

  // Virtual list
  const parentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  // Responsive rail default
  const railOpen = state.rail !== false;

  return (
    <>
      <Head>
        <title>Clinical trial failures</title>
      </Head>

      <div className="min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-[1400px] px-4 py-3 flex items-center gap-3">
            <div className="flex items-center gap-3">
              <Link href="/explore" className="text-sm font-semibold tracking-tight">
                Clinical trial failures
              </Link>
              <nav className="hidden md:flex items-center gap-3 text-sm text-[var(--text-muted)]">
                <Link href="/explore" className="hover:text-[var(--text)]">Explore</Link>
                <Link href="/methods" className="hover:text-[var(--text)]">Methods</Link>
              </nav>
            </div>

            <div className="flex-1" />

            <div className="hidden md:block w-[520px]">
              <input
                value={qLocal}
                onChange={(e) => setQLocal(e.target.value)}
                placeholder="Search trials, sponsors, conditions, interventions…"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
                aria-label="Search"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                title="Copy shareable link to this view"
              >
                Copy link
              </Button>
              <Button
                variant="secondary"
                onClick={() => exportCSV(meta, { ...state, q: qDebounced || undefined }, rows)}
                title="Export current filtered results (CSV)"
              >
                Export CSV
              </Button>
              <Button
                variant="secondary"
                onClick={() => exportJSON(meta, { ...state, q: qDebounced || undefined }, rows)}
                title="Export current filtered results (JSON)"
              >
                Export JSON
              </Button>
              <Button variant="ghost" onClick={clearAll} title="Reset all filters">
                Reset
              </Button>
            </div>
          </div>

          {/* Mobile search row */}
          <div className="md:hidden px-4 pb-3">
            <input
              value={qLocal}
              onChange={(e) => setQLocal(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm shadow-[var(--shadow-soft)] focus:outline-none"
              aria-label="Search"
            />
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-5">
          {/* Title + simple explanation */}
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Clinical trial failures</h1>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Browse stopped trials and the stated stop reasons as recorded in the registry.
                  Use filters to narrow to the subset you care about.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Pill>Dataset: {meta?.version || "—"}</Pill>
                <Button
                  variant="secondary"
                  onClick={() => setState({ rail: railOpen ? false : undefined })}
                  title="Toggle filters panel"
                >
                  {railOpen ? "Hide filters" : "Show filters"}
                </Button>
                <Link
                  className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
                  href={`/compare${encodeState({ ...state, q: qDebounced || undefined })}`}
                >
                  Compare ({compare.length})
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const cite = buildCitation(meta, { ...state, q: qDebounced || undefined }, window.location.href);
                    navigator.clipboard.writeText(cite);
                  }}
                  title="Copy a citation block for this view"
                >
                  Cite this view
                </Button>
              </div>
            </div>

            <div className="text-xs text-[var(--text-muted)]">
              Labels are inferred from registry text and may be incomplete. Verify using primary sources.
            </div>
          </div>

          {/* Workbench layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
            {/* Filters rail */}
            {railOpen && (
              <aside className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)]">
                <div className="space-y-4">
                  <Section title="Likely scientific failure">
                    <Checkbox
                      checked={!!state.bio}
                      onChange={(v) => setState({ bio: v ? true : undefined })}
                      label={
                        <span>
                          Show only trials flagged as likely efficacy/mechanism-related stops.
                          <span className="block text-xs text-[var(--text-muted)] mt-1">
                            Inferred from registry text; may be incomplete.
                          </span>
                        </span>
                      }
                    />
                  </Section>

                  <Section title="Status">
                    <div className="space-y-2">
                      {facets.statusAll.map(([v, c]) => (
                        <Checkbox
                          key={v}
                          checked={(state.status || []).includes(v)}
                          onChange={() => toggleMulti("status", v)}
                          label={
                            <span className="flex items-center justify-between gap-2">
                              <span>{v}</span>
                              <span className="text-xs text-[var(--text-muted)]">{c}</span>
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </Section>

                  <Section title="Phase">
                    <div className="space-y-2">
                      {facets.phaseAll.map(([p, c]) => (
                        <Checkbox
                          key={p}
                          checked={(state.phase || []).includes(p)}
                          onChange={() => toggleMulti("phase", p)}
                          label={
                            <span className="flex items-center justify-between gap-2">
                              <span>{phaseLabel(p as any)}</span>
                              <span className="text-xs text-[var(--text-muted)]">{c}</span>
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </Section>

                  <Section title="Disease area (Top 10)">
                    <div className="space-y-2">
                      {facets.areaTop.map(([v, c]) => (
                        <Checkbox
                          key={v}
                          checked={(state.area || []).includes(v)}
                          onChange={() => toggleMulti("area", v)}
                          label={
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate">{v}</span>
                              <span className="text-xs text-[var(--text-muted)]">{c}</span>
                            </span>
                          }
                        />
                      ))}
                      <Button
                        variant="ghost"
                        onClick={() => {
                          // Toggle "show all areas" by selecting none (UX shortcut)
                          // Users can still rely on search for a specific area.
                          alert("Tip: Use the global search to quickly find a disease area by name.");
                        }}
                      >
                        Tip: search for areas
                      </Button>
                    </div>
                  </Section>

                  <Section title="Reason bucket">
                    <div className="space-y-2">
                      {facets.bucketAll.map(([v, c]) => (
                        <Checkbox
                          key={v}
                          checked={(state.bucket || []).includes(v)}
                          onChange={() => toggleMulti("bucket", v)}
                          label={
                            <span className="flex items-center justify-between gap-2">
                              <span>{v}</span>
                              <span className="text-xs text-[var(--text-muted)]">{c}</span>
                            </span>
                          }
                        />
                      ))}
                    </div>
                  </Section>

                  <Section title="Date range (last update)">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={state.date_from || ""}
                        onChange={(e) => setState({ date_from: e.target.value || undefined })}
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                        aria-label="Date from"
                      />
                      <input
                        type="date"
                        value={state.date_to || ""}
                        onChange={(e) => setState({ date_to: e.target.value || undefined })}
                        className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                        aria-label="Date to"
                      />
                    </div>
                  </Section>
                </div>
              </aside>
            )}

            {/* Results */}
            <section className="rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)] overflow-hidden">
              {/* Summary row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
                <div className="text-sm">
                  <span className="font-semibold" aria-live="polite">
                    {loading ? "Loading…" : `${rows.length.toLocaleString()} results`}
                  </span>
                  {state.q || state.bio || state.area?.length || state.bucket?.length || state.phase?.length || state.status?.length ? (
                    <span className="ml-2 text-[var(--text-muted)]">Filtered view</span>
                  ) : (
                    <span className="ml-2 text-[var(--text-muted)]">No filters applied</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-[var(--text-muted)]">Sort</label>
                  <select
                    value={sortKey}
                    onChange={(e) => setState({ sort: e.target.value as any })}
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                  >
                    <option value="date_desc">Date (newest)</option>
                    <option value="date_asc">Date (oldest)</option>
                    <option value="sponsor_asc">Sponsor (A→Z)</option>
                    <option value="sponsor_desc">Sponsor (Z→A)</option>
                    <option value="confidence_desc">Confidence (high→low)</option>
                    <option value="confidence_asc">Confidence (low→high)</option>
                  </select>
                </div>
              </div>

              {err && (
                <div className="p-4 text-sm text-rose-700">
                  {err}
                </div>
              )}

              {!err && !loading && rows.length === 0 && (
                <div className="p-8 text-center text-sm text-[var(--text-muted)]">
                  No results. Try removing some filters.
                </div>
              )}

              {/* Virtualized list */}
              <div ref={parentRef} className="h-[72vh] overflow-auto">
                <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
                  {/* Sticky header row (simple grid) */}
                  <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-white">
                    <div className="grid grid-cols-[44px_130px_1.6fr_140px_160px_160px_140px_120px] gap-3 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      <div>Sel</div>
                      <div>Trial</div>
                      <div>Title</div>
                      <div>Phase</div>
                      <div>Condition</div>
                      <div>Intervention</div>
                      <div>Status</div>
                      <div>Date</div>
                    </div>
                  </div>

                  {virtualItems.map((vi) => {
                    const r = rows[vi.index];
                    const ph = parsePhases(r.phases || "")[0] || "Unknown";
                    const isSelected = compare.includes(r.nct_id);

                    return (
                      <div
                        key={r.nct_id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${vi.start}px)`,
                        }}
                        className={clsx(
                          "border-b border-[var(--border)]",
                          "hover:bg-[var(--surface-2)]"
                        )}
                      >
                        <div className="grid grid-cols-[44px_130px_1.6fr_140px_160px_160px_140px_120px] gap-3 px-4 py-3 items-start">
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCompare(r.nct_id)}
                              className="h-4 w-4 rounded border-[var(--border)]"
                              aria-label={`Select ${r.nct_id} for compare`}
                            />
                          </div>

                          <div className="text-sm font-semibold">
                            <a
                              href={`/trial/${encodeURIComponent(r.nct_id)}?from=${encodeURIComponent(router.asPath)}`}
                              className="text-[var(--accent)]"
                              onClick={(e) => {
                                // Keep standard link behavior
                              }}
                            >
                              {r.nct_id}
                            </a>

                            <div className="mt-1">
                              <button
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                                onClick={() => setState({ trial: r.nct_id })}
                                type="button"
                              >
                                Open panel
                              </button>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-semibold leading-snug">
                              {r.brief_title || "—"}
                            </div>
                            <div className="mt-1 text-xs text-[var(--text-muted)]">
                              {r.lead_sponsor || "—"}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Pill>{reasonBucket(r)}</Pill>
                              {r.classification_label === "BIOLOGICAL_FAILURE" && (
                                <Pill>Likely scientific failure</Pill>
                              )}
                              <span className="text-xs text-[var(--text-muted)]">
                                Confidence: {r.classification_confidence || "—"}
                              </span>
                            </div>

                            <div className="mt-2 text-xs text-[var(--text-muted)]">
                              <span className="font-semibold text-[var(--text-muted)]">Why stopped:</span>{" "}
                              <span title={r.why_stopped_short} className="inline">
                                {r.why_stopped_short || "—"}
                              </span>
                            </div>
                          </div>

                          <div className="text-sm">{phaseLabel(ph as any)}</div>
                          <div className="text-sm">{r.condition_first || "—"}</div>
                          <div className="text-sm">{r.intervention_first || "—"}</div>
                          <div className="text-sm">{(r.overall_status || "—").toUpperCase()}</div>
                          <div className="text-sm">{r.last_update_post_date || "—"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* Details drawer */}
        {!!state.trial && (
          <div
            className="fixed inset-0 z-40"
            aria-label="Details drawer overlay"
            role="dialog"
            aria-modal="true"
          >
            <div
              className="absolute inset-0 bg-black/20"
              onClick={() => setState({ trial: undefined })}
            />
            <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white border-l border-[var(--border)] shadow-[var(--shadow)] flex flex-col">
              <div className="p-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-[var(--text-muted)]">Details</div>
                  <div className="mt-1 text-sm font-semibold truncate">{state.trial}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
                    href={`/trial/${encodeURIComponent(state.trial)}?from=${encodeURIComponent(router.asPath)}`}
                  >
                    Open full page
                  </Link>
                  <Button variant="ghost" onClick={() => setState({ trial: undefined })}>
                    Close
                  </Button>
                </div>
              </div>

              <div className="p-4 overflow-auto">
                {detailLoading && (
                  <div className="text-sm text-[var(--text-muted)]">Loading details…</div>
                )}

                {!detailLoading && !detail && (
                  <div className="text-sm text-[var(--text-muted)]">No details found.</div>
                )}

                {detail && (
                  <div className="space-y-4">
                    <div>
                      <div className="text-lg font-semibold leading-snug">{detail.brief_title || "—"}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Pill>{(detail.overall_status || "—").toUpperCase()}</Pill>
                        <Pill>{phaseLabel((parsePhases(detail.phases || "")[0] || "Unknown") as any)}</Pill>
                        <Pill>{detail.disease_area || "Other"}</Pill>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        Stated stop reason (full)
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                        {detail.why_stopped || "—"}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div><span className="font-semibold">Sponsor:</span> {detail.lead_sponsor || "—"}</div>
                      <div><span className="font-semibold">Collaborators:</span> {detail.collaborators || "—"}</div>
                      <div><span className="font-semibold">Conditions:</span> {detail.conditions || "—"}</div>
                      <div><span className="font-semibold">Interventions:</span> {detail.intervention_names || "—"}</div>
                      <div><span className="font-semibold">Confidence:</span> {detail.classification_confidence || "—"}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        This classification is inferred from registry text and may be incomplete. Verify using the primary source.
                      </div>
                      <a className="text-sm font-semibold" href={detail.url} target="_blank" rel="noreferrer">
                        Open primary source
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
