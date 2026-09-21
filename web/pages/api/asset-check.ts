// web/pages/api/asset-check.ts
//
// The free half of the asset comparison.
//
// The paid package names the molecules that failed alongside yours. This says how many there are
// and where, and nothing more — enough to know whether the answer is worth buying, not enough to
// be the answer. A teaser that gives away the names is a free product; a teaser that gives away
// nothing is a sales page. This is the line between them, and it is drawn in the payload, not in
// the page, so it cannot be worked around by reading the network tab.
//
// The molecule index and the failed molecules live in the private bundle, so the resolution
// happens here rather than in the browser: shipping a 2 MB index to every visitor would be slow
// and would hand over the one thing that is ours to compute.

import type { NextApiRequest, NextApiResponse } from "next";

import bundle from "@/data/private/evidence_packages.json";
import {
  rankMatches,
  resolveSubject,
  suggest,
  summariseCohort,
  type CohortMatch,
  type FailedAsset,
} from "@/lib/server/assetComparison";

type Pkg = {
  cohort: string;
  area: string;
  counts: { closed: number; stopped: number };
  headline: { rate: number; comparator_rate: number };
  failed_assets?: FailedAsset[];
};

const PACKAGES = (bundle as unknown as { packages: Record<string, Pkg> }).packages;

function clean(value: unknown, max = 200): string {
  return String(value ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body || {};
  const query = clean(req.method === "GET" ? req.query.asset : body.asset, 200);
  if (!query) return res.status(400).json({ ok: false, error: "Name a molecule to check." });

  const asset = resolveSubject(query);
  if (!asset) {
    const suggestions = suggest(query);
    console.log(JSON.stringify({ event: "asset_check", query, resolved: false, suggestions: suggestions.length }));
    return res.status(200).json({
      ok: true,
      resolved: false,
      query,
      suggestions,
      message: suggestions.length
        ? "We could not match that exactly. Did you mean one of these?"
        : "We could not match that to a molecule, a gene, a target or a mechanism class. A preclinical or unnamed "
          + "asset will not be in ChEMBL — tell us the target and the modality instead and we will check it by hand.",
    });
  }

  const matches: CohortMatch[] = [];
  for (const [slug, pkg] of Object.entries(PACKAGES)) {
    const match = summariseCohort(asset, { slug, ...pkg });
    if (match) matches.push(match);
  }

  console.log(JSON.stringify({
    event: "asset_check", query, resolved: true, chembl_id: asset.chembl_id, cohorts: matches.length,
  }));

  return res.status(200).json({
    ok: true,
    resolved: true,
    asset: {
      kind: asset.kind,
      name: asset.label,
      note: asset.note,
      chembl_id: asset.chembl_id,
      modality: asset.modality,
      target_genes: asset.target_genes,
    },
    matches: rankMatches(matches),
  });
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
