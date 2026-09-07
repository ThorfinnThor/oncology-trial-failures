import type { UrlState } from "./types";

// Entity names can contain commas; each occurrence is one complete facet value.
// Keep CSV parsing only for the controlled-vocabulary facets and NCT IDs below.
function readEntities(params: URLSearchParams, key: string): string[] | undefined {
  const values = params.getAll(key).map((value) => value.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

function splitCsv(v?: string | null): string[] | undefined {
  if (!v) return undefined;
  const out = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return out.length ? out : undefined;
}

function parseIntParam(v?: string | null): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function decodeState(asPath: string): UrlState {
  // asPath may be "/explore?status=TERMINATED"
  const base = "http://localhost";
  const u = new URL(asPath.startsWith("http") ? asPath : base + asPath);

  const q = u.searchParams.get("q") || undefined;
  const status = splitCsv(u.searchParams.get("status"));
  const phase = splitCsv(u.searchParams.get("phase"));
  const area = splitCsv(u.searchParams.get("area"));
  const bucket = splitCsv(u.searchParams.get("bucket"));
  const compare = splitCsv(u.searchParams.get("compare"))?.slice(0, 5);

  // Additional facets used by Explore (and linked from other pages)
  const sponsor = readEntities(u.searchParams, "sponsor");
  const intervention = readEntities(u.searchParams, "intervention");
  const condition = readEntities(u.searchParams, "condition");
  const country = readEntities(u.searchParams, "country");

  const bio = u.searchParams.get("bio") === "1" ? true : undefined;
  const sort = u.searchParams.get("sort") || undefined;
  const trial = u.searchParams.get("trial") || undefined;

  const page = parseIntParam(u.searchParams.get("page"));
  const pageSize = parseIntParam(u.searchParams.get("pageSize"));
  const view = u.searchParams.get("view") || undefined;

  const date_from = u.searchParams.get("date_from") || undefined;
  const date_to = u.searchParams.get("date_to") || undefined;

  return {
    q,
    status,
    phase,
    area,
    bucket,
    sponsor,
    intervention,
    condition,
    country,
    bio,
    sort,
    page,
    pageSize,
    view,
    trial,
    compare,
    date_from,
    date_to
  };
}

export function encodeState(state: UrlState): string {
  const sp = new URLSearchParams();

  if (state.q) sp.set("q", state.q);

  if (state.status?.length) sp.set("status", state.status.join(","));
  if (state.phase?.length) sp.set("phase", state.phase.join(","));
  if (state.area?.length) sp.set("area", state.area.join(","));
  if (state.bucket?.length) sp.set("bucket", state.bucket.join(","));

  for (const key of ["sponsor", "intervention", "condition", "country"] as const) {
    for (const value of state[key] || []) sp.append(key, value);
  }
  if (state.compare?.length) sp.set("compare", state.compare.join(","));

  if (state.bio) sp.set("bio", "1");
  if (state.sort) sp.set("sort", state.sort);

  if (typeof state.page === "number" && Number.isFinite(state.page)) sp.set("page", String(state.page));
  if (typeof state.pageSize === "number" && Number.isFinite(state.pageSize))
    sp.set("pageSize", String(state.pageSize));
  if (state.view) sp.set("view", state.view);

  if (state.trial) sp.set("trial", state.trial);

  if (state.date_from) sp.set("date_from", state.date_from);
  if (state.date_to) sp.set("date_to", state.date_to);

  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function resetExploreState(state: UrlState): UrlState {
  return {
    ...state,
    q: undefined,
    status: undefined,
    phase: undefined,
    area: undefined,
    bucket: undefined,
    sponsor: undefined,
    intervention: undefined,
    condition: undefined,
    country: undefined,
    bio: undefined,
    date_from: undefined,
    date_to: undefined,
    sort: "date_desc",
    trial: undefined,
    compare: undefined,
  };
}
