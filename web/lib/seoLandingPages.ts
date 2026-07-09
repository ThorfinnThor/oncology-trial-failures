export type SeoLandingPageConfig = {
  slug: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  lede: string;
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
    title: "Clinical trial failures | Database, reasons, and failure signals",
    metaDescription:
      "Explore clinical trial failures with a searchable database of terminated, suspended, and withdrawn trials, including efficacy, futility, safety, and operational stop reasons.",
    eyebrow: "Clinical trial failures",
    h1: "Clinical trial failures: search stopped trials and failure signals",
    lede:
      "Clinical trial failures are often hidden in registry text, status changes, and sponsor-provided stop reasons. This guide explains how to use the Clinical Trial Failures database to study terminated, suspended, and withdrawn trials and separate likely biological failure from operational or strategic stops.",
    primaryCta: { href: "/explore", label: "Search the failure database" },
    secondaryCta: { href: "/methods", label: "Review the methodology" },
    keyPoints: [
      "Search stopped clinical trials from ClinicalTrials.gov registry records.",
      "Filter by phase, sponsor, disease area, intervention, status, and stop reason.",
      "Distinguish likely efficacy, futility, and safety signals from non-biological stops.",
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
          "Clinical Trial Failures brings those records into a workflow built for scanning, filtering, comparison, and export. Researchers can move from a broad market question to a specific set of stopped trials and then verify each primary record.",
        ],
      },
      {
        heading: "How to interpret the results",
        body: [
          "Use the labels as screening signals, not final judgments. A stopped trial may have multiple causes, and registry text can be incomplete. The strongest workflow is to use the database to find candidate records, then review the original ClinicalTrials.gov entry and any related sponsor publications.",
          "For medical and investment decisions, treat the database as research support. It is designed to reduce search time and surface patterns, not to replace primary source review.",
        ],
      },
    ],
    related: [
      { href: "/why-clinical-trials-fail", label: "Why clinical trials fail", text: "Understand common failure categories." },
      { href: "/failed-clinical-trials", label: "Failed clinical trials", text: "Review how failure language appears in stopped trials." },
      { href: "/oncology-clinical-trial-failures", label: "Oncology trial failures", text: "Focus on oncology-specific failure patterns." },
    ],
    dataInsights: {
      heading: "What the current stopped-trial dataset shows",
      intro:
        "The database currently contains 23,452 stopped trial records from ClinicalTrials.gov. The useful SEO point is also the useful research point: most stopped trials are not automatically biological failures, so the page separates status from interpreted stop reason.",
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
    title: "Why clinical trials fail | Efficacy, futility, safety, and operations",
    metaDescription:
      "Learn why clinical trials fail, including lack of efficacy, futility, safety events, enrollment problems, funding, strategy, and operational stop reasons.",
    eyebrow: "Reasons trials fail",
    h1: "Why clinical trials fail: common reasons trials stop early",
    lede:
      "Clinical trials fail for different reasons. Some failures are biological, such as weak efficacy or safety problems. Others are practical, such as enrollment, funding, sponsor strategy, or operational execution. Understanding the difference is essential when studying stopped trials.",
    primaryCta: { href: "/overview", label: "See dataset patterns" },
    secondaryCta: { href: "/explore", label: "Filter stopped trials" },
    keyPoints: [
      "Biological failure often appears as lack of efficacy, futility, failed endpoints, or safety concerns.",
      "Non-biological stops can reflect enrollment, funding, sponsor strategy, or operational constraints.",
      "Registry text should be treated as a signal that needs primary source verification.",
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
          nctId: "NCT07014735",
          title: "Effect of Hyperglycaemia and Moxifloxacin on QTc Interval in T2DM",
          reason: "Efficacy/futility",
          summary:
            "This record shows direct futility language, which is one of the clearest reasons a trial may stop for scientific rather than purely operational reasons.",
          href: "/trial/NCT07014735",
        },
        {
          nctId: "NCT05999968",
          title: "Abemaciclib plus darolutamide in prostate cancer after initial treatment",
          reason: "Efficacy/futility",
          summary:
            "This example shows how one stopped record can depend on the outcome of a related study, which is why program-level context matters.",
          href: "/trial/NCT05999968",
        },
        {
          nctId: "NCT04867837",
          title: "OCTAPLEX in patients with acute major bleeding on DOAC therapy",
          reason: "Efficacy/futility",
          summary:
            "The stop reason mentions interim analysis and futility, showing why trial design and analysis timing should be checked before interpretation.",
          href: "/trial/NCT04867837",
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
    title: "Failed clinical trials | Search terminated and withdrawn trial records",
    metaDescription:
      "Search failed clinical trials and clinical trial fails across terminated, suspended, and withdrawn records with reason buckets for efficacy, safety, enrollment, and operations.",
    eyebrow: "Failed clinical trials",
    h1: "Failed clinical trials and clinical trial fails: how to search the evidence",
    lede:
      "People often search for failed clinical trials or clinical trial fails when they want to know why a program stopped. The useful answer is usually not one record, but a structured view of status, phase, sponsor, disease area, intervention, and stop reason.",
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
          nctId: "NCT07014735",
          title: "Effect of Hyperglycaemia and Moxifloxacin on QTc Interval in T2DM",
          reason: "Efficacy/futility",
          summary:
            "A direct futility stop signal, useful for users searching for failed clinical trials where the registry language points to scientific performance.",
          href: "/trial/NCT07014735",
        },
        {
          nctId: "NCT05999968",
          title: "Abemaciclib plus darolutamide in prostate cancer after initial treatment",
          reason: "Efficacy/futility",
          summary:
            "The trial record connects termination to a related study missing its primary endpoint, making it relevant to program-level failure research.",
          href: "/trial/NCT05999968",
        },
        {
          nctId: "NCT04867837",
          title: "OCTAPLEX in patients with acute major bleeding on DOAC therapy",
          reason: "Efficacy/futility",
          summary:
            "The stop language references futility at interim analysis, a common phrase pattern in likely biological-failure records.",
          href: "/trial/NCT04867837",
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
    title: "Oncology clinical trial failures | Search stopped cancer trials",
    metaDescription:
      "Explore oncology clinical trial failures and stopped cancer trials, including efficacy, futility, safety, enrollment, and operational stop reasons.",
    eyebrow: "Oncology trial failures",
    h1: "Oncology clinical trial failures: search stopped cancer trials",
    lede:
      "Oncology is one of the most active clinical research areas, and stopped cancer trials can reveal important biological, safety, and development signals. This page explains how to study oncology clinical trial failures using structured registry data.",
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
        { label: "Oncology-related records", value: "8,814", detail: "Stopped trials matched to oncology or cancer-related disease-area language." },
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
        {
          nctId: "NCT00253318",
          title: "RAD001 plus docetaxel in metastatic breast cancer",
          reason: "Safety",
          summary:
            "The stop language combines toxicity and lack of efficacy, showing why oncology failures often need both safety and efficacy context.",
          href: "/trial/NCT00253318",
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
    title: "Terminated clinical trials | Search termination reasons and patterns",
    metaDescription:
      "Search terminated clinical trials and compare termination reasons, including efficacy, futility, safety, enrollment, funding, sponsor strategy, and operational stops.",
    eyebrow: "Terminated clinical trials",
    h1: "Terminated clinical trials: search reasons and failure patterns",
    lede:
      "Terminated clinical trials are a critical source of development intelligence, but termination does not always mean scientific failure. This guide explains how to interpret terminated trial records and compare termination reasons.",
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
    title: "Clinical trial futility | Search futility and weak efficacy signals",
    metaDescription:
      "Learn what clinical trial futility means and search stopped trials with futility, weak efficacy, lack of benefit, and failed endpoint signals.",
    eyebrow: "Clinical trial futility",
    h1: "Clinical trial futility: search weak efficacy and failed endpoint signals",
    lede:
      "Clinical trial futility usually means the accumulating evidence suggests a study is unlikely to meet its endpoint or show sufficient benefit. Futility stops are among the clearest registry signals of likely biological or efficacy failure.",
    primaryCta: { href: "/explore?q=futility", label: "Search futility records" },
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
      { href: "/clinical-trial-failures", label: "Clinical trial failures", text: "Search the broader failure database." },
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
};
