import Link from "next/link";
import { useState } from "react";

import GuidesMenu from "@/components/GuidesMenu";

export type PrimaryNavItem =
  | "explore"
  | "overview"
  | "guides"
  | "insights"
  | "sponsor-insights"
  | "outliers"
  | "top-entities"
  | "methods"
  | "briefs"
  | "data";

type PrimaryNavProps = {
  active?: PrimaryNavItem;
};

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
        <Link className="navlink" href="/explore" aria-current={current(active, "explore")} onClick={closeMobileNav}>
          Explore
        </Link>
        <Link className="navlink" href="/overview" aria-current={current(active, "overview")} onClick={closeMobileNav}>
          Overview
        </Link>
        <GuidesMenu active={active === "guides"} />
        <Link className="navlink" href="/insights" aria-current={current(active, "insights")} onClick={closeMobileNav}>
          Insights
        </Link>
        <Link className="navlink" href="/sponsor-insights" aria-current={current(active, "sponsor-insights")} onClick={closeMobileNav}>
          Sponsor insights
        </Link>
        <Link className="navlink" href="/outliers" aria-current={current(active, "outliers")} onClick={closeMobileNav}>
          Outliers
        </Link>
        <Link className="navlink" href="/top-entities" aria-current={current(active, "top-entities")} onClick={closeMobileNav}>
          Top entities
        </Link>
        <Link className="navlink" href="/methods" aria-current={current(active, "methods")} onClick={closeMobileNav}>
          Methods
        </Link>
        <Link className="navlink" href="/briefs" aria-current={current(active, "briefs")} onClick={closeMobileNav}>
          Briefs
        </Link>
        <Link className="navlink" href="/data-licensing" aria-current={current(active, "data")} onClick={closeMobileNav}>
          Data &amp; licensing
        </Link>
      </nav>
    </div>
  );
}
