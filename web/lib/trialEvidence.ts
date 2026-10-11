import type { TrialDetail, TrialIndexRow } from "./types";
import detailedDescriptionEvidence from "../config/trial-detailed-description-evidence.json";

export type TrialStopEvidence = {
  text: string;
  source: "registry_stop_reason" | "registry_detailed_description" | "missing";
  placeholder: boolean;
};

const DESCRIPTION_FALLBACK_MARKER = "source.description_fallback:";
const VERIFIED_DETAILED_DESCRIPTION_EVIDENCE = detailedDescriptionEvidence.trials as Record<
  string,
  { source_url: string; text: string }
>;

function clean(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

export function isDetailedDescriptionPlaceholder(value: string | undefined): boolean {
  const text = clean(value).replace(/[.\s]+$/, "").toLowerCase();
  return (
    text === "see termination reason in detailed description" ||
    text === "see detailed description for termination reason"
  );
}

export function descriptionFallbackEvidence(value: string | undefined): string {
  const evidence = clean(value);
  const markerIndex = evidence.toLowerCase().lastIndexOf(DESCRIPTION_FALLBACK_MARKER);
  if (markerIndex < 0) return "";

  const extracted = clean(evidence.slice(markerIndex + DESCRIPTION_FALLBACK_MARKER.length));
  if (!extracted) return "";
  return `${extracted.charAt(0).toUpperCase()}${extracted.slice(1)}`;
}

/**
 * ClinicalTrials.gov sometimes puts a pointer in whyStopped and the actual reason
 * in detailedDescription. The classifier retains that source sentence in
 * classification_evidence. Surface it instead of publishing the pointer as if it
 * were evidence.
 */
export function resolveTrialStopEvidence(
  trial: Pick<TrialDetail | TrialIndexRow, "nct_id" | "why_stopped_short" | "classification_evidence" | "classification_source"> &
    Partial<Pick<TrialDetail, "why_stopped">>
): TrialStopEvidence {
  const registryReason = clean(trial.why_stopped || trial.why_stopped_short);
  const placeholder = isDetailedDescriptionPlaceholder(registryReason);

  if (!placeholder && registryReason) {
    return { text: registryReason, source: "registry_stop_reason", placeholder: false };
  }

  if (placeholder || trial.classification_source === "DESCRIPTION_FALLBACK") {
    const verifiedEvidence = VERIFIED_DETAILED_DESCRIPTION_EVIDENCE[trial.nct_id.toUpperCase()];
    if (verifiedEvidence?.text) {
      return {
        text: verifiedEvidence.text,
        source: "registry_detailed_description",
        placeholder,
      };
    }

    const fallback = descriptionFallbackEvidence(trial.classification_evidence);
    if (fallback) {
      return {
        text: fallback,
        source: "registry_detailed_description",
        placeholder,
      };
    }
  }

  return { text: "", source: "missing", placeholder };
}

/**
 * A trial page should only remain eligible for search when it has both a usable
 * source-backed stop explanation and enough study identity to stand alone.
 * This is deliberately independent from outcome classification: a biological
 * label cannot make an otherwise empty template index-worthy.
 */
export function hasIndexableTrialSearchEvidence(trial: TrialIndexRow): boolean {
  const stopEvidence = resolveTrialStopEvidence(trial);
  return Boolean(
    stopEvidence.text &&
      clean(trial.brief_title) &&
      clean(trial.url) &&
      clean(trial.condition_first || trial.conditions) &&
      clean(trial.intervention_first || trial.intervention_names) &&
      clean(trial.classification_final_explanation)
  );
}
