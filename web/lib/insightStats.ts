import { isLikelyScientificFailure, parsePhases, phaseLabel, reasonBucket } from "./filtering";
import type { InsightStats } from "./insights";
import { trialPath } from "./seoUrls";
import { loadIndexServer } from "./server-data";
import type { TrialIndexRow } from "./types";

function countBy(rows: TrialIndexRow[], getValue: (row: TrialIndexRow) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = getValue(row) || "Other/unknown";
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function topCounts(rows: TrialIndexRow[], getValue: (row: TrialIndexRow) => string, limit: number) {
  return Object.entries(countBy(rows, getValue))
    .map(([label, count]) => ({ label, count }))
    .filter((item) => item.label && item.label !== "Other/unknown")
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function pct(part: number, total: number): string {
  if (!total) return "0.0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function phaseGroup(row: TrialIndexRow): string {
  const phases = parsePhases(row.phases || "");
  if (!phases.length) return "Unknown";
  return phases.map(phaseLabel).join(" + ");
}

function rowText(row: TrialIndexRow): string {
  return [
    row.why_stopped_short,
    (row as { why_stopped?: string }).why_stopped,
    row.brief_title,
    (row as { official_title?: string }).official_title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isEndpointSignal(row: TrialIndexRow): boolean {
  const bucket = reasonBucket(row).toUpperCase();
  if (bucket === "EFFICACY/FUTILITY") return true;

  const text = rowText(row);
  return /primary endpoint|endpoint|lack of efficacy|futility|lack of benefit|survival benefit|treatment effect|failed to meet|insufficient efficacy|not meet/.test(text);
}

function isEnrollmentSignal(row: TrialIndexRow): boolean {
  const bucket = reasonBucket(row).toUpperCase();
  if (bucket === "ENROLLMENT") return true;

  const text = rowText(row);
  return /enroll|recruit|accrual|accrue|slow accrual|insufficient accrual|unable to recruit|poor recruitment/.test(text);
}

function signalSlice(rows: TrialIndexRow[]) {
  return {
    total: rows.length,
    statuses: countBy(rows, (row) => (row.overall_status || "").toUpperCase()),
    phases: topCounts(rows, phaseGroup, 8),
    topAreas: topCounts(rows, (row) => row.disease_area || "Other", 8),
    topSponsors: topCounts(rows, (row) => row.lead_sponsor || "Unknown sponsor", 8),
  };
}

function diseaseAreaSignalShares(rows: TrialIndexRow[], minimumRecords = 200) {
  const grouped = new Map<string, TrialIndexRow[]>();
  for (const row of rows) {
    const label = row.disease_area || "Other";
    const group = grouped.get(label) || [];
    group.push(row);
    grouped.set(label, group);
  }

  return [...grouped.entries()]
    .filter(([, areaRows]) => areaRows.length >= minimumRecords)
    .map(([label, areaRows]) => {
      const scientificCount = areaRows.filter(isLikelyScientificFailure).length;
      return {
        label,
        total: areaRows.length,
        scientificCount,
        scientificShare: pct(scientificCount, areaRows.length),
        efficacyCount: areaRows.filter((row) => reasonBucket(row).toUpperCase() === "EFFICACY/FUTILITY").length,
        safetyCount: areaRows.filter((row) => reasonBucket(row).toUpperCase() === "SAFETY").length,
      };
    })
    .sort((a, b) => {
      const shareA = a.total ? a.scientificCount / a.total : 0;
      const shareB = b.total ? b.scientificCount / b.total : 0;
      return shareB - shareA || b.total - a.total || a.label.localeCompare(b.label);
    });
}

function phaseSignalComparison(rows: TrialIndexRow[]) {
  const phaseKeys = ["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4"];
  return phaseKeys.map((key) => {
    const phaseRows = rows.filter((row) => parsePhases(row.phases || "").includes(key));
    const scientificCount = phaseRows.filter(isLikelyScientificFailure).length;
    const buckets = countBy(phaseRows, (row) => reasonBucket(row).toUpperCase());
    return {
      key,
      label: phaseLabel(key),
      total: phaseRows.length,
      scientificCount,
      scientificShare: pct(scientificCount, phaseRows.length),
      efficacyCount: buckets["EFFICACY/FUTILITY"] || 0,
      safetyCount: buckets.SAFETY || 0,
      operationalCount: buckets.OPERATIONAL || 0,
      otherCount: buckets["OTHER/UNKNOWN"] || 0,
      regulatoryCount: buckets.REGULATORY || 0,
    };
  });
}

function latestUpdateSlice(rows: TrialIndexRow[]) {
  const dates = rows
    .map((row) => (row.last_update_post_date || "").slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();
  const endDate = dates[dates.length - 1] || "";

  if (!endDate) {
    return {
      startDate: "",
      endDate: "",
      total: 0,
      scientificCount: 0,
      statuses: {},
      buckets: {},
      topAreas: [],
      topSponsors: [],
      notableRecords: [],
    };
  }

  const start = new Date(`${endDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 13);
  const startDate = start.toISOString().slice(0, 10);
  const recentRows = rows.filter((row) => {
    const value = (row.last_update_post_date || "").slice(0, 10);
    return value >= startDate && value <= endDate;
  });
  const notableRecords = recentRows
    .filter((row) => {
      const bucket = reasonBucket(row).toUpperCase();
      return bucket === "EFFICACY/FUTILITY" || bucket === "SAFETY";
    })
    .sort((a, b) => {
      const byDate = (b.last_update_post_date || "").localeCompare(a.last_update_post_date || "");
      return byDate || a.nct_id.localeCompare(b.nct_id);
    })
    .slice(0, 8)
    .map((row) => ({
      nctId: row.nct_id,
      title: row.brief_title || row.nct_id,
      sponsor: row.lead_sponsor || "Unknown sponsor",
      phase: phaseGroup(row),
      area: row.disease_area || "Other",
      status: row.overall_status || "Stopped",
      bucket: reasonBucket(row),
      why: row.why_stopped_short || "No short stop-reason text is available in the compact dataset.",
      updated: (row.last_update_post_date || "").slice(0, 10),
      href: trialPath(row),
    }));

  return {
    startDate,
    endDate,
    total: recentRows.length,
    scientificCount: recentRows.filter(isLikelyScientificFailure).length,
    statuses: countBy(recentRows, (row) => (row.overall_status || "").toUpperCase()),
    buckets: countBy(recentRows, (row) => reasonBucket(row).toUpperCase()),
    topAreas: topCounts(recentRows, (row) => row.disease_area || "Other", 6),
    topSponsors: topCounts(recentRows, (row) => row.lead_sponsor || "Unknown sponsor", 6),
    notableRecords,
  };
}

export function bucketCount(stats: Pick<InsightStats, "buckets">, bucket: string): number {
  return stats.buckets[bucket] || 0;
}

export async function buildInsightStats(): Promise<InsightStats> {
  const rows = await loadIndexServer();
  const statuses = countBy(rows, (row) => (row.overall_status || "").toUpperCase());
  const buckets = countBy(rows, (row) => reasonBucket(row).toUpperCase());
  const topAreas = countBy(rows, (row) => row.disease_area || "Other");
  const scientificCount = rows.filter(isLikelyScientificFailure).length;

  const oncologyRows = rows.filter((row) => (row.disease_area || "") === "Oncology");
  const oncologyBuckets = countBy(oncologyRows, (row) => reasonBucket(row).toUpperCase());
  const oncologyScientificCount = oncologyRows.filter(isLikelyScientificFailure).length;
  const oncologyPhase2Rows = oncologyRows.filter((row) => parsePhases(row.phases || "").includes("PHASE2"));
  const oncologyPhase2Buckets = countBy(oncologyPhase2Rows, (row) => reasonBucket(row).toUpperCase());
  const efficacyRows = rows.filter((row) => reasonBucket(row).toUpperCase() === "EFFICACY/FUTILITY");
  const safetyRows = rows.filter((row) => reasonBucket(row).toUpperCase() === "SAFETY");
  const endpointRows = rows.filter(isEndpointSignal);
  const enrollmentRows = rows.filter(isEnrollmentSignal);
  const operationalRows = rows.filter((row) => reasonBucket(row).toUpperCase() === "OPERATIONAL");
  const regulatoryRows = rows.filter((row) => reasonBucket(row).toUpperCase() === "REGULATORY");
  const unknownRows = rows.filter((row) => reasonBucket(row).toUpperCase() === "OTHER/UNKNOWN");
  const withdrawnRows = rows.filter((row) => (row.overall_status || "").toUpperCase() === "WITHDRAWN");
  const withdrawnScientificCount = withdrawnRows.filter(isLikelyScientificFailure).length;
  const suspendedRows = rows.filter((row) => (row.overall_status || "").toUpperCase() === "SUSPENDED");
  const suspendedScientificCount = suspendedRows.filter(isLikelyScientificFailure).length;
  const latestUpdates = latestUpdateSlice(rows);

  return {
    total: rows.length,
    statuses: {
      terminated: statuses.TERMINATED || 0,
      withdrawn: statuses.WITHDRAWN || 0,
      suspended: statuses.SUSPENDED || 0,
    },
    buckets,
    topAreas,
    scientificCount,
    scientificShare: pct(scientificCount, rows.length),
    oncology: {
      total: oncologyRows.length,
      buckets: oncologyBuckets,
      scientificCount: oncologyScientificCount,
      phase2Total: oncologyPhase2Rows.length,
      phase2Buckets: oncologyPhase2Buckets,
      topSponsors: topCounts(oncologyRows, (row) => row.lead_sponsor || "Unknown sponsor", 5),
    },
    signalComparison: {
      efficacy: signalSlice(efficacyRows),
      safety: signalSlice(safetyRows),
    },
    endpointSignals: signalSlice(endpointRows),
    enrollmentSignals: signalSlice(enrollmentRows),
    operationalSignals: signalSlice(operationalRows),
    regulatorySignals: signalSlice(regulatoryRows),
    unknownSignals: signalSlice(unknownRows),
    withdrawnSignals: {
      ...signalSlice(withdrawnRows),
      scientificCount: withdrawnScientificCount,
      scientificShare: pct(withdrawnScientificCount, withdrawnRows.length),
      buckets: countBy(withdrawnRows, (row) => reasonBucket(row).toUpperCase()),
    },
    suspendedSignals: {
      ...signalSlice(suspendedRows),
      scientificCount: suspendedScientificCount,
      scientificShare: pct(suspendedScientificCount, suspendedRows.length),
      buckets: countBy(suspendedRows, (row) => reasonBucket(row).toUpperCase()),
    },
    diseaseAreaSignalShares: diseaseAreaSignalShares(rows),
    phaseSignalComparison: phaseSignalComparison(rows),
    latestUpdates,
  };
}
