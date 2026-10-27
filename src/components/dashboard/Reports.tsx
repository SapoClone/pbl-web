import { ArrowUpRight, UsersRound } from "lucide-react"
import { MetricCard } from "./MetricCard"

export function Reports() {
  return <div className="grid gap-5 md:grid-cols-2"><MetricCard label="Tỷ lệ chuyển đổi" value="4,82%" change="+0,8%" icon={ArrowUpRight} /><MetricCard label="Tỷ lệ khách quay lại" value="38,4%" change="+5,2%" icon={UsersRound} /><section className="rounded-xl border border-slate-200 bg-white p-5 md:col-span-2"><h2 className="font-semibold text-[#163d36]">Báo cáo hiệu quả vận hành</h2><div className="mt-5 h-32 rounded-lg bg-gradient-to-r from-[#e6f5ee] via-white to-[#e6f5ee]" /><p className="mt-3 text-xs text-slate-400">Báo cáo chi tiết sẽ kết nối với dữ liệu thật từ pbl-api.</p></section></div>
}
