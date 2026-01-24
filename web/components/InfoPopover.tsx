import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function InfoPopover({ title, children }: Props) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border bg-[var(--surface)] text-xs font-bold text-[var(--text)] hover:bg-[var(--surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
        aria-label={title}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={title}
          className="absolute left-0 top-8 z-40 w-[360px] max-w-[calc(100vw-40px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg"
        >
          <div className="text-sm font-semibold text-[var(--text)]">{title}</div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">{children}</div>
        </div>
      )}
    </span>
  );
}
