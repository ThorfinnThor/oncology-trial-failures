import { useEffect, useRef } from "react";

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: "right" | "left" | "bottom";
  widthClass?: string; // e.g. "w-[380px]"
};

export function Sheet({ title, open, onClose, children, side = "right", widthClass = "w-[380px]" }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sideClass =
    side === "right"
      ? `right-0 top-0 h-full ${widthClass}`
      : side === "left"
      ? `left-0 top-0 h-full ${widthClass}`
      : `left-0 right-0 bottom-0 w-full max-h-[85vh]`;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute bg-white shadow-xl outline-none ${
          side === "bottom" ? "rounded-t-2xl border-t" : "border-l"
        } ${sideClass}`}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          <button
            className="rounded-lg border px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="h-[calc(100%-52px)] overflow-auto">{children}</div>
      </div>
    </div>
  );
}
