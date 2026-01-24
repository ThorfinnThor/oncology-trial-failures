import { useMemo, useState } from "react";

export function ScientificFailureToggle({
  checked,
  onChange
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="card p-4">
      <div className="facet-title">Likely scientific failure</div>

      <label className="row" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="row-text">
          <div className="row-main">
            Show only trials where the stated stop reason suggests the intervention did not work as intended.
          </div>
          <div className="row-sub">Inferred from registry text; may be incomplete.</div>
        </div>
      </label>
    </div>
  );
}

export type FacetOption = { value: string; label: string; count: number };

export function Facet({
  title,
  options,
  selected,
  onToggle,
  searchable
}: {
  title: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => o.label.toLowerCase().includes(qq) || o.value.toLowerCase().includes(qq));
  }, [options, q]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <div className="card p-4">
      <div className="facet-title">{title}</div>

      {searchable ? (
        <input className="input mt-10" placeholder={`Search ${title.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} />
      ) : null}

      <div className="facet-list">
        {filtered.map((o) => {
          const isChecked = selectedSet.has(o.value);
          return (
            <label key={o.value} className="facet-item" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isChecked}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggle(o.value)}
              />
              <div className="facet-label">{o.label}</div>
              <div className="facet-count">{o.count.toLocaleString()}</div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
