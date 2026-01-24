import { useEffect, useRef, useState } from "react";

type Props = {
  storageKey: string;
  defaultWidth: number; // px
  minWidth?: number;
  maxWidth?: number;
  children: React.ReactNode;
};

export function ResizablePanel({ storageKey, defaultWidth, minWidth = 360, maxWidth = 640, children }: Props) {
  const [w, setW] = useState(defaultWidth);
  const draggingRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const n = Number(raw);
        if (!Number.isNaN(n)) setW(Math.max(minWidth, Math.min(maxWidth, n)));
      }
    } catch {
      // ignore
    }
  }, [storageKey, minWidth, maxWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      // right panel width = window width - mouse x
      const newW = Math.max(minWidth, Math.min(maxWidth, window.innerWidth - e.clientX));
      setW(newW);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      try {
        localStorage.setItem(storageKey, String(w));
      } catch {
        // ignore
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [w, minWidth, maxWidth, storageKey]);

  return (
    <div className="relative h-[calc(100vh-74px)] border-l border-[var(--border)] bg-[var(--surface)]" style={{ width: w }}>
      {/* Drag handle */}
      <div
        className="absolute left-0 top-0 h-full w-2 cursor-col-resize bg-transparent"
        onMouseDown={() => { draggingRef.current = true; }}
        title="Drag to resize"
        aria-label="Resize panel"
        role="separator"
      />
      <div className="h-full overflow-auto">{children}</div>
    </div>
  );
}
