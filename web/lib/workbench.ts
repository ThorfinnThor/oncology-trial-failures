import { TrialIndexRow, UrlState, SortKey } from "./types";
import { filterRows, sortRows, reasonBucket as _reasonBucket } from "./filtering";
import { computeFacets as _computeFacets } from "./facets";

/**
 * Compatibility wrapper.
 * Older UI versions imported from lib/workbench.ts.
 * The current implementation lives in filtering.ts + facets.ts.
 */

export function applyFilters(rows: TrialIndexRow[], state: UrlState): TrialIndexRow[] {
  return filterRows(rows, state);
}

export function sort(rows: TrialIndexRow[], sortKey: SortKey): TrialIndexRow[] {
  return sortRows(rows, sortKey);
}

export function mapReasonBucket(row: TrialIndexRow): string {
  return _reasonBucket(row);
}

export function computeFacets(rows: TrialIndexRow[]) {
  return _computeFacets(rows);
}
