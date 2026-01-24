type Props = {
  resultsCount: number;
  compareCount: number;

  onOpenFilters: () => void;
  onOpenExport: () => void;
  onOpenCompare: () => void;
};

export function MobileToolbar({ resultsCount, compareCount, onOpenFilters, onOpenExport, onOpenCompare }: Props) {
  return (
    <div className="sticky top-[74px] z-30 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-gray-900" aria-live="polite">
            {resultsCount.toLocaleString()} results
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              onClick={onOpenFilters}
              type="button"
            >
              Filters
            </button>

            <button
              className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              onClick={onOpenExport}
              type="button"
            >
              Export
            </button>

            <button
              className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              onClick={onOpenCompare}
              disabled={compareCount < 2}
              type="button"
              title="Select 2–5 trials to compare"
            >
              Compare ({compareCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
