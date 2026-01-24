import Link from "next/link";
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

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

/**
 * ResultsList (compat wrapper)
 * - Updated to TrialIndexRow
 * - Virtualized for performance
 * - Designed for mobile/narrow layouts (card style)
 */
export default function ResultsList({
  rows,
  selectedIds,
  onToggleSelect,
  onOpenPanel,
  fromHref,
}: {
  rows: TrialIndexRow[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpenPanel: (id: string) => void;
  fromHref?: string;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 132,
    overscan: 10,
  });

  const items = rowVirtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="h-[72vh] overflow-auto">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
        {items.map((vi) => {
          const r = rows[vi.index];
          const ph = parsePhases(r.phases || "")[0] || "Unknown";
          const checked = selectedIds.includes(r.nct_id);

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
              className="px-3 py-2"
            >
              <div
                className={clsx(
                  "rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)] p-4",
                  "hover:bg-[var(--surface-2)] transition"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleSelect(r.nct_id)}
                        className="h-4 w-4 rounded border-[var(--border)]"
                        aria-label={`Select ${r.nct_id} for compare`}
                      />
                      <Link
                        href={`/trial/${encodeURIComponent(r.nct_id)}${fromHref ? `?from=${encodeURIComponent(fromHref)}` : ""}`}
                        className="text-sm font-semibold text-[var(--accent)]"
                      >
                        {r.nct_id}
                      </Link>
                      <button
                        className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                        onClick={() => onOpenPanel(r.nct_id)}
                        type="button"
                      >
                        Open panel
                      </button>
                    </div>

                    <div className="mt-2 text-sm font-semibold leading-snug line-clamp-2">
                      {r.brief_title || "—"}
                    </div>

                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      {r.lead_sponsor || "—"}
                    </div>
                  </div>

                  <div className="text-right text-xs text-[var(--text-muted)]">
                    <div>{(r.overall_status || "—").toUpperCase()}</div>
                    <div className="mt-1">{r.last_update_post_date || "—"}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Pill>{phaseLabel(ph as any)}</Pill>
                  <Pill>{reasonBucket(r)}</Pill>
                  {r.classification_label === "BIOLOGICAL_FAILURE" && <Pill>Likely scientific failure</Pill>}
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Condition</div>
                    <div className="font-semibold">{r.condition_first || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--text-muted)]">Intervention</div>
                    <div className="font-semibold">{r.intervention_first || "—"}</div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text-muted)]">Why stopped:</span>{" "}
                  <span title={r.why_stopped_short || ""}>{r.why_stopped_short || "—"}</span>
                </div>

                <div className="mt-2 text-xs text-[var(--text-muted)]">
                  Confidence: {r.classification_confidence || "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
