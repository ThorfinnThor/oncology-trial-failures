export const INSIGHTS_BASE_URL = "https://clinicaltrialfailures.com";

export type InsightStats = {
  total: number;
  statuses: {
    terminated: number;
    withdrawn: number;
    suspended: number;
  };
  buckets: Record<string, number>;
  topAreas: Record<string, number>;
  scientificCount: number;
  scientificShare: string;
  oncology: {
    total: number;
    buckets: Record<string, number>;
    scientificCount: number;
    phase2Total: number;
    phase2Buckets: Record<string, number>;
    topSponsors: Array<{ label: string; count: number }>;
  };
  signalComparison: {
    efficacy: {
      total: number;
      statuses: Record<string, number>;
      phases: Array<{ label: string; count: number }>;
      topAreas: Array<{ label: string; count: number }>;
      topSponsors: Array<{ label: string; count: number }>;
    };
    safety: {
      total: number;
      statuses: Record<string, number>;
      phases: Array<{ label: string; count: number }>;
      topAreas: Array<{ label: string; count: number }>;
      topSponsors: Array<{ label: string; count: number }>;
    };
  };
  endpointSignals: InsightSignalSlice;
  enrollmentSignals: InsightSignalSlice;
  operationalSignals: InsightSignalSlice;
  regulatorySignals: InsightSignalSlice;
  unknownSignals: InsightSignalSlice;
  businessStrategySignals: InsightSignalSlice & {
    explicitNoSafetyOrEfficacyCount: number;
  };
  notInitiatedSignals: InsightSignalSlice & {
    phase2Count: number;
    recruitmentTotal: number;
  };
  withdrawnSignals: InsightSignalSlice & {
    scientificCount: number;
    scientificShare: string;
    buckets: Record<string, number>;
  };
  suspendedSignals: InsightSignalSlice & {
    scientificCount: number;
    scientificShare: string;
    buckets: Record<string, number>;
  };
  diseaseAreaSignalShares: Array<{
    label: string;
    total: number;
    scientificCount: number;
    scientificShare: string;
    efficacyCount: number;
    safetyCount: number;
  }>;
  phaseSignalComparison: Array<{
    key: string;
    label: string;
    total: number;
    scientificCount: number;
    scientificShare: string;
    efficacyCount: number;
    safetyCount: number;
    operationalCount: number;
    otherCount: number;
    regulatoryCount: number;
  }>;
  latestUpdates: {
    startDate: string;
    endDate: string;
    total: number;
    scientificCount: number;
    statuses: Record<string, number>;
    buckets: Record<string, number>;
    topAreas: Array<{ label: string; count: number }>;
    topSponsors: Array<{ label: string; count: number }>;
    notableRecords: Array<{
      nctId: string;
      title: string;
      sponsor: string;
      phase: string;
      area: string;
      status: string;
      bucket: string;
      why: string;
      updated: string;
      href: string;
    }>;
  };
  postedEndpointResults: {
    readOn: string;
    readerVersion: number;
    total: number;
    verdicts: {
      missed: number;
      met: number;
      mixed: number;
    };
    basis: {
      postedAnalysis: number;
      sponsorStatement: number;
    };
    outcomesByVerdict: Record<string, Record<string, number>>;
    examples: Array<{
      nctId: string;
      title: string;
      why: string;
      outcome: string;
      category: string;
      verdict: string;
      evidence: string;
      href: string;
      resultsUrl: string;
    }>;
  };
  countryScaleSignals: {
    bands: Array<CountrySignalSlice & { key: string }>;
    phaseComparisons: Array<{
      key: string;
      label: string;
      bands: Array<CountrySignalSlice & { key: string }>;
    }>;
    areaComparisons: Array<{
      label: string;
      single: CountrySignalSlice;
      fivePlus: CountrySignalSlice;
    }>;
    matchedComparisons: Array<{
      phase: string;
      area: string;
      single: CountrySignalSlice;
      fivePlus: CountrySignalSlice;
    }>;
    examples: Array<{
      nctId: string;
      title: string;
      countries: number;
      phase: string;
      area: string;
      outcome: string;
      category: string;
      why: string;
      href: string;
    }>;
  };
  classificationV2: {
    version: string;
    resolved: number;
    reviewGated: number;
    outcomes: Record<string, number>;
    primaryReasons: Record<string, number>;
    biologicalSignals: InsightSignalSlice;
    terminated: {
      outcomes: Record<string, number>;
      primaryReasons: Record<string, number>;
      biologicalSignals: InsightSignalSlice;
    };
    assertionPrecision: number;
    biologicalPrecision: number;
    heldoutBiologicalPrecision: number;
    heldoutAssertionAgreement: number;
  };
};

export type InsightSignalSlice = {
  total: number;
  statuses: Record<string, number>;
  phases: Array<{ label: string; count: number }>;
  topAreas: Array<{ label: string; count: number }>;
  topSponsors: Array<{ label: string; count: number }>;
};

export type CountrySignalSlice = {
  label: string;
  total: number;
  biologicalCount: number;
  biologicalShare: string;
};

function formatInsightCount(value: number): string {
  return value.toLocaleString("en-US");
}

export type InsightTable = {
  heading: string;
  columns: [string, string];
  rows: Array<[string, string]>;
};

export type InsightArticle = {
  slug: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  dek: string;
  datePublished: string;
  readingTime: string;
  keyword: string;
  factsHeading?: string;
  facts: string[];
  sections: Array<{
    heading: string;
    body: string[];
  }>;
  tables: InsightTable[];
  links: Array<{
    href: string;
    label: string;
    text: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
};

export const INSIGHT_ARTICLES: InsightArticle[] = [
  {
    slug: "multinational-stopped-trials-biological-failure-signals",
    title: "Multinational stopped trials show more biological failure signals—but the pattern is not causal proof",
    metaDescription:
      "A stratified analysis of country count and biological failure signals in stopped clinical trials, with phase and disease-area checks.",
    eyebrow: "Scale, phase and geography",
    dek:
      "The raw gradient is striking. It also needs restraint: country count is a marker of trial scale and portfolio structure, not an explanation for why a study stopped.",
    datePublished: "2026-10-08",
    readingTime: "9 min read",
    keyword: "multinational clinical trial failure",
    factsHeading: "The country-count gradient",
    facts: [],
    sections: [],
    tables: [],
    links: [],
    faqs: [],
  },
  {
    slug: "stopped-clinical-trial-can-meet-primary-endpoint",
    title: "A stopped clinical trial can still meet its primary endpoint",
    metaDescription:
      "Some stopped clinical trials met their posted primary endpoint. See why endpoint results and trial stop reasons must be read as separate evidence.",
    eyebrow: "Results versus stop reasons",
    dek:
      "A stopped status describes what happened to the study. A posted primary result describes what happened in an analysis. Our data shows why those two answers should never be collapsed into one label.",
    datePublished: "2026-10-08",
    readingTime: "8 min read",
    keyword: "stopped clinical trial met primary endpoint",
    factsHeading: "Two questions, two kinds of evidence",
    facts: [],
    sections: [],
    tables: [],
    links: [],
    faqs: [],
  },
  {
    slug: "business-reasons-clinical-trial-termination",
    title: "When a clinical trial stops for business reasons, the drug has not necessarily failed",
    metaDescription:
      "A data-led analysis of business-strategy clinical trial stops and why a terminated program is not automatically evidence of failed efficacy or safety.",
    eyebrow: "Strategy versus evidence",
    dek:
      "A program can close because priorities, portfolios, ownership, or commercial plans changed. Those decisions matter, but they answer a different question from whether the drug worked.",
    datePublished: "2026-09-22",
    readingTime: "8 min read",
    keyword: "clinical trial terminated for business reasons",
    factsHeading: "The strategy/evidence split",
    facts: [],
    sections: [
      {
        heading: "The near-miss that changes the interpretation",
        body: [
          "One of the most consequential comparisons in the database is also one of the easiest to miss. Business-strategy stops are almost as numerous as all records carrying a biological failure outcome. Put those groups into one generic 'failed trial' total and the result ceases to describe either science or strategy accurately.",
          "The distinction is not semantic housekeeping. A futility finding says something unfavorable about benefit under the studied conditions. A safety stop says something about risk or tolerability. A portfolio decision says that an organization changed what it chose to pursue. All three can end a trial, but only the first two directly support a biological failure signal.",
        ],
      },
      {
        heading: "Business strategy must be stated, not guessed",
        body: [
          "Classification V2 uses the business-strategy category when the source language gives an affirmative strategic or commercial reason: portfolio reprioritization, a business decision, discontinuation of development, duplication by other work, or a comparable program-level choice. It does not convert a bare phrase such as 'Sponsor decision' into strategy. Those actor-only statements sit in the separate decision-without-stated-cause category.",
          "That boundary is important. It lets the database retain useful strategic evidence without pretending to know the rationale behind every corporate action. It also prevents missing explanations from quietly becoming non-biological explanations.",
        ],
      },
      {
        heading: "Terminated still does not tell you why",
        body: [
          "Most business-strategy records are marked Terminated, so a status-only search can make them look deceptively similar to trials stopped for futility or toxicity. The stop statement is what changes the meaning. In some records, the sponsor even states that the decision was not driven by safety or efficacy concerns.",
          "That negative wording should also be handled carefully. 'Not due to safety or efficacy' supports a non-biological classification for the stated stop. It does not prove that the drug was effective, safe in every setting, or commercially attractive. Absence of a cited biological reason is not positive clinical evidence.",
        ],
      },
      {
        heading: "Why oncology appears so often",
        body: [
          "Oncology supplies the largest disease-area slice of business-strategy stops in the current snapshot. That is useful for portfolio research, but it is not a sponsor scorecard and it is not a failure rate. Oncology is also the largest disease area in the database overall, and a single record may sit inside a much larger development program that is not represented by the stopped study alone.",
          "The defensible use is narrower: identify where the registry explicitly records a strategic stop, read the linked source language, and then add external program context before drawing conclusions about an asset or company.",
        ],
      },
      {
        heading: "How I would use this signal",
        body: [
          "For scientific screening, exclude business-strategy records from the biological-failure denominator unless another explicit biological reason is also present. For competitive-intelligence work, keep them: a strategic stop can be highly relevant to portfolio direction even when it says nothing adverse about the mechanism.",
          "The practical rule is simple. Use status to find stopped studies, the classified cause to decide what kind of event occurred, and the original registry statement to verify the claim. None of those fields can safely substitute for the other two.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/trial/NCT05276830-an-efficacy-and-safety-study-of-bxcl501-for-the-treatment-of-agitation-associate",
        label: "BXCL501: an explicit business reason",
        text: "The registry says the stop was for business reasons and not due to safety or efficacy concerns.",
      },
      {
        href: "/trial/NCT04261712-a-study-to-evaluate-the-long-term-safety-and-efficacy-of-paltusotine-for-the-tre",
        label: "Paltusotine: benefits and risks explicitly separated",
        text: "This record distinguishes the business decision from changes in the treatment's benefits or risks.",
      },
      {
        href: "/methods",
        label: "Review the classification boundary",
        text: "See how V2 separates stated business strategy from decisions that provide no underlying cause.",
      },
    ],
    faqs: [
      {
        question: "Does a business decision mean a clinical trial failed?",
        answer:
          "No. It means the source states a strategic or commercial reason for stopping. It does not by itself establish failed efficacy, unacceptable safety, or successful treatment.",
      },
      {
        question: "Is every sponsor decision classified as business strategy?",
        answer:
          "No. A statement such as 'Sponsor decision' gives no underlying cause and is kept in decision-without-stated-cause. Strategy must be supported by the source wording.",
      },
      {
        question: "Can business-strategy records still be useful?",
        answer:
          "Yes. They can inform portfolio and competitive research, provided the registry statement is verified and the record is not misrepresented as biological evidence.",
      },
    ],
  },
  {
    slug: "withdrawn-before-enrollment-not-recruitment-failure",
    title: "No participants enrolled: why a withdrawn trial may never have started",
    metaDescription:
      "What stopped clinical trial data shows about studies withdrawn before enrollment, and why never initiated is different from recruitment failure.",
    eyebrow: "Before the first participant",
    dek:
      "A study with zero participants did not generate a negative treatment result. It may not even have tested whether recruitment was possible. That boundary matters when withdrawn records are used as evidence.",
    datePublished: "2026-09-22",
    readingTime: "7 min read",
    keyword: "clinical trial withdrawn before enrollment",
    factsHeading: "What zero enrollment changes",
    facts: [],
    sections: [
      {
        heading: "There are two very different kinds of zero",
        body: [
          "A trial can end with too few participants because recruitment began and failed to reach the required sample. It can also close before the first participant was enrolled. Both records may contain the words 'no participants enrolled', but they do not describe the same event.",
          "The first is evidence about execution: sites opened, recruitment was attempted, and accrual was insufficient or too slow. The second is a lifecycle boundary. It tells us the study did not get under way, but often says little about whether eligible patients could have been recruited under an active protocol.",
        ],
      },
      {
        heading: "Withdrawn is the expected status, not the explanation",
        body: [
          "Nearly every not-initiated record in the current dataset is marked Withdrawn. That alignment makes sense because ClinicalTrials.gov uses withdrawn for studies stopped before enrolling the first participant. But the status still does not supply the underlying reason.",
          "Some source statements mention an administrative constraint, a sponsor choice, a redesign, or a regulatory issue. Others say only that the study never started. Classification V2 preserves not initiated as a non-failure transition instead of translating the absence of participants into failed recruitment or failed biology.",
        ],
      },
      {
        heading: "Recruitment failure requires evidence of recruitment",
        body: [
          "The recruitment category is much larger and usually reflects language such as slow enrollment, poor accrual, too few eligible participants, or inability to recruit across active sites. Those statements support an operational constraint. They still do not establish that the intervention lacked efficacy or caused harm.",
          "The difference is especially important for denominator design. Counting every withdrawn study with zero enrollment as a recruitment failure inflates operational failure estimates. Counting it as a drug failure is more misleading still, because no participant received the intervention under that record.",
        ],
      },
      {
        heading: "The phase label can survive even when the trial did not begin",
        body: [
          "Not-initiated records still carry planned phase labels. A withdrawn Phase II or Phase III record therefore describes the intended design stage, not completed clinical exposure at that stage. The phase remains useful for finding the protocol, but it should not be read as evidence generated by an executed Phase II or Phase III study.",
          "This is a broader lesson for registry analysis: planned attributes and observed events live in the same row. Good analysis keeps them separate. Phase, intervention, and target population describe the intended study; enrollment and stop text describe what actually happened.",
        ],
      },
      {
        heading: "What the record can and cannot support",
        body: [
          "A not-initiated record supports a modest conclusion: the registered study stopped before enrollment. If the source gives an additional cause, that wording may support a second, more specific interpretation after manual review. Without it, the responsible answer is to stop at the lifecycle fact.",
          "For evidence reviews, exclude these records from treatment-outcome counts. For feasibility research, keep them visible but separate from active recruitment failures. And for every individual case, open the registry link before deciding whether the short stop statement is sufficient for the claim you want to make.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/trial/NCT05313386-study-of-bxcl501-in-agitation-associated-with-delirium-in-icu-patients",
        label: "A study stopped before its first participant",
        text: "NCT05313386 states the timing clearly without claiming a biological or recruitment result.",
      },
      {
        href: "/trial/NCT04794348-clinical-trial-assessing-non-inferiority-of-freeze-dried-plasma-to-fresh-frozen-",
        label: "A never-started study moving toward redesign",
        text: "NCT04794348 links non-initiation to plans for a new design and FDA alignment.",
      },
      {
        href: "/trial/NCT06162663-double-blind-randomized-controlled-trial-comparing-suvorexant-20-mg-to-placebo-f",
        label: "Contrast with actual insufficient accrual",
        text: "NCT06162663 reports that enrollment occurred but was inadequate for the planned statistical analysis.",
      },
      {
        href: "/insights/enrollment-failure-clinical-trials",
        label: "Read the broader recruitment analysis",
        text: "See why enrollment problems are operational evidence rather than automatic drug-failure evidence.",
      },
    ],
    faqs: [
      {
        question: "Does withdrawn mean that a clinical trial recruited no participants?",
        answer:
          "Often, but not every withdrawn record should be interpreted from status alone. The stop statement should confirm whether enrollment never began and whether any underlying reason is stated.",
      },
      {
        question: "Is no enrollment the same as recruitment failure?",
        answer:
          "No. Recruitment failure requires evidence that recruitment was attempted and was too slow or insufficient. A never-initiated study may have closed before that question was tested.",
      },
      {
        question: "Can a never-started Phase III study count as a Phase III drug failure?",
        answer:
          "No. The phase describes the planned protocol. If no participant enrolled, the record did not generate a Phase III treatment outcome.",
      },
    ],
  },
  {
    slug: "classification-v2-clinical-trial-stop-reasons",
    title: "Classification V2: a clearer map of why clinical trials stop",
    metaDescription:
      "How Clinical Trial Failures V2 adds a more granular stop-reason taxonomy, separates outcomes from causes, and strengthens the focus on biological signals.",
    eyebrow: "Classification V2",
    dek:
      "V2 makes the database more useful for serious screening: more cause categories, a separate outcome layer, clearer review states, and a stronger distinction between biological failure signals and everything else.",
    datePublished: "2026-08-25",
    readingTime: "7 min read",
    keyword: "clinical trial failure classification",
    facts: [],
    sections: [
      {
        heading: "A more precise classification layer",
        body: [
          "Clinical trial stop reasons are rarely written in a standard format. One registry record may describe futility, another may mention portfolio reprioritization, and another may say only that the sponsor made a decision. Classification V2 turns that uneven source language into a clearer analytical structure while keeping the original statement available for verification.",
          "The main improvement is not a single new label. It is the separation of two questions: what kind of outcome does the record support, and what primary reason is actually stated? That distinction reduces the temptation to treat every stopped study as a biological failure.",
        ],
      },
      {
        heading: "A stronger focus on biological evidence",
        body: [
          "V2 keeps biological failure signals deliberately narrow. Explicit efficacy or futility language, safety or toxicity language, and unfavorable biological evidence that cannot be split cleanly between the two can support a biological outcome. A business decision, recruitment problem, funding constraint, or regulatory action remains separate even when it ends a development program.",
          "The added biological-unspecified category matters. A source can support an unfavorable biological conclusion without saying whether efficacy or safety was decisive. V2 preserves that evidence without inventing a more specific explanation than the registry provides.",
        ],
      },
      {
        heading: "More categories for non-biological stops",
        body: [
          "The expanded taxonomy distinguishes recruitment, business strategy, funding, staffing and resources, protocol feasibility, supply and manufacturing, regulatory causes, external disruption, support withdrawal, and other operational reasons. Planned milestones and replacement transitions are also kept apart from failures.",
          "This makes the database more useful in both directions. Analysts can isolate likely biological signals more confidently, while operational and strategy teams can study the non-biological reasons that account for much of the stopped-trial universe.",
        ],
      },
      {
        heading: "Decision-only language is not treated as a cause",
        body: [
          "Statements such as 'Sponsor decision' identify an actor and an action, but not the underlying reason. V2 records these as cause-not-stated rather than converting them into biological, operational, or strategic claims. An explicit corporate reprioritization can support business strategy; a bare corporate decision cannot.",
          "The same principle applies to program-level actions. If the source says a program was discontinued but gives no causal explanation, the database can preserve the action without pretending to know why it happened.",
        ],
      },
      {
        heading: "Review-gated is a deliberate result",
        body: [
          "Some records contain no stop reason, only a status, a fragment, or language too ambiguous for a defensible causal label. Those records remain review-gated. This is a feature of the model: the database should show the boundary of its evidence instead of filling it with false precision.",
          "New and changed records pass through the same rule set during future ingests. Repeated reviewed language can be reused consistently, while novel or insufficient text returns to the review inventory. The result is a classification system that can improve without silently changing the meaning of its categories.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/methods",
        label: "How classification works",
        text: "Review the evidence rules, safeguards, limitations, and update process behind the classifications.",
      },
      {
        href: "/explore?bio=true",
        label: "Explore biological failure signals",
        text: "Open the database with the likely biological-signal filter applied.",
      },
      {
        href: "/about",
        label: "About and data trust",
        text: "See the source, scope, intended use, and verification expectations for the database.",
      },
    ],
    faqs: [
      {
        question: "Does Classification V2 label every stopped trial as a failure?",
        answer:
          "No. V2 separates biological failures, non-biological stops, mixed causes, non-failure transitions, cause-not-stated records, and review-gated unknowns.",
      },
      {
        question: "What counts as a biological failure signal in V2?",
        answer:
          "The source must support efficacy or futility, safety or toxicity, or an unfavorable biological conclusion that cannot responsibly be split between efficacy and safety.",
      },
      {
        question: "Will future ingests use the V2 taxonomy?",
        answer:
          "Yes. The classification rules and review safeguards run as part of the publication pipeline for new and changed records.",
      },
    ],
  },
  {
    slug: "most-stopped-clinical-trials-are-not-biological-failures",
    title: "Most stopped clinical trials are not biological failures",
    metaDescription:
      "A V2 analysis of stopped clinical trials showing the relative shares of biological failure, non-biological causes, mixed causes, transitions, and unknown records.",
    eyebrow: "V2 database analysis",
    dek:
      "The largest lesson from the current dataset is not how often drugs fail. It is how much information is lost when every terminated, withdrawn, or suspended study is placed in the same bucket.",
    datePublished: "2026-08-25",
    readingTime: "8 min read",
    keyword: "stopped clinical trials biological failure",
    facts: [],
    sections: [
      {
        heading: "Stopped status is the beginning of the analysis",
        body: [
          "ClinicalTrials.gov status tells us that a study was terminated, withdrawn, or suspended. It does not, by itself, tell us whether the intervention lacked efficacy, caused a safety problem, ran into recruitment constraints, lost funding, or was closed for a portfolio decision.",
          "The V2 outcome layer makes that distinction visible. It asks what the published stop language supports before the record is counted as a biological failure signal. This turns the database from a list of stopped studies into a more useful screening map.",
        ],
      },
      {
        heading: "Biological signals are important, but they are the minority",
        body: [
          "The biological group combines three evidence patterns: efficacy or futility, safety, and biological evidence that is unfavorable but not specific enough to separate efficacy from safety. These are the records most relevant to a biological-failure screen, but they should still be checked against the primary registry statement.",
          "The relative size of this group is a useful warning against casual language. A database of stopped trials is not the same thing as a database in which every drug failed. Biological evidence is one important slice of a much larger operational, strategic, and administrative landscape.",
        ],
      },
      {
        heading: "Recruitment is the largest named primary reason",
        body: [
          "Recruitment and accrual problems appear more often than any other named primary cause in the current classification. That has a very different interpretation from a failed endpoint. A study can be scientifically plausible and still become infeasible because too few eligible participants enroll or because enrollment is too slow.",
          "Business strategy and funding are also large categories. These records can be highly relevant to portfolio analysis, but they should not be used as evidence that the underlying mechanism or treatment was disproven.",
        ],
      },
      {
        heading: "Cause not stated is not a hidden biological failure",
        body: [
          "A meaningful share of records reports a decision or program action without the reason behind it. These records are informative about what happened, but not about why. Treating them as operational or biological would create confidence that the source does not support.",
          "Unknown and review-gated records require the same restraint. Some have missing stop text; others contain language that is too vague or novel for a reliable rule. They remain visible so users can distinguish missing evidence from a classified negative result.",
        ],
      },
      {
        heading: "How I would use the result",
        body: [
          "For a biological screen, start with the V2 biological outcome and then separate efficacy, safety, and unspecified biological evidence. Open the linked NCT record before using a classification in a research report, investment decision, or scientific conclusion.",
          "For operational or portfolio research, work from the primary-reason categories instead. Recruitment, staffing, protocol feasibility, supply, funding, regulatory action, and business strategy answer different questions and should not be collapsed into one generic failure rate.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/explore",
        label: "Explore the stopped-trial database",
        text: "Search the underlying records and combine status, phase, disease area, sponsor, and reason filters.",
      },
      {
        href: "/insights/classification-v2-clinical-trial-stop-reasons",
        label: "Read about Classification V2",
        text: "See how the outcome and primary-reason layers produce a more precise map of stopped studies.",
      },
      {
        href: "/insights/terminated-clinical-trials-are-not-always-failures",
        label: "Terminated does not always mean failed",
        text: "Continue with the practical distinction between registry status and scientific failure.",
      },
    ],
    faqs: [
      {
        question: "Are most stopped clinical trials biological failures?",
        answer:
          "No. In the current V2 dataset, non-biological stops are the largest outcome group. Biological failure signals are a smaller, specifically supported subset.",
      },
      {
        question: "Why is recruitment separate from biological failure?",
        answer:
          "Recruitment describes whether a study can enroll enough participants, not whether the intervention is efficacious or safe. It can stop an otherwise scientifically plausible trial.",
      },
      {
        question: "Do unknown records count as non-biological?",
        answer:
          "No. Unknown means the available source text does not support a reliable outcome or cause. It is kept separate rather than treated as evidence for either side.",
      },
    ],
  },
  {
    slug: "could-clinical-trial-betting-hedge-risk-for-patients",
    title: "Could clinical trial betting act as insurance for patients?",
    metaDescription:
      "A critical review of the argument that Kalshi or other clinical trial prediction markets could let patients hedge the risk that an experimental drug fails.",
    eyebrow: "Prediction markets and patients",
    dek:
      "The patient-hedge argument is more thoughtful than ordinary speculation: if the drug works, the participant may benefit; if it fails, a market payout could help the family. But that does not make a bet equivalent to insurance.",
    datePublished: "2026-08-20",
    readingTime: "8 min read",
    keyword: "clinical trial betting for patients",
    facts: [],
    sections: [
      {
        heading: "The strongest argument for these markets",
        body: [
          "Most criticism of clinical trial prediction markets begins with the obvious concern: money tied to a trial result can create incentives around an experiment whose first obligation is to patients and reliable evidence. That concern is valid. Still, there is a more sympathetic argument worth taking seriously.",
          "A participant may enter a trial hoping that an experimental drug extends life or improves health. If the trial succeeds, the hoped-for benefit is medical. If it fails, a position paying out on failure could leave money for the participant or family. Framed this way, the contract looks less like entertainment and more like an event-specific hedge.",
        ],
      },
      {
        heading: "Why the insurance analogy feels plausible",
        body: [
          "Insurance transfers a defined financial risk. The proposed hedge tries to do something similar: offset disappointment from one outcome with a payout from the opposite outcome. It also recognizes a real asymmetry. Trial participants accept visits, uncertainty, inconvenience, and sometimes substantial physical burdens, while the broader system captures much of the scientific and commercial value.",
          "The argument therefore points to a legitimate problem. Participants and families can bear costs that standard reimbursement does not fully address. The difficult question is whether a tradable prediction contract is a defensible way to correct that imbalance.",
        ],
      },
      {
        heading: "A prediction-market position is not insurance",
        body: [
          "The analogy breaks down quickly. Insurance has defined coverage, regulated disclosures, underwriting rules, and a payout tied to the policyholder's loss. A prediction-market contract pays according to narrowly written resolution criteria. A Phase III trial could meet its primary endpoint while one participant receives no benefit. It could miss the endpoint while that participant improves. The market event and the patient's outcome are not the same thing.",
          "The hedge is also not guaranteed. The participant must choose a contract, position size, timing, and price, and can lose the stake. A family facing serious illness should not need trading skill, spare capital, or tolerance for gambling risk to receive support for contributing to research.",
        ],
      },
      {
        heading: "The current platforms do not offer this patient hedge",
        body: [
          "Kalshi and AppliedXL launched a limited biopharma pilot in July 2026 covering selected clinical trial outcomes and FDA decisions. The initial design focuses on clearly defined late-stage events and public resolution sources. Importantly, Kalshi says trial participants are barred from trading, and clinical-trial markets are listed only after enrollment has closed.",
          "Polymarket has also carried biopharma-related contracts. Endpoint Arena entered the field with trial-focused markets but, at the time of reporting, used paper trading rather than real money. These are not patient insurance products. They are forecasting or trading venues with different rules, access models, and regulatory positions.",
        ],
      },
      {
        heading: "The integrity problem remains",
        body: [
          "Allowing enrolled participants to take positions would create the very conflict the hedge is meant to soften. Trial behavior can affect adherence, reporting, retention, endpoint assessment, and data quality. Even when one person cannot change the result, a financial interest in failure or success complicates informed consent and public trust.",
          "The risk is not limited to deliberate manipulation. Market prices could influence participant expectations, investigator behavior, enrollment, or the interpretation of ambiguous outcomes. A price is a view produced by traders. It is not clinical evidence, a prognosis, or a substitute for the protocol and source data.",
        ],
      },
      {
        heading: "The better answer is direct participant protection",
        body: [
          "I do not dismiss the hedge argument as crass. It identifies something important: participants should not carry research burdens while being left financially exposed. I simply do not think a wager is the right mechanism.",
          "A better system would provide transparent compensation for time and inconvenience, travel and wage support, treatment for research-related injury, post-trial access where appropriate, and clearly funded family support. Those benefits can be guaranteed without asking a patient to bet against the study they joined. Prediction markets may produce an additional public signal, but they should remain separate from patient protection and clinical decision-making.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "https://www.appliedxl.com/research/appliedxl-kalshi-partnership",
        label: "Read the Kalshi and AppliedXL pilot description",
        text: "Review the official description of market selection, evidence sources, resolution, and responsibilities.",
      },
      {
        href: "https://www.appliedxl.com/research/biopharma-public-probability",
        label: "Read Biopharma's Public Probability",
        text: "See the partnership's own discussion of possible uses, limitations, safeguards, and ethical risks.",
      },
      {
        href: "/insights/why-i-would-not-bet-on-clinical-trial-outcomes",
        label: "Why I would not bet on trial outcomes",
        text: "Read the broader argument for keeping prediction-market prices separate from clinical evidence.",
      },
    ],
    faqs: [
      {
        question: "Can clinical trial participants trade on Kalshi's trial markets?",
        answer:
          "Kalshi has said participants in the relevant trials are barred from trading in its initial biopharma markets. The initial trial contracts are also listed after enrollment has closed.",
      },
      {
        question: "Is betting on trial failure the same as buying insurance?",
        answer:
          "No. A prediction contract settles on defined market criteria rather than the individual patient's medical or financial loss, and the trader can lose the money used to take the position.",
      },
      {
        question: "Could prediction markets still provide useful information?",
        answer:
          "They may provide a market-implied probability for a narrowly defined event, but its quality depends on participation, liquidity, information, contract design, and trader independence. It is not clinical evidence or medical advice.",
      },
    ],
  },
  {
    slug: "unknown-clinical-trial-stop-reasons-are-a-data-signal",
    title: "Unknown clinical trial stop reasons are a result, not missing analysis",
    metaDescription:
      "A data-backed analysis of other and unknown clinical trial stop reasons, and why uncertain registry language should not be converted into a false failure claim.",
    eyebrow: "Limits of stop-reason data",
    dek:
      "A large share of stopped trial records does not support a confident efficacy, safety, operational, or regulatory explanation. Preserving that uncertainty is part of reliable analysis.",
    datePublished: "2026-08-20",
    readingTime: "7 min read",
    keyword: "unknown clinical trial stop reasons",
    facts: [],
    sections: [
      {
        heading: "The largest classification is uncertainty",
        body: [
          "A stopped clinical trial looks like a simple event until the reason field is opened. Some records contain a clear explanation: insufficient efficacy, a safety concern, slow recruitment, funding, or a strategic decision. Many do not.",
          "Other/unknown is the largest stop-reason bucket in the current database. That is not an invitation to guess. It is a measurable result about the limits of public registry language and the confidence that can reasonably be attached to it.",
        ],
      },
      {
        heading: "Why records remain unknown",
        body: [
          "Registry explanations can be absent, generic, circular, or too short to separate scientific from non-scientific causes. A phrase such as sponsor decision or study stopped may be factually true without explaining whether efficacy, safety, enrollment, strategy, or another issue drove the decision.",
          "The public record can also lag behind company announcements or omit details available in publications, conference presentations, regulatory documents, or investor disclosures. The compact source field should not be made more precise than the evidence allows.",
        ],
      },
      {
        heading: "Unknown does not mean harmless",
        body: [
          "An unknown classification does not prove that the stop was administrative. Some of these records may involve efficacy or safety issues that are not described clearly enough in the registry. Others may be routine operational decisions. The category contains uncertainty, not reassurance.",
          "That is why it should remain searchable and visible. Hiding unknowns would make the classified groups look more complete than they are and could produce false confidence in disease-area, sponsor, or phase comparisons.",
        ],
      },
      {
        heading: "The status mix shows why wording matters",
        body: [
          "Other/unknown records appear across terminated, withdrawn, and suspended statuses. Status does not resolve the ambiguity. A terminated record can have an unclear reason, just as a withdrawn record can contain a specific safety or efficacy explanation.",
          "The correct analytical sequence is status first, reason second, source verification third. Reversing that sequence encourages the common mistake of treating every terminated trial as a failed drug.",
        ],
      },
      {
        heading: "How I would investigate an unknown record",
        body: [
          "I would begin with the original ClinicalTrials.gov page and update history. Next I would search the exact NCT ID in sponsor releases, publications, regulatory material, conference abstracts, and archived program descriptions. Dates matter because a registry update may follow the underlying decision by weeks or months.",
          "If the evidence still does not support a defensible reason, I would leave the record unknown. A transparent limitation is more useful than a confident label manufactured from weak text.",
        ],
      },
      {
        heading: "Why this improves the database",
        body: [
          "A high-quality database is not the one that assigns the most labels. It is the one that distinguishes evidence from inference and inference from absence. Preserving other/unknown protects the more specific efficacy, safety, operational, and regulatory categories from contamination.",
          "It also identifies where better disclosure would create the most value. The unknown bucket is therefore both a limitation and a research agenda: it shows where the public evidence is not yet strong enough for the conclusion people often want to draw.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/explore?bucket=OTHER%2FUNKNOWN",
        label: "Explore other and unknown records",
        text: "Review stopped records where the available source language does not support a more specific classification.",
      },
      {
        href: "/clinical-trial-stop-reasons",
        label: "Compare all stop-reason categories",
        text: "See how efficacy, safety, operational, regulatory, and unclear reasons differ.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "Review the conservative rules used to preserve uncertainty in the source data.",
      },
    ],
    faqs: [
      {
        question: "Why are so many clinical trial stop reasons unknown?",
        answer:
          "Many registry records contain no explanation or language that is too general to separate scientific, operational, strategic, or regulatory causes confidently.",
      },
      {
        question: "Does other or unknown mean the drug did not fail?",
        answer:
          "No. It means the available source language does not support a confident classification. The underlying reason may be scientific or non-scientific and requires additional evidence.",
      },
      {
        question: "Should unknown records be excluded from analysis?",
        answer:
          "Usually not. Excluding them can exaggerate the apparent completeness of classified results. They should be reported transparently and separated from more specific categories.",
      },
    ],
  },
  {
    slug: "regulatory-clinical-trial-stops-are-not-safety-failures",
    title: "Regulatory clinical trial stops are rare and not the same as safety failures",
    metaDescription:
      "A data-backed review of regulatory clinical trial stops by status, phase, and disease area, and why a regulatory stop should not automatically be called a safety failure.",
    eyebrow: "Regulatory stop signals",
    dek:
      "Regulatory classifications form a very small slice of stopped trial records. They deserve direct source review rather than being folded into safety or biological failure counts.",
    datePublished: "2026-08-20",
    readingTime: "7 min read",
    keyword: "regulatory clinical trial stops",
    facts: [],
    sections: [
      {
        heading: "A small category with outsized ambiguity",
        body: [
          "Regulatory language attracts attention because it can suggest a clinical hold, an authority request, an approval issue, or another formal intervention. But regulatory is one of the smallest reason categories in the stopped-trial database.",
          "That small count makes careful interpretation more important, not less. A regulatory action can arise from safety, manufacturing, documentation, protocol, compliance, or information requirements. The label identifies the decision context; it does not by itself establish biological failure.",
        ],
      },
      {
        heading: "Regulatory and safety answer different questions",
        body: [
          "Safety describes the substantive concern identified in the stop language: adverse events, toxicity, tolerability, or benefit-risk. Regulatory describes the role of an authority or formal regulatory process in the pause or stop. A record can involve both ideas, but a single analytical bucket should reflect the strongest explicit evidence available.",
          "Collapsing every regulatory stop into safety would inflate safety counts and erase cases driven by nonclinical, quality, procedural, or documentation issues. It would also imply more certainty about causation than the registry text may provide.",
        ],
      },
      {
        heading: "The status distribution is unusually balanced",
        body: [
          "Unlike many other stop-reason categories, regulatory records are distributed relatively evenly between terminated and withdrawn studies, with a smaller suspended group. This is a reminder that regulatory language does not map neatly to one trial status.",
          "A withdrawn study may never begin enrollment, a suspended study may potentially resume, and a terminated study has stopped early. The regulatory context and the study status need to be read together.",
        ],
      },
      {
        heading: "Phase II is the largest phase slice",
        body: [
          "Phase II contributes the largest phase group among regulatory-classified records, followed by Phase I and Phase III. Those counts do not establish that one phase is more exposed to regulatory intervention because the database does not contain the denominator of all trials in each phase.",
          "They are useful for triage. A Phase I regulatory stop may direct attention toward dose, early safety, manufacturing, or protocol issues. A later-stage stop may require review of endpoint, benefit-risk, authority correspondence, or program-level decisions.",
        ],
      },
      {
        heading: "What to verify in the primary sources",
        body: [
          "I would look for the exact authority action, the date it occurred, whether the hold was full or partial, the sponsor's stated cause, and whether the action was later lifted. ClinicalTrials.gov may not contain the entire regulatory history.",
          "FDA notices, sponsor filings, trial updates, regulator databases, and subsequent protocol changes can materially change the interpretation. If the public record only says regulatory reasons, the analysis should not invent a safety mechanism.",
        ],
      },
      {
        heading: "The responsible conclusion",
        body: [
          "Regulatory stops are important signals for investigation, but weak standalone evidence for a claim that the drug failed. Their low frequency also means that isolated records or sponsor counts can be misleading without context.",
          "The right wording names the registered status and regulatory classification, then describes the documented reason with its source. Safety, efficacy, and biological failure should be added only when the underlying evidence supports them.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/explore?bucket=REGULATORY",
        label: "Explore regulatory stop signals",
        text: "Open regulatory-classified records and verify the source language behind each stop.",
      },
      {
        href: "/explore?bucket=SAFETY",
        label: "Compare safety stop signals",
        text: "Review the separate category for adverse-event, toxicity, tolerability, and benefit-risk language.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "See how regulatory and safety language are separated in the database.",
      },
    ],
    faqs: [
      {
        question: "Is a regulatory clinical trial stop automatically a safety failure?",
        answer:
          "No. Regulatory actions can involve safety, but they may also involve manufacturing, protocol, documentation, compliance, or other requirements. The primary source must establish the reason.",
      },
      {
        question: "Are regulatory stops common in the database?",
        answer:
          "No. Regulatory-classified records form a very small share of the current stopped-trial dataset.",
      },
      {
        question: "Can a regulatory hold be lifted?",
        answer:
          "Yes. Some regulatory pauses can be resolved. Researchers should verify the current trial status and subsequent authority or sponsor updates rather than relying on an older snapshot.",
      },
    ],
  },
  {
    slug: "suspended-clinical-trials-rarely-mean-drug-failure",
    title: "Suspended clinical trials rarely mean the drug has failed",
    metaDescription:
      "A data-backed analysis of suspended clinical trials, their stop reasons, and why suspended status alone is weak evidence of drug failure.",
    eyebrow: "Suspended trial analysis",
    dek:
      "Suspended trials are often treated as hidden failures. The current data tells a more cautious story: operational and unclear reasons dominate this status.",
    datePublished: "2026-08-15",
    readingTime: "7 min read",
    keyword: "suspended clinical trials",
    facts: [],
    sections: [
      {
        heading: "The result is more mundane than the label sounds",
        body: [
          "Suspended is a dramatic word. It can make a trial look as if a safety problem or failed biological hypothesis has already been established. In practice, the status only tells us that the study has been halted and may resume. The reason field is what determines whether the record points toward the intervention, the trial operation, or an unresolved situation.",
          "In the current stopped-trial database, the large majority of suspended records do not carry efficacy/futility or safety classifications. Most are operational or remain other/unknown. That makes suspended status a useful alert, but a poor conclusion on its own.",
        ],
      },
      {
        heading: "Why a suspension can happen",
        body: [
          "A study can be suspended because of site, supply, staffing, funding, regulatory, recruitment, or administrative problems. Public-health disruptions and temporary pauses can also appear in the source text. None of these explanations proves that the intervention failed to work or created an unacceptable risk.",
          "There are also genuine biological signals in the suspended slice. Safety reviews, adverse events, emerging futility, or insufficient benefit can lead to a halt while investigators or regulators evaluate what happened. Those records deserve immediate attention, but they should be isolated from the much larger operational and unclear group.",
        ],
      },
      {
        heading: "Safety and efficacy signals are evenly split",
        body: [
          "Within the small biological-signal subset, safety and efficacy/futility appear in equal numbers in the current dataset. That balance is different from the full stopped-trial database, where efficacy/futility is the larger biological category.",
          "The distinction matters. A safety suspension raises questions about adverse events, dose, exposure, monitoring, and benefit-risk. An efficacy or futility suspension raises questions about treatment effect, endpoint assumptions, interim evidence, and whether continuing the study remains justified.",
        ],
      },
      {
        heading: "The unknown group needs restraint",
        body: [
          "Other/unknown is the largest reason bucket among suspended records. It contains cases where the registry language is too limited or too generic for a defensible classification. That is not missing work that should be filled with an assumption. It is uncertainty in the source data that should remain visible.",
          "When I see a suspended study in that bucket, I would open the original ClinicalTrials.gov record first. I would then check the update history, sponsor disclosures, regulator notices, publications, and whether the study later resumed, terminated, or changed status.",
        ],
      },
      {
        heading: "How I would use suspended records",
        body: [
          "For screening, suspended trials are useful because they identify programs where something interrupted execution. I would filter them by reason category, then compare phase, disease area, sponsor context, and the exact source language. A safety-tagged Phase I suspension is a different research problem from an operational Phase III pause.",
          "For reporting, I would never write that a drug failed simply because one study is suspended. A more accurate statement names the status, quotes or paraphrases the registered reason, and makes clear whether the classification is biological, operational, regulatory, or uncertain.",
        ],
      },
      {
        heading: "What this analysis does not measure",
        body: [
          "This is an analysis of suspended records inside a stopped-trial database. It does not measure how often all clinical trials become suspended, how often suspended studies restart, or the probability that a suspended program eventually succeeds or fails.",
          "The value is narrower and practical: it shows why status and reason must be separated. Suspended tells us where to look. The source explanation tells us what, if anything, can responsibly be inferred.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/explore?status=SUSPENDED",
        label: "Explore suspended trials",
        text: "Open the current suspended-trial records and inspect their source-linked stop reasons.",
      },
      {
        href: "/explore?status=SUSPENDED&bucket=SAFETY",
        label: "Review suspended safety signals",
        text: "Narrow the database to suspended records classified from safety-related language.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "See how status, source language, and analytical reason buckets are kept separate.",
      },
    ],
    faqs: [
      {
        question: "Does a suspended clinical trial mean the drug failed?",
        answer:
          "No. Suspended status means the study has been halted and may resume. The registered reason must be reviewed before interpreting the suspension as biological, operational, regulatory, or unclear.",
      },
      {
        question: "Are suspended trials usually stopped for safety?",
        answer:
          "Not in this dataset. Operational and other or unknown explanations are much more common than safety classifications among suspended records.",
      },
      {
        question: "Can a suspended clinical trial restart?",
        answer:
          "Yes. Suspension is not necessarily a final status. Researchers should check the current registry record and its update history before relying on an older status snapshot.",
      },
    ],
  },
  {
    slug: "safety-vs-efficacy-clinical-trial-signals-by-disease-area",
    title: "Safety and efficacy failure signals change by disease area",
    metaDescription:
      "A data-backed comparison of safety versus efficacy and futility signals across clinical trial disease areas, using stopped ClinicalTrials.gov records.",
    eyebrow: "Disease-area signal mix",
    dek:
      "A biological failure signal is not the same across therapeutic areas. Some stopped-trial slices lean toward safety; others are dominated by efficacy and futility.",
    datePublished: "2026-08-15",
    readingTime: "8 min read",
    keyword: "clinical trial failure signals by disease area",
    facts: [],
    sections: [
      {
        heading: "The same failure label can hide different problems",
        body: [
          "It is tempting to combine efficacy, futility, and safety into one biological-failure number. That is useful for a first filter, but it hides an important difference. A study that stops because benefit is insufficient is not the same analytical event as a study that stops because toxicity or tolerability changes the benefit-risk balance.",
          "The current database shows that the mix between these signals changes across disease areas. Among areas with at least 200 stopped records, some have more safety than efficacy/futility signals. Others show the reverse by a wide margin.",
        ],
      },
      {
        heading: "Non-oncology hematology leans toward safety",
        body: [
          "Non-oncology hematology has the clearest safety-heavy biological-signal mix in the comparison. This does not establish that hematology trials are generally less safe. The denominator contains stopped records only, and the biological-signal subset is much smaller than the full disease-area slice.",
          "What it does show is that, when a stopped non-oncology hematology record carries a biological classification in this dataset, safety appears more often than efficacy/futility. That makes benefit-risk language and the exact safety evidence especially important starting points for review.",
        ],
      },
      {
        heading: "Neurology points much more strongly toward efficacy",
        body: [
          "Neurology sits on the other side of the comparison. Efficacy and futility signals substantially outnumber safety signals within its stopped records. This can direct the research workflow toward endpoints, treatment effect, futility analyses, patient selection, and whether a program produced enough measurable benefit.",
          "Again, the pattern is descriptive rather than predictive. It does not tell us the probability that a new neurology trial will fail. It tells us what kinds of explanations appear in the stopped neurology records captured by the database.",
        ],
      },
      {
        heading: "Oncology is large and relatively balanced",
        body: [
          "Oncology contributes by far the largest number of biological signals in absolute terms. Its safety and efficacy counts are also much closer together than in neurology or dermatology. That scale makes oncology useful for subgroup analysis, but raw counts should not be confused with a higher underlying risk.",
          "Because oncology contains many phases, modalities, indications, combinations, and sponsor types, the next useful step is usually to narrow the slice. Phase, intervention, condition, and source wording can change the interpretation substantially.",
        ],
      },
      {
        heading: "Why percentages need a minimum denominator",
        body: [
          "Very small categories can produce dramatic percentages from only a few records. To reduce that distortion, this comparison includes disease areas with at least 200 stopped trials. Even then, I would read both the percentage and the underlying counts.",
          "A safety share based on dozens of biological signals is less stable than one based on hundreds. The table therefore reports efficacy and safety counts together instead of presenting a percentage without its denominator.",
        ],
      },
      {
        heading: "How to use the comparison responsibly",
        body: [
          "I would use this analysis to choose the first question, not the final answer. In a safety-heavy area, start with dose, adverse events, monitoring, exposure, and benefit-risk. In an efficacy-heavy area, start with endpoints, effect size, futility rules, population selection, and comparator performance.",
          "Every important conclusion should still return to the individual NCT record and supporting evidence. These classifications organize public source language into a searchable research signal. They do not replace clinical, statistical, or regulatory review.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/explore?area=Hematology%20%28non-onc%29&bucket=SAFETY",
        label: "Explore hematology safety signals",
        text: "Review non-oncology hematology records classified from safety-related stop language.",
      },
      {
        href: "/explore?area=Neurology&bucket=EFFICACY%2FFUTILITY",
        label: "Explore neurology efficacy signals",
        text: "Open neurology records where the source language points toward efficacy or futility.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "Review the definitions, limitations, and source-verification workflow behind the comparison.",
      },
    ],
    faqs: [
      {
        question: "Which disease area has the most safety-heavy biological signal mix?",
        answer:
          "Among disease areas with at least 200 stopped records in the current dataset, non-oncology hematology has the highest safety share within its efficacy/futility and safety signal subset.",
      },
      {
        question: "Does this show which therapeutic area has the highest trial failure rate?",
        answer:
          "No. The database contains stopped trials rather than all initiated trials, so it cannot estimate an overall failure rate by therapeutic area.",
      },
      {
        question: "Why compare counts as well as percentages?",
        answer:
          "Percentages can look unstable when the underlying biological-signal count is small. Counts show the denominator and make differences between disease areas easier to interpret responsibly.",
      },
    ],
  },
  {
    slug: "phase-3-clinical-trial-failure-signals",
    title: "Phase III stopped trials carry the strongest biological-signal share",
    metaDescription:
      "A data-backed analysis of Phase III clinical trial failure signals, including efficacy, futility, safety, operational, and unclear stop reasons.",
    eyebrow: "Phase III failure signals",
    dek:
      "Phase III has the highest biological-signal share among the major trial phases in the stopped-trial database. Most Phase III stops still require more careful interpretation.",
    datePublished: "2026-08-12",
    readingTime: "7 min read",
    keyword: "Phase 3 clinical trial failures",
    facts: [],
    sections: [
      {
        heading: "The headline result",
        body: [
          "Phase III is where clinical development becomes expensive, confirmatory, and much more visible. In the current stopped-trial database, Phase III also has the highest share of records classified as likely biological failure signals among the major development phases.",
          "That result is directionally plausible, but it needs careful wording. It does not mean that Phase III trials have a particular overall failure rate. The denominator here contains stopped trials only. It tells us how stop reasons are distributed inside that stopped-trial slice.",
        ],
      },
      {
        heading: "Why Phase III stop reasons matter",
        body: [
          "A Phase III program usually tests a more mature clinical hypothesis in a larger population, often against a comparator and with endpoints intended to support regulatory decisions. When such a trial stops for futility, insufficient efficacy, a missed endpoint, or safety, the signal can carry more development weight than a vague administrative stop.",
          "That still does not make every Phase III termination a failed drug. Sponsor strategy, recruitment, funding, feasibility, changes in standard of care, and incomplete registry explanations remain part of the dataset. Status and reason must be separated before interpreting the program.",
        ],
      },
      {
        heading: "Efficacy is the larger scientific signal",
        body: [
          "Within stopped Phase III records, efficacy and futility signals appear more often than safety signals. That makes sense for a phase designed to test whether an intervention provides enough benefit in a defined population and endpoint framework.",
          "The difference matters analytically. A futility or missed-efficacy signal raises questions about treatment effect, endpoint assumptions, comparator performance, or patient selection. A safety stop raises a different set of questions around toxicity, exposure, benefit-risk, and monitoring decisions.",
        ],
      },
      {
        heading: "Operational and unclear stops still dominate",
        body: [
          "Even in Phase III, likely biological signals are not the majority of stopped records. Operational and other/unknown reasons together account for most of the slice. That prevents a simple conversion from stopped status to failed intervention.",
          "The other/unknown category is especially important. Registry explanations can be generic, short, or absent. A conservative database should preserve that uncertainty rather than manufacture a scientific explanation the source does not support.",
        ],
      },
      {
        heading: "How I would review a stopped Phase III trial",
        body: [
          "I would begin with the exact why-stopped language and then verify the registered primary endpoint, statistical design, interim-analysis plan, enrollment, and comparator. Next I would look for sponsor disclosures, publications, regulatory documents, and any timing mismatch between the public announcement and registry update.",
          "For comparative work, I would keep disease area and modality constant. Comparing an oncology combination trial with an infectious-disease vaccine or cardiovascular outcomes study can hide more than it reveals. Phase alone is useful, but it is not enough context.",
        ],
      },
      {
        heading: "What this analysis cannot tell us",
        body: [
          "This dataset does not contain the full denominator of all Phase III trials that succeeded, completed normally, or remain ongoing. It therefore cannot estimate the probability that a Phase III trial will fail or establish the probability of technical and regulatory success.",
          "The result is best treated as a composition analysis of stopped records. It helps identify where source language points toward efficacy or safety and where the available explanation remains operational or unclear.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/failures/phase-3",
        label: "Open the Phase III failure hub",
        text: "Browse stopped Phase III records with sponsors, disease areas, and source-linked stop reasons.",
      },
      {
        href: "/explore?phase=PHASE3&bio=true",
        label: "Explore Phase III biological signals",
        text: "Filter the database to Phase III records classified as likely scientific failure signals.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "Review how efficacy, safety, operational, regulatory, and unclear signals are assigned.",
      },
    ],
    faqs: [
      {
        question: "Do Phase III trials have the highest clinical failure rate?",
        answer:
          "This analysis cannot answer that question because it contains stopped trials only. It shows that Phase III has the highest biological-signal share within the stopped records of the major phases.",
      },
      {
        question: "Are most stopped Phase III trials biological failures?",
        answer:
          "No. Operational and other or unknown stop reasons still make up most stopped Phase III records in the database.",
      },
      {
        question: "Which biological signal is more common in stopped Phase III trials?",
        answer:
          "Efficacy and futility signals are more common than safety signals in the current stopped Phase III slice.",
      },
    ],
  },
  {
    slug: "safety-vs-efficacy-signals-by-clinical-trial-phase",
    title: "Safety dominates Phase I signals; efficacy dominates Phase II and III",
    metaDescription:
      "Compare safety and efficacy clinical trial failure signals across Phase I, Phase II, and Phase III stopped trial records.",
    eyebrow: "Failure signals by phase",
    dek:
      "The composition of biological failure signals changes across development: safety is more common in Phase I, while efficacy and futility dominate in Phase II and III.",
    datePublished: "2026-08-12",
    readingTime: "7 min read",
    keyword: "clinical trial failure signals by phase",
    facts: [],
    sections: [
      {
        heading: "The pattern across development",
        body: [
          "The biological failure signal is not the same at every stage of clinical development. In the current stopped-trial data, safety signals outnumber efficacy and futility signals in Phase I. The relationship reverses in Phase II and becomes wider in Phase III.",
          "This is one of the clearest phase-level patterns in the database. It also matches the different questions the phases are designed to answer: early development emphasizes tolerability, exposure, and dose, while later development increasingly tests whether benefit is strong and reliable enough.",
        ],
      },
      {
        heading: "Why Phase I looks different",
        body: [
          "Phase I trials are commonly built around safety, tolerability, pharmacokinetics, dose escalation, and dose selection. A safety-led stop is therefore closer to the central purpose of the phase than it would be in many later-stage programs.",
          "That does not mean every Phase I safety signal invalidates the mechanism. Toxicity can depend on dose, schedule, formulation, combination partner, route of administration, or patient population. The trial-level context still determines how broadly the result should be interpreted.",
        ],
      },
      {
        heading: "Why efficacy becomes more visible in Phase II",
        body: [
          "Phase II is often the point where a program must demonstrate enough activity to justify larger and more expensive studies. Futility analyses, weak treatment effects, insufficient responses, and endpoint problems therefore become more visible in the stop language.",
          "The shift from safety to efficacy signals should not be read as proof that safety no longer matters. It shows that efficacy and futility become the more common classified biological reason within the stopped Phase II records.",
        ],
      },
      {
        heading: "The gap widens in Phase III",
        body: [
          "By Phase III, efficacy and futility signals substantially outnumber safety signals in the stopped-trial slice. Confirmatory designs are intended to establish clinically and statistically meaningful benefit, so an efficacy-led stop can become a decisive program signal.",
          "Safety remains material, particularly when larger populations or longer exposure reveal risks that were not clear earlier. But in this database, the balance of classified biological stops moves increasingly toward efficacy as development advances.",
        ],
      },
      {
        heading: "Why absolute counts need denominators",
        body: [
          "There are more records in some phases than others, and trials can carry more than one phase label. Raw counts therefore need both a phase denominator and a clear definition of the signal being counted.",
          "The tables below show counts and signal shares within stopped records. They do not represent the failure probability of all trials entering each phase, and they should not be compared directly with industry success-rate studies that use different cohorts and denominators.",
        ],
      },
      {
        heading: "How I would use the phase pattern",
        body: [
          "For early-stage research, I would inspect safety language, dose-limiting toxicity, exposure, and whether the issue appears molecule-specific or mechanism-related. For Phase II and III, I would begin with endpoint design, futility rules, patient selection, comparator performance, and whether the effect size was clinically meaningful.",
          "The phase pattern is a useful prior for where to look, not a substitute for source review. The decisive evidence remains in the trial record, protocol, results, sponsor communication, publication, and regulatory history.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/insights/efficacy-vs-safety-clinical-trial-failure-signals",
        label: "Efficacy versus safety signals",
        text: "Read the broader comparison of the two biological stop-reason categories.",
      },
      {
        href: "/explore?bio=true",
        label: "Explore biological failure signals",
        text: "Filter likely scientific signals by phase, disease area, sponsor, and status.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "Review the definitions and limitations behind the phase-level signal counts.",
      },
    ],
    faqs: [
      {
        question: "Which failure signal is more common in stopped Phase I trials?",
        answer:
          "Safety signals are more common than efficacy or futility signals in the current stopped Phase I records.",
      },
      {
        question: "When do efficacy signals become more common than safety signals?",
        answer:
          "In this dataset, efficacy and futility signals outnumber safety signals in Phase II and Phase III stopped records.",
      },
      {
        question: "Are these overall clinical trial failure rates by phase?",
        answer:
          "No. They describe the composition of stopped records only and do not include every successful, completed, or ongoing trial entering each phase.",
      },
    ],
  },
  {
    slug: "oncology-volume-vs-biological-failure-signal-share",
    title: "Oncology has the most stopped trials, but not the highest biological-signal share",
    metaDescription:
      "A data-backed comparison of biological clinical trial failure signals by disease area, including efficacy, futility, and safety classifications.",
    eyebrow: "Disease-area comparison",
    dek:
      "Oncology dominates the stopped-trial database by volume. Once the numbers are adjusted for the size of each disease-area slice, a different pattern appears.",
    datePublished: "2026-08-10",
    readingTime: "7 min read",
    keyword: "clinical trial failure signals by disease area",
    facts: [],
    sections: [
      {
        heading: "The short version",
        body: [
          "Oncology is the largest disease area in the stopped-trial database. That makes it the easiest area to notice, search, and quote. It does not automatically make oncology the disease area with the highest concentration of likely biological failure signals.",
          "When I compare efficacy/futility and safety classifications with the total number of stopped records in each sufficiently large disease-area slice, several smaller areas rank above oncology by share. This is a useful reminder that volume and concentration answer different questions.",
        ],
      },
      {
        heading: "Volume and share answer different questions",
        body: [
          "Raw volume tells us where the database contains the most stopped trials. Share asks a narrower question: among stopped records in one disease area, what proportion carries source language classified as efficacy/futility or safety? Both views are useful, but they should not be substituted for each other.",
          "A large area can produce many scientific failure signals while still having a lower signal share because it also contains a very large number of operational, strategic, enrollment, regulatory, or unclear stops. A smaller area can have fewer signals in absolute terms but a higher concentration within its stopped-trial slice.",
        ],
      },
      {
        heading: "Why oncology volume can be misleading",
        body: [
          "Oncology has more stopped records than any other disease area in this dataset. It also has substantial efficacy and safety counts. If I looked only at totals, I might conclude that oncology is the clearest failure area. The denominator changes that interpretation.",
          "Cancer development includes a wide variety of mechanisms, combinations, investigator-led studies, biomarker populations, and operationally complex protocols. The large denominator includes many stops that do not establish failed biology. That is why the share of classified biological signals is more informative than the headline count alone.",
        ],
      },
      {
        heading: "What a higher share does and does not mean",
        body: [
          "A higher share means that efficacy/futility or safety language appears more often within the stopped records assigned to that disease area. It does not mean that drugs in that disease area have a higher overall clinical failure rate. We do not have the full denominator of all successful, ongoing, and completed trials in this analysis.",
          "The ranking is therefore a stopped-trial signal comparison, not a probability of technical success and not a league table of therapeutic quality. It is best used to decide where source-level review may be especially valuable.",
        ],
      },
      {
        heading: "How I would use this result",
        body: [
          "I would use the disease-area comparison as a triage layer. First identify areas with a meaningful record count and a comparatively high signal share. Then separate efficacy/futility from safety, because those categories can imply very different development problems.",
          "After that, I would move to phase, intervention, sponsor, and individual NCT records. The useful question is not simply which area ranks first. It is whether the pattern persists inside a comparable phase, modality, mechanism, or patient population.",
        ],
      },
      {
        heading: "The limits of the comparison",
        body: [
          "Disease areas are assigned through a keyword-based taxonomy derived from conditions and MeSH terms. Some trials span more than one clinical area, and the primary assignment can simplify that complexity. Classification is also based on registry language, which can be brief or incomplete.",
          "To reduce unstable small-sample rankings, this comparison includes only disease areas with at least 200 stopped records. Even with that threshold, every percentage should be read as an analytical screening signal and verified against the underlying trial records.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/failures/oncology",
        label: "Oncology clinical trial failures",
        text: "Review the oncology-specific dataset, definitions, and source-linked records.",
      },
      {
        href: "/explore?bio=true",
        label: "Explore biological signals",
        text: "Open likely scientific failure records and refine them by disease area, phase, or sponsor.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "See how registry stop language is mapped into efficacy, safety, operational, and other categories.",
      },
    ],
    faqs: [
      {
        question: "Which disease area has the most stopped clinical trials?",
        answer:
          "Oncology has the largest stopped-trial volume in the current dataset. That does not mean it has the highest share of efficacy or safety signals within its disease-area slice.",
      },
      {
        question: "Is this a clinical trial failure-rate ranking?",
        answer:
          "No. The denominator contains stopped trials only. It does not include every successful, completed, or ongoing trial, so the percentages must not be interpreted as overall failure rates.",
      },
      {
        question: "Why exclude disease areas with fewer than 200 records?",
        answer:
          "The minimum-record threshold reduces rankings driven by very small samples. It does not remove all uncertainty, but it makes comparisons more stable and useful.",
      },
    ],
  },
  {
    slug: "withdrawn-clinical-trials-rarely-show-biological-failure-signals",
    title: "Withdrawn clinical trials rarely show biological failure signals",
    metaDescription:
      "A data-backed analysis of withdrawn clinical trials, including efficacy, safety, operational, and unknown stop-reason signals.",
    eyebrow: "Withdrawn trial patterns",
    dek:
      "Withdrawn status sounds conclusive, but the underlying registry language is usually not an efficacy or safety failure signal. The distinction matters.",
    datePublished: "2026-08-10",
    readingTime: "7 min read",
    keyword: "withdrawn clinical trials",
    facts: [],
    sections: [
      {
        heading: "The headline result",
        body: [
          "Withdrawn is one of the three stopped statuses covered by this database, alongside terminated and suspended. It is also one of the easiest labels to over-interpret. In the current data, only a small share of withdrawn records carries stop language classified as efficacy/futility or safety.",
          "Most withdrawn records fall into operational or other/unknown classifications. That does not make them unimportant. It means the status field alone is weak evidence for the claim that a drug, target, or biological hypothesis failed.",
        ],
      },
      {
        heading: "Why withdrawal often happens before evidence exists",
        body: [
          "A withdrawn study may never begin enrollment, may fail to activate sites, may lose funding, or may be abandoned after a sponsor or investigator decision. In those cases, the intervention may never have received a meaningful clinical test.",
          "This is different from a trial that enrolls patients and stops after a futility analysis, missed endpoint, or safety concern. Both records are stopped, but the evidence content is not comparable.",
        ],
      },
      {
        heading: "Why other or unknown is so common",
        body: [
          "ClinicalTrials.gov stop explanations vary enormously. Some are detailed and explicit. Others are short, administrative, or absent. A large other/unknown bucket therefore reflects both genuine ambiguity and limitations in the source text.",
          "I would rather keep an unclear record visibly unclear than force it into efficacy or safety. That makes the database more conservative, even though it produces a less satisfying headline classification.",
        ],
      },
      {
        heading: "The small scientific subset still matters",
        body: [
          "A minority of withdrawn records does contain efficacy or safety language. Those cases deserve attention because they differ from the dominant withdrawal pattern. They should be opened individually and checked against enrollment history, dates, endpoints, sponsor disclosures, and the source record.",
          "The right interpretation is not that withdrawn trials never contain biological evidence. It is that biological evidence is unusual enough within this status group that it should be demonstrated, not assumed.",
        ],
      },
      {
        heading: "How I would review a withdrawn trial",
        body: [
          "I would start by checking whether anyone was enrolled. Next I would read the official why-stopped field, compare the start and update dates, inspect the phase, and identify whether the sponsor described an operational, strategic, efficacy, or safety reason.",
          "If the record contains only a generic explanation, I would avoid a failed-drug label. A more accurate description may be withdrawn before enrollment, withdrawn for feasibility, withdrawn by sponsor decision, or withdrawn for an unclear reason.",
        ],
      },
      {
        heading: "What this result cannot prove",
        body: [
          "This analysis does not prove that the interventions in withdrawn trials work. Absence of an efficacy or safety failure signal is not evidence of success. It often means that the available record does not support either conclusion.",
          "The database is a screening and research tool. It helps separate the strength of the available stop signal, but final interpretation still requires the original registry entry and any associated primary documents.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/explore?status=WITHDRAWN",
        label: "Explore withdrawn trials",
        text: "Search withdrawn records by sponsor, phase, disease area, intervention, and stop reason.",
      },
      {
        href: "/insights/terminated-clinical-trials-are-not-always-failures",
        label: "Terminated does not always mean failed",
        text: "Compare withdrawn records with the interpretation problems around terminated trial status.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "Review the conservative rules used to classify efficacy, safety, operational, regulatory, and unclear reasons.",
      },
    ],
    faqs: [
      {
        question: "Does withdrawn mean a clinical trial failed?",
        answer:
          "Not by itself. A withdrawn trial may stop before enrollment or for operational, funding, strategic, or unclear reasons. The source explanation must be reviewed before drawing a biological conclusion.",
      },
      {
        question: "Can a withdrawn trial contain a safety or efficacy signal?",
        answer:
          "Yes, but those signals are a small minority in the current withdrawn-trial slice. They should be verified individually against the original registry record and related documents.",
      },
      {
        question: "Does no biological failure signal mean the intervention worked?",
        answer:
          "No. It only means the available stop language was not classified as efficacy/futility or safety. It is not evidence of clinical success.",
      },
    ],
  },
  {
    slug: "operational-reasons-dominate-stopped-clinical-trials",
    title: "Operational reasons dominate stopped clinical trials",
    metaDescription:
      "A data-backed analysis of operational clinical trial stops, including their share of the database, status mix, disease areas, and sponsor patterns.",
    eyebrow: "Operational failure patterns",
    dek:
      "The largest stop-reason group in the database is operational, not efficacy or safety. That changes how stopped clinical trials should be interpreted.",
    datePublished: "2026-08-05",
    readingTime: "7 min read",
    keyword: "operational clinical trial failure",
    facts: [],
    sections: [
      {
        heading: "The strongest result in the database",
        body: [
          "The clearest high-level finding is that operational reasons account for more stopped trial records than efficacy, futility, or safety signals. That is not a small technical distinction. It changes what the word failure should mean when someone searches a registry of terminated, suspended, and withdrawn studies.",
          "A stopped study may reflect recruitment, feasibility, site execution, logistics, sponsor decisions, or an unclear administrative history. Those outcomes matter, but they do not automatically show that a drug or biological hypothesis failed.",
        ],
      },
      {
        heading: "What counts as an operational stop",
        body: [
          "Operational source language can describe poor recruitment, low accrual, site problems, feasibility concerns, supply constraints, study-design changes, or a sponsor decision that is not presented as an efficacy or safety result.",
          "These records are still useful evidence. Repeated enrollment or execution problems can show that a development strategy is difficult to run in practice. The careful conclusion is operational failure or feasibility risk, not automatic drug failure.",
        ],
      },
      {
        heading: "Why status alone gives the wrong answer",
        body: [
          "Terminated, suspended, and withdrawn are registry statuses. They tell us that a study did not continue as originally planned, but they do not explain why. The stop-reason language is where the scientific or operational interpretation begins.",
          "This is why a count of terminated trials by sponsor is easy to misuse. Large organizations run more studies, academic centers often manage complex investigator-led programs, and operational stops can dominate the total. A useful comparison needs a denominator and a reason classification.",
        ],
      },
      {
        heading: "Where operational stops concentrate",
        body: [
          "The disease-area and sponsor tables below show where operational records are most visible in the current database. They should be read as workload and pattern indicators, not league tables of poor performance.",
          "The better research question is whether a disease area, study phase, patient population, or sponsor repeatedly encounters the same feasibility problem. That is more informative than treating every stop as one undifferentiated failure event.",
        ],
      },
      {
        heading: "How I would use this result",
        body: [
          "I would first separate operational records from efficacy/futility and safety records. Then I would filter by sponsor, phase, disease area, and intervention, looking for repeated wording or related study designs.",
          "Finally, I would open the source NCT records. The classification is a screening layer that makes a large dataset usable; the registry language remains the primary evidence for any important conclusion.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/explore?bucket=OPERATIONAL",
        label: "Explore operational stops",
        text: "Open the operational slice and inspect source-linked stopped trial records.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "See how source language is separated into operational, efficacy, safety, regulatory, and other signals.",
      },
      {
        href: "/reports/latest-two-week-stopped-trial-updates",
        label: "Latest two-week report",
        text: "Review the automatically calculated latest update window and its notable source records.",
      },
    ],
    faqs: [
      {
        question: "Is an operational stop a clinical trial failure?",
        answer:
          "It can be an execution or feasibility failure, but it is not automatically evidence that the intervention failed biologically.",
      },
      {
        question: "Why are operational records so common?",
        answer:
          "Clinical trials are difficult to recruit and operate. Feasibility, site execution, logistics, study design, funding, and sponsor decisions can stop a study before biology is fully tested.",
      },
      {
        question: "Should sponsors be ranked by operational stop count?",
        answer:
          "Not without context. Larger and more active sponsors naturally run more trials, so counts should be compared with total volume, phase, disease area, and source wording.",
      },
    ],
  },
  {
    slug: "why-i-would-not-bet-on-clinical-trial-outcomes",
    title: "Why I would not bet on clinical trial outcomes",
    metaDescription:
      "A cautious response to clinical trial prediction markets, Kalshi's biotech pilot, and why betting on trial outcomes should not replace source evidence.",
    eyebrow: "Prediction markets and evidence",
    dek:
      "Kalshi's biotech pilot is interesting, but it also makes me uneasy. Clinical trials are not sports scores. They are medical evidence, patient risk, endpoint design, safety context, and source documents.",
    datePublished: "2026-07-17",
    readingTime: "7 min read",
    keyword: "clinical trial prediction markets",
    facts: [
      "Kalshi has announced a pilot for markets tied to clinical trial outcomes and FDA regulatory decisions.",
      "I do not think clinical trial outcomes should be treated like casual betting events.",
      "Clinical Trial Failures is not a prediction market, betting service, investment advisory service, or medical advisory service.",
      "The current database contains 23,452 stopped clinical trial records from ClinicalTrials.gov-derived data.",
      "Only 1,813 stopped records are classified as likely biological failure signals, which is why context matters before calling any trial a failure.",
    ],
    sections: [
      {
        heading: "The short version",
        body: [
          "I understand why prediction markets around clinical trials are getting attention. A visible probability can feel cleaner than rumor, selective sponsor language, or private expert calls.",
          "But I do not think it is a good idea to turn clinical trial outcomes into something people casually bet on. A trial result is not just a yes/no event. It sits inside endpoint design, patient selection, safety, statistics, and medical need.",
        ],
      },
      {
        heading: "Why this feels different",
        body: [
          "There are prediction markets for elections, economic releases, sports, weather, and a lot of other things. Clinical trials feel different to me because the underlying event involves patients, experimental medicines, disease severity, and future treatment options.",
          "That does not mean people should not analyze probabilities. Of course they will. But there is a big difference between careful probability thinking and a product experience that makes medical outcomes feel like a tradeable game.",
        ],
      },
      {
        heading: "The dangerous shortcut",
        body: [
          "The shortcut is that a market price starts to look like truth. It is not. A price can show what a group of traders currently believes or is willing to risk. It cannot tell you whether an endpoint is clinically meaningful, whether a subgroup matters, whether the safety profile is acceptable, or whether the sponsor's summary is complete.",
          "Clinical evidence still lives in slower places: the ClinicalTrials.gov record, the registered endpoint, protocol details, FDA documents, advisory committee materials, publications, and sponsor disclosures.",
        ],
      },
      {
        heading: "What this has to do with clinical trial failures",
        body: [
          "The same issue already exists in stopped-trial data. A terminated trial is not automatically a failed drug. A failed endpoint is not automatically a failed mechanism. A futility stop in one population does not prove that the intervention can never work anywhere.",
          "That is the reason this site separates stopped status from stop reason. The goal is to make source-linked evidence easier to inspect, not to flatten complex clinical development into a yes/no outcome.",
        ],
      },
      {
        heading: "Where this site stands",
        body: [
          "Clinical Trial Failures is not built to tell anyone what to bet on. It is not a prediction market, not an odds page, not a stock tip service, and not medical advice.",
          "The position is simpler: if clinical trial probabilities become more visible, then the source evidence layer becomes more important, not less important. People need to understand what the trial actually measured before they treat any probability as meaningful.",
        ],
      },
      {
        heading: "The practical takeaway",
        body: [
          "My view is that clinical trial prediction markets should be approached with real caution. They may create useful public signals, but they can also make complex medical evidence look deceptively simple.",
          "The better habit is still boring and necessary: check the endpoint, phase, disease context, sponsor language, stop reason, safety profile, and source record before drawing a conclusion.",
        ],
      },
    ],
    tables: [
      {
        heading: "What a market price can and cannot tell you",
        columns: ["Market signal", "Missing clinical context"],
        rows: [
          ["What traders currently expect", "Whether the endpoint is clinically meaningful."],
          ["A probability attached to a defined event", "Whether the patient population, comparator, and effect size matter."],
          ["A fast public signal", "Whether safety, tolerability, or subgroup data change the interpretation."],
          ["A tradable view", "Whether source documents support the simple yes/no framing."],
        ],
      },
      {
        heading: "Why historical context matters",
        columns: ["Dataset signal", "Current records"],
        rows: [
          ["Stopped clinical trial records", "23,452"],
          ["Likely biological failure signals", "1,813"],
          ["Efficacy/futility signals", "1,096"],
          ["Safety signals", "717"],
        ],
      },
    ],
    links: [
      {
        href: "/clinical-trial-failures",
        label: "Clinical trial failures guide",
        text: "Understand why stopped status and failure reason should not be collapsed into one simple label.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "Review how source language is mapped into analytical stop-reason buckets.",
      },
      {
        href: "/insights/terminated-clinical-trials-are-not-always-failures",
        label: "Terminated does not always mean failed",
        text: "Read why terminated trial status should not be over-interpreted.",
      },
      {
        href: "https://news.kalshi.com/p/kalshi-biotech-prediction-markets",
        label: "Kalshi announcement",
        text: "Read the announcement this article is responding to.",
      },
      {
        href: "https://www.appliedxl.com/faq",
        label: "AppliedXL FAQ",
        text: "Review the public FAQ about resolution infrastructure and safeguards.",
      },
    ],
    faqs: [
      {
        question: "Is Clinical Trial Failures a prediction market?",
        answer:
          "No. Clinical Trial Failures is an evidence and research tool. It is not a prediction market, betting service, investment advisory service, or medical advisory service.",
      },
      {
        question: "Can a prediction market price replace clinical trial evidence?",
        answer:
          "No. A market price can reflect expectations, but it cannot replace endpoint review, source documents, safety context, FDA materials, publications, or careful clinical interpretation.",
      },
      {
        question: "Why mention Kalshi at all?",
        answer:
          "Because clinical trial prediction markets are becoming part of the public discussion. The responsible response is to explain why source evidence matters and why this site is not built to encourage betting on medical outcomes.",
      },
    ],
  },
  {
    slug: "failed-endpoint-clinical-trial-signals",
    title: "Failed endpoint clinical trial signals: how I would search them",
    metaDescription:
      "A data-backed guide to failed endpoint clinical trial signals, using stopped trial records with futility, weak efficacy, and endpoint-related source language.",
    eyebrow: "Endpoint failure signals",
    dek:
      "A failed endpoint is one of the cleaner signals in clinical trial failure analysis, but it still needs context. The useful workflow is to find the source language, then verify what the trial actually measured.",
    datePublished: "2026-08-01",
    readingTime: "6 min read",
    keyword: "failed endpoint clinical trial",
    facts: [
      "The current database contains 1,420 stopped records with endpoint, efficacy, futility, or weak-benefit language.",
      "1,352 of those records are terminated, 49 are withdrawn, and 19 are suspended.",
      "Oncology is the largest disease area in this slice with 416 records.",
      "Endpoint failure language can mean lack of efficacy, futility, no treatment effect, missed endpoints, or insufficient benefit.",
      "The classification is a screening signal and should be verified against the original NCT record.",
    ],
    sections: [
      {
        heading: "The short version",
        body: [
          "When people search for a failed endpoint clinical trial, they are usually looking for something more specific than a terminated trial. They want to know whether the study missed an endpoint, stopped for futility, showed weak efficacy, or failed to show enough benefit to continue.",
          "That is why this slice matters. It is narrower than all stopped trials and closer to the question people actually care about: did the clinical evidence support the intervention in that setting?",
        ],
      },
      {
        heading: "Why endpoint language is useful",
        body: [
          "Endpoint-related stop language is useful because it tends to sit closer to the scientific result than broad administrative language. Phrases like lack of efficacy, futility, failed to meet endpoint, no survival benefit, or insufficient treatment effect are stronger signals than a status field alone.",
          "Still, I would not treat one sentence in a registry record as the final answer. Endpoint design, statistical assumptions, interim-analysis rules, patient selection, and the comparator all affect what the stop reason actually means.",
        ],
      },
      {
        heading: "How I would use the database",
        body: [
          "I would start with endpoint and futility language, then filter by disease area, phase, sponsor, and intervention. After that, I would open the NCT record and look for the primary endpoint, enrollment size, status history, and any sponsor disclosure or publication.",
          "This is especially useful when you want to understand whether a mechanism struggled repeatedly, whether a sponsor has repeated weak-efficacy stops, or whether one disease area is unusually hard for a modality.",
        ],
      },
      {
        heading: "What not to do",
        body: [
          "Do not turn every endpoint-related stop into a simple failed drug label. A Phase 2 futility stop in one population may still leave room for another dose, biomarker group, combination, or endpoint strategy.",
          "The better wording is usually more precise: endpoint failure signal, futility signal, weak-efficacy signal, or stopped trial with endpoint-related source language.",
        ],
      },
    ],
    tables: [
      {
        heading: "Endpoint-related stopped records",
        columns: ["Dataset signal", "Current records"],
        rows: [
          ["Endpoint, efficacy, or futility signals", "1,420"],
          ["Terminated", "1,352"],
          ["Withdrawn", "49"],
          ["Suspended", "19"],
        ],
      },
      {
        heading: "Largest disease areas",
        columns: ["Disease area", "Records"],
        rows: [
          ["Oncology", "416"],
          ["Neurology", "109"],
          ["Infectious Disease", "108"],
          ["Gastroenterology & Hepatology", "105"],
        ],
      },
    ],
    links: [
      {
        href: "/failed-endpoint-clinical-trials",
        label: "Failed endpoint landing page",
        text: "Open the SEO guide and dataset summary for endpoint-related clinical trial failures.",
      },
      {
        href: "/clinical-trial-futility",
        label: "Clinical trial futility",
        text: "Review futility and weak-efficacy records in the broader database.",
      },
      {
        href: "/explore?bucket=EFFICACY%2FFUTILITY",
        label: "Explore efficacy/futility records",
        text: "Filter the database to records closer to endpoint and efficacy failure signals.",
      },
    ],
    faqs: [
      {
        question: "Is a failed endpoint the same as a failed clinical trial?",
        answer:
          "Not always. A failed endpoint is a strong evidence signal, but the interpretation depends on endpoint design, patient population, phase, comparator, and source documentation.",
      },
      {
        question: "What phrases should I search for?",
        answer:
          "Useful terms include lack of efficacy, futility, failed endpoint, failed to meet endpoint, insufficient benefit, no treatment effect, and no survival benefit.",
      },
      {
        question: "Where should I verify the result?",
        answer:
          "Start with the NCT record, then check protocol details, endpoints, publications, sponsor disclosures, and regulatory documents where available.",
      },
    ],
  },
  {
    slug: "enrollment-failure-clinical-trials",
    title: "Enrollment failure in clinical trials is not the same as drug failure",
    metaDescription:
      "A data-backed explanation of enrollment failure in clinical trials, using stopped records with recruitment, accrual, and enrollment-related source language.",
    eyebrow: "Enrollment failure signals",
    dek:
      "Enrollment failure is one of the most common reasons trials stop, but it should not be confused with biological failure. It often says more about feasibility than whether a drug works.",
    datePublished: "2026-08-01",
    readingTime: "6 min read",
    keyword: "enrollment failure clinical trials",
    facts: [
      "The current database contains 7,156 stopped records with enrollment, recruitment, or accrual-related language.",
      "5,458 of those records are terminated, 1,581 are withdrawn, and 117 are suspended.",
      "Oncology is the largest disease area in this enrollment-related slice with 2,576 records.",
      "Enrollment failure can reflect feasibility, trial design, competition, site activation, patient availability, or changing standards of care.",
      "These records are useful, but they should not be read as automatic proof that an intervention failed biologically.",
    ],
    sections: [
      {
        heading: "The short version",
        body: [
          "Enrollment failure is a real clinical development problem, but it is not the same thing as a failed drug. A trial can stop because it cannot recruit enough patients, even if the intervention was never properly tested.",
          "That distinction is important. If you mix enrollment stops with efficacy or safety failures, you can make the wrong conclusion about a sponsor, disease area, target, or drug class.",
        ],
      },
      {
        heading: "What enrollment failure can mean",
        body: [
          "Enrollment-related stop language can include slow accrual, poor recruitment, insufficient accrual, unable to enroll, or sites not recruiting as planned. Those phrases often point to feasibility and execution problems rather than a biological signal.",
          "Sometimes that feasibility problem is still highly informative. It can show that a patient population is too narrow, the trial burden is too high, the competitive landscape changed, or the protocol did not fit clinical reality.",
        ],
      },
      {
        heading: "Why oncology shows up so often",
        body: [
          "Oncology is the largest disease area in the enrollment-related slice. That makes sense: cancer studies can involve biomarker restrictions, competing trials, fast-moving standards of care, narrow eligibility, and complex treatment pathways.",
          "An oncology enrollment stop should therefore be read carefully. It may tell you something about study feasibility, not necessarily whether the therapy could work.",
        ],
      },
      {
        heading: "How I would analyze it",
        body: [
          "I would group enrollment stops by disease area, phase, sponsor, and condition, then look for repeats. One enrollment stop is a single operational story. Repeated enrollment stops in the same niche may be a real development warning.",
          "The useful question is not simply did the trial fail. The better question is what failed: biology, safety, recruitment, trial design, or sponsor execution?",
        ],
      },
    ],
    tables: [
      {
        heading: "Enrollment-related stopped records",
        columns: ["Dataset signal", "Current records"],
        rows: [
          ["Enrollment, recruitment, or accrual signals", "7,156"],
          ["Terminated", "5,458"],
          ["Withdrawn", "1,581"],
          ["Suspended", "117"],
        ],
      },
      {
        heading: "Largest disease areas",
        columns: ["Disease area", "Records"],
        rows: [
          ["Oncology", "2,576"],
          ["Infectious Disease", "478"],
          ["Gastroenterology & Hepatology", "478"],
          ["Cardiovascular", "440"],
        ],
      },
    ],
    links: [
      {
        href: "/clinical-trial-enrollment-failure",
        label: "Enrollment failure landing page",
        text: "Open the SEO guide and dataset summary for recruitment and accrual-related stops.",
      },
      {
        href: "/terminated-clinical-trials",
        label: "Terminated clinical trials",
        text: "See why status alone is not enough to interpret stopped trials.",
      },
      {
        href: "/explore?q=enrollment",
        label: "Search enrollment records",
        text: "Use the database to inspect enrollment and recruitment stop language directly.",
      },
    ],
    faqs: [
      {
        question: "Is enrollment failure a clinical trial failure?",
        answer:
          "Yes, it can be a trial execution failure, but it is not automatically a biological or drug failure.",
      },
      {
        question: "Why do trials fail to enroll?",
        answer:
          "Common reasons include narrow eligibility, competing trials, patient availability, site activation problems, trial burden, changed standard of care, or sponsor execution issues.",
      },
      {
        question: "How should I compare enrollment stops?",
        answer:
          "Compare them by disease area, phase, sponsor, condition, and repeated patterns, then verify the source NCT records before drawing conclusions.",
      },
    ],
  },
  {
    slug: "terminated-clinical-trials-are-not-always-failures",
    title: "Terminated clinical trials are not always clinical trial failures",
    metaDescription:
      "A data-backed explanation of why terminated clinical trials should not automatically be treated as scientific failures, using 23,452 stopped trial records.",
    eyebrow: "Stopped trial interpretation",
    dek:
      "The first mistake in clinical trial failure analysis is treating every terminated trial as a failed drug or failed biology. The stopped-trial dataset shows why that shortcut is too blunt.",
    datePublished: "2026-07-12",
    readingTime: "6 min read",
    keyword: "terminated clinical trials",
    facts: [
      "The current dataset contains 23,452 stopped clinical trial records.",
      "16,085 records are terminated, 6,782 are withdrawn, and 585 are suspended.",
      "Only 1,813 records, or 7.7%, are classified as likely biological failure signals from efficacy/futility or safety language.",
      "Operational stop reasons are the largest bucket with 12,013 records.",
      "Other or unclear stop reasons account for 9,534 records, which is why source review still matters.",
    ],
    sections: [
      {
        heading: "The short version",
        body: [
          "A terminated clinical trial is not automatically a failed clinical trial. It means the study stopped before normal completion. The reason can be weak efficacy, safety, enrollment, funding, sponsor strategy, protocol changes, operations, or simply unclear registry language.",
          "That distinction matters because the wrong interpretation can make a sponsor, target, disease area, or modality look worse than the evidence actually supports.",
        ],
      },
      {
        heading: "What the stopped-trial dataset shows",
        body: [
          "Across 23,452 stopped records, operational reasons dominate. There are 12,013 operational stops, compared with 1,096 efficacy/futility stops and 717 safety stops.",
          "That does not mean efficacy and safety failures are rare in absolute terms. It means they are much smaller than the full universe of terminated, withdrawn, and suspended trial records. The useful workflow is to separate status from reason before drawing conclusions.",
        ],
      },
      {
        heading: "How I would use this in practice",
        body: [
          "If I am researching a company or disease area, I would not start by counting all terminated trials as failures. I would first filter down to likely biological signals, then read the actual stop language.",
          "For example, an efficacy/futility stop is much closer to a scientific failure signal than a study stopped for recruitment, logistics, sponsor decision, or an unclear administrative reason.",
        ],
      },
      {
        heading: "The practical takeaway",
        body: [
          "The phrase clinical trial failure is useful, but it needs discipline. A clean failure analysis should say what failed: the intervention, the endpoint, recruitment, financing, operations, or the sponsor's willingness to continue.",
          "That is why the database separates stopped status from classified stop reason. It is not perfect, but it is far better than treating all terminated trials as the same thing.",
        ],
      },
    ],
    tables: [
      {
        heading: "Stopped trial status mix",
        columns: ["Status", "Records"],
        rows: [
          ["Terminated", "16,085"],
          ["Withdrawn", "6,782"],
          ["Suspended", "585"],
        ],
      },
      {
        heading: "Stop-reason buckets",
        columns: ["Reason bucket", "Records"],
        rows: [
          ["Operational", "12,013"],
          ["Other/unknown", "9,534"],
          ["Efficacy/futility", "1,096"],
          ["Safety", "717"],
          ["Regulatory", "92"],
        ],
      },
    ],
    links: [
      {
        href: "/explore?bucket=EFFICACY%2FFUTILITY",
        label: "Explore efficacy/futility stops",
        text: "Open the filtered database view for records closer to biological failure.",
      },
      {
        href: "/methods",
        label: "Review methodology",
        text: "See how stop reasons are grouped and what the labels can and cannot prove.",
      },
      {
        href: "/clinical-trial-failures",
        label: "Clinical trial failures guide",
        text: "Read the broader guide to failure signals and source verification.",
      },
    ],
    faqs: [
      {
        question: "Is a terminated clinical trial always a failed clinical trial?",
        answer:
          "No. Terminated status means the study stopped early. The reason may be scientific, operational, strategic, financial, regulatory, or unclear.",
      },
      {
        question: "Which stopped trials are closest to biological failure signals?",
        answer:
          "Records classified as efficacy/futility or safety are usually closer to biological failure signals than operational or unclear stops.",
      },
      {
        question: "Why does this matter for SEO and research?",
        answer:
          "Because people search for clinical trial failures, but the real analytical value comes from separating stopped status from the reason the study stopped.",
      },
    ],
  },
  {
    slug: "oncology-phase-2-clinical-trial-failure-signals",
    title: "Oncology Phase II clinical trial failure signals in stopped trials",
    metaDescription:
      "A focused analysis of oncology and Phase II stopped clinical trials, including efficacy/futility, safety, operational, and unclear stop signals.",
    eyebrow: "Oncology failure signals",
    dek:
      "Oncology is the largest disease area in the stopped-trial dataset. Phase II is where many programs start to show whether the biology is promising enough to keep moving.",
    datePublished: "2026-07-12",
    readingTime: "7 min read",
    keyword: "oncology clinical trial failures",
    facts: [
      "Oncology accounts for 7,871 stopped records in the current dataset.",
      "Oncology has 581 likely biological failure signals: 304 efficacy/futility and 277 safety records.",
      "Phase II appears in 4,524 oncology stopped records.",
      "Within oncology Phase II records, 204 are efficacy/futility and 159 are safety stops.",
      "The largest oncology sponsors by stopped-record count include M.D. Anderson Cancer Center, National Cancer Institute (NCI), and Novartis Pharmaceuticals.",
    ],
    sections: [
      {
        heading: "Why oncology Phase II is worth separating",
        body: [
          "Oncology is not just another disease area in this dataset. It is the largest one, with 7,871 stopped records. That makes it useful for search demand, but also easy to misread if everything is grouped together.",
          "Phase II is especially important because it often sits between early safety/tolerability work and larger confirmatory trials. A stop at this point can be a stronger signal about efficacy, futility, dose, endpoint, or patient-selection problems.",
        ],
      },
      {
        heading: "What the oncology slice shows",
        body: [
          "In oncology, operational and unclear stop reasons are still the biggest groups: 4,175 operational records and 3,099 other/unknown records. But the biological signal is large enough to study directly, with 304 efficacy/futility stops and 277 safety stops.",
          "That is why the oncology view should not be just a list of terminated cancer trials. It should separate scientific signals from administrative noise.",
        ],
      },
      {
        heading: "The Phase II signal",
        body: [
          "Phase II appears in 4,524 oncology stopped records. Inside that slice, the dataset includes 204 efficacy/futility stops and 159 safety stops.",
          "Those are the records I would inspect first when looking for failed endpoints, weak activity, tolerability problems, or early signs that a program was not strong enough to continue.",
        ],
      },
      {
        heading: "Sponsor context matters",
        body: [
          "The largest oncology stopped-trial sponsor counts include M.D. Anderson Cancer Center with 326 records, National Cancer Institute (NCI) with 311, Novartis Pharmaceuticals with 138, Hoffmann-La Roche with 97, and Washington University School of Medicine with 91.",
          "Those counts should not be read as a simple ranking of bad performance. Large research centers and active sponsors naturally run more studies. The better use is comparison inside a reason bucket, phase, and disease context.",
        ],
      },
    ],
    tables: [
      {
        heading: "Oncology stop-reason buckets",
        columns: ["Reason bucket", "Oncology records"],
        rows: [
          ["Operational", "4,175"],
          ["Other/unknown", "3,099"],
          ["Efficacy/futility", "304"],
          ["Safety", "277"],
          ["Regulatory", "16"],
        ],
      },
      {
        heading: "Oncology Phase II stop signals",
        columns: ["Reason bucket", "Phase II oncology records"],
        rows: [
          ["Operational", "2,456"],
          ["Other/unknown", "1,697"],
          ["Efficacy/futility", "204"],
          ["Safety", "159"],
          ["Regulatory", "8"],
        ],
      },
      {
        heading: "Largest oncology stopped-trial sponsor counts",
        columns: ["Sponsor", "Oncology stopped records"],
        rows: [
          ["M.D. Anderson Cancer Center", "326"],
          ["National Cancer Institute (NCI)", "311"],
          ["Novartis Pharmaceuticals", "138"],
          ["Hoffmann-La Roche", "97"],
          ["Washington University School of Medicine", "91"],
        ],
      },
    ],
    links: [
      {
        href: "/failures/oncology",
        label: "Open oncology failure hub",
        text: "Browse the oncology-specific stopped-trial hub.",
      },
      {
        href: "/explore?area=Oncology&phase=PHASE2",
        label: "Explore oncology Phase II records",
        text: "Filter the database to oncology Phase II stopped trials.",
      },
      {
        href: "/clinical-trial-futility",
        label: "Clinical trial futility guide",
        text: "Read more about futility and weak efficacy signals.",
      },
    ],
    faqs: [
      {
        question: "How many oncology stopped trial records are in the dataset?",
        answer:
          "The current dataset contains 7,871 oncology stopped trial records.",
      },
      {
        question: "How many oncology records are likely biological failure signals?",
        answer:
          "There are 581 oncology records classified as likely biological failure signals: 304 efficacy/futility records and 277 safety records.",
      },
      {
        question: "Why focus on Phase II oncology trials?",
        answer:
          "Phase II often tests whether the treatment signal is strong enough to justify larger trials, so efficacy, futility, and safety stops in this phase can be especially useful for failure analysis.",
      },
    ],
  },
  {
    slug: "efficacy-vs-safety-clinical-trial-failure-signals",
    title: "Efficacy vs safety clinical trial failure signals",
    metaDescription:
      "A data-backed comparison of efficacy/futility and safety stop reasons in stopped clinical trials, using ClinicalTrials.gov-derived records.",
    eyebrow: "Failure signal comparison",
    dek:
      "Efficacy/futility and safety are the two buckets closest to biological clinical trial failure signals. They are useful together, but they do not mean the same thing.",
    datePublished: "2026-07-15",
    readingTime: "7 min read",
    keyword: "clinical trial failure signals",
    facts: [
      "The dataset contains 1,096 efficacy/futility records and 717 safety records.",
      "Efficacy/futility records are mostly terminated trials, with 1,043 terminated records.",
      "Safety records include 634 terminated, 64 withdrawn, and 19 suspended records.",
      "Oncology is the largest disease area in both signal types.",
      "Phase II is the largest phase group for both efficacy/futility and safety signals.",
    ],
    sections: [
      {
        heading: "The short version",
        body: [
          "If I had to separate clinical trial failure signals into two practical groups, I would start here: efficacy/futility and safety. They are both closer to biological risk than an operational or unclear stop reason.",
          "But they are not interchangeable. An efficacy or futility stop usually asks whether the treatment worked well enough. A safety stop asks whether the risk profile made continuing hard to justify.",
        ],
      },
      {
        heading: "Why this distinction matters",
        body: [
          "A trial can stop because the drug did not show enough benefit, because adverse events changed the risk-benefit picture, or because the registry language points to tolerability problems. Those are different analytical stories.",
          "For research, investing, competitive intelligence, or target evaluation, that difference matters. Calling everything a failed clinical trial hides the most useful part of the evidence: what kind of failure signal appeared.",
        ],
      },
      {
        heading: "What the dataset shows",
        body: [
          "In the current stopped-trial dataset, efficacy/futility signals are larger than safety signals. That does not make safety less important. It means the two should be reviewed side by side, not collapsed into one vague failure bucket.",
          "Most records in both groups are terminated trials. Still, withdrawn and suspended records appear in both buckets, which is another reminder that trial status alone is not enough. The stop reason is doing the real work.",
        ],
      },
      {
        heading: "How I would use this",
        body: [
          "For a fast screen, I would first filter to efficacy/futility when I care about weak activity, endpoint failure, lack of benefit, or futility language. Then I would filter to safety when I care about adverse events, toxicity, tolerability, or risk signals.",
          "After that, I would read the source language. The classification is a starting point for analysis, not a substitute for the ClinicalTrials.gov record.",
        ],
      },
    ],
    tables: [
      {
        heading: "Signal counts by stop-reason type",
        columns: ["Signal type", "Records"],
        rows: [
          ["Efficacy/futility", "1,096"],
          ["Safety", "717"],
        ],
      },
      {
        heading: "Status mix inside each signal",
        columns: ["Status", "Records"],
        rows: [
          ["Efficacy/futility terminated", "1,043"],
          ["Efficacy/futility withdrawn", "34"],
          ["Efficacy/futility suspended", "19"],
          ["Safety terminated", "634"],
          ["Safety withdrawn", "64"],
          ["Safety suspended", "19"],
        ],
      },
      {
        heading: "Top disease areas",
        columns: ["Disease area", "Records"],
        rows: [
          ["Efficacy/futility: Oncology", "304"],
          ["Safety: Oncology", "277"],
        ],
      },
    ],
    links: [
      {
        href: "/explore?bucket=EFFICACY%2FFUTILITY",
        label: "Explore efficacy/futility signals",
        text: "Open records where the stop reason points toward weak efficacy, futility, or lack of benefit.",
      },
      {
        href: "/explore?bucket=SAFETY",
        label: "Explore safety signals",
        text: "Open records where the stop reason points toward adverse events, toxicity, or tolerability concerns.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "Review how source language is mapped into analytical stop-reason buckets.",
      },
    ],
    faqs: [
      {
        question: "Are efficacy/futility and safety both clinical trial failure signals?",
        answer:
          "Yes, they can both be useful biological failure signals, but they point to different questions: whether the intervention worked well enough, and whether the risk profile was acceptable.",
      },
      {
        question: "Is a safety stop worse than an efficacy stop?",
        answer:
          "Not automatically. The interpretation depends on the intervention, patient population, disease severity, dose, alternatives, and exact source language.",
      },
      {
        question: "Should I count all terminated trials as efficacy failures?",
        answer:
          "No. Terminated status only says the study stopped early. The stop reason is needed before calling it an efficacy, safety, operational, or unclear signal.",
      },
    ],
  },
];

function n(value: number): string {
  return formatInsightCount(value);
}

function pctFromCounts(part: number, total: number): string {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function pctFromRatio(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function b(stats: Pick<InsightStats, "buckets">, bucket: string): number {
  return stats.buckets[bucket] || 0;
}

function insightDateTime(article: Pick<InsightArticle, "datePublished">): number {
  const value = Date.parse(article.datePublished);
  return Number.isFinite(value) ? value : 0;
}

export function sortInsightArticlesByDate<T extends Pick<InsightArticle, "datePublished" | "slug">>(articles: T[]): T[] {
  return [...articles].sort((a, b) => insightDateTime(b) - insightDateTime(a) || a.slug.localeCompare(b.slug));
}

function hydrateCountryScaleArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const country = stats.countryScaleSignals;
  const band = (key: string) => country.bands.find((item) => item.key === key) || {
    key,
    label: key,
    total: 0,
    biologicalCount: 0,
    biologicalShare: "0.0%",
  };
  const single = band("single");
  const twoToFour = band("twoToFour");
  const fivePlus = band("fivePlus");
  const missing = band("missing");
  const phase = (key: string) => country.phaseComparisons.find((item) => item.key === key);
  const phaseBand = (phaseKey: string, bandKey: string) => phase(phaseKey)?.bands.find((item) => item.key === bandKey);
  const phaseThreeSingle = phaseBand("PHASE3", "single");
  const phaseThreeMid = phaseBand("PHASE3", "twoToFour");
  const phaseThreeLarge = phaseBand("PHASE3", "fivePlus");
  const oncology = country.areaComparisons.find((item) => item.label === "Oncology");
  const phaseTwoOncology = country.matchedComparisons.find(
    (item) => item.phase === "Phase II" && item.area === "Oncology"
  );
  const phaseThreeOncology = country.matchedComparisons.find(
    (item) => item.phase === "Phase III" && item.area === "Oncology"
  );
  const examples = new Map(country.examples.map((example) => [example.nctId, example]));
  const multinationalBiological = examples.get("NCT04191096");
  const multinationalBusiness = examples.get("NCT01555710");
  const singleCountryBiological = examples.get("NCT06470451");

  const phaseRows = country.phaseComparisons.flatMap((item) =>
    item.bands.map((itemBand) => [
      `${item.label} — ${itemBand.label}`,
      `${n(itemBand.biologicalCount)} of ${n(itemBand.total)} (${itemBand.biologicalShare})`,
    ] as [string, string])
  );
  const matchedRows = country.matchedComparisons.slice(0, 8).flatMap((item) => [
    [
      `${item.phase}, ${item.area} — 1 country`,
      `${n(item.single.biologicalCount)} of ${n(item.single.total)} (${item.single.biologicalShare})`,
    ] as [string, string],
    [
      `${item.phase}, ${item.area} — 5+ countries`,
      `${n(item.fivePlus.biologicalCount)} of ${n(item.fivePlus.total)} (${item.fivePlus.biologicalShare})`,
    ] as [string, string],
  ]);

  return {
    ...article,
    metaDescription: `${fivePlus.biologicalShare} of stopped trials spanning 5+ countries carry biological failure signals, versus ${single.biologicalShare} in single-country records. See the stratified analysis.`,
    dek: `Biological failure signals appear in ${single.biologicalShare} of single-country stopped trials and ${fivePlus.biologicalShare} of records spanning at least five countries. The gradient survives basic stratification—but it is still not a causal effect of geography.`,
    facts: [
      `${n(single.biologicalCount)} of ${n(single.total)} single-country records carry biological failure signals (${single.biologicalShare}).`,
      `The share rises to ${twoToFour.biologicalShare} across two to four countries and ${fivePlus.biologicalShare} across five or more.`,
      `Within exact Phase III records, the shares are ${phaseThreeSingle?.biologicalShare || "n/a"}, ${phaseThreeMid?.biologicalShare || "n/a"}, and ${phaseThreeLarge?.biologicalShare || "n/a"}.`,
      oncology
        ? `Within oncology, the comparison is ${oncology.single.biologicalShare} for one country versus ${oncology.fivePlus.biologicalShare} for five or more.`
        : "The same direction appears inside major disease areas.",
      `${n(missing.total)} records have no usable country value and remain a separate missing-data cohort.`,
    ],
    sections: [
      {
        heading: "A pattern strong enough to distrust at first",
        body: [
          `The raw gradient is unusually clean: ${single.biologicalShare} for trials listing one country, ${twoToFour.biologicalShare} for two to four countries, and ${fivePlus.biologicalShare} for five or more. These are mutually exclusive groups, so the large multinational cohort is not counted again inside the middle group.`,
          "The tempting story is that multinational trials fail biologically more often. That is not what these data establish. Country count can vary with trial phase, sponsor type, program maturity, sample size, and the likelihood that a stop reason is documented precisely.",
        ],
      },
      {
        heading: "First attempt to break the pattern: hold phase constant",
        body: [
          `The gap does not disappear when the comparison is restricted to exact phase labels. Within Phase III, ${phaseThreeSingle ? `${n(phaseThreeSingle.biologicalCount)} of ${n(phaseThreeSingle.total)} single-country records (${phaseThreeSingle.biologicalShare})` : "the single-country cohort"} carry a biological signal, compared with ${phaseThreeLarge ? `${n(phaseThreeLarge.biologicalCount)} of ${n(phaseThreeLarge.total)} records spanning five or more countries (${phaseThreeLarge.biologicalShare})` : "the multinational cohort"}.`,
          "Phase I and Phase II point in the same direction. Phase IV does not: its five-plus-country group is small, and no biological signals appear there. That exception is exactly why country count should not be used as a universal failure rule.",
        ],
      },
      {
        heading: "Second attempt: compare within disease areas",
        body: [
          oncology
            ? `Oncology contains ${n(oncology.single.total)} single-country and ${n(oncology.fivePlus.total)} five-plus-country stopped trials. Their biological-signal shares are ${oncology.single.biologicalShare} and ${oncology.fivePlus.biologicalShare}, respectively.`
            : "The same comparison was repeated inside the largest disease areas.",
          "The same direction appears in infectious disease, gastroenterology, cardiovascular disease, neurology, and the broad Other group. Disease mix explains part of the raw dataset, but it does not erase the association.",
        ],
      },
      {
        heading: "A stricter check: same phase and same disease area",
        body: [
          phaseTwoOncology
            ? `Among exact Phase II oncology records, the share rises from ${phaseTwoOncology.single.biologicalShare} in single-country studies to ${phaseTwoOncology.fivePlus.biologicalShare} in studies listing at least five countries.`
            : "The comparison was also repeated inside matched phase and disease-area cells.",
          phaseThreeOncology
            ? `Among exact Phase III oncology records, it rises from ${phaseThreeOncology.single.biologicalShare} to ${phaseThreeOncology.fivePlus.biologicalShare}. Similar gaps remain in several other cells large enough to compare.`
            : "The direction remains visible in the largest matched cells.",
          "This is a stratification check, not a fully adjusted causal model. It reduces two obvious sources of confounding but does not control sponsor strategy, sample size, intervention type, enrollment target, calendar period, or reporting quality.",
        ],
      },
      {
        heading: "Three trials prevent the wrong interpretation",
        body: [
          multinationalBiological
            ? `${multinationalBiological.nctId} was a ${multinationalBiological.countries}-country Phase III study stopped for futility. It fits the aggregate multinational pattern, but one example cannot explain that pattern.`
            : "One large multinational Phase III record was explicitly stopped for futility.",
          multinationalBusiness
            ? `${multinationalBusiness.nctId} covered ${multinationalBusiness.countries} countries and was also Phase III, yet it stopped after a development-plan business decision rather than for safety. Large international reach does not determine the cause.`
            : "Another large multinational Phase III record stopped for a business decision rather than a biological reason.",
          singleCountryBiological
            ? `${singleCountryBiological.nctId} was a single-country Phase III study stopped for futility. Biological failure signals are less common in the single-country cohort, not absent from it.`
            : "A single-country Phase III study can still stop for an explicit biological reason.",
        ],
      },
      {
        heading: "The useful conclusion is about triage, not causation",
        body: [
          "Country count can help prioritize review because it identifies a different population of stopped trials: generally larger, later, more internationally coordinated programs with richer evidence trails. It should be treated as context for the stop record, not as a risk score for an active trial.",
          "For any individual study, the stop-reason language, endpoint evidence, safety record, and protocol history remain more informative than the number of countries listed in the registry.",
        ],
      },
    ],
    tables: [
      {
        heading: "Biological signals by number of listed countries",
        columns: ["Country cohort", "Biological signals"],
        rows: country.bands.map((item) => [
          item.label,
          `${n(item.biologicalCount)} of ${n(item.total)} (${item.biologicalShare})`,
        ]),
      },
      {
        heading: "Phase-stratified comparison",
        columns: ["Exact phase and country cohort", "Biological signals"],
        rows: phaseRows,
      },
      {
        heading: "Largest matched phase and disease-area cells",
        columns: ["Matched cohort", "Biological signals"],
        rows: matchedRows,
      },
    ],
    links: [
      ...(multinationalBiological ? [{
        href: multinationalBiological.href,
        label: `${multinationalBiological.nctId}: multinational futility stop`,
        text: "Inspect a large Phase III record with an explicit biological failure signal.",
      }] : []),
      ...(multinationalBusiness ? [{
        href: multinationalBusiness.href,
        label: `${multinationalBusiness.nctId}: multinational business stop`,
        text: "Compare a similarly international Phase III program stopped for a non-biological reason.",
      }] : []),
      ...(singleCountryBiological ? [{
        href: singleCountryBiological.href,
        label: `${singleCountryBiological.nctId}: single-country futility stop`,
        text: "See why the lower-share cohort still contains clear biological signals.",
      }] : []),
      {
        href: "/methods",
        label: "Review the classification method",
        text: "Understand what qualifies as a biological failure signal and where uncertainty remains.",
      },
    ],
    faqs: [
      {
        question: "Do multinational clinical trials fail more often?",
        answer: "Not necessarily. This analysis covers already-stopped trials and measures the share with biological stop signals. It does not calculate the failure rate among all multinational trials.",
      },
      {
        question: "Does running a trial in more countries cause biological failure?",
        answer: "No causal claim can be made from this dataset. Country count is associated with phase, sponsor, program scale, evidence maturity, and reporting patterns.",
      },
      {
        question: "Does the pattern remain within the same phase?",
        answer: `Yes for the largest Phase I–III cohorts. For exact Phase III records, the biological-signal share is ${phaseThreeSingle?.biologicalShare || "lower"} for one country and ${phaseThreeLarge?.biologicalShare || "higher"} for five or more. Phase IV is a small counterexample.`,
      },
      {
        question: "Are missing country values treated as single-country trials?",
        answer: `No. All ${n(missing.total)} records without usable country data are reported separately and excluded from the one-country comparison.`,
      },
    ],
  };
}

function hydratePostedEndpointArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const endpoint = stats.postedEndpointResults;
  const metOutcomes = endpoint.outcomesByVerdict.MET || {};
  const missedOutcomes = endpoint.outcomesByVerdict.MISSED || {};
  const metShare = pctFromCounts(endpoint.verdicts.met, endpoint.total);
  const missedShare = pctFromCounts(endpoint.verdicts.missed, endpoint.total);
  const mixedShare = pctFromCounts(endpoint.verdicts.mixed, endpoint.total);
  const metNonBiological = metOutcomes.NON_BIOLOGICAL || 0;
  const metTransition = metOutcomes.NON_FAILURE_TRANSITION || 0;
  const metBiological = metOutcomes.BIOLOGICAL_FAILURE || 0;
  const missedBiological = missedOutcomes.BIOLOGICAL_FAILURE || 0;
  const missedNonBiological = missedOutcomes.NON_BIOLOGICAL || 0;
  const missedOther = Math.max(0, endpoint.verdicts.missed - missedBiological - missedNonBiological);
  const readOn = endpoint.readOn || "the current data snapshot";
  const examples = new Map(endpoint.examples.map((example) => [example.nctId, example]));
  const nusinersen = examples.get("NCT02193074");
  const business = examples.get("NCT01496430");
  const recruitment = examples.get("NCT01278745");

  return {
    ...article,
    metaDescription: `${n(endpoint.verdicts.met)} of ${n(endpoint.total)} stopped trials with readable posted primary results met the analyzed endpoint. See why result and stop reason are separate evidence.`,
    dek: `Among ${n(endpoint.total)} stopped trials with readable posted primary results, ${n(endpoint.verdicts.met)} met the analyzed endpoint. The apparent contradiction disappears when result and stop reason are treated as two separate axes.`,
    facts: [
      `${n(endpoint.verdicts.met)} of ${n(endpoint.total)} readable records were classified as MET (${metShare}).`,
      `${n(endpoint.verdicts.missed)} were MISSED (${missedShare}) and ${n(endpoint.verdicts.mixed)} were MIXED (${mixedShare}).`,
      `${n(metNonBiological)} MET records had a non-biological stop classification; another ${n(metTransition)} were non-failure transitions.`,
      `Only ${n(missedBiological)} of the ${n(endpoint.verdicts.missed)} MISSED records carried a biological-failure stop classification.`,
      `The posted-results snapshot was read on ${readOn}; records without a readable result are not included in this comparison.`,
    ],
    sections: [
      {
        heading: "The apparent contradiction is real",
        body: [
          `A clinical trial can be marked terminated and still have a statistically positive posted primary result. In this dataset, that happened in ${n(endpoint.verdicts.met)} of the ${n(endpoint.total)} stopped trials for which the posted primary result could be read.`,
          "That does not mean every one of those trials was an overall success. It means the stopped status and the analyzed result answer different questions. One describes the study's continuation. The other describes a specified comparison in the results record.",
        ],
      },
      {
        heading: "Status, cause, and result are three separate fields",
        body: [
          "Status tells us that a study ended early or paused. The stop reason tells us why the sponsor or investigator says that happened. The posted result tells us what an analyzed endpoint showed. None of those fields can safely replace the other two.",
          `The separation is visible in the MET group: ${n(metNonBiological)} records were stopped for non-biological reasons, ${n(metTransition)} reflected a non-failure transition, and ${n(metBiological)} still carried a biological-failure classification. The last group is a warning that one positive endpoint does not settle the safety profile, co-primary logic, or the totality of evidence.`,
        ],
      },
      {
        heading: "Three records show three different stories",
        body: [
          nusinersen
            ? `${nusinersen.nctId} stopped after a positive interim analysis so participants could enter an open-label study. Its posted primary result reads MET, while the stop classification is a planned milestone rather than failure.`
            : "One record stopped after a positive interim analysis so participants could move into an open-label study.",
          business
            ? `${business.nctId} reported a business decision with no safety or efficacy concerns. The readable posted primary result was MET, so the operational decision and the efficacy result point in different directions without contradicting each other.`
            : "Another record paired a MET result with an explicitly commercial stop decision.",
          recruitment
            ? `${recruitment.nctId} ended because accrual goals could not be met within the funding period, yet its posted comparison was MET. A recruitment constraint can stop a study without turning the observed analysis into an efficacy miss.`
            : "A third record stopped because recruitment goals could not be met despite a positive posted comparison.",
        ],
      },
      {
        heading: "The reverse shortcut is also wrong",
        body: [
          `A missed posted result does not prove that efficacy was the reason a trial stopped. Of ${n(endpoint.verdicts.missed)} MISSED records, ${n(missedBiological)} had a biological-failure stop classification, ${n(missedNonBiological)} had a non-biological classification, and ${n(missedOther)} belonged to unresolved, unstated, transition, or mixed-cause groups.`,
          "The result may support an efficacy interpretation, but the causal claim still needs the stop-reason evidence. This distinction is especially important when a study has several endpoints, stops for safety, or closes for operational reasons after collecting some analyzable data.",
        ],
      },
      {
        heading: "What the reader does—and does not claim",
        body: [
          `For ${n(endpoint.basis.postedAnalysis)} records, the verdict comes from readable posted analyses. For ${n(endpoint.basis.sponsorStatement)} records, an explicit sponsor statement about the primary endpoint takes precedence because it can reflect multiplicity and co-primary rules that isolated numbers do not carry.`,
          "The system does not label an unposted or unreadable result as a miss. MET means the available primary comparison cleared the stated or defensible statistical threshold used by the reader; it is not a declaration of regulatory approval, clinical importance, or overall program success.",
        ],
      },
    ],
    tables: [
      {
        heading: "Readable posted primary results in stopped trials",
        columns: ["Verdict", "Records"],
        rows: [
          ["MISSED", `${n(endpoint.verdicts.missed)} (${missedShare})`],
          ["MET", `${n(endpoint.verdicts.met)} (${metShare})`],
          ["MIXED", `${n(endpoint.verdicts.mixed)} (${mixedShare})`],
        ],
      },
      {
        heading: "Stop classifications among MET records",
        columns: ["Stop classification", "Records"],
        rows: [
          ["Non-biological", n(metNonBiological)],
          ["Non-failure transition", n(metTransition)],
          ["Biological failure", n(metBiological)],
          ["Cause not stated", n(metOutcomes.CAUSE_NOT_STATED || 0)],
          ["Unresolved", n(metOutcomes.UNRESOLVED || 0)],
          ["Mixed causes", n(metOutcomes.MIXED_CAUSES || 0)],
        ],
      },
      {
        heading: "How the verdict was read",
        columns: ["Evidence basis", "Records"],
        rows: [
          ["Posted statistical analysis", n(endpoint.basis.postedAnalysis)],
          ["Explicit sponsor statement", n(endpoint.basis.sponsorStatement)],
        ],
      },
    ],
    links: [
      ...(nusinersen ? [{
        href: nusinersen.href,
        label: `${nusinersen.nctId}: positive interim transition`,
        text: "Inspect the stop reason and posted primary-result evidence together.",
      }] : []),
      ...(business ? [{
        href: business.href,
        label: `${business.nctId}: business decision`,
        text: "See a MET result beside an explicitly non-safety, non-efficacy stop reason.",
      }] : []),
      ...(recruitment ? [{
        href: recruitment.href,
        label: `${recruitment.nctId}: accrual constraint`,
        text: "Review a recruitment-limited study with a readable positive comparison.",
      }] : []),
      {
        href: "/methods",
        label: "Read the methodology",
        text: "See how stopped-trial causes and evidence are classified conservatively.",
      },
    ],
    faqs: [
      {
        question: "Can a terminated trial meet its primary endpoint?",
        answer: `Yes. In this snapshot, ${n(endpoint.verdicts.met)} stopped trials had a readable posted primary result classified as MET. Termination status alone does not say whether an endpoint was met.`,
      },
      {
        question: "Does MET mean the drug or trial was successful?",
        answer: "No. MET describes the readable posted primary comparison. It does not by itself establish clinical importance, acceptable safety, success across every endpoint, regulatory approval, or a successful development program.",
      },
      {
        question: "Does MISSED prove efficacy failure caused the stop?",
        answer: `No. Only ${n(missedBiological)} of the ${n(endpoint.verdicts.missed)} MISSED records had a biological-failure stop classification. Stop-cause evidence must be reviewed separately.`,
      },
      {
        question: "Are trials without readable posted results counted as failures?",
        answer: "No. They are excluded from this result comparison. Missing or unreadable evidence is not converted into a negative verdict.",
      },
    ],
  };
}

function hydrateBusinessStrategyArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const strategy = stats.businessStrategySignals;
  const biological = stats.classificationV2.outcomes.BIOLOGICAL_FAILURE || 0;
  const efficacy = stats.classificationV2.primaryReasons.EFFICACY_FUTILITY || 0;
  const safety = stats.classificationV2.primaryReasons.SAFETY || 0;
  const biologicalUnspecified = stats.classificationV2.primaryReasons.BIOLOGICAL_UNSPECIFIED || 0;
  const terminated = strategy.statuses.TERMINATED || 0;
  const withdrawn = strategy.statuses.WITHDRAWN || 0;
  const suspended = strategy.statuses.SUSPENDED || 0;
  const topArea = strategy.topAreas[0];
  const topPhase = strategy.phases[0];

  return {
    ...article,
    metaDescription: `${n(strategy.total)} stopped clinical trials cite business strategy. See why these records are not equivalent to efficacy or safety failures.`,
    dek: `${n(strategy.total)} stopped records cite business strategy, compared with ${n(biological)} records carrying a biological failure outcome. Similar scale does not mean similar evidence.`,
    facts: [
      `${n(strategy.total)} of ${n(stats.total)} records (${pctFromCounts(strategy.total, stats.total)}) have business strategy as their final primary category.`,
      `${n(terminated)} business-strategy records are terminated, ${n(withdrawn)} are withdrawn, and ${n(suspended)} are suspended.`,
      `The business-strategy group is close in size to all ${n(biological)} biological failure outcomes in the current dataset.`,
      `A phrase scan finds ${n(strategy.explicitNoSafetyOrEfficacyCount)} business-strategy stop statements with an explicit negation close to the words safety or efficacy.`,
      topArea
        ? `${topArea.label} is the largest disease-area slice with ${n(topArea.count)} business-strategy records.`
        : "No disease-area slice is available for the business-strategy group.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading === "The near-miss that changes the interpretation") {
        return {
          ...section,
          body: [
            `The current dataset contains ${n(strategy.total)} records classified with business strategy as the final primary reason. That is only ${n(Math.abs(biological - strategy.total))} ${biological >= strategy.total ? "fewer than" : "more than"} the ${n(biological)} records carrying a biological failure outcome. Put those groups into one generic 'failed trial' total and the result ceases to describe either science or strategy accurately.`,
            `The distinction is not semantic housekeeping. The biological group includes ${n(efficacy)} efficacy or futility signals, ${n(safety)} safety signals, and ${n(biologicalUnspecified)} unfavorable biological signals that cannot be split responsibly. A portfolio decision instead says that an organization changed what it chose to pursue. Both can end a trial, but they support different conclusions.`,
          ],
        };
      }
      if (section.heading === "Terminated still does not tell you why") {
        return {
          ...section,
          body: [
            `${n(terminated)} of the ${n(strategy.total)} business-strategy records (${pctFromCounts(terminated, strategy.total)}) are marked Terminated. A status-only search can therefore make them look deceptively similar to trials stopped for futility or toxicity. A transparent phrase scan finds ${n(strategy.explicitNoSafetyOrEfficacyCount)} stop statements in this group where 'not' or 'no' appears within 40 characters of 'safety' or 'efficacy'. This is a language pattern, not a separate classification.`,
            "That negative wording should still be handled carefully. 'Not due to safety or efficacy' supports a non-biological classification for the stated stop. It does not prove that the drug was effective, safe in every setting, or commercially attractive. Absence of a cited biological reason is not positive clinical evidence.",
          ],
        };
      }
      if (section.heading === "Why oncology appears so often" && topArea) {
        return {
          ...section,
          body: [
            `${topArea.label} supplies ${n(topArea.count)} business-strategy records, or ${pctFromCounts(topArea.count, strategy.total)} of this category in the current snapshot. ${topPhase ? `${topPhase.label} is the largest single phase grouping with ${n(topPhase.count)} records.` : ""} These concentrations are useful for portfolio research, but they are not sponsor scorecards or failure rates.`,
            "The defensible use is narrower: identify where the registry explicitly records a strategic stop, read the linked source language, and then add external program context before drawing conclusions about an asset or company.",
          ],
        };
      }
      return section;
    }),
    tables: [
      {
        heading: "Strategy and biological evidence are different groups",
        columns: ["Classification", "Records"],
        rows: [
          ["Business strategy", n(strategy.total)],
          ["All biological failure outcomes", n(biological)],
          ["Efficacy / futility", n(efficacy)],
          ["Safety", n(safety)],
          ["Biological, unspecified", n(biologicalUnspecified)],
        ],
      },
      {
        heading: "Registry status within business-strategy stops",
        columns: ["Status", "Records"],
        rows: [
          ["Terminated", n(terminated)],
          ["Withdrawn", n(withdrawn)],
          ["Suspended", n(suspended)],
        ],
      },
      {
        heading: "Largest disease-area slices",
        columns: ["Disease area", "Business-strategy records"],
        rows: strategy.topAreas.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
    ],
  };
}

function hydrateNotInitiatedArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const notInitiated = stats.notInitiatedSignals;
  const withdrawn = notInitiated.statuses.WITHDRAWN || 0;
  const terminated = notInitiated.statuses.TERMINATED || 0;
  const suspended = notInitiated.statuses.SUSPENDED || 0;
  const topArea = notInitiated.topAreas[0];

  return {
    ...article,
    metaDescription: `${n(notInitiated.total)} stopped trial records describe studies that never began. See why that differs from ${n(notInitiated.recruitmentTotal)} recruitment stops.`,
    dek: `${n(notInitiated.total)} records describe studies that did not begin, while ${n(notInitiated.recruitmentTotal)} separately report recruitment problems. The difference is whether enrollment was ever tested.`,
    facts: [
      `${n(notInitiated.total)} of ${n(stats.total)} records (${pctFromCounts(notInitiated.total, stats.total)}) are classified as not initiated.`,
      `${n(withdrawn)} of those records (${pctFromCounts(withdrawn, notInitiated.total)}) carry the registry status Withdrawn.`,
      `All ${n(notInitiated.total)} are retained as non-failure transitions rather than biological or recruitment failures.`,
      `${n(notInitiated.phase2Count)} not-initiated protocols include a planned Phase II component, but no Phase II treatment result was generated by those records.`,
      `The dataset separately contains ${n(notInitiated.recruitmentTotal)} records whose source language supports an actual recruitment problem.`,
    ],
    sections: article.sections.map((section) => {
      if (section.heading === "There are two very different kinds of zero") {
        return {
          ...section,
          body: [
            `A trial can end with too few participants because recruitment began and failed to reach the required sample. It can also close before the first participant was enrolled. The current dataset separates ${n(notInitiated.total)} not-initiated records from ${n(notInitiated.recruitmentTotal)} recruitment records because those events do not describe the same evidence.`,
            "Recruitment language describes execution: sites tried to enroll and accrual was insufficient or too slow. Not-initiated language describes a lifecycle boundary. It tells us the study did not get under way, but often says little about whether eligible patients could have been recruited under an active protocol.",
          ],
        };
      }
      if (section.heading === "Withdrawn is the expected status, not the explanation") {
        return {
          ...section,
          body: [
            `${n(withdrawn)} of ${n(notInitiated.total)} not-initiated records are marked Withdrawn; only ${n(terminated)} are Terminated and ${n(suspended)} are Suspended. That alignment makes sense because ClinicalTrials.gov uses withdrawn for studies stopped before enrolling the first participant. But the status still does not supply the underlying reason.`,
            "Some source statements mention an administrative constraint, a sponsor choice, a redesign, or a regulatory issue. Others say only that the study never started. Classification V2 preserves not initiated as a non-failure transition instead of translating the absence of participants into failed recruitment or failed biology.",
          ],
        };
      }
      if (section.heading === "The phase label can survive even when the trial did not begin") {
        return {
          ...section,
          body: [
            `${n(notInitiated.phase2Count)} not-initiated protocols include a Phase II component. Those labels describe the intended design stage, not completed clinical exposure. A withdrawn Phase II record can therefore be useful for locating the protocol while providing no Phase II treatment outcome.`,
            "This is a broader lesson for registry analysis: planned attributes and observed events live in the same row. Good analysis keeps them separate. Phase, intervention, and target population describe the intended study; enrollment and stop text describe what actually happened.",
          ],
        };
      }
      return section;
    }),
    tables: [
      {
        heading: "Not initiated and recruitment are separate classifications",
        columns: ["Primary category", "Records"],
        rows: [
          ["Not initiated", n(notInitiated.total)],
          ["Recruitment", n(notInitiated.recruitmentTotal)],
        ],
      },
      {
        heading: "Registry status of not-initiated studies",
        columns: ["Status", "Records"],
        rows: [
          ["Withdrawn", n(withdrawn)],
          ["Terminated", n(terminated)],
          ["Suspended", n(suspended)],
        ],
      },
      {
        heading: "Largest planned phase groups",
        columns: ["Planned phase", "Not-initiated records"],
        rows: notInitiated.phases.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
      {
        heading: "Largest disease-area slices",
        columns: ["Disease area", "Not-initiated records"],
        rows: notInitiated.topAreas.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
    ],
    faqs: article.faqs.map((faq) => {
      if (faq.question === "Does withdrawn mean that a clinical trial recruited no participants?") {
        return {
          ...faq,
          answer: `${n(withdrawn)} of the ${n(notInitiated.total)} explicitly not-initiated records are Withdrawn, but status alone is not enough. The stop statement should confirm whether enrollment never began and whether another cause is stated.`,
        };
      }
      return faq;
    }),
  };
}

function hydrateClassificationV2Article(article: InsightArticle, stats: InsightStats): InsightArticle {
  const v2 = stats.classificationV2;
  const outcomes = v2.outcomes;
  const reasons = v2.primaryReasons;
  const biological = outcomes.BIOLOGICAL_FAILURE || 0;
  const nonBiological = outcomes.NON_BIOLOGICAL || 0;
  const mixed = outcomes.MIXED_CAUSES || 0;
  const transition = outcomes.NON_FAILURE_TRANSITION || 0;
  const causeNotStated = outcomes.CAUSE_NOT_STATED || 0;
  const efficacy = reasons.EFFICACY_FUTILITY || 0;
  const safety = reasons.SAFETY || 0;
  const biologicalUnspecified = reasons.BIOLOGICAL_UNSPECIFIED || 0;

  return {
    ...article,
    metaDescription: `Classification V${v2.version} maps ${n(stats.total)} stopped clinical trials with more granular causes, separate outcomes, and a stronger focus on ${n(biological)} biological signals.`,
    facts: [
      `Classification V${v2.version} is applied to all ${n(stats.total)} records in the current published dataset.`,
      `${n(v2.resolved)} records have a supported final classification; ${n(v2.reviewGated)} remain review-gated rather than being forced into a cause.`,
      `${n(biological)} records support a biological failure outcome: ${n(efficacy)} efficacy/futility, ${n(safety)} safety, and ${n(biologicalUnspecified)} biological-unspecified signals.`,
      `${n(nonBiological)} records support a non-biological outcome, while ${n(mixed)} contain explicit mixed causes.`,
      `An independent held-out validation (600 stop-reason texts, blind double annotation) estimates ${pctFromRatio(v2.heldoutBiologicalPrecision)} precision for biological failure labels; ${pctFromRatio(v2.heldoutAssertionAgreement)} of asserted classifications show no material disagreement with the reference labels.`,
    ],
    sections: article.sections.map((section) => {
      if (section.heading === "A stronger focus on biological evidence") {
        return {
          ...section,
          body: [
            `V2 keeps biological failure signals deliberately narrow. In the current snapshot, ${n(biological)} of ${n(stats.total)} records support a biological outcome. That group contains ${n(efficacy)} efficacy or futility signals, ${n(safety)} safety signals, and ${n(biologicalUnspecified)} unfavorable biological signals that cannot responsibly be split between the two.`,
            "The biological-unspecified category matters. A source can support an unfavorable biological conclusion without saying whether efficacy or safety was decisive. V2 preserves that evidence without inventing a more specific explanation than the registry provides.",
          ],
        };
      }
      if (section.heading === "More categories for non-biological stops") {
        return {
          ...section,
          body: [
            `The expanded taxonomy separates ${n(reasons.RECRUITMENT || 0)} recruitment records, ${n(reasons.BUSINESS_STRATEGY || 0)} business-strategy records, ${n(reasons.FUNDING || 0)} funding records, and additional staffing, protocol, supply, regulatory, external-disruption, support, and operational causes. ${n(transition)} records are preserved as non-failure transitions rather than being folded into a failure category.`,
            "This makes the database more useful in both directions. Analysts can isolate likely biological signals more confidently, while operational and strategy teams can study the non-biological reasons that account for much of the stopped-trial universe.",
          ],
        };
      }
      if (section.heading === "Decision-only language is not treated as a cause") {
        return {
          ...section,
          body: [
            `Statements such as 'Sponsor decision' identify an actor and an action, but not the underlying reason. V2 records ${n(reasons.DECISION_WITHOUT_STATED_CAUSE || 0)} such cases as decision-without-stated-cause instead of converting them into biological, operational, or strategic claims. An explicit corporate reprioritization can support business strategy; a bare corporate decision cannot.`,
            `The same principle applies to program-level actions. If the source says a program was discontinued but gives no causal explanation, the database preserves the action without pretending to know why it happened. In total, ${n(causeNotStated)} records currently sit in the cause-not-stated outcome group.`,
          ],
        };
      }
      if (section.heading === "Review-gated is a deliberate result") {
        return {
          ...section,
          body: [
            `${n(v2.reviewGated)} records currently contain no stop reason, only a status, a fragment, or language too ambiguous for a defensible causal label. Those records remain review-gated. This is a feature of the model: the database shows the boundary of its evidence instead of filling it with false precision.`,
            "New and changed records pass through the same rule set during future ingests. Repeated reviewed language can be reused consistently, while novel or insufficient text returns to the review inventory. The result is a classification system that can improve without silently changing the meaning of its categories.",
          ],
        };
      }
      return section;
    }),
    tables: [
      {
        heading: "V2 outcome map",
        columns: ["Outcome", "Records and share"],
        rows: [
          ["Non-biological stop", `${n(nonBiological)} (${pctFromCounts(nonBiological, stats.total)})`],
          ["Biological failure", `${n(biological)} (${pctFromCounts(biological, stats.total)})`],
          ["Cause not stated", `${n(causeNotStated)} (${pctFromCounts(causeNotStated, stats.total)})`],
          ["Non-failure transition", `${n(transition)} (${pctFromCounts(transition, stats.total)})`],
          ["Mixed causes", `${n(mixed)} (${pctFromCounts(mixed, stats.total)})`],
          ["Unknown / review-gated", `${n(v2.reviewGated)} (${pctFromCounts(v2.reviewGated, stats.total)})`],
        ],
      },
      {
        heading: "Biological failure signal detail",
        columns: ["Primary reason", "Records"],
        rows: [
          ["Efficacy / futility", n(efficacy)],
          ["Safety", n(safety)],
          ["Biological, unspecified", n(biologicalUnspecified)],
        ],
      },
      {
        heading: "Selected expanded primary reasons",
        columns: ["Primary reason", "Records"],
        rows: [
          ["Recruitment", n(reasons.RECRUITMENT || 0)],
          ["Business strategy", n(reasons.BUSINESS_STRATEGY || 0)],
          ["Funding", n(reasons.FUNDING || 0)],
          ["Staffing / resources", n(reasons.STAFFING_RESOURCES || 0)],
          ["Protocol feasibility", n(reasons.PROTOCOL_FEASIBILITY || 0)],
          ["Supply / manufacturing", n(reasons.SUPPLY_MANUFACTURING || 0)],
          ["Regulatory", n(reasons.REGULATORY || 0)],
        ],
      },
    ],
  };
}

function hydrateStoppedVsBiologicalArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const v2 = stats.classificationV2;
  const outcomes = v2.outcomes;
  const reasons = v2.primaryReasons;
  const biological = outcomes.BIOLOGICAL_FAILURE || 0;
  const nonBiological = outcomes.NON_BIOLOGICAL || 0;
  const mixed = outcomes.MIXED_CAUSES || 0;
  const transition = outcomes.NON_FAILURE_TRANSITION || 0;
  const causeNotStated = outcomes.CAUSE_NOT_STATED || 0;
  const efficacy = reasons.EFFICACY_FUTILITY || 0;
  const safety = reasons.SAFETY || 0;
  const biologicalUnspecified = reasons.BIOLOGICAL_UNSPECIFIED || 0;

  return {
    ...article,
    metaDescription: `Only ${pctFromCounts(biological, stats.total)} of ${n(stats.total)} stopped clinical trial records support a biological failure outcome in the current V2 dataset. See the full cause breakdown.`,
    facts: [
      `The current database contains ${n(stats.total)} terminated, withdrawn, and suspended trial records.`,
      `${n(nonBiological)} records, or ${pctFromCounts(nonBiological, stats.total)}, support a non-biological outcome.`,
      `${n(biological)} records, or ${pctFromCounts(biological, stats.total)}, support a biological failure outcome.`,
      `Recruitment is the largest named primary reason with ${n(reasons.RECRUITMENT || 0)} records.`,
      `${n(v2.reviewGated)} records remain unknown and review-gated rather than being counted as either biological or non-biological.`,
    ],
    sections: article.sections.map((section) => {
      if (section.heading === "Biological signals are important, but they are the minority") {
        return {
          ...section,
          body: [
            `${n(biological)} records, or ${pctFromCounts(biological, stats.total)} of the current stopped-trial dataset, support a biological failure outcome. Within that group, ${n(efficacy)} are efficacy or futility signals, ${n(safety)} are safety signals, and ${n(biologicalUnspecified)} support an unfavorable biological result without a defensible efficacy-versus-safety split.`,
            `The relative size of this group is a useful warning against casual language. ${n(nonBiological)} records support a non-biological outcome, more than six times the biological count. A database of stopped trials is not the same thing as a database in which every drug failed.`,
          ],
        };
      }
      if (section.heading === "Recruitment is the largest named primary reason") {
        return {
          ...section,
          body: [
            `Recruitment and accrual problems account for ${n(reasons.RECRUITMENT || 0)} records, making recruitment the largest named primary reason in the current V2 snapshot. That has a very different interpretation from a failed endpoint. A study can be scientifically plausible and still become infeasible because too few eligible participants enroll or because enrollment is too slow.`,
            `Business strategy contributes ${n(reasons.BUSINESS_STRATEGY || 0)} records and funding contributes ${n(reasons.FUNDING || 0)}. These records can be highly relevant to portfolio analysis, but they should not be used as evidence that the underlying mechanism or treatment was disproven.`,
          ],
        };
      }
      if (section.heading === "Cause not stated is not a hidden biological failure") {
        return {
          ...section,
          body: [
            `${n(causeNotStated)} records report a decision or program action without the reason behind it. These records are informative about what happened, but not about why. Treating them as operational or biological would create confidence that the source does not support.`,
            `${n(v2.reviewGated)} unknown records require the same restraint. Some have missing stop text; others contain language that is too vague or novel for a reliable rule. They remain visible so users can distinguish missing evidence from a classified negative result.`,
          ],
        };
      }
      return section;
    }),
    tables: [
      {
        heading: "What the V2 outcomes show",
        columns: ["Outcome", "Records and share"],
        rows: [
          ["Non-biological stop", `${n(nonBiological)} (${pctFromCounts(nonBiological, stats.total)})`],
          ["Unknown / review-gated", `${n(v2.reviewGated)} (${pctFromCounts(v2.reviewGated, stats.total)})`],
          ["Biological failure", `${n(biological)} (${pctFromCounts(biological, stats.total)})`],
          ["Cause not stated", `${n(causeNotStated)} (${pctFromCounts(causeNotStated, stats.total)})`],
          ["Non-failure transition", `${n(transition)} (${pctFromCounts(transition, stats.total)})`],
          ["Mixed causes", `${n(mixed)} (${pctFromCounts(mixed, stats.total)})`],
        ],
      },
      {
        heading: "Biological signal composition",
        columns: ["Signal", "Records and biological share"],
        rows: [
          ["Efficacy / futility", `${n(efficacy)} (${pctFromCounts(efficacy, biological)})`],
          ["Safety", `${n(safety)} (${pctFromCounts(safety, biological)})`],
          ["Biological, unspecified", `${n(biologicalUnspecified)} (${pctFromCounts(biologicalUnspecified, biological)})`],
        ],
      },
      {
        heading: "Largest named primary reasons",
        columns: ["Primary reason", "Records"],
        rows: [
          ["Recruitment", n(reasons.RECRUITMENT || 0)],
          ["Business strategy", n(reasons.BUSINESS_STRATEGY || 0)],
          ["Funding", n(reasons.FUNDING || 0)],
          ["Efficacy / futility", n(efficacy)],
          ["Staffing / resources", n(reasons.STAFFING_RESOURCES || 0)],
          ["Protocol feasibility", n(reasons.PROTOCOL_FEASIBILITY || 0)],
          ["Supply / manufacturing", n(reasons.SUPPLY_MANUFACTURING || 0)],
          ["Safety", n(safety)],
          ["Regulatory", n(reasons.REGULATORY || 0)],
        ],
      },
    ],
  };
}

function hydrateTerminatedArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const efficacy = b(stats, "EFFICACY/FUTILITY");
  const safety = b(stats, "SAFETY");
  const operational = b(stats, "OPERATIONAL");
  const other = b(stats, "OTHER/UNKNOWN");
  const regulatory = b(stats, "REGULATORY");

  return {
    ...article,
    metaDescription: `A data-backed explanation of why terminated clinical trials should not automatically be treated as scientific failures, using ${n(stats.total)} stopped trial records.`,
    facts: [
      `The current dataset contains ${n(stats.total)} stopped clinical trial records.`,
      `${n(stats.statuses.terminated)} records are terminated, ${n(stats.statuses.withdrawn)} are withdrawn, and ${n(stats.statuses.suspended)} are suspended.`,
      `Only ${n(stats.scientificCount)} records, or ${stats.scientificShare}, are classified as likely biological failure signals from efficacy/futility or safety language.`,
      `Operational stop reasons are the largest bucket with ${n(operational)} records.`,
      `Other or unclear stop reasons account for ${n(other)} records, which is why source review still matters.`,
    ],
    sections: article.sections.map((section) => {
      if (section.heading !== "What the stopped-trial dataset shows") return section;
      return {
        ...section,
        body: [
          `Across ${n(stats.total)} stopped records, operational reasons dominate. There are ${n(operational)} operational stops, compared with ${n(efficacy)} efficacy/futility stops and ${n(safety)} safety stops.`,
          "That does not mean efficacy and safety failures are rare in absolute terms. It means they are much smaller than the full universe of terminated, withdrawn, and suspended trial records. The useful workflow is to separate status from reason before drawing conclusions.",
        ],
      };
    }),
    tables: [
      {
        heading: "Stopped trial status mix",
        columns: ["Status", "Records"],
        rows: [
          ["Terminated", n(stats.statuses.terminated)],
          ["Withdrawn", n(stats.statuses.withdrawn)],
          ["Suspended", n(stats.statuses.suspended)],
        ],
      },
      {
        heading: "Stop-reason buckets",
        columns: ["Reason bucket", "Records"],
        rows: [
          ["Operational", n(operational)],
          ["Other/unknown", n(other)],
          ["Efficacy/futility", n(efficacy)],
          ["Safety", n(safety)],
          ["Regulatory", n(regulatory)],
        ],
      },
    ],
  };
}

function hydrateOncologyArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const oncology = stats.oncology;
  const operational = oncology.buckets.OPERATIONAL || 0;
  const other = oncology.buckets["OTHER/UNKNOWN"] || 0;
  const efficacy = oncology.buckets["EFFICACY/FUTILITY"] || 0;
  const safety = oncology.buckets.SAFETY || 0;
  const regulatory = oncology.buckets.REGULATORY || 0;

  const phase2Operational = oncology.phase2Buckets.OPERATIONAL || 0;
  const phase2Other = oncology.phase2Buckets["OTHER/UNKNOWN"] || 0;
  const phase2Efficacy = oncology.phase2Buckets["EFFICACY/FUTILITY"] || 0;
  const phase2Safety = oncology.phase2Buckets.SAFETY || 0;
  const phase2Regulatory = oncology.phase2Buckets.REGULATORY || 0;

  const topSponsorNames = oncology.topSponsors.slice(0, 3).map((item) => item.label).join(", ");
  const topSponsorSentence = oncology.topSponsors.length
    ? `The largest oncology sponsors by stopped-record count include ${topSponsorNames}.`
    : "The largest oncology sponsors by stopped-record count update with the current dataset.";

  return {
    ...article,
    facts: [
      `Oncology accounts for ${n(oncology.total)} stopped records in the current dataset.`,
      `Oncology has ${n(oncology.scientificCount)} likely biological failure signals: ${n(efficacy)} efficacy/futility and ${n(safety)} safety records.`,
      `Phase II appears in ${n(oncology.phase2Total)} oncology stopped records.`,
      `Within oncology Phase II records, ${n(phase2Efficacy)} are efficacy/futility and ${n(phase2Safety)} are safety stops.`,
      topSponsorSentence,
    ],
    sections: article.sections.map((section) => {
      if (section.heading === "Why oncology Phase II is worth separating") {
        return {
          ...section,
          body: [
            `Oncology is not just another disease area in this dataset. It is the largest one, with ${n(oncology.total)} stopped records. That makes it useful for search demand, but also easy to misread if everything is grouped together.`,
            "Phase II is especially important because it often sits between early safety/tolerability work and larger confirmatory trials. A stop at this point can be a stronger signal about efficacy, futility, dose, endpoint, or patient-selection problems.",
          ],
        };
      }

      if (section.heading === "What the oncology slice shows") {
        return {
          ...section,
          body: [
            `In oncology, operational and unclear stop reasons are still the biggest groups: ${n(operational)} operational records and ${n(other)} other/unknown records. But the biological signal is large enough to study directly, with ${n(efficacy)} efficacy/futility stops and ${n(safety)} safety stops.`,
            "That is why the oncology view should not be just a list of terminated cancer trials. It should separate scientific signals from administrative noise.",
          ],
        };
      }

      if (section.heading === "The Phase II signal") {
        return {
          ...section,
          body: [
            `Phase II appears in ${n(oncology.phase2Total)} oncology stopped records. Inside that slice, the dataset includes ${n(phase2Efficacy)} efficacy/futility stops and ${n(phase2Safety)} safety stops.`,
            "Those are the records I would inspect first when looking for failed endpoints, weak activity, tolerability problems, or early signs that a program was not strong enough to continue.",
          ],
        };
      }

      if (section.heading === "Sponsor context matters") {
        return {
          ...section,
          body: [
            `The largest oncology stopped-trial sponsor counts include ${oncology.topSponsors
              .map((item) => `${item.label} with ${n(item.count)} records`)
              .join(", ")}.`,
            "Those counts should not be read as a simple ranking of bad performance. Large research centers and active sponsors naturally run more studies. The better use is comparison inside a reason bucket, phase, and disease context.",
          ],
        };
      }

      return section;
    }),
    tables: [
      {
        heading: "Oncology stop-reason buckets",
        columns: ["Reason bucket", "Oncology records"],
        rows: [
          ["Operational", n(operational)],
          ["Other/unknown", n(other)],
          ["Efficacy/futility", n(efficacy)],
          ["Safety", n(safety)],
          ["Regulatory", n(regulatory)],
        ],
      },
      {
        heading: "Oncology Phase II stop signals",
        columns: ["Reason bucket", "Phase II oncology records"],
        rows: [
          ["Operational", n(phase2Operational)],
          ["Other/unknown", n(phase2Other)],
          ["Efficacy/futility", n(phase2Efficacy)],
          ["Safety", n(phase2Safety)],
          ["Regulatory", n(phase2Regulatory)],
        ],
      },
      {
        heading: "Largest oncology stopped-trial sponsor counts",
        columns: ["Sponsor", "Oncology stopped records"],
        rows: oncology.topSponsors.map((item) => [item.label, n(item.count)]),
      },
    ],
    faqs: article.faqs.map((faq) => {
      if (faq.question === "How many oncology stopped trial records are in the dataset?") {
        return {
          ...faq,
          answer: `The current dataset contains ${n(oncology.total)} oncology stopped trial records.`,
        };
      }

      if (faq.question === "How many oncology records are likely biological failure signals?") {
        return {
          ...faq,
          answer: `There are ${n(oncology.scientificCount)} oncology records classified as likely biological failure signals: ${n(efficacy)} efficacy/futility records and ${n(safety)} safety records.`,
        };
      }

      return faq;
    }),
  };
}

function formatStatusRows(signalLabel: string, statuses: Record<string, number>): Array<[string, string]> {
  return [
    [`${signalLabel} terminated`, n(statuses.TERMINATED || 0)],
    [`${signalLabel} withdrawn`, n(statuses.WITHDRAWN || 0)],
    [`${signalLabel} suspended`, n(statuses.SUSPENDED || 0)],
  ];
}

function formatTopRows(prefix: string, rows: Array<{ label: string; count: number }>, limit = 5): Array<[string, string]> {
  return rows.slice(0, limit).map((row) => [`${prefix}: ${row.label}`, n(row.count)]);
}

function hydrateSignalComparisonArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const efficacy = stats.signalComparison.efficacy;
  const safety = stats.signalComparison.safety;
  const efficacyTopArea = efficacy.topAreas[0];
  const safetyTopArea = safety.topAreas[0];
  const efficacyTopPhase = efficacy.phases[0];
  const safetyTopPhase = safety.phases[0];

  return {
    ...article,
    facts: [
      `The dataset contains ${n(efficacy.total)} efficacy/futility records and ${n(safety.total)} safety records.`,
      `Efficacy/futility records are mostly terminated trials, with ${n(efficacy.statuses.TERMINATED || 0)} terminated records.`,
      `Safety records include ${n(safety.statuses.TERMINATED || 0)} terminated, ${n(safety.statuses.WITHDRAWN || 0)} withdrawn, and ${n(safety.statuses.SUSPENDED || 0)} suspended records.`,
      `${efficacyTopArea?.label || "Oncology"} is the largest efficacy/futility disease area with ${n(efficacyTopArea?.count || 0)} records; ${safetyTopArea?.label || "Oncology"} is the largest safety disease area with ${n(safetyTopArea?.count || 0)} records.`,
      `${efficacyTopPhase?.label || "Phase II"} is the largest efficacy/futility phase group, while ${safetyTopPhase?.label || "Phase II"} is the largest safety phase group.`,
    ],
    sections: article.sections.map((section) => {
      if (section.heading === "What the dataset shows") {
        return {
          ...section,
          body: [
            `In the current stopped-trial dataset, efficacy/futility signals are larger than safety signals: ${n(efficacy.total)} efficacy/futility records versus ${n(safety.total)} safety records. That does not make safety less important. It means the two should be reviewed side by side, not collapsed into one vague failure bucket.`,
            `Most records in both groups are terminated trials: ${n(efficacy.statuses.TERMINATED || 0)} efficacy/futility records and ${n(safety.statuses.TERMINATED || 0)} safety records. Still, withdrawn and suspended records appear in both buckets, which is another reminder that trial status alone is not enough. The stop reason is doing the real work.`,
          ],
        };
      }
      return section;
    }),
    tables: [
      {
        heading: "Signal counts by stop-reason type",
        columns: ["Signal type", "Records"],
        rows: [
          ["Efficacy/futility", n(efficacy.total)],
          ["Safety", n(safety.total)],
        ],
      },
      {
        heading: "Status mix inside each signal",
        columns: ["Status", "Records"],
        rows: [...formatStatusRows("Efficacy/futility", efficacy.statuses), ...formatStatusRows("Safety", safety.statuses)],
      },
      {
        heading: "Top disease areas",
        columns: ["Disease area", "Records"],
        rows: [...formatTopRows("Efficacy/futility", efficacy.topAreas), ...formatTopRows("Safety", safety.topAreas)],
      },
      {
        heading: "Phase mix",
        columns: ["Phase", "Records"],
        rows: [...formatTopRows("Efficacy/futility", efficacy.phases, 4), ...formatTopRows("Safety", safety.phases, 4)],
      },
    ],
  };
}

function hydrateEndpointArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const endpoint = stats.endpointSignals;
  const topArea = endpoint.topAreas[0];

  return {
    ...article,
    facts: [
      `The current database contains ${n(endpoint.total)} stopped records with endpoint, efficacy, futility, or weak-benefit language.`,
      `${n(endpoint.statuses.TERMINATED || 0)} of those records are terminated, ${n(endpoint.statuses.WITHDRAWN || 0)} are withdrawn, and ${n(endpoint.statuses.SUSPENDED || 0)} are suspended.`,
      `${topArea?.label || "Oncology"} is the largest disease area in this slice with ${n(topArea?.count || 0)} records.`,
      "Endpoint failure language can mean lack of efficacy, futility, no treatment effect, missed endpoints, or insufficient benefit.",
      "The classification is a screening signal and should be verified against the original NCT record.",
    ],
    tables: [
      {
        heading: "Endpoint-related stopped records",
        columns: ["Dataset signal", "Current records"],
        rows: [
          ["Endpoint, efficacy, or futility signals", n(endpoint.total)],
          ["Terminated", n(endpoint.statuses.TERMINATED || 0)],
          ["Withdrawn", n(endpoint.statuses.WITHDRAWN || 0)],
          ["Suspended", n(endpoint.statuses.SUSPENDED || 0)],
        ],
      },
      {
        heading: "Largest disease areas",
        columns: ["Disease area", "Records"],
        rows: endpoint.topAreas.slice(0, 6).map((item): [string, string] => [item.label, n(item.count)]),
      },
      {
        heading: "Largest sponsor counts",
        columns: ["Sponsor", "Records"],
        rows: endpoint.topSponsors.slice(0, 6).map((item): [string, string] => [item.label, n(item.count)]),
      },
    ],
  };
}

function hydrateEnrollmentArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const enrollment = stats.enrollmentSignals;
  const topArea = enrollment.topAreas[0];

  return {
    ...article,
    facts: [
      `The current database contains ${n(enrollment.total)} stopped records with enrollment, recruitment, or accrual-related language.`,
      `${n(enrollment.statuses.TERMINATED || 0)} of those records are terminated, ${n(enrollment.statuses.WITHDRAWN || 0)} are withdrawn, and ${n(enrollment.statuses.SUSPENDED || 0)} are suspended.`,
      `${topArea?.label || "Oncology"} is the largest disease area in this enrollment-related slice with ${n(topArea?.count || 0)} records.`,
      "Enrollment failure can reflect feasibility, trial design, competition, site activation, patient availability, or changing standards of care.",
      "These records are useful, but they should not be read as automatic proof that an intervention failed biologically.",
    ],
    tables: [
      {
        heading: "Enrollment-related stopped records",
        columns: ["Dataset signal", "Current records"],
        rows: [
          ["Enrollment, recruitment, or accrual signals", n(enrollment.total)],
          ["Terminated", n(enrollment.statuses.TERMINATED || 0)],
          ["Withdrawn", n(enrollment.statuses.WITHDRAWN || 0)],
          ["Suspended", n(enrollment.statuses.SUSPENDED || 0)],
        ],
      },
      {
        heading: "Largest disease areas",
        columns: ["Disease area", "Records"],
        rows: enrollment.topAreas.slice(0, 6).map((item): [string, string] => [item.label, n(item.count)]),
      },
      {
        heading: "Largest sponsor counts",
        columns: ["Sponsor", "Records"],
        rows: enrollment.topSponsors.slice(0, 6).map((item): [string, string] => [item.label, n(item.count)]),
      },
    ],
  };
}

function hydratePredictionMarketsArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const efficacy = b(stats, "EFFICACY/FUTILITY");
  const safety = b(stats, "SAFETY");

  return {
    ...article,
    facts: [
      "Kalshi has announced a pilot for markets tied to clinical trial outcomes and FDA regulatory decisions.",
      "I do not think clinical trial outcomes should be treated like casual betting events.",
      "Clinical Trial Failures is not a prediction market, betting service, investment advisory service, or medical advisory service.",
      `The current database contains ${n(stats.total)} stopped clinical trial records from ClinicalTrials.gov-derived data.`,
      `Only ${n(stats.scientificCount)} stopped records are classified as likely biological failure signals, which is why context matters before calling any trial a failure.`,
    ],
    tables: [
      article.tables[0],
      {
        heading: "Why historical context matters",
        columns: ["Dataset signal", "Current records"],
        rows: [
          ["Stopped clinical trial records", n(stats.total)],
          ["Likely biological failure signals", n(stats.scientificCount)],
          ["Efficacy/futility signals", n(efficacy)],
          ["Safety signals", n(safety)],
        ],
      },
    ],
  };
}

function hydrateOperationalArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const operational = stats.operationalSignals;
  const operationalShare = stats.total ? `${((operational.total / stats.total) * 100).toFixed(1)}%` : "0.0%";
  const topArea = operational.topAreas[0];
  const topSponsor = operational.topSponsors[0];

  return {
    ...article,
    metaDescription: `A data-backed analysis of ${n(operational.total)} operational clinical trial stops, representing ${operationalShare} of ${n(stats.total)} stopped records in the current database.`,
    dek: `${n(operational.total)} records, or ${operationalShare} of the stopped-trial database, are classified as operational. That is the strongest reason not to treat every stopped trial as a failed drug.`,
    facts: [
      `The current database contains ${n(stats.total)} terminated, suspended, and withdrawn trial records.`,
      `${n(operational.total)} records, or ${operationalShare}, are classified as operational stops.`,
      `${n(operational.statuses.TERMINATED || 0)} operational records are terminated, ${n(operational.statuses.WITHDRAWN || 0)} are withdrawn, and ${n(operational.statuses.SUSPENDED || 0)} are suspended.`,
      topArea ? `${topArea.label} is the largest operational disease-area slice with ${n(topArea.count)} records.` : "No disease-area slice is available.",
      topSponsor ? `${topSponsor.label} has the largest operational stopped-record count in this dataset with ${n(topSponsor.count)} records.` : "No sponsor count is available.",
    ],
    tables: [
      {
        heading: "Operational stop status mix",
        columns: ["Trial status", "Operational records"],
        rows: [
          ["Terminated", n(operational.statuses.TERMINATED || 0)],
          ["Withdrawn", n(operational.statuses.WITHDRAWN || 0)],
          ["Suspended", n(operational.statuses.SUSPENDED || 0)],
        ],
      },
      {
        heading: "Operational stops compared with biological signals",
        columns: ["Reason classification", "Current records"],
        rows: [
          ["Operational", n(operational.total)],
          ["Efficacy/futility", n(stats.buckets["EFFICACY/FUTILITY"] || 0)],
          ["Safety", n(stats.buckets.SAFETY || 0)],
        ],
      },
      {
        heading: "Largest operational disease-area slices",
        columns: ["Disease area", "Operational records"],
        rows: operational.topAreas.slice(0, 6).map((item): [string, string] => [item.label, n(item.count)]),
      },
      {
        heading: "Largest operational sponsor counts",
        columns: ["Sponsor", "Operational records"],
        rows: operational.topSponsors.slice(0, 6).map((item): [string, string] => [item.label, n(item.count)]),
      },
    ],
  };
}

function hydrateDiseaseAreaShareArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const areas = stats.diseaseAreaSignalShares;
  const leader = areas[0];
  const oncology = areas.find((item) => item.label === "Oncology");
  const leaderFact = leader
    ? `${leader.label} has the highest biological-signal share among disease areas with at least 200 stopped records: ${leader.scientificShare} (${n(leader.scientificCount)} of ${n(leader.total)}).`
    : "No disease-area comparison is available in the current dataset.";
  const oncologyFact = oncology
    ? `Oncology is the largest disease-area slice with ${n(oncology.total)} stopped records, including ${n(oncology.scientificCount)} biological signals, a ${oncology.scientificShare} share.`
    : "The oncology slice is not available in the current dataset.";

  return {
    ...article,
    metaDescription: leader && oncology
      ? `Oncology has ${n(oncology.total)} stopped trials, but ${leader.label} leads disease areas with at least 200 records by biological-signal share at ${leader.scientificShare}.`
      : article.metaDescription,
    dek: leader && oncology
      ? `Oncology contains ${n(oncology.total)} stopped records, but its ${oncology.scientificShare} biological-signal share does not lead the disease-area comparison. ${leader.label} ranks highest among areas with at least 200 records.`
      : article.dek,
    facts: [
      `The current database contains ${n(stats.total)} stopped clinical trial records across its disease-area taxonomy.`,
      oncologyFact,
      leaderFact,
      "The comparison includes only disease areas with at least 200 stopped records to reduce small-sample distortion.",
      "These percentages describe efficacy/futility and safety signals within stopped records; they are not overall clinical trial failure rates.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading !== "The short version" || !leader || !oncology) return section;
      return {
        ...section,
        body: [
          `Oncology is the largest disease area in the stopped-trial database with ${n(oncology.total)} records. That makes it the easiest area to notice, search, and quote. It does not make oncology the disease area with the highest concentration of likely biological failure signals: ${n(oncology.scientificCount)} oncology records are classified as efficacy/futility or safety, a ${oncology.scientificShare} share.`,
          `${leader.label} ranks highest among disease areas with at least 200 stopped records, with ${n(leader.scientificCount)} biological signals among ${n(leader.total)} records (${leader.scientificShare}). This is a useful reminder that volume and concentration answer different questions.`,
        ],
      };
    }),
    tables: [
      {
        heading: "Biological-signal share by disease area",
        columns: ["Disease area", "Signals / stopped records"],
        rows: areas.slice(0, 10).map((item): [string, string] => [
          item.label,
          `${item.scientificShare} (${n(item.scientificCount)} / ${n(item.total)})`,
        ]),
      },
      {
        heading: "Efficacy and safety composition",
        columns: ["Disease area", "Efficacy / safety"],
        rows: areas.slice(0, 10).map((item): [string, string] => [
          item.label,
          `${n(item.efficacyCount)} / ${n(item.safetyCount)}`,
        ]),
      },
    ],
  };
}

function hydratePhaseThreeArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const phaseThree = stats.phaseSignalComparison.find((phase) => phase.key === "PHASE3");
  const rankedMajorPhases = stats.phaseSignalComparison
    .filter((phase) => ["PHASE1", "PHASE2", "PHASE3", "PHASE4"].includes(phase.key))
    .sort((a, b) => {
      const shareA = a.total ? a.scientificCount / a.total : 0;
      const shareB = b.total ? b.scientificCount / b.total : 0;
      return shareB - shareA;
    });

  if (!phaseThree) return article;

  return {
    ...article,
    metaDescription: `${n(phaseThree.scientificCount)} of ${n(phaseThree.total)} stopped Phase III trial records (${phaseThree.scientificShare}) carry efficacy/futility or safety signals in the current database.`,
    dek: `${n(phaseThree.scientificCount)} of ${n(phaseThree.total)} stopped Phase III records (${phaseThree.scientificShare}) carry efficacy/futility or safety signals, the highest share among the major development phases.`,
    facts: [
      `The current database contains ${n(phaseThree.total)} stopped records that include a Phase III label.`,
      `${n(phaseThree.scientificCount)} Phase III records, or ${phaseThree.scientificShare}, are classified as likely biological failure signals.`,
      `Efficacy/futility accounts for ${n(phaseThree.efficacyCount)} Phase III records, compared with ${n(phaseThree.safetyCount)} safety records.`,
      `Operational reasons account for ${n(phaseThree.operationalCount)} stopped Phase III records, while ${n(phaseThree.otherCount)} are other or unknown.`,
      "The denominator contains stopped Phase III records only, so this is not an overall Phase III failure rate.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading !== "The headline result") return section;
      return {
        ...section,
        body: [
          `Phase III is where clinical development becomes expensive, confirmatory, and much more visible. In the current stopped-trial database, ${n(phaseThree.scientificCount)} of ${n(phaseThree.total)} Phase III records (${phaseThree.scientificShare}) are classified as likely biological failure signals. That is the highest share among the major development phases represented here.`,
          "The result is directionally useful, but it needs careful wording. It does not mean that Phase III trials have that overall failure rate. The denominator contains stopped trials only. It tells us how stop reasons are distributed inside the stopped Phase III slice.",
        ],
      };
    }),
    tables: [
      {
        heading: "Stopped Phase III reason mix",
        columns: ["Reason classification", "Phase III records"],
        rows: [
          ["Operational", n(phaseThree.operationalCount)],
          ["Other/unknown", n(phaseThree.otherCount)],
          ["Efficacy/futility", n(phaseThree.efficacyCount)],
          ["Safety", n(phaseThree.safetyCount)],
          ["Regulatory", n(phaseThree.regulatoryCount)],
        ],
      },
      {
        heading: "Biological-signal share across major phases",
        columns: ["Development phase", "Signals / stopped records"],
        rows: rankedMajorPhases.map((phase): [string, string] => [
          phase.label,
          `${phase.scientificShare} (${n(phase.scientificCount)} / ${n(phase.total)})`,
        ]),
      },
    ],
  };
}

function hydratePhaseSignalShiftArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const phases = stats.phaseSignalComparison.filter((phase) =>
    ["PHASE1", "PHASE2", "PHASE3"].includes(phase.key)
  );
  const phaseOne = phases.find((phase) => phase.key === "PHASE1");
  const phaseTwo = phases.find((phase) => phase.key === "PHASE2");
  const phaseThree = phases.find((phase) => phase.key === "PHASE3");
  if (!phaseOne || !phaseTwo || !phaseThree) return article;

  const phaseOneSafetyShare = phaseOne.scientificCount
    ? `${((phaseOne.safetyCount / phaseOne.scientificCount) * 100).toFixed(1)}%`
    : "0.0%";
  const phaseThreeEfficacyShare = phaseThree.scientificCount
    ? `${((phaseThree.efficacyCount / phaseThree.scientificCount) * 100).toFixed(1)}%`
    : "0.0%";

  return {
    ...article,
    metaDescription: `Safety leads efficacy ${n(phaseOne.safetyCount)} to ${n(phaseOne.efficacyCount)} in stopped Phase I records, while efficacy leads in Phase II and Phase III.`,
    dek: `Safety accounts for ${phaseOneSafetyShare} of Phase I biological signals. In Phase III, efficacy/futility accounts for ${phaseThreeEfficacyShare}. The composition changes as development advances.`,
    facts: [
      `Phase I has ${n(phaseOne.safetyCount)} safety signals and ${n(phaseOne.efficacyCount)} efficacy/futility signals among stopped records.`,
      `${phaseOneSafetyShare} of classified Phase I biological signals are safety-related.`,
      `Phase II has ${n(phaseTwo.efficacyCount)} efficacy/futility signals and ${n(phaseTwo.safetyCount)} safety signals.`,
      `Phase III has ${n(phaseThree.efficacyCount)} efficacy/futility signals and ${n(phaseThree.safetyCount)} safety signals.`,
      "These are signal counts inside stopped records, not overall failure probabilities for trials entering each phase.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading !== "The pattern across development") return section;
      return {
        ...section,
        body: [
          `The biological failure signal is not the same at every stage of clinical development. In Phase I stopped records, safety signals outnumber efficacy/futility ${n(phaseOne.safetyCount)} to ${n(phaseOne.efficacyCount)}. The relationship reverses in Phase II (${n(phaseTwo.efficacyCount)} efficacy/futility versus ${n(phaseTwo.safetyCount)} safety) and becomes wider in Phase III (${n(phaseThree.efficacyCount)} versus ${n(phaseThree.safetyCount)}).`,
          "This is one of the clearest phase-level patterns in the database. It also matches the different questions the phases are designed to answer: early development emphasizes tolerability, exposure, and dose, while later development increasingly tests whether benefit is strong and reliable enough.",
        ],
      };
    }),
    tables: [
      {
        heading: "Safety versus efficacy signals by phase",
        columns: ["Development phase", "Efficacy / safety"],
        rows: phases.map((phase): [string, string] => [
          phase.label,
          `${n(phase.efficacyCount)} / ${n(phase.safetyCount)}`,
        ]),
      },
      {
        heading: "Biological signals within stopped records",
        columns: ["Development phase", "Signals / stopped records"],
        rows: phases.map((phase): [string, string] => [
          phase.label,
          `${phase.scientificShare} (${n(phase.scientificCount)} / ${n(phase.total)})`,
        ]),
      },
    ],
  };
}

function hydratePatientHedgeArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  return {
    ...article,
    facts: [
      "Kalshi and AppliedXL launched a limited pilot for selected clinical trial outcomes and FDA decisions in July 2026.",
      "Kalshi says participants in the relevant trials are barred from trading, and initial trial markets are listed after enrollment closes.",
      "Polymarket has carried biopharma-related contracts, while Endpoint Arena entered the field using paper trading rather than real-money positions.",
      `The current Clinical Trial Failures database contains ${n(stats.total)} stopped records, but only ${n(stats.scientificCount)} (${stats.scientificShare}) carry efficacy/futility or safety signals.`,
      "A market-implied probability is not clinical evidence, a patient prognosis, insurance, or medical advice.",
    ],
    tables: [
      {
        heading: "What the current platforms actually provide",
        columns: ["Platform", "Relevant model"],
        rows: [
          ["Kalshi", "Real-money event contracts; limited biopharma pilot with participant restrictions"],
          ["Polymarket", "Prediction contracts, including biopharma and FDA-related events"],
          ["Endpoint Arena", "Trial-focused forecasting in pilot mode using paper trading"],
        ],
      },
      {
        heading: "Why historical context still matters",
        columns: ["Dataset signal", "Current records"],
        rows: [
          ["Stopped clinical trial records", n(stats.total)],
          ["Likely biological failure signals", n(stats.scientificCount)],
          ["Efficacy/futility signals", n(stats.buckets["EFFICACY/FUTILITY"] || 0)],
          ["Safety signals", n(stats.buckets.SAFETY || 0)],
        ],
      },
    ],
  };
}

function hydrateUnknownReasonsArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const unknown = stats.unknownSignals;
  const share = pctFromCounts(unknown.total, stats.total);
  const terminated = unknown.statuses.TERMINATED || 0;
  const withdrawn = unknown.statuses.WITHDRAWN || 0;
  const suspended = unknown.statuses.SUSPENDED || 0;

  return {
    ...article,
    metaDescription: `${n(unknown.total)} stopped clinical trial records (${share}) remain other or unknown because the available source language does not support a confident failure classification.`,
    dek: `${n(unknown.total)} stopped records, or ${share} of the current database, remain other or unknown. Preserving that uncertainty is part of reliable analysis, not unfinished classification work.`,
    facts: [
      `The current database contains ${n(unknown.total)} other/unknown records, representing ${share} of ${n(stats.total)} stopped trials.`,
      `${n(terminated)} other/unknown records are terminated, ${n(withdrawn)} are withdrawn, and ${n(suspended)} are suspended.`,
      unknown.topAreas[0]
        ? `${unknown.topAreas[0].label} is the largest disease-area slice with ${n(unknown.topAreas[0].count)} other/unknown records.`
        : "No disease-area slice is available.",
      unknown.phases[0]
        ? `${unknown.phases[0].label} is the largest phase group with ${n(unknown.phases[0].count)} other/unknown records.`
        : "No phase group is available.",
      "Other/unknown means the public source does not support a more specific label; it does not prove a scientific or non-scientific cause.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading !== "The largest classification is uncertainty") return section;
      return {
        ...section,
        body: [
          `A stopped clinical trial looks like a simple event until the reason field is opened. In the current database, ${n(unknown.total)} of ${n(stats.total)} records (${share}) remain other or unknown because the available text does not support a defensible efficacy, safety, operational, or regulatory classification.`,
          "That is not an invitation to guess or an indication that analysis is incomplete. It is a measurable result about the limits of public registry language and the confidence that can reasonably be attached to it.",
        ],
      };
    }),
    tables: [
      {
        heading: "Other and unknown records by status",
        columns: ["Trial status", "Other/unknown records"],
        rows: [
          ["Terminated", n(terminated)],
          ["Withdrawn", n(withdrawn)],
          ["Suspended", n(suspended)],
        ],
      },
      {
        heading: "Largest other/unknown disease-area slices",
        columns: ["Disease area", "Other/unknown records"],
        rows: unknown.topAreas.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
      {
        heading: "Largest other/unknown phase groups",
        columns: ["Phase", "Other/unknown records"],
        rows: unknown.phases.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
    ],
    faqs: article.faqs.map((faq) => {
      if (faq.question === "Why are so many clinical trial stop reasons unknown?") {
        return {
          ...faq,
          answer: `${n(unknown.total)} records (${share}) are currently other or unknown. Many contain no explanation or language too general to separate scientific, operational, strategic, or regulatory causes confidently.`,
        };
      }
      return faq;
    }),
  };
}

function hydrateRegulatoryStopsArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const regulatory = stats.regulatorySignals;
  const share = pctFromCounts(regulatory.total, stats.total);
  const terminated = regulatory.statuses.TERMINATED || 0;
  const withdrawn = regulatory.statuses.WITHDRAWN || 0;
  const suspended = regulatory.statuses.SUSPENDED || 0;

  return {
    ...article,
    metaDescription: `Only ${n(regulatory.total)} stopped clinical trial records (${share}) are classified as regulatory in the current database. Regulatory action is not automatically a safety failure.`,
    dek: `Only ${n(regulatory.total)} of ${n(stats.total)} stopped records (${share}) are classified as regulatory. They deserve source review rather than being folded into safety or biological failure counts.`,
    facts: [
      `The current database contains ${n(regulatory.total)} regulatory-classified records, representing ${share} of all stopped records.`,
      `${n(terminated)} regulatory records are terminated, ${n(withdrawn)} are withdrawn, and ${n(suspended)} are suspended.`,
      regulatory.phases[0]
        ? `${regulatory.phases[0].label} is the largest regulatory phase group with ${n(regulatory.phases[0].count)} records.`
        : "No regulatory phase group is available.",
      regulatory.topAreas[0]
        ? `${regulatory.topAreas[0].label} is the largest disease-area slice with ${n(regulatory.topAreas[0].count)} regulatory records.`
        : "No regulatory disease-area slice is available.",
      "Regulatory identifies a decision context and should not be converted into a safety or biological-failure claim without supporting source evidence.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading === "A small category with outsized ambiguity") {
        return {
          ...section,
          body: [
            `Regulatory language attracts attention because it can suggest a clinical hold, an authority request, an approval issue, or another formal intervention. Yet only ${n(regulatory.total)} of ${n(stats.total)} stopped records (${share}) are classified as regulatory in the current database.`,
            "That small count makes careful interpretation more important, not less. A regulatory action can arise from safety, manufacturing, documentation, protocol, compliance, or information requirements. The label identifies the decision context; it does not by itself establish biological failure.",
          ],
        };
      }
      if (section.heading === "The status distribution is unusually balanced") {
        return {
          ...section,
          body: [
            `Regulatory records are distributed relatively evenly between terminated (${n(terminated)}) and withdrawn (${n(withdrawn)}) studies, with ${n(suspended)} suspended records. This is a reminder that regulatory language does not map neatly to one trial status.`,
            "A withdrawn study may never begin enrollment, a suspended study may potentially resume, and a terminated study has stopped early. The regulatory context and the study status need to be read together.",
          ],
        };
      }
      return section;
    }),
    tables: [
      {
        heading: "Regulatory records by status",
        columns: ["Trial status", "Regulatory records"],
        rows: [
          ["Terminated", n(terminated)],
          ["Withdrawn", n(withdrawn)],
          ["Suspended", n(suspended)],
        ],
      },
      {
        heading: "Largest regulatory phase groups",
        columns: ["Phase", "Regulatory records"],
        rows: regulatory.phases.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
      {
        heading: "Largest regulatory disease-area slices",
        columns: ["Disease area", "Regulatory records"],
        rows: regulatory.topAreas.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
    ],
    faqs: article.faqs.map((faq) => {
      if (faq.question === "Are regulatory stops common in the database?") {
        return {
          ...faq,
          answer: `No. The current database contains ${n(regulatory.total)} regulatory-classified records, representing ${share} of ${n(stats.total)} stopped trials.`,
        };
      }
      return faq;
    }),
  };
}

function hydrateSuspendedArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const suspended = stats.suspendedSignals;
  const operational = suspended.buckets.OPERATIONAL || 0;
  const other = suspended.buckets["OTHER/UNKNOWN"] || 0;
  const efficacy = suspended.buckets["EFFICACY/FUTILITY"] || 0;
  const safety = suspended.buckets.SAFETY || 0;
  const regulatory = suspended.buckets.REGULATORY || 0;
  const operationalOrUnknown = operational + other;
  const operationalOrUnknownShare = pctFromCounts(operationalOrUnknown, suspended.total);

  return {
    ...article,
    metaDescription: `Only ${suspended.scientificShare} of ${n(suspended.total)} suspended clinical trial records in the current database carry efficacy/futility or safety signals.`,
    dek: `Only ${n(suspended.scientificCount)} of ${n(suspended.total)} suspended records (${suspended.scientificShare}) carry efficacy/futility or safety signals. Operational and unclear reasons account for ${operationalOrUnknownShare}.`,
    facts: [
      `The current database contains ${n(suspended.total)} suspended clinical trial records.`,
      `${n(suspended.scientificCount)} suspended records, or ${suspended.scientificShare}, are classified as likely biological failure signals.`,
      `${n(operationalOrUnknown)} suspended records (${operationalOrUnknownShare}) are operational or other/unknown.`,
      `Safety and efficacy/futility are evenly split at ${n(safety)} suspended records each.`,
      suspended.topAreas[0]
        ? `${suspended.topAreas[0].label} is the largest suspended disease-area slice with ${n(suspended.topAreas[0].count)} records.`
        : "No suspended disease-area slice is available.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading === "The result is more mundane than the label sounds") {
        return {
          ...section,
          body: [
            `Suspended is a dramatic word. It can make a trial look as if a safety problem or failed biological hypothesis has already been established. In the current database, however, only ${n(suspended.scientificCount)} of ${n(suspended.total)} suspended records (${suspended.scientificShare}) carry efficacy/futility or safety classifications.`,
            `Operational and other/unknown reasons account for ${n(operationalOrUnknown)} records (${operationalOrUnknownShare}). That makes suspended status a useful alert, but a poor conclusion on its own. The reason field is what determines whether a record points toward the intervention, trial execution, or unresolved source language.`,
          ],
        };
      }
      if (section.heading === "Safety and efficacy signals are evenly split") {
        return {
          ...section,
          body: [
            `Within the small biological-signal subset, safety and efficacy/futility are evenly split at ${n(safety)} records each. That balance is different from the full stopped-trial database, where efficacy/futility is the larger biological category.`,
            "The distinction matters. A safety suspension raises questions about adverse events, dose, exposure, monitoring, and benefit-risk. An efficacy or futility suspension raises questions about treatment effect, endpoint assumptions, interim evidence, and whether continuing the study remains justified.",
          ],
        };
      }
      return section;
    }),
    tables: [
      {
        heading: "Suspended trial reason mix",
        columns: ["Reason classification", "Suspended records"],
        rows: [
          ["Other/unknown", n(other)],
          ["Operational", n(operational)],
          ["Efficacy/futility", n(efficacy)],
          ["Safety", n(safety)],
          ["Regulatory", n(regulatory)],
        ],
      },
      {
        heading: "Largest suspended disease-area slices",
        columns: ["Disease area", "Suspended records"],
        rows: suspended.topAreas.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
      {
        heading: "Largest suspended phase groups",
        columns: ["Phase", "Suspended records"],
        rows: suspended.phases.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
    ],
    faqs: article.faqs.map((faq) => {
      if (faq.question === "Are suspended trials usually stopped for safety?") {
        return {
          ...faq,
          answer: `No. Only ${n(safety)} of ${n(suspended.total)} suspended records in the current dataset are classified as safety signals. Operational and other or unknown explanations account for ${n(operationalOrUnknown)} records.`,
        };
      }
      return faq;
    }),
  };
}

function hydrateDiseaseAreaSignalMixArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const areas = stats.diseaseAreaSignalShares.filter((area) => area.scientificCount > 0);
  const bySafetyShare = [...areas].sort((a, b) => {
    const shareA = a.safetyCount / a.scientificCount;
    const shareB = b.safetyCount / b.scientificCount;
    return shareB - shareA || b.scientificCount - a.scientificCount;
  });
  const byEfficacyShare = [...areas].sort((a, b) => {
    const shareA = a.efficacyCount / a.scientificCount;
    const shareB = b.efficacyCount / b.scientificCount;
    return shareB - shareA || b.scientificCount - a.scientificCount;
  });
  const safetyLeader = bySafetyShare[0];
  const efficacyLeader = byEfficacyShare[0];
  const neurology = areas.find((area) => area.label === "Neurology");
  const oncology = areas.find((area) => area.label === "Oncology");

  const mixFact = (area: (typeof areas)[number], signal: "safety" | "efficacy") => {
    const count = signal === "safety" ? area.safetyCount : area.efficacyCount;
    return `${pctFromCounts(count, area.scientificCount)} (${n(count)} of ${n(area.scientificCount)})`;
  };

  return {
    ...article,
    metaDescription: safetyLeader && efficacyLeader
      ? `${safetyLeader.label} has the most safety-heavy biological signal mix, while ${efficacyLeader.label} leans most strongly toward efficacy among disease areas with 200+ stopped records.`
      : article.metaDescription,
    dek: safetyLeader && efficacyLeader
      ? `${safetyLeader.label} has the most safety-heavy biological-signal mix in the comparison. ${efficacyLeader.label} sits at the efficacy-heavy end. The reason mix changes materially by disease area.`
      : article.dek,
    facts: [
      safetyLeader
        ? `${safetyLeader.label} has the highest safety share among biological signals: ${mixFact(safetyLeader, "safety")}.`
        : "No safety-share leader is available in the current dataset.",
      efficacyLeader
        ? `${efficacyLeader.label} has the highest efficacy/futility share among biological signals: ${mixFact(efficacyLeader, "efficacy")}.`
        : "No efficacy-share leader is available in the current dataset.",
      neurology
        ? `Neurology contains ${n(neurology.efficacyCount)} efficacy/futility signals and ${n(neurology.safetyCount)} safety signals.`
        : "No neurology signal slice is available.",
      oncology
        ? `Oncology contributes ${n(oncology.efficacyCount)} efficacy/futility and ${n(oncology.safetyCount)} safety signals, the largest absolute biological-signal count.`
        : "No oncology signal slice is available.",
      "The comparison includes disease areas with at least 200 stopped records and does not estimate overall clinical trial failure rates.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading === "Non-oncology hematology leans toward safety" && safetyLeader) {
        return {
          ...section,
          heading: `${safetyLeader.label} leans toward safety`,
          body: [
            `${safetyLeader.label} has the clearest safety-heavy biological-signal mix in the comparison. Safety accounts for ${mixFact(safetyLeader, "safety")}, compared with ${n(safetyLeader.efficacyCount)} efficacy/futility signals.`,
            `This does not establish that ${safetyLeader.label.toLowerCase()} trials are generally less safe. The denominator contains stopped records only, and the biological-signal subset contains ${n(safetyLeader.scientificCount)} records. It shows what kind of source explanation appears more often when a stopped record in this slice carries a biological classification.`,
          ],
        };
      }
      if (section.heading === "Neurology points much more strongly toward efficacy" && neurology) {
        return {
          ...section,
          body: [
            `Neurology sits toward the efficacy-heavy side of the comparison. Its stopped records contain ${n(neurology.efficacyCount)} efficacy/futility signals and ${n(neurology.safetyCount)} safety signals. Efficacy therefore represents ${mixFact(neurology, "efficacy")} of its biological-signal subset.`,
            "That can direct the research workflow toward endpoints, treatment effect, futility analyses, patient selection, and whether a program produced enough measurable benefit. The pattern remains descriptive rather than predictive: it does not estimate the chance that a new neurology trial will fail.",
          ],
        };
      }
      if (section.heading === "Oncology is large and relatively balanced" && oncology) {
        return {
          ...section,
          body: [
            `Oncology contributes by far the largest number of biological signals in absolute terms: ${n(oncology.efficacyCount)} efficacy/futility and ${n(oncology.safetyCount)} safety records. Safety represents ${mixFact(oncology, "safety")} of that subset, making the mix much more balanced than in neurology or dermatology.`,
            "That scale makes oncology useful for subgroup analysis, but raw counts should not be confused with a higher underlying risk. Phase, intervention, condition, and source wording can all change the interpretation substantially.",
          ],
        };
      }
      return section;
    }),
    tables: [
      {
        heading: "Disease areas ranked by safety share",
        columns: ["Disease area", "Safety / biological signals"],
        rows: bySafetyShare.slice(0, 10).map((area): [string, string] => [
          area.label,
          `${pctFromCounts(area.safetyCount, area.scientificCount)} (${n(area.safetyCount)} / ${n(area.scientificCount)})`,
        ]),
      },
      {
        heading: "Disease areas ranked by efficacy share",
        columns: ["Disease area", "Efficacy / biological signals"],
        rows: byEfficacyShare.slice(0, 10).map((area): [string, string] => [
          area.label,
          `${pctFromCounts(area.efficacyCount, area.scientificCount)} (${n(area.efficacyCount)} / ${n(area.scientificCount)})`,
        ]),
      },
      {
        heading: "Absolute biological-signal counts",
        columns: ["Disease area", "Efficacy / safety"],
        rows: [...areas]
          .sort((a, b) => b.scientificCount - a.scientificCount)
          .slice(0, 10)
          .map((area): [string, string] => [area.label, `${n(area.efficacyCount)} / ${n(area.safetyCount)}`]),
      },
    ],
    faqs: article.faqs.map((faq) => {
      if (faq.question === "Which disease area has the most safety-heavy biological signal mix?" && safetyLeader) {
        return {
          ...faq,
          answer: `Among disease areas with at least 200 stopped records, ${safetyLeader.label} has the highest safety share in the current dataset: ${mixFact(safetyLeader, "safety")}.`,
        };
      }
      return faq;
    }),
  };
}

function hydrateWithdrawnArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const withdrawn = stats.withdrawnSignals;
  const operational = withdrawn.buckets.OPERATIONAL || 0;
  const other = withdrawn.buckets["OTHER/UNKNOWN"] || 0;
  const efficacy = withdrawn.buckets["EFFICACY/FUTILITY"] || 0;
  const safety = withdrawn.buckets.SAFETY || 0;
  const regulatory = withdrawn.buckets.REGULATORY || 0;

  return {
    ...article,
    metaDescription: `Only ${withdrawn.scientificShare} of ${n(withdrawn.total)} withdrawn clinical trial records in the current database carry efficacy/futility or safety failure signals.`,
    dek: `Only ${n(withdrawn.scientificCount)} of ${n(withdrawn.total)} withdrawn records (${withdrawn.scientificShare}) carry efficacy/futility or safety signals. Withdrawn status alone is weak evidence of drug failure.`,
    facts: [
      `The current database contains ${n(withdrawn.total)} withdrawn clinical trial records.`,
      `${n(withdrawn.scientificCount)} withdrawn records, or ${withdrawn.scientificShare}, are classified as likely biological failure signals.`,
      `${n(efficacy)} withdrawn records carry efficacy/futility signals and ${n(safety)} carry safety signals.`,
      `Operational reasons account for ${n(operational)} withdrawn records, while ${n(other)} are classified as other or unknown.`,
      withdrawn.topAreas[0]
        ? `${withdrawn.topAreas[0].label} is the largest withdrawn disease-area slice with ${n(withdrawn.topAreas[0].count)} records.`
        : "No withdrawn disease-area slice is available.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading !== "The headline result") return section;
      return {
        ...section,
        body: [
          `Withdrawn is one of the three stopped statuses covered by this database, alongside terminated and suspended. It is also one of the easiest labels to over-interpret. Only ${n(withdrawn.scientificCount)} of ${n(withdrawn.total)} withdrawn records (${withdrawn.scientificShare}) carry stop language classified as efficacy/futility or safety.`,
          `Most withdrawn records fall into operational (${n(operational)}) or other/unknown (${n(other)}) classifications. That does not make them unimportant. It means the status field alone is weak evidence for the claim that a drug, target, or biological hypothesis failed.`,
        ],
      };
    }),
    tables: [
      {
        heading: "Withdrawn trial stop-reason mix",
        columns: ["Reason classification", "Withdrawn records"],
        rows: [
          ["Other/unknown", n(other)],
          ["Operational", n(operational)],
          ["Safety", n(safety)],
          ["Regulatory", n(regulatory)],
          ["Efficacy/futility", n(efficacy)],
        ],
      },
      {
        heading: "Largest withdrawn phase groups",
        columns: ["Phase", "Withdrawn records"],
        rows: withdrawn.phases.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
      {
        heading: "Largest withdrawn disease-area slices",
        columns: ["Disease area", "Withdrawn records"],
        rows: withdrawn.topAreas.slice(0, 8).map((item): [string, string] => [item.label, n(item.count)]),
      },
    ],
  };
}

export function hydrateInsightArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  if (article.slug === "multinational-stopped-trials-biological-failure-signals") {
    return hydrateCountryScaleArticle(article, stats);
  }
  if (article.slug === "stopped-clinical-trial-can-meet-primary-endpoint") {
    return hydratePostedEndpointArticle(article, stats);
  }
  if (article.slug === "business-reasons-clinical-trial-termination") {
    return hydrateBusinessStrategyArticle(article, stats);
  }
  if (article.slug === "withdrawn-before-enrollment-not-recruitment-failure") {
    return hydrateNotInitiatedArticle(article, stats);
  }
  if (article.slug === "classification-v2-clinical-trial-stop-reasons") {
    return hydrateClassificationV2Article(article, stats);
  }
  if (article.slug === "most-stopped-clinical-trials-are-not-biological-failures") {
    return hydrateStoppedVsBiologicalArticle(article, stats);
  }
  if (article.slug === "could-clinical-trial-betting-hedge-risk-for-patients") {
    return hydratePatientHedgeArticle(article, stats);
  }
  if (article.slug === "unknown-clinical-trial-stop-reasons-are-a-data-signal") {
    return hydrateUnknownReasonsArticle(article, stats);
  }
  if (article.slug === "regulatory-clinical-trial-stops-are-not-safety-failures") {
    return hydrateRegulatoryStopsArticle(article, stats);
  }
  if (article.slug === "suspended-clinical-trials-rarely-mean-drug-failure") {
    return hydrateSuspendedArticle(article, stats);
  }
  if (article.slug === "safety-vs-efficacy-clinical-trial-signals-by-disease-area") {
    return hydrateDiseaseAreaSignalMixArticle(article, stats);
  }
  if (article.slug === "phase-3-clinical-trial-failure-signals") {
    return hydratePhaseThreeArticle(article, stats);
  }
  if (article.slug === "safety-vs-efficacy-signals-by-clinical-trial-phase") {
    return hydratePhaseSignalShiftArticle(article, stats);
  }
  if (article.slug === "oncology-volume-vs-biological-failure-signal-share") {
    return hydrateDiseaseAreaShareArticle(article, stats);
  }
  if (article.slug === "withdrawn-clinical-trials-rarely-show-biological-failure-signals") {
    return hydrateWithdrawnArticle(article, stats);
  }
  if (article.slug === "operational-reasons-dominate-stopped-clinical-trials") {
    return hydrateOperationalArticle(article, stats);
  }
  if (article.slug === "why-i-would-not-bet-on-clinical-trial-outcomes") {
    return hydratePredictionMarketsArticle(article, stats);
  }
  if (article.slug === "failed-endpoint-clinical-trial-signals") {
    return hydrateEndpointArticle(article, stats);
  }
  if (article.slug === "enrollment-failure-clinical-trials") {
    return hydrateEnrollmentArticle(article, stats);
  }
  if (article.slug === "terminated-clinical-trials-are-not-always-failures") {
    return hydrateTerminatedArticle(article, stats);
  }
  if (article.slug === "oncology-phase-2-clinical-trial-failure-signals") {
    return hydrateOncologyArticle(article, stats);
  }
  if (article.slug === "efficacy-vs-safety-clinical-trial-failure-signals") {
    return hydrateSignalComparisonArticle(article, stats);
  }
  return article;
}

export function hydrateInsightArticles(stats: InsightStats): InsightArticle[] {
  return sortInsightArticlesByDate(INSIGHT_ARTICLES.map((article) => hydrateInsightArticle(article, stats)));
}

export function getInsightBySlug(slug: string, stats?: InsightStats): InsightArticle | undefined {
  const article = INSIGHT_ARTICLES.find((item) => item.slug === slug);
  if (!article || !stats) return article;
  return hydrateInsightArticle(article, stats);
}

export function insightPath(article: Pick<InsightArticle, "slug">): string {
  return `/insights/${article.slug}`;
}
