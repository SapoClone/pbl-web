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

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
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
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6f5ee] text-[#16866f]">
        <Icon size={18} />
      </div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p>
    </section>
  )
}
