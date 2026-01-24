import Link from "next/link";
import { TrialRow } from "@/lib/types";
import { Modal } from "./Modal";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { splitSemicolonValues } from "@/lib/data";
import { ConfidencePill, ReasonPill, Pill } from "./Badges";

type Props = {
  open: boolean;
  onClose: () => void;
  trials: TrialRow[];
  onRemove: (id: string) => void;
};

function firstOfSemi(s: string) {
  return splitSemicolonValues(s || "")[0] || "—";
}

function labelOrDash(s?: string) {
  const t = (s || "").trim();
  return t ? t : "—";
}

function compareRow(label: string, values: string[]) {
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="p-3 align-top text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] w-[180px]">
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="p-3 align-top text-sm text-[var(--text)]">
          {v}
        </td>
      ))}
    </tr>
  );
}

export function CompareModal({ open, onClose, trials, onRemove }: Props) {
  const cols = trials.slice(0, 5); // safety
  const n = cols.length;

  const phaseVals = cols.map((t) => {
    const p = parsePhases(t.phases || "")[0] || "Unknown";
    return phaseLabel(p as any);
  });

  const statusVals = cols.map((t) => (t.overall_status || "—").toUpperCase());
  const sponsorVals = cols.map((t) => labelOrDash(t.lead_sponsor));
  const collabVals = cols.map((t) => labelOrDash(t.collaborators));
  const conditionVals = cols.map((t) => firstOfSemi(t.conditions || ""));
  const interventionVals = cols.map((t) => firstOfSemi(t.intervention_names || ""));
  const dateVals = cols.map((t) => labelOrDash(t.last_update_post_date));

  const bucketVals = cols.map((t) => reasonBucket(t));
  const whyVals = cols.map((t) => labelOrDash(t.why_stopped));
  const confVals = cols.map((t) => labelOrDash(t.classification_confidence));

  return (
    <Modal title={`Compare (${n}/5)`} open={open} onClose={onClose}>
      <div className="space-y-3">
        {n < 2 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-muted)]">
            Select 2–5 trials to compare.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-auto">
              <table className="min-w-[900px] w-full">
                <thead className="bg-[var(--surface-2)]">
                  <tr>
                    <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] w-[180px]">
                      Field
                    </th>
                    {cols.map((t) => (
                      <th key={t.nct_id} className="p-3 text-left">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Pill>{t.nct_id}</Pill>
                              <ReasonPill value={reasonBucket(t)} />
                              <ConfidencePill value={t.classification_confidence || "—"} />
                            </div>
                            <div className="mt-2 text-sm font-semibold text-[var(--text)] line-clamp-2">
                              {t.brief_title || "—"}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <a
                                className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                                href={t.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Source
                              </a>
                              <span className="text-xs text-[var(--text-muted)]">•</span>
                              <Link
                                className="text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                                href={`/trial/${encodeURIComponent(t.nct_id)}`}
                              >
                                Open full page
                              </Link>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                            onClick={() => onRemove(t.nct_id)}
                            aria-label={`Remove ${t.nct_id} from compare`}
                          >
                            Remove
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {compareRow("Phase", phaseVals)}
                  {compareRow("Status", statusVals)}
                  {compareRow("Sponsor", sponsorVals)}
                  {compareRow("Collaborators", collabVals)}
                  {compareRow("Condition", conditionVals)}
                  {compareRow("Intervention", interventionVals)}
                  {compareRow("Last update", dateVals)}

                  <tr className="border-t border-[var(--border)]">
                    <td className="p-3 align-top text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] w-[180px]">
                      Reason bucket
                    </td>
                    {bucketVals.map((b, i) => (
                      <td key={i} className="p-3 align-top">
                        <ReasonPill value={b as any} />
                      </td>
                    ))}
                  </tr>

                  <tr className="border-t border-[var(--border)]">
                    <td className="p-3 align-top text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] w-[180px]">
                      Confidence
                    </td>
                    {confVals.map((c, i) => (
                      <td key={i} className="p-3 align-top">
                        <ConfidencePill value={c} />
                      </td>
                    ))}
                  </tr>

                  <tr className="border-t border-[var(--border)]">
                    <td className="p-3 align-top text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] w-[180px]">
                      Stated stop reason
                    </td>
                    {whyVals.map((w, i) => (
                      <td key={i} className="p-3 align-top text-sm text-[var(--text)]">
                        <div className="max-h-56 overflow-auto whitespace-pre-wrap leading-relaxed">
                          {w}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-xs text-[var(--text-muted)]">
              Differences are shown as side-by-side values. “Likely scientific failure” is inferred from registry text; verify using primary sources.
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
