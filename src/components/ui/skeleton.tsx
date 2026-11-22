import { cn } from "@/lib/utils"

/** A pulsing placeholder for a value that is still on its way: shown instead of a "0" or an "empty" message */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-slate-100", className)} />
}

/** Tells screen readers that a region is loading (the visible part is a skeleton) */
export function LoadingStatus({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  )
}

const BAR_HEIGHTS = ["38%", "62%", "48%", "74%", "56%", "68%", "44%"]

/** The shape of a bar chart while its data loads */
export function ChartBarsSkeleton({ bars = 7, className }: { bars?: number; className?: string }) {
  return (
    <div className={cn("flex h-full items-end gap-2.5", className)}>
      <LoadingStatus label="Đang tải biểu đồ..." />
      {Array.from({ length: bars }).map((_, index) => (
        <div key={index} className="flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-1.5">
          <Skeleton className="w-full max-w-11 rounded-b-none" />
          <div className="w-full max-w-11 animate-pulse rounded-t-md bg-slate-100" style={{ height: BAR_HEIGHTS[index % BAR_HEIGHTS.length] }} />
          <Skeleton className="h-2.5 w-8" />
        </div>
      ))}
    </div>
  )
}

/** Rows of a list while it loads */
export function ListSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <LoadingStatus />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-2.5 w-2/5" />
            </div>
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      ))}
    </div>
  )
}
