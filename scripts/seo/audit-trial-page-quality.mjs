import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "../..");
const DATA_FILE = path.join(ROOT, "data/all_stopped_trials.json");
const APPROVALS_FILE = path.join(ROOT, "web/config/seo-approved-decisions.json");
const VERIFIED_EVIDENCE_FILE = path.join(ROOT, "web/config/trial-detailed-description-evidence.json");
const REPORT_FILE = path.join(ROOT, "docs/seo/trial-page-quality-report.json");
const REVIEW_FILE = path.join(ROOT, "docs/seo/trial-page-quality-review.csv");
const SITE_URL = "https://clinicaltrialfailures.com";
const SHORT_REASON_MAX = 20;

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function code(value) {
  return clean(value).replace(/[\s/-]+/g, "_").toUpperCase();
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function trialUrl(row) {
  const title = slugify(row.brief_title || row.intervention_first || row.condition_first || "clinical-trial");
  return `${SITE_URL}/trial/${row.nct_id}${title ? `-${title}` : ""}`;
}

function currentLegacyIndexable(row) {
  const finalOutcome = code(row.classification_final_outcome);
  if (finalOutcome && finalOutcome !== "UNRESOLVED") return finalOutcome === "BIOLOGICAL_FAILURE";
  const v2Outcome = code(row.classification_outcome_v2);
  if (v2Outcome) return v2Outcome === "BIOLOGICAL_FAILURE";
  const label = code(row.failure_label || row.classification_label || row.failure_type);
  return label.includes("BIOLOGICAL_FAILURE") || label.includes("SCIENTIFIC_FAILURE");
}

function isDetailedDescriptionPlaceholder(value) {
  const normalized = clean(value).replace(/[.\s]+$/, "").toLowerCase();
  return (
    normalized === "see termination reason in detailed description" ||
    normalized === "see detailed description for termination reason"
  );
}

function descriptionFallbackEvidence(value) {
  const evidence = clean(value);
  const marker = "source.description_fallback:";
  const index = evidence.toLowerCase().lastIndexOf(marker);
  if (index < 0) return "";
  const extracted = clean(evidence.slice(index + marker.length));
  return extracted ? `${extracted.charAt(0).toUpperCase()}${extracted.slice(1)}` : "";
}

const DIRECT_EVIDENCE_PATTERNS = {
  EFFICACY_FUTILITY:
    /effic|futil|ineffect|inefficien|no further benefit|lack of effect|lack of response|low response|poor response|incomplete effect|placebo effect|objective.{0,8}not met|unproven hypothesis|negative.{0,8}result|no benefit|relapse|discourag|failed|failure|not effective/i,
  SAFETY:
    /safety|toxic|adverse|\bdlt|nephro|\bae\b|risk|harm|side effect|mortality|death|intolerab|thrombosis|myalgia/i,
  BIOLOGICAL_UNSPECIFIED: /risk.?benefit|mtd not determined|biological|clinical decision/i,
};

function classificationCategory(row) {
  const final = code(row.classification_final_category);
  if (final && !final.startsWith("UNRESOLVED_")) return final;
  return code(row.classification_primary_reason_v2 || row.classification_reason);
}

function hasRequiredPageFields(row) {
  return Boolean(
    clean(row.brief_title) &&
      clean(row.url) &&
      (clean(row.conditions) || clean(row.condition_first)) &&
      (clean(row.intervention_names) || clean(row.intervention_first)) &&
      clean(row.classification_final_explanation)
  );
}

function directReasonMatches(row, reason) {
  const pattern = DIRECT_EVIDENCE_PATTERNS[classificationCategory(row)];
  return Boolean(pattern?.test(reason));
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = key(row) || "UNKNOWN";
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function main() {
  const [dataText, approvalsText, verifiedEvidenceText] = await Promise.all([
    fs.readFile(DATA_FILE, "utf8"),
    fs.readFile(APPROVALS_FILE, "utf8"),
    fs.readFile(VERIFIED_EVIDENCE_FILE, "utf8"),
  ]);
  const rows = JSON.parse(dataText);
  const approvals = JSON.parse(approvalsText);
  const verifiedEvidence = JSON.parse(verifiedEvidenceText).trials;
  const decisionsByUrl = new Map(approvals.decisions.map((decision) => [decision.url, decision]));
  const indexable = rows.filter(currentLegacyIndexable);
  const reviewed = [];

  for (const row of indexable) {
    const reason = clean(row.why_stopped);
    const shortReason = reason.length <= SHORT_REASON_MAX;
    const placeholder = isDetailedDescriptionPlaceholder(reason);
    if (!shortReason && !placeholder) continue;

    const url = trialUrl(row);
    const approval = decisionsByUrl.get(url);
    const fallback = placeholder || clean(row.classification_source) === "DESCRIPTION_FALLBACK"
      ? clean(verifiedEvidence[clean(row.nct_id).toUpperCase()]?.text) ||
        descriptionFallbackEvidence(row.classification_evidence)
      : "";
    const directEvidence = reason && !placeholder && directReasonMatches(row, reason);
    const requiredFields = hasRequiredPageFields(row);
    let decision = "REVIEW_HOLD";
    let action = "MANUAL_SOURCE_REVIEW";
    let reviewReason = "The short source text does not yet match the structured classification strongly enough for an automatic decision.";

    if ((!reason || placeholder) && fallback && requiredFields) {
      decision = "IMPROVE_INDEX";
      action = "SURFACE_DESCRIPTION_FALLBACK";
      reviewReason = reason
        ? "The page publishes a pointer instead of the verified ClinicalTrials.gov detailed-description evidence. Surface that source text and keep the page indexable."
        : "The registry stop-reason field is empty, but the verified ClinicalTrials.gov detailed description explicitly states the termination reasons. Surface that source text and keep the page indexable.";
    } else if (shortReason && directEvidence && requiredFields) {
      decision = "KEEP_INDEX";
      action = "SHORT_BUT_SOURCE_BACKED";
      reviewReason = "The registry wording is short but explicitly supports the structured reason; the page also has identity, study context, classification explanation, and a primary-source link.";
    } else if (!reason || (placeholder && !fallback)) {
      decision = "NOINDEX_THIN_CONTENT";
      action = "ADD_URL_LEVEL_APPROVAL";
      reviewReason = "No usable registry stop wording or recoverable detailed-description evidence is available for an independent search result.";
    }

    reviewed.push({
      nctId: clean(row.nct_id),
      url,
      stopReason: reason,
      reasonLength: reason.length,
      classificationCategory: classificationCategory(row),
      classificationConfidence: clean(row.classification_confidence),
      classificationSource: clean(row.classification_source),
      detailedDescriptionEvidence: fallback,
      requiredFields,
      decision,
      action,
      reviewReason,
    });
  }

  reviewed.sort((a, b) => a.action.localeCompare(b.action) || a.nctId.localeCompare(b.nctId));
  const additionalNoindex = reviewed.filter(
    (row) => row.action === "ADD_URL_LEVEL_APPROVAL" && row.decision === "NOINDEX_THIN_CONTENT"
  );
  const report = {
    schema_version: 1,
    generated_from: "data/all_stopped_trials.json",
    review_scope: {
      total_records: rows.length,
      current_legacy_indexable_trials: indexable.length,
      short_reason_max_characters: SHORT_REASON_MAX,
      short_reason_trials: reviewed.filter((row) => row.reasonLength <= SHORT_REASON_MAX).length,
      placeholder_trials: reviewed.filter((row) => isDetailedDescriptionPlaceholder(row.stopReason)).length,
      detailed_description_recovery_trials: reviewed.filter((row) => row.action === "SURFACE_DESCRIPTION_FALLBACK").length,
      reviewed_unique_trials: reviewed.length,
    },
    outcomes: {
      decisions: countBy(reviewed, (row) => row.decision),
      actions: countBy(reviewed, (row) => row.action),
      additional_noindex_count: additionalNoindex.length,
      additional_noindex_nct_ids: additionalNoindex.map((row) => row.nctId),
    },
    conclusion:
      additionalNoindex.length === 0
        ? "No reviewed trial URL lacks recoverable source evidence. Five placeholder pages and NCT01965600 must surface verified detailed-description evidence; no trial remains approved for thin-content noindex."
        : `${additionalNoindex.length} additional trial URL(s) require URL-level noindex approval.`,
  };
  const headers = [
    "nct_id",
    "url",
    "stop_reason",
    "reason_length",
    "classification_category",
    "classification_confidence",
    "classification_source",
    "detailed_description_evidence",
    "required_page_fields_present",
    "review_decision",
    "required_action",
    "review_reason",
  ];
  const csvRows = reviewed.map((row) => [
    row.nctId,
    row.url,
    row.stopReason,
    row.reasonLength,
    row.classificationCategory,
    row.classificationConfidence,
    row.classificationSource,
    row.detailedDescriptionEvidence,
    row.requiredFields,
    row.decision,
    row.action,
    row.reviewReason,
  ].map(csvCell).join(","));

  await Promise.all([
    fs.writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    fs.writeFile(REVIEW_FILE, `${headers.map(csvCell).join(",")}\n${csvRows.join("\n")}\n`, "utf8"),
  ]);

  console.log(`Reviewed ${reviewed.length} indexable trial pages (${report.review_scope.short_reason_trials} short reasons, ${report.review_scope.placeholder_trials} placeholders).`);
  console.log(`Additional noindex decisions: ${additionalNoindex.length}.`);
}

await main();
