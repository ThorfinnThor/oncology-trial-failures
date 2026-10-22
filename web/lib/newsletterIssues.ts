import issueIndex from "@/data/newsletter_issues/index.json";

// Written by scripts/signals/newsletter.py when a mail actually went out; one JSON per issue plus
// this index, newest first.
export type IssueRow = {
  nct_id: string;
  title: string;
  sponsor: string;
  area: string;
  reason: string;
  detail: string;
};

export type NewsletterIssue = {
  sent_at: string;
  subject: string;
  release: string;
  since: string;
  trial_count: number | null;
  counts: { added: number; changed: number };
  added: IssueRow[];
  changed: IssueRow[];
};

export type IssueSummary = { date: string; subject: string; counts: { added?: number; changed?: number } };

export const ISSUES = issueIndex as IssueSummary[];

export function issuePath(date: string): string {
  return `/newsletter/issues/${date}`;
}

export function issueLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
