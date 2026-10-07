import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "data/all_stopped_trials.json");
const INVENTORY_FILE = path.join(ROOT, "docs/seo/url-inventory.csv");
const REGISTRY_FILE = path.join(ROOT, "docs/seo/url-registry.csv");
const REPORT_FILE = path.join(ROOT, "docs/seo/data-consistency-report.json");
const CANDIDATE_FILE = path.join(ROOT, "docs/seo/low-information-candidates.csv");
const MIGRATION_FILE = path.join(ROOT, "docs/seo/indexability-migration-candidates.csv");
const LUNA_REVIEW_FILE = path.join(ROOT, "docs/seo/luna-candidate-review.csv");

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function code(value) {
  return clean(value).replace(/[\s/-]+/g, "_").toUpperCase();
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function parseCsvLine(line) {
  const cells = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  cells.push(value);
  return cells;
}

function inventoryTrialUrls(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() || "");
  const urlIndex = headers.indexOf("url");
  const urls = new Map();
  for (const line of lines) {
    const url = parseCsvLine(line)[urlIndex] || "";
    const match = url.match(/\/trial\/(NCT\d+)/i);
    if (match) urls.set(match[1].toUpperCase(), url);
  }
  return urls;
}

function registryRows(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() || "");
  return lines.map((line) => Object.fromEntries(
    parseCsvLine(line).map((value, index) => [headers[index], value])
  ));
}

function resolvedClassification(row) {
  const finalOutcome = code(row.classification_final_outcome);
  const finalReason = code(row.classification_final_category);
  if (finalOutcome || finalReason) {
    const unresolved =
      code(row.classification_resolution_status) === "UNRESOLVED" ||
      finalOutcome === "UNRESOLVED" ||
      finalOutcome === "UNKNOWN" ||
      finalReason.startsWith("UNRESOLVED_");
    return {
      outcome: unresolved ? "UNRESOLVED" : finalOutcome || "UNRESOLVED",
      reason: finalReason || "UNSPECIFIED",
      source: "final",
      reviewRequired: unresolved || row.classification_needs_review === true,
    };
  }
  const v2Outcome = code(row.classification_outcome_v2);
  const v2Reason = code(row.classification_primary_reason_v2);
  const unresolved = row.classification_needs_review === true || !v2Outcome || ["UNKNOWN", "UNRESOLVED"].includes(v2Outcome);
  return {
    outcome: unresolved ? "UNRESOLVED" : v2Outcome,
    reason: v2Reason || "UNSPECIFIED",
    source: v2Outcome || v2Reason ? "v2" : "legacy_or_unknown",
    reviewRequired: unresolved,
  };
}

function currentLegacyIndexable(row) {
  const finalOutcome = code(row.classification_final_outcome);
  if (finalOutcome && finalOutcome !== "UNRESOLVED") return finalOutcome === "BIOLOGICAL_FAILURE";
  const v2Outcome = code(row.classification_outcome_v2);
  if (v2Outcome) return v2Outcome === "BIOLOGICAL_FAILURE";
  const label = code(row.failure_label || row.classification_label || row.failure_type);
  return label.includes("BIOLOGICAL_FAILURE") || label.includes("SCIENTIFIC_FAILURE");
}

function candidateReasons(row) {
  const reasons = [];
  if (!clean(row.why_stopped)) reasons.push("missing_stop_reason");
  if (!clean(row.brief_title)) reasons.push("missing_title");
  if (!clean(row.conditions) && !clean(row.intervention_names)) reasons.push("missing_condition_and_intervention");
  if (!clean(row.url)) reasons.push("missing_source_url");
  if (!clean(row.classification_final_explanation)) reasons.push("missing_classification_explanation");
  return reasons;
}

function countBy(items, getter) {
  const counts = {};
  for (const item of items) {
    const key = getter(item) || "UNKNOWN";
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

async function main() {
  const [dataText, inventoryText, registryText] = await Promise.all([
    fs.readFile(DATA_FILE, "utf8"),
    fs.readFile(INVENTORY_FILE, "utf8"),
    fs.readFile(REGISTRY_FILE, "utf8"),
  ]);
  const rows = JSON.parse(dataText);
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`${DATA_FILE} must contain a non-empty JSON array`);

  const sitemapUrls = inventoryTrialUrls(inventoryText);
  const registryByUrl = new Map(registryRows(registryText).map((row) => [row.url, row]));
  const seen = new Set();
  const duplicateNctIds = [];
  const primaryAreaMissingFromMatched = [];
  const candidates = [];
  const sponsorSlugs = new Map();

  for (const row of rows) {
    const nctId = clean(row.nct_id).toUpperCase();
    if (!nctId || seen.has(nctId)) duplicateNctIds.push(nctId || "<missing>");
    seen.add(nctId);

    const matchedAreas = clean(row.disease_areas_matched).split(";").map(clean).filter(Boolean);
    const primaryArea = clean(row.disease_area);
    if (matchedAreas.length && primaryArea && !matchedAreas.includes(primaryArea)) {
      primaryAreaMissingFromMatched.push(nctId);
    }

    const sponsor = clean(row.lead_sponsor);
    if (sponsor) {
      const slug = sponsor.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!sponsorSlugs.has(slug)) sponsorSlugs.set(slug, new Set());
      sponsorSlugs.get(slug).add(sponsor);
    }

    const reasons = candidateReasons(row);
    if (!reasons.length) continue;
    const classification = resolvedClassification(row);
    const currentIndexable = currentLegacyIndexable(row);
    const inventoryUrl = sitemapUrls.get(nctId) || "";
    candidates.push({
      nctId,
      url: inventoryUrl || `https://clinicaltrialfailures.com/trial/${encodeURIComponent(nctId)}`,
      inSitemap: Boolean(inventoryUrl),
      currentIndexable,
      reasons,
      finalOutcome: classification.outcome,
      finalCategory: classification.reason,
      classificationSource: clean(row.classification_source) || classification.source,
      nextAction: currentIndexable ? "LUNA_REVIEW_ENRICH_OR_NOINDEX" : "VERIFY_CURRENT_EXCLUSION",
    });
  }

  const slugCollisions = [...sponsorSlugs.entries()]
    .filter(([, labels]) => labels.size > 1)
    .map(([slug, labels]) => ({ slug, labels: [...labels].sort() }));
  const indexableCandidates = candidates.filter((item) => item.currentIndexable);
  const missingStopReasonCandidates = candidates.filter((item) => item.reasons.includes("missing_stop_reason"));
  const indexabilityMigrationCandidates = rows.filter((row) => {
    const classification = resolvedClassification(row);
    const resolvedIndexable = !classification.reviewRequired && classification.outcome === "BIOLOGICAL_FAILURE";
    return currentLegacyIndexable(row) !== resolvedIndexable;
  });
  const lunaReviewCandidates = [
    ...indexableCandidates,
    ...indexabilityMigrationCandidates.map((row) => {
      const nctId = clean(row.nct_id).toUpperCase();
      const classification = resolvedClassification(row);
      const inventoryUrl = sitemapUrls.get(nctId) || "";
      return {
        nctId,
        url: inventoryUrl || `https://clinicaltrialfailures.com/trial/${encodeURIComponent(nctId)}`,
        inSitemap: Boolean(inventoryUrl),
        currentIndexable: currentLegacyIndexable(row),
        reasons: ["final_unresolved_legacy_fallback"],
        finalOutcome: classification.outcome,
        finalCategory: classification.reason,
        classificationSource: clean(row.classification_source) || classification.source,
      };
    }),
  ].filter((item, index, items) => items.findIndex((candidate) => candidate.nctId === item.nctId) === index);

  const report = {
    schema_version: 1,
    generated_from: "data/all_stopped_trials.json",
    mode: "report_only",
    guardrail: "No URL is deindexed by this report. Every index change requires URL-level Luna approval.",
    records: {
      total: rows.length,
      unique_nct_ids: seen.size,
      duplicate_or_missing_nct_ids: duplicateNctIds,
    },
    classification: {
      final_outcomes: countBy(rows, (row) => resolvedClassification(row).outcome),
      current_legacy_indexable_records: rows.filter(currentLegacyIndexable).length,
      resolved_biological_records: rows.filter((row) => {
        const value = resolvedClassification(row);
        return !value.reviewRequired && value.outcome === "BIOLOGICAL_FAILURE";
      }).length,
      indexability_migration_candidate_count: indexabilityMigrationCandidates.length,
      indexability_migration_candidate_nct_ids: indexabilityMigrationCandidates.map((row) => clean(row.nct_id).toUpperCase()),
      migration_policy: "Keep legacy SEO eligibility until each changed URL receives Luna approval in the decision registry.",
    },
    luna_review: {
      candidate_count: lunaReviewCandidates.length,
      recommended_decisions: countBy(lunaReviewCandidates, (item) => item.reasons.includes("missing_stop_reason") ? "NOINDEX_THIN_CONTENT" : "IMPROVE_INDEX"),
      status: "APPROVED_FOR_REPORT_MODE",
      note: "Luna approved these URL-level decisions for registry report mode. Production activation remains a separate Sol release step.",
    },
    low_information_candidates: {
      total: candidates.length,
      signal_counts: countBy(candidates.flatMap((item) => item.reasons), (reason) => reason),
      final_outcomes: countBy(candidates, (item) => item.finalOutcome),
      currently_indexable: indexableCandidates.length,
      currently_indexable_nct_ids: indexableCandidates.map((item) => item.nctId),
      in_current_sitemap: candidates.filter((item) => item.inSitemap).length,
      missing_stop_reason_total: missingStopReasonCandidates.length,
      missing_stop_reason_outcomes: countBy(missingStopReasonCandidates, (item) => item.finalOutcome),
    },
    taxonomy: {
      records_with_multiple_matched_areas: rows.filter((row) => clean(row.disease_areas_matched).split(";").filter((value) => clean(value)).length > 1).length,
      primary_area_missing_from_matched_count: primaryAreaMissingFromMatched.length,
      primary_area_missing_from_matched_sample: primaryAreaMissingFromMatched.slice(0, 25),
      hub_membership_policy: "Disease-area hubs continue to use disease_area as the single primary denominator; disease_areas_matched is retained for audit and future reviewed expansion.",
      sponsor_policy: "Sponsor hubs continue to use exact lead_sponsor labels. Alias consolidation requires a separate reviewed canonical map.",
      sponsor_slug_collision_count: slugCollisions.length,
      sponsor_slug_collisions: slugCollisions,
    },
  };

  const headers = [
    "nct_id",
    "url",
    "in_sitemap",
    "current_indexable",
    "candidate_reasons",
    "final_outcome",
    "final_category",
    "classification_source",
    "decision_status",
    "recommended_next_action",
    "review_note",
  ];
  const csvRows = candidates
    .sort((a, b) => Number(b.currentIndexable) - Number(a.currentIndexable) || a.nctId.localeCompare(b.nctId))
    .map((item) => [
      item.nctId,
      item.url,
      item.inSitemap,
      item.currentIndexable,
      item.reasons.join(";"),
      item.finalOutcome,
      item.finalCategory,
      item.classificationSource,
      "REVIEW_HOLD",
      item.nextAction,
      "Do not deindex automatically; compare source evidence, page uniqueness, GSC value, and replacement options.",
    ].map(csvCell).join(","));
  const migrationHeaders = [
    "nct_id",
    "url",
    "in_sitemap",
    "current_legacy_indexable",
    "resolved_indexable",
    "final_outcome",
    "final_category",
    "classification_source",
    "decision_status",
    "review_note",
  ];
  const migrationRows = indexabilityMigrationCandidates.map((row) => {
    const nctId = clean(row.nct_id).toUpperCase();
    const classification = resolvedClassification(row);
    const inventoryUrl = sitemapUrls.get(nctId) || "";
    return [
      nctId,
      inventoryUrl || `https://clinicaltrialfailures.com/trial/${encodeURIComponent(nctId)}`,
      Boolean(inventoryUrl),
      currentLegacyIndexable(row),
      !classification.reviewRequired && classification.outcome === "BIOLOGICAL_FAILURE",
      classification.outcome,
      classification.reason,
      clean(row.classification_source) || classification.source,
      "REVIEW_HOLD",
      "Final outcome is unresolved; preserve current SEO eligibility until Luna approves a URL-level migration.",
    ].map(csvCell).join(",");
  });
  const lunaHeaders = [
    "url_id",
    "nct_id",
    "url",
    "in_sitemap",
    "current_indexable",
    "final_outcome",
    "final_category",
    "classification_source",
    "recommended_decision",
    "decision_reason",
    "reviewer",
    "reviewed_at",
    "approval_status",
  ];
  const lunaRows = lunaReviewCandidates.map((item) => {
    const registry = registryByUrl.get(item.url) || {};
    const thinContent = item.reasons.includes("missing_stop_reason");
    return [
      registry.url_id || "",
      item.nctId,
      item.url,
      item.inSitemap,
      item.currentIndexable,
      item.finalOutcome,
      item.finalCategory,
      item.classificationSource,
      thinContent ? "NOINDEX_THIN_CONTENT" : "IMPROVE_INDEX",
      thinContent
        ? "Missing registry stop wording; description-fallback classification is not enough for a defensible failure page. Keep 200 but remove from sitemap and apply noindex only after Sol activates this reviewed decision type."
        : "Keep indexable: the page has a specific registry stop statement, study identity, conditions, interventions, and source link. Improve copy so unresolved benefit-risk evidence is not presented as a confirmed biological failure.",
      "Luna",
      "2026-10-07",
      "APPROVED_FOR_REPORT_MODE",
    ].map(csvCell).join(",");
  });

  await Promise.all([
    fs.writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    fs.writeFile(CANDIDATE_FILE, `${headers.map(csvCell).join(",")}\n${csvRows.join("\n")}\n`, "utf8"),
    fs.writeFile(MIGRATION_FILE, `${migrationHeaders.map(csvCell).join(",")}\n${migrationRows.join("\n")}\n`, "utf8"),
    fs.writeFile(LUNA_REVIEW_FILE, `${lunaHeaders.map(csvCell).join(",")}\n${lunaRows.join("\n")}\n`, "utf8"),
  ]);

  console.log(`Audited ${rows.length.toLocaleString()} records; wrote ${candidates.length.toLocaleString()} low-information candidates.`);
  console.log(`${indexableCandidates.length.toLocaleString()} candidate(s) are currently indexable: ${indexableCandidates.map((item) => item.nctId).join(", ") || "none"}.`);
}

await main();
