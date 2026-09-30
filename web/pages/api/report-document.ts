// web/pages/api/report-document.ts
//
// The whole diligence report as one file: cover, contents and every chapter, with the comparison
// against the buyer's molecule filled in. ?format=html downloads it; ?format=print opens it and
// asks the browser to print, which is where "Save as PDF" lives in every browser.
//
// Access is decided exactly as for a single chapter — grants.ts, and nothing here.

import type { NextApiRequest, NextApiResponse } from "next";

import productSummary from "@/data/product_summary.json";
import { loadGrant, type KvStore } from "@/lib/server/access";
import { grantedSlugs, isUnlocked, type Grant } from "@/lib/server/grants";
import { renderReportDocument } from "@/lib/server/reportDocument";

type KvBinding = KvStore;
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

function fileSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "report";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = clean(req.query.token, 120);
  const format = clean(req.query.format, 10) === "print" ? "print" : "html";
  if (!token) return res.status(401).send("This report needs the link from your order.");

  const store = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
  if (!store) {
    console.error(JSON.stringify({ event: "report_document_store_missing" }));
    return res.status(503).send("Delivery is not configured. Please contact us and we will send it.");
  }

  let grant: Grant | null = null;
  try {
    grant = await loadGrant(store, token, clean(req.query.session, 260));
  } catch (error) {
    console.error(JSON.stringify({ event: "report_document_grant_read_failed", message: String(error) }));
    return res.status(503).send("Could not verify the link. Please try again.");
  }

  const slugs = grantedSlugs(grant);
  if (!grant || !slugs.length) return res.status(403).send("That link is not valid, or it has expired.");
  if (!isUnlocked(grant)) {
    return res.status(402).send("This order has not been paid yet. Please open it again from your access page.");
  }
  // Everything at once is sixty chapters; that is a library, not a document to download.
  if (grant.scope === "all") return res.status(400).send("Open the chapters one at a time from your access page.");

  const asset = clean(grant.asset, 200);
  const { html, title } = renderReportDocument({
    slugs,
    asset,
    preparedFor: grant.company || grant.email || "",
    issuedAt: (grant as Grant & { paid_at?: string }).paid_at || grant.issued_at || "",
    release: productSummary.dataset_version,
    print: format === "print",
  });

  console.log(JSON.stringify({ event: "report_document", format, chapters: slugs.length }));

  const filename = `diligence-report-${fileSlug(asset || title)}-${productSummary.dataset_version}.html`;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", `${format === "html" ? "attachment" : "inline"}; filename="${filename}"`);
  return res.status(200).send(html);
}
