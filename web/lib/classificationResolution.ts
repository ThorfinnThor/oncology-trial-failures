import type { TrialIndexRow } from "./types";

export type ClassificationSource = "final" | "v2" | "legacy" | "unknown";

export type ResolvedClassification = {
  outcome: string;
  reason: string;
  resolutionStatus: "RESOLVED" | "UNRESOLVED";
  reviewRequired: boolean;
  source: ClassificationSource;
};

export function normalizeClassificationCode(value: string | undefined): string {
  return (value || "").replace(/[\s/-]+/g, "_").toUpperCase().trim();
}

function legacyOutcome(row: TrialIndexRow): string {
  const label = normalizeClassificationCode(
    row.failure_label || row.classification_label || row.failure_type
  );
  if (label.includes("BIOLOGICAL_FAILURE") || label.includes("SCIENTIFIC_FAILURE")) {
    return "BIOLOGICAL_FAILURE";
  }
  if (label.includes("NON_BIOLOGICAL")) return "NON_BIOLOGICAL";
  return "UNRESOLVED";
}

export function resolveClassification(row: TrialIndexRow): ResolvedClassification {
  const finalOutcome = normalizeClassificationCode(row.classification_final_outcome);
  const finalReason = normalizeClassificationCode(row.classification_final_category);
  if (finalOutcome || finalReason) {
    const outcome = finalOutcome || "UNRESOLVED";
    const unresolved =
      normalizeClassificationCode(row.classification_resolution_status) === "UNRESOLVED" ||
      outcome === "UNRESOLVED" ||
      outcome === "UNKNOWN" ||
      finalReason.startsWith("UNRESOLVED_");
    return {
      outcome: unresolved ? "UNRESOLVED" : outcome,
      reason: finalReason || "UNSPECIFIED",
      resolutionStatus: unresolved ? "UNRESOLVED" : "RESOLVED",
      reviewRequired: unresolved || row.classification_needs_review === true,
      source: "final",
    };
  }

  const v2Outcome = normalizeClassificationCode(row.classification_outcome_v2);
  const v2Reason = normalizeClassificationCode(row.classification_primary_reason_v2);
  if (v2Outcome || v2Reason) {
    const unresolved =
      row.classification_needs_review === true ||
      v2Outcome === "UNKNOWN" ||
      v2Outcome === "UNRESOLVED" ||
      !v2Outcome;
    return {
      outcome: unresolved ? "UNRESOLVED" : v2Outcome,
      reason: v2Reason || "UNSPECIFIED",
      resolutionStatus: unresolved ? "UNRESOLVED" : "RESOLVED",
      reviewRequired: unresolved,
      source: "v2",
    };
  }

  const legacyReason = normalizeClassificationCode(row.classification_reason);
  const outcome = legacyOutcome(row);
  if (legacyReason || outcome !== "UNRESOLVED") {
    const unresolved = outcome === "UNRESOLVED";
    return {
      outcome,
      reason: legacyReason || "UNSPECIFIED",
      resolutionStatus: unresolved ? "UNRESOLVED" : "RESOLVED",
      reviewRequired: unresolved,
      source: "legacy",
    };
  }

  return {
    outcome: "UNRESOLVED",
    reason: "UNSPECIFIED",
    resolutionStatus: "UNRESOLVED",
    reviewRequired: true,
    source: "unknown",
  };
}

export function classificationReasonBucket(row: TrialIndexRow): string {
  const classification = resolveClassification(row);
  if (
    (classification.source === "final" || classification.source === "v2") &&
    (classification.reviewRequired || classification.outcome === "UNRESOLVED")
  ) {
    return "OTHER/UNKNOWN";
  }

  const reason = classification.reason;
  if (reason === "DECISION_WITHOUT_STATED_CAUSE") return "DECISION ONLY";
  if (reason === "PROGRAM_ACTION_WITHOUT_STATED_CAUSE") return "PROGRAM STOP ONLY";
  if (reason === "EFFICACY_FUTILITY") return "EFFICACY/FUTILITY";
  if (reason === "SAFETY") return "SAFETY";
  if (reason === "REGULATORY") return "REGULATORY";
  if (
    reason === "RECRUITMENT" ||
    reason === "FUNDING" ||
    reason === "BUSINESS_STRATEGY" ||
    reason === "STAFFING_RESOURCES" ||
    reason === "PROTOCOL_FEASIBILITY" ||
    reason === "SUPPLY_MANUFACTURING" ||
    reason === "EXTERNAL_DISRUPTION" ||
    reason === "OPERATIONAL_OTHER" ||
    reason === "SUPPORT_WITHDRAWAL"
  ) {
    return "OPERATIONAL";
  }

  const legacyReason = (row.classification_reason || "").toUpperCase().trim();
  if (legacyReason && legacyReason !== "OTHER/UNKNOWN") return legacyReason;

  // Legacy-only rows may not have a structured reason. Keep this heuristic solely
  // for those rows; final and V2 classifications above remain authoritative.
  if (classification.source === "legacy" || classification.source === "unknown") {
    const why = (row.why_stopped_short || "").toUpperCase();
    if (why.includes("EFFICACY") || why.includes("FUTILITY") || why.includes("INSUFFICIENT")) return "EFFICACY/FUTILITY";
    if (why.includes("SAFETY") || why.includes("TOXIC") || why.includes("ADVERSE")) return "SAFETY";
    if (why.includes("ENROLL") || why.includes("RECRUIT")) return "ENROLLMENT";
    if (why.includes("FUND")) return "FUNDING";
    if (why.includes("REGULAT") || why.includes("FDA") || why.includes("AUTHORITY")) return "REGULATORY";
    if (why.includes("STRATEG")) return "STRATEGIC";
    if (why.includes("OPERATION") || why.includes("LOGISTIC") || why.includes("SUPPLY")) return "OPERATIONAL";
  }
  return "OTHER/UNKNOWN";
}

export function isResolvedBiologicalFailure(row: TrialIndexRow): boolean {
  const classification = resolveClassification(row);
  if (!classification.reviewRequired && classification.outcome === "BIOLOGICAL_FAILURE") return true;
  if (classification.source !== "unknown") return false;
  const bucket = classificationReasonBucket(row);
  return bucket === "EFFICACY/FUTILITY" || bucket === "SAFETY";
}

/**
 * Preserve the site's pre-registry trial eligibility until URL-level decisions
 * approve the migration. Unlike display classification, this intentionally lets
 * an older V2 biological outcome fill a final UNRESOLVED value.
 */
export function isLegacyIndexableBiologicalSignal(row: TrialIndexRow): boolean {
  const finalOutcome = normalizeClassificationCode(row.classification_final_outcome);
  if (finalOutcome && finalOutcome !== "UNRESOLVED") return finalOutcome === "BIOLOGICAL_FAILURE";

  const v2Outcome = normalizeClassificationCode(row.classification_outcome_v2);
  if (v2Outcome) return v2Outcome === "BIOLOGICAL_FAILURE";

  const label = normalizeClassificationCode(
    row.failure_label || row.classification_label || row.failure_type
  );
  if (label.includes("BIOLOGICAL_FAILURE") || label.includes("SCIENTIFIC_FAILURE")) return true;

  const bucket = classificationReasonBucket(row);
  return bucket === "EFFICACY/FUTILITY" || bucket === "SAFETY";
}
