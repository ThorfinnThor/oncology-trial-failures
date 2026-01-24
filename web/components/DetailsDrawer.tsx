import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadDetail } from "@/lib/data";
import { DatasetMeta, TrialDetail } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>
        {title}
      </div>
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
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      <div
        className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-2xl border-l"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="p-4 border-b flex items-start justify-between gap-3" style={{ borderColor: "var(--border)" }}>
          <div className="min-w-0">
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>
              Trial
            </div>
            <div className="text-lg font-semibold truncate">{trialId}</div>
          </div>

          <div className="flex items-center gap-2">
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

        <div className="p-5 overflow-auto h-[calc(100%-64px)] space-y-4">
          {err && <div className="text-sm text-rose-700">{err}</div>}
          {!detail && !err && <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</div>}

          {detail && (
            <>
              <div>
                <div className="text-xl font-semibold leading-snug">{detail.brief_title || "—"}</div>
                <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  Sponsor: <span className="font-medium" style={{ color: "var(--text)" }}>{detail.lead_sponsor || "—"}</span>
                </div>
                {detail.collaborators ? (
                  <div className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    Collaborators: <span className="font-medium" style={{ color: "var(--text)" }}>{detail.collaborators}</span>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="chip">{phaseLabel(phase as any)}</span>
                  <span className="chip">{(detail.overall_status || "UNKNOWN").toUpperCase()}</span>
                  <span className="chip">{bucket}</span>
                  {detail.classification_confidence ? (
                    <span className="chip">Confidence: {detail.classification_confidence}</span>
                  ) : null}
                </div>
              </div>

              <Section title="Why stopped">
                <div className="text-sm leading-relaxed whitespace-normal break-words">
                  {(detail.why_stopped || detail.why_stopped_short || "—").trim()}
                </div>
              </Section>

              <Section title="Key fields">
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="font-semibold">Condition:</span> {detail.condition_first || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">Intervention:</span> {detail.intervention_first || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">Disease area:</span> {detail.disease_area || "Other"}
                  </div>
                  <div>
                    <span className="font-semibold">Last update:</span> {detail.last_update_post_date || "—"}
                  </div>
                </div>
              </Section>

              <Section title="Provenance">
                <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Dataset: <span className="font-medium" style={{ color: "var(--text)" }}>{meta?.version || "—"}</span>
                  {meta?.source ? (
                    <>
                      {" "}• Source: <span className="font-medium" style={{ color: "var(--text)" }}>{meta.source}</span>
                    </>
                  ) : null}
                </div>

                <div className="mt-2">
                  <a className="text-sm font-semibold" href={detail.url} target="_blank" rel="noreferrer">
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
