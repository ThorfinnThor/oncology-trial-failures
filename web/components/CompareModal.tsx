import { TrialRow } from "@/lib/types";
import { Modal } from "./Modal";
import { normalizePhase, reasonBucket } from "@/lib/filtering";
import { splitSemicolonValues } from "@/lib/data";
import { ConfidencePill, ReasonPill, Pill } from "./Badges";

function row(label: string, values: string[]) {
  const uniq = new Set(values.map((v) => (v || "—").trim()));
  const differs = uniq.size > 1;

  return (
    <div className="grid grid-cols-[220px_1fr] gap-3 border-b py-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</div>
      <div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}>
        {values.map((v, i) => (
          <div key={i} className={`text-sm ${differs ? "font-semibold text-gray-900" : "text-gray-800"}`}>
            {v || "—"}
          </div>
        ))}
      </div>
    </div>
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  trials: TrialRow[];
  onRemove: (id: string) => void;
};

export function CompareModal({ open, onClose, trials, onRemove }: Props) {
  return (
    <Modal title={`Compare trials (${trials.length})`} open={open} onClose={onClose}>
      {trials.length < 2 ? (
        <div className="text-sm text-gray-700">Select at least 2 trials to compare.</div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {trials.map((t) => (
              <div key={t.nct_id} className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
                <Pill>{t.nct_id}</Pill>
                <button
                  className="rounded-lg border px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => onRemove(t.nct_id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {row("Phase", trials.map((t) => normalizePhase(t.phases || "")[0] || "Unknown"))}
          {row("Status", trials.map((t) => (t.overall_status || "—").toUpperCase()))}
          {row("Disease area", trials.map((t) => t.disease_area || "Other"))}
          {row("Sponsor", trials.map((t) => t.lead_sponsor || "—"))}
          {row("Intervention", trials.map((t) => splitSemicolonValues(t.intervention_names || "")[0] || "—"))}
          {row("Condition", trials.map((t) => splitSemicolonValues(t.conditions || "")[0] || "—"))}
          {row("Date (last update)", trials.map((t) => t.last_update_post_date || "—"))}

          <div className="grid grid-cols-[220px_1fr] gap-3 border-b py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Reason</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${trials.length}, minmax(0, 1fr))` }}>
              {trials.map((t) => (
                <div key={t.nct_id} className="text-sm">
                  <ReasonPill value={reasonBucket(t)} />
                  <div className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">{t.why_stopped || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[220px_1fr] gap-3 py-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Bio-failure explanation</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${trials.length}, minmax(0, 1fr))` }}>
              {trials.map((t) => (
                <div key={t.nct_id} className="text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Pill>{t.classification_label || "—"}</Pill>
                    <ConfidencePill value={t.classification_confidence || "—"} />
                  </div>
                  <div className="mt-2 text-xs text-gray-600">{t.classification_evidence || "—"}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            Differences are emphasized via typography (not color). Verify details using primary sources.
          </div>
        </div>
      )}
    </Modal>
  );
}
