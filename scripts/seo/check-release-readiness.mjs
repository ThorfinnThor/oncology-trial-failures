#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const configPath = path.resolve(root, "web/config/seo-approved-decisions.json");
const wranglerPath = path.resolve(root, "web/wrangler.jsonc");
const profileArgument = process.argv.find((argument) => argument.startsWith("--profile="));
const profileName = profileArgument?.slice("--profile=".length) || "report";

const RECOVERED_EVIDENCE_URL =
  "https://clinicaltrialfailures.com/trial/NCT01965600-a-study-to-evaluate-the-safety-and-effects-on-the-body-of-an-investigational-dru";
const STATIC_UTILITY_NOINDEX_URLS = new Set([
  "https://clinicaltrialfailures.com/explore",
  "https://clinicaltrialfailures.com/asset-check",
  "https://clinicaltrialfailures.com/newsletter",
  "https://clinicaltrialfailures.com/contact",
]);
const STATIC_THIN_NOINDEX_URL = "https://clinicaltrialfailures.com/sponsor-insights";

const profiles = {
  report: {
    SEO_INDEXING_REPORT_MODE: "true",
    SEO_INDEXING_PILOT_TEMPLATES: "false",
    SEO_INDEXING_REGISTRY_SITEMAP: "false",
    SEO_INDEXING_INDEX_DIRECTIVES: "false",
    SEO_INDEXING_NOINDEX_LIST: "false",
    SEO_INDEXING_CANONICAL_DUPLICATES: "false",
    SEO_INDEXING_REDIRECT_LIST: "false",
    SEO_INDEXING_REMOVAL_LIST: "false",
  },
  "trial-quality-release": {
    SEO_INDEXING_REPORT_MODE: "false",
    SEO_INDEXING_PILOT_TEMPLATES: "false",
    SEO_INDEXING_REGISTRY_SITEMAP: "true",
    SEO_INDEXING_INDEX_DIRECTIVES: "false",
    SEO_INDEXING_NOINDEX_LIST: "false",
    SEO_INDEXING_CANONICAL_DUPLICATES: "false",
    SEO_INDEXING_REDIRECT_LIST: "false",
    SEO_INDEXING_REMOVAL_LIST: "false",
  },
};

function fail(message) {
  throw new Error(`SEO release guard: ${message}`);
}

function countBy(items, key) {
  return items.filter((item) => item.decision === key).length;
}

if (!Object.hasOwn(profiles, profileName)) {
  fail(`unknown profile ${profileName}. Expected one of: ${Object.keys(profiles).join(", ")}`);
}
if (!fs.existsSync(configPath)) {
  fail("generated approval config is missing; run the SEO policy generator first");
}
if (!fs.existsSync(wranglerPath) || !/"keep_vars"\s*:\s*true\b/.test(fs.readFileSync(wranglerPath, "utf8"))) {
  fail("wrangler.jsonc must preserve reviewed dashboard variables with keep_vars=true");
}

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const decisions = config.decisions ?? [];

if (config.schemaVersion !== 1) fail(`expected schemaVersion 1, found ${config.schemaVersion}`);
if (config.decisionVersion !== "luna-approval-v2") {
  fail(`expected decision version luna-approval-v2, found ${config.decisionVersion}`);
}
if (config.defaultMode !== "report") fail(`expected report default, found ${config.defaultMode}`);
if (decisions.length !== 36) fail(`expected 36 reviewed decisions, found ${decisions.length}`);

const urls = new Set();
for (const decision of decisions) {
  if (urls.has(decision.url)) fail(`duplicate URL ${decision.url}`);
  urls.add(decision.url);
  if (new URL(decision.url).origin !== "https://clinicaltrialfailures.com") {
    fail(`approval points outside the production origin: ${decision.url}`);
  }
  if (decision.protected && ["NOINDEX_UTILITY", "NOINDEX_THIN_CONTENT", "CANONICAL_DUPLICATE", "MERGE_REDIRECT", "REMOVE"].includes(decision.decision)) {
    fail(`protected URL has a destructive decision: ${decision.url}`);
  }
}

const noindexThin = decisions.filter((decision) => decision.decision === "NOINDEX_THIN_CONTENT");
if (
  noindexThin.length !== 1 ||
  noindexThin[0].url !== STATIC_THIN_NOINDEX_URL ||
  noindexThin[0].pageType !== "static_reference" ||
  noindexThin[0].protected
) {
  fail("expected exactly the reviewed sponsor-insights thin-content noindex decision");
}

const noindexUtility = decisions.filter((decision) => decision.decision === "NOINDEX_UTILITY");
if (
  noindexUtility.length !== STATIC_UTILITY_NOINDEX_URLS.size ||
  noindexUtility.some(
    (decision) =>
      !STATIC_UTILITY_NOINDEX_URLS.has(decision.url) ||
      decision.pageType !== "static_reference" ||
      decision.protected
  )
) {
  fail("expected exactly the four reviewed static utility noindex decisions");
}

const improveIndex = decisions.filter((decision) => decision.decision === "IMPROVE_INDEX");
if (improveIndex.length !== 21) fail(`expected 21 IMPROVE_INDEX decisions, found ${improveIndex.length}`);
if (improveIndex.filter((decision) => decision.role === "classification_migration").length !== 20) {
  fail("expected exactly 20 classification-migration IMPROVE_INDEX decisions");
}
const recoveredEvidence = improveIndex.find((decision) => decision.url === RECOVERED_EVIDENCE_URL);
if (recoveredEvidence?.role !== "evidence_recovery" || recoveredEvidence.protected) {
  fail("NCT01965600 must be an unprotected evidence_recovery IMPROVE_INDEX decision");
}

for (const disallowed of ["CANONICAL_DUPLICATE", "MERGE_REDIRECT", "REMOVE"]) {
  if (countBy(decisions, disallowed) !== 0) {
    fail(`${disallowed} is outside this release scope`);
  }
}

const profile = profiles[profileName];
const enabled = Object.entries(profile)
  .filter(([, value]) => value === "true")
  .map(([name]) => name);

if (profileName === "trial-quality-release") {
  const expectedEnabled = ["SEO_INDEXING_REGISTRY_SITEMAP"];
  if (JSON.stringify(enabled) !== JSON.stringify(expectedEnabled)) {
    fail(`trial-quality release enables an unexpected switch: ${enabled.join(", ") || "none"}`);
  }
}

console.log(`SEO release profile '${profileName}' is ready.`);
console.log(`Decision scope: ${decisions.length} reviewed URLs; 1 thin-content noindex; 4 utility noindex; 21 improve-only URLs.`);
console.log(`Recovered evidence URL: ${RECOVERED_EVIDENCE_URL}`);
console.log("Exact feature settings:");
for (const [name, value] of Object.entries(profile)) console.log(`  ${name}=${value}`);
