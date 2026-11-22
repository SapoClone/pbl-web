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
  /** The permission that opens the page (`<module>.view`); the sidebar hides the entry and the layout refuses the page without it */
  permission?: string
  children?: Array<{ label: string; tab: string }>
}

export const navigation: NavigationItem[] = [
  { label: "Tổng quan", icon: LayoutDashboard, to: "/", permission: "dashboard.view" },
  {
    label: "Sản phẩm",
    icon: Package,
    to: "/products", permission: "products.view",
    children: [
      { label: "Danh mục sản phẩm", tab: "catalog" },
      { label: "Bảng giá đa kênh", tab: "price-lists" },
      { label: "Sản phẩm Combo", tab: "combos" }
    ]
  },
  {
    label: "Tồn kho",
    icon: Warehouse,
    to: "/inventory", permission: "inventory.view",
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
  { label: "Đơn hàng", icon: ClipboardList, to: "/orders", permission: "orders.view" },
  { label: "Bán tại quầy", icon: Monitor, to: "/pos", permission: "pos.view" },
  {
    label: "Khuyến mãi",
    icon: Ticket,
    to: "/promotions", permission: "orders.view",
    children: [
      { label: "Chương trình KM", tab: "programs" },
      { label: "Mã giảm giá (Coupon)", tab: "coupons" },
      { label: "Kiểm thử áp mã", tab: "simulator" }
    ]
  },
  {
    label: "Kênh bán hàng",
    icon: Share2,
    to: "/channels", permission: "channels.view",
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
    to: "/customers", permission: "customers.view",
    children: [
      { label: "Danh sách khách hàng", tab: "customers" },
      { label: "Nhóm khách hàng", tab: "groups" },
      { label: "Hạng thành viên & Điểm", tab: "loyalty" }
    ]
  },
  {
    label: "Báo cáo",
    icon: BarChart3,
    to: "/reports", permission: "reports.view",
    children: [
      { label: "Bán hàng theo kênh", tab: "channels" },
      { label: "Báo cáo sản phẩm", tab: "products" },
      { label: "Giá trị tồn & Xuất nhập", tab: "inventory" },
      { label: "Tài chính & Lợi nhuận", tab: "finance" }
    ]
  },
  { label: "Nhập hàng & NCC", icon: Truck, to: "/suppliers", permission: "purchasing.view" },
  {
    label: "Nhân viên & Quyền",
    icon: ShieldCheck,
    to: "/staff", permission: "staff.view",
    children: [
      { label: "Nhân viên", tab: "members" },
      { label: "Vai trò & phân quyền", tab: "roles" },
      { label: "Ca làm việc", tab: "shifts" }
    ]
  }
]
