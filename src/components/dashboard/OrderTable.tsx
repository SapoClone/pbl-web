import { MoreHorizontal } from "lucide-react"
import { orders } from "./dashboard.data"
import type { Order } from "./dashboard.types"

const statusClass: Record<Order["status"], string> = {
  "Đã giao": "bg-[#e6f5ee] text-[#147853]",
  "Đang xử lý": "bg-[#fff4df] text-[#a66a0b]",
  "Chờ thanh toán": "bg-[#fce9e8] text-[#c44a42]"
}

export function OrderTable({ compact = false }: { compact?: boolean }) {
  const rows = compact ? orders.slice(0, 4) : orders
  return <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400"><tr>{["Mã đơn", "Khách hàng", "Kênh", "Tổng tiền", "Trạng thái", "Thời gian", ""].map((heading) => <th key={heading} className="px-5 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((order) => <tr key={order.id} className="hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-[#163d36]">{order.id}</td><td className="px-5 py-4 text-slate-600">{order.customer}</td><td className="px-5 py-4 text-slate-500">{order.channel}</td><td className="px-5 py-4 font-medium text-slate-700">{order.total}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass[order.status]}`}>{order.status}</span></td><td className="px-5 py-4 text-xs text-slate-400">{order.date}</td><td className="px-5 py-4 text-right"><MoreHorizontal size={17} className="text-slate-400" /></td></tr>)}</tbody></table></div>
}
