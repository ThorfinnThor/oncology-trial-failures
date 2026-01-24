import { useMemo, useState } from "react";
import { FacetOption } from "@/lib/facets";

type FacetProps = {
  title: string;
  options: FacetOption[];
  selected: string[];
  setSelected: (next: string[]) => void;

  searchable?: boolean;
  showMoreStep?: number;
  totalUniqueHint?: number;
};

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function Facet({ title, options, selected, setSelected, searchable, showMoreStep = 20, totalUniqueHint }: FacetProps) {
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(showMoreStep);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = needle ? options.filter((o) => o.value.toLowerCase().includes(needle)) : options;
    return base.slice(0, limit);
  }, [options, q, limit]);

  return (
    <section className="border-b py-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</div>
        <div className="text-xs text-gray-500">{open ? "–" : "+"}</div>
      </button>

      {open && (
        <div className="mt-2">
          {searchable && (
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder={`Search ${title.toLowerCase()}…`}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(showMoreStep);
              }}
            />
          )}

          <div className="mt-2 max-h-64 overflow-auto pr-1">
            {filtered.map((o) => {
              const id = `${title}-${o.value}`;
              return (
                <label key={o.value} className="flex items-start gap-2 py-1 text-sm">
                  <input
                    id={id}
                    type="checkbox"
                    className="mt-1"
                    checked={selected.includes(o.value)}
                    onChange={() => setSelected(toggle(selected, o.value))}
                  />
                  <span className="flex-1 text-gray-900">
                    {o.value}
                    <span className="ml-2 text-xs text-gray-500">{o.count.toLocaleString()}</span>
                  </span>
                </label>
              );
            })}

            {filtered.length === 0 && (
              <div className="py-2 text-sm text-gray-500">No matches.</div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between">
            <button
              type="button"
              className="text-xs font-semibold text-gray-700 hover:underline"
              onClick={() => setSelected([])}
              disabled={selected.length === 0}
            >
              Clear
            </button>

            <div className="flex items-center gap-2">
              {totalUniqueHint !== undefined && (
                <span className="text-xs text-gray-500">
                  {totalUniqueHint.toLocaleString()} total
                </span>
              )}
              {limit < options.length && (
                <button
                  type="button"
                  className="rounded-lg border px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  onClick={() => setLimit((v) => v + showMoreStep)}
                >
                  Show more
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

type Props = {
  // options
  status: FacetOption[];
  phase: FacetOption[];
  area: FacetOption[];
  bucket: FacetOption[];
  sponsor: FacetOption[];
  intervention: FacetOption[];
  condition: FacetOption[];
  uniqueCounts: { sponsors: number; interventions: number; conditions: number; areas: number };

  // selections
  selStatus: string[];
  setSelStatus: (v: string[]) => void;

  selPhase: string[];
  setSelPhase: (v: string[]) => void;

  selArea: string[];
  setSelArea: (v: string[]) => void;

  selBucket: string[];
  setSelBucket: (v: string[]) => void;

  selSponsor: string[];
  setSelSponsor: (v: string[]) => void;

  selIntervention: string[];
  setSelIntervention: (v: string[]) => void;

  selCondition: string[];
  setSelCondition: (v: string[]) => void;

  bio: boolean;
  setBio: (v: boolean) => void;

  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
};

export function FacetRail(props: Props) {
  const {
    status, phase, area, bucket, sponsor, intervention, condition, uniqueCounts,
    selStatus, setSelStatus,
    selPhase, setSelPhase,
    selArea, setSelArea,
    selBucket, setSelBucket,
    selSponsor, setSelSponsor,
    selIntervention, setSelIntervention,
    selCondition, setSelCondition,
    bio, setBio,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
  } = props;

  return (
    <aside className="h-[calc(100vh-74px)] overflow-auto border-r bg-white px-3">
      <div className="py-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-600">Facets</div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
            <span>Likely biological failures</span>
            <input
              type="checkbox"
              role="switch"
              aria-checked={bio}
              checked={bio}
              onChange={(e) => setBio(e.target.checked)}
            />
          </label>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600">From</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-600">To</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Facet title="Stopped status" options={status} selected={selStatus} setSelected={setSelStatus} />
      <Facet title="Phase" options={phase} selected={selPhase} setSelected={setSelPhase} />
      <Facet title="Disease area" options={area} selected={selArea} setSelected={setSelArea} searchable totalUniqueHint={uniqueCounts.areas} />
      <Facet title="Reason bucket" options={bucket} selected={selBucket} setSelected={setSelBucket} />
      <Facet title="Sponsor" options={sponsor} selected={selSponsor} setSelected={setSelSponsor} searchable totalUniqueHint={uniqueCounts.sponsors} showMoreStep={25} />
      <Facet title="Intervention" options={intervention} selected={selIntervention} setSelected={setSelIntervention} searchable totalUniqueHint={uniqueCounts.interventions} showMoreStep={25} />
      <Facet title="Condition" options={condition} selected={selCondition} setSelected={setSelCondition} searchable totalUniqueHint={uniqueCounts.conditions} showMoreStep={25} />

      <div className="py-4 text-xs text-gray-500">
        Labels are inferred from registry text and may be incomplete. Verify using primary sources.
      </div>
    </aside>
  );
}
