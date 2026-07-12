import Link from "next/link";

import GuidesMenu from "@/components/GuidesMenu";

export type PrimaryNavItem =
  | "explore"
  | "overview"
  | "guides"
  | "sponsor-insights"
  | "outliers"
  | "top-entities"
  | "methods";

type PrimaryNavProps = {
  active?: PrimaryNavItem;
};

function current(active: PrimaryNavItem | undefined, item: PrimaryNavItem) {
  return active === item ? "page" : undefined;
}

export default function PrimaryNav({ active }: PrimaryNavProps) {
  return (
    <nav className="nav" aria-label="Primary">
      <Link className="navlink" href="/explore" aria-current={current(active, "explore")}>
        Explore
      </Link>
      <Link className="navlink" href="/overview" aria-current={current(active, "overview")}>
        Overview
      </Link>
      <GuidesMenu active={active === "guides"} />
      <Link className="navlink" href="/sponsor-insights" aria-current={current(active, "sponsor-insights")}>
        Sponsor insights
      </Link>
      <Link className="navlink" href="/outliers" aria-current={current(active, "outliers")}>
        Outliers
      </Link>
      <Link className="navlink" href="/top-entities" aria-current={current(active, "top-entities")}>
        Top entities
      </Link>
      <Link className="navlink" href="/methods" aria-current={current(active, "methods")}>
        Methods
      </Link>
    </nav>
  );
}
