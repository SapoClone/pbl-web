import { useMemo, useState } from "react"
import { BarChart3, Download, FileText, ShoppingCart, TrendingUp } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { dailySalesQueryOptions } from "@/api/tanstack-query/dailySalesQueryOptions"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"

type ReportRow = {
  date: string
  orderCount: number
  revenue: number
}

const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")} ₫`
const toDateInput = (date: Date) => date.toISOString().slice(0, 10)

const getDefaultRange = () => {
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - 6)
  return { from: toDateInput(from), to: toDateInput(to) }
}

export function ReportsPage() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const defaultRange = useMemo(getDefaultRange, [])
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [appliedRange, setAppliedRange] = useState(defaultRange)
  const [rangeError, setRangeError] = useState("")
  const query = useQuery({
    ...dailySalesQueryOptions({ from: appliedRange.from, to: appliedRange.to }),
    enabled: !isDemo
  })

  const rows = useMemo<ReportRow[]>(() => {
    if (!isDemo) {
      return (query.data?.data ?? []).map((row) => ({
        date: row.date,
        orderCount: row.orderCount,
        revenue: row.revenue
      }))
    }
    return createDemoRows(appliedRange.from, appliedRange.to)
  }, [appliedRange.from, appliedRange.to, isDemo, query.data?.data])

  const totals = rows.reduce(
    (result, row) => ({
      orders: result.orders + row.orderCount,
      revenue: result.revenue + row.revenue
    }),
    { orders: 0, revenue: 0 }
  )
  const averageOrder = totals.orders ? totals.revenue / totals.orders : 0
  const maxRevenue = Math.max(...rows.map((row) => row.revenue), 1)

  const applyRange = () => {
    if (!from || !to || from > to) {
      setRangeError("Khoảng thời gian không hợp lệ.")
      return
    }
    setRangeError("")
    setAppliedRange({ from, to })
  }

  const exportCsv = () => {
    const csv = [
      "Ngày,Số đơn,Doanh thu",
      ...rows.map((row) => `${row.date},${row.orderCount},${row.revenue}`)
    ].join("\n")
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `bao-cao-doanh-thu-${appliedRange.from}-${appliedRange.to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <DashboardHeader section="reports" />
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Khoảng thời gian báo cáo</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 outline-none focus:border-[#16866f]" />
            <span className="text-sm text-slate-400">đến</span>
            <input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 outline-none focus:border-[#16866f]" />
            <button type="button" onClick={applyRange} className="h-10 rounded-lg bg-[#16866f] px-4 text-sm font-medium text-white hover:bg-[#0f705d]">Áp dụng</button>
          </div>
          {rangeError && <p className="mt-2 text-xs text-red-600">{rangeError}</p>}
        </div>
        <button type="button" onClick={exportCsv} className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm text-slate-600 hover:bg-slate-50"><Download size={15} /> Xuất CSV</button>
      </section>

      {isDemo && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Đang hiển thị dữ liệu báo cáo demo vì pbl-api chưa chạy.</p>}
      {!isDemo && query.isLoading && <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">Đang tải dữ liệu báo cáo...</p>}
      {!isDemo && query.isError && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Không thể tải báo cáo từ pbl-api.</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <ReportMetric label="Tổng doanh thu" value={formatMoney(totals.revenue)} icon={TrendingUp} />
        <ReportMetric label="Tổng đơn hàng" value={totals.orders.toLocaleString("vi-VN")} icon={ShoppingCart} />
        <ReportMetric label="Giá trị đơn trung bình" value={formatMoney(averageOrder)} icon={BarChart3} />
      </div>

      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-[#163d36]">Doanh thu theo ngày</h2><p className="mt-1 text-xs text-slate-400">{appliedRange.from} — {appliedRange.to}</p></div><FileText size={19} className="text-[#16866f]" /></div>
        <div className="mt-6 flex h-64 items-end gap-2 overflow-x-auto border-b border-slate-100 pb-0">
          {rows.map((row) => <div key={row.date} className="flex h-full min-w-12 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-slate-500">{row.revenue ? `${Math.round(row.revenue / 1000000 * 10) / 10}tr` : "0"}</span><div title={`${row.date}: ${formatMoney(row.revenue)}`} className="w-full max-w-10 rounded-t-md bg-[#8dd8bd] transition hover:bg-[#16866f]" style={{ height: `${Math.max((row.revenue / maxRevenue) * 82, row.revenue ? 4 : 1)}%` }} /><span className="text-[10px] text-slate-400">{row.date.slice(5)}</span></div>)}
          {!rows.length && <p className="mb-10 w-full text-center text-sm text-slate-400">Không có dữ liệu trong khoảng thời gian này.</p>}
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
        <div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-[#163d36]">Chi tiết doanh thu</h2></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#fbfcfc] text-xs uppercase tracking-wide text-slate-400"><tr><th className="px-5 py-3">Ngày</th><th className="px-5 py-3">Số đơn</th><th className="px-5 py-3">Doanh thu</th><th className="px-5 py-3">Giá trị trung bình</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.date}><td className="px-5 py-4 text-slate-600">{row.date}</td><td className="px-5 py-4 text-slate-600">{row.orderCount}</td><td className="px-5 py-4 font-medium text-slate-700">{formatMoney(row.revenue)}</td><td className="px-5 py-4 text-slate-500">{formatMoney(row.orderCount ? row.revenue / row.orderCount : 0)}</td></tr>)}</tbody></table></div>
      </section>
    </main>
  )
}

function ReportMetric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof TrendingUp }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_15px_rgba(20,50,45,0.04)]"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6f5ee] text-[#16866f]"><Icon size={18} /></div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p></section>
}

function createDemoRows(from: string, to: string): ReportRow[] {
  const result: ReportRow[] = []
  const current = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  while (current <= end) {
    const day = current.getDate()
    result.push({ date: toDateInput(current), orderCount: 18 + (day % 7), revenue: (18 + (day % 7)) * (480000 + (day % 4) * 35000) })
    current.setDate(current.getDate() + 1)
  }
  return result
}
