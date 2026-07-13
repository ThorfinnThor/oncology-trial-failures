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
];

function n(value: number): string {
  return formatInsightCount(value);
}

function b(stats: Pick<InsightStats, "buckets">, bucket: string): number {
  return stats.buckets[bucket] || 0;
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

export function hydrateInsightArticle(article: InsightArticle, stats: InsightStats): InsightArticle {
  if (article.slug === "terminated-clinical-trials-are-not-always-failures") {
    return hydrateTerminatedArticle(article, stats);
  }
  if (article.slug === "oncology-phase-2-clinical-trial-failure-signals") {
    return hydrateOncologyArticle(article, stats);
  }
  return article;
}

export function hydrateInsightArticles(stats: InsightStats): InsightArticle[] {
  return INSIGHT_ARTICLES.map((article) => hydrateInsightArticle(article, stats));
}

export function getInsightBySlug(slug: string, stats?: InsightStats): InsightArticle | undefined {
  const article = INSIGHT_ARTICLES.find((item) => item.slug === slug);
  if (!article || !stats) return article;
  return hydrateInsightArticle(article, stats);
}

export function insightPath(article: Pick<InsightArticle, "slug">): string {
  return `/insights/${article.slug}`;
}
