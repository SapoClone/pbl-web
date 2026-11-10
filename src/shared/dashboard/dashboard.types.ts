import type { LucideIcon } from "lucide-react"

export type DashboardSection = "overview" | "products" | "inventory" | "orders" | "pos" | "channels" | "customers" | "suppliers" | "staff" | "reports"

export type Order = {
  id: string
  customer: string
  channel: string
  total: string
  status: "Đã giao" | "Đang xử lý" | "Chờ thanh toán"
  date: string
}

export type Product = {
  id?: string
  variantId?: string
  name: string
  sku: string
  category: string
  categoryId?: string
  brand?: string
  brandId?: string
  description?: string
  version?: number
  catalogStatus?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED"
  unit?: string
  barcode?: string
  costPrice?: number
  retailPrice?: number
  imageUrls?: string[]
  stock: number
  price: string
  state: "Đang bán" | "Ngừng kinh doanh" | "Sắp hết hàng" | "Hết hàng" | "Lưu nháp" | "Đã lưu trữ"
}

export type SectionMeta = {
  eyebrow: string
  title: string
  description: string
}

export type Metric = {
  label: string
  value: string
  change: string
  detail?: string
  icon: LucideIcon
  positive?: boolean
}
