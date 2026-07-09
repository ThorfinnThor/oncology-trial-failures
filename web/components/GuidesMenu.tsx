import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const GUIDE_LINKS = [
  { href: "/clinical-trial-failures", label: "Clinical trial failures" },
  { href: "/why-clinical-trials-fail", label: "Why trials fail" },
  { href: "/failed-clinical-trials", label: "Failed clinical trials" },
  { href: "/oncology-clinical-trial-failures", label: "Oncology failures" },
  { href: "/terminated-clinical-trials", label: "Terminated trials" },
  { href: "/clinical-trial-futility", label: "Futility signals" },
];

export default function GuidesMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={`guidesMenu${open ? " guidesMenuOpen" : ""}`} ref={menuRef}>
      <button
        type="button"
        className="navlink guidesSummary"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        Guides
      </button>
      <div className="guidesPanel" aria-label="Clinical trial failure guides">
        {GUIDE_LINKS.map((link) => (
          <Link href={link.href} className="guidesPanelLink" key={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
