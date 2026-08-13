// web/components/DetailsDrawer.tsx

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadDetail } from "@/lib/data";
import { DatasetMeta, TrialDetail } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { useDialogBehavior } from "@/hooks/useDialogBehavior";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="facet-title">{title}</div>
      {children}
    </div>
  );
}

export default function DetailsDrawer({
  open,
  trialId,
  onClose,
  meta,
  fromHref
}: {
  open: boolean;
  trialId: string | null;
  onClose: () => void;
  meta: DatasetMeta | null;
  fromHref: string;
}) {
  const dialogRef = useDialogBehavior(open, onClose);
  const [detail, setDetail] = useState<TrialDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!trialId) {
        setDetail(null);
        setErr(null);
        return;
      }
      try {
        setErr(null);
        const d = await loadDetail(trialId);
        if (!alive) return;
        setDetail(d);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load details.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [trialId]);

  const phase = useMemo(() => {
    if (!detail) return "UNKNOWN";
    return parsePhases(detail.phases || "")[0] || "UNKNOWN";
  }, [detail]);

  const bucket = useMemo(() => (detail ? reasonBucket(detail) : "OTHER/UNKNOWN"), [detail]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="drawer-wrap"
      role="dialog"
      aria-modal="true"
      aria-label="Trial details"
      tabIndex={-1}
    >
      <div className="overlay" onClick={onClose} />

      <div className="drawer-panel">
        <div className="drawer-hd">
          <div style={{ minWidth: 0 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              Trial
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {trialId}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {trialId && (
              <Link className="btn" href={`/trial/${encodeURIComponent(trialId)}?from=${encodeURIComponent(fromHref)}`}>
                Open full page
              </Link>
            )}
            <button className="btn" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="drawer-bd">
          {err && <div className="error">{err}</div>}
          {!detail && !err && <div className="muted">Loading…</div>}

          {detail && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>
                  {detail.brief_title || "—"}
                </div>
                <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
                  Sponsor: <span style={{ color: "var(--text)", fontWeight: 650 }}>{detail.lead_sponsor || "—"}</span>
                </div>
                {detail.collaborators ? (
                  <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                    Collaborators: <span style={{ color: "var(--text)", fontWeight: 650 }}>{detail.collaborators}</span>
                  </div>
                ) : null}

                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span className="chip">{phaseLabel(phase as any)}</span>
                  <span className="chip">{(detail.overall_status || "UNKNOWN").toUpperCase()}</span>
                  <span className="chip">{bucket}</span>
                  {detail.classification_confidence ? <span className="chip">Confidence: {detail.classification_confidence}</span> : null}
                </div>
              </div>

              <Section title="Why stopped">
                <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "normal", wordBreak: "break-word" }}>
                  {(detail.why_stopped || detail.why_stopped_short || "—").trim()}
                </div>
              </Section>

              <div style={{ height: 12 }} />

              <Section title="Key fields">
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, fontSize: 14 }}>
                  <div>
                    <span style={{ fontWeight: 800 }}>Condition:</span> {detail.condition_first || "—"}
                  </div>
                  <div>
                    <span style={{ fontWeight: 800 }}>Intervention:</span> {detail.intervention_first || "—"}
                  </div>
                  <div>
                    <span style={{ fontWeight: 800 }}>Disease area:</span> {detail.disease_area || "Other"}
                  </div>
                  <div>
                    <span style={{ fontWeight: 800 }}>Last update:</span> {detail.last_update_post_date || "—"}
                  </div>
                </div>
              </Section>

              <div style={{ height: 12 }} />

              <Section title="Provenance">
                <div className="muted" style={{ fontSize: 13 }}>
                  Dataset: <span style={{ color: "var(--text)", fontWeight: 650 }}>{meta?.version || "—"}</span>
                  {meta?.source ? (
                    <>
                      {" "}• Source: <span style={{ color: "var(--text)", fontWeight: 650 }}>{meta.source}</span>
                    </>
                  ) : null}
                </div>

                <div style={{ marginTop: 10 }}>
                  <a style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }} href={detail.url} target="_blank" rel="noreferrer">
                    View on ClinicalTrials.gov
                  </a>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
