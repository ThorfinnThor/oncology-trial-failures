import { readdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const assetsDir = path.join(process.cwd(), ".open-next", "assets");
const indexPath = path.join(assetsDir, "trials-index.json");
const indexShardDir = path.join(assetsDir, "trials-index-shards");
const shardDir = path.join(assetsDir, "trial-shards");

// Confirm the generated index and detail shards before excluding legacy assets
// that exceed Cloudflare Workers' 25 MiB per-file static-asset limit.
const indexShardFiles = (await readdir(indexShardDir)).filter((name) => name.endsWith(".json"));
if (indexShardFiles.length !== 16) {
  throw new Error(`Expected 16 index shards, found ${indexShardFiles.length}.`);
}
const shardFiles = (await readdir(shardDir)).filter((name) => name.endsWith(".json"));
if (shardFiles.length !== 256) {
  throw new Error(`Expected 256 trial shards, found ${shardFiles.length}.`);
}

// Bulk dataset files are licensed products and are never deployed. The site itself
// only needs the index/detail shards, dataset_meta.json, ingest_changes.json and
// specialness_index.json.
const bulkAssets = [
  indexPath,
  path.join(assetsDir, "all_stopped_trials.json"),
  path.join(assetsDir, "all_stopped_trials.csv"),
  path.join(assetsDir, "biological_failure_trials.json"),
  path.join(assetsDir, "biological_failure_trials.csv"),
  path.join(assetsDir, "biological_failure_oncology_trials.json"),
  path.join(assetsDir, "biological_failure_oncology_trials.csv"),
  path.join(assetsDir, "all_oncology_stopped_trials.json"),
  path.join(assetsDir, "all_oncology_stopped_trials.csv"),
];

await Promise.all(bulkAssets.map((asset) => rm(asset, { force: true })));
await rm(path.join(assetsDir, "data"), { recursive: true, force: true });

// Drop superseded (emptied) sample files.
const sampleDir = path.join(assetsDir, "samples");
try {
  for (const name of await readdir(sampleDir)) {
    const file = path.join(sampleDir, name);
    if ((await stat(file)).size === 0) await rm(file, { force: true });
  }
} catch {
  // no samples directory
}

console.log("Prepared Cloudflare assets: retained index/detail shards; removed bulk dataset files and web/public/data.");
