// web/pages/api/library.ts
//
// What one link opens. There is no account and no password on purpose: a login is the largest
// thing that could be built here and the least useful, and a token in a URL is exactly as strong
// as the email it was sent to — which is what a password reset reduces to anyway.
//
// The list is computed from the grant every time rather than frozen into it, so a buyer sees this
// week's release through last month's link.

import type { NextApiRequest, NextApiResponse } from "next";

import briefsIndex from "@/data/briefs_index.json";
import productSummary from "@/data/product_summary.json";
import { grantedSlugs, grantScope, isUnlocked, PACKAGES, type Grant } from "@/lib/server/grants";
import { chaptersFor } from "@/lib/server/reportDocument";

type KvBinding = { get(key: string): Promise<string | null> };
type CloudflareGlobal = typeof globalThis & {
  [key: symbol]: { env?: { LEADS?: KvBinding } } | undefined;
};

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = clean(req.query.session, 120);
  let token = clean(req.query.token, 120);
  if (!token && !session) {
    return res.status(400).json({ ok: false, error: "This page needs the link from your order." });
  }

  const store = (globalThis as CloudflareGlobal)[Symbol.for("__cloudflare-context__")]?.env?.LEADS;
  if (!store) {
    console.error(JSON.stringify({ event: "library_store_missing" }));
    return res.status(503).json({ ok: false, error: "Access is not configured. Please contact us." });
  }

  // Coming back from Stripe. The webhook writes this index when it settles the payment, so its
  // absence means the webhook has not arrived yet — a few seconds, normally — and not that the
  // checkout was invalid. The page waits rather than showing a dead end.
  if (!token && session) {
    try {
      token = (await store.get(`session:${session}`)) || "";
    } catch (error) {
      console.error(JSON.stringify({ event: "library_session_read_failed", message: String(error) }));
      return res.status(503).json({ ok: false, error: "Could not check that payment. Please try again." });
    }
    if (!token) {
      console.log(JSON.stringify({ event: "library_session_not_settled" }));
      return res.status(402).json({
        ok: false,
        awaiting_payment: true,
        error: "Your payment is still confirming. This usually takes a few seconds.",
      });
    }
  }

  let grant: Grant | null = null;
  try {
    const raw = await store.get(`grant:${token}`);
    grant = raw ? (JSON.parse(raw) as Grant) : null;
  } catch (error) {
    console.error(JSON.stringify({ event: "library_grant_read_failed", message: String(error) }));
    return res.status(503).json({ ok: false, error: "Could not check that link. Please try again." });
  }

  const slugs = grantedSlugs(grant);
  if (!grant || !slugs.length) {
    return res.status(403).json({ ok: false, error: "That link is not valid, or it has expired." });
  }
  if (!isUnlocked(grant)) {
    // The link is real and the order is real; the payment has not settled yet. Stripe's webhook
    // usually arrives within seconds, so this is a state to wait in rather than an error.
    console.log(JSON.stringify({ event: "library_awaiting_payment" }));
    return res.status(402).json({
      ok: false,
      awaiting_payment: true,
      error: "This order has not been paid yet. If you have just paid, give it a moment and reload — "
        + "confirmation usually takes a few seconds.",
    });
  }

  const scope = grantScope(grant);
  const tokenParam = encodeURIComponent(token);
  const assetParam = grant.asset ? `&asset=${encodeURIComponent(grant.asset)}` : "";
  // A report's chapters, main chapter first, each with the reason it is in the report. For
  // everything-access there is no subject, so the order is simply the largest cohort first.
  const packages = chaptersFor(slugs, scope === "all" ? "" : grant.asset || "").map((chapter) => {
    const pkg = PACKAGES[chapter.slug];
    const brief = (briefsIndex.briefs as { slug: string; file_stem: string }[]).find(
      (b) => b.file_stem === (pkg as unknown as { brief_stem?: string }).brief_stem,
    );
    return {
      ...chapter,
      generated_at_utc: pkg.generated_at_utc,
      brief_slug: brief ? brief.slug : null,
      url: `/api/report?slug=${encodeURIComponent(chapter.slug)}&token=${tokenParam}${assetParam}`,
    };
  });

  console.log(JSON.stringify({ event: "library_opened", scope: grant.scope, cohorts: packages.length }));

  return res.status(200).json({
    ok: true,
    // Handed back so the page can replace the checkout id in the address bar with the link that
    // keeps working. A buyer who bookmarks this page should not be bookmarking a dead session.
    token,
    scope,
    asset: grant.asset || "",
    company: grant.company || "",
    email: grant.email || "",
    issued_at: (grant as Grant & { paid_at?: string }).paid_at || grant.issued_at || "",
    // The whole report as one file, and the same file opened for printing to PDF.
    document: scope === "all" ? null : {
      html: `/api/report-document?token=${tokenParam}&format=html`,
      print: `/api/report-document?token=${tokenParam}&format=print`,
    },
    dataset_version: productSummary.dataset_version,
    packages,
    // The raw exports belong to everything-access, where they are part of what was bought. A buyer
    // of one report gets the report; handing them the site's public CSVs as if they were part of
    // it only raised the question of what they were for.
    files: scope === "all" ? [
      { label: "Stopped trials — full export", format: "CSV", href: "/all_stopped_trials.csv",
        detail: "Every stopped trial in the database, one row per trial, with the stop reason and its classification." },
      { label: "Trials stopped for a biological reason", format: "CSV", href: "/biological_failure_trials.csv",
        detail: "The subset stopped for efficacy, safety or benefit–risk — the trials the rates in every report are built on." },
      { label: "Release metadata", format: "JSON", href: "/dataset_meta.json",
        detail: "Release date, source (ClinicalTrials.gov API v2) and record counts of the current data." },
    ] : [],
  });
}
