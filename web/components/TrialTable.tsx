import Link from "next/link";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

type Props = {
  rows: TrialIndexRow[];
  fromHref?: string;
  onOpenPanel?: (id: string) => void;
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">
      {children}
    </span>
  );
}

/**
 * TrialTable (compat)
 * - Updated to TrialIndexRow
 * - No dependency on old TrialRow
 * - Keeps “Open panel” affordance if provided
 */
export default function TrialTable({ rows, fromHref, onOpenPanel }: Props) {
  return (
    <div className="overflow-auto rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-soft)]">
      <table className="min-w-[1100px] w-full">
        <thead className="sticky top-0 bg-[var(--surface-2)] border-b border-[var(--border)]">
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            <th className="p-3">Trial</th>
            <th className="p-3">Title</th>
            <th className="p-3">Phase</th>
            <th className="p-3">Condition</th>
            <th className="p-3">Intervention</th>
            <th className="p-3">Status</th>
            <th className="p-3">Reason</th>
            <th className="p-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ph = parsePhases(r.phases || "")[0] || "Unknown";
            return (
              <tr key={r.nct_id} className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]">
                <td className="p-3 align-top">
                  <div className="text-sm font-semibold">
                    <Link
                      href={`/trial/${encodeURIComponent(r.nct_id)}${fromHref ? `?from=${encodeURIComponent(fromHref)}` : ""}`}
                      className="text-[var(--accent)]"
                    >
                      {r.nct_id}
                    </Link>
                  </div>
                  {onOpenPanel && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                      onClick={() => onOpenPanel(r.nct_id)}
                    >
                      Open panel
                    </button>
                  )}
                </td>

                <td className="p-3 align-top min-w-[360px]">
                  <div className="text-sm font-semibold leading-snug">{r.brief_title || "—"}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{r.lead_sponsor || "—"}</div>
                </td>

                <td className="p-3 align-top text-sm">{phaseLabel(ph as any)}</td>
                <td className="p-3 align-top text-sm">{r.condition_first || "—"}</td>
                <td className="p-3 align-top text-sm">{r.intervention_first || "—"}</td>
                <td className="p-3 align-top text-sm">{(r.overall_status || "—").toUpperCase()}</td>

                <td className="p-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    <Pill>{reasonBucket(r)}</Pill>
                    {r.classification_label === "BIOLOGICAL_FAILURE" && <Pill>Likely scientific failure</Pill>}
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-muted)]">
                    <span className="font-semibold">Why stopped:</span>{" "}
                    <span title={r.why_stopped_short || ""}>{r.why_stopped_short || "—"}</span>
                  </div>
                </td>

                <td className="p-3 align-top text-sm">{r.last_update_post_date || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
