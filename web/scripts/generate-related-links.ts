// Runs after generate-data-shards.mjs: reads the index shards it wrote and the brief catalogue, and
// writes one related-links shard per detail shard, so a trial page reads only its own shard.
import { promises as fs } from "node:fs";
import path from "node:path";

import { buildRelatedLinks, type BriefMembership, type RelatedLink, type TrialRelatedLinks } from "../lib/relatedLinks";
import { trialShardKey } from "../lib/trial-sharding";
import type { TrialIndexRow } from "../lib/types";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const INDEX_SHARD_DIR = path.join(PUBLIC_DIR, "trials-index-shards");
const OUT_DIR = path.join(PUBLIC_DIR, "related-shards");
const BRIEFS_FILE = path.join(process.cwd(), "data", "briefs_index.json");
// Written by generate-drug-pages.ts, which runs first; without it trials simply carry no drug links.
const DRUGS_BY_TRIAL_FILE = path.join(PUBLIC_DIR, "drug-pages", "by-trial.json");

async function readDrugsByTrial(): Promise<Record<string, RelatedLink[]>> {
  try {
    return JSON.parse(await fs.readFile(DRUGS_BY_TRIAL_FILE, "utf8"));
  } catch {
    return {};
  }
}

type BriefRow = { slug: string; segment: string; trials_preview?: { nct_id: string }[]; endpoint_trials?: { nct_id: string }[] };

async function main() {
  const names = (await fs.readdir(INDEX_SHARD_DIR)).filter((name) => name.endsWith(".json")).sort();
  const rows: TrialIndexRow[] = (
    await Promise.all(names.map(async (name) => JSON.parse(await fs.readFile(path.join(INDEX_SHARD_DIR, name), "utf8"))))
  ).flat();
  if (!rows.length) throw new Error(`${INDEX_SHARD_DIR} is empty; run generate-data-shards.mjs first`);

  const catalogue = JSON.parse(await fs.readFile(BRIEFS_FILE, "utf8"));
  const briefs: BriefMembership[] = ((catalogue.briefs || []) as BriefRow[]).map((brief) => ({
    slug: brief.slug,
    segment: brief.segment,
    nct_ids: [...(brief.trials_preview || []), ...(brief.endpoint_trials || [])].map((trial) => trial.nct_id),
  }));

  const links = buildRelatedLinks(rows, briefs, await readDrugsByTrial());
  const shards = new Map<string, Record<string, TrialRelatedLinks>>();
  for (const [nctId, entry] of links) {
    const key = trialShardKey(nctId);
    const shard = shards.get(key) || {};
    shard[nctId] = entry;
    shards.set(key, shard);
  }

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
  await Promise.all(
    Array.from({ length: 256 }, (_, bucket) => {
      const key = bucket.toString(16).padStart(2, "0");
      return fs.writeFile(path.join(OUT_DIR, `${key}.json`), JSON.stringify(shards.get(key) || {}), "utf8");
    })
  );

  const entries = Array.from(links.values());
  console.log(
    `Generated related links for ${links.size.toLocaleString()} trials: ` +
      `${entries.filter((entry) => entry.sponsor).length.toLocaleString()} with a sponsor hub, ` +
      `${entries.filter((entry) => entry.briefs.length).length.toLocaleString()} with a brief, ` +
      `${entries.filter((entry) => entry.similar.length).length.toLocaleString()} with similar trials, ` +
      `${entries.filter((entry) => entry.drugs?.length).length.toLocaleString()} with a drug page.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
