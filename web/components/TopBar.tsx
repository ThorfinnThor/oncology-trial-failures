import Link from "next/link";
import { useMemo } from "react";

type Props = {
  q: string;
  setQ: (v: string) => void;
  onCopyLink: () => void;
  onExport: () => void;
  onCite: () => void;
  onReset: () => void;
};

export function TopBar({ q, setQ, onCopyLink, onExport, onCite, onReset }: Props) {
  const placeholder = useMemo(() => "Search trials, drugs, sponsors, conditions, NCT…", []);

  return (
    <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <nav className="flex items-center gap-3">
          <Link href="/explore" className="text-sm font-semibold text-gray-900">
            Clinical trial failures
          </Link>
          <Link href="/explore" className="text-sm text-gray-600 hover:text-gray-900">
            Explore
          </Link>
          <Link href="/methods" className="text-sm text-gray-600 hover:text-gray-900">
            Methods
          </Link>
        </nav>

        <div className="flex-1">
          <label className="sr-only" htmlFor="global-search">Global search</label>
          <input
            id="global-search"
            className="w-full rounded-xl border px-4 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
            placeholder={placeholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50" onClick={onCopyLink} type="button">
            Copy link
          </button>
          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50" onClick={onExport} type="button">
            Export
          </button>
          <button className="rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50" onClick={onCite} type="button">
            Cite
          </button>
          <button className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800" onClick={onReset} type="button">
            Reset
          </button>
        </div>
      </div>
    </header>
  );
}
