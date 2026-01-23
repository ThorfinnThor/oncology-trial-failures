import Link from "next/link";
import { TrialRow } from "@/lib/types";

type Props = {
  rows: TrialRow[];
};

function confBadge(v: string) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border";
  if (v === "HIGH") return `${base} border-green-200 bg-green-50 text-green-800`;
  if (v === "MEDIUM") return `${base} border-yellow-200 bg-yellow-50 text-yellow-800`;
  if (v === "LOW") return `${base} border-gray-200 bg-gray-50 text-gray-700`;
  return `${base} border-gray-200 bg-gray-50 text-gray-700`;
}

function reasonPill(v: string) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";
  if (v === "SAFETY") return `${base} bg-red-50 text-red-700`;
  if (v === "EFFICACY/FUTILITY") return `${base} bg-blue-50 text-blue-700`;
  if (v === "OPERATIONAL") return `${base} bg-gray-100 text-gray-700`;
  return `${base} bg-gray-100 text-gray-700`;
}

export function TrialTable({ rows }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="overflow-auto">
        <table className="min-w-[1250px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">NCT</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Disease area</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Sponsor</th>
              <th className="px-4 py-3">Collaborators</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3">Conf.</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.nct_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">
                  <Link className="text-blue-700 hover:underline" href={`/trial/${encodeURIComponent(r.nct_id)}`}>
                    {r.nct_id}
                  </Link>
                </td>

                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 line-clamp-2">{r.brief_title}</div>
                  <div className="mt-1 text-xs text-gray-500 line-clamp-2">{r.why_stopped}</div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-gray-900">{r.disease_area || "Other"}</div>
                  {r.disease_areas_matched ? (
                    <div className="mt-1 text-xs text-gray-500 line-clamp-2">{r.disease_areas_matched}</div>
                  ) : null}
                </td>

                <td className="px-4 py-3">
                  <span className={reasonPill(r.classification_reason)}>{r.classification_reason}</span>
                </td>

                <td className="px-4 py-3">
                  <div className="text-gray-900 line-clamp-2">{r.lead_sponsor || "—"}</div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-gray-900 line-clamp-2">{r.collaborators || "—"}</div>
                </td>

                <td className="px-4 py-3 font-mono text-xs">{r.last_update_post_date || "—"}</td>

                <td className="px-4 py-3">
                  <span className={confBadge(r.classification_confidence)} title={r.classification_evidence || ""}>
                    {r.classification_confidence || "—"}
                  </span>
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  No results. Adjust filters or broaden your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
