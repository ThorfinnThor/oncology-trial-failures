#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const inventoryPath = process.argv[2] ?? "docs/seo/url-inventory.csv";
const protectedPath = process.argv[3] ?? "docs/seo/protected-urls.csv";
const registryPath = process.argv[4] ?? "docs/seo/url-registry.csv";
const decisionsPath = process.argv[5] ?? "docs/seo/proposed-decisions.csv";
const reportPath = process.argv[6] ?? "docs/seo/seo-decision-report.md";

const snapshotId = "sitemap-2026-10-06";
const decisionVersion = "registry-v1";
const classificationVersion = "path-family-v1";
const verifiedAt = "2026-10-06";

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

function readCsv(filePath) {
  const lines = fs.readFileSync(path.resolve(root, filePath), "utf8")
    .split(/\r?\n/)
    .filter(Boolean);
  const headers = parseCsvLine(lines.shift());
  return lines.map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])));
}

function csv(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function writeCsv(filePath, headers, rows) {
  const output = [headers.map(csv).join(",")];
  for (const row of rows) output.push(headers.map((header) => csv(row[header])).join(","));
  fs.writeFileSync(path.resolve(root, filePath), `${output.join("\n")}\n`);
}

function urlId(url) {
  return `url_${crypto.createHash("sha256").update(url).digest("hex").slice(0, 12)}`;
}

const inventory = readCsv(inventoryPath);
const protectedRows = readCsv(protectedPath);
const protectedByUrl = new Map(protectedRows.map((row) => [row.url, row]));

const metrics = new Map([
  ["/", [41, 475]],
  ["/failures/ophthalmology", [0, 2477]],
  ["/failures/respiratory", [2, 400]],
  ["/failures/cardiovascular", [2, 69]],
  ["/failures/dermatology", [1, 434]],
  ["/failures/neurology", [1, 318]],
  ["/failures/infectious-disease", [1, 29]],
  ["/failures/hematology-non-onc", [0, 776]],
  ["/failures/gastroenterology-and-hepatology", [0, 134]],
]);

const headers = [
  "url_id", "url", "page_type", "entity_id", "canonical_entity_id",
  "current_http_status", "current_robots", "current_canonical", "proposed_decision",
  "approved_decision", "decision_reason", "review_state", "reviewer", "reviewed_at",
  "decision_version", "protected", "protection_reasons", "measurement_status", "clicks_90d",
  "impressions_90d", "known_external_links", "source_record_count", "source_snapshot_id",
  "classification_version", "source_verified_at", "latest_source_update_at", "content_changed_at",
  "content_hash", "replacement_url", "pilot_group", "last_valid_configuration",
];

const registry = inventory.map((item) => {
  const pathname = new URL(item.url).pathname;
  const protection = protectedByUrl.get(item.url)
    ?? (pathname.startsWith("/trial/NCT03940690")
      ? protectedRows.find((row) => row.url.includes("/trial/NCT03940690"))
      : undefined);
  const metric = metrics.get(pathname);
  const nctReference = pathname.startsWith("/trial/NCT03940690") ? [0, 5436] : undefined;
  const measured = metric ?? nctReference;
  const protectedFlag = Boolean(protection);
  const reason = protectedFlag
    ? `Protected URL from explicit audit list: ${protection.protection_reason}`
    : "Inventory-only snapshot; no page-quality review or exclusion decision has been approved";

  return {
    url_id: urlId(item.url),
    url: item.url,
    page_type: item.page_type,
    entity_id: pathname.match(/\/(?:trial|sponsor|failures)\/([^/?#]+)/)?.[1] ?? "",
    canonical_entity_id: "",
    current_http_status: "unknown",
    current_robots: "unknown",
    current_canonical: "unknown",
    proposed_decision: "REVIEW_HOLD",
    approved_decision: "",
    decision_reason: reason,
    review_state: "unreviewed",
    reviewer: "",
    reviewed_at: "",
    decision_version: decisionVersion,
    protected: protectedFlag ? "true" : "false",
    protection_reasons: protection?.protection_reason ?? "",
    measurement_status: measured ? "partial" : item.measurement_status,
    clicks_90d: measured?.[0] ?? "",
    impressions_90d: measured?.[1] ?? "",
    known_external_links: "unknown",
    source_record_count: "unknown",
    source_snapshot_id: snapshotId,
    classification_version: classificationVersion,
    source_verified_at: verifiedAt,
    latest_source_update_at: item.lastmod,
    content_changed_at: "",
    content_hash: "",
    replacement_url: "",
    pilot_group: pathname === "/failures/ophthalmology" ? "ophthalmology" : "",
    last_valid_configuration: "preserve-observed-behavior",
  };
});

writeCsv(registryPath, headers, registry);
writeCsv(decisionsPath, ["url_id", "url", "page_type", "proposed_decision", "decision_reason", "protected", "measurement_status", "decision_version"], registry);

const counts = (field) => Object.entries(registry.reduce((acc, row) => {
  acc[row[field]] = (acc[row[field]] ?? 0) + 1;
  return acc;
}, {})).sort(([a], [b]) => a.localeCompare(b));
const protectedCount = registry.filter((row) => row.protected === "true").length;
const report = [
  "# SEO decision report",
  "",
  `- Generated: ${verifiedAt}`,
  `- Source snapshot: ${snapshotId}`,
  `- Decision version: ${decisionVersion}`,
  `- Registry rows: ${registry.length}`,
  `- Protected rows: ${protectedCount}`,
  "- Production side effects: none; all rows remain unreviewed and proposed as `REVIEW_HOLD`.",
  "",
  "## Page-type counts",
  "",
  "| Page type | Rows |",
  "| --- | ---: |",
  ...counts("page_type").map(([key, value]) => `| ${key} | ${value} |`),
  "",
  "## Decision counts",
  "",
  "| Proposed decision | Rows |",
  "| --- | ---: |",
  ...counts("proposed_decision").map(([key, value]) => `| ${key} | ${value} |`),
  "",
  "## Guardrails",
  "",
  "- No row is approved for `NOINDEX_UTILITY`, `CANONICAL_DUPLICATE`, `MERGE_REDIRECT`, or `REMOVE`.",
  "- Missing measurement, backlink, or product-usage data remains `unknown`; it is not converted to zero.",
  "- A later decision must include reviewer, reason, decision version, and the last valid configuration.",
].join("\n");
fs.writeFileSync(path.resolve(root, reportPath), `${report}\n`);

console.log(`Generated ${registry.length} registry rows at ${registryPath}`);
