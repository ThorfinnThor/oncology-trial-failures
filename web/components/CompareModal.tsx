// web/components/CompareModal.tsx

import Link from "next/link";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

type Props = {
  open: boolean;
  onClose: () => void;
  trials: TrialIndexRow[];
  onRemove: (id: string) => void;
};

function fieldRow(label: string, values: string[]) {
  return (
    <tr>
      <td
        style={{
          padding: "12px",
          verticalAlign: "top",
          width: 180,
          fontSize: 12,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border)"
        }}
      >
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          style={{
            padding: "12px",
            verticalAlign: "top",
            fontSize: 13,
            color: "var(--text)",
            borderTop: "1px solid var(--border)"
          }}
        >
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
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Compare selected trials">
      <div className="overlay" onClick={onClose} />

      <div className="modal">
        <div className="modal-hd">
          <div style={{ minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 12 }}>Compare</div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900 }}>Compare selected trials</div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Select 2–5 trials using the checkbox column, then compare side-by-side.
            </div>
          </div>

          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modal-bd">
          {cols.length < 2 ? (
            <div className="card p-4">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Nothing to compare yet</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Select at least 2 trials via the “Sel” checkbox column.
              </div>
            </div>
          ) : (
            <>
              <div className="card p-4" style={{ marginBottom: 14 }}>
                <div className="facet-title">Selected</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {cols.map((t) => (
                    <div key={t.nct_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="chip">{t.nct_id}</span>
                      <Link
                        href={`/trial/${encodeURIComponent(t.nct_id)}`}
                        target="_blank"
                        style={{ fontSize: 12, fontWeight: 900, color: "var(--accent)" }}
                      >
                        Open full page
                      </Link>
                      <button
                        type="button"
                        onClick={() => onRemove(t.nct_id)}
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          color: "var(--text-muted)",
                          background: "transparent",
                          border: 0,
                          cursor: "pointer"
                        }}
                        aria-label={`Remove ${t.nct_id} from compare`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ overflow: "auto" }}>
                <table style={{ minWidth: 1000, width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead style={{ background: "var(--surface-2)" }}>
                    <tr>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                          color: "var(--text-muted)",
                          width: 180,
                          borderBottom: "1px solid var(--border)"
                        }}
                      >
                        Field
                      </th>
                      {cols.map((t) => (
                        <th
                          key={t.nct_id}
                          style={{ padding: "12px", textAlign: "left", borderBottom: "1px solid var(--border)" }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 900 }}>{t.nct_id}</div>
                          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                            {(t.brief_title || "—").slice(0, 120)}
                            {(t.brief_title || "").length > 120 ? "…" : ""}
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

              <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                Buckets/labels are inferred from registry text and may be incomplete.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
