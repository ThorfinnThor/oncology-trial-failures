#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePath = path.resolve(root, "docs/seo/approved-decisions.csv");
const outputPath = path.resolve(root, "web/config/seo-approved-decisions.json");
const checkOnly = process.argv.includes("--check");
const allowedDecisions = new Set([
  "KEEP_INDEX",
  "IMPROVE_INDEX",
  "REVIEW_HOLD",
  "NOINDEX_UTILITY",
  "NOINDEX_THIN_CONTENT",
  "CANONICAL_DUPLICATE",
  "MERGE_REDIRECT",
  "REMOVE",
]);

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("Unclosed quoted field in approved decisions CSV");
  fields.push(field);
  return fields;
}

function readCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift());
  return lines.map((line) => Object.fromEntries(
    parseCsvLine(line).map((value, index) => [headers[index], value])
  ));
}

const rows = readCsv(sourcePath);
const seenUrls = new Set();
for (const row of rows) {
  if (!row.url || !row.url_id) throw new Error("Every approved decision needs url and url_id");
  if (seenUrls.has(row.url)) throw new Error(`Duplicate approved URL: ${row.url}`);
  seenUrls.add(row.url);
  if (!allowedDecisions.has(row.approved_decision)) {
    throw new Error(`Invalid approved decision for ${row.url}: ${row.approved_decision}`);
  }
  if (!row.reviewer || !row.reviewed_at || !row.decision_version || !row.decision_reason) {
    throw new Error(`Incomplete approval metadata for ${row.url}`);
  }
  if (["CANONICAL_DUPLICATE", "MERGE_REDIRECT"].includes(row.approved_decision) && !row.replacement_url) {
    throw new Error(`${row.approved_decision} requires a replacement URL: ${row.url}`);
  }
}

const versions = [...new Set(rows.map((row) => row.decision_version))];
if (versions.length !== 1) throw new Error(`Expected one decision version, found: ${versions.join(", ")}`);

const payload = {
  schemaVersion: 1,
  decisionVersion: versions[0],
  source: "docs/seo/approved-decisions.csv",
  defaultMode: "report",
  decisions: rows.map((row) => ({
    urlId: row.url_id,
    url: row.url,
    pageType: row.page_type,
    role: row.role,
    decision: row.approved_decision,
    reason: row.decision_reason,
    protected: row.protected === "true",
    reviewer: row.reviewer,
    reviewedAt: row.reviewed_at,
    replacementUrl: row.replacement_url || null,
  })),
};
const output = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== output) {
    throw new Error("Generated SEO approval config is stale. Run: node scripts/seo/generate-indexing-policy.mjs");
  }
  console.log(`SEO approval config is current (${rows.length} decisions, ${versions[0]})`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(`Generated ${rows.length} approved SEO decisions at ${path.relative(root, outputPath)}`);
}
