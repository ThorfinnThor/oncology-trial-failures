import { shortExcerpt, splitSemicolonValues } from "@/lib/data";
import { mapReasonBucket } from "@/lib/workbench";
import { TrialRow } from "@/lib/types";

type Props = {
  rows: TrialRow[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpen: (id: string) => void;
  focusedId: string | null;
  setFocusedId: (id: string) => void;
};

function badge(text: string) {
  return <span className="inline-flex items-center rounded-full border bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-700">{text}</span>;
}

function confBadge(c: string) {
  const v = (c || "").toUpperCase();
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold";
  if (v === "HIGH") return <span className={`${base} border-green-200 bg-green-50 text-green-800`}>High</span>;
  if (v === "MEDIUM") return <span className={`${base} border-yellow-200 bg-yellow-50 text-yellow-800`}>Med</span>;
  if (v === "LOW") return <span className={`${base} border-gray-200 bg-gray-50 text-gray-700`}>Low</span>;
  return <span className={`${base} border-gray-200 bg-gray-50 text-gray-700`}>{v || "—"}</span>;
}

export function ResultsGrid({ rows, selectedIds, onToggleSelect, onOpen, focusedId, setFocusedId }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="overflow-auto">
        <table className="min-w-[1200px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-3 w-10"></th>
              <th className="px-3 py-3">Trial</th>
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Phase</th>
              <th className="px-3 py-3">Condition</th>
              <th className="px-3 py-3">Intervention</th>
              <th className="px-3 py-3">Sponsor</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Reason</th>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Conf.</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {rows.map((r) => {
              const id = r.nct_id;
              const selected = selectedIds.has(id);
              const isFocused = focusedId === id;

              const phase = splitSemicolonValues(r.phases || "")[0] || "—";
              const cond = splitSemicolonValues(r.conditions || "")[0] || "—";
              const intr = splitSemicolonValues(r.intervention_names || "")[0] || "—";
              const reasonBucket = mapReasonBucket(r);

              return (
                <tr
                  key={id}
                  tabIndex={0}
                  className={`hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 ${isFocused ? "bg-gray-50" : ""}`}
                  onFocus={() => setFocusedId(id)}
                  onClick={() => onOpen(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onOpen(id);
                    if (e.key === " ") {
                      e.preventDefault();
                      onToggleSelect(id);
                    }
                  }}
                  aria-label={`Trial ${id}`}
                >
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleSelect(id)}
                      aria-label={`Select ${id} for compare`}
                    />
                  </td>

                  <td className="px-3 py-3 font-mono text-xs text-blue-700">
                    {id}
                  </td>

                  <td className="px-3 py-3">
                    <div className="font-medium text-gray-900 line-clamp-2" title={r.brief_title}>
                      {r.brief_title || "—"}
                    </div>
                    <div className="mt-1 text-xs text-gray-500" title={r.why_stopped}>
                      {shortExcerpt(r.why_stopped || "", 120) || "—"}
                    </div>
                  </td>

                  <td className="px-3 py-3">{badge(phase)}</td>
                  <td className="px-3 py-3" title={r.conditions}>{cond}</td>
                  <td className="px-3 py-3" title={r.intervention_names}>{intr}</td>
                  <td className="px-3 py-3" title={`${r.lead_sponsor || ""}\n${r.collaborators || ""}`}>
                    <div className="line-clamp-1">{r.lead_sponsor || "—"}</div>
                    {r.collaborators ? <div className="mt-1 text-xs text-gray-500 line-clamp-1">{r.collaborators}</div> : null}
                  </td>

                  <td className="px-3 py-3">{badge((r.overall_status || "—").toUpperCase())}</td>

                  <td className="px-3 py-3">
                    {badge(reasonBucket)}
                  </td>

                  <td className="px-3 py-3 font-mono text-xs">{r.last_update_post_date || "—"}</td>

                  <td className="px-3 py-3" title={r.classification_evidence || ""}>
                    {confBadge(r.classification_confidence)}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-gray-600" colSpan={11}>
                  No results for the current filters. Try clearing some filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
