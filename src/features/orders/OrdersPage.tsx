import { useMemo } from "react"
import { CheckCircle2, Clock3, ShoppingCart } from "lucide-react"
import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"
import { OrderTable } from "./OrderTable"
import { orders } from "@/shared/dashboard/dashboard.mock"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

export function OrdersPage() {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const summary = useMemo(() => ({
    total: orders.length,
    processing: orders.filter((order) => order.status === "Đang xử lý").length,
    completed: orders.filter((order) => order.status === "Đã giao").length
  }), [])

  return <main className="mx-auto max-w-[1520px] py-7">
    <DashboardHeader section="orders" />
    <div className="mb-5 grid gap-4 md:grid-cols-3">
      <OrderMetric label="Tổng đơn hàng" value={isDemo ? summary.total : "—"} icon={ShoppingCart} />
      <OrderMetric label="Đang xử lý" value={isDemo ? summary.processing : "—"} icon={Clock3} />
      <OrderMetric label="Đã hoàn tất" value={isDemo ? summary.completed : "—"} icon={CheckCircle2} />
    </div>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]"><OrderTable /></section>
  </main>
}

function OrderMetric({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof ShoppingCart }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#e6f5ee] text-[#16866f]"><Icon size={18} /></div><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-[#163d36]">{value}</p></section>
}
