import type { LucideIcon } from "lucide-react"

export type DashboardSection = "overview" | "products" | "inventory" | "orders" | "pos" | "promotions" | "channels" | "customers" | "suppliers" | "staff" | "reports"

export type Order = {
  id: string
  externalOrderCode?: string | null
  customer: string
  channel: string
  paymentMethod?: string
  fulfillmentStatus?: string
  exceptionCode?: string | null
  total: string
  status: "Đã giao" | "Đang xử lý" | "Chờ thanh toán" | "Đã hủy"
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
  isCombo?: boolean
  catalogStatus?: "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED"
  unit?: string
  barcode?: string
  costPrice?: number
  retailPrice?: number
  images?: Array<{ key: string; url: string; altText?: string | null; sortOrder: number }>
  imageUrls?: string[]
  variantCount?: number
  lazadaSkuCount?: number
  shopeeSkuCount?: number
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
  /** The value is still loading: a placeholder is shown instead of `value` and `change` */
  loading?: boolean
}
