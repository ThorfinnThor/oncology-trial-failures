import Link from "next/link";
import { useCallback, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { trialPath } from "@/lib/seoUrls";

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
  if (b === "ENROLLMENT") return "chip chip-bucket-enrollment";
  if (b === "FUNDING") return "chip chip-bucket-funding";
  if (b === "REGULATORY") return "chip chip-bucket-regulatory";
  if (b === "STRATEGIC") return "chip chip-bucket-strategic";
  if (b === "OPERATIONAL") return "chip chip-bucket-operational";
  return "chip chip-neutral";
}

/**
 * Desktop grid columns:
 * (NEW) final "Last updated" column after "Why stopped"
 */
const COLS = "56px 140px 360px 120px 160px 240px 240px 150px 170px 520px 160px";
const MIN_WIDTH = 1980 + 160;

export default function ResultsGrid({
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

  // Outer horizontal scroller
  const outerRef = useRef<HTMLDivElement | null>(null);
  // Inner vertical scroller (virtualizer scroll element)
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 104,
    overscan: 12
  });

  const items = rowVirtualizer.getVirtualItems();
  const renderedItems =
    items.length > 0
      ? items
      : rows.slice(0, Math.min(rows.length, 50)).map((_, index) => ({
          index,
          start: index * 104,
        }));

  const measureRow = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) rowVirtualizer.measureElement(el);
    },
    [rowVirtualizer]
  );

  /**
   * Key fix: forward horizontal wheel deltas to the outer horizontal scroller.
   * Without this, the inner vertical scroller can "steal" trackpad momentum,
   * causing a brief stop mid horizontal scroll.
   */
  const onWheelCapture = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const dx = e.deltaX || 0;
    const dy = e.deltaY || 0;

    // Only intercept "mostly horizontal" gestures (typical trackpad swipe)
    if (Math.abs(dx) > 0 && Math.abs(dx) >= Math.abs(dy)) {
      const outer = outerRef.current;
      if (outer) {
        outer.scrollLeft += dx;
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }, []);

  return (
    <div
      className="table-scroller"
      ref={outerRef}
      style={{
        // Helps trackpads: allow smooth horizontal momentum on the outer container
        WebkitOverflowScrolling: "touch"
      }}
    >
      <div
        ref={parentRef}
        onWheelCapture={onWheelCapture}
        style={{
          maxHeight: "72vh",
          overflowY: "auto",
          overflowX: "visible",
          WebkitOverflowScrolling: "touch",
          minWidth: MIN_WIDTH
        }}
      >
        {/* Sticky header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 3,
            background: "var(--surface)",
            borderBottom: "1px solid var(--border)"
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: COLS, minWidth: MIN_WIDTH }}>
            <div className="th sel">Sel</div>
            <div className="th trial">Trial</div>
            <div className="th title">Title</div>
            <div className="th phase">Phase</div>
            <div className="th area">Disease area</div>
            <div className="th cond">Condition</div>
            <div className="th intv">Intervention</div>
            <div className="th status">Status</div>
            <div className="th bucket">Reason</div>
            <div className="th why">Why stopped</div>
            <div className="th">Last updated</div>
          </div>
        </div>

        {/* Virtualized body */}
        <div style={{ position: "relative", height: rowVirtualizer.getTotalSize(), minWidth: MIN_WIDTH }}>
          {renderedItems.map((v) => {
            const r = rows[v.index];
            const checked = selected.has(r.nct_id);
            const selectionDisabled = !checked && selected.size >= 5;
            const p = parsePhases(r.phases || "")[0] || "UNKNOWN";
            const bucket = reasonBucket(r);
            const why = (r.why_stopped_short || "").trim();
            const lastUpdated = (r.last_update_post_date || "").trim();

            return (
              <div
                key={r.nct_id}
                ref={measureRow}
                data-index={v.index}
                className="tr"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${v.start}px)`,
                  display: "grid",
                  gridTemplateColumns: COLS
                }}
              >
                <div className="td sel">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={selectionDisabled}
                    title={selectionDisabled ? "You can compare up to 5 trials." : undefined}
                    onClick={(ev) => ev.stopPropagation()}
                    onChange={() => onToggleSelect(r.nct_id)}
                    aria-label={`Select ${r.nct_id}`}
                  />
                </div>

                <div className="td trial">
                  <Link
                    href={`${trialPath(r)}?from=${encodeURIComponent(fromHref)}`}
                    className="link"
                  >
                    {r.nct_id}
                  </Link>

                  <button
                    className="mini"
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onOpenPanel(r.nct_id);
                    }}
                  >
                    Open panel
                  </button>
                </div>

                <div className="td title">
                  <div className="t-title">{r.brief_title || "—"}</div>
                  <div className="t-sub">{r.lead_sponsor || "—"}</div>
                </div>

                <div className="td phase">
                  <span className={phaseClass(p)}>{phaseLabel(p)}</span>
                </div>

                <div className="td area">{r.disease_area || "Other"}</div>
                <div className="td cond">{r.condition_first || "—"}</div>
                <div className="td intv">{r.intervention_first || "—"}</div>

                <div className="td status">
                  <span className="chip chip-neutral">
                    {(r.overall_status || "UNKNOWN").toUpperCase()}
                  </span>
                </div>

                <div className="td bucket">
                  <span className={bucketClass(bucket)}>{bucket}</span>
                </div>

                <div className="td why">
                  <div className="why-clamp">{why || "—"}</div>
                </div>

                <div className="td">
                  <span style={{ color: "var(--text-muted)", fontWeight: 700 }}>
                    {lastUpdated || "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="note">
          Tip: scroll vertically inside the table; use horizontal scroll to view all columns.
        </div>
      </div>
    </div>
  );
}
