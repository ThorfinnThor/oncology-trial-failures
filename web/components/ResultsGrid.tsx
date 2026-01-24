import Link from "next/link";
import { useMemo, useState } from "react";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel } from "@/lib/filtering";

function clamp2Style(color: string): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: 2,
    overflow: "hidden",
    color
  } as any;
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
            <th className="p-3 text-left w-[140px]">Phase</th>
            <th className="p-3 text-left w-[240px]">Condition</th>
            <th className="p-3 text-left w-[240px]">Intervention</th>
            <th className="p-3 text-left w-[160px]">Status</th>
            <th className="p-3 text-left w-[210px]">Why stopped</th>
            <th className="p-3 text-left w-[110px]">Date</th>
          </tr>
        </thead>

        <tbody>
          {shown.map((r) => {
            const checked = selected.has(r.nct_id);
            const p = parsePhases(r.phases || "")[0] || "UNKNOWN";
            const why = (r.why_stopped_short || "").trim();

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
                      onClick={() => onOpenPanel(r.nct_id)}
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
                  <span className="chip">{phaseLabel(p as any)}</span>
                </td>

                <td className="p-3 align-top whitespace-normal break-words">{r.condition_first || "—"}</td>
                <td className="p-3 align-top whitespace-normal break-words">{r.intervention_first || "—"}</td>

                <td className="p-3 align-top">
                  <span className="chip">{(r.overall_status || "UNKNOWN").toUpperCase()}</span>
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

                <td className="p-3 align-top text-sm tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {r.last_update_post_date || "—"}
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
