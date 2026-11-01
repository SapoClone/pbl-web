import { AlertCircle, ArrowRight, Bell, Package, ShoppingCart, Sparkles, TrendingUp } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { dailySalesQueryOptions } from "@/api/tanstack-query/dailySalesQueryOptions"
import { ordersQueryOptions } from "@/api/tanstack-query/ordersQueryOptions"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { products } from "@/shared/dashboard/dashboard.mock"
import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"
import { MetricCard } from "./MetricCard"
import { OrderTable } from "@/features/orders/OrderTable"

const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")} ₫`
const toDateInput = (date: Date) => date.toISOString().slice(0, 10)

export function OverviewPage() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - 6)
  const salesQuery = useQuery({
    ...dailySalesQueryOptions({ from: toDateInput(from), to: toDateInput(to) }),
    enabled: !isDemo
  })
  const ordersQuery = useQuery({
    ...ordersQueryOptions({ page: 1, limit: 1 }),
    enabled: !isDemo
  })
  const demoRevenue = 24800000
  const demoOrders = 40
  const revenue = isDemo ? demoRevenue : salesQuery.data?.totals.revenue ?? 0
  const orderCount = isDemo ? demoOrders : salesQuery.data?.totals.orderCount ?? 0
  const averageOrder = orderCount ? revenue / orderCount : 0
  const lowStock = products.filter((product) => product.stock < 10)
  const chartRows = isDemo ? createDemoRows() : salesQuery.data?.data ?? []
  const maxRevenue = Math.max(...chartRows.map((row) => row.revenue), 1)

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <DashboardHeader section="overview" />
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-[11px] text-slate-500"><Sparkles size={14} className="text-[#16866f]" /> Chào bạn, đây là tình hình kinh doanh 7 ngày gần nhất.</div>
        {isDemo && <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">Đang hiển thị dữ liệu minh họa vì pbl-api chưa chạy.</div>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Doanh thu 7 ngày" value={formatMoney(revenue)} change={isDemo ? "Dữ liệu demo" : "Dữ liệu thật"} detail="" icon={TrendingUp} />
          <MetricCard label="Đơn hàng trong kỳ" value={orderCount.toLocaleString("vi-VN")} change={isDemo ? "Dữ liệu demo" : "Theo báo cáo"} detail="" icon={ShoppingCart} />
          <MetricCard label="Giá trị đơn trung bình" value={formatMoney(averageOrder)} change="Doanh thu / đơn" detail="" icon={Package} />
          <MetricCard label="Sản phẩm sắp hết" value={lowStock.length.toLocaleString("vi-VN")} change={lowStock.length ? "Cần kiểm tra" : "Ổn định"} detail="" icon={AlertCircle} positive={!lowStock.length} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.7fr_0.85fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(20,50,45,0.03)]">
            <div className="flex items-center justify-between"><div><h2 className="text-[13px] font-semibold text-[#163d36]">Doanh thu theo ngày</h2><p className="mt-1 text-[10px] text-slate-400">7 ngày gần nhất · VND</p></div><TrendingUp size={17} className="text-[#16866f]" /></div>
            <div className="mt-5 flex h-48 items-end gap-2 border-b border-slate-100 pb-0">
              {chartRows.map((row) => <div key={row.date} className="flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] text-slate-400">{row.revenue ? `${Math.round(row.revenue / 100000) / 10}tr` : "0"}</span><div title={`${row.date}: ${formatMoney(row.revenue)}`} className="w-full max-w-10 rounded-t bg-[#73c8a9] hover:bg-[#16866f]" style={{ height: `${Math.max((row.revenue / maxRevenue) * 80, row.revenue ? 4 : 1)}%` }} /><span className="text-[9px] text-slate-400">{row.date.slice(5)}</span></div>)}
              {!chartRows.length && <p className="mb-12 w-full text-center text-xs text-slate-400">Chưa có dữ liệu doanh thu.</p>}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(20,50,45,0.03)]">
            <div className="flex items-center justify-between"><h2 className="text-[13px] font-semibold text-[#163d36]">Cần chú ý</h2><Bell size={16} className="text-[#c98222]" /></div>
            <div className="mt-4 space-y-3">{lowStock.length ? lowStock.map((product) => <div key={product.sku} className="flex gap-2 text-xs"><AlertCircle size={15} className="shrink-0 text-[#c98222]" /><span className="text-slate-600"><b>{product.name}</b><span className="block text-slate-400">Còn {product.stock} {product.unit || "sản phẩm"} · cần nhập thêm</span></span></div>) : <p className="text-xs text-slate-500">Không có cảnh báo tồn kho.</p>}</div>
            <a href="/inventory" className="mt-5 flex items-center gap-1 text-xs font-semibold text-[#16866f]">Xem tồn kho <ArrowRight size={13} /></a>
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white shadow-[0_2px_8px_rgba(20,50,45,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="text-[13px] font-semibold text-[#163d36]">Đơn hàng gần đây</h2><p className="mt-1 text-[10px] text-slate-400">{isDemo ? "Dữ liệu minh họa" : ordersQuery.isLoading ? "Đang tải..." : `${ordersQuery.data?.pagination.totalRecords ?? 0} đơn trong hệ thống`}</p></div><a href="/orders" className="flex items-center gap-1 text-[10px] font-semibold text-[#16866f]">Xem tất cả <ArrowRight size={11} /></a></div>
          <OrderTable compact />
        </section>
      </div>
    </main>
  )
}

function createDemoRows() {
  return [6, 5, 4, 3, 2, 1, 0].map((offset, index) => {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const orderCount = 4 + (index % 4)
    return { date: toDateInput(date), orderCount, revenue: orderCount * (480000 + (index % 3) * 50000) }
  })
}
