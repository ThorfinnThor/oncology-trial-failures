import { useMemo, useState } from "react";
import { FacetOption } from "@/lib/facets";

type FacetProps = {
  title: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
  maxVisible?: number;
};

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</div>
      {children}
    </div>
  );
}

function CheckboxRow({
  checked,
  label,
  count,
  onClick,
}: {
  checked: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left",
        "hover:bg-[var(--surface-2)] transition",
        checked && "bg-[var(--surface-2)]"
      )}
    >
      <span className="flex items-center gap-2 min-w-0">
        <span
          className={clsx(
            "h-4 w-4 rounded border border-[var(--border)] flex items-center justify-center",
            checked && "bg-[var(--accent)] border-transparent"
          )}
          aria-hidden="true"
        >
          {checked && <span className="h-2 w-2 rounded-sm bg-white" />}
        </span>
        <span className="text-sm text-[var(--text)] truncate">{label}</span>
      </span>
      <span className="text-xs text-[var(--text-muted)]">{count}</span>
    </button>
  );
}

/**
 * FacetRail
 * - Works with FacetOption[]
 * - Supports optional search and "show more"
 */
export function Facet({ title, options, selected, onToggle, searchable, maxVisible = 10 }: FacetProps) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return options;
    return options.filter((o) => o.label.toLowerCase().includes(qq) || o.value.toLowerCase().includes(qq));
  }, [options, q]);

  const visible = useMemo(() => {
    if (expanded) return filtered;
    return filtered.slice(0, maxVisible);
  }, [filtered, expanded, maxVisible]);

  return (
    <Section title={title}>
      {searchable && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${title.toLowerCase()}…`}
          className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm focus:outline-none"
          aria-label={`Search ${title}`}
        />
      )}

      <div className="space-y-1">
        {visible.map((o) => (
          <CheckboxRow
            key={o.value}
            checked={selected.includes(o.value)}
            label={o.label}
            count={o.count}
            onClick={() => onToggle(o.value)}
          />
        ))}
      </div>

      {filtered.length > maxVisible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          {expanded ? "Show less" : `Show more (${filtered.length - maxVisible})`}
        </button>
      )}
    </Section>
  );
}

/**
 * A small helper UI for the “Likely scientific failure” toggle
 * (so pages can keep consistent styling).
 */
export function ScientificFailureToggle({
  checked,
  onChange,
  onInfo,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  onInfo?: () => void;
}) {
  return (
    <Section title="Likely scientific failure">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-white p-3">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-[var(--border)]"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>
            Show only trials where the stated stop reason suggests the intervention did not work as intended.
            <span className="block text-xs text-[var(--text-muted)] mt-1">
              Inferred from registry text; may be incomplete.
            </span>
          </span>
        </label>

        {onInfo && (
          <button
            type="button"
            onClick={onInfo}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs font-semibold hover:bg-white"
            aria-label="What does Likely scientific failure mean?"
          >
            i
          </button>
        )}
      </div>
    </Section>
  );
}
