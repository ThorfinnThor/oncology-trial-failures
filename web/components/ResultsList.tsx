import Link from "next/link";
import { TrialIndexRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

function phaseClass(phaseKey: string) {
  const p = (phaseKey || "").toUpperCase();
  if (p === "EARLY_PHASE1" || p === "PHASE1") return "chip chip-phase-1";
  if (p === "PHASE1/PHASE2" || p === "PHASE2") return "chip chip-phase-2";
  if (p === "PHASE2/PHASE3" || p === "PHASE3") return "chip chip-phase-3";
  if (p === "PHASE4") return "chip chip-phase-4";
  return "chip chip-neutral";
}

function bucketClass(bucket: string) {
  const b = (bucket || "").toUpperCase();
  if (b === "SAFETY") return "chip chip-bucket-safety";
  if (b === "EFFICACY/FUTILITY") return "chip chip-bucket-efficacy";
  return "chip chip-neutral";
}

export default function ResultsList({
  rows,
  selectedIds,
  onToggleSelect,
  onOpenPanel,
  fromHref
}: {
  rows: TrialIndexRow[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpenPanel: (id: string) => void;
  fromHref: string;
}) {
  const selected = new Set(selectedIds);
  const shown = rows.slice(0, 400);

  return (
    <div className="m-list">
      {shown.map((r) => {
        const checked = selected.has(r.nct_id);
        const p = parsePhases(r.phases || "")[0] || "UNKNOWN";
        const bucket = reasonBucket(r);
        const why = (r.why_stopped_short || "").trim();

        return (
          <div key={r.nct_id} className="m-card">
            <div className="m-head">
              <div className="m-id">
                <Link href={`/trial/${encodeURIComponent(r.nct_id)}?from=${encodeURIComponent(fromHref)}`} className="link">
                  {r.nct_id}
                </Link>
                <div className="m-title">{r.brief_title || "—"}</div>
                <div className="m-sub">{r.lead_sponsor || "—"}</div>
              </div>

              <div className="m-actions">
                <input
                  type="checkbox"
                  checked={checked}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => onToggleSelect(r.nct_id)}
                  aria-label={`Select ${r.nct_id}`}
                />
                <button
                  className="mini"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPanel(r.nct_id);
                  }}
                >
                  Open panel
                </button>
              </div>
            </div>

            <div className="m-tags">
              <span className={phaseClass(p)}>{phaseLabel(p)}</span>
              <span className="chip chip-neutral">{(r.overall_status || "UNKNOWN").toUpperCase()}</span>
              <span className={bucketClass(bucket)}>{bucket}</span>
              <span className="chip chip-neutral">{r.disease_area || "Other"}</span>
            </div>

            <div className="m-why">
              <div className="m-why-label">Why stopped</div>
              <div className="m-why-text">{why || "—"}</div>
            </div>
          </div>
        );
      })}

      {rows.length > 400 && <div className="note">Showing first 400 results on mobile. Filter/search to narrow.</div>}
    </div>
  );
}
