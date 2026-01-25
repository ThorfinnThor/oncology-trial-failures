import Link from "next/link";
import { useMemo, useState, useCallback } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
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
  if (b === "ENROLLMENT") return "chip chip-bucket-enrollment";
  if (b === "FUNDING") return "chip chip-bucket-funding";
  if (b === "REGULATORY") return "chip chip-bucket-regulatory";
  if (b === "STRATEGIC") return "chip chip-bucket-strategic";
  if (b === "OPERATIONAL") return "chip chip-bucket-operational";
  return "chip chip-neutral";
}

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
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Virtualize against the window scroll so we can render all rows without capping.
  const rowVirtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 104,
    overscan: 10
  });

  const virtualItems = rowVirtualizer.getVirtualItems();
  const paddingTop = virtualItems.length ? virtualItems[0].start : 0;
  const paddingBottom = virtualItems.length
    ? rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end
    : 0;

  // IMPORTANT: React calls refs with `null` on unmount; make this safe.
  const measureRow = useCallback(
    (el: HTMLTableRowElement | null) => {
      if (el) rowVirtualizer.measureElement(el);
    },
    [rowVirtualizer]
  );

  return (
    <div className="table-scroller">
      <table className="tbl">
        <thead>
          <tr>
            <th className="th sel">Sel</th>
            <th className="th trial">Trial</th>
            <th className="th title">Title</th>
            <th className="th phase">Phase</th>
            <th className="th area">Disease area</th>
            <th className="th cond">Condition</th>
            <th className="th intv">Intervention</th>
            <th className="th status">Status</th>
            <th className="th bucket">Reason</th>
            <th className="th why">Why stopped</th>
          </tr>
        </thead>

        <tbody>
          {paddingTop > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={10} style={{ height: paddingTop, padding: 0, border: 0 }} />
            </tr>
          ) : null}

          {virtualItems.map((v) => {
            const r = rows[v.index];
            const checked = selected.has(r.nct_id);
            const p = parsePhases(r.phases || "")[0] || "UNKNOWN";
            const bucket = reasonBucket(r);
            const why = (r.why_stopped_short || "").trim();

            return (
              <tr
                key={r.nct_id}
                className="tr"
                ref={measureRow}
                data-index={v.index}
              >
                <td className="td sel">
                  <input
                    type="checkbox"
                    checked={checked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleSelect(r.nct_id)}
                    aria-label={`Select ${r.nct_id}`}
                  />
                </td>

                <td className="td trial">
                  <Link
                    href={`/trial/${encodeURIComponent(r.nct_id)}?from=${encodeURIComponent(fromHref)}`}
                    className="link"
                  >
                    {r.nct_id}
                  </Link>

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
                </td>

                <td className="td title">
                  <div className="t-title">{r.brief_title || "—"}</div>
                  <div className="t-sub">{r.lead_sponsor || "—"}</div>
                </td>

                <td className="td phase">
                  <span className={phaseClass(p)}>{phaseLabel(p)}</span>
                </td>

                <td className="td area">{r.disease_area || "Other"}</td>
                <td className="td cond">{r.condition_first || "—"}</td>
                <td className="td intv">{r.intervention_first || "—"}</td>

                <td className="td status">
                  <span className="chip chip-neutral">{(r.overall_status || "UNKNOWN").toUpperCase()}</span>
                </td>

                <td className="td bucket">
                  <span className={bucketClass(bucket)}>{bucket}</span>
                </td>

                <td
                  className="td why"
                  onMouseEnter={() => setHoverId(r.nct_id)}
                  onMouseLeave={() => setHoverId((x) => (x === r.nct_id ? null : x))}
                >
                  <div className="why-clamp">{why || "—"}</div>

                  {why && hoverId === r.nct_id && (
                    <div className="tooltip" role="tooltip">
                      <div className="tooltip-title">Why stopped</div>
                      <div className="tooltip-body">{why}</div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}

          {paddingBottom > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={10} style={{ height: paddingBottom, padding: 0, border: 0 }} />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
