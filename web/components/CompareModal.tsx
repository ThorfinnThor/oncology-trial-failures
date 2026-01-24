import Link from "next/link";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

type Props = {
  open: boolean;
  onClose: () => void;
  trials: TrialIndexRow[];
  onRemove: (id: string) => void;
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</div>
      {children}
    </div>
  );
}

function fieldRow(label: string, values: string[]) {
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="p-3 align-top text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] w-[180px]">
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className="p-3 align-top text-sm text-[var(--text)]">
          {v || "—"}
        </td>
      ))}
    </tr>
  );
}

export default function CompareModal({ open, onClose, trials, onRemove }: Props) {
  if (!open) return null;
  const cols = trials.slice(0, 5);

  const phases = cols.map((t) => {
    const p = parsePhases(t.phases || "")[0] || "Unknown";
    return phaseLabel(p as any);
  });

  const status = cols.map((t) => (t.overall_status || "—").toUpperCase());
  const sponsor = cols.map((t) => t.lead_sponsor || "—");
  const collab = cols.map((t) => t.collaborators || "—");
  const condition = cols.map((t) => t.condition_first || "—");
  const intervention = cols.map((t) => t.intervention_first || "—");
  const area = cols.map((t) => t.disease_area || "Other");
  const date = cols.map((t) => t.last_update_post_date || "—");
  const bucket = cols.map((t) => reasonBucket(t));
  const conf = cols.map((t) => t.classification_confidence || "—");
  const why = cols.map((t) => t.why_stopped_short || "—");

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Compare trials">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[96vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
          <div>
            <div className="text-xs text-[var(--text-muted)]">Compare</div>
            <div className="mt-1 text-lg font-semibold">Compare selected trials</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              Side-by-side comparison uses the lightweight index view. Open a full page for complete detail text.
            </div>
          </div>
          <button
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-4">
          <Section title="Selected">
            <div className="flex flex-wrap gap-2">
              {cols.map((t) => (
                <div key={t.nct_id} className="flex items-center gap-2">
                  <Pill>{t.nct_id}</Pill>
                  <Link
                    className="text-xs font-semibold text-[var(--accent)] hover:underline"
                    href={`/trial/${encodeURIComponent(t.nct_id)}`}
                    target="_blank"
                  >
                    Open full page
                  </Link>
                  <button
                    className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
                    onClick={() => onRemove(t.nct_id)}
                    type="button"
                    aria-label={`Remove ${t.nct_id} from compare`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </Section>

          <div className="overflow-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-[1000px] w-full bg-white">
              <thead className="bg-[var(--surface-2)]">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] w-[180px]">
                    Field
                  </th>
                  {cols.map((t) => (
                    <th key={t.nct_id} className="p-3 text-left">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">{t.nct_id}</div>
                        <div className="text-xs text-[var(--text-muted)] line-clamp-2">{t.brief_title || "—"}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fieldRow("Phase", phases)}
                {fieldRow("Status", status)}
                {fieldRow("Disease area", area)}
                {fieldRow("Sponsor", sponsor)}
                {fieldRow("Collaborators", collab)}
                {fieldRow("Condition", condition)}
                {fieldRow("Intervention", intervention)}
                {fieldRow("Last update", date)}
                {fieldRow("Reason bucket", bucket)}
                {fieldRow("Confidence", conf)}
                {fieldRow("Why stopped (short)", why)}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-[var(--text-muted)]">
            “Likely scientific failure” and reason buckets are inferred from registry text and may be incomplete. Verify via the primary source link.
          </div>
        </div>
      </div>
    </div>
  );
}
