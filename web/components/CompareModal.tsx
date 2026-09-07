// web/components/CompareModal.tsx

import Link from "next/link";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { trialPath } from "@/lib/seoUrls";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

type Props = {
  open: boolean;
  onClose: () => void;
  trials: TrialIndexRow[];
  onRemove: (id: string) => void;
};

function phaseChipClass(phaseKey: string) {
  const p = (phaseKey || "").toUpperCase();
  if (p === "EARLY_PHASE1" || p === "PHASE1") return "chip chip-phase-1";
  if (p === "PHASE1/PHASE2" || p === "PHASE2") return "chip chip-phase-2";
  if (p === "PHASE2/PHASE3" || p === "PHASE3") return "chip chip-phase-3";
  if (p === "PHASE4") return "chip chip-phase-4";
  return "chip chip-neutral";
}

function bucketChipClass(bucket: string) {
  const b = (bucket || "").toUpperCase();
  if (b === "SAFETY") return "chip chip-bucket-safety";
  if (b === "EFFICACY/FUTILITY") return "chip chip-bucket-efficacy";
  if (b === "ENROLLMENT") return "chip chip-bucket-enrollment";
  if (b === "FUNDING") return "chip chip-bucket-funding";
  if (b === "REGULATORY") return "chip chip-bucket-regulatory";
  if (b === "STRATEGIC") return "chip chip-bucket-strategic";
  if (b === "OPERATIONAL") return "chip chip-bucket-operational";
  return "chip chip-neutral";
}

const PAD = 10;
const FIELD_W = 160;
const MIN_COL_W = 210;

function fieldRow(label: string, renderCells: React.ReactNode[]) {
  return (
    <tr>
      <td
        style={{
          padding: `${PAD}px`,
          verticalAlign: "top",
          width: FIELD_W,
          fontSize: 12,
          fontWeight: 900,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border)",
          background: "var(--surface)"
        }}
      >
        {label}
      </td>
      {renderCells.map((node, i) => (
        <td
          key={i}
          style={{
            padding: `${PAD}px`,
            verticalAlign: "top",
            fontSize: 13,
            color: "var(--text)",
            borderTop: "1px solid var(--border)",
            whiteSpace: "normal",
            wordBreak: "break-word",
            lineHeight: 1.35,
            background: "var(--surface)",
            minWidth: MIN_COL_W
          }}
        >
          {node}
        </td>
      ))}
    </tr>
  );
}

export default function CompareModal({ open, onClose, trials, onRemove }: Props) {
  const dialogRef = useDialogBehavior(open, onClose);
  if (!open) return null;

  const cols = trials.slice(0, 5);

  const phaseCells = cols.map((t) => {
    const p = parsePhases(t.phases || "")[0] || "UNKNOWN";
    return <span key={t.nct_id} className={phaseChipClass(p)}>{phaseLabel(p)}</span>;
  });

  const statusCells = cols.map((t) => (
    <span key={t.nct_id} className="chip chip-neutral">{(t.overall_status || "—").toUpperCase()}</span>
  ));
  const areaCells = cols.map((t) => <span key={t.nct_id}>{t.disease_area || "Other"}</span>);
  const sponsorCells = cols.map((t) => <span key={t.nct_id}>{t.lead_sponsor || "—"}</span>);
  const collabCells = cols.map((t) => <span key={t.nct_id}>{t.collaborators || "—"}</span>);
  const conditionCells = cols.map((t) => <span key={t.nct_id}>{t.condition_first || "—"}</span>);
  const interventionCells = cols.map((t) => <span key={t.nct_id}>{t.intervention_first || "—"}</span>);
  const dateCells = cols.map((t) => <span key={t.nct_id}>{t.last_update_post_date || "—"}</span>);

  const bucketCells = cols.map((t) => {
    const b = reasonBucket(t);
    return <span key={t.nct_id} className={bucketChipClass(b)}>{b}</span>;
  });

  const confCells = cols.map((t) => (
    <span key={t.nct_id} className="chip chip-neutral">{t.classification_confidence || "—"}</span>
  ));
  const whyCells = cols.map((t) => (
    <span key={t.nct_id} style={{ color: "var(--text-muted)", lineHeight: 1.35 }}>{t.why_stopped_short || "—"}</span>
  ));

  return (
    <div
      ref={dialogRef}
      className="modal-wrap"
      role="dialog"
      aria-modal="true"
      aria-label="Compare selected trials"
      tabIndex={-1}
    >
      <div className="overlay" onClick={onClose} />

      <div className="modal">
        <div className="modal-hd">
          <div style={{ minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              Compare
            </div>
            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 900 }}>
              Compare selected trials
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              Select 2–5 trials using the checkbox column, then compare side-by-side.
            </div>
          </div>

          <button className="btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {/* KEY FIX: make modal body a flex column and put scrolling on the table card */}
        <div className="modal-bd" style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
          {cols.length < 2 ? (
            <div className="card p-4">
              <div style={{ fontWeight: 900, marginBottom: 6 }}>Nothing to compare yet</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Select at least 2 trials via the “Sel” checkbox column.
              </div>
            </div>
          ) : (
            <>
              <div className="card" style={{ padding: 12 }}>
                <div className="facet-title" style={{ marginBottom: 8 }}>
                  Selected
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {cols.map((t) => (
                    <div key={t.nct_id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="chip">{t.nct_id}</span>
                      <Link
                        href={trialPath(t)}
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

              {/* This is now the main scrollable area, so lower parts are always reachable on mobile */}
              <div className="card" style={{ overflow: "auto", flex: "1 1 auto", minHeight: 0 }}>
                <table
                  style={{
                    minWidth: FIELD_W + cols.length * MIN_COL_W,
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: 0
                  }}
                >
                  <thead style={{ background: "var(--surface-2)" }}>
                    <tr>
                      <th
                        style={{
                          padding: `${PAD}px`,
                          textAlign: "left",
                          fontSize: 12,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                          color: "var(--text-muted)",
                          width: FIELD_W,
                          borderBottom: "1px solid var(--border)",
                          verticalAlign: "top"
                        }}
                      >
                        Field
                      </th>

                      {cols.map((t) => (
                        <th
                          key={t.nct_id}
                          style={{
                            padding: `${PAD}px`,
                            textAlign: "left",
                            borderBottom: "1px solid var(--border)",
                            verticalAlign: "top",
                            minWidth: MIN_COL_W
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 900,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "100%"
                            }}
                            title={t.nct_id}
                          >
                            {t.nct_id}
                          </div>

                          <div
                            className="muted"
                            style={{
                              fontSize: 12,
                              marginTop: 6,
                              lineHeight: 1.25,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden"
                            }}
                          >
                            {t.brief_title || "—"}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {fieldRow("Phase", phaseCells)}
                    {fieldRow("Status", statusCells)}
                    {fieldRow("Disease area", areaCells)}
                    {fieldRow("Sponsor", sponsorCells)}
                    {fieldRow("Collaborators", collabCells)}
                    {fieldRow("Condition", conditionCells)}
                    {fieldRow("Intervention", interventionCells)}
                    {fieldRow("Last update", dateCells)}
                    {fieldRow("Reason bucket", bucketCells)}
                    {fieldRow("Confidence", confCells)}
                    {fieldRow("Why stopped (short)", whyCells)}
                  </tbody>
                </table>
              </div>

              <div className="muted" style={{ fontSize: 12 }}>
                Buckets/labels are inferred from registry text and may be incomplete.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
