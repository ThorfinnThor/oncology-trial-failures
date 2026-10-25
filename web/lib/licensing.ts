// web/lib/licensing.ts
//
// Commercial access boundaries shared by exports and the pricing page.

import { CONTACT_EMAIL } from "@/lib/siteContact";

export const EXPORT_ROW_LIMIT = 100;
export const DATA_PAGE_PATH = "/pricing";
export const DATA_PAGE_URL = "https://clinicaltrialfailures.com/pricing";
export const LICENSING_EMAIL = CONTACT_EMAIL;
// Dataset JSON-LD: the licence of our derived data (LICENSE-DATA.md) and who publishes it.
export const DATA_LICENSE_URL = "https://creativecommons.org/licenses/by-nc/4.0/";
export const DATASET_CREATOR = { "@type": "Organization", name: "Clinical Trial Failures", url: "https://clinicaltrialfailures.com" } as const;

export function limitExportRows<T>(rows: T[]): { rows: T[]; truncated: boolean; totalRows: number } {
  return { rows: rows.slice(0, EXPORT_ROW_LIMIT), truncated: rows.length > EXPORT_ROW_LIMIT, totalRows: rows.length };
}
