import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export const GUIDE_LINKS = [
  { href: "/failures", label: "Failure hubs" },
  { href: "/sponsors", label: "Sponsor hubs" },
  { href: "/clinical-trial-failures", label: "Clinical trial failures" },
  { href: "/why-clinical-trials-fail", label: "Why trials fail" },
  { href: "/failed-clinical-trials", label: "Failed clinical trials" },
  { href: "/oncology-clinical-trial-failures", label: "Oncology failures" },
  { href: "/terminated-clinical-trials", label: "Terminated trials" },
  { href: "/clinical-trial-futility", label: "Futility signals" },
  { href: "/about", label: "About and data trust" },
];

type GuidesMenuProps = {
  active?: boolean;
};

export default function GuidesMenu({ active = false }: GuidesMenuProps) {
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
    <div
      className={`guidesMenu${open ? " guidesMenuOpen" : ""}`}
      ref={menuRef}
    >
      <button
        type="button"
        className="navlink guidesSummary"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="clinical-trial-failure-guides"
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        Guides
      </button>
      <div
        id="clinical-trial-failure-guides"
        className="guidesPanel"
        role="menu"
        aria-label="Clinical trial failure guides"
        hidden={!open}
      >
        {GUIDE_LINKS.map((link) => (
          <Link href={link.href} className="guidesPanelLink" role="menuitem" key={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
