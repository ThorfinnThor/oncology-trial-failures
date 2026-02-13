import { UrlState } from "./types";

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
  const compare = splitCsv(u.searchParams.get("compare"));

  // Additional facets used by Explore (and linked from other pages)
  const sponsor = splitCsv(u.searchParams.get("sponsor"));
  const intervention = splitCsv(u.searchParams.get("intervention"));
  const condition = splitCsv(u.searchParams.get("condition"));
  const country = splitCsv(u.searchParams.get("country"));

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

  if (state.sponsor?.length) sp.set("sponsor", state.sponsor.join(","));
  if (state.intervention?.length) sp.set("intervention", state.intervention.join(","));
  if (state.condition?.length) sp.set("condition", state.condition.join(","));
  if (state.country?.length) sp.set("country", state.country.join(","));
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
