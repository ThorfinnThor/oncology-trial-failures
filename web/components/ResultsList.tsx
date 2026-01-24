import Link from "next/link";
import { TrialRow } from "@/lib/types";
import { splitSemicolonValues } from "@/lib/data";
import { normalizePhase, reasonBucket } from "@/lib/filtering";
import { ConfidencePill, ReasonPill, Pill } from "./Badges";

function excerpt(s: string, n = 140) {
  const t = (s || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
}

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function clampCompare(ids: string[]) {
  const uniq = Array.from(new Set(ids));
  return uniq.slice(0, 5);
}

type Props = {
  rows: TrialRow[];
  onOpen: (id: string) => void;

  compare: string[];
  setCompare: (ids: string[]) => void;
};

export function ResultsList({ rows, onOpen, compare, setCompare }: Props) {
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const ph = normalizePhase(r.phases || "")[0] || "Unknown";
        const bucket = reasonBucket(r);
        const cond = splitSemicolonValues(r.conditions || "")[0] || "—";
        const intv = splitSemicolonValues(r.intervention_names || "")[0] || "—";

        return (
          <div
            key={r.nct_id}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill>{r.nct_id}</Pill>
                  <Pill>{ph}</Pill>
                  <Pill>{(r.overall_status || "—").toUpperCase()}</Pill>
                  <ReasonPill value={bucket} />
                </div>

                <div className="mt-2 text-sm font-semibold text-gray-900 line-clamp-2">
                  {r.brief_title || "—"}
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  <span className="font-semibold">Sponsor:</span> {r.lead_sponsor || "—"}
                </div>

                {r.collaborators ? (
                  <div className="mt-1 text-xs text-gray-600">
                    <span className="font-semibold">Collaborators:</span> {excerpt(r.collaborators, 120)}
                  </div>
                ) : null}

                <div className="mt-2 text-xs text-gray-700">
                  <div><span className="font-semibold">Condition:</span> {excerpt(cond, 120)}</div>
                  <div className="mt-1"><span className="font-semibold">Intervention:</span> {excerpt(intv, 120)}</div>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  {r.last_update_post_date || "—"}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {r.classification_label === "BIOLOGICAL_FAILURE" ? <Pill>Likely bio</Pill> : <Pill>—</Pill>}
                  <ConfidencePill value={r.classification_confidence || "—"} />
                </div>
              </div>

              <div className="flex flex-col gap-2 items-end">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={compare.includes(r.nct_id)}
                    onChange={() => setCompare(clampCompare(toggle(compare, r.nct_id)))}
                    aria-label={`Select ${r.nct_id} for compare`}
                  />
                  Compare
                </label>

                <button
                  className="rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                  onClick={() => onOpen(r.nct_id)}
                  type="button"
                >
                  View details
                </button>

                <Link
                  className="text-xs font-semibold text-blue-700 hover:underline"
                  href={r.url || "#"}
                  target="_blank"
                >
                  Open source
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {rows.length === 0 && (
        <div className="rounded-2xl border bg-white p-6 text-center text-sm text-gray-600 shadow-sm">
          No results. Try clearing some filters.
        </div>
      )}
    </div>
  );
}
