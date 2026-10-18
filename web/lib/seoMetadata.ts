import { parsePhases, phaseLabel } from "./filtering";
import { resolveClassification } from "./classificationResolution";
import { resolveTrialStopEvidence } from "./trialEvidence";
import type { TrialDetail } from "./types";

const MAX_TITLE_LENGTH = 75;
const MAX_DESCRIPTION_LENGTH = 165;
const MAX_TRIAL_TITLE_LENGTH = 65;

// Reason labels as they read after "terminated for ...".
const REASON_PHRASES: Record<string, string> = {
  "efficacy/futility": "efficacy or futility",
  safety: "safety",
  "a biological signal": "a biological reason",
  recruitment: "recruitment problems",
  "business strategy": "business reasons",
  funding: "funding reasons",
  "staffing/resources": "staffing or resource reasons",
  "protocol feasibility": "feasibility reasons",
  "supply/manufacturing": "supply problems",
  "regulatory reasons": "regulatory reasons",
  "external disruption": "an external disruption",
  "operational reasons": "operational reasons",
};

const REASON_LABELS: Record<string, string> = {
  EFFICACY_FUTILITY: "efficacy/futility",
  "EFFICACY/FUTILITY": "efficacy/futility",
  SAFETY: "safety",
  BIOLOGICAL_UNSPECIFIED: "a biological signal",
  RECRUITMENT: "recruitment",
  ENROLLMENT: "recruitment",
  BUSINESS_STRATEGY: "business strategy",
  STRATEGIC: "business strategy",
  FUNDING: "funding",
  STAFFING_RESOURCES: "staffing/resources",
  PROTOCOL_FEASIBILITY: "protocol feasibility",
  SUPPLY_MANUFACTURING: "supply/manufacturing",
  REGULATORY: "regulatory reasons",
  EXTERNAL_DISRUPTION: "external disruption",
  OPERATIONAL_OTHER: "operational reasons",
  OPERATIONAL: "operational reasons",
};

const OUTCOME_LABELS: Record<string, string> = {
  BIOLOGICAL_FAILURE: "biological failure",
  NON_BIOLOGICAL: "non-biological stop",
  MIXED_CAUSES: "mixed causes",
  NON_FAILURE_TRANSITION: "non-failure transition",
  CAUSE_NOT_STATED: "cause not stated",
  UNKNOWN: "review required",
  UNRESOLVED: "review required",
};

function cleanText(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function normalizeCode(value: string | undefined): string {
  return cleanText(value).toUpperCase().replace(/[\s/-]+/g, "_");
}

function firstListItem(value: string | undefined): string {
  return cleanText(value)
    .split(/\s*[;|]\s*/)
    .map(cleanText)
    .find(Boolean) || "";
}

function withoutTrailingPunctuation(value: string): string {
  return value.replace(/[.!?;:,\s]+$/, "");
}

export function compactSeoText(value: string, maxLength: number): string {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;

  const slice = text.slice(0, Math.max(1, maxLength - 3));
  const wordBoundary = slice.lastIndexOf(" ");
  const shortened = wordBoundary >= Math.floor(maxLength * 0.55) ? slice.slice(0, wordBoundary) : slice;
  return `${shortened.replace(/[,:;\s-]+$/, "")}...`;
}

export function compactSeoTitle(subject: string, suffix: string, maxLength = MAX_TITLE_LENGTH): string {
  const cleanSubject = cleanText(subject);
  const cleanSuffix = cleanText(suffix);
  const separator = cleanSuffix ? ": " : "";
  const subjectLimit = Math.max(14, maxLength - cleanSuffix.length - separator.length);
  const shortSubject = compactSeoText(cleanSubject, subjectLimit);
  return compactSeoText(`${shortSubject}${separator}${cleanSuffix}`, maxLength);
}

export function compactSeoDescription(value: string): string {
  return compactSeoText(value, MAX_DESCRIPTION_LENGTH);
}

function statusLabel(value: string | undefined): string {
  const status = normalizeCode(value);
  if (status === "TERMINATED") return "terminated";
  if (status === "WITHDRAWN") return "withdrawn";
  if (status === "SUSPENDED") return "suspended";
  return "stopped";
}

function reasonLabel(trial: TrialDetail): string {
  const primary = resolveClassification(trial).reason;

  // These records state that a decision occurred, but do not state why.
  if (
    primary === "DECISION_WITHOUT_STATED_CAUSE" ||
    primary === "PROGRAM_ACTION_WITHOUT_STATED_CAUSE" ||
    primary === "DECISION_ONLY" ||
    primary === "PROGRAM_STOP_ONLY" ||
    primary === "UNSPECIFIED" ||
    primary === "OTHER_UNKNOWN"
  ) {
    return "";
  }

  return REASON_LABELS[primary] || "";
}

function outcomeLabel(trial: TrialDetail): string {
  const outcome = resolveClassification(trial).outcome;
  return OUTCOME_LABELS[outcome] || "";
}

function trialSubject(trial: TrialDetail, fallbackId: string): string {
  return (
    firstListItem(trial.intervention_first || trial.intervention_names) ||
    firstListItem(trial.condition_first || trial.conditions) ||
    cleanText(trial.brief_title) ||
    fallbackId ||
    "clinical"
  ).replace(/\s+trial$/i, "");
}

export function buildTrialSeoMetadata(trial: TrialDetail | null, fallbackId: string) {
  const trialId = cleanText(trial?.nct_id || fallbackId).toUpperCase();
  if (!trial) {
    return {
      title: trialId ? `${trialId} clinical trial record` : "Stopped clinical trial record",
      description: "Source-linked detail for a stopped clinical trial in the Clinical Trial Failures database.",
    };
  }

  const subject = trialSubject(trial, trialId);
  const status = statusLabel(trial.overall_status);
  const reason = reasonLabel(trial);
  const outcome = outcomeLabel(trial);
  // Searchers type the NCT number with the status ("nct05505539 withdrawn"),
  // so the title leads with both and names the stated reason in plain words.
  const forReason = REASON_PHRASES[reason] ? ` for ${REASON_PHRASES[reason]}` : "";
  const titleLead = `${trialId} ${status}${forReason}`;
  const subjectLimit = Math.max(14, MAX_TRIAL_TITLE_LENGTH - titleLead.length - 2);
  const title = `${titleLead}: ${compactSeoText(subject, subjectLimit)}`;

  const phaseKey = parsePhases(trial.phases || "")[0] || "UNKNOWN";
  const phase = phaseLabel(phaseKey);
  const phaseText = phase === "Unknown" ? "" : `${phase} `;
  const sourceReason = resolveTrialStopEvidence(trial).text;
  const descriptionSignal = outcome ? ` Classification: ${outcome}.` : "";
  const descriptionLead = `${trialId} was ${status}${forReason}.${descriptionSignal}`;
  const evidencePrefix = sourceReason ? " Registry: " : " Study: ";
  const fallbackContext = `${phaseText}${subject}${trial.lead_sponsor ? ` by ${cleanText(trial.lead_sponsor)}` : ""}`;
  const evidenceValue = withoutTrailingPunctuation(sourceReason || fallbackContext);
  const evidenceBudget = Math.max(35, MAX_DESCRIPTION_LENGTH - descriptionLead.length - evidencePrefix.length - 1);
  const evidence = compactSeoText(evidenceValue, evidenceBudget);
  const description = `${descriptionLead}${evidencePrefix}${evidence}${evidence.endsWith("...") ? "" : "."}`;

  return { title, description };
}
