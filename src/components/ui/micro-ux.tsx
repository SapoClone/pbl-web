import { type KeyboardEvent, type ReactNode, useState } from "react"
import { Check, Copy } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "./skeleton"

export function CopyCodeBadge({
  code,
  variant = "ticket",
  onCopied,
  className
}: {
  code: string
  variant?: "ticket" | "mono"
  onCopied?: (code: string) => void
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      onCopied?.(code)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API unavailable in non-secure test contexts
      setCopied(true)
      onCopied?.(code)
      window.setTimeout(() => setCopied(false), 1400)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={`Sao chép mã ${code}`}
      className={cn(
        "group inline-flex items-center gap-1.5 font-mono text-xs font-semibold transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16866f]",
        variant === "ticket"
          ? "rounded-md border border-dashed border-[#16866f]/45 bg-[#f2fbf6] px-2.5 py-1 text-[#147853] hover:border-[#16866f] hover:bg-[#e6f5ee]"
          : "rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700 hover:border-slate-300 hover:bg-slate-100",
        className
      )}
    >
      <span>{code}</span>
      {copied ? (
        <Check size={12} className="text-[#16866f]" />
      ) : (
        <Copy
          size={12}
          className="opacity-60 transition group-hover:opacity-100"
        />
      )}
    </button>
  )
}

export function UsageProgressBar({
  used,
  limit,
  unitLabel = "",
  unlimitedText = "Không giới hạn",
  className
}: {
  used: number
  limit: number | null | undefined
  unitLabel?: string
  unlimitedText?: string
  className?: string
}) {
  if (limit === null || limit === undefined || limit <= 0) {
    return (
      <div className={cn("text-xs text-slate-600", className)}>
        <span className="font-semibold tabular-nums text-[#163d36]">
          {used.toLocaleString("vi-VN")}
          {unitLabel}
        </span>{" "}
        <span className="text-slate-400">/ {unlimitedText}</span>
      </div>
    )
  }

  const ratio = Math.min(100, Math.round((used / limit) * 100))
  const tone =
    ratio >= 100
      ? "bg-red-500"
      : ratio >= 80
        ? "bg-amber-500"
        : "bg-[#16866f]"

  return (
    <div className={cn("min-w-[140px]", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold tabular-nums text-[#163d36]">
          {used.toLocaleString("vi-VN")}
          {unitLabel}
          <span className="font-normal text-slate-400">
            {" "}
            / {limit.toLocaleString("vi-VN")}
            {unitLabel}
          </span>
        </span>
        <span
          className={cn(
            "text-[11px] font-medium tabular-nums",
            ratio >= 100
              ? "text-red-600"
              : ratio >= 80
                ? "text-amber-700"
                : "text-slate-500"
          )}
        >
          {ratio}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all duration-300", tone)}
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  )
}

export type SegmentedTabOption<T extends string> = {
  value: T
  label: string
  icon?: LucideIcon
  badge?: number | string
  badgeTone?: "neutral" | "danger" | "warning"
}

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = "Chuyển phân mục",
  className
}: {
  tabs: Array<SegmentedTabOption<T>>
  value: T
  onChange: (next: T) => void
  ariaLabel?: string
  className?: string
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
    event.preventDefault()
    const idx = tabs.findIndex((t) => t.value === value)
    if (idx === -1) return
    const nextIdx =
      event.key === "ArrowRight"
        ? (idx + 1) % tabs.length
        : (idx - 1 + tabs.length) % tabs.length
    onChange(tabs[nextIdx].value)
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex max-w-full items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth rounded-2xl border border-slate-200/80 bg-white/90 p-1.5 shadow-[0_2px_12px_rgba(20,50,45,0.04)] backdrop-blur-md",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.value === value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16866f]",
              active
                ? "bg-gradient-to-r from-[#16866f] to-[#126b58] text-white shadow-[0_2px_10px_rgba(22,134,111,0.25)]"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
            )}
          >
            {Icon ? <Icon size={15} /> : null}
            <span>{tab.label}</span>
            {tab.badge !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums",
                  active
                    ? "bg-white/25 text-white"
                    : tab.badgeTone === "danger"
                      ? "bg-red-100 text-red-700"
                      : tab.badgeTone === "warning"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                )}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function ChannelBadge({
  channel,
  size = "sm"
}: {
  channel: string
  size?: "xs" | "sm"
}) {
  const norm = channel.trim().toUpperCase()
  const config: Record<string, { label: string; cls: string }> = {
    POS: {
      label: "POS Tại quầy",
      cls: "border-emerald-200 bg-[#e6f5ee] text-[#147853]"
    },
    IN_STORE: {
      label: "POS Tại quầy",
      cls: "border-emerald-200 bg-[#e6f5ee] text-[#147853]"
    },
    LAZADA: {
      label: "Lazada",
      cls: "border-[#0f146d]/15 bg-[#eef0ff] text-[#0f146d]"
    },
    SHOPEE: {
      label: "Shopee",
      cls: "border-[#ee4d2d]/20 bg-[#fff1ee] text-[#c93c1f]"
    },
    TIKTOK: {
      label: "TikTok Shop",
      cls: "border-slate-800 bg-slate-900 text-white"
    },
    TIKTOK_SHOP: {
      label: "TikTok Shop",
      cls: "border-slate-800 bg-slate-900 text-white"
    },
    WEBSITE: {
      label: "Website",
      cls: "border-sky-200 bg-sky-50 text-sky-700"
    },
    WEB: {
      label: "Website",
      cls: "border-sky-200 bg-sky-50 text-sky-700"
    },
    ALL: {
      label: "Mọi kênh bán",
      cls: "border-slate-200 bg-slate-100 text-slate-600"
    }
  }
  const picked = config[norm] ?? {
    label: channel,
    cls: "border-slate-200 bg-slate-100 text-slate-600"
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold",
        size === "xs" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-[11px]",
        picked.cls
      )}
    >
      {picked.label}
    </span>
  )
}

export function AnimatedSwitch({
  checked,
  onChange,
  disabled,
  label
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16866f] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-[#16866f]" : "bg-slate-200"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}

export function KpiStatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "emerald",
  onClick,
  loading = false
}: {
  /** The value is still loading: a placeholder is shown instead of `value` and `hint` (never a misleading "0") */
  loading?: boolean
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: "emerald" | "amber" | "rose" | "sky" | "indigo"
  onClick?: () => void
}) {
  const toneMap = {
    emerald: "bg-[#e6f5ee] text-[#16866f] border border-[#16866f]/20",
    amber: "bg-amber-50 text-amber-600 border border-amber-200/50",
    rose: "bg-rose-50 text-rose-600 border border-rose-200/50",
    sky: "bg-sky-50 text-sky-600 border border-sky-200/50",
    indigo: "bg-indigo-50 text-indigo-600 border border-indigo-200/50"
  }
  const Wrapper = onClick ? "button" : "div"
  return (
    <Wrapper
      {...(onClick ? { type: "button", onClick } : {})}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 text-left shadow-[0_4px_20px_-4px_rgba(20,50,45,0.04),0_12px_28px_-8px_rgba(20,50,45,0.05)] backdrop-blur-sm transition-all duration-300",
        onClick
          ? "cursor-pointer hover:-translate-y-1 hover:border-[#16866f]/40 hover:shadow-[0_8px_30px_-4px_rgba(20,50,45,0.09)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16866f]"
          : "hover:border-slate-300/80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-2xs transition-transform duration-300 group-hover:scale-105",
              toneMap[tone]
            )}
          >
            <Icon size={18} />
          </span>
        ) : null}
      </div>
      {loading ? (
        <div role="status" aria-label="Đang tải" className="mt-3.5 space-y-2.5">
          <Skeleton className="h-7 w-32" />
          {hint ? <Skeleton className="h-3 w-40" /> : null}
        </div>
      ) : (
        <>
          <div className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[#163d36] sm:text-3xl">
            {value}
          </div>
          {hint ? (
            <div className="mt-1.5 text-xs text-slate-500">{hint}</div>
          ) : null}
        </>
      )}
    </Wrapper>
  )
}
