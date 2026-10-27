import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import type { Metric } from "./dashboard.types"

export function MetricCard({ label, value, change, icon: Icon, positive = true }: Metric) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
      <div className="flex items-start justify-between"><p className="text-[15px] text-slate-500">{label}</p><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e6f5ee] text-[#16866f]"><Icon size={19} /></span></div>
      <p className="mt-5 text-[26px] font-semibold tracking-tight text-[#163d36]">{value}</p>
      <p className={`mt-2 flex items-center gap-1 text-sm font-medium ${positive ? "text-[#16866f]" : "text-[#c44a42]"}`}>{positive ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />} {change} <span className="font-normal text-slate-400">so với tháng trước</span></p>
    </div>
  )
}
