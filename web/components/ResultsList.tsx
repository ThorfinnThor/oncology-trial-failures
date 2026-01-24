import Link from "next/link";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

function clamp(s: string, n: number) {
  const t = (s || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
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
  const selected = new Set(selectedIds);
  const shown = rows.slice(0, 400);

  return (
    <div className="space-y-3">
      {shown.map((r) => {
        const checked = selected.has(r.nct_id);
        const p = parsePhases(r.phases || "")[0] || "UNKNOWN";
        const why = (r.why_stopped_short || "").trim();

        return (
          <div key={r.nct_id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/trial/${encodeURIComponent(r.nct_id)}?from=${encodeURIComponent(fromHref)}`}
                  className="font-semibold"
                >
                  {r.nct_id}
                </Link>
                <div className="mt-1 font-medium leading-snug break-words">{r.brief_title || "—"}</div>
                <div className="mt-1 text-sm leading-snug break-words" style={{ color: "var(--text-muted)" }}>
                  {r.lead_sponsor || "—"}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <input type="checkbox" checked={checked} onChange={() => onToggleSelect(r.nct_id)} />
                <button className="text-xs text-[var(--accent)] hover:underline" onClick={() => onOpenPanel(r.nct_id)} type="button">
                  Open panel
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip">{phaseLabel(p as any)}</span>
              <span className="chip">{(r.overall_status || "UNKNOWN").toUpperCase()}</span>
              <span className="chip">{reasonBucket(r)}</span>
            </div>

            <div className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-1">Why stopped</div>
              {why ? clamp(why, 260) : "—"}
            </div>
          </div>
        );
      })}

      {rows.length > 400 && (
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          Showing first 400 results on mobile for performance. Use filters/search to narrow further.
        </div>
      )}
    </div>
  );
}
