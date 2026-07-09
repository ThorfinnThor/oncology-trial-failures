import Link from "next/link";

import GuidesMenu from "./GuidesMenu";

type Props = {
  q: string;
  setQ: (v: string) => void;

  onCopyLink: () => void;
  onExport: () => void;
  onReset: () => void;
};

export function TopBar({ q, setQ, onCopyLink, onExport, onReset }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-4 py-3">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[260px_1fr_360px] xl:items-center">
          {/* Left: name + nav */}
          <div className="flex items-center justify-between xl:justify-start gap-3">
            <div className="text-sm font-semibold text-gray-900">Clinical trial failures</div>
            <nav className="flex items-center gap-3 text-sm">
              <Link className="text-gray-700 hover:underline" href="/explore">
                Explore
              </Link>
              <Link className="text-gray-700 hover:underline" href="/overview">
                Overview
              </Link>
              <GuidesMenu />
              <Link className="text-gray-700 hover:underline" href="/sponsor-insights">
                Sponsor insights
              </Link>
              <Link className="text-gray-700 hover:underline" href="/outliers">
                Outliers
              </Link>
              <Link className="text-gray-700 hover:underline" href="/top-entities">
                Top entities
              </Link>
              <Link className="text-gray-700 hover:underline" href="/methods">
                Methods
              </Link>
            </nav>
          </div>

          {/* Center: global search */}
          <div className="xl:px-4">
            <label className="sr-only" htmlFor="globalSearch">Search</label>
            <input
              id="globalSearch"
              className="w-full rounded-xl border px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              placeholder="Search trials, drugs, sponsors, conditions, NCT…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Right: actions */}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              onClick={onCopyLink}
              type="button"
            >
              Copy link
            </button>
            <button
              className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              onClick={onExport}
              type="button"
            >
              Export
            </button>
            <button
              className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              onClick={onReset}
              type="button"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-600">
          Browse trials that were suspended or terminated. Filter by phase, indication, sponsor, intervention, and stated stop reason.
        </div>
      </div>
    </header>
  );
}
