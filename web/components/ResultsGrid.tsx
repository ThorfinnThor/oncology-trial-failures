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
 * ResultsGrid (compat wrapper)
 * - Updated to new data model (TrialIndexRow)
 * - No dependency on splitSemicolonValues / TrialRow
 * - Virtualized for performance
 */
export default function ResultsGrid({
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
    estimateSize: () => 74,
    overscan: 10,
  });

  const items = rowVirtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className="h-[72vh] overflow-auto">
      <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
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
              className={clsx("border-b border-[var(--border)] hover:bg-[var(--surface-2)]")}
            >
              <div className="grid grid-cols-[44px_130px_1.6fr_140px_160px_160px_140px_120px] gap-3 px-4 py-3 items-start">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleSelect(r.nct_id)}
                    className="h-4 w-4 rounded border-[var(--border)]"
                    aria-label={`Select ${r.nct_id} for compare`}
                  />
                </div>

                <div className="text-sm font-semibold">
                  <Link
                    href={`/trial/${encodeURIComponent(r.nct_id)}${fromHref ? `?from=${encodeURIComponent(fromHref)}` : ""}`}
                    className="text-[var(--accent)]"
                  >
                    {r.nct_id}
                  </Link>
                  <div className="mt-1">
                    <button
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                      onClick={() => onOpenPanel(r.nct_id)}
                      type="button"
                    >
                      Open panel
                    </button>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-snug">{r.brief_title || "—"}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{r.lead_sponsor || "—"}</div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill>{reasonBucket(r)}</Pill>
                    {r.classification_label === "BIOLOGICAL_FAILURE" && <Pill>Likely scientific failure</Pill>}
                    <span className="text-xs text-[var(--text-muted)]">
                      Confidence: {r.classification_confidence || "—"}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    <span className="font-semibold">Why stopped:</span>{" "}
                    <span title={r.why_stopped_short || ""}>{r.why_stopped_short || "—"}</span>
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
  );
}
