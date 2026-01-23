type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
};

export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const jump = (p: number) => onPageChange(Math.min(totalPages, Math.max(1, p)));

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="text-sm text-gray-600">
        Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span> •{" "}
        <span className="font-medium">{total}</span> results
      </div>

      <div className="flex items-center gap-2">
        <button className="rounded-md border px-3 py-1 text-sm disabled:opacity-50" disabled={!canPrev} onClick={() => jump(1)}>
          First
        </button>
        <button className="rounded-md border px-3 py-1 text-sm disabled:opacity-50" disabled={!canPrev} onClick={() => jump(page - 1)}>
          Prev
        </button>
        <button className="rounded-md border px-3 py-1 text-sm disabled:opacity-50" disabled={!canNext} onClick={() => jump(page + 1)}>
          Next
        </button>
        <button className="rounded-md border px-3 py-1 text-sm disabled:opacity-50" disabled={!canNext} onClick={() => jump(totalPages)}>
          Last
        </button>
      </div>
    </div>
  );
}
