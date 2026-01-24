import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { splitSemicolonValues } from "@/lib/data";
import { TrialRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { ConfidencePill, ReasonPill, Pill } from "./Badges";
import { Tooltip } from "./Tooltip";

type Props = {
  rows: TrialRow[];
  openTrialId?: string;

  onOpen: (id: string) => void;
  compare: string[];
  setCompare: (ids: string[]) => void;

  exploreReturnPath: string; // used for /trial/[id]?from=
};

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function clampCompare(ids: string[]) {
  const uniq = Array.from(new Set(ids));
  return uniq.slice(0, 5);
}

function excerpt(s: string, n = 110) {
  const t = (s || "").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1) + "…";
}

export function ResultsGrid({ rows, onOpen, compare, setCompare, openTrialId, exploreReturnPath }: Props) {
  const [focused, setFocused] = useState(0);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  useEffect(() => {
    setFocused((f) => Math.min(f, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  useEffect(() => {
    const el = rowRefs.current[focused];
    el?.focus?.();
  }, [focused]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((f) => Math.min(rows.length - 1, f + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((f) => Math.max(0, f - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = rows[focused];
      if (r?.nct_id) onOpen(r.nct_id);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
      <div className="overflow-auto" onKeyDown={onKeyDown}>
        <table className="min-w-[1400px] w-full text-left text-sm">
          <thead className="sticky top-0 bg-[var(--surface-2)] text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 w-10">Sel</th>
              <th className="px-4 py-3 w-28">Trial</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3 w-28">Phase</th>
              <th className="px-4 py-3 w-220">Condition</th>
              <th className="px-4 py-3 w-220">Intervention</th>
              <th className="px-4 py-3 w-240">Sponsor</th>
              <th className="px-4 py-3 w-140">Status</th>
              <th className="px-4 py-3 w-260">Stated stop reason</th>
              <th className="px-4 py-3 w-140">Date</th>
              <th className="px-4 py-3 w-170">Flags</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--border)]">
            {rows.map((r, idx) => {
              const firstCond = splitSemicolonValues(r.conditions || "")[0] || "—";
              const firstInt = splitSemicolonValues(r.intervention_names || "")[0] || "—";
              const phKey = parsePhases(r.phases || "")[0] || "Unknown";
              const bucket = reasonBucket(r);
              const isOpen = openTrialId === r.nct_id;

              const trialHref = `/trial/${encodeURIComponent(r.nct_id)}?from=${encodeURIComponent(exploreReturnPath)}`;

              return (
                <tr
                  key={r.nct_id}
                  ref={(el) => { rowRefs.current[idx] = el; }}
                  tabIndex={0}
                  className={`hover:bg-[var(--row-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] ${isOpen ? "bg-[var(--row-hover)]" : ""}`}
                  onClick={() => onOpen(r.nct_id)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.nct_id} for compare`}
                      checked={compare.includes(r.nct_id)}
                      onChange={() => setCompare(clampCompare(toggle(compare, r.nct_id)))}
                      className="accent-[var(--accent-primary)]"
                    />
                  </td>

                  <td className="px-4 py-3 font-mono text-xs" onClick={(e) => e.stopPropagation()}>
                    <Link className="text-[var(--accent-primary)] hover:underline" href={trialHref}>
                      {r.nct_id}
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-[var(--text)] line-clamp-2" title={r.brief_title || ""}>
                      {r.brief_title || "—"}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                      {excerpt(r.lead_sponsor || "", 120)}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <Pill>{phaseLabel(phKey as any)}</Pill>
                  </td>

                  <td className="px-4 py-3" title={r.conditions || ""}>
                    {excerpt(firstCond, 70)}
                  </td>

                  <td className="px-4 py-3" title={r.intervention_names || ""}>
                    {excerpt(firstInt, 70)}
                  </td>

                  <td className="px-4 py-3" title={r.lead_sponsor || ""}>
                    {excerpt(r.lead_sponsor || "—", 80)}
                    {r.collaborators ? (
                      <div className="mt-1 text-xs text-[var(--text-muted)]" title={r.collaborators}>
                        Collab: {excerpt(r.collaborators, 80)}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-3">
                    <Pill>{(r.overall_status || "—").toUpperCase()}</Pill>
                  </td>

                  {/* Why stopped: 2-line clamp + tooltip */}
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-start gap-2">
                      <ReasonPill value={bucket} />
                      <div className="flex-1 min-w-0">
                        <Tooltip label="Full stated stop reason" content={r.why_stopped || ""}>
                          <div className="text-xs text-[var(--text)] leading-relaxed line-clamp-2">
                            {r.why_stopped ? r.why_stopped : "—"}
                            {r.why_stopped && r.why_stopped.length > 140 ? (
                              <span className="ml-2 text-[11px] font-semibold text-[var(--accent-primary)]">More</span>
                            ) : null}
                          </div>
                        </Tooltip>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-xs text-[var(--text)]">
                    {r.last_update_post_date || "—"}
                  </td>

                  <td className="px-4 py-3">
                    {r.classification_label === "BIOLOGICAL_FAILURE" ? (
                      <div className="flex flex-col gap-1">
                        <Pill>Likely scientific failure</Pill>
                        <ConfidencePill value={r.classification_confidence || "—"} />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <Pill>—</Pill>
                        <ConfidencePill value={r.classification_confidence || "—"} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                  No results. Try clearing some filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--text-muted)]">
        Tip: Use ↑/↓ to move, Enter to open details. Select 2–5 trials to compare. Trial ID opens the full detail page.
      </div>
    </div>
  );
}
