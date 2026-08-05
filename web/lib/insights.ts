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
  latestUpdates: {
    startDate: string;
    endDate: string;
    total: number;
    scientificCount: number;
    statuses: Record<string, number>;
    buckets: Record<string, number>;
    topAreas: Array<{ label: string; count: number }>;
    topSponsors: Array<{ label: string; count: number }>;
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
    slug: "latest-stopped-clinical-trial-updates-two-week-review",
    title: "Latest stopped clinical trial updates: a two-week data review",
    metaDescription:
      "A data-backed review of the latest two-week window of terminated, suspended, and withdrawn clinical trial updates in the Clinical Trial Failures database.",
    eyebrow: "Latest dataset review",
    dek:
      "What changed in the newest two-week window of the database, which stop reasons appeared most often, and which records deserve closer source review.",
    datePublished: "2026-08-05",
    readingTime: "7 min read",
    keyword: "new failed clinical trials",
    facts: [],
    sections: [
      {
        heading: "What this update actually measures",
        body: [
          "This review covers stopped clinical trial records whose ClinicalTrials.gov update date falls inside the latest fourteen-day window available in the current ingest. It includes terminated, suspended, and withdrawn studies.",
          "Updated does not necessarily mean newly created. A sponsor can revise an older registry record, change its status, or add a clearer stop reason. Until consecutive dataset snapshots are compared by NCT ID, the honest description is recently updated stopped records rather than brand-new failures.",
        ],
      },
      {
        heading: "The main pattern in the latest window",
        body: [
          "The largest group is not automatically the most scientifically important group. Operational and unclear reasons can dominate a short update window, while efficacy, futility, and safety records form a smaller but more biologically relevant subset.",
          "That distinction is the reason this database separates status from stop reason. A terminated study caused by enrollment or funding does not tell the same story as a trial stopped after an interim analysis for futility or a safety concern.",
        ],
      },
      {
        heading: "Which records I would read first",
        body: [
          "I would begin with efficacy/futility and safety classifications, then open the original NCT records. The useful details are the sponsor's exact wording, the study phase, the intervention, the endpoint context, and whether the decision followed a planned interim analysis or an external recommendation.",
          "I would then review repeated patterns by sponsor and disease area. One stop is a case. Several related stops can become a signal, but only after checking that the records refer to comparable interventions, populations, and development questions.",
        ],
      },
      {
        heading: "What not to conclude from a two-week window",
        body: [
          "A short update window is useful for monitoring, not for declaring that one sponsor, disease area, or drug class performs worse than another. Registry updates arrive unevenly, large sponsors run more studies, and some records are revised long after the underlying decision.",
          "The right use is triage: identify records worth opening, preserve the source wording, and compare the latest window with a longer historical baseline.",
        ],
      },
      {
        heading: "How this becomes a useful recurring report",
        body: [
          "A biweekly report should separate genuinely new NCT IDs from older records that were updated. That requires preserving the prior ingest and comparing it with the current one. The report can then show new stopped studies, changed classifications, important efficacy or safety signals, and links to every primary record.",
          "This article is generated from the latest available ingest window. The counts and leading categories update with the database, while the interpretation remains deliberately cautious.",
        ],
      },
    ],
    tables: [],
    links: [
      {
        href: "/explore",
        label: "Open the current database",
        text: "Search the current stopped-trial records and verify individual NCT source pages.",
      },
      {
        href: "/methods",
        label: "How classification works",
        text: "See how stop-reason language is grouped into efficacy, safety, operational, regulatory, and other signals.",
      },
      {
        href: "/insights/terminated-clinical-trials-are-not-always-failures",
        label: "Terminated does not always mean failed",
        text: "Understand why trial status and scientific failure should not be treated as the same thing.",
      },
    ],
    faqs: [
      {
        question: "Are these all newly failed clinical trials?",
        answer:
          "No. They are stopped trial records updated during the latest two-week ingest window. Some may be newly added, while others are older records that were revised.",
      },
      {
        question: "Which stop reasons are closest to biological failure?",
        answer:
          "Efficacy/futility and safety classifications are the closest screening signals, but every important conclusion should still be verified against the original registry record.",
      },
      {
        question: "Will this report update after a new ingest?",
        answer:
          "Yes. The date window, counts, status mix, reason mix, disease areas, and sponsors are calculated from the current dataset during the site build.",
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

function hydrateLatestUpdatesArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  const latest = stats.latestUpdates;
  const statusRows = Object.entries(latest.statuses)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const bucketRows = Object.entries(latest.buckets)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const topBucket = bucketRows[0];
  const topArea = latest.topAreas[0];
  const scientificShare = latest.total ? `${((latest.scientificCount / latest.total) * 100).toFixed(1)}%` : "0.0%";

  return {
    ...article,
    metaDescription: `A data-backed review of ${n(latest.total)} stopped clinical trial records updated from ${latest.startDate} to ${latest.endDate}, including statuses, stop reasons, disease areas, and sponsors.`,
    dek: `${n(latest.total)} stopped trial records were updated from ${latest.startDate} to ${latest.endDate}. Here is what changed, what looks scientifically relevant, and what still needs source verification.`,
    facts: [
      `The latest complete fourteen-day dataset window runs from ${latest.startDate} through ${latest.endDate}.`,
      `${n(latest.total)} terminated, suspended, or withdrawn trial records were updated during that period.`,
      `${n(latest.scientificCount)} records, or ${scientificShare}, were classified as likely efficacy/futility or safety signals.`,
      topBucket ? `${topBucket[0]} was the largest stop-reason group with ${n(topBucket[1])} records.` : "No stop-reason group was available for this window.",
      topArea ? `${topArea.label} was the largest disease-area slice with ${n(topArea.count)} updated records.` : "No disease-area slice was available for this window.",
    ],
    sections: article.sections.map((section) => {
      if (section.heading !== "The main pattern in the latest window") return section;
      const efficacy = latest.buckets["EFFICACY/FUTILITY"] || 0;
      const safety = latest.buckets.SAFETY || 0;
      const operational = latest.buckets.OPERATIONAL || 0;
      const unclear = latest.buckets["OTHER/UNKNOWN"] || 0;
      return {
        ...section,
        body: [
          `The latest window contains ${n(operational)} operational records and ${n(unclear)} other or unclear records. By comparison, ${n(efficacy)} records carry efficacy/futility signals and ${n(safety)} carry safety signals.`,
          `Together, efficacy/futility and safety account for ${n(latest.scientificCount)} records, or ${scientificShare} of the update window. That smaller subset is where I would begin a biological-failure review, while keeping the sponsor's source language and trial context in view.`,
        ],
      };
    }),
    tables: [
      {
        heading: "Status mix in the latest update window",
        columns: ["Trial status", "Updated records"],
        rows: statusRows.map(([label, count]) => [label, n(count)]),
      },
      {
        heading: "Stop-reason mix",
        columns: ["Reason classification", "Updated records"],
        rows: bucketRows.map(([label, count]) => [label, n(count)]),
      },
      {
        heading: "Largest disease-area slices",
        columns: ["Disease area", "Updated records"],
        rows: latest.topAreas.map((item) => [item.label, n(item.count)]),
      },
      {
        heading: "Sponsors with the most updated stopped records",
        columns: ["Sponsor", "Updated records"],
        rows: latest.topSponsors.map((item) => [item.label, n(item.count)]),
      },
    ],
  };
}

export function hydrateInsightArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  if (article.slug === "latest-stopped-clinical-trial-updates-two-week-review") {
    return hydrateLatestUpdatesArticle(article, stats);
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
