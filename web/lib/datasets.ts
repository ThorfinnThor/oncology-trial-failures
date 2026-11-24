// The datasets we offer, one product page each (/datasets/<slug>), with schema.org Dataset markup
// so Google Dataset Search lists them. Sizes and dates come from web/data/dataset_facts.json,
// rebuilt by the weekly run (scripts/web/build_dataset_facts.py).
import facts from "@/data/dataset_facts.json";

export const SITE_URL = "https://clinicaltrialfailures.com";
export const HF_URL = "https://huggingface.co/datasets/clinical-trial-failures/clinical-trial-failures-sample";
export const ZENODO_URL = "https://doi.org/10.5281/zenodo.23558833";

export type DatasetDownload = { label: string; href: string; format: string; note: string };
export type DatasetVariable = { name: string; text: string };

export type DatasetPage = {
  slug: string;
  name: string;
  short: string;
  description: string;
  rowIs: string;
  size: string;
  coverage: string[];
  variables: DatasetVariable[];
  downloads: DatasetDownload[];
  elsewhere: { label: string; href: string; text: string }[];
  uses: string[];
  limits: string[];
  keywords: string[];
  free: boolean;
  temporalCoverage?: string;
};

const f = facts as any;
const n = (v: number | null | undefined) => (typeof v === "number" ? v.toLocaleString("en-US") : "—");
const pct = (v: number | null | undefined) => (typeof v === "number" ? `${Math.round(v * 100)}%` : "—");
const sr = f.stop_reasons;
const ep = f.endpoints;
const sg = f.signals;
const sm = f.signals_more || {};
const dr = f.drugs || {};
const drugShare = (() => {
  const b = dr.by_resolution || {};
  const withDrug = (dr.trials || 0) - (b.NO_DRUG || 0) - (b.NOT_COVERED || 0);
  return withDrug > 0 ? (b.RESOLVED || 0) / withDrug : null;
})();
const areaList = (m: Record<string, number> | null | undefined) =>
  m ? Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${n(v)}`).join(", ") : "—";

export const RELEASE: string = f.release;

export const DATASETS: DatasetPage[] = [
  {
    slug: "stop-reason-labels",
    name: "Stopped clinical trials labelled by why they stopped",
    short: "Every terminated, withdrawn and suspended trial on ClinicalTrials.gov, labelled from the sponsor's stated reason.",
    description:
      `${n(sr.trials)} terminated, withdrawn and suspended clinical trials from ClinicalTrials.gov, each labelled from the ` +
      "sponsor's stated stop reason: biological failure (efficacy or futility, safety, unfavourable benefit–risk), non-biological " +
      "causes (recruitment, funding, business, regulatory, supply, protocol and others), several causes, not a failure, or no stated " +
      "cause. Every label keeps the sponsor's own words and a trace of the rule that produced it. Rebuilt weekly.",
    rowIs: "One stopped trial (an NCT record).",
    size: `${n(sr.trials)} trials in release ${RELEASE}: ${n(sr.by_outcome?.BIOLOGICAL_FAILURE)} biological failures, ${n(sr.by_outcome?.MIXED_CAUSES)} with several causes, ${n(sr.by_outcome?.NON_BIOLOGICAL)} non-biological.`,
    coverage: [
      `All disease areas (${sr.disease_areas} groups) and phases; trials that started ${sr.start_year_min}–${sr.start_year_max}.`,
      `Statuses: ${n(sr.by_status?.TERMINATED)} terminated, ${n(sr.by_status?.WITHDRAWN)} withdrawn, ${n(sr.by_status?.SUSPENDED)} suspended.`,
      `Classifier ${sr.classifier_version}; registry updated to ${f.source_updated}.`,
    ],
    variables: [
      { name: "why_stopped", text: "The sponsor's stop reason, verbatim from the registry." },
      { name: "label_outcome", text: "Biological failure, several causes, non-biological, not a failure, no stated cause, or unresolved." },
      { name: "label_primary_reason / label_secondary_reasons", text: "Efficacy or futility, safety, benefit–risk; recruitment, funding, business strategy, regulatory, supply, protocol, staffing, partner withdrawal, external events and more." },
      { name: "label_evidence / label_basis", text: "The rule that fired and the words it matched; whether a rule or a reviewed decision produced the label." },
      { name: "Registry fields", text: "NCT ID, title, status, phase, conditions, interventions, sponsor, dates, disease area." },
      { name: "drugs_tested / drugs_background", text: `The drugs the experimental arms received and the control arms did not, under their standard name, kept apart from the background the control arm also got; fully resolved for ${pct(drugShare)} of trials with a drug.` },
      { name: "drug_ncit_codes / drug_rxcuis / drug_resolution", text: "NCI Thesaurus and RxNorm codes of the tested drugs, and how far they were identified." },
    ],
    downloads: [
      { label: "Free sample (CSV)", href: "/samples/labels/stop_reason_labels_sample.csv", format: "text/csv", note: `${n(sr.sample_rows)} trials across all outcome classes and disease areas` },
      { label: "Drug table (CSV)", href: "/trial_drugs.csv", format: "text/csv", note: `Tested drugs, background and resolution for all ${n(dr.trials)} trials` },
      { label: "Data dictionary", href: "/samples/labels/README.md", format: "text/markdown", note: "Label definitions, columns, method, validation, limits" },
    ],
    elsewhere: [
      { label: "Hugging Face", href: HF_URL, text: "The same sample, loadable with the datasets library, pandas or Polars." },
      { label: "Zenodo", href: ZENODO_URL, text: "Archived, citable releases with a DOI." },
    ],
    uses: [
      "Failure labels for models that predict trial outcomes (biological failure as the failure class).",
      "How often a mechanism, indication or phase stops for biological reasons, with the trials behind it.",
      "Separating drug failures from operational stops before reading a portfolio or a competitor's history.",
    ],
    limits: [
      "A stop reason is what the sponsor wrote, not independent proof of why a drug failed.",
      "Safety stops are read from the stop reason; adverse-event tables are not analysed.",
    ],
    keywords: ["clinical trial failure", "stopped clinical trials", "terminated trials", "trial stop reasons", "ClinicalTrials.gov", "drug development"],
    free: true,
    temporalCoverage: sr.start_year_min && sr.start_year_max ? `${sr.start_year_min}/${sr.start_year_max}` : undefined,
  },
  {
    slug: "posted-endpoint-labels",
    name: "Posted primary-endpoint results labelled met or missed",
    short: "Trials whose sponsor posted primary results on ClinicalTrials.gov, labelled by whether the primary analysis met or missed.",
    description:
      "Clinical trials labelled by whether the sponsor's own posted primary superiority analysis on ClinicalTrials.gov met or missed: " +
      "met (every comparison read was significant), missed, or mixed. A result is called only against a threshold the record states, " +
      "one its posted interval implies, or where every conventional threshold agrees; everything else is left out as not assessable. " +
      "Each label carries the comparisons it rests on.",
    rowIs: "One trial with posted primary results.",
    size: `${n(ep.stopped_trials_read)} stopped trials on this site (${n(ep.by_verdict?.MISSED)} missed, ${n(ep.by_verdict?.MET)} met, ${n(ep.by_verdict?.MIXED)} mixed); completed Phase 2/3 trials under licence.`,
    coverage: [
      "Primary outcome measures the sponsor marked PRIMARY; superiority analyses only.",
      "Non-inferiority, adverse-event outcomes and Bayesian analyses are not read.",
      `Read on ${ep.read_on}.`,
    ],
    variables: [
      { name: "endpoint_label", text: "MET, MISSED or MIXED." },
      { name: "endpoint_label_basis", text: "The posted analysis, or the sponsor's own statement that the primary endpoint was not met." },
      { name: "primary_comparisons_read", text: "Each comparison: measure, p-value or interval, the threshold applied and why, effect estimate, method." },
      { name: "stop_label_outcome", text: "The stop-reason label of the same trial, where it stopped." },
    ],
    downloads: [
      { label: "Free sample (CSV)", href: "/samples/labels/endpoint_labels_sample.csv", format: "text/csv", note: `${n(ep.sample_rows)} trials: met, missed and mixed` },
      { label: "Data dictionary", href: "/samples/labels/README.md", format: "text/markdown", note: "Columns, reading rules and limits" },
    ],
    elsewhere: [{ label: "Hugging Face", href: HF_URL, text: "The same sample, as the endpoints subset." }],
    uses: [
      "Outcome labels from results, not from trial status alone.",
      "Checking whether a stopped trial still met its primary endpoint, or a completed one missed it.",
    ],
    limits: [
      "Met means statistically significant; it does not check the direction of the effect and is not approval.",
      "Only results posted on ClinicalTrials.gov; publications are not read.",
    ],
    keywords: ["clinical trial primary endpoint", "trial results met missed", "posted results ClinicalTrials.gov", "trial outcome labels"],
    free: true,
  },
  {
    slug: "oncology-failure-signals",
    name: "Oncology Failure Signals: biological stops with drug and target context",
    short: "Oncology trials stopped for biological reasons, linked to the drug tested, its mechanism and target, the sponsor and publications.",
    description:
      `${n(sg.trials)} stopped oncology trials whose stated reason is biological (efficacy, safety, benefit–risk, or several causes ` +
      "including one), each linked to the drug actually tested (the difference between the arms), its mechanism, targets and gene " +
      "symbols, maximum development phase, pharmacologic class, the sponsor group and ticker, and publications that cite the trial.",
    rowIs: "One stopped oncology trial with a biological stop reason.",
    size: `${n(sg.trials)} trials, ${n(sg.unique_assets)} distinct drugs, ${n(sg.columns)} columns; target genes on ${pct(sg.target_gene_share)} of trials.`,
    coverage: ["Oncology, all phases; rebuilt weekly with the stop-reason labels.", `Release ${RELEASE}.`],
    variables: [
      { name: "failure_outcome / failure_primary_reason", text: "The biological stop label and its reason." },
      { name: "focus_assets / focus_mechanisms / focus_targets / focus_target_genes", text: "The drug tested and what it acts on; background therapy shared by the control arm is kept apart." },
      { name: "sponsor_group / sponsor_ticker", text: "The sponsor's parent group and stock ticker where there is one." },
      { name: "publication_count", text: "Publications that mention the trial's NCT ID." },
    ],
    downloads: [
      { label: "Evaluation sample (CSV)", href: sg.sample_file, format: "text/csv", note: `${n(sg.sample_rows)} of ${n(sg.trials)} trials` },
      { label: "About the sample", href: sg.sample_readme_file, format: "text/plain", note: "Sources and terms" },
    ],
    elsewhere: [{ label: "Evidence packages", href: "/packages", text: "Per-mechanism packages built from this dataset." }],
    uses: [
      "Which mechanisms and targets keep failing in oncology, and how (efficacy or safety).",
      "Competitive and diligence questions: has this target already failed, for whom, and why.",
    ],
    limits: [
      "Drugs resolve on exact name and synonym matches; unmatched investigational codes are kept as research codes.",
      "Licensed for commercial use; the sample is for evaluation.",
    ],
    keywords: ["oncology clinical trial failures", "cancer drug failures", "drug target failure", "oncology trial termination"],
    free: false,
  },
  {
    slug: "failure-signals-seven-areas",
    name: "Failure Signals in seven more areas: biological stops with drug and target context",
    short: "Trials stopped for biological reasons in infectious disease, neurology, hepatology, immunology, cardiology, metabolism and respiratory, linked to the drug tested, its mechanism and target.",
    description:
      `${n(sm.trials)} stopped trials in the seven largest therapeutic areas after oncology whose stated reason is biological ` +
      "(efficacy, safety, benefit–risk, or several causes including one), each linked to the drug actually tested (the difference " +
      "between the arms), its mechanism, targets and gene symbols, maximum development phase, pharmacologic class, the sponsor group " +
      "and ticker, and publications that cite the trial. The same build as Oncology Failure Signals.",
    rowIs: "One stopped trial with a biological stop reason, in one of seven disease areas.",
    size: `${n(sm.trials)} trials, ${n(sm.unique_assets)} distinct drugs, ${n(sm.columns)} columns: ${areaList(sm.by_disease_area)}.`,
    coverage: [
      "Infectious Disease, Neurology, Gastroenterology & Hepatology, Immunology & Autoimmune, Cardiovascular, Endocrine & Metabolic, Respiratory (the trial's primary area); all phases.",
      `Tested drug resolved for ${pct(sm.resolved_drug_share)} of trials, mechanism for ${pct(sm.mechanism_share)}, target genes for ${pct(sm.target_gene_share)} (oncology: ${pct(sg.mechanism_share)} mechanism, ${pct(sg.target_gene_share)} target genes).`,
      `Release ${RELEASE}; rebuilt weekly.`,
    ],
    variables: [
      { name: "disease_area", text: "The trial's primary disease area." },
      { name: "failure_outcome / failure_primary_reason", text: "The biological stop label and its reason." },
      { name: "focus_assets / focus_mechanisms / focus_targets / focus_target_genes", text: "The drug tested and what it acts on; background therapy shared by the control arm is kept apart." },
      { name: "sponsor_group / sponsor_ticker", text: "The sponsor's parent group and stock ticker where there is one." },
      { name: "publication_count", text: "Publications that mention the trial's NCT ID." },
    ],
    downloads: sm.sample_file
      ? [
          { label: "Evaluation sample (CSV)", href: sm.sample_file, format: "text/csv", note: `${n(sm.sample_rows)} of ${n(sm.trials)} trials, 8 per area` },
          { label: "About the sample", href: sm.sample_readme_file, format: "text/plain", note: "Sources and terms" },
        ]
      : [],
    elsewhere: [{ label: "Oncology Failure Signals", href: "/datasets/oncology-failure-signals", text: "The same product for oncology." }],
    uses: [
      "Which mechanisms and targets keep failing outside oncology, and how (efficacy or safety).",
      "Diligence on an asset or target in these areas: has it already failed, for whom, and why.",
      "Features and failure labels for trial-outcome models beyond cancer.",
    ],
    limits: [
      "Drug resolution is lower than in oncology: more device, vaccine, cell-therapy and old generic-drug trials, and fewer drugs in the terminologies.",
      "Drugs resolve on exact name and synonym matches; unmatched investigational codes are kept as research codes.",
      "Licensed for commercial use; the sample is for evaluation.",
    ],
    keywords: ["clinical trial failures neurology", "cardiovascular trial failures", "infectious disease trial termination", "drug target failure", "clinical trial failure dataset"],
    free: false,
  },
];

export function getDataset(slug: string): DatasetPage | undefined {
  return DATASETS.find((d) => d.slug === slug);
}

export function datasetJsonLd(d: DatasetPage) {
  const url = `${SITE_URL}/datasets/${d.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: d.name,
    description: d.description,
    url,
    identifier: url,
    keywords: d.keywords,
    version: RELEASE,
    dateModified: RELEASE,
    license: "https://creativecommons.org/licenses/by-nc/4.0/",
    isAccessibleForFree: d.free,
    creator: { "@type": "Person", name: "Schayan Yousefian" },
    publisher: { "@type": "Organization", name: "Clinical Trial Failures", url: SITE_URL },
    isBasedOn: "https://clinicaltrials.gov",
    spatialCoverage: "Worldwide",
    ...(d.temporalCoverage ? { temporalCoverage: d.temporalCoverage } : {}),
    variableMeasured: d.variables.map((v) => v.name),
    measurementTechnique: "Versioned rule-based classification of registry text; every rule tested against negation; held-out and clinician validation",
    includedInDataCatalog: { "@type": "DataCatalog", name: "Clinical Trial Failures datasets", url: `${SITE_URL}/datasets` },
    distribution: d.downloads
      .filter((x) => x.format === "text/csv")
      .map((x) => ({ "@type": "DataDownload", name: x.label, encodingFormat: x.format, contentUrl: `${SITE_URL}${x.href}` })),
    sameAs: d.elsewhere.filter((e) => e.href.startsWith("http")).map((e) => e.href),
  };
}
