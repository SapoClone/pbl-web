import { ChevronDown, MoreHorizontal } from "lucide-react"
import { overviewMetrics, chartValues } from "./dashboard.data"
import { MetricCard } from "./MetricCard"
import { OrderTable } from "./OrderTable"

export function Overview() {
  return <>
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{overviewMetrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.65fr_1fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-[#163d36]">Doanh thu</h2><p className="mt-1 text-xs text-slate-400">Hiệu suất 12 tháng gần nhất</p></div><button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">12 tháng <ChevronDown size={14} /></button></div>
        <div className="mt-8 flex h-52 items-end gap-2 border-b border-l border-slate-100 px-3 pb-0">{chartValues.map((value, index) => <div key={index} className="group relative flex h-full flex-1 items-end"><div className="w-full rounded-t-md bg-[#bce6d5] transition-colors group-hover:bg-[#16866f]" style={{ height: `${value / 1.25}%` }} /></div>)}</div>
        <div className="mt-3 flex justify-between pl-3 text-[10px] text-slate-400">{["T11", "T12", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"].map((month) => <span key={month}>{month}</span>)}</div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-[#163d36]">Kênh bán hàng</h2><p className="mt-1 text-xs text-slate-400">Doanh thu theo kênh</p></div><MoreHorizontal size={18} className="text-slate-400" /></div>
        <div className="mt-7 flex items-center gap-6"><div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full" style={{ background: "conic-gradient(#16866f 0 46%, #79b9e8 46% 71%, #f1c979 71% 88%, #d7e8e1 88% 100%)" }}><div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-center text-xs text-slate-400">Tổng<br /><strong className="text-sm text-[#163d36]">248,6tr</strong></div></div><div className="space-y-3 text-xs text-slate-500"><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#16866f]" />Website <b className="ml-3 text-slate-700">46%</b></p><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#79b9e8]" />Shopee <b className="ml-3 text-slate-700">25%</b></p><p><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#f1c979]" />Cửa hàng <b className="ml-3 text-slate-700">17%</b></p></div></div>
      </section>
    </div>
    <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]"><div className="flex items-center justify-between border-b border-slate-100 p-6"><div><h2 className="font-semibold text-[#163d36]">Đơn hàng gần đây</h2><p className="mt-1 text-sm text-slate-400">Các đơn hàng mới nhất trên mọi kênh</p></div><a href="/orders" className="text-sm font-semibold text-[#16866f]">Xem tất cả</a></div><OrderTable compact /></section>
  </>
}
