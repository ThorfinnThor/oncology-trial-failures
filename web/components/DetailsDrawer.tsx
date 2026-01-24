import { useMemo, useState } from "react";
import Link from "next/link";
import { DatasetMeta, TrialRow } from "@/lib/types";
import { parsePhases, phaseLabel, reasonBucket } from "@/lib/filtering";
import { ConfidencePill, ReasonPill, Pill } from "./Badges";
import { splitSemicolonValues } from "@/lib/data";
import { relatedTrials } from "@/lib/filtering";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--border)] px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v?: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1 text-sm">
      <div className="text-[var(--text-muted)]">{k}</div>
      <div className="text-[var(--text)] whitespace-pre-wrap">{v || "—"}</div>
    </div>
  );
}

function parseEvidence(e: string): string[] {
  const raw = (e || "").trim();
  if (!raw) return [];
  return raw.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12);
}

type Props = {
  meta: DatasetMeta | null;
  allTrials: TrialRow[];
  trial: TrialRow | null;
  onClose: () => void;

  compare: string[];
  setCompare: (ids: string[]) => void;

  exploreReturnPath?: string; // optional for link back
};

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function clampCompare(ids: string[]) {
  const uniq = Array.from(new Set(ids));
  return uniq.slice(0, 5);
}

export function DetailsDrawer({ meta, allTrials, trial, onClose, compare, setCompare, exploreReturnPath = "/" }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  const rel = useMemo(() => {
    if (!trial) return null;
    return relatedTrials(allTrials, trial);
  }, [trial, allTrials]);

  if (!trial) {
    return (
      <aside className="h-full overflow-auto bg-[var(--surface)]">
        <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
          Select a trial to see details.
        </div>
      </aside>
    );
  }

  const phKey = parsePhases(trial.phases || "")[0] || "Unknown";
  const bucket = reasonBucket(trial);
  const evidence = parseEvidence(trial.classification_evidence || "");

  const interventions = splitSemicolonValues(trial.intervention_names || "");
  const conditions = splitSemicolonValues(trial.conditions || "");

  const trialHref = `/trial/${encodeURIComponent(trial.nct_id)}?from=${encodeURIComponent(exploreReturnPath)}`;

  return (
    <aside className="h-full overflow-auto bg-[var(--surface)]">
      <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text)] line-clamp-2">
              {trial.brief_title || "—"}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Pill>{trial.nct_id}</Pill>
              <Pill>{phaseLabel(phKey as any)}</Pill>
              <Pill>{(trial.overall_status || "—").toUpperCase()}</Pill>
              <ReasonPill value={bucket} />
              <ConfidencePill value={trial.classification_confidence || "—"} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
              onClick={onClose}
              type="button"
            >
              Close
            </button>

            <Link
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
              href={trialHref}
            >
              Open full page
            </Link>

            <button
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
              onClick={() => setCompare(clampCompare(toggle(compare, trial.nct_id)))}
              type="button"
            >
              {compare.includes(trial.nct_id) ? "Remove from compare" : "Add to compare"}
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-[var(--text-muted)]">
          <a className="text-[var(--accent-primary)] hover:underline" href={trial.url} target="_blank" rel="noreferrer">
            Open primary source (ClinicalTrials.gov)
          </a>
          {" "}• This classification is inferred from available text and may be incomplete.
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="max-w-[70ch]">
          <Section title="Overview">
            <KV k="Disease area" v={trial.disease_area || "Other"} />
            <KV k="Sponsor" v={trial.lead_sponsor} />
            <KV k="Collaborators" v={trial.collaborators} />
            <KV k="Last update date" v={trial.last_update_post_date} />
          </Section>

          <Section title="Stop reason (full text)">
            <div className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
              {trial.why_stopped || "—"}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(trial.why_stopped || "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  } catch {
                    // ignore
                  }
                }}
                type="button"
              >
                Copy reason text
              </button>
              {copied ? <span className="text-xs text-[var(--text-muted)]">Copied</span> : null}
            </div>

            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                How “Likely scientific failure” is derived
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Rule-based pattern matching with negation handling. Confidence reflects strength and consistency of signals in recorded text.{" "}
                <Link className="text-[var(--accent-primary)] hover:underline" href="/methods#bio-failures">
                  Learn more
                </Link>
              </div>

              {evidence.length ? (
                <ul className="mt-2 list-disc pl-5 text-xs text-[var(--text)]">
                  {evidence.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              ) : (
                <div className="mt-2 text-xs text-[var(--text-muted)]">No evidence tokens recorded for this item.</div>
              )}
            </div>
          </Section>

          <Section title="Timeline & key fields">
            <KV k="Phases (raw)" v={trial.phases} />
            <KV k="Conditions" v={conditions.slice(0, 10).join("; ") || "—"} />
            <KV k="Interventions" v={interventions.slice(0, 10).join("; ") || "—"} />
            <KV k="Intervention types" v={trial.intervention_types} />
            <KV k="MeSH terms" v={trial.mesh_terms} />
          </Section>

          <Section title="Sources & provenance">
            <KV k="Primary identifier" v={trial.nct_id} />
            <KV k="Primary source" v="ClinicalTrials.gov (registry record)" />
            <KV k="Dataset version" v={meta ? `${meta.version} (generated ${meta.generated_at_utc})` : "—"} />
            <KV k="Fields used" v="overall_status, why_stopped, interventions, conditions, phases, last_update_post_date" />

            <div className="mt-3">
              <button
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
                onClick={() => setShowRaw((v) => !v)}
                type="button"
                aria-expanded={showRaw}
              >
                {showRaw ? "Hide raw record" : "View raw record"}
              </button>

              {showRaw && (
                <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[11px] text-[var(--text)]">
                  {JSON.stringify(trial, null, 2)}
                </pre>
              )}
            </div>
          </Section>

          <Section title="Related trials">
            {!rel ? (
              <div className="text-sm text-[var(--text-muted)]">—</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-muted)] uppercase">Same sponsor</div>
                  <ul className="mt-1 space-y-1 text-sm">
                    {rel.sameSponsor.length ? rel.sameSponsor.map((t) => (
                      <li key={t.nct_id}>
                        <button
                          className="text-[var(--accent-primary)] hover:underline"
                          onClick={() => {
                            // open in-panel without removing feature
                            window.location.href = `${exploreReturnPath.split("?")[0]}?trial=${encodeURIComponent(t.nct_id)}`;
                          }}
                          type="button"
                        >
                          {t.nct_id}
                        </button>{" "}
                        <span className="text-[var(--text-muted)]">{t.brief_title}</span>
                      </li>
                    )) : <li className="text-[var(--text-muted)]">None found.</li>}
                  </ul>
                </div>
              </div>
            )}
          </Section>

          <div className="px-0 py-4 text-xs text-[var(--text-muted)]">
            For corrections, report issues via your GitHub repository.
          </div>
        </div>
      </div>
    </aside>
  );
}
