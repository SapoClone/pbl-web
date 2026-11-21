import { cn } from "@/lib/utils"

export function TableSkeleton({
  rows = 5,
  cols = 6,
  className
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_4px_20px_-4px_rgba(20,50,45,0.04)] backdrop-blur-sm",
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="h-9 w-64 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-9 w-32 animate-pulse rounded-xl bg-slate-100" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={cn(
                  "h-5 animate-pulse rounded-md bg-slate-100/90",
                  c === 0
                    ? "w-1/4"
                    : c === cols - 1
                      ? "ml-auto w-20"
                      : "flex-1"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_4px_20px_-4px_rgba(20,50,45,0.04)]"
        >
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-8 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="mt-4 h-7 w-32 animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-3 w-40 animate-pulse rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}
