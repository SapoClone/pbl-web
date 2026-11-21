import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import type { Metric } from "@/shared/dashboard/dashboard.types"

export function MetricCard({
  label,
  value,
  change,
  detail = "so với tháng trước",
  icon: Icon,
  positive = true
}: Metric) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_4px_20px_-4px_rgba(20,50,45,0.04),0_12px_28px_-8px_rgba(20,50,45,0.05)] backdrop-blur-sm transition-all duration-300 hover:border-[#16866f]/30 hover:shadow-[0_8px_30px_-4px_rgba(20,50,45,0.08)]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#16866f]/20 bg-[#e6f5ee] text-[#16866f] shadow-2xs transition-transform duration-300 group-hover:scale-105">
          <Icon size={17} />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[#163d36] sm:text-3xl">
        {value}
      </p>
      <p
        className={`mt-2 flex items-center gap-1 text-xs font-semibold ${
          positive ? "text-[#16866f]" : "text-[#c44a42]"
        }`}
      >
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        <span>{change}</span>
        {detail ? <span className="font-normal text-slate-400">{detail}</span> : null}
      </p>
    </div>
  )
}
