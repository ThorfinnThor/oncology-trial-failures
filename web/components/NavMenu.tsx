// web/components/NavMenu.tsx
//
// A dropdown in the primary navigation. Extracted from GuidesMenu when the bar reached twelve
// items: everything the site sells was competing for attention with everything it gives away,
// and the four things a visitor can act on were indistinguishable from the eight that explain
// the data. The free reference pages move in here; the products stay flat.
//
// It reuses the guides menu's global classes deliberately, so both dropdowns keep behaving
// and looking like one control rather than two that drifted.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type NavMenuLink = { href: string; label: string };

export default function NavMenu({
  label,
  id,
  links,
  active = false,
  onNavigate,
}: {
  label: string;
  id: string;
  links: NavMenuLink[];
  active?: boolean;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && !menuRef.current?.contains(target)) setOpen(false);
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
        aria-controls={id}
        aria-current={active ? "page" : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      <div id={id} className="guidesPanel" role="menu" aria-label={label} hidden={!open}>
        {links.map((link) => (
          <Link
            href={link.href}
            className="guidesPanelLink"
            role="menuitem"
            key={link.href}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
