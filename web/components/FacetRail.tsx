import { useMemo, useState } from "react";
import { FacetOption, Facets } from "@/lib/workbench";

type MultiFacetProps = {
  title: string;
  options: FacetOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  showMore?: boolean;
  ariaLabel: string;
};

function toggle(arr: string[], v: string) {
  const s = new Set(arr);
  if (s.has(v)) s.delete(v);
  else s.add(v);
  return Array.from(s);
}

function MultiFacet({ title, options, selected, onChange, searchable, showMore, ariaLabel }: MultiFacetProps) {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(10);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? options.filter((o) => o.value.toLowerCase().includes(q))
      : options;
    return showMore ? base.slice(0, limit) : base;
  }, [options, query, showMore, limit]);

  return (
    <section className="rounded-2xl border bg-white p-3 shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        type="button"
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</div>
        <div className="text-xs text-gray-500">{selected.length ? `${selected.length} selected` : "All"}</div>
      </button>

      {open && (
        <div className="mt-2">
          {searchable && (
            <div className="mb-2">
              <label className="sr-only">{ariaLabel} search</label>
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                placeholder={`Search ${title.toLowerCase()}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          )}

          <div className="max-h-64 overflow-auto pr-1">
            {filtered.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <label key={o.value} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onChange(toggle(selected, o.value))}
                      aria-label={`${ariaLabel}: ${o.value}`}
                    />
                    <span className="text-sm text-gray-800">{o.value}</span>
                  </div>
                  <span className="text-xs text-gray-500">{o.count.toLocaleString()}</span>
                </label>
              );
            })}
          </div>

          {showMore && options.length > limit && (
            <button
              className="mt-2 w-full rounded-xl border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => setLimit((v) => v + 20)}
              type="button"
            >
              Show more
            </button>
          )}

          {showMore && limit > 10 && (
            <button
              className="mt-2 w-full rounded-xl border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              onClick={() => setLimit(10)}
              type="button"
            >
              Show less
            </button>
          )}
        </div>
      )}
    </section>
  );
}

type Props = {
  facets: Facets;
  selected: {
    phase: string[];
    status: string[];
    area: string[];
    country: string[];
    reason: string[];
    condition: string[];
    intervention: string[];
    sponsor: string[];
  };
  onSelectedChange: (next: Props["selected"]) => void;
  bio: boolean;
  setBio: (v: boolean) => void;
  dateFrom: string;
  dateTo: string;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
};

export function FacetRail({
  facets, selected, onSelectedChange, bio, setBio, dateFrom, dateTo, setDateFrom, setDateTo
}: Props) {
  return (
    <aside className="space-y-3">
      <section className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Likely biological failures</div>
            <div className="mt-1 text-xs text-gray-500">
              Filters to trials where the stop text more strongly suggests efficacy/safety issues.
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={bio}
            onClick={() => setBio(!bio)}
            className={`h-7 w-12 rounded-full border p-1 transition ${bio ? "bg-gray-900 border-gray-900" : "bg-gray-100"}`}
          >
            <div className={`h-5 w-5 rounded-full bg-white transition ${bio ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <a href="/methods#bio-failures" className="mt-2 inline-block text-xs font-semibold text-blue-700 hover:underline">
          What does this mean?
        </a>
      </section>

      <section className="rounded-2xl border bg-white p-3 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Last update date range</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">To</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </section>

      <MultiFacet
        title="Stopped status"
        options={facets.status}
        selected={selected.status}
        onChange={(v) => onSelectedChange({ ...selected, status: v })}
        ariaLabel="Status"
      />

      <MultiFacet
        title="Phase"
        options={facets.phase}
        selected={selected.phase}
        onChange={(v) => onSelectedChange({ ...selected, phase: v })}
        ariaLabel="Phase"
      />

      <MultiFacet
        title="Reason bucket"
        options={facets.reason}
        selected={selected.reason}
        onChange={(v) => onSelectedChange({ ...selected, reason: v })}
        ariaLabel="Reason bucket"
      />

      <MultiFacet
        title="Disease area"
        options={facets.area}
        selected={selected.area}
        onChange={(v) => onSelectedChange({ ...selected, area: v })}
        searchable
        showMore
        ariaLabel="Disease area"
      />

      <MultiFacet
        title="Geography (countries)"
        options={facets.country}
        selected={selected.country}
        onChange={(v) => onSelectedChange({ ...selected, country: v })}
        searchable
        showMore
        ariaLabel="Country"
      />

      <MultiFacet
        title="Condition / indication"
        options={facets.condition}
        selected={selected.condition}
        onChange={(v) => onSelectedChange({ ...selected, condition: v })}
        searchable
        showMore
        ariaLabel="Condition"
      />

      <MultiFacet
        title="Intervention / drug"
        options={facets.intervention}
        selected={selected.intervention}
        onChange={(v) => onSelectedChange({ ...selected, intervention: v })}
        searchable
        showMore
        ariaLabel="Intervention"
      />

      <MultiFacet
        title="Sponsor"
        options={facets.sponsor}
        selected={selected.sponsor}
        onChange={(v) => onSelectedChange({ ...selected, sponsor: v })}
        searchable
        showMore
        ariaLabel="Sponsor"
      />
    </aside>
  );
}
