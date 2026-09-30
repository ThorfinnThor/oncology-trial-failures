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
type Target = { label: string; genes: string[]; kind: "gene" | "target" | "class" | "alias" };
type Index = {
  names: Record<string, string>;
  molecules: Record<string, Molecule>;
  classes: Record<string, Record<string, string[]>>;
  targets: Record<string, Target>;
};

const IDX = index as unknown as Index;

const VERDICT_LABEL: Record<Verdict, string> = {
  closest: "Same target, same modality",
  related: "Related",
  weak: "Same modality only",
  distant: "Different hypothesis",
  unknown: "Cannot be compared",
};

/** A target asked about without a molecule has no modality: sharing the target is the whole match. */
export function verdictLabel(r: { verdict: Verdict; same_modality: boolean }): string {
  return r.verdict === "closest" && !r.same_modality ? "Same target" : VERDICT_LABEL[r.verdict];
}

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

// A modality can be said alongside a target — "EGFR antibody", "BCMA CAR-T" — and it changes the
// answer, so it is read off the query rather than thrown away. The vocabulary is the cohorts',
// because that is what the comparison compares against.
const MODALITY_WORDS: [RegExp, string][] = [
  [/\b(adc|antibody[- ]drug conjugates?)\b/i, "ADC"],
  [/\b(bispecific|bispecific antibody|t[- ]cell engager|tce)\b/i, "Bispecific antibody"],
  [/\b(car[- ]?t|cell therapy|cell therapies)\b/i, "Cell therapy"],
  [/\b(gene therapy)\b/i, "Gene therapy"],
  [/\b(vaccines?)\b/i, "Vaccine"],
  [/\b(oligonucleotides?|antisense|sirna)\b/i, "Oligonucleotide"],
  [/\b(antibod(?:y|ies)|mab)\b/i, "Antibody"],
  [/\b(small molecules?|inhibitors?)\b/i, "Small molecule"],
  [/\b(proteins?|fusion proteins?)\b/i, "Protein"],
];

export type Subject = {
  kind: "molecule" | "target";
  query: string;
  label: string;
  chembl_id: string;
  modality: string;
  target_genes: string[];
  mechanisms: string[];
  /** How the query was understood, shown back so nobody has to guess. */
  note: string;
};

/** Split a trailing or leading modality word off the query. */
function splitModality(query: string): { rest: string; modality: string } {
  for (const [pattern, modality] of MODALITY_WORDS) {
    if (pattern.test(query)) {
      const rest = query.replace(pattern, " ").replace(/\s+/g, " ").trim();
      if (rest) return { rest, modality };
    }
  }
  return { rest: query, modality: "" };
}

/** A molecule, a gene, a target, a class or an alias — whatever the person actually typed. */
export function resolveSubject(query: string): Subject | null {
  const raw = (query || "").trim();
  if (!raw) return null;

  const molecule = resolveAsset(raw);
  if (molecule) {
    return {
      kind: "molecule",
      query: raw,
      label: molecule.asset,
      chembl_id: molecule.chembl_id,
      modality: molecule.modality,
      target_genes: molecule.target_genes,
      mechanisms: molecule.mechanisms,
      note: molecule.target_genes.length
        ? `${molecule.modality || "Molecule"} against ${molecule.target_genes.slice(0, 6).join(", ")}`
        : "Molecule with no target resolved in ChEMBL",
    };
  }

  // Not a molecule, so read it as a target — with a modality if one was said alongside it.
  const { rest, modality } = splitModality(raw);
  for (const candidate of [rest, raw]) {
    const target = IDX.targets[norm(candidate)];
    if (!target) continue;
    const KIND_NOTE: Record<Target["kind"], string> = {
      gene: "Gene symbol",
      target: "Protein name",
      class: "Mechanism class",
      alias: "Common name",
    };
    return {
      kind: "target",
      query: raw,
      label: target.label,
      chembl_id: "",
      modality,
      target_genes: target.genes,
      mechanisms: [],
      note: `${KIND_NOTE[target.kind]} · ${target.genes.slice(0, 8).join(", ")}`
        + (modality ? ` · ${modality}` : ""),
    };
  }
  return null;
}

/** When nothing resolves, offer what would have. A dead end is what makes a tool feel broken. */
export function suggest(query: string, limit = 8): { label: string; kind: string }[] {
  const key = norm(query);
  if (key.length < 2) return [];
  const starts: { label: string; kind: string }[] = [];
  const contains: { label: string; kind: string }[] = [];
  const seen = new Set<string>();

  const push = (label: string, kind: string, at: number) => {
    const dedupe = norm(label);
    if (!label || seen.has(dedupe)) return;
    seen.add(dedupe);
    (at === 0 ? starts : contains).push({ label, kind });
  };

  for (const [term, target] of Object.entries(IDX.targets)) {
    const at = term.indexOf(key);
    if (at >= 0) push(target.label, target.kind === "class" ? "mechanism class" : "target", at);
    if (starts.length >= limit) break;
  }
  if (starts.length + contains.length < limit * 2) {
    for (const [term, chemblId] of Object.entries(IDX.names)) {
      const at = term.indexOf(key);
      if (at < 0) continue;
      const molecule = IDX.molecules[chemblId];
      if (molecule) push(molecule.name, "molecule", at);
      if (starts.length + contains.length >= limit * 2) break;
    }
  }
  return [...starts, ...contains].slice(0, limit);
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

export function compareAsset(asset: ResolvedAsset | Subject, failed: FailedAsset[], area: string): ComparisonRow[] {
  // Both shapes carry target_genes, mechanisms and modality; nothing below needs more.
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
    } else if (sharedGenes.length && !asset.modality) {
      // No modality was stated — a target was asked about, not a molecule. Sharing the target is
      // the whole of what was asked, so calling it "different modality" would answer a question
      // nobody put.
      verdict = "closest";
      why = "same target";
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
export function comparisonLead(subject: Subject, rows: ComparisonRow[]): string {
  const closest = rows.filter((r) => r.verdict === "closest");
  const related = rows.filter((r) => r.verdict === "related");
  const weak = rows.filter((r) => r.verdict === "weak");

  // A molecule is described; a target is simply named, because "EGFR is of unknown modality
  // against EGFR" is what happens when one sentence is made to serve both.
  const head = subject.kind === "molecule"
    ? `${subject.label} is ${MODALITY_WORD[subject.modality] || subject.modality || "of unknown modality"}`
      + (subject.target_genes.length ? ` against ${subject.target_genes.slice(0, 4).join(", ")}` : "")
    : `${subject.label}${subject.modality ? `, ${MODALITY_WORD[subject.modality] || subject.modality}` : ""}`;

  if (!rows.length) {
    return `${head}. No molecule that failed in this cohort could be compared with it.`;
  }
  if (closest.length) {
    return `${head}. ${closest.length} of the ${rows.length} molecules that failed here share its target and its `
      + `modality (${closest.map((r) => r.asset).join(", ")}) — that history is the one to be able to answer for.`;
  }
  if (related.length) {
    return `${head}. None of the ${rows.length} molecules that failed here share both its target and its modality; `
      + `${related.length} ${related.length === 1 ? "is" : "are"} related on one of the two.`;
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
export function renderComparison(subject: Subject, rows: ComparisonRow[]): string {
  const body = rows
    .map(
      (r) =>
        `<tr><td class='strong'>${e(r.asset)}</td>`
        + `<td><span class='verdict v-${r.verdict}'>${e(verdictLabel(r))}</span></td>`
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
    `<h2>${e(subject.label)} against the molecules that failed</h2>`
    + `<p class='sub'>${e(subject.note)}`
    + (subject.chembl_id ? ` · ChEMBL ${e(subject.chembl_id)}` : "")
    + `.</p>`
    + `<p class='sub'>${e(comparisonLead(subject, rows))}</p>`
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

/** What one cohort has to say about one molecule, in counts rather than names.
 *
 * This is what the free check returns. Naming the molecules that failed is what the package is
 * for; saying how many of them share your target, and how often trials of that class stopped, is
 * the part that has to be free, because otherwise nobody can tell whether the answer is worth
 * paying for.
 */
export type CohortMatch = {
  slug: string;
  cohort: string;
  area: string;
  rate: number;
  comparator_rate: number;
  closed: number;
  stopped: number;
  molecules: number;
  same_target_and_modality: number;
  same_target: number;
  same_pathway: number;
  same_modality_only: number;
  /** The closest relation found in this cohort; cohorts with nothing in common are left out. */
  best: Verdict;
};

const RELEVANT: Verdict[] = ["closest", "related", "weak"];

export function summariseCohort(
  subject: Subject,
  pkg: {
    slug: string;
    cohort: string;
    area: string;
    counts: { closed: number; stopped: number };
    headline: { rate: number; comparator_rate: number };
    failed_assets?: FailedAsset[];
  },
): CohortMatch | null {
  const rows = compareAsset(subject, pkg.failed_assets || [], pkg.area);
  if (!rows.length) return null;
  const best = rows[0].verdict;
  if (!RELEVANT.includes(best)) return null;
  return {
    slug: pkg.slug,
    cohort: pkg.cohort,
    area: pkg.area,
    rate: pkg.headline.rate,
    comparator_rate: pkg.headline.comparator_rate,
    closed: pkg.counts.closed,
    stopped: pkg.counts.stopped,
    molecules: rows.length,
    same_target_and_modality: rows.filter((r) => r.verdict === "closest").length,
    same_target: rows.filter((r) => r.shared_target_genes.length && r.verdict !== "closest").length,
    same_pathway: rows.filter((r) => !r.shared_target_genes.length && r.shared_classes.length).length,
    same_modality_only: rows.filter((r) => r.verdict === "weak").length,
    best,
  };
}

/** Closest relation first, then the cohorts where more of the failures look like this molecule. */
export function rankMatches(matches: CohortMatch[]): CohortMatch[] {
  return matches.slice().sort(
    (a, b) =>
      ORDER[a.best] - ORDER[b.best]
      || b.same_target_and_modality - a.same_target_and_modality
      || b.same_target - a.same_target
      || b.stopped - a.stopped,
  );
}
