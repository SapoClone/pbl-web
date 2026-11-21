import { useMemo } from "react"
import { Link } from "@tanstack/react-router"
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ShoppingBag,
  ShoppingCart
} from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { getOrdersSummary } from "@/api/sales/orders"
import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"
import { orders } from "@/shared/dashboard/dashboard.mock"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { OrderTable } from "./OrderTable"

export function OrdersPage() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const summaryQuery = useQuery({
    queryKey: ["orders-summary"],
    queryFn: () => getOrdersSummary(),
    enabled: !isDemo
  })

  const demoSummary = useMemo(
    () => ({
      total: orders.length,
      processing: orders.filter((order) => order.status === "Đang xử lý")
        .length,
      completed: orders.filter((order) => order.status === "Đã giao").length,
      marketplace: orders.filter(
        (order) => order.channel === "Lazada" || order.channel === "Shopee"
      ).length
    }),
    []
  )

  const liveSummary = summaryQuery.data
  const needsActionCount = isDemo ? 1 : (liveSummary?.needsAction.total ?? 0)

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <DashboardHeader section="orders" />

      {needsActionCount > 0 && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-600" />
            <span>
              Có <strong>{needsActionCount} đơn hàng từ sàn TMĐT (Lazada)</strong>{" "}
              đang chờ liên kết mã hàng hóa (SKU) hoặc bổ sung tồn kho để hoàn
              tất đồng bộ.
            </span>
          </div>
          <Link
            to={"/channels" as never}
            search={{ tab: "conflicts" } as never}
            className="rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white transition hover:bg-amber-700"
          >
            Mở Xử lý xung đột kênh bán →
          </Link>
        </div>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OrderMetric
          label="Tổng đơn hàng hôm nay"
          value={
            isDemo
              ? demoSummary.total
              : (liveSummary?.today.total ??
                liveSummary?.tabCounts.all ??
                "—")
          }
          icon={ShoppingCart}
        />
        <OrderMetric
          label="Đang đóng gói & Giao vận"
          value={
            isDemo
              ? demoSummary.processing
              : liveSummary
                ? liveSummary.awaitingConfirmation +
                  liveSummary.inFulfillment.packing +
                  liveSummary.inFulfillment.shipping
                : "—"
          }
          icon={Clock3}
        />
        <OrderMetric
          label="Đã hoàn tất"
          value={
            isDemo
              ? demoSummary.completed
              : (liveSummary?.today.completed ??
                liveSummary?.tabCounts.completed ??
                "—")
          }
          icon={CheckCircle2}
        />
        <OrderMetric
          label={
            isDemo
              ? "Đơn hàng Sàn TMĐT (Lazada/Shopee)"
              : "Đơn sàn cần xử lý SKU/Tồn"
          }
          value={isDemo ? demoSummary.marketplace : needsActionCount}
          icon={ShoppingBag}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_4px_24px_-4px_rgba(20,50,45,0.04),0_16px_40px_-12px_rgba(20,50,45,0.06)] backdrop-blur-sm">
        <OrderTable />
      </section>
    </main>
  )
}

function OrderMetric({
  label,
  value,
  icon: Icon
}: {
  label: string
  value: number | string
  icon: typeof ShoppingCart
}) {
  return (
    <section className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-[0_4px_20px_-4px_rgba(20,50,45,0.04),0_12px_28px_-8px_rgba(20,50,45,0.05)] backdrop-blur-sm transition-all duration-300 hover:border-[#16866f]/30 hover:shadow-[0_8px_30px_-4px_rgba(20,50,45,0.08)]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#16866f]/20 bg-[#e6f5ee] text-[#16866f] shadow-2xs transition-transform duration-300 group-hover:scale-105">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-[#163d36] sm:text-3xl">
        {value}
      </p>
    </section>
  )
}
