import { useMemo, useState } from "react"
import { Eye, Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { ordersQueryOptions } from "@/api/tanstack-query/ordersQueryOptions"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { orders as demoOrders } from "@/shared/dashboard/dashboard.mock"
import type { Order } from "@/shared/dashboard/dashboard.types"
import { Button } from "@/components/ui/button"

type OrderRow = Order & {
  itemCount?: number
  branchId?: string
  items?: Array<{ sku: string; name: string; quantity: number; unitPrice: number; lineTotal: number }>
}

const statusClass: Record<string, string> = {
  "Đã giao": "bg-[#e6f5ee] text-[#147853]",
  "Đang xử lý": "bg-[#fff4df] text-[#a66a0b]",
  "Chờ thanh toán": "bg-[#fce9e8] text-[#c44a42]",
  "Đã hủy": "bg-slate-100 text-slate-500"
}

const displayStatus = (status: string): string => {
  if (status === "COMPLETED") return "Đã giao"
  if (status === "PENDING") return "Đang xử lý"
  if (status === "CANCELLED") return "Đã hủy"
  return "Chờ thanh toán"
}

export function OrderTable({ compact = false }: { compact?: boolean }) {
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [queryText, setQueryText] = useState("")
  const [status, setStatus] = useState("all")
  const [channel, setChannel] = useState("all")
  const [selected, setSelected] = useState<OrderRow | null>(null)
  const query = useQuery({
    ...ordersQueryOptions({ page: 1, limit: compact ? 4 : 100 }),
    enabled: !isDemo
  })

  const rows = useMemo<OrderRow[]>(() => {
    if (isDemo) return demoOrders
    return (query.data?.data ?? []).map((order) => ({
      id: order.code,
      customer: order.customerName ?? "Khách lẻ",
      channel: order.paymentMethod,
      total: `${order.totalAmount.toLocaleString("vi-VN")} ₫`,
      status: displayStatus(order.status) as Order["status"],
      date: new Date(order.createdAt).toLocaleString("vi-VN"),
      itemCount: order.itemCount,
      branchId: order.branchId,
      items: order.items
    }))
  }, [isDemo, query.data?.data])

  const channels = [...new Set(rows.map((order) => order.channel))]
  const filtered = rows.filter((order) => {
    const text = `${order.id} ${order.customer} ${order.channel}`.toLowerCase()
    return text.includes(queryText.toLowerCase()) &&
      (status === "all" || order.status === status) &&
      (channel === "all" || order.channel === channel)
  }).slice(0, compact ? 4 : undefined)

  if (!isDemo && query.isLoading) return <div className="p-8 text-center text-sm text-slate-500">Đang tải đơn hàng...</div>
  if (!isDemo && query.isError) return <div className="p-8 text-center text-sm text-red-600">Không thể tải đơn hàng từ pbl-api.</div>

  return (
    <>
      {!compact && (
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400">
            <Search size={16} />
            <input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Tìm mã đơn, khách hàng..." className="w-56 outline-none placeholder:text-slate-400" />
          </label>
          <select aria-label="Lọc trạng thái đơn hàng" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="all">Tất cả trạng thái</option>
            <option>Đã giao</option>
            <option>Đang xử lý</option>
            <option>Chờ thanh toán</option>
            <option>Đã hủy</option>
          </select>
          <select aria-label="Lọc kênh bán hàng" value={channel} onChange={(event) => setChannel(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 outline-none">
            <option value="all">Tất cả kênh</option>
            {channels.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
            <tr>{["Mã đơn", "Khách hàng", "Kênh bán", "Số sản phẩm", "Tổng tiền", "Trạng thái", "Thời gian", ""].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-semibold text-[#163d36]">{order.id}</td>
                <td className="px-5 py-4 text-slate-600">{order.customer}</td>
                <td className="px-5 py-4 text-slate-500">{order.channel}</td>
                <td className="px-5 py-4 text-slate-500">{order.itemCount ?? "—"}</td>
                <td className="px-5 py-4 font-medium text-slate-700">{order.total}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass[order.status] ?? "bg-slate-100 text-slate-500"}`}>{order.status}</span></td>
                <td className="px-5 py-4 text-xs text-slate-400">{order.date}</td>
                <td className="px-5 py-4 text-right"><Button variant="ghost" size="icon" title="Xem chi tiết đơn hàng" aria-label={`Xem chi tiết ${order.id}`} onClick={() => setSelected(order)} className="text-slate-400 hover:bg-[#e6f5ee] hover:text-[#16866f]"><Eye size={16} /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-10 text-center text-sm text-slate-500">Không tìm thấy đơn hàng phù hợp.</p>}
      </div>
      {selected && <OrderDetails order={selected} onClose={() => setSelected(null)} />}
    </>
  )
}

function OrderDetails({ order, onClose }: { order: OrderRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-[#163d36]/30 p-4 pt-20 backdrop-blur-sm" role="dialog" aria-modal="true">
      <section className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div><p className="text-xs uppercase tracking-wide text-[#16866f]">Chi tiết đơn hàng</p><h2 className="mt-1 text-xl font-semibold text-[#163d36]">{order.id}</h2></div>
          <button type="button" onClick={onClose} className="text-sm text-slate-400 hover:text-slate-700">Đóng</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm"><div><span className="text-slate-400">Khách hàng</span><p className="font-medium text-slate-700">{order.customer}</p></div><div><span className="text-slate-400">Kênh bán</span><p className="font-medium text-slate-700">{order.channel}</p></div><div><span className="text-slate-400">Trạng thái</span><p className="font-medium text-slate-700">{order.status}</p></div><div><span className="text-slate-400">Tổng tiền</span><p className="font-semibold text-[#16866f]">{order.total}</p></div></div>
        {order.items && <div className="mt-6 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-700">Sản phẩm</h3><div className="mt-3 divide-y divide-slate-100">{order.items.map((item) => <div key={item.sku} className="flex justify-between gap-4 py-2 text-sm"><span className="text-slate-600">{item.name} <small className="text-slate-400">x{item.quantity}</small></span><span className="text-slate-700">{item.lineTotal.toLocaleString("vi-VN")} ₫</span></div>)}</div></div>}
        <div className="mt-6 flex justify-end"><Button onClick={onClose} className="bg-[#16866f] text-white hover:bg-[#0f705d]">Đóng</Button></div>
      </section>
    </div>
  )
}
