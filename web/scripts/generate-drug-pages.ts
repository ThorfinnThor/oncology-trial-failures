// Runs after generate-data-shards.mjs and before generate-related-links.ts. Reads the index shards it
// wrote plus the registry intervention types from all_stopped_trials.json, and writes:
//   public/drug-pages/catalog.json   every drug page (name, slug, counts, indexable), no trials
//   public/drug-pages/<slug>.json    one drug page with its stopped trials
//   public/drug-pages/by-trial.json  NCT ID -> drug pages it lists, read by generate-related-links.ts
// so a drug page reads only its own file and never the whole index.
import { promises as fs } from "node:fs";
import path from "node:path";

import { buildDrugPages, drugCatalogEntry, drugLinksForRow, type DrugSourceRow } from "../lib/drugPages";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const INDEX_SHARD_DIR = path.join(PUBLIC_DIR, "trials-index-shards");
const SOURCE_FILE = path.join(PUBLIC_DIR, "all_stopped_trials.json");
const OUT_DIR = path.join(PUBLIC_DIR, "drug-pages");

async function main() {
  const names = (await fs.readdir(INDEX_SHARD_DIR)).filter((name) => name.endsWith(".json")).sort();
  const rows: DrugSourceRow[] = (
    await Promise.all(names.map(async (name) => JSON.parse(await fs.readFile(path.join(INDEX_SHARD_DIR, name), "utf8"))))
  ).flat();
  if (!rows.length) throw new Error(`${INDEX_SHARD_DIR} is empty; run generate-data-shards.mjs first`);

  // The compact index leaves intervention types out (the browser never needs them).
  const source = JSON.parse(await fs.readFile(SOURCE_FILE, "utf8")) as Array<{ nct_id?: string; intervention_types?: string | string[] }>;
  const types = new Map(
    source.map((row) => [
      String(row.nct_id || "").toUpperCase(),
      Array.isArray(row.intervention_types) ? row.intervention_types.join("; ") : row.intervention_types || "",
    ])
  );
  for (const row of rows) row.intervention_types = types.get(row.nct_id.toUpperCase()) || "";

  const pages = buildDrugPages(rows);
  const catalog = pages.map(drugCatalogEntry);
  const bySlug = new Map(catalog.map((entry) => [entry.slug, entry]));
  const byTrial: Record<string, Array<{ label: string; href: string }>> = {};
  for (const row of rows) {
    const links = drugLinksForRow(row, bySlug);
    if (links.length) byTrial[row.nct_id.toUpperCase()] = links;
  }

  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, "catalog.json"), JSON.stringify(catalog), "utf8");
  await fs.writeFile(path.join(OUT_DIR, "by-trial.json"), JSON.stringify(byTrial), "utf8");
  await Promise.all(pages.map((page) => fs.writeFile(path.join(OUT_DIR, `${page.slug}.json`), JSON.stringify(page), "utf8")));

  console.log(
    `Generated ${pages.length.toLocaleString()} drug pages (${catalog.filter((entry) => entry.indexable).length.toLocaleString()} indexable); ` +
      `${Object.keys(byTrial).length.toLocaleString()} trials link to one.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
