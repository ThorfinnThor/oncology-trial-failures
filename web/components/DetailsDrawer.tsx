import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadDetail } from "@/lib/data";
import { DatasetMeta, TrialDetail } from "@/lib/types";
import { parsePhases, phaseLabel } from "@/lib/filtering";

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
      <div className="rounded-2xl border border-[var(--border)] bg-white p-4">{children}</div>
    </div>
  );
}

/**
 * Updated DetailsDrawer:
 * - No TrialRow usage
 * - Loads TrialDetail on demand (fast)
 * - Keeps “Open full page” behavior
 */
export default function DetailsDrawer({
  open,
  onClose,
  trialId,
  meta,
  fromHref,
}: {
  open: boolean;
  onClose: () => void;
  trialId: string | null;
  meta: DatasetMeta | null;
  fromHref?: string;
}) {
  const [detail, setDetail] = useState<TrialDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const id = useMemo(() => (trialId || "").trim(), [trialId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!open || !id) {
        setDetail(null);
        setErr(null);
        return;
      }
      try {
        setLoading(true);
        setErr(null);
        const d = await loadDetail(id);
        if (!alive) return;
        setDetail(d);
        if (!d) setErr("Trial not found in dataset.");
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load trial details.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, id]);

  if (!open) return null;

  const phaseKey = detail ? (parsePhases(detail.phases || "")[0] || "Unknown") : "Unknown";

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Trial details drawer">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white border-l border-[var(--border)] shadow-[var(--shadow)] flex flex-col">
        <div className="p-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-[var(--text-muted)]">Trial details</div>
            <div className="mt-1 text-sm font-semibold truncate">{id || "—"}</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Dataset version: <span className="font-semibold text-[var(--text)]">{meta?.version || "—"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {id && (
              <Link
                className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
                href={`/trial/${encodeURIComponent(id)}${fromHref ? `?from=${encodeURIComponent(fromHref)}` : ""}`}
              >
                Open full page
              </Link>
            )}
            <button
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-2)]"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-4 overflow-auto space-y-4">
          {loading && <div className="text-sm text-[var(--text-muted)]">Loading…</div>}
          {err && <div className="text-sm text-rose-700">{err}</div>}

          {!loading && !err && detail && (
            <>
              <div className="space-y-2">
                <div className="text-lg font-semibold leading-snug">{detail.brief_title || "—"}</div>
                <div className="flex flex-wrap gap-2">
                  <Pill>{(detail.overall_status || "—").toUpperCase()}</Pill>
                  <Pill>{phaseLabel(phaseKey as any)}</Pill>
                  <Pill>{detail.disease_area || "Other"}</Pill>
                </div>
              </div>

              <Section title="Stated stop reason (full)">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{detail.why_stopped || "—"}</div>
              </Section>

              <Section title="Overview">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Sponsor:</span> {detail.lead_sponsor || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">Collaborators:</span> {detail.collaborators || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">Last update:</span> {detail.last_update_post_date || "—"}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    Labels are inferred from registry text and may be incomplete. Verify using the primary source.
                  </div>
                  <a className="text-sm font-semibold" href={detail.url} target="_blank" rel="noreferrer">
                    Open primary source
                  </a>
                </div>
              </Section>

              <Section title="Key fields">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Conditions:</span> {detail.conditions || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">Interventions:</span> {detail.intervention_names || "—"}
                  </div>
                  <div>
                    <span className="font-semibold">MeSH terms:</span> {detail.mesh_terms || "—"}
                  </div>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
