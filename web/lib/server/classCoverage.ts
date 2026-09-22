// web/lib/server/classCoverage.ts
//
// Every mechanism class we track, whether or not a rate was published for it.
//
// The asset check used to compare against the packages. Packages come from briefs, and a brief is
// only published where enough trials have closed to put a rate on them — a decision about
// statistics, not about whether we can tell a buyer which molecules failed against their target.
// The two questions had been collapsed into one, so a CD19 developer with 355 CD19 trials and 26
// terminations in the dataset was told nothing in our data looked like their asset.
//
// Here they are separate. A class answers "what do we know", a package answers "what can you
// buy", and a class can answer the first without the second.

import signatures from "@/data/private/class_signatures.json";
import { classesFor, compareAsset, type FailedAsset, type Subject, type Verdict } from "@/lib/server/assetComparison";
import { PACKAGES } from "@/lib/server/grants";

type ClassEntry = {
  area: string;
  cohort: string;
  slug: string | null;
  counts: {
    total_in_cohort: number; closed: number; stopped: number; still_open: number;
    /** Completed trials whose sponsor posted a primary comparison we can read, and how they went. */
    endpoint_readable?: number; endpoint_missed?: number; endpoint_met?: number;
  };
  headline: { rate: number | null };
  failed_assets: FailedAsset[];
  genes: string[];
};

const CLASSES = (signatures as unknown as { classes: ClassEntry[] }).classes;

/** The combination cohorts are sold but are not plain classes, so they are added from the catalogue. */
function combinationPackages(): ClassEntry[] {
  const known = new Set(CLASSES.map((c) => `${c.area}::${c.cohort}`));
  return Object.entries(PACKAGES)
    .filter(([, pkg]) => !known.has(`${pkg.area}::${pkg.cohort}`))
    .map(([slug, pkg]) => ({
      area: pkg.area,
      cohort: pkg.cohort,
      slug,
      counts: {
        total_in_cohort: pkg.counts.total_in_cohort,
        closed: pkg.counts.closed,
        stopped: pkg.counts.stopped,
        still_open: pkg.counts.still_open,
        endpoint_readable: pkg.counts.endpoint_readable,
        endpoint_missed: pkg.counts.endpoint_missed,
        endpoint_met: pkg.counts.endpoint_met,
      },
      headline: { rate: pkg.headline.rate },
      failed_assets: pkg.failed_assets || [],
      genes: [],
    }));
}

const ALL: ClassEntry[] = [...CLASSES, ...combinationPackages()];

export type ClassMatch = {
  cohort: string;
  area: string;
  /** Null where no rate was published for this class — the counts still stand. */
  rate: number | null;
  /** Null where there is no package to sell. */
  slug: string | null;
  counts: ClassEntry["counts"];
  molecules: number;
  same_target_and_modality: number;
  same_target: number;
  same_pathway: number;
  same_modality_only: number;
  /** How the class was reached: the subject belongs to it, or a molecule in it shares a target. */
  by: "class" | "molecule";
  /** Completed trials that posted a readable primary comparison, and how many missed. */
  endpoints: { readable: number; missed: number; met: number } | null;
  best: Verdict | null;
};

const ORDER: Record<Verdict, number> = { closest: 0, related: 1, weak: 2, distant: 3, unknown: 4 };

/** Every class that says something about this subject. */
export function coverageFor(subject: Subject): ClassMatch[] {
  const genes = new Set(subject.target_genes);
  const out: ClassMatch[] = [];

  for (const entry of ALL) {
    const ownClasses = new Set(classesFor(subject.target_genes, entry.area));
    const byClass = ownClasses.has(entry.cohort) || entry.genes.some((g) => genes.has(g));
    const rows = entry.failed_assets.length ? compareAsset(subject, entry.failed_assets, entry.area) : [];
    const relevant = rows.filter((r) => r.verdict === "closest" || r.verdict === "related" || r.verdict === "weak");
    if (!byClass && !relevant.length) continue;

    out.push({
      cohort: entry.cohort,
      area: entry.area,
      rate: entry.headline.rate,
      slug: entry.slug,
      counts: entry.counts,
      molecules: rows.length,
      same_target_and_modality: rows.filter((r) => r.verdict === "closest").length,
      same_target: rows.filter((r) => r.shared_target_genes.length && r.verdict !== "closest").length,
      same_pathway: rows.filter((r) => !r.shared_target_genes.length && r.shared_classes.length).length,
      same_modality_only: rows.filter((r) => r.verdict === "weak").length,
      by: byClass ? "class" : "molecule",
      endpoints: entry.counts.endpoint_readable
        ? { readable: entry.counts.endpoint_readable,
            missed: entry.counts.endpoint_missed || 0,
            met: entry.counts.endpoint_met || 0 }
        : null,
      best: rows.length ? rows[0].verdict : null,
    });
  }

  // The class the subject belongs to comes first, then how close the molecules in it are, then
  // how much evidence there is. A class we track but cannot compare still ranks above one that
  // only shares a modality.
  return out.sort(
    (a, b) =>
      Number(b.by === "class") - Number(a.by === "class")
      || (a.best ? ORDER[a.best] : 2.5) - (b.best ? ORDER[b.best] : 2.5)
      || b.same_target_and_modality - a.same_target_and_modality
      || b.counts.stopped - a.counts.stopped,
  );
}
