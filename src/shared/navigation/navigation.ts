import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Monitor,
  Package,
  Share2,
  ShieldCheck,
  Ticket,
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
  {
    label: "Sản phẩm",
    icon: Package,
    to: "/products",
    children: [
      { label: "Danh mục sản phẩm", tab: "catalog" },
      { label: "Bảng giá đa kênh", tab: "price-lists" },
      { label: "Sản phẩm Combo", tab: "combos" }
    ]
  },
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
  { label: "Đơn hàng", icon: ClipboardList, to: "/orders" },
  { label: "Bán tại quầy", icon: Monitor, to: "/pos" },
  {
    label: "Khuyến mãi",
    icon: Ticket,
    to: "/promotions",
    children: [
      { label: "Chương trình KM", tab: "programs" },
      { label: "Mã giảm giá (Coupon)", tab: "coupons" },
      { label: "Kiểm thử áp mã", tab: "simulator" }
    ]
  },
  {
    label: "Kênh bán hàng",
    icon: Share2,
    to: "/channels",
    children: [
      { label: "Tổng quan & Lazada", tab: "overview" },
      { label: "Ánh xạ SKU Lazada", tab: "sku-mappings" },
      { label: "Tiến trình đồng bộ", tab: "sync-jobs" },
      { label: "Xung đột đồng bộ", tab: "conflicts" },
      { label: "Đối soát vận hành", tab: "reconciliation" }
    ]
  },
  {
    label: "Khách hàng",
    icon: UsersRound,
    to: "/customers",
    children: [
      { label: "Danh sách khách hàng", tab: "customers" },
      { label: "Nhóm khách hàng", tab: "groups" },
      { label: "Hạng thành viên & Điểm", tab: "loyalty" }
    ]
  },
  {
    label: "Báo cáo",
    icon: BarChart3,
    to: "/reports",
    children: [
      { label: "Bán hàng theo kênh", tab: "channels" },
      { label: "Báo cáo sản phẩm", tab: "products" },
      { label: "Giá trị tồn & Xuất nhập", tab: "inventory" },
      { label: "Tài chính & Lợi nhuận", tab: "finance" }
    ]
  },
  { label: "Nhập hàng & NCC", icon: Truck, to: "/suppliers" },
  { label: "Nhân viên & Quyền", icon: ShieldCheck, to: "/staff" }
]
