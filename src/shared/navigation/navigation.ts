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
}

export const navigation: NavigationItem[] = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/" },
  { label: "Sản phẩm", icon: Package, to: "/products" },
  { label: "Tồn kho", icon: Warehouse, to: "/inventory" },
  { label: "Đơn hàng", icon: ClipboardList, to: "/orders", badge: "3" },
  { label: "Bán tại quầy", icon: Monitor, to: "/pos" },
  { label: "Kênh bán hàng", icon: Share2, to: "/channels" },
  { label: "Khách hàng", icon: UsersRound, to: "/customers" },
  { label: "Báo cáo", icon: BarChart3, to: "/reports" },
  { label: "Nhập hàng & NCC", icon: Truck, to: "/suppliers" },
  { label: "Nhân viên & Quyền", icon: ShieldCheck, to: "/staff" }
]
