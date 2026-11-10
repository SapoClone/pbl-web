import type { LucideIcon } from "lucide-react"
import {
  ClipboardList,
  LayoutDashboard,
  Monitor,
  Package,
  BarChart3,
  Share2,
  ShieldCheck,
  Truck,
  UsersRound,
  Warehouse
} from "lucide-react"

export type NavigationItem = {
  label: string
  to: string
  icon: LucideIcon
  badge?: string
  children?: Array<{ label: string; tab: string }>
}

export const navigation: NavigationItem[] = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/" },
  { label: "Sản phẩm", icon: Package, to: "/products" },
  {
    label: "Tồn kho",
    icon: Warehouse,
    to: "/inventory",
    children: [
      { label: "Tổng quan tồn kho", tab: "stock" },
      { label: "Tồn theo kho", tab: "balances" },
      { label: "Nhập kho", tab: "receipts" },
      { label: "Xuất kho", tab: "issues" },
      { label: "Chuyển kho", tab: "transfers" },
      { label: "Kiểm kho", tab: "stocktakes" },
      { label: "Sổ kho", tab: "ledger" },
      { label: "Biến động kho", tab: "movements" },
      { label: "Định mức tồn", tab: "thresholds" },
      { label: "Đối soát", tab: "reconcile" },
      { label: "Danh sách kho", tab: "warehouses" }
    ]
  },
  { label: "Đơn hàng", icon: ClipboardList, to: "/orders", badge: "3" },
  { label: "Bán tại quầy", icon: Monitor, to: "/pos" },
  { label: "Kênh bán hàng", icon: Share2, to: "/channels" },
  { label: "Khách hàng", icon: UsersRound, to: "/customers" },
  { label: "Báo cáo", icon: BarChart3, to: "/reports" },
  { label: "Nhập hàng & NCC", icon: Truck, to: "/suppliers" },
  { label: "Nhân viên & Quyền", icon: ShieldCheck, to: "/staff" }
]
