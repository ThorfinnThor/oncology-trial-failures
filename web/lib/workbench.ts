/**
 * lib/workbench.ts (compatibility layer)
 *
 * This project previously used a "workbench" module with TrialRow + splitSemicolonValues.
 * The app now uses:
 * - TrialIndexRow / TrialDetail (lib/types)
 * - filtering + sorting (lib/filtering)
 * - facets (lib/facets)
 *
 * To avoid breaking older components still compiled in the repo, this file re-exports
 * compatible helpers using the new implementations.
 */

import { ReasonBucket, TrialIndexRow, UrlState, SortKey } from "./types";
import { filterRows, sortRows, reasonBucket as _reasonBucket } from "./filtering";
import { computeFacets as _computeFacets } from "./facets";

export type WorkbenchState = UrlState;

/**
 * Back-compat: mapReasonBucket(row) -> ReasonBucket
 */
export function mapReasonBucket(row: TrialIndexRow): ReasonBucket {
  return _reasonBucket(row);
}

/**
 * Back-compat: applyFilters(rows, state) -> rows
 */
export function applyFilters(rows: TrialIndexRow[], state: UrlState): TrialIndexRow[] {
  return filterRows(rows, state);
}

/**
 * Back-compat: sortRows(rows, sortKey) -> rows
 */
export function sortWorkbenchRows(rows: TrialIndexRow[], sortKey: SortKey): TrialIndexRow[] {
  return sortRows(rows, sortKey);
}

/**
 * Back-compat: computeFacets(rows) -> facets
 */
export function computeFacets(rows: TrialIndexRow[]) {
  return _computeFacets(rows);
}

/**
 * Back-compat: ReasonBucket type re-export (string union lives in lib/types)
 */
export type { ReasonBucket };
