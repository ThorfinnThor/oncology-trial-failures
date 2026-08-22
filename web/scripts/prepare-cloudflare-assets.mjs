import { access, readdir, rm } from "node:fs/promises";
import path from "node:path";

const assetsDir = path.join(process.cwd(), ".open-next", "assets");
const indexPath = path.join(assetsDir, "trials-index.json");
const shardDir = path.join(assetsDir, "trial-shards");

// The application now serves the compact index and per-trial shards. Confirm
// those assets exist before excluding the two legacy 25+ MiB JSON copies that
// exceed Cloudflare Workers' individual static-asset size limit.
await access(indexPath);
const shardFiles = (await readdir(shardDir)).filter((name) => name.endsWith(".json"));
if (shardFiles.length !== 256) {
  throw new Error(`Expected 256 trial shards, found ${shardFiles.length}.`);
}

const legacyAssets = [
  path.join(assetsDir, "all_stopped_trials.json"),
  path.join(assetsDir, "data", "all_stopped_trials.json"),
];

await Promise.all(legacyAssets.map((asset) => rm(asset, { force: true })));
console.log("Prepared Cloudflare assets: retained compact index and 256 shards; removed legacy full-dataset copies.");
