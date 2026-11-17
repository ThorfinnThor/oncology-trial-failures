// Runs in data:optimize after generate-data-shards.mjs. Reads the index shards and dataset_meta.json
// and writes public/atlas/data.json (lib/atlas.ts) for the /atlas page.
import { promises as fs } from "node:fs";
import path from "node:path";

import { ATLAS_DATA_FILE, buildAtlasData } from "../lib/atlas";
import { loadIndexServer, loadMetaServer } from "../lib/server-data";

async function main() {
  const [rows, meta] = await Promise.all([loadIndexServer(), loadMetaServer()]);
  if (!rows.length) throw new Error("The trial index is empty; run generate-data-shards.mjs first");
  const data = buildAtlasData(rows, meta.version || "");

  const out = path.join(process.cwd(), ATLAS_DATA_FILE);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(data), "utf8");

  const size = (await fs.stat(out)).size;
  console.log(`Generated atlas data: ${data.x.length.toLocaleString()} trials in ${data.areas.length} areas (${(size / 1e6).toFixed(1)} MB).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
