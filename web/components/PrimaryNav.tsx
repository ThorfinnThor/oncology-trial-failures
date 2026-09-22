import Link from "next/link";
import { useState } from "react";

import GuidesMenu from "@/components/GuidesMenu";
import NavMenu from "@/components/NavMenu";

export type PrimaryNavItem =
  | "explore"
  | "overview"
  | "guides"
  | "insights"
  | "sponsor-insights"
  | "outliers"
  | "top-entities"
  | "methods"
  | "asset-check"
  | "briefs"
  | "packages"
  | "newsletter"
  | "pricing";

type PrimaryNavProps = {
  active?: PrimaryNavItem;
};

// What the site gives away, behind one control. These pages are worth having and worth finding;
// they are not worth eight slots in a bar that also has to carry the four things a visitor can
// actually act on. They lead the bar: most people arrive on a reference page from a search and
// are looking for more of the same, not for a price list.
const DATA_LINKS = [
  { href: "/explore", label: "Explore the trials" },
  { href: "/overview", label: "Overview" },
  { href: "/insights", label: "Insights" },
  { href: "/sponsor-insights", label: "Sponsor insights" },
  { href: "/outliers", label: "Outliers" },
  { href: "/top-entities", label: "Top entities" },
  { href: "/methods", label: "Methods" },
  { href: "/validation", label: "Validation" },
];

const DATA_ITEMS: PrimaryNavItem[] = [
  "explore",
  "overview",
  "insights",
  "sponsor-insights",
  "outliers",
  "top-entities",
  "methods",
];

function current(active: PrimaryNavItem | undefined, item: PrimaryNavItem) {
  return active === item ? "page" : undefined;
}

export default function PrimaryNav({ active }: PrimaryNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileNav = () => setMobileOpen(false);

  return (
    <div className={`primaryNavWrap${mobileOpen ? " primaryNavWrapOpen" : ""}`}>
      <button
        type="button"
        className="mobileNavToggle"
        aria-controls="primary-navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((value) => !value)}
      >
        <span className="mobileNavToggleIcon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        {mobileOpen ? "Close" : "Menu"}
      </button>
      <nav className="nav primaryNav" id="primary-navigation" aria-label="Primary">
        <NavMenu
          label="Data"
          id="trial-data-pages"
          links={DATA_LINKS}
          active={!!active && DATA_ITEMS.includes(active)}
          onNavigate={closeMobileNav}
        />
        <GuidesMenu active={active === "guides"} />
        <Link className="navlink" href="/asset-check" aria-current={current(active, "asset-check")} onClick={closeMobileNav}>
          Asset check
        </Link>
        <Link className="navlink" href="/briefs" aria-current={current(active, "briefs")} onClick={closeMobileNav}>
          Briefs
        </Link>
        <Link className="navlink" href="/packages" aria-current={current(active, "packages")} onClick={closeMobileNav}>
          Packages
        </Link>
        <Link className="navlink" href="/newsletter" aria-current={current(active, "newsletter")} onClick={closeMobileNav}>
          Newsletter
        </Link>
        <Link className="navlink" href="/pricing" aria-current={current(active, "pricing")} onClick={closeMobileNav}>
          Pricing
        </Link>
      </nav>
    </div>
  );
}
