import config from "@/config/trial-noindex-decisions.json";

export type TrialNoindexDecision = {
  nctId: string;
  batch: string;
  reason: string;
};

const decisions = new Map<string, TrialNoindexDecision>();

for (const batch of config.batches) {
  for (const rawNctId of batch.nctIds) {
    const nctId = rawNctId.toUpperCase();
    if (decisions.has(nctId)) {
      throw new Error(`Duplicate trial noindex decision: ${nctId}`);
    }
    decisions.set(nctId, { nctId, batch: batch.id, reason: batch.reason });
  }
}

export function trialNoindexDecision(nctId: string | undefined): TrialNoindexDecision | null {
  return decisions.get((nctId || "").toUpperCase()) ?? null;
}

export function trialNoindexDecisionForUrl(input: string): TrialNoindexDecision | null {
  const pathname = new URL(input, "https://clinicaltrialfailures.com").pathname;
  const match = pathname.match(/^\/trial\/(NCT\d{8})(?:-|\/|$)/i);
  return trialNoindexDecision(match?.[1]);
}

export function isExplicitlyNoindexTrial(nctId: string | undefined): boolean {
  return trialNoindexDecision(nctId) !== null;
}

export const TRIAL_NOINDEX_DECISION_COUNT = decisions.size;
export const TRIAL_NOINDEX_DECISION_VERSION = config.decisionVersion;
