import type { InsightStats } from "./insights";

export type SeoLandingPageConfig = {
  slug: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  lede: string;
  quickAnswer: string;
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
  keyPoints: string[];
  sections: Array<{
    heading: string;
    body: string[];
  }>;
  related: Array<{
    href: string;
    label: string;
    text: string;
  }>;
  dataInsights?: {
    heading: string;
    intro: string;
    sourceNote: string;
    metrics: Array<{
      label: string;
      value: string;
      detail: string;
    }>;
    distributions: Array<{
      heading: string;
      items: Array<{
        label: string;
        value: string;
      }>;
    }>;
    examples: Array<{
      nctId: string;
      title: string;
      reason: string;
      summary: string;
      href: string;
    }>;
  };
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

export const SITE_URL = "https://clinicaltrialfailures.com";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const SEO_LANDING_PAGES: Record<string, SeoLandingPageConfig> = {
  clinicalTrialFailures: {
    slug: "/clinical-trial-failures",
    title: "Clinical trial failures database | 23,452 stopped trial records",
    metaDescription:
      "Search 23,452 stopped clinical trial records with preclassified stop reasons, one-click evidence links, sponsor tables, and ClinicalTrials.gov source records.",
    eyebrow: "Ready-to-use failure database",
    h1: "Clinical trial failures: search stopped trials with evidence",
    lede:
      "Clinical trial failures are often hidden in registry text, status changes, and sponsor-provided stop reasons. This guide explains how to use the Clinical Trial Failures database to search terminated, suspended, and withdrawn trials with preclassified failure reasons, trial-level evidence, and source links.",
    quickAnswer:
      "Clinical trial failure is not a single status field. This site starts with 23,452 terminated, suspended, and withdrawn trial records, then separates likely biological failure signals from operational, strategic, funding, enrollment, and unclear stops.",
    primaryCta: { href: "/explore", label: "Open the database" },
    secondaryCta: { href: "/methods", label: "Review the methodology" },
    keyPoints: [
      "Search stopped clinical trials from ClinicalTrials.gov registry records in one place.",
      "Use ready-made tables by phase, sponsor, disease area, intervention, status, and stop reason.",
      "Open one-click evidence links to distinguish likely efficacy, futility, and safety signals from non-biological stops.",
    ],
    sections: [
      {
        heading: "What counts as a clinical trial failure?",
        body: [
          "In this database, a clinical trial failure usually means a trial record that is terminated, suspended, or withdrawn before completion. Not every stopped study failed scientifically. Some trials stop because of enrollment, funding, portfolio strategy, site operations, or regulatory decisions.",
          "The most useful signals are the records where the stop reason suggests the intervention did not work as intended, created unacceptable safety risk, or reached futility. Those records can reveal patterns that are hard to see when reading individual registry entries one by one.",
        ],
      },
      {
        heading: "Why a searchable clinical trial failure database helps",
        body: [
          "ClinicalTrials.gov includes structured fields and free-text sponsor explanations, but the reasons behind trial stops are not always standardized. One sponsor may write lack of efficacy, another may write futility, and another may describe an endpoint or safety issue in longer language.",
          "Clinical Trial Failures turns those records into a ready-to-use workflow for scanning, filtering, comparison, and export. Researchers can move from a broad market question to a specific evidence table, then verify each primary record.",
        ],
      },
      {
        heading: "How to interpret the results",
        body: [
          "Use the labels as screening signals, not final judgments. A stopped trial may have multiple causes, and registry text can be incomplete. The strongest workflow is to use the database to find candidate records, open the trial-level evidence, then review the original ClinicalTrials.gov entry and any related sponsor publications.",
          "For medical and investment decisions, treat the database as research support. It is designed to reduce search time and surface patterns, not to replace primary source review.",
        ],
      },
    ],
    related: [
      { href: "/why-clinical-trials-fail", label: "Why clinical trials fail", text: "Understand common failure categories." },
      { href: "/failed-clinical-trials", label: "Failed clinical trials", text: "Review how failure language appears in source records." },
      { href: "/failures/oncology", label: "Oncology trial failures", text: "Review V2 outcomes and source-linked oncology records." },
    ],
    dataInsights: {
      heading: "What the current stopped-trial dataset shows",
      intro:
        "The database currently contains 23,452 stopped trial records from ClinicalTrials.gov. The useful SEO point is also the useful research point: most stopped trials are not automatically biological failures, so the page separates status from interpreted stop reason and links back to trial-level evidence.",
      sourceNote:
        "Counts are generated from the site's current ClinicalTrials.gov-derived stopped-trial dataset. Because registry records can change, use these figures as research signals and verify important records at the source NCT page.",
      metrics: [
        { label: "Stopped records", value: "23,452", detail: "Trials marked terminated, withdrawn, or suspended." },
        { label: "Likely biological failures", value: "1,813", detail: "Records classified as efficacy/futility or safety-driven biological failure signals." },
        { label: "Biological share", value: "8%", detail: "A reminder that many stopped trials are operational, strategic, or unclear." },
      ],
      distributions: [
        {
          heading: "Top stop-reason buckets",
          items: [
            { label: "Operational", value: "12,013" },
            { label: "Other/unknown", value: "9,534" },
            { label: "Efficacy/futility", value: "1,096" },
            { label: "Safety", value: "717" },
          ],
        },
        {
          heading: "Largest disease areas",
          items: [
            { label: "Oncology", value: "7,871" },
            { label: "Other", value: "5,755" },
            { label: "Infectious disease", value: "1,700" },
            { label: "Gastroenterology and hepatology", value: "1,519" },
          ],
        },
      ],
      examples: [
        {
          nctId: "NCT07014735",
          title: "Effect of Hyperglycaemia and Moxifloxacin on QTc Interval in T2DM",
          reason: "Efficacy/futility",
          summary:
            "The registry stop language says the study was terminated early on futility grounds, making it a clear example of a trial-level scientific stop signal.",
          href: "/trial/NCT07014735",
        },
        {
          nctId: "NCT05999968",
          title: "Abemaciclib plus darolutamide in prostate cancer after initial treatment",
          reason: "Efficacy/futility",
          summary:
            "The record links termination to a related study that did not meet its primary endpoint, which is useful context for interpreting the stopped program.",
          href: "/trial/NCT05999968",
        },
        {
          nctId: "NCT04867837",
          title: "OCTAPLEX in patients with acute major bleeding on DOAC therapy",
          reason: "Efficacy/futility",
          summary:
            "The stop language references an interim analysis and futility based on treatment effect size, a good example of why source context matters.",
          href: "/trial/NCT04867837",
        },
      ],
    },
    faqs: [
      {
        question: "Is every terminated clinical trial a failure?",
        answer:
          "No. Terminated, suspended, or withdrawn status is a starting signal. Some trials stop for non-scientific reasons such as enrollment, funding, strategy, or operations.",
      },
      {
        question: "Where does the data come from?",
        answer:
          "The primary source is ClinicalTrials.gov registry metadata and sponsor-provided stop-reason text where available.",
      },
      {
        question: "Can I download or filter the records?",
        answer:
          "Yes. Use the Explore page to search, filter, compare, and export stopped trial records.",
      },
    ],
  },

  whyClinicalTrialsFail: {
    slug: "/why-clinical-trials-fail",
    title: "Why clinical trials fail | Evidence from 23,452 stopped trials",
    metaDescription:
      "See why clinical trials fail using 23,452 stopped-trial records, including efficacy, futility, safety, enrollment, funding, strategy, and operational stop reasons.",
    eyebrow: "Failure reason evidence",
    h1: "Why clinical trials fail: evidence tables for stopped trials",
    lede:
      "Clinical trials fail for different reasons. Some failures are biological, such as weak efficacy or safety problems. Others are practical, such as enrollment, funding, sponsor strategy, or operational execution. This database helps you separate those patterns with ready-to-use stopped-trial tables and source evidence.",
    quickAnswer:
      "Clinical trials fail because the intervention may not show enough benefit, may create safety risk, or because the study cannot continue for enrollment, funding, operational, regulatory, or sponsor-strategy reasons. The database keeps these reasons separate so a stopped trial is not automatically treated as a failed drug.",
    primaryCta: { href: "/overview", label: "See dataset patterns" },
    secondaryCta: { href: "/explore", label: "Open the database" },
    keyPoints: [
      "Biological failure often appears as lack of efficacy, futility, failed endpoints, or safety concerns.",
      "Non-biological stops can reflect enrollment, funding, sponsor strategy, or operational constraints.",
      "Registry text should be treated as a signal that needs one-click source verification.",
    ],
    sections: [
      {
        heading: "Biological failure: efficacy, futility, and safety",
        body: [
          "A trial may fail biologically when the intervention does not produce enough benefit, cannot meet its endpoint, or creates a safety profile that makes continuation inappropriate. These records often mention lack of efficacy, futility, adverse events, tolerability, or risk-benefit concerns.",
          "These are the most important records when you want to understand whether a target, modality, drug class, disease area, or sponsor program ran into scientific limits.",
        ],
      },
      {
        heading: "Operational and strategic failure",
        body: [
          "Many stopped trials do not prove that the treatment failed. Recruitment may be too slow, funding may change, a sponsor may reprioritize a portfolio, or a protocol may become impractical. Those records still matter, but they should not be interpreted the same way as efficacy or safety failures.",
          "The database separates these buckets so analysts can avoid mixing scientific failure with business or operational decisions.",
        ],
      },
      {
        heading: "How to study failure reasons responsibly",
        body: [
          "A single registry entry rarely tells the whole story. The best approach is to group trials by reason bucket, look for repeated patterns, and then inspect individual trial records in detail.",
          "For example, repeated futility stops in one disease area may suggest a biological challenge, while repeated enrollment stops may point to trial design, patient availability, or competitive landscape problems.",
        ],
      },
    ],
    related: [
      { href: "/clinical-trial-futility", label: "Clinical trial futility", text: "Understand futility stops and weak efficacy signals." },
      { href: "/terminated-clinical-trials", label: "Terminated clinical trials", text: "Learn how termination differs from scientific failure." },
      { href: "/outliers", label: "Outliers", text: "Find over-represented sponsors and disease areas." },
    ],
    dataInsights: {
      heading: "Failure reasons in the stopped-trial dataset",
      intro:
        "The current dataset shows why a single phrase like clinical trial failure is too broad. Operational stops dominate the stopped-trial universe, while efficacy/futility and safety records are smaller but more directly relevant to biological failure analysis.",
      sourceNote:
        "The reason buckets are analytical classifications based on ClinicalTrials.gov registry fields and sponsor-provided stop language. They are designed for screening and should not replace primary source review.",
      metrics: [
        { label: "Operational stops", value: "12,013", detail: "The largest bucket in the current stopped-trial dataset." },
        { label: "Efficacy/futility stops", value: "1,096", detail: "Records with weak efficacy, futility, or endpoint-related signals." },
        { label: "Safety stops", value: "717", detail: "Records where safety, toxicity, or risk-benefit language is the key signal." },
      ],
      distributions: [
        {
          heading: "Status mix",
          items: [
            { label: "Terminated", value: "16,085" },
            { label: "Withdrawn", value: "6,782" },
            { label: "Suspended", value: "585" },
          ],
        },
        {
          heading: "Common phases",
          items: [
            { label: "Phase 2", value: "10,664" },
            { label: "Phase 1", value: "6,570" },
            { label: "Phase 3", value: "3,949" },
            { label: "Phase 4", value: "2,858" },
          ],
        },
      ],
      examples: [
        {
          nctId: "NCT03008616",
          title: "AMAG-423 in antepartum subjects with severe preeclampsia",
          reason: "Efficacy/futility",
          summary:
            "The DSMB recommended stopping early for futility with no safety concerns raised, showing a clean efficacy/futility stop pattern.",
          href: "/trial/NCT03008616",
        },
        {
          nctId: "NCT03290092",
          title: "Taselisib in overgrowth",
          reason: "Safety",
          summary:
            "The registry says the trial was stopped early for safety reasons after two SUSARs, showing how adverse-event language changes the interpretation.",
          href: "/trial/NCT03290092",
        },
        {
          nctId: "NCT03454893",
          title: "AVR-RD-01 for treatment-naive subjects with classic Fabry disease",
          reason: "Strategic",
          summary:
            "The sponsor deprioritized the Fabry disease program, which is important because not every stopped trial reflects a biological failure.",
          href: "/trial/NCT03454893",
        },
      ],
    },
    faqs: [
      {
        question: "What is the most common reason clinical trials fail?",
        answer:
          "It depends on the cohort. Common categories include weak efficacy, futility, safety concerns, enrollment problems, funding, strategy, and operational issues.",
      },
      {
        question: "Is lack of efficacy the same as futility?",
        answer:
          "They are related but not identical. Futility often means interim evidence suggests the trial is unlikely to meet its endpoint, while lack of efficacy may be a broader conclusion about insufficient benefit.",
      },
      {
        question: "Can trial failure be non-scientific?",
        answer:
          "Yes. Many stopped trials reflect recruitment, funding, sponsor strategy, operational issues, or regulatory constraints rather than a failed biological hypothesis.",
      },
    ],
  },

  failedClinicalTrials: {
    slug: "/failed-clinical-trials",
    title: "Failed clinical trials | Search 1,813 biological failure signals",
    metaDescription:
      "Search failed clinical trials across 23,452 stopped records, including 1,813 likely biological failure signals tied to efficacy, futility, and safety.",
    eyebrow: "Failed clinical trials",
    h1: "Failed clinical trials and clinical trial fails: how to search the evidence",
    lede:
      "People often search for failed clinical trials or clinical trial fails when they want to know why a program stopped. The useful answer is usually not one record, but a structured view of status, phase, sponsor, disease area, intervention, and stop reason.",
    quickAnswer:
      "A failed clinical trial is best treated as an interpretation, not just a registry label. In this dataset, the most direct failure signals are 1,813 stopped records classified as efficacy/futility or safety-related biological failure signals.",
    primaryCta: { href: "/explore", label: "Search failed trials" },
    secondaryCta: { href: "/top-entities", label: "See top entities" },
    keyPoints: [
      "Find trial records that were terminated, suspended, or withdrawn.",
      "Group failure language into practical stop-reason buckets.",
      "Use trial-level links to verify each record in the primary registry.",
    ],
    sections: [
      {
        heading: "What people mean by failed clinical trials",
        body: [
          "The phrase failed clinical trials is broad. It can mean a drug did not work, a safety signal emerged, enrollment was not feasible, or the sponsor stopped development. The database keeps these possibilities separate so the word failure does not hide the actual reason.",
          "For search and analysis, the first step is to identify stopped trials. The second step is to interpret the stop reason carefully.",
        ],
      },
      {
        heading: "Why failure language is hard to search",
        body: [
          "Registry records do not use one standard phrase. A failed endpoint, futility recommendation, strategic discontinuation, or safety concern may all appear in different wording. This makes keyword search alone unreliable.",
          "The Clinical Trial Failures app lets you combine keyword search with reason buckets and structured filters, which makes it easier to find relevant records without reading thousands of entries manually.",
        ],
      },
      {
        heading: "From broad search to trial-level review",
        body: [
          "A good workflow starts with the broad dataset, filters to a status or reason bucket, compares sponsors or disease areas, then opens individual trial pages for context.",
          "This is especially useful for competitive intelligence, diligence, portfolio research, and scientific landscape reviews.",
        ],
      },
    ],
    related: [
      { href: "/clinical-trial-failures", label: "Clinical trial failures", text: "Start with the broader database guide." },
      { href: "/explore", label: "Explore", text: "Search and filter stopped trial records." },
      { href: "/methods", label: "Methods", text: "Review source data and classification limits." },
    ],
    dataInsights: {
      heading: "Likely biological failures in the dataset",
      intro:
        "For this page, the strongest original-data view is the subset classified as likely biological failure. These are records where the stop language points toward efficacy/futility or safety rather than enrollment, funding, strategy, or operations.",
      sourceNote:
        "The biological-failure subset is a screening layer over ClinicalTrials.gov records. A record can still require publication, protocol, endpoint, and sponsor-disclosure review before being treated as a definitive failed trial.",
      metrics: [
        { label: "Biological-failure records", value: "1,813", detail: "Stopped trials classified as efficacy/futility or safety signals." },
        { label: "Efficacy/futility", value: "1,096", detail: "The larger scientific-failure bucket in this subset." },
        { label: "Safety", value: "717", detail: "Records where safety or risk-benefit language drove the classification." },
      ],
      distributions: [
        {
          heading: "Top phases in biological failures",
          items: [
            { label: "Phase 2", value: "970" },
            { label: "Phase 3", value: "493" },
            { label: "Phase 1", value: "430" },
            { label: "Phase 4", value: "85" },
          ],
        },
        {
          heading: "Largest disease areas",
          items: [
            { label: "Oncology", value: "581" },
            { label: "Other", value: "385" },
            { label: "Infectious disease", value: "144" },
            { label: "Gastroenterology and hepatology", value: "140" },
          ],
        },
      ],
      examples: [
        {
          nctId: "NCT04165031",
          title: "LY3499446 in advanced solid tumors with KRAS G12C mutation",
          reason: "Safety",
          summary:
            "The trial was terminated because of an unexpected toxicity finding, a concrete example of safety-driven clinical trial failure language.",
          href: "/trial/NCT04165031",
        },
        {
          nctId: "NCT04981717",
          title: "Anti-Fel d 1 antibodies in cat-allergic patients with allergic rhinitis",
          reason: "Efficacy/futility",
          summary:
            "The registry stop reason states lack of efficacy, which is exactly the type of record users expect when searching failed clinical trials.",
          href: "/trial/NCT04981717",
        },
        {
          nctId: "NCT00574275",
          title: "Aflibercept with gemcitabine in metastatic pancreatic cancer",
          reason: "Efficacy/futility",
          summary:
            "The Data Monitoring Committee concluded the study would be unable to demonstrate improved survival, a strong endpoint-related failure signal.",
          href: "/trial/NCT00574275",
        },
      ],
    },
    faqs: [
      {
        question: "What is the difference between a failed trial and a stopped trial?",
        answer:
          "A stopped trial has a registry status such as terminated, suspended, or withdrawn. A failed trial is an interpretation that depends on the stop reason and context.",
      },
      {
        question: "Does this database include withdrawn trials?",
        answer:
          "Yes. The database focuses on stopped trial records, including terminated, suspended, and withdrawn trials where available.",
      },
      {
        question: "Can I search by sponsor or disease area?",
        answer:
          "Yes. The Explore page supports sponsor, phase, disease area, intervention, status, and reason-based filtering.",
      },
    ],
  },

  oncologyClinicalTrialFailures: {
    slug: "/oncology-clinical-trial-failures",
    title: "Oncology clinical trial failures | 7,871 stopped cancer trials",
    metaDescription:
      "Explore 7,871 oncology clinical trial failure records and stopped cancer trials, including efficacy, futility, safety, enrollment, and operational stop reasons.",
    eyebrow: "Oncology trial failures",
    h1: "Oncology clinical trial failures: search stopped cancer trials",
    lede:
      "Oncology is one of the most active clinical research areas, and stopped cancer trials can reveal important biological, safety, and development signals. This page explains how to study oncology clinical trial failures using structured registry data.",
    quickAnswer:
      "Oncology is the largest disease area in the stopped-trial dataset. The current oncology slice contains 7,871 stopped records, including 581 records classified as likely biological failure signals from efficacy/futility or safety language.",
    primaryCta: { href: "/explore?q=oncology", label: "Search oncology failures" },
    secondaryCta: { href: "/overview", label: "See overview patterns" },
    keyPoints: [
      "Search stopped oncology and cancer-related clinical trial records.",
      "Separate likely biological failure from enrollment, funding, or strategy changes.",
      "Compare sponsors, disease areas, interventions, phases, and stop reasons.",
    ],
    sections: [
      {
        heading: "Why oncology trial failures matter",
        body: [
          "Cancer drug development is complex. A stopped oncology trial may reflect a weak efficacy signal, a safety problem, patient recruitment difficulty, changing standard of care, or a sponsor portfolio decision.",
          "Looking across stopped oncology records can help analysts identify repeated failure patterns, difficult indications, development bottlenecks, and places where a mechanism may have struggled in clinical testing.",
        ],
      },
      {
        heading: "Signals to look for in stopped cancer trials",
        body: [
          "Important stop-reason language includes lack of efficacy, futility, failure to meet endpoints, adverse events, toxicity, enrollment challenges, and strategic discontinuation. Each phrase implies a different interpretation.",
          "The database helps structure those signals so oncology trial failures can be compared by phase, sponsor, disease area, condition, intervention, and reason bucket.",
        ],
      },
      {
        heading: "Verification is essential",
        body: [
          "Oncology records can be especially nuanced because treatment standards, combinations, biomarkers, and patient populations change quickly. A registry stop reason should be treated as a lead, not a final conclusion.",
          "Use the app to find candidate records, then verify each NCT record and related publications or sponsor disclosures before making scientific or commercial judgments.",
        ],
      },
    ],
    related: [
      { href: "/clinical-trial-failures", label: "Clinical trial failures", text: "Understand the broader stopped-trial database." },
      { href: "/clinical-trial-futility", label: "Clinical trial futility", text: "Study futility and weak efficacy signals." },
      { href: "/sponsor-insights", label: "Sponsor insights", text: "Compare stopped trials by sponsor." },
    ],
    dataInsights: {
      heading: "Oncology-specific stopped-trial signals",
      intro:
        "Oncology is the largest disease area in the broader stopped-trial dataset. The current oncology slice includes many operational and unclear stops, but also hundreds of records with efficacy/futility or safety signals that deserve deeper review.",
      sourceNote:
        "Oncology counts use the site's disease-area matching across ClinicalTrials.gov-derived records. Cancer trial interpretation can be highly context-dependent because biomarkers, combinations, and standards of care change quickly.",
      metrics: [
        { label: "Oncology-related records", value: "7,871", detail: "Stopped trials matched to oncology or cancer-related disease-area language." },
        { label: "Likely biological failures", value: "665", detail: "Oncology records classified as efficacy/futility or safety signals." },
        { label: "Biological share", value: "8%", detail: "Many stopped oncology studies are operational, strategic, or unclear rather than direct scientific failures." },
      ],
      distributions: [
        {
          heading: "Common oncology conditions",
          items: [
            { label: "Breast cancer", value: "471" },
            { label: "Multiple myeloma", value: "290" },
            { label: "Prostate cancer", value: "275" },
            { label: "Melanoma", value: "216" },
          ],
        },
        {
          heading: "Top oncology phases",
          items: [
            { label: "Phase 2", value: "5,106" },
            { label: "Phase 1", value: "3,748" },
            { label: "Phase 3", value: "775" },
            { label: "Early phase 1", value: "243" },
          ],
        },
      ],
      examples: [
        {
          nctId: "NCT04165031",
          title: "LY3499446 in advanced solid tumors with KRAS G12C mutation",
          reason: "Safety",
          summary:
            "This oncology record was terminated because of an unexpected toxicity finding, a clear safety-driven cancer trial stop signal.",
          href: "/trial/NCT04165031",
        },
        {
          nctId: "NCT05491317",
          title: "Immunoradiotherapy combinations in metastatic solid tumors",
          reason: "Efficacy/futility",
          summary:
            "The registry reason says the sponsor did not proceed to randomized Phase 2 due to lack of efficacy, a concrete oncology failure signal.",
          href: "/trial/NCT05491317",
        },
        {
          nctId: "NCT01012297",
          title: "Gemcitabine and docetaxel with or without bevacizumab",
          reason: "Efficacy/futility",
          summary:
            "This cancer trial closed early for futility, making it useful for users studying endpoint and efficacy-related oncology stops.",
          href: "/trial/NCT01012297",
        },
      ],
    },
    faqs: [
      {
        question: "Are all oncology trial failures caused by lack of efficacy?",
        answer:
          "No. Oncology trials can stop because of efficacy, safety, enrollment, funding, strategy, operational, or regulatory factors.",
      },
      {
        question: "Can I filter specifically for oncology?",
        answer:
          "Use the Explore page to search oncology-related disease areas, conditions, sponsors, phases, and stop reasons.",
      },
      {
        question: "Why are cancer trial stop reasons hard to interpret?",
        answer:
          "Oncology development often involves biomarkers, combinations, evolving standards of care, and complex patient populations, so primary source verification is important.",
      },
    ],
  },

  terminatedClinicalTrials: {
    slug: "/terminated-clinical-trials",
    title: "Terminated clinical trials | 16,085 termination reason records",
    metaDescription:
      "Search 16,085 terminated clinical trials and compare termination reasons, including efficacy, futility, safety, enrollment, funding, strategy, and operations.",
    eyebrow: "Terminated clinical trials",
    h1: "Terminated clinical trials: search reasons and failure patterns",
    lede:
      "Terminated clinical trials are a critical source of development intelligence, but termination does not always mean scientific failure. This guide explains how to interpret terminated trial records and compare termination reasons.",
    quickAnswer:
      "Terminated clinical trial means the study ended before planned completion. It does not automatically mean the drug failed. In the current dataset, 16,085 records are terminated, but only a subset point to efficacy/futility or safety-related biological failure.",
    primaryCta: { href: "/explore", label: "Search terminated trials" },
    secondaryCta: { href: "/methods", label: "Understand reason buckets" },
    keyPoints: [
      "Termination status is a signal that needs context.",
      "Reason buckets help separate scientific, operational, regulatory, and strategic stops.",
      "Primary ClinicalTrials.gov records should be reviewed before drawing conclusions.",
    ],
    sections: [
      {
        heading: "Termination status versus failure reason",
        body: [
          "A terminated clinical trial ended before its planned completion. The reason may be scientific, such as futility or safety, but it may also be practical, financial, strategic, or operational.",
          "That distinction matters. Treating every terminated trial as a drug failure can lead to poor conclusions, especially in areas with recruitment challenges or rapidly changing standards of care.",
        ],
      },
      {
        heading: "How termination reasons are grouped",
        body: [
          "The database groups stop reasons into buckets such as efficacy/futility, safety, enrollment, funding, regulatory, strategic, operational, and other/unknown.",
          "This makes it easier to scan large numbers of terminated records and decide which records deserve deeper primary-source review.",
        ],
      },
      {
        heading: "Using terminated trial data in research",
        body: [
          "Terminated trial patterns can inform competitive intelligence, diligence, portfolio strategy, clinical operations planning, and landscape reviews.",
          "The most useful analyses compare termination reasons across phases, sponsors, disease areas, and interventions rather than relying on a single trial record.",
        ],
      },
    ],
    related: [
      { href: "/failed-clinical-trials", label: "Failed clinical trials", text: "Compare failed and stopped trial language." },
      { href: "/why-clinical-trials-fail", label: "Why trials fail", text: "Learn common failure categories." },
      { href: "/explore", label: "Explore", text: "Filter stopped trial records." },
    ],
    dataInsights: {
      heading: "What termination records show",
      intro:
        "The terminated-trials slice is the largest status group in the database. It is useful for SEO and research because users often search termination status directly, but the dataset shows why termination must be paired with reason classification.",
      sourceNote:
        "Termination counts are based on the ClinicalTrials.gov overall status field. The interpretation of why a terminated trial stopped comes from sponsor-provided stop text and the site's reason-bucket classification.",
      metrics: [
        { label: "Terminated records", value: "16,085", detail: "Trials with overall status TERMINATED in the current dataset." },
        { label: "Biological failures", value: "1,677", detail: "Terminated records classified as efficacy/futility or safety signals." },
        { label: "Biological share", value: "10%", detail: "Termination is not the same as scientific failure." },
      ],
      distributions: [
        {
          heading: "Termination reason buckets",
          items: [
            { label: "Operational", value: "8,613" },
            { label: "Other/unknown", value: "5,749" },
            { label: "Efficacy/futility", value: "1,043" },
            { label: "Safety", value: "634" },
          ],
        },
        {
          heading: "Top terminated-trial phases",
          items: [
            { label: "Phase 2", value: "7,513" },
            { label: "Phase 1", value: "4,612" },
            { label: "Phase 3", value: "2,819" },
            { label: "Phase 4", value: "1,811" },
          ],
        },
      ],
      examples: [
        {
          nctId: "NCT07014735",
          title: "Effect of Hyperglycaemia and Moxifloxacin on QTc Interval in T2DM",
          reason: "Efficacy/futility",
          summary:
            "A terminated record whose stop language directly references futility, illustrating why the reason field is more informative than status alone.",
          href: "/trial/NCT07014735",
        },
        {
          nctId: "NCT05999968",
          title: "Abemaciclib plus darolutamide in prostate cancer after initial treatment",
          reason: "Efficacy/futility",
          summary:
            "A terminated oncology-related record connected to a related study missing its primary endpoint.",
          href: "/trial/NCT05999968",
        },
        {
          nctId: "NCT04867837",
          title: "OCTAPLEX in patients with acute major bleeding on DOAC therapy",
          reason: "Efficacy/futility",
          summary:
            "This terminated trial references interim-analysis futility, a stronger scientific signal than termination status alone.",
          href: "/trial/NCT04867837",
        },
      ],
    },
    faqs: [
      {
        question: "Does terminated mean the drug failed?",
        answer:
          "Not always. Termination can reflect scientific, operational, financial, strategic, regulatory, or enrollment reasons.",
      },
      {
        question: "Where can I see the original reason?",
        answer:
          "Open a trial detail page from Explore and use the ClinicalTrials.gov source link for the primary record.",
      },
      {
        question: "Should terminated trial pages be used for medical advice?",
        answer:
          "No. This site is for research support and should not be used as medical advice.",
      },
    ],
  },

  clinicalTrialFutility: {
    slug: "/clinical-trial-futility",
    title: "Clinical trial futility explained | Meaning and interpretation",
    metaDescription:
      "Learn what clinical trial futility means, how interim analyses inform stopping decisions, and how to interpret futility without overstating the evidence.",
    eyebrow: "Clinical trial futility",
    h1: "Clinical trial futility: what it means and how to interpret it",
    lede:
      "Clinical trial futility usually means the accumulating evidence suggests a study is unlikely to meet its endpoint or show sufficient benefit. Futility stops are among the clearest registry signals of likely biological or efficacy failure.",
    quickAnswer:
      "Clinical trial futility usually means the available data suggest a study is unlikely to achieve its planned objective. It can support an early stopping decision, but its meaning depends on the endpoint, interim-analysis rules, population, dose, and wider trial context.",
    primaryCta: { href: "/failures/futility", label: "Open futility evidence hub" },
    secondaryCta: { href: "/why-clinical-trials-fail", label: "Why trials fail" },
    keyPoints: [
      "Futility can indicate a trial is unlikely to meet its endpoint.",
      "Related language includes lack of efficacy, insufficient benefit, and failed endpoints.",
      "Futility should be verified against trial design, interim analyses, and primary records.",
    ],
    sections: [
      {
        heading: "What futility means in clinical trials",
        body: [
          "A futility stop can occur when interim data suggest the trial is unlikely to demonstrate the intended treatment effect. It does not always mean the intervention has no biological activity, but it is a strong signal that the study did not support continued development in that setting.",
          "Registry records may mention futility directly or use related language such as lack of efficacy, insufficient benefit, failure to meet endpoints, or no meaningful difference.",
        ],
      },
      {
        heading: "Why futility is useful for failure analysis",
        body: [
          "Compared with broad termination language, futility is more closely tied to the scientific or clinical performance of the intervention. That makes it useful for identifying weak efficacy patterns across sponsors, phases, indications, and mechanisms.",
          "The database lets users search futility terms and combine them with structured filters so they can separate likely efficacy failures from operational stops.",
        ],
      },
      {
        heading: "How to avoid over-interpreting futility",
        body: [
          "Futility depends on trial design, statistical rules, endpoints, patient selection, and interim data. A futility stop in one population does not necessarily invalidate a target or intervention in every setting.",
          "Use futility records as a starting point for deeper review. Primary ClinicalTrials.gov records, protocols, publications, and sponsor disclosures provide the context needed for interpretation.",
        ],
      },
    ],
    related: [
      { href: "/why-clinical-trials-fail", label: "Why trials fail", text: "Compare futility with other stop reasons." },
      { href: "/failures/futility", label: "Futility evidence hub", text: "Review V2 outcomes and source-linked futility records." },
      { href: "/outliers", label: "Outliers", text: "Find over-represented futility patterns." },
    ],
    dataInsights: {
      heading: "Futility and weak-efficacy records",
      intro:
        "The futility page now uses a targeted dataset slice: records with futility, lack-of-efficacy, failed-endpoint, insufficient-benefit, or related weak-efficacy language. This makes the page materially different from a generic definition of futility.",
      sourceNote:
        "The futility slice is based on registry stop language and reason-bucket signals. Use it to find candidate records, then verify the NCT entry, endpoint design, interim-analysis rules, and any sponsor publications.",
      metrics: [
        { label: "Futility-related records", value: "1,251", detail: "Stopped records matching futility or related weak-efficacy language." },
        { label: "Likely biological failures", value: "1,112", detail: "Records in this slice classified as efficacy/futility or safety biological signals." },
        { label: "Biological share", value: "89%", detail: "Futility language is much more concentrated in scientific-failure records than the full dataset." },
      ],
      distributions: [
        {
          heading: "Futility-related status mix",
          items: [
            { label: "Terminated", value: "1,189" },
            { label: "Withdrawn", value: "43" },
            { label: "Suspended", value: "19" },
          ],
        },
        {
          heading: "Top phases in futility records",
          items: [
            { label: "Phase 2", value: "671" },
            { label: "Phase 3", value: "382" },
            { label: "Phase 1", value: "214" },
            { label: "Phase 4", value: "69" },
          ],
        },
      ],
      examples: [
        {
          nctId: "NCT07014735",
          title: "Effect of Hyperglycaemia and Moxifloxacin on QTc Interval in T2DM",
          reason: "Efficacy/futility",
          summary:
            "The trial was terminated early on futility grounds, making it a direct example for users searching clinical trial futility.",
          href: "/trial/NCT07014735",
        },
        {
          nctId: "NCT05999968",
          title: "Abemaciclib plus darolutamide in prostate cancer after initial treatment",
          reason: "Efficacy/futility",
          summary:
            "The record ties termination to a related study missing its primary endpoint, an adjacent weak-efficacy signal.",
          href: "/trial/NCT05999968",
        },
        {
          nctId: "NCT04867837",
          title: "OCTAPLEX in patients with acute major bleeding on DOAC therapy",
          reason: "Efficacy/futility",
          summary:
            "The stop language mentions futility based on treatment effect size at interim analysis, which is exactly the kind of record this page surfaces.",
          href: "/trial/NCT04867837",
        },
      ],
    },
    faqs: [
      {
        question: "Is futility the same as lack of efficacy?",
        answer:
          "They overlap, but futility often refers to a formal or practical decision that a trial is unlikely to meet its objective, while lack of efficacy is a broader interpretation of insufficient benefit.",
      },
      {
        question: "Does futility mean a treatment never works?",
        answer:
          "No. Futility is specific to a trial design, endpoint, population, dose, combination, and disease context.",
      },
      {
        question: "How can I find futility records?",
        answer:
          "Use the Explore page and search for futility, lack of efficacy, failed endpoint, or related stop-reason language.",
      },
    ],
  },

  failedEndpointClinicalTrials: {
    slug: "/failed-endpoint-clinical-trials",
    title: "Failed endpoint clinical trials | Search 1,420 endpoint signals",
    metaDescription:
      "Search failed endpoint clinical trial signals across 1,420 stopped records with endpoint, futility, lack-of-efficacy, and weak-benefit source language.",
    eyebrow: "Endpoint failure evidence",
    h1: "Failed endpoint clinical trials: search endpoint and futility signals",
    lede:
      "Failed endpoint clinical trials are among the most useful records for understanding weak clinical evidence, but they need careful interpretation. This page focuses on stopped records where the source language points to endpoints, futility, lack of efficacy, insufficient benefit, or treatment-effect concerns.",
    quickAnswer:
      "A failed endpoint clinical trial is best treated as an evidence signal, not a final conclusion. The current database contains 1,420 stopped records with endpoint, efficacy, futility, or weak-benefit language, including 416 oncology records in that slice.",
    primaryCta: { href: "/explore?bucket=EFFICACY%2FFUTILITY", label: "Search endpoint signals" },
    secondaryCta: { href: "/clinical-trial-futility", label: "Review futility guide" },
    keyPoints: [
      "Find stopped records with endpoint, futility, lack-of-efficacy, and insufficient-benefit language.",
      "Separate endpoint failure signals from broad termination status.",
      "Verify each signal against the source NCT record and trial endpoint design.",
    ],
    sections: [
      {
        heading: "What failed endpoint language usually means",
        body: [
          "A failed endpoint signal usually means the registry language says the study did not show enough evidence on a planned clinical objective, or that continuing the trial was unlikely to demonstrate the intended treatment effect.",
          "The wording can vary. Some records mention futility directly. Others mention lack of efficacy, failed endpoints, insufficient benefit, no treatment effect, or no survival benefit. The database groups these records so they can be searched without relying on one exact phrase.",
        ],
      },
      {
        heading: "Why endpoint records are high-value for research",
        body: [
          "Endpoint-related stops are closer to the core clinical question than many other stopped-trial records. They can help users identify weak efficacy patterns by disease area, phase, sponsor, intervention, or modality.",
          "They are also easy to overread. A failed endpoint in one patient population does not prove a mechanism is dead everywhere. Endpoint choice, dose, comparator, trial size, and patient selection all matter.",
        ],
      },
      {
        heading: "How to use this page",
        body: [
          "Use this page to understand the dataset slice, then open Explore to inspect individual records. The strongest workflow is to filter by efficacy/futility, add a disease area or sponsor, and then verify the NCT source record.",
          "For any important record, check the registered endpoints, enrollment, phase, update dates, sponsor language, publications, and regulatory materials before drawing a conclusion.",
        ],
      },
    ],
    related: [
      { href: "/insights/failed-endpoint-clinical-trial-signals", label: "Endpoint insight", text: "Read the data-backed article on failed endpoint search signals." },
      { href: "/clinical-trial-futility", label: "Clinical trial futility", text: "Understand futility and weak-efficacy stops." },
      { href: "/failed-clinical-trials", label: "Failed clinical trials", text: "Compare endpoint signals with broader failed-trial searches." },
    ],
    dataInsights: {
      heading: "Endpoint and weak-efficacy signals in the dataset",
      intro:
        "This page uses a targeted slice of the database: stopped records with endpoint, efficacy, futility, failed-to-meet, lack-of-benefit, or treatment-effect language. That makes the page stronger than a generic definition because it is anchored in source-derived records.",
      sourceNote:
        "Counts are generated from the current ClinicalTrials.gov-derived stopped-trial dataset. Endpoint signals are screening labels and should be verified against the primary NCT record, endpoints, protocol context, and sponsor disclosures.",
      metrics: [
        { label: "Endpoint-related records", value: "1,420", detail: "Stopped records matching endpoint, efficacy, futility, or weak-benefit language." },
        { label: "Terminated records", value: "1,352", detail: "Most records in this slice have TERMINATED status." },
        { label: "Largest disease area", value: "416 oncology", detail: "Oncology is the largest endpoint-related disease-area slice." },
      ],
      distributions: [
        {
          heading: "Endpoint-related status mix",
          items: [
            { label: "Terminated", value: "1,352" },
            { label: "Withdrawn", value: "49" },
            { label: "Suspended", value: "19" },
          ],
        },
        {
          heading: "Largest disease areas",
          items: [
            { label: "Oncology", value: "416" },
            { label: "Neurology", value: "109" },
            { label: "Infectious Disease", value: "108" },
            { label: "Gastroenterology & Hepatology", value: "105" },
          ],
        },
      ],
      examples: [
        {
          nctId: "NCT05491317",
          title: "Immunoradiotherapy combinations in metastatic solid tumors",
          reason: "Efficacy/futility",
          summary:
            "The sponsor decided not to proceed to randomized Phase 2 due to lack of efficacy, making this a concrete endpoint-adjacent failure signal.",
          href: "/trial/NCT05491317",
        },
        {
          nctId: "NCT04910269",
          title: "Outpatient treatment with anti-coronavirus immunoglobulin",
          reason: "Efficacy/futility",
          summary:
            "The registry stop reason says the study stopped for futility, with no safety issues noted in the short source language.",
          href: "/trial/NCT04910269",
        },
        {
          nctId: "NCT04173273",
          title: "Oral etrasimod in moderately to severely active Crohn's disease",
          reason: "Efficacy/futility",
          summary:
            "The registry language says the study was discontinued due to lack of efficacy in a sub-study.",
          href: "/trial/NCT04173273",
        },
      ],
    },
    faqs: [
      {
        question: "Does a failed endpoint prove a drug failed?",
        answer:
          "No. A failed endpoint is a strong signal, but interpretation depends on endpoint design, population, dose, comparator, phase, and available source documents.",
      },
      {
        question: "What search terms help find endpoint failures?",
        answer:
          "Useful phrases include failed endpoint, lack of efficacy, futility, failed to meet, insufficient benefit, treatment effect, and no survival benefit.",
      },
      {
        question: "Can I filter endpoint signals by sponsor?",
        answer:
          "Yes. Open Explore and combine efficacy/futility or endpoint keywords with sponsor, disease area, phase, and status filters.",
      },
    ],
  },

  clinicalTrialEnrollmentFailure: {
    slug: "/clinical-trial-enrollment-failure",
    title: "Clinical trial enrollment failure | Search 7,156 recruitment stops",
    metaDescription:
      "Search clinical trial enrollment failure records across 7,156 stopped trials with recruitment, enrollment, accrual, and feasibility source language.",
    eyebrow: "Enrollment failure evidence",
    h1: "Clinical trial enrollment failure: search recruitment and accrual stops",
    lede:
      "Clinical trial enrollment failure is one of the most common reasons studies stop, but it should not be confused with biological drug failure. This page focuses on stopped records where the source language points to recruitment, enrollment, accrual, or feasibility problems.",
    quickAnswer:
      "Clinical trial enrollment failure usually means the study could not recruit, accrue, or retain enough eligible participants to continue as planned. The current database contains 7,156 enrollment-related stopped records, including 2,576 oncology records.",
    primaryCta: { href: "/explore?q=enrollment", label: "Search enrollment stops" },
    secondaryCta: { href: "/terminated-clinical-trials", label: "Compare terminated trials" },
    keyPoints: [
      "Search stopped records with enrollment, recruitment, accrual, and feasibility language.",
      "Separate trial execution failure from biological failure.",
      "Use disease-area and sponsor filters to identify repeated recruitment problems.",
    ],
    sections: [
      {
        heading: "What enrollment failure means",
        body: [
          "Enrollment failure means a trial could not recruit or accrue enough participants to continue as planned. That can happen before treatment starts, during active recruitment, or after trial conditions change.",
          "Common source language includes slow accrual, insufficient accrual, unable to recruit, enrollment goals not met, poor recruitment, or sites not recruiting as planned.",
        ],
      },
      {
        heading: "Why it is different from drug failure",
        body: [
          "An enrollment stop often tells you more about feasibility than biology. The intervention may not have been tested enough to conclude whether it worked, failed, or created safety problems.",
          "That does not make enrollment failure unimportant. Recruitment problems can reveal narrow eligibility, competitive pressure, trial burden, site execution issues, or patient population problems.",
        ],
      },
      {
        heading: "How to analyze enrollment stops",
        body: [
          "The most useful workflow is to compare enrollment stops by phase, disease area, sponsor, and condition. A single enrollment stop may be noise. Repeated enrollment stops in the same niche can be a meaningful development signal.",
          "Use this page as a starting point, then verify the source NCT records and look for protocol amendments, enrollment targets, actual enrollment, site footprint, and competing trials.",
        ],
      },
    ],
    related: [
      { href: "/insights/enrollment-failure-clinical-trials", label: "Enrollment insight", text: "Read the data-backed article on recruitment and accrual failures." },
      { href: "/terminated-clinical-trials", label: "Terminated clinical trials", text: "See why stopped status needs reason context." },
      { href: "/why-clinical-trials-fail", label: "Why trials fail", text: "Compare enrollment with efficacy, safety, and operational stops." },
    ],
    dataInsights: {
      heading: "Enrollment and recruitment signals in the dataset",
      intro:
        "This page uses a targeted slice of stopped records with enrollment, recruitment, accrual, and feasibility language. It is useful because enrollment failure is common and analytically different from efficacy or safety failure.",
      sourceNote:
        "Counts are generated from the current ClinicalTrials.gov-derived stopped-trial dataset. Enrollment signals are screening labels and should be verified against the primary NCT record and source language.",
      metrics: [
        { label: "Enrollment-related records", value: "7,156", detail: "Stopped records matching enrollment, recruitment, accrual, or feasibility language." },
        { label: "Terminated records", value: "5,458", detail: "The largest status group in this enrollment-related slice." },
        { label: "Largest disease area", value: "2,576 oncology", detail: "Oncology is the largest recruitment-related disease-area slice." },
      ],
      distributions: [
        {
          heading: "Enrollment-related status mix",
          items: [
            { label: "Terminated", value: "5,458" },
            { label: "Withdrawn", value: "1,581" },
            { label: "Suspended", value: "117" },
          ],
        },
        {
          heading: "Largest disease areas",
          items: [
            { label: "Oncology", value: "2,576" },
            { label: "Infectious Disease", value: "478" },
            { label: "Gastroenterology & Hepatology", value: "478" },
            { label: "Cardiovascular", value: "440" },
          ],
        },
      ],
      examples: [
        {
          nctId: "NCT01555554",
          title: "Perioperative propranolol in patients with PTSD",
          reason: "Operational",
          summary:
            "The source language says the study was unable to meet enrollment goals, a direct enrollment failure signal rather than a biological failure signal.",
          href: "/trial/NCT01555554",
        },
        {
          nctId: "NCT04106856",
          title: "Losartan and hypofractionated radiation after chemotherapy in pancreatic cancer",
          reason: "Operational",
          summary:
            "The record says the trial closed due to slow accrual, which is useful for feasibility analysis in oncology development.",
          href: "/trial/NCT04106856",
        },
        {
          nctId: "NCT01871571",
          title: "Bevacizumab and chemotherapy before surgery in stage II-III rectal cancer",
          reason: "Operational",
          summary:
            "The registry stop language says insufficient accrual, a clean example of why enrollment stops should be separated from efficacy failures.",
          href: "/trial/NCT01871571",
        },
      ],
    },
    faqs: [
      {
        question: "Is enrollment failure a failed clinical trial?",
        answer:
          "It can be a failed trial execution signal, but it is not automatically a biological failure or failed drug signal.",
      },
      {
        question: "Why do clinical trials fail to enroll?",
        answer:
          "Reasons can include narrow eligibility, patient availability, trial burden, site activation, competing studies, changed standard of care, or sponsor execution problems.",
      },
      {
        question: "How can I find recruitment-related stopped trials?",
        answer:
          "Use Explore and search terms such as enrollment, recruitment, accrual, slow accrual, unable to recruit, or insufficient accrual.",
      },
    ],
  },
};

function fmt(value: number): string {
  return value.toLocaleString("en-US");
}

function replaceDatasetNumbers(text: string, stats: InsightStats): string {
  const replacements: Array<[string, string]> = [
    ["23,452", fmt(stats.total)],
    ["1,813", fmt(stats.scientificCount)],
    ["8%", stats.scientificShare],
    ["16,085", fmt(stats.statuses.terminated)],
    ["6,782", fmt(stats.statuses.withdrawn)],
    ["585", fmt(stats.statuses.suspended)],
    ["12,013", fmt(stats.buckets.OPERATIONAL || 0)],
    ["9,534", fmt(stats.buckets["OTHER/UNKNOWN"] || 0)],
    ["1,096", fmt(stats.buckets["EFFICACY/FUTILITY"] || 0)],
    ["717", fmt(stats.buckets.SAFETY || 0)],
    ["92", fmt(stats.buckets.REGULATORY || 0)],
    ["7,871", fmt(stats.topAreas.Oncology || stats.oncology.total)],
    ["5,755", fmt(stats.topAreas.Other || 0)],
    ["1,700", fmt(stats.topAreas["Infectious Disease"] || 0)],
    ["1,519", fmt(stats.topAreas["Gastroenterology & Hepatology"] || 0)],
    ["581", fmt(stats.oncology.scientificCount)],
    ["304", fmt(stats.oncology.buckets["EFFICACY/FUTILITY"] || 0)],
    ["277", fmt(stats.oncology.buckets.SAFETY || 0)],
  ];

  return replacements.reduce((out, [from, to]) => out.replaceAll(from, to), text);
}

function hydrateValue<T>(value: T, stats: InsightStats): T {
  if (typeof value === "string") return replaceDatasetNumbers(value, stats) as T;
  if (Array.isArray(value)) return value.map((item) => hydrateValue(item, stats)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, hydrateValue(child, stats)])
    ) as T;
  }
  return value;
}

function hydrateFailedEndpointPage(page: SeoLandingPageConfig, stats: InsightStats): SeoLandingPageConfig {
  const endpoint = stats.endpointSignals;
  const oncology = endpoint.topAreas.find((item) => item.label === "Oncology") || endpoint.topAreas[0];

  return {
    ...page,
    title: `Failed endpoint clinical trials | Search ${fmt(endpoint.total)} endpoint signals`,
    metaDescription: `Search failed endpoint clinical trial signals across ${fmt(endpoint.total)} stopped records with endpoint, futility, lack-of-efficacy, and weak-benefit source language.`,
    quickAnswer: `A failed endpoint clinical trial is best treated as an evidence signal, not a final conclusion. The current database contains ${fmt(endpoint.total)} stopped records with endpoint, efficacy, futility, or weak-benefit language, including ${fmt(oncology?.count || 0)} ${oncology?.label || "oncology"} records in that slice.`,
    dataInsights: page.dataInsights
      ? {
          ...page.dataInsights,
          metrics: [
            { label: "Endpoint-related records", value: fmt(endpoint.total), detail: "Stopped records matching endpoint, efficacy, futility, or weak-benefit language." },
            { label: "Terminated records", value: fmt(endpoint.statuses.TERMINATED || 0), detail: "Most records in this slice have TERMINATED status." },
            { label: "Largest disease area", value: `${fmt(oncology?.count || 0)} ${oncology?.label || "Oncology"}`, detail: `${oncology?.label || "Oncology"} is the largest endpoint-related disease-area slice.` },
          ],
          distributions: [
            {
              heading: "Endpoint-related status mix",
              items: [
                { label: "Terminated", value: fmt(endpoint.statuses.TERMINATED || 0) },
                { label: "Withdrawn", value: fmt(endpoint.statuses.WITHDRAWN || 0) },
                { label: "Suspended", value: fmt(endpoint.statuses.SUSPENDED || 0) },
              ],
            },
            {
              heading: "Largest disease areas",
              items: endpoint.topAreas.slice(0, 4).map((item) => ({ label: item.label, value: fmt(item.count) })),
            },
          ],
        }
      : page.dataInsights,
  };
}

function hydrateEnrollmentFailurePage(page: SeoLandingPageConfig, stats: InsightStats): SeoLandingPageConfig {
  const enrollment = stats.enrollmentSignals;
  const oncology = enrollment.topAreas.find((item) => item.label === "Oncology") || enrollment.topAreas[0];

  return {
    ...page,
    title: `Clinical trial enrollment failure | Search ${fmt(enrollment.total)} recruitment stops`,
    metaDescription: `Search clinical trial enrollment failure records across ${fmt(enrollment.total)} stopped trials with recruitment, enrollment, accrual, and feasibility source language.`,
    quickAnswer: `Clinical trial enrollment failure usually means the study could not recruit, accrue, or retain enough eligible participants to continue as planned. The current database contains ${fmt(enrollment.total)} enrollment-related stopped records, including ${fmt(oncology?.count || 0)} ${oncology?.label || "oncology"} records.`,
    dataInsights: page.dataInsights
      ? {
          ...page.dataInsights,
          metrics: [
            { label: "Enrollment-related records", value: fmt(enrollment.total), detail: "Stopped records matching enrollment, recruitment, accrual, or feasibility language." },
            { label: "Terminated records", value: fmt(enrollment.statuses.TERMINATED || 0), detail: "The largest status group in this enrollment-related slice." },
            { label: "Largest disease area", value: `${fmt(oncology?.count || 0)} ${oncology?.label || "Oncology"}`, detail: `${oncology?.label || "Oncology"} is the largest recruitment-related disease-area slice.` },
          ],
          distributions: [
            {
              heading: "Enrollment-related status mix",
              items: [
                { label: "Terminated", value: fmt(enrollment.statuses.TERMINATED || 0) },
                { label: "Withdrawn", value: fmt(enrollment.statuses.WITHDRAWN || 0) },
                { label: "Suspended", value: fmt(enrollment.statuses.SUSPENDED || 0) },
              ],
            },
            {
              heading: "Largest disease areas",
              items: enrollment.topAreas.slice(0, 4).map((item) => ({ label: item.label, value: fmt(item.count) })),
            },
          ],
        }
      : page.dataInsights,
  };
}

function hydrateClinicalTrialFutilityPage(page: SeoLandingPageConfig, stats: InsightStats): SeoLandingPageConfig {
  const efficacy = stats.signalComparison.efficacy;
  const leadingPhase = efficacy.phases[0];
  const leadingArea = efficacy.topAreas[0];

  return {
    ...page,
    title: `Clinical Trial Futility: ${fmt(efficacy.total)} Source-Linked Signals`,
    metaDescription: `Understand clinical trial futility through ${fmt(efficacy.total)} current efficacy and futility records, with phase, status, disease-area, and source-linked NCT evidence.`,
    h1: "Clinical trial futility: a decision under uncertainty",
    lede:
      "Futility can stop a study when accumulating evidence suggests that continuing is unlikely to achieve its planned objective. The important question is not whether a record contains the word futility, but what evidence and decision rule the source actually describes.",
    quickAnswer: `The current evidence slice contains ${fmt(efficacy.total)} efficacy/futility-classified stopped records. Most are terminated, but the underlying language ranges from explicit interim futility decisions to insufficient activity or a failed endpoint, so the NCT source still determines what can be inferred.`,
    keyPoints: [
      "Explicit statistical futility is stronger evidence than a broad program decision with no endpoint detail.",
      "A futility decision applies to a trial's design, endpoint, population, dose, and information available at the analysis.",
      "The registry statement is a screening source; protocols, results, and sponsor disclosures provide the deeper context.",
    ],
    dataInsights: page.dataInsights
      ? {
          ...page.dataInsights,
          heading: "Where efficacy and futility signals appear",
          intro: `The current classifier identifies ${fmt(efficacy.total)} stopped records with efficacy or futility evidence. The distributions locate those records; they do not estimate a phase-wide or disease-wide probability of failure.`,
          sourceNote:
            "Counts are generated from the current ClinicalTrials.gov-derived dataset. Each example reproduces the current compact registry stop language and links to the site's source-backed NCT record.",
          metrics: [
            { label: "Efficacy / futility records", value: fmt(efficacy.total), detail: "Current records classified from efficacy, endpoint, insufficient-activity, or futility evidence." },
            { label: "Terminated", value: fmt(efficacy.statuses.TERMINATED || 0), detail: `${share(efficacy.statuses.TERMINATED || 0, efficacy.total)} of this evidence slice.` },
            { label: "Largest phase slice", value: `${fmt(leadingPhase?.count || 0)} ${leadingPhase?.label || "Phase II"}`, detail: "A count among stopped records, not a clinical development failure rate." },
          ],
          distributions: [
            {
              heading: "Registry status",
              items: [
                { label: "Terminated", value: fmt(efficacy.statuses.TERMINATED || 0) },
                { label: "Withdrawn", value: fmt(efficacy.statuses.WITHDRAWN || 0) },
                { label: "Suspended", value: fmt(efficacy.statuses.SUSPENDED || 0) },
              ],
            },
            {
              heading: `Leading disease areas · ${leadingArea?.label || "current data"}`,
              items: efficacy.topAreas.slice(0, 5).map((item) => ({ label: item.label, value: fmt(item.count) })),
            },
          ],
        }
      : page.dataInsights,
  };
}

const V2_OUTCOME_LABELS: Record<string, string> = {
  NON_BIOLOGICAL: "Non-biological stop",
  UNKNOWN: "Review-gated / unknown",
  BIOLOGICAL_FAILURE: "Biological failure",
  CAUSE_NOT_STATED: "Cause not stated",
  NON_FAILURE_TRANSITION: "Non-failure transition",
  MIXED_CAUSES: "Mixed causes",
};

const V2_REASON_LABELS: Record<string, string> = {
  RECRUITMENT: "Recruitment",
  BUSINESS_STRATEGY: "Business strategy",
  FUNDING: "Funding",
  EFFICACY_FUTILITY: "Efficacy / futility",
  DECISION_WITHOUT_STATED_CAUSE: "Decision without stated cause",
  STAFFING_RESOURCES: "Staffing / resources",
  PROTOCOL_FEASIBILITY: "Protocol feasibility",
  SUPPLY_MANUFACTURING: "Supply / manufacturing",
  SAFETY: "Safety",
  REGULATORY: "Regulatory",
  EXTERNAL_DISRUPTION: "External disruption",
  BIOLOGICAL_UNSPECIFIED: "Biological, unspecified",
};

function share(part: number, total: number): string {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function rankedV2Items(
  values: Record<string, number>,
  labels: Record<string, string>,
  limit = 6,
  exclude: string[] = []
) {
  const excluded = new Set(exclude);
  return Object.entries(values)
    .filter(([key, value]) => value > 0 && !excluded.has(key))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key, value]) => ({ label: labels[key] || key, value: fmt(value) }));
}

function hydrateClinicalTrialFailuresPage(page: SeoLandingPageConfig, stats: InsightStats): SeoLandingPageConfig {
  const v2 = stats.classificationV2;
  const biological = v2.outcomes.BIOLOGICAL_FAILURE || 0;
  const nonBiological = v2.outcomes.NON_BIOLOGICAL || 0;
  const reviewGated = v2.outcomes.UNKNOWN || v2.reviewGated;

  return {
    ...page,
    title: `Clinical Trial Failures Database: ${fmt(stats.total)} Stopped Trials`,
    metaDescription: `Search ${fmt(stats.total)} terminated, withdrawn, and suspended trials with V2 evidence classifications, stated stop reasons, and ClinicalTrials.gov source links.`,
    eyebrow: "Clinical Trial Failures V2",
    h1: "Clinical trial failures, classified by evidence",
    lede: `Search ${fmt(stats.total)} stopped clinical trial records through a V2 evidence layer that separates biological failure signals from recruitment, funding, business strategy, operational causes, and records that still require review.`,
    quickAnswer: `The database contains ${fmt(stats.total)} terminated, withdrawn, and suspended trials. Classification V2 identifies ${fmt(biological)} biological failure signals and ${fmt(nonBiological)} non-biological stops, while ${fmt(reviewGated)} records remain review-gated instead of being forced into an unsupported category.`,
    dataInsights: page.dataInsights
      ? {
          ...page.dataInsights,
          heading: "What Classification V2 shows across stopped trials",
          intro: `The current dataset separates registry status from interpreted outcome. Biological failure is a deliberately narrow evidence class; non-biological stops, cause-not-stated records, transitions, mixed causes, and review-gated records remain distinct.`,
          sourceNote: `Counts are generated from the current V2-classified dataset during every build. Classifications summarize ClinicalTrials.gov stop language for screening and should be verified against the linked source record.`,
          metrics: [
            { label: "Stopped trial records", value: fmt(stats.total), detail: "Terminated, withdrawn, or suspended registry records." },
            { label: "Biological failure signals", value: fmt(biological), detail: `${share(biological, stats.total)} of records have supported biological failure evidence.` },
            { label: "Review-gated records", value: fmt(reviewGated), detail: "Insufficient or unresolved evidence is kept visible without forced classification." },
          ],
          distributions: [
            { heading: "V2 outcome map", items: rankedV2Items(v2.outcomes, V2_OUTCOME_LABELS) },
            { heading: "Largest stated primary reasons", items: rankedV2Items(v2.primaryReasons, V2_REASON_LABELS, 6, ["UNSPECIFIED"]) },
          ],
        }
      : page.dataInsights,
  };
}

function hydrateWhyClinicalTrialsFailPage(page: SeoLandingPageConfig, stats: InsightStats): SeoLandingPageConfig {
  const v2 = stats.classificationV2;
  const recruitment = v2.primaryReasons.RECRUITMENT || 0;
  const efficacy = v2.primaryReasons.EFFICACY_FUTILITY || 0;
  const safety = v2.primaryReasons.SAFETY || 0;

  return {
    ...page,
    title: `Why Clinical Trials Fail: Evidence from ${fmt(stats.total)} Stopped Trials`,
    metaDescription: `Why do clinical trials fail? Compare V2 evidence for efficacy, futility, safety, recruitment, funding, strategy, feasibility, and other stated stop reasons.`,
    h1: "Why clinical trials fail: evidence from stopped studies",
    lede: `Clinical trials stop for fundamentally different reasons. Classification V2 separates biological failure from recruitment, business strategy, funding, protocol feasibility, staffing, supply, regulatory action, transitions, and cases where the source does not support a conclusion.`,
    quickAnswer: `Recruitment is the largest named primary reason in the current dataset with ${fmt(recruitment)} records. The biological subset includes ${fmt(efficacy)} efficacy or futility records, ${fmt(safety)} safety records, and a smaller biological-unspecified group.`,
    dataInsights: page.dataInsights
      ? {
          ...page.dataInsights,
          heading: "Why trials stop in the V2 classification",
          intro: `The primary-reason layer answers why a record stopped when the registry supplies enough evidence. The separate outcome layer prevents recruitment, funding, strategy, and other non-biological causes from being counted as failed biology.`,
          sourceNote: `Primary reasons are derived from ClinicalTrials.gov registry fields and sponsor-provided stop language. Review-gated and cause-not-stated records are not treated as hidden failures.`,
          metrics: [
            { label: "Recruitment", value: fmt(recruitment), detail: "The largest named primary stop reason in V2." },
            { label: "Efficacy / futility", value: fmt(efficacy), detail: "Lack of benefit, failed endpoints, insufficient activity, or futility evidence." },
            { label: "Safety", value: fmt(safety), detail: "Toxicity, tolerability, adverse events, or unfavorable risk-benefit evidence." },
          ],
          distributions: [
            { heading: "Largest stated primary reasons", items: rankedV2Items(v2.primaryReasons, V2_REASON_LABELS, 7, ["UNSPECIFIED"]) },
            { heading: "Outcome context", items: rankedV2Items(v2.outcomes, V2_OUTCOME_LABELS) },
          ],
        }
      : page.dataInsights,
  };
}

function hydrateFailedClinicalTrialsPage(page: SeoLandingPageConfig, stats: InsightStats): SeoLandingPageConfig {
  const v2 = stats.classificationV2;
  const biological = v2.outcomes.BIOLOGICAL_FAILURE || 0;
  const efficacy = v2.primaryReasons.EFFICACY_FUTILITY || 0;
  const safety = v2.primaryReasons.SAFETY || 0;
  const unspecified = v2.primaryReasons.BIOLOGICAL_UNSPECIFIED || 0;

  return {
    ...page,
    title: `Failed Clinical Trials: ${fmt(biological)} Biological Failure Signals`,
    metaDescription: `Search ${fmt(biological)} likely biological clinical trial failure signals classified as efficacy, futility, safety, or biological-unspecified evidence in V2.`,
    h1: "Failed clinical trials: biological evidence, not status alone",
    lede: `The phrase failed clinical trial should describe evidence, not merely a TERMINATED, WITHDRAWN, or SUSPENDED status. This page focuses on V2 records where the source supports efficacy or futility, safety, or an unfavorable biological signal that cannot be narrowed further.`,
    quickAnswer: `Classification V2 identifies ${fmt(biological)} biological failure signals: ${fmt(efficacy)} efficacy or futility records, ${fmt(safety)} safety records, and ${fmt(unspecified)} biological-unspecified records. Each result remains linked to its source statement for verification.`,
    dataInsights: page.dataInsights
      ? {
          ...page.dataInsights,
          heading: "The V2 biological failure subset",
          intro: `This subset excludes records whose evidence supports recruitment, funding, strategy, operations, transitions, or no stated cause. It is designed as a higher-precision starting point for reviewing possible failed biology.`,
          sourceNote: `Biological failure is an analytical screening classification, not a medical conclusion. Verify the linked registry record, endpoints, publications, and sponsor disclosures before relying on an individual result.`,
          metrics: [
            { label: "Biological failure signals", value: fmt(biological), detail: `${share(biological, stats.total)} of all stopped records in the current dataset.` },
            { label: "Efficacy / futility", value: fmt(efficacy), detail: "The largest V2 biological primary-reason group." },
            { label: "Safety", value: fmt(safety), detail: `${fmt(unspecified)} additional records are biological but not specific enough to split further.` },
          ],
          distributions: [
            { heading: "Biological signals by phase", items: v2.biologicalSignals.phases.slice(0, 6).map((item) => ({ label: item.label, value: fmt(item.count) })) },
            { heading: "Largest biological-signal disease areas", items: v2.biologicalSignals.topAreas.slice(0, 6).map((item) => ({ label: item.label, value: fmt(item.count) })) },
          ],
        }
      : page.dataInsights,
  };
}

function hydrateTerminatedClinicalTrialsPage(page: SeoLandingPageConfig, stats: InsightStats): SeoLandingPageConfig {
  const terminated = stats.classificationV2.terminated;
  const total = stats.statuses.terminated;
  const biological = terminated.outcomes.BIOLOGICAL_FAILURE || 0;

  return {
    ...page,
    title: `Terminated Clinical Trials: ${fmt(total)} Records by Stop Reason`,
    metaDescription: `Search ${fmt(total)} terminated clinical trial records and compare V2 outcomes and stated reasons including efficacy, safety, recruitment, funding, and strategy.`,
    quickAnswer: `A terminated trial ended before planned completion, but termination is not itself a failure reason. In the current dataset, ${fmt(total)} records are terminated and ${fmt(biological)} have V2 evidence supporting a biological failure signal.`,
    dataInsights: page.dataInsights
      ? {
          ...page.dataInsights,
          heading: "Terminated trials by V2 outcome and reason",
          intro: `Termination is the largest stopped-study status, but its records span biological failures, non-biological causes, transitions, mixed causes, cause-not-stated cases, and unresolved evidence.`,
          sourceNote: `Termination comes from the ClinicalTrials.gov overall-status field. V2 outcomes and primary reasons summarize the available stop language and remain subject to source verification.`,
          metrics: [
            { label: "Terminated records", value: fmt(total), detail: "Records with overall status TERMINATED." },
            { label: "Biological failure signals", value: fmt(biological), detail: `${share(biological, total)} of terminated records.` },
            { label: "Non-biological stops", value: fmt(terminated.outcomes.NON_BIOLOGICAL || 0), detail: "Termination evidence tied to non-biological causes." },
          ],
          distributions: [
            { heading: "Terminated-trial outcomes", items: rankedV2Items(terminated.outcomes, V2_OUTCOME_LABELS) },
            { heading: "Largest terminated-trial reasons", items: rankedV2Items(terminated.primaryReasons, V2_REASON_LABELS, 6, ["UNSPECIFIED"]) },
          ],
        }
      : page.dataInsights,
  };
}

export function hydrateSeoLandingPage(page: SeoLandingPageConfig, stats: InsightStats): SeoLandingPageConfig {
  const hydrated = hydrateValue(page, stats);
  if (page.slug === "/clinical-trial-failures") {
    return hydrateClinicalTrialFailuresPage(hydrated, stats);
  }
  if (page.slug === "/why-clinical-trials-fail") {
    return hydrateWhyClinicalTrialsFailPage(hydrated, stats);
  }
  if (page.slug === "/failed-clinical-trials") {
    return hydrateFailedClinicalTrialsPage(hydrated, stats);
  }
  if (page.slug === "/terminated-clinical-trials") {
    return hydrateTerminatedClinicalTrialsPage(hydrated, stats);
  }
  if (page.slug === "/failed-endpoint-clinical-trials") {
    return hydrateFailedEndpointPage(hydrated, stats);
  }
  if (page.slug === "/clinical-trial-enrollment-failure") {
    return hydrateEnrollmentFailurePage(hydrated, stats);
  }
  if (page.slug === "/clinical-trial-futility") {
    return hydrateClinicalTrialFutilityPage(hydrated, stats);
  }
  return hydrated;
}
