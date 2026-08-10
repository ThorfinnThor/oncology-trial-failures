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
  withdrawnSignals: InsightSignalSlice & {
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
};

export type InsightSignalSlice = {
  total: number;
  statuses: Record<string, number>;
  phases: Array<{ label: string; count: number }>;
  topAreas: Array<{ label: string; count: number }>;
  topSponsors: Array<{ label: string; count: number }>;
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
        href: "/oncology-clinical-trial-failures",
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
