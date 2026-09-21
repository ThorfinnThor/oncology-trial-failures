// web/lib/server/assetComparison.ts
//
// The buyer's own molecule, against the molecules that failed in the cohort they bought.
//
// This is the part of an evidence package that cannot be built in advance: the cohort is known
// on Monday, the asset under review only when someone orders. So the comparison is computed at
// delivery and spliced into the prebuilt document.
//
// The logic is a port of compare_asset() in scripts/signals/build_evidence_package.py, and the
// two are kept in step by tests/assetComparison.test.ts, which checks the verdicts against
// fixtures taken from the Python output. If the rules change, change both.
//
// Server-only. It imports the private molecule index, which must never reach a page component —
// scripts/web/check_private_data.py enforces that.

import index from "@/data/private/asset_index.json";

export type FailedAsset = {
  asset: string;
  modalities?: string[];
  target_genes?: string[];
  mechanisms?: string[];
  sponsors?: string[];
  trials?: string[];
  trial_count?: number;
};

export type ResolvedAsset = {
  query: string;
  asset: string;
  chembl_id: string;
  modality: string;
  target_genes: string[];
  mechanisms: string[];
};

export type Verdict = "closest" | "related" | "weak" | "distant" | "unknown";

export type ComparisonRow = {
  asset: string;
  modalities: string[];
  trial_count: number;
  shared_target_genes: string[];
  shared_mechanisms: string[];
  shared_classes: string[];
  same_modality: boolean;
  verdict: Verdict;
  why: string;
};

type Molecule = { name: string; modality: string; genes: string[]; mechanisms: string[] };
type Index = {
  names: Record<string, string>;
  molecules: Record<string, Molecule>;
  classes: Record<string, Record<string, string[]>>;
};

const IDX = index as unknown as Index;

const VERDICT_LABEL: Record<Verdict, string> = {
  closest: "Same target, same modality",
  related: "Related",
  weak: "Same modality only",
  distant: "Different hypothesis",
  unknown: "Cannot be compared",
};

const MODALITY_WORD: Record<string, string> = {
  Antibody: "a monoclonal antibody",
  Protein: "an engineered protein",
  Peptide: "a peptide",
  Oligonucleotide: "an oligonucleotide",
  "Cell therapy": "a cell therapy",
  "Gene therapy": "a gene therapy",
  Vaccine: "a vaccine",
  "Small molecule": "a small molecule",
};

// What a structural comparison cannot see. Stated in the document, because these are usually what
// decides whether a historical failure transfers to the asset in front of you.
export const NOT_COMPARED = [
  "patient population and disease stage",
  "line of therapy",
  "dose and exposure",
  "biomarker selection",
  "primary endpoint and its timing",
];

/** Letters and digits only, so "PD-(L)1", "pd l1" and "PDL1" are one key. Mirrors chembl_index.norm. */
export function norm(term: string): string {
  return (term || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function resolveAsset(query: string): ResolvedAsset | null {
  const key = norm(query);
  if (!key) return null;
  const chemblId = IDX.names[key];
  if (!chemblId) return null;
  const molecule = IDX.molecules[chemblId];
  if (!molecule) return null;
  return {
    query,
    asset: molecule.name || query.toUpperCase(),
    chembl_id: chemblId,
    modality: molecule.modality || "",
    target_genes: molecule.genes || [],
    mechanisms: molecule.mechanisms || [],
  };
}

/** The curated mechanism classes a set of gene symbols belongs to, in one disease area.
 *
 * Two genes on the same axis are one hypothesis — PD-1 and PD-L1, VEGF and its receptor. Reading
 * the symbols literally would call pembrolizumab a different hypothesis from a PD-L1 antibody,
 * which is wrong in the only sense the buyer cares about. Mirrors mechanism_classes.classes_for.
 */
export function classesFor(genes: string[], area: string): string[] {
  const table = IDX.classes?.[area];
  if (!table || !genes.length) return [];
  const wanted = new Set(genes);
  return Object.entries(table)
    .filter(([, members]) => members.some((g) => wanted.has(g)))
    .map(([name]) => name)
    .sort();
}

const ORDER: Record<Verdict, number> = { closest: 0, related: 1, weak: 2, distant: 3, unknown: 4 };

export function compareAsset(asset: ResolvedAsset, failed: FailedAsset[], area: string): ComparisonRow[] {
  const aGenes = new Set(asset.target_genes || []);
  const aMechs = new Set(asset.mechanisms || []);
  const aClasses = new Set(classesFor(asset.target_genes || [], area));

  const rows = failed.map((f): ComparisonRow => {
    const fGenes = f.target_genes || [];
    const fMechs = f.mechanisms || [];
    const sharedGenes = fGenes.filter((g) => aGenes.has(g)).sort();
    const sharedMechs = fMechs.filter((m) => aMechs.has(m)).sort();
    const sameModality = Boolean(asset.modality) && (f.modalities || []).includes(asset.modality);
    const sharedClasses = classesFor(fGenes, area).filter((c) => aClasses.has(c)).sort();

    let verdict: Verdict;
    let why: string;
    if (sharedGenes.length && sameModality) {
      verdict = "closest";
      why = "same target and same modality";
    } else if (sharedGenes.length) {
      verdict = "related";
      why = "same target, different modality";
    } else if (sharedClasses.length) {
      verdict = "related";
      why = `same pathway (${sharedClasses[0]}), different target` + (sameModality ? ", same modality" : "");
    } else if (sharedMechs.length) {
      verdict = "related";
      why = "different target, overlapping mechanism";
    } else if (sameModality) {
      verdict = "weak";
      why = "same modality only — no target in common";
    } else {
      verdict = "distant";
      why = "no target, mechanism or modality in common";
    }
    if (!fGenes.length && !fMechs.length) {
      verdict = "unknown";
      why = "this molecule's target could not be resolved, so no comparison is possible";
    }

    return {
      asset: f.asset,
      modalities: f.modalities || [],
      trial_count: f.trial_count || 0,
      shared_target_genes: sharedGenes,
      shared_mechanisms: sharedMechs,
      shared_classes: sharedClasses,
      same_modality: sameModality,
      verdict,
      why,
    };
  });

  return rows.sort((a, b) => ORDER[a.verdict] - ORDER[b.verdict] || b.trial_count - a.trial_count);
}

function e(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The sentence that says what the table means, before the table says it. */
export function comparisonLead(asset: ResolvedAsset, rows: ComparisonRow[]): string {
  const closest = rows.filter((r) => r.verdict === "closest");
  const related = rows.filter((r) => r.verdict === "related");
  const weak = rows.filter((r) => r.verdict === "weak");
  const modality = MODALITY_WORD[asset.modality] || asset.modality || "of unknown modality";
  const targets = asset.target_genes.length ? ` against ${asset.target_genes.slice(0, 4).join(", ")}` : "";
  const head = `${asset.asset} is ${modality}${targets}`;

  if (closest.length) {
    return `${head}. ${closest.length} of the ${rows.length} molecules that failed here share its target and its `
      + `modality (${closest.map((r) => r.asset).join(", ")}) — that history is the one to be able to answer for.`;
  }
  if (related.length) {
    return `${head}. None of the ${rows.length} molecules that failed here share both its target and its modality; `
      + `${related.length} are related on one of the two.`;
  }
  if (weak.length) {
    return `${head}. None of the ${rows.length} molecules that failed here share its target. They share only its `
      + `modality, against a different target, so this cohort says little about the hypothesis under review and a `
      + `good deal about how hard the modality is in this disease.`;
  }
  return `${head}. None of the ${rows.length} molecules that failed here share its target or its modality, so this `
    + `cohort is background rather than precedent for it.`;
}

/** The section spliced into the delivered document. */
export function renderComparison(asset: ResolvedAsset, rows: ComparisonRow[]): string {
  const body = rows
    .map(
      (r) =>
        `<tr><td class='strong'>${e(r.asset)}</td>`
        + `<td><span class='verdict v-${r.verdict}'>${e(VERDICT_LABEL[r.verdict])}</span></td>`
        + `<td class='muted'>${e(r.why)}`
        + (r.shared_target_genes.length
          ? `<br>shared targets: ${e(r.shared_target_genes.join(", "))}`
          : r.shared_classes.length
            ? `<br>shared pathway: ${e(r.shared_classes.join(", "))}`
            : "")
        + `</td><td class='muted'>${e(r.modalities.join(", ") || "—")}</td>`
        + `<td class='num'>${r.trial_count}</td></tr>`,
    )
    .join("");

  return (
    `<h2>${e(asset.asset)} against the molecules that failed</h2>`
    + `<p class='sub'>${e(asset.asset)}`
    + (asset.target_genes.length ? ` — ${e(asset.target_genes.slice(0, 6).join(", "))}` : "")
    + (asset.modality ? `, ${e(asset.modality)}` : "")
    + `, ChEMBL ${e(asset.chembl_id)}.</p>`
    + `<p class='sub'>${e(comparisonLead(asset, rows))}</p>`
    + `<table><thead><tr><th>Molecule that failed</th><th>Relation</th><th>On what</th>`
    + `<th>Modality</th><th class='num'>Trials</th></tr></thead><tbody>${body}</tbody></table>`
    + `<div class='box'><b>What this comparison does not cover.</b> It is structural — modality, target and `
    + `mechanism, read off the same index that resolved the trials. It says nothing about `
    + `${e(NOT_COMPARED.join(", "))}, and those are usually what decides whether a historical failure transfers. `
    + `Treat the rows above as the shortlist of precedents to argue about, not as a verdict.</div>`
  );
}

/** What the document says when the name did not resolve. Saying so is better than omitting it. */
export function renderUnresolved(query: string): string {
  return (
    `<h2>Asset under review</h2>`
    + `<p class='sub'>We could not resolve &ldquo;${e(query)}&rdquo; to a molecule in our index, so no comparison `
    + `is included. The index covers clinical-stage molecules in ChEMBL; a preclinical or unnamed asset will not be `
    + `in it. Send a ChEMBL id, an INN or a research code — or the target and modality — and we will rebuild this `
    + `section for you.</p>`
  );
}
