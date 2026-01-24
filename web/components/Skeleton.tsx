export function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={`h-3 ${w} animate-pulse rounded bg-gray-100`} />;
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="border-b bg-gray-50 px-4 py-3">
        <SkeletonLine w="w-1/3" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-12 gap-3">
            <SkeletonLine w="w-full col-span-2" />
            <SkeletonLine w="w-full col-span-4" />
            <SkeletonLine w="w-full col-span-2" />
            <SkeletonLine w="w-full col-span-2" />
            <SkeletonLine w="w-full col-span-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
