import { readdir, rm } from "node:fs/promises";
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

const legacyAssets = [
  indexPath,
  path.join(assetsDir, "all_stopped_trials.json"),
  path.join(assetsDir, "data", "all_stopped_trials.json"),
];

await Promise.all(legacyAssets.map((asset) => rm(asset, { force: true })));
console.log("Prepared Cloudflare assets: retained 16 index shards and 256 detail shards; removed oversized legacy assets.");
