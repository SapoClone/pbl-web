import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import type { Metric } from "@/shared/dashboard/dashboard.types"

export function MetricCard({ label, value, change, detail = "so với tháng trước", icon: Icon, positive = true }: Metric) {
  const featured = label === "Doanh thu bán hàng"
  return (
    <div className={`rounded-lg border p-4 shadow-[0_2px_8px_rgba(20,50,45,0.03)] ${featured ? "border-[#0d3d35] bg-[#0d3d35]" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between"><p className={`text-[11px] ${featured ? "text-white" : "text-slate-500"}`}>{label}</p><span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#e6f5ee] text-[#16866f]"><Icon size={16} /></span></div>
      <p className={`mt-3 text-[22px] font-semibold tracking-tight ${featured ? "text-white" : "text-[#163d36]"}`}>{value}</p>
      <p className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${featured ? "text-[#b8e4d3]" : positive ? "text-[#16866f]" : "text-[#c44a42]"}`}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {change} <span className={`font-normal ${featured ? "text-[#8cb5a8]" : "text-slate-400"}`}>{detail}</span></p>
    </div>
  )
}
