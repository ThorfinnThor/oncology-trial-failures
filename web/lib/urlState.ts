import { ParsedUrlQuery } from "querystring";
import { ReasonBucket, SortKey, WorkbenchState } from "./types";

const DEFAULT_SORT: SortKey = "date_desc";

function asString(v: any): string | undefined {
  if (typeof v === "string") return v;
  return undefined;
}

function asList(v: any): string[] | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

function cleanList(v?: string[]): string[] | undefined {
  const a = (v || []).map((x) => x.trim()).filter(Boolean);
  return a.length ? Array.from(new Set(a)) : undefined;
}

function isISODate(d?: string): boolean {
  if (!d) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export function decodeState(query: ParsedUrlQuery): WorkbenchState {
  const q = asString(query.q);

  const bio = asString(query.bio) === "1";

  const phase = asList(query.phase);
  const status = asList(query.status);
  const area = asList(query.area);
  const country = asList(query.country);

  const condition = asList(query.condition);
  const intervention = asList(query.intervention);
  const sponsor = asList(query.sponsor);

  const reasonRaw = asList(query.reason);
  const reason = reasonRaw
    ? (reasonRaw.filter((r) => ["efficacy", "safety", "operational", "other"].includes(r)) as ReasonBucket[])
    : undefined;

  const date_from = asString(query.date_from);
  const date_to = asString(query.date_to);

  const sortRaw = asString(query.sort) as SortKey | undefined;
  const sort: SortKey = (sortRaw && [
    "date_desc","date_asc","sponsor_asc","sponsor_desc","phase_asc","phase_desc","confidence_desc","confidence_asc"
  ].includes(sortRaw)) ? sortRaw : DEFAULT_SORT;

  const trial = asString(query.trial);
  const compare = asList(query.compare);

  const st: WorkbenchState = {
    q: q || undefined,
    bio: bio || undefined,

    phase,
    status,
    area,
    country,

    condition,
    intervention,
    sponsor,
    reason,

    date_from: isISODate(date_from) ? date_from : undefined,
    date_to: isISODate(date_to) ? date_to : undefined,

    sort,
    trial: trial || undefined,
    compare,
  };

  // cleanup duplicates
  st.phase = cleanList(st.phase);
  st.status = cleanList(st.status);
  st.area = cleanList(st.area);
  st.country = cleanList(st.country);
  st.condition = cleanList(st.condition);
  st.intervention = cleanList(st.intervention);
  st.sponsor = cleanList(st.sponsor);
  st.compare = cleanList(st.compare);

  return st;
}

export function encodeState(state: WorkbenchState): Record<string, string> {
  const q: Record<string, string> = {};

  if (state.q) q.q = state.q;
  if (state.bio) q.bio = "1";

  if (state.phase?.length) q.phase = state.phase.join(",");
  if (state.status?.length) q.status = state.status.join(",");
  if (state.area?.length) q.area = state.area.join(",");
  if (state.country?.length) q.country = state.country.join(",");

  if (state.condition?.length) q.condition = state.condition.join(",");
  if (state.intervention?.length) q.intervention = state.intervention.join(",");
  if (state.sponsor?.length) q.sponsor = state.sponsor.join(",");

  if (state.reason?.length) q.reason = state.reason.join(",");

  if (state.date_from) q.date_from = state.date_from;
  if (state.date_to) q.date_to = state.date_to;

  if (state.sort && state.sort !== DEFAULT_SORT) q.sort = state.sort;

  if (state.trial) q.trial = state.trial;
  if (state.compare?.length) q.compare = state.compare.join(",");

  return q;
}

export function buildShareURL(pathname: string, state: WorkbenchState): string {
  const qs = encodeState(state);
  const params = new URLSearchParams(qs);
  const s = params.toString();
  return s ? `${pathname}?${s}` : pathname;
}
