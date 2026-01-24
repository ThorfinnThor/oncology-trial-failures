import { useMemo, useState } from "react";
import { FacetOption } from "@/lib/facets";

export function ScientificFailureToggle({
  checked,
  onChange,
  onInfo
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onInfo: () => void;
}) {
  const id = "sf-toggle";
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            Likely scientific failure
          </div>
          <div className="mt-2 flex items-start gap-2">
            <input
              id={id}
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
            />
            <label htmlFor={id} className="text-sm leading-snug cursor-pointer">
              Show only trials where the stated stop reason suggests the intervention did not work as intended.
              <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                Inferred from registry text; may be incomplete.
              </div>
            </label>
          </div>
        </div>

        <button className="btn" type="button" onClick={onInfo} aria-label="What does this mean?">
          i
        </button>
      </div>
    </div>
  );
}

export function Facet({
  title,
  options,
  selected,
  onToggle,
  searchable,
  maxVisible = 10
}: {
  title: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
  maxVisible?: number;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
    return expanded ? list : list.slice(0, maxVisible);
  }, [options, query, expanded, maxVisible]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <div className="card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {title}
      </div>

      {searchable && (
        <input
          className="input mt-3"
          placeholder={`Search ${title.toLowerCase()}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      <div className="mt-3 space-y-2">
        {filtered.map((o) => {
          const id = `${title}-${o.value}`.replace(/\s+/g, "_");
          const checked = selectedSet.has(o.value);
          return (
            <div key={o.value} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <input
                  id={id}
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(o.value)}
                />
                <label htmlFor={id} className="text-sm cursor-pointer">
                  {o.label}
                </label>
              </div>
              <div className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                {o.count}
              </div>
            </div>
          );
        })}
      </div>

      {options.length > maxVisible && (
        <div className="pt-3">
          <button className="btn w-full" type="button" onClick={() => setExpanded((x) => !x)}>
            {expanded ? "Show less" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}
