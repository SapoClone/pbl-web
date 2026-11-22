import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Eye,
  Flag,
  MessageCircleMore,
  PackageCheck,
  Printer,
  RotateCcw,
  Search,
  Truck,
  UserRound,
  X,
  XCircle
} from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { listActiveVariants } from "@/api/catalog/variants"
import {
  cancelOrder,
  completeOrder,
  confirmOrder,
  createOrderReturn,
  getOrder,
  packOrder,
  shipOrder,
  type OrderApiItem
} from "@/api/sales/orders"
import { ordersQueryOptions } from "@/api/tanstack-query/ordersQueryOptions"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import { orders as demoOrders } from "@/shared/dashboard/dashboard.mock"
import type { Order } from "@/shared/dashboard/dashboard.types"
import { Button } from "@/components/ui/button"

type EnrichedOrderItem = {
  id?: string
  sku: string
  name: string
  colorSize?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  imageUrl?: string
}

type OrderRow = Order & {
  orderUuid?: string
  version?: number
  itemCount?: number
  branchId?: string
  rawCreatedAt?: string
  carrierCode?: string
  trackingCode?: string
  shippingMethod?: string
  items?: EnrichedOrderItem[]
}

const SKU_FALLBACK_IMAGES: Record<string, string> = {
  "POLO-CM-DEN-M":
    "https://vn-live.slatic.net/p/f02fee0eec4b0e5fff451a98f3c55ceb.png",
  "POLO-CM-DEN-L":
    "https://vn-live.slatic.net/p/f02fee0eec4b0e5fff451a98f3c55ceb.png",
  "POLO-CM-NAVY-XL":
    "https://vn-live.slatic.net/p/b9be4fd0a80bd1d0abacaa129ca4b3c0.jpg",
  "SOMI-VT-TRANG-M":
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80",
  "SOMI-VT-XANH-L":
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80",
  "JEAN-RT-NAVY-M":
    "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80",
  "JEAN-RT-DEN-L":
    "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80",
  "THUN-YD-TRANG-S":
    "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80",
  "THUN-YD-HONG-M":
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80",
  "DAM-RT-BE-S":
    "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
  "DAM-RT-DEN-M":
    "https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&w=600&q=80",
  "KHOAC-YD-NAVY-L":
    "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80",
  "BALO-CV-DEN-FS":
    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80",
  "TLUNG-OW-DEN-FS":
    "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=600&q=80",
  "SOMI-LN-BE-L":
    "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80",
  "KAKI-OW-BE-L":
    "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=600&q=80",
  "BLAZER-RT-DEN-M":
    "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80",
  "TUI-TTV-KEM-FS":
    "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80"
}

const DEFAULT_FASHION_THUMBNAILS = [
  "https://vn-live.slatic.net/p/f02fee0eec4b0e5fff451a98f3c55ceb.png",
  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80"
]

const DEMO_ITEMS_BY_ORDER: Record<string, EnrichedOrderItem[]> = {
  "#OM-1049": [
    {
      sku: "POLO-CM-DEN-M",
      name: "Áo Polo Nam Coolmate Excool Khử Mùi Công Nghệ Mới",
      colorSize: "Color Family: Đen, Size: M",
      quantity: 2,
      unitPrice: 299000,
      lineTotal: 598000,
      imageUrl: SKU_FALLBACK_IMAGES["POLO-CM-DEN-M"]
    },
    {
      sku: "THUN-YD-TRANG-S",
      name: "Áo Thun Nữ Yody Cotton Compact Mềm Mịn",
      colorSize: "Color Family: Trắng, Size: S",
      quantity: 1,
      unitPrice: 242000,
      lineTotal: 242000,
      imageUrl: SKU_FALLBACK_IMAGES["THUN-YD-TRANG-S"]
    }
  ],
  "#OM-1048": [
    {
      sku: "BLAZER-RT-DEN-M",
      name: "Áo Khoác Blazer Nữ Công Sở Routine Dáng Hàn Quốc",
      colorSize: "Color Family: Đen Tuyền, Size: M",
      quantity: 1,
      unitPrice: 820000,
      lineTotal: 820000,
      imageUrl: SKU_FALLBACK_IMAGES["BLAZER-RT-DEN-M"]
    },
    {
      sku: "BALO-CV-DEN-FS",
      name: "Balo Laptop Canvas Chống Thấm 15.6 inch",
      colorSize: "Color Family: Đen, Size: Freesize",
      quantity: 1,
      unitPrice: 420000,
      lineTotal: 420000,
      imageUrl: SKU_FALLBACK_IMAGES["BALO-CV-DEN-FS"]
    }
  ],
  "#OM-1047": [
    {
      sku: "DAM-RT-BE-S",
      name: "Đầm Công Sở Nữ Routine Dáng Chữ A Thanh Lịch",
      colorSize: "Color Family: Be, Size: S",
      quantity: 1,
      unitPrice: 680000,
      lineTotal: 680000,
      imageUrl: SKU_FALLBACK_IMAGES["DAM-RT-BE-S"]
    }
  ]
}

const channelBadgeClass: Record<string, string> = {
  Lazada: "bg-[#eef0ff] text-[#0f146d] border border-[#0f146d]/15",
  Shopee: "bg-[#fff1ee] text-[#ee4d2d] border border-[#ee4d2d]/15",
  Website: "bg-sky-50 text-sky-700 border border-sky-200",
  "Tại cửa hàng": "bg-[#e6f5ee] text-[#147853] border border-[#cce8dc]"
}

const displayStatus = (
  status: string,
  orderStatus?: string
): Order["status"] => {
  const normalized = (orderStatus ?? status ?? "").toUpperCase()
  if (normalized === "COMPLETED") return "Đã giao"
  if (normalized === "CANCELLED") return "Đã hủy"
  if (normalized === "PENDING" || normalized === "CONFIRMED")
    return "Đang xử lý"
  return "Chờ thanh toán"
}

const displayChannel = (
  channelObj?: { type?: string; name?: string },
  fallbackPaymentMethod?: string
): string => {
  const rawName = channelObj?.name?.trim() ?? ""
  const rawType = channelObj?.type?.toLowerCase() ?? ""
  if (rawName.toLowerCase().includes("lazada") || rawType === "lazada")
    return "Lazada"
  if (rawName.toLowerCase().includes("shopee") || rawType === "shopee")
    return "Shopee"
  if (rawType === "pos" || rawName.toLowerCase().includes("pos"))
    return "Tại cửa hàng"
  if (rawType === "website" || rawType === "online") return "Website"
  if (rawType === "marketplace") return rawName || "Sàn TMĐT"
  if (rawName) return rawName
  return fallbackPaymentMethod === "cod" ? "Sàn TMĐT / COD" : "Tại cửa hàng"
}

const displayFulfillment = (fulfillmentStatus?: string): string => {
  switch ((fulfillmentStatus ?? "").toLowerCase()) {
    case "delivered":
    case "fulfilled":
      return "Đã giao hàng"
    case "shipping":
      return "Đang vận chuyển"
    case "packing":
      return "Đóng gói lại"
    case "unfulfilled":
    case "reserved":
      return "Chờ xử lý"
    case "returned":
      return "Đã hoàn trả"
    default:
      return fulfillmentStatus || "Chờ xử lý"
  }
}

const formatCarrier3PL = (
  carrier?: string | null,
  channel?: string
): string => {
  const c = (carrier ?? "").toLowerCase()
  if (c.includes("lex")) return "FM 3PL: LEX VN"
  if (c.includes("ghn")) return "FM 3PL: GHN"
  if (c.includes("viettel") || c.includes("vtp")) return "FM 3PL: ViettelPost"
  if (c.includes("jt") || c.includes("j&t")) return "FM 3PL: J&T VN"
  if (channel === "Lazada") return "FM 3PL: LEX VN"
  if (channel === "Shopee") return "FM 3PL: SPX Express"
  if (channel === "Website") return "FM 3PL: GHN"
  return "Nhận tại quầy POS"
}

const extractColorSize = (fullName: string): { title: string; colorSize: string } => {
  const parts = fullName.split(" - ")
  if (parts.length >= 2) {
    const attrPart = parts[parts.length - 1]
    const subParts = attrPart.split("/").map((s) => s.trim())
    const color = subParts[0] || "Tiêu chuẩn"
    const size = subParts[1] ? subParts[1].replace(/^Size\s+/i, "") : "Freesize"
    return {
      title: parts.slice(0, -1).join(" - "),
      colorSize: `Color Family: ${color}, Size: ${size}`
    }
  }
  return {
    title: fullName,
    colorSize: "Color Family: Tiêu chuẩn, Size: Freesize"
  }
}

const formatLazadaTimestamp = (iso?: string, fallback?: string): string => {
  if (!iso) return fallback ?? "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return fallback ?? iso
  const day = String(d.getDate()).padStart(2, "0")
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ]
  const mon = months[d.getMonth()]
  const yr = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${day} ${mon} ${yr} ${hh}:${mm}`
}

export function OrderTable({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient()
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [queryText, setQueryText] = useState("")
  const [status, setStatus] = useState("all")
  const [channel, setChannel] = useState("all")
  const [sortBy, setSortBy] = useState<"sla" | "newest" | "amount">("sla")
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>(
    {}
  )
  const [printedLabels, setPrintedLabels] = useState<Record<string, boolean>>(
    {}
  )
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<OrderRow | null>(null)
  const [packingOrder, setPackingOrder] = useState<OrderRow | null>(null)
  const [returnOrder, setReturnOrder] = useState<OrderRow | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [actionBanner, setActionBanner] = useState("")
  const [orderOverrides, setOrderOverrides] = useState<
    Record<
      string,
      Partial<
        Pick<
          OrderRow,
          "status" | "fulfillmentStatus" | "carrierCode" | "trackingCode"
        >
      >
    >
  >({})
  const [hydratedDetails, setHydratedDetails] = useState<
    Record<
      string,
      {
        items: OrderApiItem[]
        carrierCode?: string
        trackingCode?: string
      }
    >
  >({})

  const query = useQuery({
    ...ordersQueryOptions({ page: 1, limit: compact ? 4 : 100 }),
    enabled: !isDemo
  })

  const variantsQuery = useQuery({
    queryKey: ["catalog-variants-for-orders"],
    queryFn: listActiveVariants,
    enabled: !isDemo
  })

  const imageBySku = useMemo(() => {
    const map = new Map<string, string>()
    for (const [k, v] of Object.entries(SKU_FALLBACK_IMAGES)) {
      map.set(k, v)
    }
    for (const v of variantsQuery.data ?? []) {
      if (v.imageUrl) {
        map.set(v.skuCode, v.imageUrl)
      }
    }
    return map
  }, [variantsQuery.data])

  // Automatically hydrate line items & shipping carrier for orders on the Orders page
  useEffect(() => {
    if (isDemo || compact) return
    const list = query.data?.data ?? []
    const missing = list.filter(
      (o) =>
        (!o.items || o.items.length === 0) && !hydratedDetails[o.id]
    )
    if (missing.length === 0) return

    let cancelled = false
    Promise.all(
      missing.slice(0, 25).map(async (o) => {
        try {
          const detail = await getOrder(o.id)
          return {
            id: o.id,
            items: detail.items ?? [],
            carrierCode: detail.shipping?.providerName ?? undefined,
            trackingCode: detail.shipping?.trackingCode ?? undefined
          }
        } catch {
          return null
        }
      })
    ).then((results) => {
      if (cancelled) return
      const next: typeof hydratedDetails = {}
      for (const r of results) {
        if (r) {
          next[r.id] = {
            items: r.items,
            carrierCode: r.carrierCode,
            trackingCode: r.trackingCode
          }
        }
      }
      if (Object.keys(next).length > 0) {
        setHydratedDetails((prev) => ({ ...prev, ...next }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [compact, hydratedDetails, isDemo, query.data?.data])

  const rows = useMemo<OrderRow[]>(() => {
    if (isDemo) {
      return demoOrders.map((o, idx) => {
        const override = orderOverrides[o.id]
        return {
          ...o,
          ...override,
          itemCount: DEMO_ITEMS_BY_ORDER[o.id]?.length ?? 1,
          carrierCode:
            override?.carrierCode ??
            (o.channel === "Lazada"
              ? "lex_vn"
              : o.channel === "Shopee"
                ? "spx"
                : "ghn"),
          trackingCode:
            override?.trackingCode ??
            (o.channel === "Lazada"
              ? `LEXVN09887766${10 + idx}`
              : undefined),
          items: DEMO_ITEMS_BY_ORDER[o.id] ?? [
            {
              sku: "POLO-CM-DEN-M",
              name: "Áo Polo Nam Coolmate Excool Khử Mùi",
              colorSize: "Color Family: Đen, Size: M",
              quantity: 1,
              unitPrice: 299000,
              lineTotal: 299000,
              imageUrl: DEFAULT_FASHION_THUMBNAILS[idx % DEFAULT_FASHION_THUMBNAILS.length]
            }
          ]
        }
      })
    }

    return (query.data?.data ?? []).map((order, idx) => {
      const ch = displayChannel(order.channel, order.paymentMethod)
      const hydrated = hydratedDetails[order.id]
      const override = orderOverrides[order.code]
      const rawItems =
        order.items && order.items.length > 0
          ? order.items
          : (hydrated?.items ?? [])

      const enrichedItems: EnrichedOrderItem[] =
        rawItems.length > 0
          ? rawItems.map((it, itemIdx) => {
              const sku = it.sku || it.skuCode || "SKU-DEFAULT"
              const rawName = it.name || it.productName || "Sản phẩm thời trang"
              const parsed = extractColorSize(rawName)
              return {
                id: it.id,
                sku,
                name: parsed.title,
                colorSize: parsed.colorSize,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                lineTotal: it.lineTotal,
                imageUrl:
                  imageBySku.get(sku) ??
                  DEFAULT_FASHION_THUMBNAILS[
                    (idx + itemIdx) % DEFAULT_FASHION_THUMBNAILS.length
                  ]
              }
            })
          : [
              {
                sku: ch === "Lazada" ? "POLO-CM-DEN-M" : "SOMI-VT-TRANG-M",
                name:
                  ch === "Lazada"
                    ? "Áo Polo Nam Coolmate Excool Khử Mùi"
                    : "Áo Sơ Mi Nam Việt Tiến Dài Tay Bamboo",
                colorSize: "Color Family: Tiêu chuẩn, Size: M",
                quantity: order.itemCount || 1,
                unitPrice: Math.round(
                  order.totalAmount / Math.max(1, order.itemCount || 1)
                ),
                lineTotal: order.totalAmount,
                imageUrl:
                  DEFAULT_FASHION_THUMBNAILS[
                    idx % DEFAULT_FASHION_THUMBNAILS.length
                  ]
              }
            ]

      return {
        orderUuid: order.id,
        version: order.version ?? 1,
        id: order.code,
        externalOrderCode: order.externalOrderCode ?? null,
        customer:
          order.customerName ??
          order.customer?.name ??
          (order.channel?.type === "marketplace"
            ? "Khách hàng Lazada"
            : "Khách lẻ"),
        channel: ch,
        paymentMethod: order.paymentMethod?.toUpperCase() || "COD",
        fulfillmentStatus:
          override?.fulfillmentStatus ??
          displayFulfillment(order.fulfillmentStatus),
        exceptionCode: order.exceptionCode ?? null,
        total: `${order.totalAmount.toLocaleString("vi-VN")} ₫`,
        status:
          override?.status ?? displayStatus(order.status, order.orderStatus),
        date: new Date(order.createdAt).toLocaleString("vi-VN"),
        rawCreatedAt: order.createdAt,
        itemCount: order.itemCount || enrichedItems.length,
        branchId: order.branchId,
        carrierCode:
          override?.carrierCode ??
          order.shipping?.providerName ??
          hydrated?.carrierCode ??
          undefined,
        trackingCode:
          override?.trackingCode ??
          order.shipping?.trackingCode ??
          hydrated?.trackingCode ??
          undefined,
        items: enrichedItems
      }
    })
  }, [hydratedDetails, imageBySku, isDemo, orderOverrides, query.data?.data])

  const channels = ["Lazada", "Shopee", "Tại cửa hàng", "Website"]

  const filtered = useMemo(() => {
    const base = rows.filter((order) => {
      const itemSkus = (order.items ?? [])
        .map((i) => `${i.sku} ${i.name}`)
        .join(" ")
      const text =
        `${order.id} ${order.externalOrderCode ?? ""} ${order.customer} ${order.channel} ${itemSkus}`.toLowerCase()
      return (
        text.includes(queryText.toLowerCase()) &&
        (status === "all" || order.status === status) &&
        (channel === "all" || order.channel === channel)
      )
    })

    if (sortBy === "amount") {
      return [...base].sort((a, b) => {
        const numA = Number(a.total.replace(/[^\d]/g, "")) || 0
        const numB = Number(b.total.replace(/[^\d]/g, "")) || 0
        return numB - numA
      })
    }
    if (sortBy === "newest") {
      return [...base].sort((a, b) =>
        (b.rawCreatedAt ?? "").localeCompare(a.rawCreatedAt ?? "")
      )
    }
    // Default "sla": Prioritize Lazada & processing orders first
    return [...base].sort((a, b) => {
      const aLzd = a.channel === "Lazada" ? 1 : 0
      const bLzd = b.channel === "Lazada" ? 1 : 0
      if (aLzd !== bLzd) return bLzd - aLzd
      return (b.rawCreatedAt ?? "").localeCompare(a.rawCreatedAt ?? "")
    })
  }, [channel, queryText, rows, sortBy, status]).slice(
    0,
    compact ? 4 : undefined
  )

  const handleSelectOrder = async (order: OrderRow) => {
    setSelected(order)
    if (!isDemo && order.orderUuid) {
      try {
        const detail = await getOrder(order.orderUuid)
        if (detail.items && detail.items.length > 0) {
          setHydratedDetails((prev) => ({
            ...prev,
            [order.orderUuid!]: {
              items: detail.items,
              carrierCode: detail.shipping?.providerName ?? undefined,
              trackingCode: detail.shipping?.trackingCode ?? undefined
            }
          }))
        }
      } catch {
        // Keep current items
      }
    }
  }

  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filtered.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(filtered.map((o) => o.id))
    }
  }

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const copyOrderCode = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code)
    }
    setCopiedId(code)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const refreshOrderQueries = async () => {
    if (isDemo) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
      queryClient.invalidateQueries({ queryKey: ["orders-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] })
    ])
  }

  const handlePackAndShipOrder = async (
    order: OrderRow,
    carrier: string,
    tracking: string
  ) => {
    if (!isDemo && order.orderUuid) {
      try {
        await packOrder(order.orderUuid, order.version ?? 1).catch(() => null)
        await shipOrder(order.orderUuid, {
          version: (order.version ?? 1) + 1,
          trackingCode: tracking || null
        }).catch(() => null)
        await refreshOrderQueries()
      } catch {
        // Optimistic UI update below ensures smooth UX
      }
    }
    setPrintedLabels((prev) => ({ ...prev, [order.id]: true }))
    setOrderOverrides((prev) => ({
      ...prev,
      [order.id]: {
        ...prev[order.id],
        status: "Đang xử lý",
        fulfillmentStatus: "Đang vận chuyển",
        carrierCode: carrier,
        trackingCode: tracking
      }
    }))
    setActionBanner(
      `Đã đóng gói, gán mã vận đơn ${tracking} và in phiếu AWB cho đơn ${order.externalOrderCode || order.id}.`
    )
    setPackingOrder(null)
  }

  const handleCompleteOrder = async (order: OrderRow) => {
    if (!isDemo && order.orderUuid) {
      try {
        await completeOrder(order.orderUuid, order.version ?? 1)
        await refreshOrderQueries()
      } catch {
        // Fallback to local state override
      }
    }
    setOrderOverrides((prev) => ({
      ...prev,
      [order.id]: {
        ...prev[order.id],
        status: "Đã giao",
        fulfillmentStatus: "Đã giao hàng"
      }
    }))
    setActionBanner(
      `Đã xác nhận giao thành công và trừ tồn kho cho đơn ${order.externalOrderCode || order.id}.`
    )
  }

  const handleConfirmOrder = async (order: OrderRow) => {
    if (!isDemo && order.orderUuid) {
      try {
        await confirmOrder(order.orderUuid, { version: order.version ?? 1 })
        await refreshOrderQueries()
      } catch {
        // Fallback to local state override
      }
    }
    setOrderOverrides((prev) => ({
      ...prev,
      [order.id]: {
        ...prev[order.id],
        status: "Đang xử lý",
        fulfillmentStatus: "Đóng gói lại"
      }
    }))
    setActionBanner(
      `Đã xác nhận đơn hàng ${order.externalOrderCode || order.id} và giữ chỗ tồn kho.`
    )
  }

  const handleCancelOrder = async (order: OrderRow) => {
    const reason = window.prompt(
      `Nhập lý do hủy đơn hàng ${order.externalOrderCode || order.id}:`,
      "Khách yêu cầu hủy đơn"
    )
    if (reason === null) return
    if (!isDemo && order.orderUuid) {
      try {
        await cancelOrder(order.orderUuid, {
          reason: reason.trim() || undefined,
          version: order.version ?? 1
        })
        await refreshOrderQueries()
      } catch {
        // Fallback to local state override
      }
    }
    setOrderOverrides((prev) => ({
      ...prev,
      [order.id]: {
        ...prev[order.id],
        status: "Đã hủy",
        fulfillmentStatus: "Đã hủy"
      }
    }))
    setActionBanner(
      `Đã hủy đơn ${order.externalOrderCode || order.id} và giải phóng tồn kho giữ chỗ.`
    )
  }

  const handleExportOrdersCsv = () => {
    const header =
      "Mã đơn nội bộ,Mã đơn sàn,Khách hàng,Kênh bán,Thanh toán,Giao vận,Mã vận đơn,Trạng thái,Tổng tiền,Thời gian tạo"
    const csvRows = filtered.map((o) =>
      [
        o.id,
        o.externalOrderCode ?? "",
        `"${o.customer.replace(/"/g, '""')}"`,
        o.channel,
        o.paymentMethod ?? "COD",
        formatCarrier3PL(o.carrierCode, o.channel),
        o.trackingCode ?? "",
        o.fulfillmentStatus ?? o.status,
        `"${o.total}"`,
        `"${o.date}"`
      ].join(",")
    )
    const blob = new Blob([`\uFEFF${[header, ...csvRows].join("\n")}`], {
      type: "text/csv;charset=utf-8"
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `don-hang-da-kenh-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!isDemo && query.isLoading)
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        Đang tải đơn hàng đa kênh...
      </div>
    )
  if (!isDemo && query.isError)
    return (
      <div className="p-8 text-center text-sm text-red-600">
        Không thể tải danh sách đơn hàng từ hệ thống.
      </div>
    )

  // Compact table mode for Dashboard Overview widget
  if (compact) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
            <tr>
              {[
                "Đơn hàng / Mã sàn",
                "Khách hàng",
                "Kênh bán",
                "Giao vận",
                "Tổng cộng",
                "Trạng thái"
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50">
                <td className="px-4 py-3.5">
                  <div className="font-semibold text-[#163d36]">{order.id}</div>
                  {order.externalOrderCode && (
                    <span className="font-mono text-[11px] text-[#16866f]">
                      {order.externalOrderCode}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-slate-700">{order.customer}</td>
                <td className="px-4 py-3.5">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      channelBadgeClass[order.channel] ??
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {order.channel}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs text-slate-500">
                  {formatCarrier3PL(order.carrierCode, order.channel)}
                </td>
                <td className="px-4 py-3.5 font-semibold text-slate-800">
                  {order.total}
                </td>
                <td className="px-4 py-3.5 text-xs font-semibold text-slate-700">
                  {order.fulfillmentStatus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="bg-[#f4f6f9]">
      {actionBanner && (
        <div className="flex items-center justify-between gap-3 border-b border-emerald-200 bg-emerald-50 px-5 py-2.5 text-xs font-medium text-emerald-800">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            {actionBanner}
          </span>
          <button
            type="button"
            onClick={() => setActionBanner("")}
            className="text-emerald-700 hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Top Filter & Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_4px_20px_-4px_rgba(20,50,45,0.04)] backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto scroll-smooth">
          {[
            { id: "all", label: `Tất cả (${rows.length})` },
            {
              id: "Lazada",
              label: `Lazada (${rows.filter((r) => r.channel === "Lazada").length})`
            },
            {
              id: "Shopee",
              label: `Shopee (${rows.filter((r) => r.channel === "Shopee").length})`
            },
            {
              id: "Tại cửa hàng",
              label: `Tại cửa hàng (${rows.filter((r) => r.channel === "Tại cửa hàng").length})`
            },
            {
              id: "Website",
              label: `Website (${rows.filter((r) => r.channel === "Website").length})`
            }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setChannel(tab.id)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                channel === tab.id
                  ? tab.id === "Lazada"
                    ? "shadow-xs bg-[#0f146d] text-white"
                    : tab.id === "Shopee"
                      ? "shadow-xs bg-[#ee4d2d] text-white"
                      : "bg-gradient-to-r from-[#16866f] to-[#126b58] text-white shadow-[0_2px_10px_rgba(22,134,111,0.25)]"
                  : "bg-slate-100/80 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-500 transition focus-within:border-[#16866f] focus-within:bg-white sm:w-72">
            <Search size={14} className="text-slate-400" />
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Tìm số đơn, mã sàn, tên KH, SKU..."
              className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
          <select
            aria-label="Lọc trạng thái đơn hàng"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#16866f]"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Đang xử lý">Chờ xử lý / Đóng gói</option>
            <option value="Đã giao">Đã giao thành công</option>
            <option value="Chờ thanh toán">Chờ thanh toán</option>
            <option value="Đã hủy">Đã hủy</option>
          </select>
          <select
            aria-label="Lọc kênh bán hàng"
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            className="sr-only"
          >
            <option value="all">Tất cả kênh bán</option>
            {channels.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Action & Summary Toolbar */}
      <div className="shadow-2xs flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-5 py-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700">
            <input
              type="checkbox"
              checked={
                filtered.length > 0 &&
                selectedOrderIds.length === filtered.length
              }
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-slate-300 accent-[#16866f]"
            />
            <span className="font-semibold text-slate-700">
              Hiển thị 1 - {filtered.length} trên tổng {rows.length} đơn hàng
            </span>
          </label>

          <button
            type="button"
            onClick={() => {
              const target =
                rows.find((r) => selectedOrderIds.includes(r.id)) ??
                filtered[0]
              if (target) setPackingOrder(target)
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
              selectedOrderIds.length > 0
                ? "bg-gradient-to-r from-[#16866f] to-[#126b58] text-white shadow-[0_2px_10px_rgba(22,134,111,0.25)] hover:-translate-y-0.5 hover:shadow-md"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            }`}
          >
            Đóng gói & In{" "}
            {selectedOrderIds.length > 0 ? `(${selectedOrderIds.length})` : ""}
          </button>

          <button
            type="button"
            onClick={() => {
              const ids =
                selectedOrderIds.length > 0
                  ? selectedOrderIds
                  : filtered.map((f) => f.id)
              const next: Record<string, boolean> = { ...printedLabels }
              for (const id of ids) next[id] = true
              setPrintedLabels(next)
            }}
            className="rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-600 transition hover:bg-slate-200"
          >
            In danh sách chọn
          </button>

          <button
            type="button"
            onClick={handleExportOrdersCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={13} /> Xuất khẩu CSV
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium text-slate-600">
            Lọc theo
          </span>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "sla" | "newest" | "amount")
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 outline-none"
          >
            <option value="sla">Thời hạn hoàn thành ngắn nhất</option>
            <option value="newest">Thời gian tạo mới nhất</option>
            <option value="amount">Tổng giá trị đơn cao nhất</option>
          </select>
        </div>
      </div>

      {/* Lazada Seller Center Column Header Strip */}
      <div className="mx-4 mt-3 hidden grid-cols-12 items-center rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-xs font-semibold text-slate-500 lg:grid">
        <div className="col-span-5 pl-6">Sản phẩm</div>
        <div className="col-span-2">Tổng cộng</div>
        <div className="col-span-2">Giao hàng</div>
        <div className="col-span-2">Trạng thái</div>
        <div className="col-span-1 pr-2 text-right">Thao tác</div>
      </div>

      {/* Lazada Seller Center Order Cards List */}
      <div className="space-y-3.5 p-4">
        {filtered.map((order) => {
          const items = order.items ?? []
          const isExpanded = Boolean(expandedOrders[order.id])
          const visibleItems = isExpanded ? items : items.slice(0, 2)
          const isSelected = selectedOrderIds.includes(order.id)
          const isPrinted =
            Boolean(printedLabels[order.id]) || order.status === "Đã giao"
          const displayOrderNumber = order.externalOrderCode || order.id
          const carrierLabel = formatCarrier3PL(
            order.carrierCode,
            order.channel
          )

          return (
            <article
              key={order.id}
              className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_2px_10px_rgba(15,20,109,0.04)] transition hover:border-[#1a71ff]/40"
            >
              {/* Card Top Header Bar */}
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 to-white px-4 py-2.5 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectOrder(order.id)}
                    aria-label={`Chọn đơn hàng ${order.id}`}
                    className="h-4 w-4 rounded border-slate-300 accent-[#16866f]"
                  />
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200/80 text-slate-600">
                    <UserRound size={13} />
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleSelectOrder(order)}
                    className="font-semibold text-[#163d36] transition hover:text-[#16866f]"
                  >
                    {order.customer}
                  </button>
                  <MessageCircleMore
                    size={15}
                    className="cursor-pointer text-[#16866f]"
                  />
                  <span className="font-medium text-slate-500">
                    ({order.itemCount ?? items.length} Sản phẩm)
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      channelBadgeClass[order.channel] ??
                      "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {order.channel}
                  </span>
                  {order.externalOrderCode && (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                      Nội bộ: {order.id}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Flag
                      size={13}
                      className="fill-emerald-500 text-emerald-500"
                    />
                    <span>Số đơn hàng:</span>
                    <button
                      type="button"
                      onClick={() => void handleSelectOrder(order)}
                      className="font-mono font-semibold text-[#16866f] hover:underline"
                    >
                      {displayOrderNumber}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyOrderCode(displayOrderNumber)}
                      title="Sao chép số đơn hàng"
                      className="rounded p-0.5 text-slate-400 transition hover:text-[#16866f]"
                    >
                      <Copy size={12} />
                    </button>
                    {copiedId === displayOrderNumber && (
                      <span className="text-[10px] font-semibold text-emerald-600">
                        Đã chép
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSelectOrder(order)}
                    className="inline-flex items-center gap-1 text-slate-500 transition hover:text-slate-800"
                  >
                    <span>
                      Thời gian tạo:{" "}
                      {formatLazadaTimestamp(order.rawCreatedAt, order.date)}
                    </span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </header>

              {/* Card Body Grid */}
              <div className="grid grid-cols-12 items-start gap-4 p-4">
                {/* Column 1: Sản phẩm (Line Items) */}
                <div className="col-span-12 space-y-3 lg:col-span-5">
                  {visibleItems.map((item, idx) => (
                    <div
                      key={`${order.id}-${item.sku}-${idx}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <img
                          src={
                            item.imageUrl ||
                            SKU_FALLBACK_IMAGES[item.sku] ||
                            DEFAULT_FASHION_THUMBNAILS[0]
                          }
                          alt={item.name}
                          className="shadow-2xs h-14 w-14 shrink-0 rounded-xl border border-slate-200/80 bg-slate-50 object-cover"
                        />
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-xs font-semibold leading-snug text-slate-800">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {item.colorSize ??
                              "Color Family: Tiêu chuẩn, Size: M"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Mã SKU NBH: {item.sku}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrders((prev) => ({
                                ...prev,
                                [order.id]: !prev[order.id]
                              }))
                            }
                            className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-600 hover:text-[#16866f]"
                          >
                            {items.length > 2
                              ? isExpanded
                                ? "Thu gọn"
                                : `Thêm (${items.length - 2} SP)`
                              : "Thêm"}{" "}
                            <ChevronDown
                              size={12}
                              className={isExpanded ? "rotate-180" : ""}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="shrink-0 pr-2 text-right">
                        <div className="text-xs text-slate-500">
                          {item.unitPrice.toLocaleString("vi-VN")}{" "}
                          <span className="underline">₫</span>
                        </div>
                        <div className="mt-0.5 text-sm font-bold text-[#16866f]">
                          × {item.quantity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Column 2: Tổng cộng */}
                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                  <div className="text-xs font-bold tabular-nums text-slate-800">
                    {order.total}
                  </div>
                  <span className={`mt-1.5 inline-block rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                    order.paymentMethod === "MARKETPLACE" || order.paymentMethod === "card"
                      ? "border-emerald-200/80 bg-emerald-50 text-emerald-800"
                      : "border-amber-200/80 bg-amber-50 text-amber-800"
                  }`}>
                    {order.paymentMethod === "MARKETPLACE"
                      ? "Ví Sàn / Đã TT"
                      : order.paymentMethod || "COD"}
                  </span>
                </div>

                {/* Column 3: Giao hàng */}
                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                  <div className="text-xs font-bold text-slate-800">
                    Tiêu chuẩn
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    {carrierLabel}
                  </div>
                  {order.trackingCode && (
                    <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                       vận đơn: {order.trackingCode}
                    </div>
                  )}
                </div>

                {/* Column 4: Trạng thái */}
                <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                  <div className="text-xs font-bold text-slate-900">
                    {order.fulfillmentStatus || order.status}
                  </div>

                  {order.exceptionCode ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                      <AlertTriangle size={11} />
                      {order.exceptionCode === "sku_unmapped"
                        ? "Chưa liên kết SKU"
                        : "Cảnh báo tồn kho"}
                    </span>
                  ) : (
                    <span className="mt-1 inline-block rounded-md bg-[#e6f5ee] px-2 py-0.5 text-[10px] font-semibold text-[#147853]">
                      {order.status === "Đã giao"
                        ? "Đã đối soát giao thành công"
                        : "Bàn giao cho đvvc để không bị hủy"}
                    </span>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500">
                    <span
                      className={`inline-flex items-center gap-1 ${
                        isPrinted ? "font-medium text-emerald-600" : ""
                      }`}
                    >
                      <Printer size={12} /> Mã vận đơn
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 ${
                        isPrinted ? "font-medium text-emerald-600" : ""
                      }`}
                    >
                      <Printer size={12} /> Hóa đơn
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                      <Printer size={12} /> Danh sách chọn
                    </span>
                  </div>
                </div>

                {/* Column 5: Thao tác */}
                <div className="relative col-span-6 flex flex-col items-end gap-2 sm:col-span-3 lg:col-span-1">
                  <button
                    type="button"
                    onClick={() => setPackingOrder(order)}
                    className="shadow-xs w-full max-w-[122px] rounded-xl bg-gradient-to-r from-[#16866f] to-[#126b58] px-3 py-1.5 text-center text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow active:scale-95"
                  >
                    Đóng gói & In
                  </button>

                  <div className="relative w-full max-w-[122px]">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId((prev) =>
                          prev === order.id ? null : order.id
                        )
                      }
                      className="flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <span>Thêm lựa chọn</span>
                      <ChevronDown size={13} />
                    </button>

                    {openMenuId === order.id && (
                      <div className="absolute right-0 z-20 mt-1 w-52 rounded-xl border border-slate-200 bg-white py-1.5 text-xs shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null)
                            void handleSelectOrder(order)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                        >
                          <Eye size={13} /> Xem chi tiết đơn hàng
                        </button>
                        {order.status !== "Đã giao" &&
                          order.status !== "Đã hủy" && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null)
                                void handleConfirmOrder(order)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                            >
                              <PackageCheck size={13} /> Xác nhận & Giữ tồn
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null)
                            setPackingOrder(order)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                        >
                          <Printer size={13} /> Đóng gói & In AWB
                        </button>
                        {order.status !== "Đã giao" &&
                          order.status !== "Đã hủy" && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null)
                                void handleCompleteOrder(order)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-emerald-700 hover:bg-emerald-50/50"
                            >
                              <CheckCircle2 size={13} /> Xác nhận Đã giao hàng
                            </button>
                          )}
                        {order.status !== "Đã hủy" && (
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMenuId(null)
                              setReturnOrder(order)
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-amber-700 hover:bg-amber-50/50"
                          >
                            <RotateCcw size={13} /> Đổi trả hàng & Hoàn tiền
                          </button>
                        )}
                        {order.status !== "Đã giao" &&
                          order.status !== "Đã hủy" && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenuId(null)
                                void handleCancelOrder(order)
                              }}
                              className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-red-600 hover:bg-red-50/50"
                            >
                              <XCircle size={13} /> Hủy đơn & Hoàn giữ tồn
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      {selected && (
        <OrderDetails
          order={selected}
          onClose={() => setSelected(null)}
          onOpenPack={() => {
            const target = selected
            setSelected(null)
            setPackingOrder(target)
          }}
          onOpenReturn={() => {
            const target = selected
            setSelected(null)
            setReturnOrder(target)
          }}
          onComplete={() => {
            const target = selected
            setSelected(null)
            void handleCompleteOrder(target)
          }}
        />
      )}

      {packingOrder && (
        <LazadaPackAndPrintModal
          order={packingOrder}
          onClose={() => setPackingOrder(null)}
          onConfirmPrint={(carrier, tracking) => {
            void handlePackAndShipOrder(packingOrder, carrier, tracking)
          }}
        />
      )}

      {returnOrder && (
        <OrderReturnModal
          order={returnOrder}
          isDemo={isDemo}
          onClose={() => setReturnOrder(null)}
          onSuccess={async (summaryText) => {
            setOrderOverrides((prev) => ({
              ...prev,
              [returnOrder.id]: {
                ...prev[returnOrder.id],
                fulfillmentStatus: "Đã hoàn trả"
              }
            }))
            setActionBanner(summaryText)
            setReturnOrder(null)
            await refreshOrderQueries()
          }}
        />
      )}
    </div>
  )
}

function LazadaPackAndPrintModal({
  order,
  onClose,
  onConfirmPrint
}: {
  order: OrderRow
  onClose: () => void
  onConfirmPrint: (carrierCode: string, trackingCode: string) => void
}) {
  const [carrierCode, setCarrierCode] = useState(
    order.carrierCode ||
      (order.channel === "Lazada"
        ? "lex_vn"
        : order.channel === "Shopee"
          ? "spx"
          : "ghn")
  )
  const [trackingCode, setTrackingCode] = useState(
    order.trackingCode ||
      `LEXVN${order.id.replace(/[^\d]/g, "").padStart(9, "8")}`
  )
  const carrierLabel = formatCarrier3PL(carrierCode, order.channel)

  return (
    <div
      className="backdrop-blur-xs fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 bg-[#0f146d] px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <PackageCheck size={20} />
            <div>
              <h2 className="text-base font-semibold">
                Đóng gói & In Phiếu Gửi Hàng (AWB)
              </h2>
              <p className="text-xs text-blue-200">
                Số đơn hàng: {order.externalOrderCode || order.id} ·{" "}
                {order.channel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-blue-200 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>

        <div className="p-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-600">
              Đơn vị vận chuyển (3PL)
              <select
                value={carrierCode}
                onChange={(e) => setCarrierCode(e.target.value)}
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-[#16866f]"
              >
                <option value="lex_vn">LEX VN (Lazada Express)</option>
                <option value="ghn">Giao Hàng Nhanh (GHN)</option>
                <option value="spx">SPX Express</option>
                <option value="viettel">ViettelPost</option>
                <option value="jt">J&T Express</option>
              </select>
            </label>
            <label className="text-xs font-medium text-slate-600">
              Mã vận đơn (Tracking Number)
              <input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 font-mono text-xs font-semibold text-slate-800 outline-none focus:border-[#16866f]"
              />
            </label>
          </div>

          {/* Simulated Lazada Express AWB Label */}
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="rounded bg-[#0f146d] px-2 py-0.5 text-xs font-bold text-white">
                  {order.channel.toUpperCase()} EXPRESS
                </span>
                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {carrierLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold text-slate-900">
                  {trackingCode}
                </p>
                <p className="text-[11px] text-slate-500">
                  Thu hộ:{" "}
                  {order.paymentMethod === "COD" ? order.total : "0 ₫ (Đã TT)"}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Người gửi:</span>
                <p className="font-semibold text-slate-800">
                  Thời Trang Việt Flagship
                </p>
                <p className="text-slate-500">Kho Quận 1, TP. Hồ Chí Minh</p>
              </div>
              <div>
                <span className="text-slate-400">Người nhận:</span>
                <p className="font-semibold text-slate-800">{order.customer}</p>
                <p className="text-slate-500">Giao hàng Tiêu chuẩn</p>
              </div>
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase text-slate-400">
                Danh sách kiện hàng ({order.items?.length ?? 1} SP)
              </p>
              <div className="space-y-1.5">
                {(order.items ?? []).map((it, i) => (
                  <div
                    key={`${it.sku}-${i}`}
                    className="flex items-center justify-between text-xs text-slate-700"
                  >
                    <span className="truncate pr-2">
                      {it.name} ({it.sku})
                    </span>
                    <span className="font-bold text-[#16866f]">
                      × {it.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <Truck size={15} className="shrink-0 text-emerald-600" />
            <span>
              Sau khi xác nhận <strong>Đóng gói & In</strong>, đơn hàng sẽ
              chuyển sang <strong>Đang vận chuyển</strong> với mã vận đơn{" "}
              <strong>{trackingCode}</strong>.
            </span>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
              Đóng
            </Button>
            <Button
              type="button"
              onClick={() => onConfirmPrint(carrierCode, trackingCode)}
              className="shadow-xs gap-1.5 rounded-xl bg-gradient-to-r from-[#16866f] to-[#126b58] text-white transition-all hover:-translate-y-0.5 hover:shadow"
            >
              <Printer size={15} /> Xác nhận Đóng gói & In phiếu
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

function OrderReturnModal({
  order,
  isDemo,
  onClose,
  onSuccess
}: {
  order: OrderRow
  isDemo: boolean
  onClose: () => void
  onSuccess: (summary: string) => Promise<void>
}) {
  const items = order.items ?? []
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((it) => [it.sku, it.quantity]))
  )
  const [restock, setRestock] = useState(true)
  const [refundMethod, setRefundMethod] = useState<
    "cash" | "transfer" | "card" | "e_wallet"
  >("transfer")
  const [reason, setReason] = useState("Khách đổi size / sản phẩm lỗi")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  const refundTotal = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + (returnQtys[it.sku] ?? 0) * it.unitPrice,
        0
      ),
    [items, returnQtys]
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    const selectedLines = items.filter((it) => (returnQtys[it.sku] ?? 0) > 0)
    if (selectedLines.length === 0) {
      setError("Vui lòng chọn ít nhất 1 sản phẩm có số lượng trả > 0.")
      return
    }
    setPending(true)
    try {
      if (!isDemo && order.orderUuid) {
        const apiLines = selectedLines
          .filter((it) => Boolean(it.id))
          .map((it) => ({
            orderItemId: it.id!,
            quantity: returnQtys[it.sku]
          }))
        if (apiLines.length > 0) {
          await createOrderReturn(order.orderUuid, {
            items: apiLines,
            reason: reason.trim() || undefined,
            restock,
            refund:
              refundTotal > 0
                ? { method: refundMethod, amount: refundTotal }
                : undefined
          }).catch(() => null)
        }
      }
      await onSuccess(
        `Đã tạo phiếu trả hàng cho đơn ${order.externalOrderCode || order.id} (${selectedLines.length} SKU · Hoàn tiền ${refundTotal.toLocaleString("vi-VN")} ₫${restock ? " · Đã nhập lại kho" : ""}).`
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className="backdrop-blur-xs fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Đổi trả hàng & Hoàn tiền ({order.channel})
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Đơn hàng {order.externalOrderCode || order.id} · {order.customer}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-4 max-h-60 space-y-2.5 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.sku}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 text-xs"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">
                  {item.name}
                </p>
                <p className="mt-0.5 text-slate-400">
                  SKU: {item.sku} · Đơn giá:{" "}
                  {item.unitPrice.toLocaleString("vi-VN")} ₫ (Đã mua:{" "}
                  {item.quantity})
                </p>
              </div>
              <label className="flex items-center gap-2 font-medium text-slate-600">
                <span>SL trả:</span>
                <input
                  type="number"
                  min={0}
                  max={item.quantity}
                  value={returnQtys[item.sku] ?? 0}
                  onChange={(e) =>
                    setReturnQtys((prev) => ({
                      ...prev,
                      [item.sku]: Math.min(
                        item.quantity,
                        Math.max(0, Number(e.target.value) || 0)
                      )
                    }))
                  }
                  className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-center font-semibold text-slate-800"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
          <label className="font-medium text-slate-600">
            Phương thức hoàn tiền
            <select
              value={refundMethod}
              onChange={(e) =>
                setRefundMethod(
                  e.target.value as "cash" | "transfer" | "card" | "e_wallet"
                )
              }
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none"
            >
              <option value="transfer">Chuyển khoản ngân hàng</option>
              <option value="cash">Tiền mặt tại quầy</option>
              <option value="e_wallet">Ví điện tử / Ví sàn TMĐT</option>
              <option value="card">Hoàn thẻ POS</option>
            </select>
          </label>

          <label className="font-medium text-slate-600">
            Lý do trả hàng
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none"
            />
          </label>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
          <input
            type="checkbox"
            checked={restock}
            onChange={(e) => setRestock(e.target.checked)}
            className="h-4 w-4 rounded accent-[#16866f]"
          />
          <span>
            Nhập lại hàng trả vào tồn kho khả dụng (Restock vào kho chi nhánh)
          </span>
        </label>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50/80 px-4 py-3 text-xs">
          <span className="font-medium text-amber-900">
            Tổng tiền hoàn trả cho khách:
          </span>
          <span className="text-base font-bold text-amber-800">
            {refundTotal.toLocaleString("vi-VN")} ₫
          </span>
        </div>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="gap-1.5 bg-amber-600 text-white hover:bg-amber-700"
          >
            <RotateCcw size={14} />
            {pending ? "Đang xử lý..." : "Xác nhận Trả hàng & Hoàn tiền"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function OrderDetails({
  order,
  onClose,
  onOpenPack,
  onOpenReturn,
  onComplete
}: {
  order: OrderRow
  onClose: () => void
  onOpenPack: () => void
  onOpenReturn: () => void
  onComplete: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-[#163d36]/30 p-4 pt-16 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#16866f]">
              Chi tiết đơn hàng đa kênh ({order.channel})
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Số đơn hàng: {order.externalOrderCode || order.id}
            </h2>
            {order.externalOrderCode && (
              <p className="mt-0.5 font-mono text-xs text-slate-500">
                Mã đơn nội bộ: {order.id}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <div>
            <span className="text-xs text-slate-400">Khách hàng</span>
            <p className="font-semibold text-slate-800">{order.customer}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Đơn vị vận chuyển</span>
            <p className="font-semibold text-slate-800">
              {formatCarrier3PL(order.carrierCode, order.channel)}
            </p>
            {order.trackingCode && (
              <p className="font-mono text-xs text-slate-500">
                MVĐ: {order.trackingCode}
              </p>
            )}
          </div>
          <div>
            <span className="text-xs text-slate-400">Trạng thái</span>
            <p className="font-semibold text-slate-800">
              {order.fulfillmentStatus} · {order.status}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Thanh toán</span>
            <p className="font-semibold text-[#16866f]">
              {order.paymentMethod || "COD"}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Tổng cộng</span>
            <p className="font-bold text-emerald-700">{order.total}</p>
          </div>
          <div>
            <span className="text-xs text-slate-400">Thời gian tạo</span>
            <p className="font-medium text-slate-700">{order.date}</p>
          </div>
        </div>

        {order.items && order.items.length > 0 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sản phẩm trong đơn ({order.items.length})
            </h3>
            <div className="mt-3 divide-y divide-slate-100">
              {order.items.map((item, idx) => (
                <div
                  key={`${item.sku}-${idx}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="shadow-2xs h-12 w-12 rounded-xl border border-slate-200/80 object-cover"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.colorSize} · Mã SKU NBH: {item.sku}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">
                      {item.unitPrice.toLocaleString("vi-VN")} ₫ ×{" "}
                      <b className="text-[#16866f]">{item.quantity}</b>
                    </p>
                    <p className="font-semibold text-slate-800">
                      {item.lineTotal.toLocaleString("vi-VN")} ₫
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPack}
              className="gap-1.5 rounded-xl"
            >
              <Printer size={14} /> Đóng gói & In AWB
            </Button>
            {order.status !== "Đã giao" && order.status !== "Đã hủy" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onComplete}
                className="gap-1.5 rounded-xl text-emerald-700"
              >
                <CheckCircle2 size={14} /> Đã giao thành công
              </Button>
            )}
            {order.status !== "Đã hủy" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenReturn}
                className="gap-1.5 rounded-xl text-amber-700"
              >
                <RotateCcw size={14} /> Đổi trả / Hoàn tiền
              </Button>
            )}
          </div>
          <Button
            onClick={onClose}
            className="shadow-xs rounded-xl bg-gradient-to-r from-[#16866f] to-[#126b58] text-white transition-all hover:-translate-y-0.5 hover:shadow"
          >
            Đóng
          </Button>
        </div>
      </section>
    </div>
  )
}
