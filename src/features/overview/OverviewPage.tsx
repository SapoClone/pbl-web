import { useMemo } from "react"
import { Link } from "@tanstack/react-router"
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  Monitor,
  Package,
  Share2,
  ShoppingCart,
  Sparkles,
  TrendingUp
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getStockSummary, listStockLevels } from "@/api/inventory/stock"
import { getOrdersSummary } from "@/api/sales/orders"
import { dailySalesQueryOptions } from "@/api/tanstack-query/dailySalesQueryOptions"
import { ordersQueryOptions } from "@/api/tanstack-query/ordersQueryOptions"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { products as demoProducts } from "@/shared/dashboard/dashboard.mock"
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
  const ordersSummaryQuery = useQuery({
    queryKey: ["orders-summary"],
    queryFn: () => getOrdersSummary(),
    enabled: !isDemo
  })
  const stockSummaryQuery = useQuery({
    queryKey: ["inventory-summary", ""],
    queryFn: () => getStockSummary(),
    enabled: !isDemo
  })
  const stockLevelsQuery = useQuery({
    queryKey: ["inventory-stock-overview"],
    queryFn: () => listStockLevels(),
    enabled: !isDemo
  })

  const demoRevenue = 24800000
  const demoOrders = 40
  const revenue = isDemo ? demoRevenue : (salesQuery.data?.totals.revenue ?? 0)
  const orderCount = isDemo
    ? demoOrders
    : (salesQuery.data?.totals.orderCount ?? 0)
  const averageOrder = orderCount ? Math.round(revenue / orderCount) : 0

  const lowStockItems = useMemo(() => {
    if (isDemo) {
      return demoProducts
        .filter((product) => product.stock < 10)
        .map((p) => ({
          key: p.sku,
          sku: p.sku,
          name: p.name,
          available: p.stock,
          minQuantity: 10,
          level: p.stock <= 0 ? ("out_of_stock" as const) : ("below_min" as const)
        }))
    }
    const liveRows = stockLevelsQuery.data?.data ?? []
    return liveRows
      .filter(
        (item) =>
          item.level === "out_of_stock" ||
          item.level === "below_min" ||
          item.available < (item.minQuantity ?? 10)
      )
      .slice(0, 6)
      .map((item) => ({
        key: `${item.branchId}-${item.variantId}`,
        sku: item.sku ?? item.variantId.slice(0, 8),
        name:
          item.name && item.variantLabel && !item.name.includes(item.variantLabel)
            ? `${item.name} - ${item.variantLabel}`
            : (item.name ?? item.sku ?? "Sản phẩm"),
        available: item.available,
        minQuantity: item.minQuantity ?? 10,
        level:
          item.available <= 0 ? ("out_of_stock" as const) : ("below_min" as const)
      }))
  }, [isDemo, stockLevelsQuery.data?.data])

  const lowStockCount = isDemo
    ? lowStockItems.length
    : stockSummaryQuery.data
      ? stockSummaryQuery.data.belowMinCount +
        stockSummaryQuery.data.outOfStockCount
      : lowStockItems.length

  const needsActionOrders = isDemo
    ? 1
    : (ordersSummaryQuery.data?.needsAction?.total ?? 0)

  const chartRows = isDemo ? createDemoRows() : (salesQuery.data?.data ?? [])
  const maxRevenue = Math.max(...chartRows.map((row) => row.revenue), 1)

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <DashboardHeader section="overview" />
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e6f5ee] text-[#16866f]">
              <Sparkles size={14} />
            </span>
            <span>
              Chào bạn, đây là nhịp vận hành kinh doanh đa kênh{" "}
              <b className="text-[#163d36]">7 ngày gần nhất</b>.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={"/pos" as never}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#16866f] px-3 py-1.5 text-xs font-semibold text-white shadow-2xs transition hover:bg-[#0f705d]"
            >
              <Monitor size={13} /> Mở quầy POS
            </Link>
            <Link
              to={"/inventory" as never}
              search={{ tab: "receipts" } as never}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Boxes size={13} /> Tạo phiếu nhập kho
            </Link>
            <Link
              to={"/channels" as never}
              search={{ tab: "overview" } as never}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Share2 size={13} /> Đồng bộ sàn TMĐT
            </Link>
          </div>
        </div>

        {isDemo && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Đang hiển thị dữ liệu minh họa vì đang dùng tài khoản Demo offline.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Doanh thu 7 ngày"
            value={formatMoney(revenue)}
            change={isDemo ? "Dữ liệu demo" : "Đồng bộ đa kênh"}
            detail=""
            icon={TrendingUp}
          />
          <MetricCard
            label="Đơn hàng trong kỳ"
            value={orderCount.toLocaleString("vi-VN")}
            change={
              needsActionOrders > 0
                ? `${needsActionOrders} đơn sàn cần xử lý`
                : "Vận hành ổn định"
            }
            detail=""
            icon={ShoppingCart}
            positive={needsActionOrders === 0}
          />
          <MetricCard
            label="Giá trị đơn trung bình"
            value={formatMoney(averageOrder)}
            change="Doanh thu / đơn"
            detail=""
            icon={Package}
          />
          <MetricCard
            label="SKU chạm ngưỡng / hết tồn"
            value={lowStockCount.toLocaleString("vi-VN")}
            change={lowStockCount ? "Cần bổ sung tồn" : "Đủ định mức"}
            detail=""
            icon={AlertCircle}
            positive={!lowStockCount}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.65fr_0.9fr]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(20,50,45,0.03)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#163d36]">
                  Biểu đồ doanh thu theo ngày
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  7 ngày gần nhất · Tổng {formatMoney(revenue)} ({orderCount}{" "}
                  đơn)
                </p>
              </div>
              <Link
                to={"/reports" as never}
                className="inline-flex items-center gap-1 rounded-lg bg-[#e6f5ee] px-2.5 py-1 text-[11px] font-semibold text-[#16866f] transition hover:bg-[#d5ede2]"
              >
                Báo cáo chi tiết <ArrowRight size={12} />
              </Link>
            </div>
            <div className="mt-6 flex h-52 items-end gap-2.5 border-b border-slate-100 pb-1">
              {chartRows.map((row) => {
                const heightPct = Math.max(
                  (row.revenue / maxRevenue) * 82,
                  row.revenue ? 6 : 2
                )
                return (
                  <div
                    key={row.date}
                    className="group flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <span className="text-[10px] font-medium tabular-nums text-slate-500 transition group-hover:font-bold group-hover:text-[#16866f]">
                      {row.revenue
                        ? `${Math.round(row.revenue / 100000) / 10}tr`
                        : "0"}
                    </span>
                    <div
                      title={`${row.date}: ${formatMoney(row.revenue)} (${row.orderCount} đơn)`}
                      className="w-full max-w-11 rounded-t-md bg-gradient-to-t from-[#16866f] to-[#73c8a9] transition-all duration-200 group-hover:from-[#0f705d] group-hover:to-[#16866f]"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] tabular-nums text-slate-400">
                      {row.date.slice(5)}
                    </span>
                  </div>
                )
              })}
              {!chartRows.length && (
                <p className="mb-12 w-full text-center text-xs text-slate-400">
                  Chưa có dữ liệu doanh thu trong 7 ngày qua.
                </p>
              )}
            </div>
          </section>

          <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_rgba(20,50,45,0.03)]">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#163d36]">
                    Cảnh báo tồn kho & Vận hành
                  </h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Theo dõi thời gian thực từ Inventory & Integration
                  </p>
                </div>
                <Bell size={16} className="text-[#c98222]" />
              </div>

              {needsActionOrders > 0 && (
                <div className="mt-3.5 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-800">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 text-amber-600" />
                    <span>
                      <b>{needsActionOrders} đơn Lazada</b> chờ ánh xạ SKU/tồn
                    </span>
                  </span>
                  <Link
                    to={"/channels" as never}
                    search={{ tab: "conflicts" } as never}
                    className="shrink-0 font-semibold text-amber-900 underline"
                  >
                    Xử lý
                  </Link>
                </div>
              )}

              <div className="mt-4 space-y-2.5">
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((product) => (
                    <div
                      key={product.key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-xs transition hover:border-slate-200 hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <AlertCircle
                          size={14}
                          className={`shrink-0 ${
                            product.level === "out_of_stock"
                              ? "text-red-500"
                              : "text-[#c98222]"
                          }`}
                        />
                        <div className="min-w-0">
                          <b className="block truncate text-slate-700">
                            {product.name}
                          </b>
                          <span className="font-mono text-[10px] text-slate-400">
                            SKU: {product.sku} · Định mức: {product.minQuantity}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                          product.available <= 0
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {product.available <= 0
                          ? "Hết hàng"
                          : `Còn ${product.available}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg bg-emerald-50/60 p-4 text-center text-xs text-emerald-700">
                    Tất cả mặt hàng đều đạt trên định mức tồn kho an toàn.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <Link
                to={"/inventory" as never}
                search={{ tab: "thresholds" } as never}
                className="text-xs font-medium text-slate-500 hover:text-[#163d36]"
              >
                Thiết lập định mức
              </Link>
              <Link
                to={"/inventory" as never}
                className="flex items-center gap-1 text-xs font-semibold text-[#16866f] hover:underline"
              >
                Xem toàn bộ tồn kho <ArrowRight size={13} />
              </Link>
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(20,50,45,0.03)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-[#163d36]">
                Đơn hàng gần đây
              </h2>
              <p className="mt-1 text-[10px] text-slate-400">
                {isDemo
                  ? "Dữ liệu minh họa"
                  : ordersQuery.isLoading
                    ? "Đang tải..."
                    : `${ordersQuery.data?.pagination.totalRecords ?? 0} đơn trong hệ thống`}
              </p>
            </div>
            <Link
              to={"/orders" as never}
              className="flex items-center gap-1 text-xs font-semibold text-[#16866f] hover:underline"
            >
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
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
    return {
      date: toDateInput(date),
      orderCount,
      revenue: orderCount * (480000 + (index % 3) * 50000)
    }
  })
}
