import Link from "next/link";
import { useMemo, useState } from "react";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

function clamp2Style(color: string): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
    color
  } as any;
}

function phaseClass(phaseKey: string) {
  const p = (phaseKey || "").toUpperCase();
  if (p === "EARLY_PHASE1" || p === "PHASE1") return "chip-phase-1";
  if (p === "PHASE1/PHASE2" || p === "PHASE2") return "chip-phase-2";
  if (p === "PHASE2/PHASE3" || p === "PHASE3") return "chip-phase-3";
  if (p === "PHASE4") return "chip-phase-4";
  return "chip-neutral";
}

function bucketClass(bucket: string) {
  const b = (bucket || "").toUpperCase();
  if (b === "SAFETY") return "chip-bucket-safety";
  if (b === "EFFICACY/FUTILITY") return "chip-bucket-efficacy";
  if (b === "ENROLLMENT") return "chip-bucket-enrollment";
  if (b === "FUNDING") return "chip-bucket-funding";
  if (b === "REGULATORY") return "chip-bucket-regulatory";
  if (b === "STRATEGIC") return "chip-bucket-strategic";
  if (b === "OPERATIONAL") return "chip-bucket-operational";
  return "chip-neutral";
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

  const shown = rows.slice(0, 2000);

  return (
    <div className="overflow-auto">
      <table className="w-full table-fixed text-sm">
        <thead className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: "var(--border)" }}>
          <tr className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            <th className="p-3 text-left w-[52px]">Sel</th>
            <th className="p-3 text-left w-[140px]">Trial</th>
            <th className="p-3 text-left w-[420px]">Title</th>
            <th className="p-3 text-left w-[150px]">Phase</th>
            <th className="p-3 text-left w-[180px]">Disease area</th>
            <th className="p-3 text-left w-[260px]">Condition</th>
            <th className="p-3 text-left w-[220px]">Intervention</th>
            <th className="p-3 text-left w-[160px]">Status</th>
            <th className="p-3 text-left w-[180px]">Reason</th>
            <th className="p-3 text-left w-[260px]">Why stopped</th>
          </tr>
        </thead>

        <tbody>
          {shown.map((r) => {
            const checked = selected.has(r.nct_id);
            const p = parsePhases(r.phases || "")[0] || "UNKNOWN";
            const why = (r.why_stopped_short || "").trim();
            const bucket = reasonBucket(r);

            return (
              <tr
                key={r.nct_id}
                className="border-b hover:bg-slate-50"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="p-3 align-top">
                  <input
                    type="checkbox"
                    checked={checked}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleSelect(r.nct_id)}
                    aria-label={`Select ${r.nct_id}`}
                  />
                </td>

                <td className="p-3 align-top">
                  <Link
                    href={`/trial/${encodeURIComponent(r.nct_id)}?from=${encodeURIComponent(fromHref)}`}
                    className="font-semibold"
                  >
                    {r.nct_id}
                  </Link>
                  <div className="mt-1">
                    <button
                      className="text-xs text-[var(--accent)] hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPanel(r.nct_id);
                      }}
                      type="button"
                    >
                      Open panel
                    </button>
                  </div>
                </td>

                <td className="p-3 align-top">
                  <div className="font-medium leading-snug whitespace-normal break-words">
                    {r.brief_title || "—"}
                  </div>
                  <div className="mt-1 text-xs leading-snug whitespace-normal break-words" style={{ color: "var(--text-muted)" }}>
                    {r.lead_sponsor || "—"}
                  </div>
                </td>

                <td className="p-3 align-top">
                  <span className={`chip ${phaseClass(String(p))}`}>{phaseLabel(p as any)}</span>
                </td>

                <td className="p-3 align-top whitespace-normal break-words">
                  {r.disease_area || "Other"}
                </td>

                <td className="p-3 align-top whitespace-normal break-words">{r.condition_first || "—"}</td>
                <td className="p-3 align-top whitespace-normal break-words">{r.intervention_first || "—"}</td>

                <td className="p-3 align-top">
                  <span className="chip chip-neutral">{(r.overall_status || "UNKNOWN").toUpperCase()}</span>
                </td>

                <td className="p-3 align-top">
                  <span className={`chip ${bucketClass(bucket)}`}>{bucket}</span>
                </td>

                <td
                  className="p-3 align-top relative"
                  onMouseEnter={() => setHoverId(r.nct_id)}
                  onMouseLeave={() => setHoverId((x) => (x === r.nct_id ? null : x))}
                >
                  <div style={clamp2Style("var(--text-muted)")} className="text-sm leading-snug">
                    {why || "—"}
                  </div>

                  {why && hoverId === r.nct_id && (
                    <div
                      className="absolute right-0 mt-2 w-[420px] max-w-[90vw] rounded-xl border bg-white p-3 shadow-lg z-20"
                      style={{ borderColor: "var(--border)" }}
                      role="tooltip"
                    >
                      <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
                        Why stopped
                      </div>
                      <div className="text-sm leading-relaxed whitespace-normal break-words">{why}</div>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {rows.length > 2000 && (
        <div className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Showing first 2,000 rows for performance. Use filters/search to narrow further.
        </div>
      )}
    </div>
  );
}
