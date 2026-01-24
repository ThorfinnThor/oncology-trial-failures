import { useMemo, useState } from "react";
import Link from "next/link";
import { DatasetMeta, TrialRow } from "@/lib/types";
import { reasonBucket, relatedTrials, normalizePhase } from "@/lib/filtering";
import { ConfidencePill, ReasonPill, Pill } from "./Badges";
import { splitSemicolonValues } from "@/lib/data";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b px-4 py-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v?: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1 text-sm">
      <div className="text-gray-500">{k}</div>
      <div className="text-gray-900 whitespace-pre-wrap">{v || "—"}</div>
    </div>
  );
}

function parseEvidence(e: string): string[] {
  const raw = (e || "").trim();
  if (!raw) return [];
  // evidence strings often have commas; keep short items
  return raw.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12);
}

type Props = {
  meta: DatasetMeta | null;
  allTrials: TrialRow[]; // for related trials
  trial: TrialRow | null;
  onClose: () => void;

  compare: string[];
  setCompare: (ids: string[]) => void;
};

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function clampCompare(ids: string[]) {
  const uniq = Array.from(new Set(ids));
  return uniq.slice(0, 5);
}

export function DetailsDrawer({ meta, allTrials, trial, onClose, compare, setCompare }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  const rel = useMemo(() => {
    if (!trial) return null;
    return relatedTrials(allTrials, trial);
  }, [trial, allTrials]);

  if (!trial) {
    return (
      <aside className="h-[calc(100vh-74px)] overflow-auto border-l bg-white">
        <div className="px-4 py-6 text-sm text-gray-600">
          Select a trial to see details.
        </div>
      </aside>
    );
  }

  const ph = normalizePhase(trial.phases || "")[0] || "Unknown";
  const bucket = reasonBucket(trial);
  const evidence = parseEvidence(trial.classification_evidence || "");

  const interventions = splitSemicolonValues(trial.intervention_names || "");
  const conditions = splitSemicolonValues(trial.conditions || "");

  return (
    <aside className="h-[calc(100vh-74px)] overflow-auto border-l bg-white">
      <div className="sticky top-0 z-10 border-b bg-white px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 line-clamp-2">{trial.brief_title || "—"}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Pill>{trial.nct_id}</Pill>
              <Pill>{ph}</Pill>
              <Pill>{(trial.overall_status || "—").toUpperCase()}</Pill>
              <ReasonPill value={bucket} />
              <ConfidencePill value={trial.classification_confidence || "—"} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              className="rounded-xl border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
            <button
              className="rounded-xl border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => setCompare(clampCompare(toggle(compare, trial.nct_id)))}
              type="button"
            >
              {compare.includes(trial.nct_id) ? "Remove from compare" : "Add to compare"}
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-600">
          <a className="text-blue-700 hover:underline" href={trial.url} target="_blank" rel="noreferrer">
            Open primary source (ClinicalTrials.gov)
          </a>
          {" "}• This classification is inferred from available text and may be incomplete.
        </div>
      </div>

      <Section title="Overview">
        <KV k="Disease area" v={trial.disease_area || "Other"} />
        <KV k="Sponsor" v={trial.lead_sponsor} />
        <KV k="Collaborators" v={trial.collaborators} />
        <KV k="Last update date" v={trial.last_update_post_date} />
      </Section>

      <Section title="Termination rationale">
        <div className="text-sm text-gray-900 whitespace-pre-wrap">{trial.why_stopped || "—"}</div>
        <div className="mt-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">How this label was derived</div>
          <div className="mt-1 text-xs text-gray-600">
            The system uses rule-based pattern matching with negation handling. Confidence reflects the strength and consistency of signals in the recorded text.
            <span className="ml-2">
              <Link className="text-blue-700 hover:underline" href="/methods#bio-failures">Learn more</Link>
            </span>
          </div>

          {evidence.length ? (
            <ul className="mt-2 list-disc pl-5 text-xs text-gray-700">
              {evidence.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          ) : (
            <div className="mt-2 text-xs text-gray-500">No evidence tokens recorded for this item.</div>
          )}
        </div>
      </Section>

      <Section title="Key fields">
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
            className="rounded-xl border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            onClick={() => setShowRaw((v) => !v)}
            type="button"
            aria-expanded={showRaw}
          >
            {showRaw ? "Hide raw record" : "View raw record"}
          </button>

          {showRaw && (
            <pre className="mt-3 max-h-80 overflow-auto rounded-xl border bg-gray-50 p-3 text-[11px] text-gray-800">
              {JSON.stringify(trial, null, 2)}
            </pre>
          )}
        </div>
      </Section>

      <Section title="Related trials">
        {!rel ? (
          <div className="text-sm text-gray-600">—</div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase">Same sponsor</div>
              <ul className="mt-1 space-y-1 text-sm">
                {rel.sameSponsor.length ? rel.sameSponsor.map((t) => (
                  <li key={t.nct_id}>
                    <Link className="text-blue-700 hover:underline" href={`/?trial=${encodeURIComponent(t.nct_id)}`}>
                      {t.nct_id}
                    </Link>{" "}
                    <span className="text-gray-600">{t.brief_title}</span>
                  </li>
                )) : <li className="text-gray-500">None found.</li>}
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase">Same intervention</div>
              <ul className="mt-1 space-y-1 text-sm">
                {rel.sameIntervention.length ? rel.sameIntervention.map((t) => (
                  <li key={t.nct_id}>
                    <Link className="text-blue-700 hover:underline" href={`/?trial=${encodeURIComponent(t.nct_id)}`}>
                      {t.nct_id}
                    </Link>{" "}
                    <span className="text-gray-600">{t.brief_title}</span>
                  </li>
                )) : <li className="text-gray-500">None found.</li>}
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase">Same condition</div>
              <ul className="mt-1 space-y-1 text-sm">
                {rel.sameCondition.length ? rel.sameCondition.map((t) => (
                  <li key={t.nct_id}>
                    <Link className="text-blue-700 hover:underline" href={`/?trial=${encodeURIComponent(t.nct_id)}`}>
                      {t.nct_id}
                    </Link>{" "}
                    <span className="text-gray-600">{t.brief_title}</span>
                  </li>
                )) : <li className="text-gray-500">None found.</li>}
              </ul>
            </div>
          </div>
        )}
      </Section>

      <div className="px-4 py-4 text-xs text-gray-500">
        For corrections, use GitHub issues or your preferred feedback channel (see Methods page).
      </div>
    </aside>
  );
}
