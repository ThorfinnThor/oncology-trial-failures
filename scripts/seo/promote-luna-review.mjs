#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const approvalPath = path.join(root, "docs/seo/approved-decisions.csv");
const reviewPath = path.join(root, "docs/seo/luna-candidate-review.csv");
const decisionVersion = "luna-approval-v2";

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
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
  fields.push(field);
  return fields;
}

function readCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() || "");
  return {
    headers,
    rows: lines.map((line) => Object.fromEntries(
      parseCsvLine(line).map((value, index) => [headers[index], value])
    )),
  };
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const approvals = readCsv(approvalPath);
const reviews = readCsv(reviewPath).rows;
if (!reviews.length || reviews.some((row) => row.approval_status !== "APPROVED_FOR_REPORT_MODE")) {
  throw new Error("Every Luna review row must be APPROVED_FOR_REPORT_MODE before promotion");
}

const reviewUrls = new Set(reviews.map((row) => row.url));
const rows = approvals.rows
  .filter((row) => !reviewUrls.has(row.url))
  .map((row) => ({ ...row, decision_version: decisionVersion }));

for (const review of reviews) {
  rows.push({
    url_id: review.url_id,
    url: review.url,
    page_type: "trial",
    role: review.recommended_decision === "NOINDEX_THIN_CONTENT"
      ? "thin_content_candidate"
      : "classification_migration",
    approved_decision: review.recommended_decision,
    decision_reason: review.decision_reason,
    protected: "false",
    reviewer: review.reviewer,
    reviewed_at: review.reviewed_at,
    decision_version: decisionVersion,
    replacement_url: "",
  });
}

const output = [
  approvals.headers.join(","),
  ...rows.map((row) => approvals.headers.map((header) => csvCell(row[header])).join(",")),
  "",
].join("\n");
fs.writeFileSync(approvalPath, output, "utf8");
console.log(`Promoted ${reviews.length} Luna decisions; ${rows.length} total approvals in ${decisionVersion}.`);
