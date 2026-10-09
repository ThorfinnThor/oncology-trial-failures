import { isLikelyScientificFailure, parsePhases, phaseLabel, reasonBucket, sortRows } from "@/lib/filtering";
import { slugify, trialPath } from "@/lib/seoUrls";
import type { DatasetMeta, TrialIndexRow } from "@/lib/types";

export type ReferenceDimension = "phase" | "area" | "status" | "reason";

export type ReferenceRow = {
  label: string;
  note: string;
  total: number;
  biological: number;
  efficacy: number;
  safety: number;
  operational: number;
  share: string;
  href: string;
};

export type ReferenceExample = {
  nctId: string;
  title: string;
  category: string;
  sponsor: string;
  reason: string;
  href: string;
};

export type ReferencePageProps = {
  title: string;
  description: string;
  canonicalPath: string;
  eyebrow: string;
  h1: string;
  lede: string;
  quickAnswer: string;
  tableTitle: string;
  tableIntro: string;
  firstColumn: string;
  rows: ReferenceRow[];
  summary: Array<{ label: string; value: string; detail: string }>;
  interpretation: Array<{ heading: string; body: string }>;
  methodology: string[];
  examples: ReferenceExample[];
  faqs: Array<{ question: string; answer: string }>;
  related: Array<{ href: string; label: string; text: string }>;
  statusGuide?: {
    steps: Array<{ label: string; heading: string; body: string }>;
    examples: ReferenceExample[];
  };
  updated: string;
};

function norm(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function isBiological(row: TrialIndexRow): boolean {
  const bucket = reasonBucket(row).toUpperCase();
  return isLikelyScientificFailure(row) || bucket === "EFFICACY/FUTILITY" || bucket === "SAFETY";
}

function summarize(label: string, note: string, href: string, rows: TrialIndexRow[]): ReferenceRow {
  const biological = rows.filter(isBiological).length;
  const efficacy = rows.filter((row) => reasonBucket(row).toUpperCase() === "EFFICACY/FUTILITY").length;
  const safety = rows.filter((row) => reasonBucket(row).toUpperCase() === "SAFETY").length;
  const operational = rows.filter((row) => reasonBucket(row).toUpperCase() === "OPERATIONAL").length;

  return {
    label,
    note,
    total: rows.length,
    biological,
    efficacy,
    safety,
    operational,
    share: rows.length ? `${((biological / rows.length) * 100).toFixed(1)}%` : "0.0%",
    href,
  };
}

function phasePath(phaseKey: string): string {
  const paths: Record<string, string> = {
    EARLY_PHASE1: "/failures/early-phase-1",
    PHASE1: "/failures/phase-1",
    PHASE2: "/failures/phase-2",
    PHASE3: "/failures/phase-3",
    PHASE4: "/failures/phase-4",
    UNKNOWN: "/failures/unknown-phase",
  };
  return paths[phaseKey] || "/failures";
}

function phaseRows(rows: TrialIndexRow[]): ReferenceRow[] {
  const phases = ["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4", "UNKNOWN"];
  return phases.map((phase) => {
    const members = rows.filter((row) => {
      const listed = parsePhases(row.phases || "");
      return phase === "UNKNOWN" ? listed.length === 0 || listed.includes("NA") : listed.includes(phase);
    });
    const note = phase === "UNKNOWN" ? "No applicable phase is listed" : "Includes multi-phase records";
    return summarize(phase === "UNKNOWN" ? "Not applicable / unknown" : phaseLabel(phase), note, phasePath(phase), members);
  });
}

function areaRows(rows: TrialIndexRow[]): ReferenceRow[] {
  const groups = new Map<string, TrialIndexRow[]>();
  for (const row of rows) {
    const area = norm(row.disease_area) || "Other";
    groups.set(area, [...(groups.get(area) || []), row]);
  }
  return [...groups.entries()]
    .map(([area, members]) => summarize(area, "Keyword-mapped disease area", `/failures/${slugify(area)}`, members))
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

function statusRows(rows: TrialIndexRow[]): ReferenceRow[] {
  const labels: Record<string, { label: string; note: string }> = {
    TERMINATED: { label: "Terminated", note: "Stopped after study start" },
    WITHDRAWN: { label: "Withdrawn", note: "Stopped before enrollment began" },
    SUSPENDED: { label: "Suspended", note: "Temporarily halted at registry update" },
  };
  return ["TERMINATED", "WITHDRAWN", "SUSPENDED"].map((status) =>
    summarize(
      labels[status].label,
      labels[status].note,
      `/explore?status=${status}`,
      rows.filter((row) => norm(row.overall_status).toUpperCase() === status)
    )
  );
}

function reasonPath(reason: string): string {
  const paths: Record<string, string> = {
    "EFFICACY/FUTILITY": "/failures/futility",
    SAFETY: "/failures/safety",
    OPERATIONAL: "/failures/operational",
    REGULATORY: "/failures/regulatory",
    "OTHER/UNKNOWN": "/failures/other-unknown",
  };
  return paths[reason] || "/failures";
}

function reasonRows(rows: TrialIndexRow[]): ReferenceRow[] {
  const order = ["EFFICACY/FUTILITY", "SAFETY", "OPERATIONAL", "REGULATORY", "OTHER/UNKNOWN"];
  return order.map((reason) => {
    const members = rows.filter((row) => reasonBucket(row).toUpperCase() === reason);
    const notes: Record<string, string> = {
      "EFFICACY/FUTILITY": "Weak benefit, endpoint, or futility language",
      SAFETY: "Safety, toxicity, or risk-benefit language",
      OPERATIONAL: "Enrollment, logistics, funding, or execution signals",
      REGULATORY: "Regulator or authorization-related language",
      "OTHER/UNKNOWN": "No reliable specific signal in the compact record",
    };
    return summarize(reason === "OTHER/UNKNOWN" ? "Other / unknown" : reason, notes[reason], reasonPath(reason), members);
  });
}

function examplesFor(rows: TrialIndexRow[], dimension: ReferenceDimension): ReferenceExample[] {
  const candidates = sortRows(dimension === "reason" ? rows : rows.filter(isBiological), "date_desc");
  const seen = new Set<string>();
  const selected: ReferenceExample[] = [];

  for (const row of candidates) {
    const phases = parsePhases(row.phases || "");
    const category = dimension === "phase"
      ? phaseLabel(phases[0] || "UNKNOWN")
      : dimension === "area"
        ? norm(row.disease_area) || "Other"
        : dimension === "status"
          ? norm(row.overall_status) || "Unknown status"
          : reasonBucket(row);
    if (seen.has(category) || !norm(row.why_stopped_short)) continue;
    seen.add(category);
    selected.push({
      nctId: row.nct_id,
      title: row.brief_title || row.nct_id,
      category,
      sponsor: row.lead_sponsor || "Unknown sponsor",
      reason: row.why_stopped_short || "No stop-reason text available.",
      href: trialPath(row),
    });
    if (selected.length === 6) break;
  }
  return selected;
}

function statusExamples(rows: TrialIndexRow[]): ReferenceExample[] {
  const definitions = [
    { id: "NCT05256134", category: "Terminated · efficacy context" },
    { id: "NCT05042934", category: "Withdrawn · operational context" },
    { id: "NCT03875144", category: "Suspended · safety context" },
  ];

  return definitions.flatMap(({ id, category }) => {
    const row = rows.find((candidate) => candidate.nct_id === id);
    if (!row) return [];
    return [{
      nctId: row.nct_id,
      title: row.brief_title || row.nct_id,
      category,
      sponsor: row.lead_sponsor || "Unknown sponsor",
      reason: row.why_stopped_short || "No stop-reason text available.",
      href: trialPath(row),
    }];
  });
}

function commonSummary(rows: TrialIndexRow[], groups: number, meta: DatasetMeta) {
  const biological = rows.filter(isBiological).length;
  return [
    { label: "Stopped records", value: rows.length.toLocaleString(), detail: "Terminated, withdrawn, and suspended records." },
    { label: "Likely biological signals", value: biological.toLocaleString(), detail: "Efficacy/futility and safety classifications." },
    { label: "Comparison groups", value: groups.toLocaleString(), detail: "Distinct rows in the comparison below." },
    { label: "Dataset updated", value: meta.version || "Current ingest", detail: meta.source || "ClinicalTrials.gov API v2" },
  ];
}

export function buildReferencePage(
  dimension: ReferenceDimension,
  rows: TrialIndexRow[],
  meta: DatasetMeta
): ReferencePageProps {
  if (dimension === "phase") {
    const dataRows = phaseRows(rows);
    return {
      title: "Clinical trial failures by phase | Phase I-IV stopped-trial data",
      description: "Compare stopped clinical trials by Phase I, II, III, and IV, including efficacy, safety, operational, and likely biological failure signals from current registry data.",
      canonicalPath: "/clinical-trial-failures-by-phase",
      eyebrow: "Phase comparison",
      h1: "Clinical trial failures by phase",
      lede: "Compare stopped-trial volume and classified failure signals across clinical development phases, with direct routes into the underlying records.",
      quickAnswer: "Phase II contains the largest stopped-trial volume in this dataset, but volume is not a clinical success-rate denominator. The comparison shows how stopped records are distributed, not what percentage of all initiated trials fail in each phase.",
      tableTitle: "Stopped clinical trials and failure signals by phase",
      tableIntro: "Each row is recalculated from the current ingest. Multi-phase studies can appear in more than one phase, so phase rows should not be added together as a dataset total.",
      firstColumn: "Clinical phase",
      rows: dataRows,
      summary: commonSummary(rows, dataRows.length, meta),
      interpretation: [
        { heading: "Volume is not a failure rate", body: "A large stopped-trial count can reflect the number of studies conducted in a phase, the mix of indications, and registry reporting patterns. Calculating an industry failure rate requires a denominator of all eligible trials entering that phase, which this stopped-trial dataset does not claim to provide." },
        { heading: "Later phase records deserve context", body: "Phase III stops can be commercially and clinically consequential, but they can still arise from enrollment, changing standards of care, portfolio decisions, or operational constraints. Read the reason bucket and source text before interpreting the stop as failed biology." },
        { heading: "Multi-phase studies overlap", body: "A record listed as Phase I/II contributes to both the Phase I and Phase II comparison rows. This preserves the registry's phase information and makes each row useful for filtering, while preventing a misleading grand total across phase rows." },
      ],
      methodology: [
        "Phase labels are normalized from ClinicalTrials.gov phase fields. Early Phase I is kept separate, while records without an applicable phase are shown as not applicable or unknown.",
        "Likely biological signals combine efficacy/futility and safety classifications. Operational counts are shown separately because operational interruption is not evidence that an intervention failed biologically.",
        "Use the linked phase hub to inspect trial-level records, sponsor names, indications, and the original stop language before using the comparison in research or reporting.",
      ],
      examples: examplesFor(rows, "phase"),
      faqs: [
        { question: "Which clinical trial phase has the most failures?", answer: "Phase II has the largest stopped-trial count in this dataset. That does not establish the highest failure rate because the database does not divide stopped records by every trial that entered each phase." },
        { question: "Are Phase III terminated trials always failed drugs?", answer: "No. Some Phase III trials stop because of efficacy or safety, while others stop for operational, strategic, enrollment, funding, or regulatory reasons." },
        { question: "Do these figures update automatically?", answer: "Yes. The phase comparison is generated from the current published dataset during each site build after an ingest." },
      ],
      related: [
        { href: "/top-10-phase-2-clinical-trial-failure-signals", label: "Phase II intervention ranking", text: "See repeated intervention-level signals within Phase II." },
        { href: "/insights/phase-3-clinical-trial-failure-signals", label: "Phase III analysis", text: "Read the narrative interpretation of late-stage stop signals." },
        { href: "/failures", label: "Failure hubs", text: "Browse all phase, disease-area, and reason hubs." },
      ],
      updated: meta.version,
    };
  }

  if (dimension === "area") {
    const dataRows = areaRows(rows);
    return {
      title: "Clinical trial failures by disease area | Comparative registry data",
      description: "Compare stopped clinical trials by disease area, including oncology, neurology, cardiovascular, infectious disease, and classified biological failure signals.",
      canonicalPath: "/clinical-trial-failures-by-disease-area",
      eyebrow: "Disease-area comparison",
      h1: "Clinical trial failures by disease area",
      lede: "Compare stopped-trial volume, efficacy/futility signals, safety signals, and operational stops across therapeutic areas in one source-linked table.",
      quickAnswer: "Oncology is the largest disease-area slice in the current dataset. Its absolute number of stopped trials is therefore not directly comparable to a smaller field without considering research volume, trial mix, and the share of records carrying biological stop signals.",
      tableTitle: "Stopped-trial evidence by disease area",
      tableIntro: "Disease areas are assigned through the site's condition and MeSH-term mapping. The biological-signal share helps separate scientific stop language from raw stopped-trial volume.",
      firstColumn: "Disease area",
      rows: dataRows,
      summary: commonSummary(rows, dataRows.length, meta),
      interpretation: [
        { heading: "Large fields produce large counts", body: "Oncology has far more stopped records than many therapeutic areas, partly because it contains a large and diverse clinical research pipeline. Absolute counts are useful for finding evidence, but they should not be presented as risk without an appropriate denominator." },
        { heading: "Signal share changes the comparison", body: "The likely biological share asks a narrower question: among the stopped records in a disease area, how many carry efficacy/futility or safety language? This still is not an overall trial failure rate, but it is more informative than volume alone." },
        { heading: "Taxonomy is analytical", body: "Disease-area assignment is based on condition and MeSH-term mappings, so complex or cross-specialty studies may fit more than one clinical interpretation. The displayed category is a practical research grouping rather than a medical ontology claim." },
      ],
      methodology: [
        "Each trial is counted in its published disease-area category in the compact dataset. The comparison includes all areas rather than only the largest categories.",
        "Efficacy/futility, safety, and operational counts come from the same classifier used throughout the database. Other/unknown and regulatory records remain part of each area's total.",
        "Open an area hub to review individual NCT records. For high-stakes analysis, verify the condition, intervention, phase, and stop statement at ClinicalTrials.gov.",
      ],
      examples: examplesFor(rows, "area"),
      faqs: [
        { question: "Which disease area has the most stopped clinical trials?", answer: "Oncology is the largest disease-area slice in the current dataset. This reflects stopped-record volume, not the probability that an oncology trial fails." },
        { question: "Is biological-signal share the same as clinical trial failure rate?", answer: "No. It is the share of stopped records classified as efficacy/futility or safety. A true failure rate requires all eligible trials as the denominator." },
        { question: "How are disease areas assigned?", answer: "The pipeline maps registry conditions and MeSH terms into practical disease-area groups. Important records should still be checked at the source." },
      ],
      related: [
        { href: "/top-10-oncology-clinical-trial-failures", label: "Oncology intervention ranking", text: "Compare repeated oncology intervention signals." },
        { href: "/top-10-neurology-clinical-trial-failures", label: "Neurology intervention ranking", text: "Review repeated neurology stop signals." },
        { href: "/failures", label: "Disease-area hubs", text: "Open each disease-area record directory." },
      ],
      updated: meta.version,
    };
  }

  if (dimension === "status") {
    const dataRows = statusRows(rows);
    return {
      title: "Terminated vs withdrawn vs suspended clinical trials | Data comparison",
      description: "Compare terminated, withdrawn, and suspended clinical trials, their stop-reason patterns, and likely biological failure signals using current ClinicalTrials.gov-derived data.",
      canonicalPath: "/terminated-vs-withdrawn-vs-suspended-clinical-trials",
      eyebrow: "Registry status comparison",
      h1: "Terminated vs withdrawn vs suspended clinical trials",
      lede: "The three stopped-study statuses describe different registry states. This comparison shows their volume and stop-reason mix without treating every status as failed biology.",
      quickAnswer: "Terminated means a study started and then stopped, withdrawn means it stopped before enrollment began, and suspended means recruitment or activity was temporarily halted at the time of the registry update. None of the three statuses alone proves that a drug failed.",
      tableTitle: "How stopped-study statuses differ in the current dataset",
      tableIntro: "The table compares each registry status with the same reason classifier, making it easier to see where efficacy, safety, and operational signals appear.",
      firstColumn: "Registry status",
      rows: dataRows,
      summary: commonSummary(rows, dataRows.length, meta),
      interpretation: [
        { heading: "Terminated is the broadest evidence pool", body: "A terminated record indicates that a study began but ended early. This status often offers more context than a withdrawn record, yet the reason can still be scientific, operational, strategic, or unclear." },
        { heading: "Withdrawn usually precedes enrollment", body: "Withdrawn studies generally stop before participants are enrolled. That makes many withdrawn records poor evidence of drug efficacy or safety, because the intervention may never have been tested in the planned study population." },
        { heading: "Suspended is not necessarily final", body: "A suspended study is temporarily halted and may later resume, terminate, or change status. Analyses should use the record's update date and source history rather than assuming the suspension became permanent." },
      ],
      methodology: [
        "Status values are taken from the current ClinicalTrials.gov-derived record. The site snapshot reflects the status available at the most recent ingest and may change in a later registry update.",
        "Reason classifications are read alongside status. A safety-classified termination is different evidence from a withdrawn study with an operational explanation, even though both appear in the stopped-trial dataset.",
        "For longitudinal work, preserve the dataset version and verify the current NCT record because registry statuses and explanations can be revised.",
      ],
      examples: statusExamples(rows),
      faqs: [
        { question: "What is the difference between terminated and withdrawn?", answer: "A terminated study started and then stopped. A withdrawn study stopped before enrollment began, according to the registry definitions used by ClinicalTrials.gov." },
        { question: "Does suspended mean the clinical trial failed?", answer: "No. Suspended means the study was temporarily halted at the registry update. It may later resume or move to another status." },
        { question: "Why classify a stop reason in addition to status?", answer: "Status describes what happened to the study. The reason bucket helps explain whether the available language points to efficacy, safety, operations, regulation, or an unclear cause." },
      ],
      related: [
        { href: "/terminated-clinical-trials", label: "Terminated trials guide", text: "Understand the most common stopped-study status." },
        { href: "/insights/withdrawn-clinical-trials-rarely-show-biological-failure-signals", label: "Withdrawn-trial analysis", text: "See why withdrawn status is often misread." },
        { href: "/explore", label: "Explore all records", text: "Filter the database by status and stop reason." },
      ],
      statusGuide: {
        steps: [
          {
            label: "Step 1 · Registry state",
            heading: "Read what happened to the study",
            body: "Terminated, withdrawn, and suspended describe the study's registry state. They do not identify the scientific or operational cause by themselves.",
          },
          {
            label: "Step 2 · Source evidence",
            heading: "Then read why it happened",
            body: "Use the stop statement and classification to separate efficacy, safety, recruitment, strategy, regulation, and unresolved language before drawing a conclusion.",
          },
        ],
        examples: statusExamples(rows),
      },
      updated: meta.version,
    };
  }

  const dataRows = reasonRows(rows);
  return {
    title: "Clinical trial stop reasons | Efficacy, safety, and operational data",
    description: "Compare clinical trial stop reasons across efficacy, futility, safety, operational, regulatory, and unclear categories with source-linked stopped-trial records.",
    canonicalPath: "/clinical-trial-stop-reasons",
    eyebrow: "Stop-reason taxonomy",
    h1: "Clinical trial stop reasons",
    lede: "See how sponsor-provided stop language is organized into efficacy/futility, safety, operational, regulatory, and other/unknown research signals.",
    quickAnswer: "Most stopped records in this dataset are classified as operational or other/unknown, not as likely biological failures. Efficacy/futility and safety are smaller categories with more direct scientific relevance, but they still require source verification.",
    tableTitle: "Stop-reason categories in the current dataset",
    tableIntro: "The categories summarize registry language for screening. They do not replace the sponsor's full statement, the protocol, results, publications, or regulatory evidence.",
    firstColumn: "Stop-reason category",
    rows: dataRows,
    summary: commonSummary(rows, dataRows.length, meta),
    interpretation: [
      { heading: "Efficacy and futility are related, not identical", body: "Lack of efficacy can describe observed insufficient benefit, while futility may follow an interim assessment that continuing is unlikely to achieve the planned objective. The database groups both because they are commonly searched together as biological stop signals." },
      { heading: "Safety language needs careful reading", body: "A safety stop may involve toxicity, adverse events, tolerability, risk-benefit review, or a precautionary action. The classification identifies the signal; it does not determine causality or quantify clinical risk." },
      { heading: "Operational is not a failed drug", body: "Enrollment, logistics, funding, supply, site execution, and portfolio decisions can stop a study without demonstrating that the intervention lacks efficacy or has an unacceptable safety profile." },
      { heading: "Unknown is an honest category", body: "Registry explanations can be missing, generic, or too ambiguous to support a specific classification. Keeping those records in other/unknown is more reliable than forcing every stop into a dramatic narrative." },
    ],
    methodology: [
      "The classifier uses structured fields and sponsor-provided stop text from the current dataset. Reason labels are analytical screening categories and can simplify more complex real-world decisions.",
      "Likely biological failure combines efficacy/futility and safety records. Regulatory and operational records are kept separate, while ambiguous language remains other/unknown.",
      "Every high-value conclusion should be checked against the linked NCT record and, where relevant, sponsor disclosures, publications, and regulatory documents.",
    ],
    examples: examplesFor(rows, "reason"),
    faqs: [
      { question: "What are the main reasons clinical trials stop?", answer: "The dataset groups stop language into efficacy/futility, safety, operational, regulatory, and other/unknown categories. Operational and unclear explanations are the largest groups." },
      { question: "Is futility the same as a failed endpoint?", answer: "Not always. Futility can be based on an interim probability of success, while a failed endpoint usually refers to an observed result. Registry wording and study context determine the interpretation." },
      { question: "Can the classifier determine why a drug failed?", answer: "It can surface likely signals from registry language, but it cannot replace clinical, statistical, regulatory, or sponsor-level review." },
    ],
    related: [
      { href: "/clinical-trial-futility", label: "Futility guide", text: "Understand futility and weak-efficacy language." },
      { href: "/why-clinical-trials-fail", label: "Why trials fail", text: "Separate scientific and non-scientific causes." },
      { href: "/top-10-safety-driven-clinical-trial-failures", label: "Safety signal ranking", text: "Review repeated safety-classified intervention records." },
    ],
    updated: meta.version,
  };
}
