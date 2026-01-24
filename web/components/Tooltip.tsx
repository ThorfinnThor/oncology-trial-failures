import { useEffect, useRef, useState } from "react";

type Props = {
  label: string;
  content: string;
  children: React.ReactNode;
};

export function Tooltip({ label, content, children }: Props) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const show = () => {
    if (!content?.trim()) return;
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <span
      ref={hostRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      tabIndex={0}
      aria-label={label}
    >
      {children}

      {open && (
        <div
          role="tooltip"
          className="absolute z-50 mt-2 w-[420px] max-w-[calc(100vw-40px)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)] shadow-lg"
        >
          <div className="max-h-56 overflow-auto whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
          <div className="mt-2 text-xs text-[var(--text-muted)]">
            Press Escape to close
          </div>
        </div>
      )}
    </span>
  );
}
