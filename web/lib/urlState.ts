import { ParsedUrlQuery } from "querystring";
import { SortKey, UrlState } from "./types";

const DEFAULT_SORT: SortKey = "date_desc";

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function asList(v: string | string[] | undefined): string[] | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const parts = s.split(",").map((x) => x.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

function asBool01(v: string | string[] | undefined): boolean | undefined {
  const s = asString(v);
  if (s === undefined) return undefined;
  if (s === "1" || s === "true") return true;
  if (s === "0" || s === "false") return false;
  return undefined;
}

function cleanList(list?: string[]) {
  if (!list || !list.length) return undefined;
  const uniq = Array.from(new Set(list.map((x) => x.trim()).filter(Boolean)));
  return uniq.length ? uniq : undefined;
}

/**
 * URL contract:
 * - scientific_failure=1 enables the “Likely scientific failure” filter.
 * Back-compat: bio=1 also enables it (older links).
 */
export function parseUrlState(q: ParsedUrlQuery): UrlState {
  // new key
  const scientific_failure = asBool01(q.scientific_failure);

  // legacy key: bio
  const legacyBio = asBool01(q.bio);

  const state: UrlState = {
    q: asString(q.q) || undefined,

    phase: asList(q.phase),
    status: asList(q.status),
    area: asList(q.area),
    bucket: asList(q.bucket) as any,
    sponsor: asList(q.sponsor),
    intervention: asList(q.intervention),
    condition: asList(q.condition),

    // default OFF; enable only if explicitly requested
    bio: scientific_failure ?? legacyBio ?? false,

    date_from: asString(q.date_from) || undefined,
    date_to: asString(q.date_to) || undefined,

    sort: (asString(q.sort) as SortKey | undefined) || DEFAULT_SORT,

    trial: asString(q.trial) || undefined,
    compare: asList(q.compare),

    rail: asBool01(q.rail),
  };

  // defaults
  if (!state.sort) state.sort = DEFAULT_SORT;
  if (state.rail === undefined) state.rail = true;

  return state;
}

export function stateToQuery(state: UrlState): Record<string, string> {
  const out: Record<string, string> = {};

  const set = (k: string, v?: string) => {
    if (v === undefined || v === "") return;
    out[k] = v;
  };
  const setList = (k: string, v?: string[]) => {
    const cleaned = cleanList(v);
    if (!cleaned) return;
    out[k] = cleaned.join(",");
  };

  set("q", state.q || undefined);

  setList("phase", state.phase);
  setList("status", state.status);
  setList("area", state.area);
  setList("bucket", state.bucket as unknown as string[] | undefined);
  setList("sponsor", state.sponsor);
  setList("intervention", state.intervention);
  setList("condition", state.condition);

  // New canonical key. Omit when OFF for clean URLs.
  if (state.bio) set("scientific_failure", "1");

  set("date_from", state.date_from);
  set("date_to", state.date_to);

  if (state.sort && state.sort !== DEFAULT_SORT) set("sort", state.sort);

  set("trial", state.trial);
  setList("compare", state.compare);

  // rail default true; omit if true
  if (state.rail === false) set("rail", "0");

  return out;
}

export function buildShareUrl(baseUrl: string, state: UrlState): string {
  const q = stateToQuery(state);
  const params = new URLSearchParams(q);
  const u = new URL(baseUrl);
  u.search = params.toString();
  return u.toString();
}
