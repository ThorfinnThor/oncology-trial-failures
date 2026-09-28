import { promises as fs } from "node:fs";
import path from "node:path";

const SHARD_COUNT = 256;
const INDEX_SHARD_COUNT = 16;
const PUBLIC_DIR = path.join(process.cwd(), "public");
const SOURCE_FILE = path.join(PUBLIC_DIR, "all_stopped_trials.json");
const INDEX_FILE = path.join(PUBLIC_DIR, "trials-index.json");
const INDEX_SHARD_DIR = path.join(PUBLIC_DIR, "trials-index-shards");
const SHARD_DIR = path.join(PUBLIC_DIR, "trial-shards");
// What the posted results say, per stopped trial (scripts/universe/publish_trial_endpoints.py).
// Optional: without it the trial pages simply carry no results panel.
const ENDPOINTS_FILE = path.join(PUBLIC_DIR, "trial_endpoints.json");

async function loadEndpoints() {
  try {
    const parsed = JSON.parse(await fs.readFile(ENDPOINTS_FILE, "utf8"));
    return { readOn: parsed.read_on || null, trials: parsed.trials || {} };
  } catch {
    return { readOn: null, trials: {} };
  }
}

function asString(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.filter(Boolean).join("; ");
  if (typeof value === "string") return value;
  return String(value);
}

function firstFromSemicolon(value) {
  return (value || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)[0] || "";
}

function compact(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== "" && value != null)
  );
}

function normalizeIndexRow(row) {
  const phasesRaw = row.phases ?? row.phase ?? row.phase_list ?? row.phase_raw ?? row.phases_raw ?? "";
  const conditionsRaw =
    row.conditions ??
    row.condition ??
    row.condition_list ??
    row.condition_name ??
    row.condition_names ??
    row.condition_terms ??
    "";
  const interventionsRaw =
    row.intervention_names ??
    row.interventions ??
    row.intervention ??
    row.intervention_list ??
    row.intervention_name ??
    "";
  const whyRaw =
    row.why_stopped ??
    row.why_stopped_reason ??
    row.why_stopped_text ??
    row.reason_stopped ??
    row.reason ??
    "";
  const diseaseArea = row.disease_area ?? row.area ?? row.condition_area ?? row.therapeutic_area ?? "Other";
  const nctId = asString(row.nct_id).trim();
  const url = row.url || (nctId ? `https://clinicaltrials.gov/study/${encodeURIComponent(nctId)}` : "");

  return compact({
    nct_id: nctId,
    brief_title: asString(row.brief_title || row.title || row.official_title || "").trim(),
    overall_status: asString(row.overall_status || row.status || "").trim(),
    phases: asString(phasesRaw).trim(),
    disease_area: asString(diseaseArea).trim(),
    lead_sponsor: asString(row.lead_sponsor || row.sponsor || row.organization || "").trim(),
    collaborators: asString(row.collaborators || row.collab || "").trim(),
    condition_first: firstFromSemicolon(asString(conditionsRaw)),
    intervention_first: firstFromSemicolon(asString(interventionsRaw)),
    conditions: asString(conditionsRaw).trim(),
    intervention_names: asString(interventionsRaw).trim(),
    countries: asString(row.countries ?? row.country ?? "").trim(),
    why_stopped_short: asString(whyRaw).trim(),
    classification_label: asString(row.classification_label || row.label || "").trim(),
    classification_reason: asString(row.classification_reason || row.reason_bucket || "").trim(),
    classification_confidence: asString(row.classification_confidence || row.confidence || "").trim(),
    classification_evidence: asString(row.classification_evidence || row.evidence || "").trim(),
    classification_outcome_v2: asString(row.classification_outcome_v2 || "").trim(),
    classification_primary_reason_v2: asString(row.classification_primary_reason_v2 || "").trim(),
    classification_secondary_reasons_v2: asString(row.classification_secondary_reasons_v2 || "").trim(),
    classification_needs_review: Boolean(row.classification_needs_review),
    classification_version: asString(row.classification_version || "").trim(),
    classification_source: asString(row.classification_source || "").trim(),
    classification_resolution_status: asString(row.classification_resolution_status || "").trim(),
    classification_final_outcome: asString(row.classification_final_outcome || "").trim(),
    classification_final_category: asString(row.classification_final_category || "").trim(),
    classification_final_explanation: asString(row.classification_final_explanation || "").trim(),
    last_update_post_date: asString(row.last_update_post_date || row.last_update || row.updated || "").trim(),
    url,
  });
}

function shardKey(nctId) {
  const normalized = (nctId || "").trim().toUpperCase();
  const match = normalized.match(/^NCT(\d+)$/);

  let bucket = 0;
  if (match) {
    for (const ch of match[1]) {
      bucket = (bucket * 10 + (ch.charCodeAt(0) - 48)) % SHARD_COUNT;
    }
  } else {
    let hash = 2166136261;
    for (let i = 0; i < normalized.length; i += 1) {
      hash ^= normalized.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    bucket = (hash >>> 0) & 0xff;
  }

  return bucket.toString(16).padStart(2, "0");
}

async function main() {
  const sourceText = await fs.readFile(SOURCE_FILE, "utf8");
  const sourceRows = JSON.parse(sourceText);
  if (!Array.isArray(sourceRows)) {
    throw new Error(`${SOURCE_FILE} must contain a JSON array`);
  }

  const endpoints = await loadEndpoints();
  let withResult = 0;
  const indexRows = [];
  const indexShards = Array.from({ length: INDEX_SHARD_COUNT }, () => []);
  const shards = Array.from({ length: SHARD_COUNT }, () => []);

  for (const sourceRow of sourceRows) {
    const indexRow = normalizeIndexRow(sourceRow);
    if (!indexRow.nct_id) continue;

    indexRows.push(indexRow);
    const result = endpoints.trials[indexRow.nct_id.toUpperCase()];
    if (result) withResult += 1;
    const detailRow = compact({
      ...indexRow,
      why_stopped: indexRow.why_stopped_short || "",
      conditions: indexRow.conditions || indexRow.condition_first || "",
      intervention_names: indexRow.intervention_names || indexRow.intervention_first || "",
      // Detail only: the index stays compact, and only the trial page shows the evidence.
      endpoint_result: result ? { ...result, read_on: endpoints.readOn } : null,
    });
    const key = shardKey(indexRow.nct_id);
    indexShards[Number.parseInt(key[0], 16)].push(indexRow);
    shards[Number.parseInt(key, 16)].push(detailRow);
  }

  await fs.rm(INDEX_FILE, { force: true });
  await fs.rm(INDEX_SHARD_DIR, { recursive: true, force: true });
  await fs.rm(SHARD_DIR, { recursive: true, force: true });
  await fs.mkdir(INDEX_SHARD_DIR, { recursive: true });
  await fs.mkdir(SHARD_DIR, { recursive: true });

  await Promise.all(
    indexShards.map((rows, bucket) => {
      const key = bucket.toString(16);
      return fs.writeFile(path.join(INDEX_SHARD_DIR, `${key}.json`), JSON.stringify(rows), "utf8");
    })
  );
  await Promise.all(
    shards.map((rows, bucket) => {
      const key = bucket.toString(16).padStart(2, "0");
      return fs.writeFile(path.join(SHARD_DIR, `${key}.json`), JSON.stringify(rows), "utf8");
    })
  );

  const largestIndexShard = Math.max(
    ...indexShards.map((rows) => Buffer.byteLength(JSON.stringify(rows), "utf8"))
  );
  const largestShard = Math.max(...shards.map((rows) => Buffer.byteLength(JSON.stringify(rows), "utf8")));
  console.log(
    `Generated ${indexRows.length.toLocaleString()} compact trial rows across ${INDEX_SHARD_COUNT} index shards ` +
      `and ${SHARD_COUNT} detail shards. Largest index shard: ${(largestIndexShard / 1024 / 1024).toFixed(2)} MB; ` +
      `largest detail shard: ${(largestShard / 1024).toFixed(1)} KB. ` +
      `${withResult.toLocaleString()} trials carry a read primary result.`
  );
}

await main();
