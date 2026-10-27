import type { LucideIcon } from "lucide-react"

export type DashboardSection = "overview" | "orders" | "products" | "inventory" | "customers" | "reports"

export type Order = {
  id: string
  customer: string
  channel: string
  total: string
  status: "Đã giao" | "Đang xử lý" | "Chờ thanh toán"
  date: string
}

export type Product = {
  name: string
  sku: string
  category: string
  stock: number
  price: string
  state: string
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
  icon: LucideIcon
  positive?: boolean
}
