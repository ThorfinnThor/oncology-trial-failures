// Runs after generate-drug-pages.ts. Reads the index shards, dataset_meta.json and the drug catalog,
// and writes public/sitemap/entries.json (lib/sitemapEntries.ts), so /sitemap.xml never loads the
// whole index at request time.
import { promises as fs } from "node:fs";
import path from "node:path";

import { loadDrugCatalogServer, loadIndexServer, loadMetaServer } from "../lib/server-data";
import { buildSitemapData, SITEMAP_ENTRIES_FILE } from "../lib/sitemapEntries";

async function main() {
  const [rows, meta, drugCatalog] = await Promise.all([loadIndexServer(), loadMetaServer(), loadDrugCatalogServer()]);
  if (!drugCatalog.length) throw new Error("public/drug-pages/catalog.json is empty; run generate-drug-pages.ts first");
  const data = buildSitemapData(rows, meta, drugCatalog);

  const out = path.join(process.cwd(), SITEMAP_ENTRIES_FILE);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(data), "utf8");

  console.log(
    `Generated sitemap entries: ${data.pages.length} pages, ${data.trials.length.toLocaleString()} trials, ` +
      `${data.drugs.length.toLocaleString()} drugs (before the SEO indexing switches).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
