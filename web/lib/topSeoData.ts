import { isLikelyScientificFailure, parsePhases, phaseLabel, reasonBucket, sortRows } from "@/lib/filtering";
import { trialPath } from "@/lib/seoUrls";
import type { TrialIndexRow } from "@/lib/types";

export type TopListRow = {
  rank: number;
  label: string;
  total: number;
  scientific: number;
  efficacy: number;
  safety: number;
  share: string;
  example: {
    nctId: string;
    title: string;
    sponsor: string;
    phase: string;
    reason: string;
    why: string;
    href: string;
  };
};

function norm(value: string | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function excerpt(value: string | undefined, max = 170): string {
  const clean = norm(value);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 3).trim()}...`;
}

function isBiological(row: TrialIndexRow): boolean {
  const bucket = reasonBucket(row).toUpperCase();
  return isLikelyScientificFailure(row) || bucket === "EFFICACY/FUTILITY" || bucket === "SAFETY";
}

function toExample(row: TrialIndexRow) {
  const phase = phaseLabel(parsePhases(row.phases || "")[0] || "UNKNOWN");
  return {
    nctId: row.nct_id,
    title: row.brief_title || row.nct_id,
    sponsor: row.lead_sponsor || "Unknown sponsor",
    phase,
    reason: reasonBucket(row),
    why: excerpt(row.why_stopped_short, 190),
    href: trialPath(row),
  };
}

function buildRows(groups: Map<string, TrialIndexRow[]>, minTotal = 3): TopListRow[] {
  return [...groups.entries()]
    .filter(([label, rows]) => Boolean(label) && rows.length >= minTotal)
    .map(([label, rows]) => {
      const biological = rows.filter(isBiological);
      const efficacy = rows.filter((row) => reasonBucket(row).toUpperCase() === "EFFICACY/FUTILITY").length;
      const safety = rows.filter((row) => reasonBucket(row).toUpperCase() === "SAFETY").length;
      const example = sortRows(biological.length ? biological : rows, "date_desc")[0];
      return {
        rank: 0,
        label,
        total: rows.length,
        scientific: biological.length,
        efficacy,
        safety,
        share: `${Math.round((biological.length / rows.length) * 100)}%`,
        example: toExample(example),
      };
    });
}

function splitInterventions(row: TrialIndexRow): string[] {
  return norm(row.intervention_first)
    .split(/[;|]/)
    .map((value) => norm(value))
    .filter((value) => value && !/^placebo$/i.test(value) && !/^control$/i.test(value));
}

export function topInterventionsByArea(rows: TrialIndexRow[], area: string, limit = 10): TopListRow[] {
  const areaRows = rows.filter((row) => norm(row.disease_area).toLowerCase() === area.toLowerCase());
  const groups = new Map<string, TrialIndexRow[]>();

  for (const row of areaRows) {
    for (const intervention of splitInterventions(row).slice(0, 3)) {
      const current = groups.get(intervention) || [];
      current.push(row);
      groups.set(intervention, current);
    }
  }

  return buildRows(groups, 2)
    .sort((a, b) => b.scientific - a.scientific || b.total - a.total || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function topSponsorsByBiologicalShare(rows: TrialIndexRow[], limit = 10, minTotal = 25): TopListRow[] {
  const groups = new Map<string, TrialIndexRow[]>();

  for (const row of rows) {
    const sponsor = norm(row.lead_sponsor);
    if (!sponsor || sponsor === "Unknown sponsor") continue;
    const current = groups.get(sponsor) || [];
    current.push(row);
    groups.set(sponsor, current);
  }

  return buildRows(groups, minTotal)
    .filter((row) => row.scientific > 0)
    .sort((a, b) => {
      const shareA = a.scientific / a.total;
      const shareB = b.scientific / b.total;
      return shareB - shareA || b.scientific - a.scientific || b.total - a.total || a.label.localeCompare(b.label);
    })
    .slice(0, limit)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function areaSummary(rows: TrialIndexRow[], area: string) {
  const areaRows = rows.filter((row) => norm(row.disease_area).toLowerCase() === area.toLowerCase());
  const biological = areaRows.filter(isBiological);
  const efficacy = areaRows.filter((row) => reasonBucket(row).toUpperCase() === "EFFICACY/FUTILITY").length;
  const safety = areaRows.filter((row) => reasonBucket(row).toUpperCase() === "SAFETY").length;
  return {
    area,
    total: areaRows.length,
    biological: biological.length,
    efficacy,
    safety,
    share: areaRows.length ? `${Math.round((biological.length / areaRows.length) * 100)}%` : "0%",
  };
}

export function sponsorShareSummary(rows: TrialIndexRow[]) {
  const sponsors = topSponsorsByBiologicalShare(rows, 100, 25);
  const totalSponsors = new Set(rows.map((row) => norm(row.lead_sponsor)).filter(Boolean)).size;
  return {
    totalSponsors,
    rankedSponsors: sponsors.length,
    minTotal: 25,
  };
}
