import Link from "next/link";
import { TrialRow } from "@/lib/types";

type Props = {
  rows: TrialRow[];
};

function badgeClass(v: string) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  if (v === "HIGH") return `${base} bg-green-100 text-green-800`;
  if (v === "MEDIUM") return `${base} bg-yellow-100 text-yellow-800`;
  if (v === "LOW") return `${base} bg-gray-100 text-gray-800`;
  return `${base} bg-gray-100 text-gray-800`;
}

export function TrialTable({ rows }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="overflow-auto">
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">NCT</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Sponsor</th>
              <th className="px-4 py-3">Last update</th>
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
                <td className="px-4 py-3">{r.classification_reason}</td>
                <td className="px-4 py-3">
                  <span className={badgeClass(r.classification_confidence)}>{r.classification_confidence}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">{r.lead_sponsor || "—"}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{r.last_update_post_date || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No results. Try clearing filters or broadening your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
