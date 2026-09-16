// web/lib/licensing.ts
//
// Commercial access boundaries shared by exports and the Data & licensing page.

export const EXPORT_ROW_LIMIT = 100;
export const DATA_PAGE_PATH = "/data-licensing";
export const DATA_PAGE_URL = "https://clinicaltrialfailures.com/data-licensing";
export const LICENSING_EMAIL = "contact@clinicaltrialfailures.com";

export function limitExportRows<T>(rows: T[]): { rows: T[]; truncated: boolean; totalRows: number } {
  return { rows: rows.slice(0, EXPORT_ROW_LIMIT), truncated: rows.length > EXPORT_ROW_LIMIT, totalRows: rows.length };
}
