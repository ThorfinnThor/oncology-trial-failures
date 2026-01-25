import Link from "next/link";
import { useCallback, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

function phaseClass(phaseKey: string) {
  const p = (phaseKey || "").toUpperCase();
  if (p === "EARLY_PHASE1" || p === "PHASE1") return "chip chip-phase-1";
  if (p === "PHASE1/PHASE2" || p === "PHASE2") return "chip chip-phase-2";
  if (p === "PHASE2/PHASE3" || p === "PHASE3") return "chip chip-phase-3";
  if (p === "PHASE4") return "chip chip-phase-4";
  return "chip chip-neutral";
}

function bucketClass(bucket: string) {
  const b = (bucket || "").toUpperCase();
  if (b === "SAFETY") return "chip chip-bucket-safety";
  if (b === "EFFICACY/FUTILITY") return "chip chip-bucket-efficacy";
  return "chip chip-neutral";
}

export default function ResultsList({
  rows,
  selectedIds,
  onToggleSelect,
  onOpenPanel,
  fromHref
}: {
  rows: TrialIndexRow[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpenPanel: (id: string) => void;
  fromHref: string;
}) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Virtualized scrolling for mobile so we can show all rows (no 400 cap)
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 270,
    overscan: 10
  });

  const items = rowVirtualizer.getVirtualItems();

  const measureItem = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) rowVirtualizer.measureElement(el);
    },
    [rowVirtualizer]
  );

  return (
    <div
      ref={parentRef}
      className="m-list"
      style={{
        maxHeight: "72vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch"
      }}
    >
      <div style={{ position: "relative", height: rowVirtualizer.getTotalSize() }}>
        {items.map((v) => {
          const r = rows[v.index];
          const checked = selected.has(r.nct_id);
          const p = parsePhases(r.phases || "")[0] || "UNKNOWN";
          const bucket = reasonBucket(r);
          const why = (r.why_stopped_short || "").trim();
          const lastUpdated = (r.last_update_post_date || "").trim();

          return (
            <div
              key={r.nct_id}
              ref={measureItem}
              data-index={v.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${v.start}px)`
              }}
            >
              <div className="m-card">
                <div className="m-head">
                  <div className="m-id">
                    <Link
                      href={`/trial/${encodeURIComponent(r.nct_id)}?from=${encodeURIComponent(fromHref)}`}
                      className="link"
                    >
                      {r.nct_id}
                    </Link>
                    <div className="m-title">{r.brief_title || "—"}</div>
                    <div className="m-sub">{r.lead_sponsor || "—"}</div>
                  </div>

                  <div className="m-actions">
                    <input
                      type="checkbox"
                      checked={checked}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onToggleSelect(r.nct_id)}
                      aria-label={`Select ${r.nct_id}`}
                    />
                    <button
                      className="mini"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPanel(r.nct_id);
                      }}
                    >
                      Open panel
                    </button>
                  </div>
                </div>

                <div className="m-tags">
                  <span className={phaseClass(p)}>{phaseLabel(p)}</span>
                  <span className="chip chip-neutral">{(r.overall_status || "UNKNOWN").toUpperCase()}</span>
                  <span className={bucketClass(bucket)}>{bucket}</span>
                  <span className="chip chip-neutral">{r.disease_area || "Other"}</span>
                </div>

                {/* Only date shown in list: last_update_post_date */}
                <div style={{ marginTop: 10 }}>
                  <div className="m-why-label">Last updated</div>
                  <div className="m-why-text" style={{ marginTop: 6 }}>
                    {lastUpdated || "—"}
                  </div>
                </div>

                <div className="m-why">
                  <div className="m-why-label">Why stopped</div>
                  <div className="m-why-text">{why || "—"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="note">Tip: the mobile list is virtualized; scroll inside the results area.</div>
    </div>
  );
}
