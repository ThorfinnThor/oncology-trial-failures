import type { TrialIndexRow } from "./types";
import { parsePhases, phaseLabel, reasonBucket } from "./filtering";
import { isIndexableTrial } from "./seoHubs";
import { compactSeoDescription, compactSeoTitle } from "./seoMetadata";
import { slugify, trialPath } from "./seoUrls";
import { resolveTrialStopEvidence } from "./trialEvidence";

// One public page per drug that the registry lists on two or more stopped trials. Built once at
// build time (scripts/generate-drug-pages.ts) from the compact index plus the registry's own
// intervention types. Only registry facts and our per-trial classification go into it: no rates,
// no comparison with other molecules, no cohort rules (those belong to the paid asset check).

export type DrugSourceRow = TrialIndexRow & { intervention_types?: string };

export type DrugTrialEntry = {
  nct_id: string;
  href: string;
  title: string;
  sponsor: string;
  phase: string;
  status: string;
  // The registry's completion date, shown only for terminated trials (where it records when the
  // study ended); suspended and withdrawn records carry no stop date.
  ended: string | null;
  // The registry's stop statement; where it only points to the detailed description, the sentence
  // the classifier read there (why_from = "description").
  why: string;
  why_from: "stop_reason" | "description" | null;
  bucket: string;
  // Other interventions the registry lists on the same trial, so a reader sees when the drug was
  // one of several (the registry does not say which one was under test).
  listed_with: string[];
};

export type DrugPage = {
  slug: string;
  name: string;
  path: string;
  total: number;
  efficacyOrSafety: number;
  withStopReason: number;
  indexable: boolean;
  trials: DrugTrialEntry[];
};

export type DrugCatalogEntry = Omit<DrugPage, "trials">;

export const DRUG_MIN_TRIALS = 2;
const ACCEPTED_TYPES = new Set(["DRUG", "BIOLOGICAL"]);
const LISTED_WITH_LIMIT = 6;
// A page lists at most this many trials (most recent first); the counts always cover all of them.
export const DRUG_TRIAL_LIST_LIMIT = 150;
// Indexing bar: a drug page must add more than a list of registry entries. It needs this many trials
// with a stated stop reason, and their distinct reasons together must say at least this much.
export const DRUG_INDEX_MIN_STATED_REASONS = 3;
export const DRUG_INDEX_MIN_REASON_CHARS = 400;

const SALT_SUFFIX =
  /\s+(hydrochloride|dihydrochloride|hcl|hydrobromide|phosphate|sodium|disodium|potassium|calcium|mesylate|dimesylate|maleate|tartrate|citrate|sulfate|sulphate|acetate|besylate|fumarate|succinate|tosylate|monohydrate)$/;
const FORMULATION_WORDS =
  /(^|\s)(tablets?|capsules?|oral|injections?|injectable|intravenous|subcutaneous|infusion|solution|film-coated|topical|ointment|cream|gel|i\.v\.|iv|sc)(?=\s|$)/g;
const DOSE = /(^|\s)\d+(?:[.,]\d+)?\s*(?:mg\/kg|mg\/m2|mg\/m²|mg|mcg|µg|ug|g|ml|iu|units?|%)(?=\s|$)/g;
const DOSE_WORDS = /\b(low|high|standard|reduced|medium|mid|fixed)[- ]dose\b/g;
// Placebo, controls, care pathways and placeholders: listed on many trials, never a drug page.
const REJECT_PATTERN =
  /placebo|sham|vehicle|saline|sugar pill|dummy|standard of care|standard care|standard therapy|standard treatment|usual care|supportive care|chemotherapy|no treatment|no intervention|treatment as usual|control|comparator|study drug|study medication|investigational product|\bdrugs?\b|^treatment\b|room air|\bblock\b|transplant|^tace$|antibod(?:y|ies)\b|sulfonylureas?$|therap(?:y|ies)\b|\binhibitors?\b|\badministration\b|\bagents?\b|\barm\b|\bcohort\b|\bgroup\b|^phase\b|\bregimen\b/;
// Drug classes, nutrients and named multi-drug regimens: not one drug.
const REJECT_EXACT = new Set([
  "antibiotic", "antibiotics", "anticoagulant", "anticoagulants", "antiviral", "antivirals", "analgesic", "analgesics",
  "antiemetic", "antiemetics", "contraceptive", "contraceptives", "corticosteroid", "corticosteroids", "steroid", "steroids",
  "glucocorticoid", "glucocorticoids", "opioid", "opioids", "statin", "statins", "nsaid", "nsaids", "immunosuppressant",
  "immunosuppressants", "vitamin", "vitamins", "probiotic", "probiotics", "vaccine", "vaccines", "iron", "glucose",
  "dextrose", "sucrose", "water", "oxygen", "nacl", "sodium chloride", "lactated ringer's", "ringer's lactate",
  "haart", "art", "chop", "r-chop", "folfox", "mfolfox6", "modified folfox6", "folfiri", "folfirinox", "xelox", "capox",
  "abvd", "beacopp", "flot", "ac", "ec", "tc",
]);
const SYNONYMS: Record<string, string> = {
  "5-fluorouracil": "fluorouracil",
  "5-fu": "fluorouracil",
  "5fu": "fluorouracil",
};

/** Lower-cased, dose- and formulation-free drug name, or null when the entry is not a single drug. */
export function normaliseDrugName(raw: string): string | null {
  let name = (raw || "").toLowerCase().normalize("NFKC");
  name = name.replace(/\([^)]*\)|\[[^\]]*\]/g, " ").replace(/[®™]/g, "").replace(/\s+/g, " ");
  name = name.replace(DOSE, " ").replace(DOSE_WORDS, " ").replace(FORMULATION_WORDS, " ");
  // Tokens that carry a dose ("150mg-150mg-200mg"), then a dangling preposition left behind.
  name = name.replace(/(^|\s)\S*\d(?:mg|mcg|ml|g)\b\S*/g, " ").replace(/\s+(in|at|for|of|on|by|via)$/, "");
  name = name.replace(/\s+/g, " ").replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "").trim();
  for (let i = 0; i < 2; i += 1) name = name.replace(SALT_SUFFIX, "").trim();
  name = SYNONYMS[name] || name;
  if (name.length < 3 || !/[a-z]/.test(name)) return null;
  // A combination or a description, not one drug.
  if (/[+/,;&]| and | plus | with | or | versus | vs\.? /.test(name)) return null;
  if (REJECT_PATTERN.test(name) || REJECT_EXACT.has(name)) return null;
  return name;
}

function splitList(value: string | undefined): string[] {
  return (value || "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The drugs a stopped trial lists, from the registry's intervention names and types. */
export function drugsForRow(row: DrugSourceRow): Array<{ slug: string; key: string; raw: string }> {
  const names = splitList(row.intervention_names);
  const types = splitList(row.intervention_types).map((type) => type.toUpperCase());
  let accepted: string[];
  if (names.length === types.length) {
    accepted = names.filter((_, index) => ACCEPTED_TYPES.has(types[index]));
  } else if (types.length && types.every((type) => ACCEPTED_TYPES.has(type))) {
    // The registry collapsed identical types; every listed intervention is a drug or biological.
    accepted = names;
  } else {
    // Names and types do not line up: we cannot tell which entry is a drug, so skip the trial.
    accepted = [];
  }
  const seen = new Set<string>();
  const out: Array<{ slug: string; key: string; raw: string }> = [];
  for (const raw of accepted) {
    const key = normaliseDrugName(raw);
    if (!key) continue;
    const slug = slugify(key);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, key, raw });
  }
  return out;
}

function displayName(variants: Map<string, number>, key: string): string {
  // The most frequent registry spelling that normalises to exactly the bare name; otherwise the
  // normalised name with a capital first letter.
  const ranked = [...variants.entries()]
    .map(([raw, count]) => [raw.replace(/[®™]/g, "").replace(/\s+/g, " ").trim(), count] as const)
    .filter(([text]) => text.toLowerCase() === key)
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        Number(a[0] === a[0].toUpperCase()) - Number(b[0] === b[0].toUpperCase()) ||
        a[0].localeCompare(b[0])
    );
  const best = ranked[0]?.[0] || key;
  return best === best.toLowerCase() ? best.charAt(0).toUpperCase() + best.slice(1) : best;
}

function trialEntry(row: DrugSourceRow, slug: string, drugNames: Map<string, string>): DrugTrialEntry {
  const status = (row.overall_status || "").toUpperCase();
  const evidence = resolveTrialStopEvidence(row);
  const listedWith = splitList(row.intervention_names)
    .map((name) => {
      const key = normaliseDrugName(name);
      const otherSlug = key ? slugify(key) : "";
      if (otherSlug === slug) return null;
      return (otherSlug && drugNames.get(otherSlug)) || name;
    })
    .filter((name): name is string => Boolean(name));
  return {
    nct_id: row.nct_id,
    href: trialPath(row),
    title: row.brief_title || row.nct_id,
    sponsor: row.lead_sponsor || "Unknown sponsor",
    phase: phaseLabel(parsePhases(row.phases || "")[0] || "UNKNOWN"),
    status: status || "UNKNOWN",
    ended: status === "TERMINATED" && row.completion_date ? row.completion_date : null,
    why: evidence.text,
    why_from: evidence.source === "registry_stop_reason" ? "stop_reason" : evidence.source === "missing" ? null : "description",
    bucket: reasonBucket(row),
    listed_with: [...new Set(listedWith)].slice(0, LISTED_WITH_LIMIT),
  };
}

export function drugPath(slug: string): string {
  return `/drug/${encodeURIComponent(slug)}`;
}

/**
 * Group stopped trials by the drugs they list. A drug gets a page at DRUG_MIN_TRIALS stopped trials;
 * the page is indexable when at least one of its trials is itself an indexable trial page, at least
 * DRUG_INDEX_MIN_STATED_REASONS carry a stop reason in the registry, and those reasons are not all
 * the same short line (DRUG_INDEX_MIN_REASON_CHARS of distinct text), so a thin list stays noindex.
 */
export function buildDrugPages(rows: DrugSourceRow[]): DrugPage[] {
  const bySlug = new Map<string, { key: string; variants: Map<string, number>; rows: DrugSourceRow[] }>();
  for (const row of rows) {
    for (const drug of drugsForRow(row)) {
      const group = bySlug.get(drug.slug) || { key: drug.key, variants: new Map<string, number>(), rows: [] };
      group.variants.set(drug.raw, (group.variants.get(drug.raw) || 0) + 1);
      group.rows.push(row);
      bySlug.set(drug.slug, group);
    }
  }

  const names = new Map<string, string>();
  for (const [slug, group] of bySlug) {
    if (group.rows.length >= DRUG_MIN_TRIALS) names.set(slug, displayName(group.variants, group.key));
  }

  const pages: DrugPage[] = [];
  for (const [slug, group] of bySlug) {
    if (group.rows.length < DRUG_MIN_TRIALS) continue;
    const trials = group.rows
      .map((row) => trialEntry(row, slug, names))
      .sort((a, b) => (b.ended || "").localeCompare(a.ended || "") || a.nct_id.localeCompare(b.nct_id));
    const withStopReason = trials.filter((trial) => trial.why).length;
    const distinctReasonChars = [...new Set(trials.map((trial) => (trial.why || "").trim().toLowerCase()).filter(Boolean))]
      .reduce((sum, why) => sum + why.length, 0);
    pages.push({
      slug,
      name: names.get(slug) || group.key,
      path: drugPath(slug),
      total: trials.length,
      efficacyOrSafety: trials.filter((trial) => trial.bucket === "EFFICACY/FUTILITY" || trial.bucket === "SAFETY").length,
      withStopReason,
      indexable:
        withStopReason >= DRUG_INDEX_MIN_STATED_REASONS &&
        distinctReasonChars >= DRUG_INDEX_MIN_REASON_CHARS &&
        group.rows.some(isIndexableTrial),
      trials: trials.slice(0, DRUG_TRIAL_LIST_LIMIT),
    });
  }
  return pages.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.slug.localeCompare(b.slug));
}

export function drugCatalogEntry(page: DrugPage): DrugCatalogEntry {
  return {
    slug: page.slug,
    name: page.name,
    path: page.path,
    total: page.total,
    efficacyOrSafety: page.efficacyOrSafety,
    withStopReason: page.withStopReason,
    indexable: page.indexable,
  };
}

/** Drug pages a trial links to: the ones built for drugs it lists. */
export function drugLinksForRow(
  row: DrugSourceRow,
  pages: Map<string, Pick<DrugCatalogEntry, "name" | "path">>
): Array<{ label: string; href: string }> {
  return drugsForRow(row)
    .map((drug) => pages.get(drug.slug))
    .filter((page): page is Pick<DrugCatalogEntry, "name" | "path"> => Boolean(page))
    .map((page) => ({ label: page.name, href: page.path }));
}

const BUCKET_LABELS: Record<string, string> = {
  "EFFICACY/FUTILITY": "Efficacy / futility",
  SAFETY: "Safety",
  OPERATIONAL: "Operational or business",
  ENROLLMENT: "Recruitment",
  FUNDING: "Funding",
  STRATEGIC: "Business strategy",
  REGULATORY: "Regulatory",
  "DECISION ONLY": "Decision to stop, cause not stated",
  "PROGRAM STOP ONLY": "Programme stopped, cause not stated",
  "OTHER/UNKNOWN": "Not established",
};

export function bucketLabel(bucket: string): string {
  return BUCKET_LABELS[bucket] || "Not established";
}

export function statusLabel(status: string): string {
  const value = (status || "").toUpperCase();
  if (value === "TERMINATED") return "Terminated";
  if (value === "SUSPENDED") return "Suspended";
  if (value === "WITHDRAWN") return "Withdrawn";
  return "Stopped";
}

export function drugPageMetadata(drug: Pick<DrugCatalogEntry, "name" | "total" | "efficacyOrSafety">): {
  title: string;
  description: string;
} {
  const trials = `${drug.total.toLocaleString("en-US")} stopped ${drug.total === 1 ? "trial" : "trials"}`;
  return {
    title: compactSeoTitle(drug.name, "stopped clinical trials and why they stopped"),
    description: compactSeoDescription(
      `${drug.name} is listed on ${trials} in ClinicalTrials.gov. Each sponsor's stated stop reason with our ` +
        `classification: ${drug.efficacyOrSafety.toLocaleString("en-US")} cite efficacy/futility or safety.`
    ),
  };
}
