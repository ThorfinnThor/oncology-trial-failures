import { SortKey, UrlState } from "./types";

function splitCsv(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((x) => decodeURIComponent(x.trim()))
    .filter(Boolean);
}

function joinCsv(values: string[]): string {
  return values.map((x) => encodeURIComponent(x)).join(",");
}

export function decodeState(search: string): UrlState {
  const sp = new URLSearchParams(search.startsWith("?") ? search : `?${search}`);

  const state: UrlState = {};

  const q = sp.get("q");
  if (q) state.q = q;

  const sort = sp.get("sort") as SortKey | null;
  if (sort) state.sort = sort;

  const status = splitCsv(sp.get("status"));
  if (status.length) state.status = status;

  const phase = splitCsv(sp.get("phase"));
  if (phase.length) state.phase = phase;

  const area = splitCsv(sp.get("area"));
  if (area.length) state.area = area;

  const bucket = splitCsv(sp.get("bucket"));
  if (bucket.length) state.bucket = bucket;

  const sponsor = splitCsv(sp.get("sponsor"));
  if (sponsor.length) state.sponsor = sponsor;

  const condition = splitCsv(sp.get("condition"));
  if (condition.length) state.condition = condition;

  const intervention = splitCsv(sp.get("intervention"));
  if (intervention.length) state.intervention = intervention;

  const bio = sp.get("scientific_failure");
  if (bio === "1") state.bio = true;

  const dateFrom = sp.get("date_from");
  if (dateFrom) state.date_from = dateFrom;

  const dateTo = sp.get("date_to");
  if (dateTo) state.date_to = dateTo;

  const trial = sp.get("trial");
  if (trial) state.trial = trial;

  const compare = splitCsv(sp.get("compare"));
  if (compare.length) state.compare = compare.slice(0, 5);

  const rail = sp.get("rail");
  if (rail === "0") state.rail = false;

  return state;
}

export function encodeState(state: UrlState): string {
  const sp = new URLSearchParams();

  if (state.q) sp.set("q", state.q);

  if (state.sort) sp.set("sort", state.sort);

  if (state.status?.length) sp.set("status", joinCsv(state.status));
  if (state.phase?.length) sp.set("phase", joinCsv(state.phase));
  if (state.area?.length) sp.set("area", joinCsv(state.area));
  if (state.bucket?.length) sp.set("bucket", joinCsv(state.bucket));
  if (state.sponsor?.length) sp.set("sponsor", joinCsv(state.sponsor));
  if (state.condition?.length) sp.set("condition", joinCsv(state.condition));
  if (state.intervention?.length) sp.set("intervention", joinCsv(state.intervention));

  if (state.bio) sp.set("scientific_failure", "1");

  if (state.date_from) sp.set("date_from", state.date_from);
  if (state.date_to) sp.set("date_to", state.date_to);

  if (state.trial) sp.set("trial", state.trial);

  if (state.compare?.length) sp.set("compare", joinCsv(state.compare.slice(0, 5)));

  if (state.rail === false) sp.set("rail", "0");

  const s = sp.toString();
  return s ? `?${s}` : "";
}
