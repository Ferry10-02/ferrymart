export function ProductGridSkeleton({ count = 12, cols = 'grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' }) {
  return (
    <div className={`grid ${cols}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xs"
        >
          <div className="aspect-square w-full animate-pulse bg-slate-200/80" />
          <div className="space-y-2.5 p-3">
            <div className="h-3.5 w-full animate-pulse rounded bg-slate-200" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-orange-100" />
            <div className="flex justify-between pt-1">
              <div className="h-3 w-10 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="min-h-[260px] animate-pulse rounded-2xl bg-slate-200 sm:min-h-[320px] lg:col-span-8" />
        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="min-h-[150px] flex-1 animate-pulse rounded-2xl bg-slate-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-slate-200" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white p-4 shadow-xs sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2 py-2">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-3 w-14 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-200" />
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  );
}
