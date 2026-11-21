import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  extra,
  className
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  extra?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/90 bg-white/70 px-6 py-14 text-center shadow-[0_2px_12px_rgba(20,50,45,0.02)] backdrop-blur-xs",
        className
      )}
    >
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#16866f]/20 bg-gradient-to-br from-[#e6f5ee] to-[#d9efe5] text-[#16866f] shadow-xs">
        <Icon size={26} strokeWidth={1.8} />
        <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400/40 blur-xs" />
      </div>

      <h3 className="mt-4 text-base font-semibold text-[#163d36] sm:text-lg">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel || extra) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          {actionLabel && onAction && (
            <Button
              type="button"
              onClick={onAction}
              className="rounded-xl bg-gradient-to-r from-[#16866f] to-[#126b58] px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_10px_rgba(22,134,111,0.25)] hover:shadow-[0_4px_16px_rgba(22,134,111,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              type="button"
              variant="outline"
              onClick={onSecondaryAction}
              className="rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition active:scale-95"
            >
              {secondaryActionLabel}
            </Button>
          )}
          {extra}
        </div>
      )}
    </div>
  )
}
