import { useMemo, useState } from "react";
import { TrialRow } from "@/lib/types";
import { downloadTrialsCSV, downloadTrialsJSON } from "@/lib/download";

type Props = {
  mode: "bio" | "all";
  totalAll: number;
  totalFiltered: number;
  filteredRows: TrialRow[];
  currentArea: string; // empty means all areas
};

function safeSlug(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export function DownloadMenu({ mode, totalAll, totalFiltered, filteredRows, currentArea }: Props) {
  const [open, setOpen] = useState(false);

  const label = useMemo(() => {
    const dataset = mode === "bio" ? "biological-failures" : "all-stopped";
    const area = currentArea ? safeSlug(currentArea) : "all-areas";
    return `${dataset}_${area}`;
  }, [mode, currentArea]);

  const now = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const filenameBase = `${label}_${now}`;

  return (
    <div className="relative">
      <button
        className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        Download
        <span className="text-xs text-gray-500">
          ({totalFiltered.toLocaleString()} results)
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 z-20 mt-2 w-[320px] rounded-2xl border bg-white p-3 shadow-lg"
          role="menu"
        >
          <div className="text-sm font-semibold text-gray-900">Download options</div>
          <div className="mt-1 text-xs text-gray-600">
            Export exactly what you’re currently viewing (search + filters applied).
          </div>

          <div className="mt-3 space-y-2">
            <button
              className="w-full rounded-xl bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
              onClick={() => {
                downloadTrialsCSV(`${filenameBase}.csv`, filteredRows);
                setOpen(false);
              }}
              type="button"
            >
              Download current results (CSV)
            </button>

            <button
              className="w-full rounded-xl border px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              onClick={() => {
                downloadTrialsJSON(`${filenameBase}.json`, filteredRows);
                setOpen(false);
              }}
              type="button"
            >
              Download current results (JSON)
            </button>

            <div className="pt-2 text-xs text-gray-500">
              Full dataset size: {totalAll.toLocaleString()} records.
              If you want the complete files, use the “Full dataset” links below.
            </div>
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="text-xs font-semibold text-gray-700">Full dataset files</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {mode === "bio" ? (
                <>
                  <a
                    className="rounded-xl border px-3 py-2 text-center text-xs font-medium text-gray-800 hover:bg-gray-50"
                    href="/biological_failure_trials.csv"
                  >
                    Bio CSV
                  </a>
                  <a
                    className="rounded-xl border px-3 py-2 text-center text-xs font-medium text-gray-800 hover:bg-gray-50"
                    href="/biological_failure_trials.json"
                  >
                    Bio JSON
                  </a>
                </>
              ) : (
                <>
                  <a
                    className="rounded-xl border px-3 py-2 text-center text-xs font-medium text-gray-800 hover:bg-gray-50"
                    href="/all_stopped_trials.csv"
                  >
                    All CSV
                  </a>
                  <a
                    className="rounded-xl border px-3 py-2 text-center text-xs font-medium text-gray-800 hover:bg-gray-50"
                    href="/all_stopped_trials.json"
                  >
                    All JSON
                  </a>
                </>
              )}
              <a
                className="col-span-2 rounded-xl border px-3 py-2 text-center text-xs font-medium text-gray-800 hover:bg-gray-50"
                href="/dataset_meta.json"
              >
                Metadata
              </a>
            </div>
          </div>

          <button
            className="mt-3 w-full rounded-xl border px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}
            type="button"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
