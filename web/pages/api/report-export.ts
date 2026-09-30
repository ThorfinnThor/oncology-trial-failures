// web/pages/api/report-export.ts
//
// One report's whole cohort as CSV — every trial, with the classification, attribution and
// endpoint reading behind each number in the report, so a buyer can recount any of them.
//
// Access is decided exactly as for a chapter: grants.ts, through loadGrant. The file itself lives
// in Workers KV (`export:<slug>`, uploaded by scripts/signals/upload_exports.py after each
// release's checks pass), because it is too large for the Worker and must not be public.

import type { NextApiRequest, NextApiResponse } from "next";

import productSummary from "@/data/product_summary.json";
import { loadGrant, type KvStore } from "@/lib/server/access";
import { grantedSlugs, isUnlocked, PACKAGES, type Grant } from "@/lib/server/grants";

type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvStore } } | undefined;
};

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = clean(req.query.slug, 120);
  const token = clean(req.query.token, 120);
  if (!PACKAGES[slug]) return res.status(404).send("No report for that cohort.");
  if (!token) return res.status(401).send("This export needs the link from your order.");

  const store = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
  if (!store) return res.status(503).send("Delivery is not configured. Please contact us and we will send it.");

  let grant: Grant | null = null;
  try {
    grant = await loadGrant(store, token, clean(req.query.session, 260));
  } catch (error) {
    console.error(JSON.stringify({ event: "export_grant_read_failed", message: String(error) }));
    return res.status(503).send("Could not verify the link. Please try again.");
  }
  if (!grant || !grantedSlugs(grant).includes(slug)) {
    return res.status(403).send("That link does not cover this report.");
  }
  if (!isUnlocked(grant)) {
    return res.status(402).send("This order has not been paid yet. Please open it again from your access page.");
  }

  let csv: string | null = null;
  try {
    csv = await store.get(`export:${slug}`);
  } catch (error) {
    console.error(JSON.stringify({ event: "export_read_failed", message: String(error) }));
  }
  if (!csv) {
    return res.status(503).send("The trial list for this report is being prepared with the current release. "
      + "Please try again later, or write to us and we will send it.");
  }

  const release = String((productSummary as { dataset_version?: string }).dataset_version || "").slice(0, 10);
  console.log(JSON.stringify({ event: "export_delivered", slug }));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${slug}-trials${release ? `-${release}` : ""}.csv"`);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).send(csv);
}
