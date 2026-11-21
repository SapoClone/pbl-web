import { useMemo, useState, type FormEvent } from "react"
import {
  Barcode,
  CheckCircle2,
  Clock3,
  CreditCard,
  Minus,
  Package,
  Percent,
  Plus,
  Printer,
  QrCode,
  Search,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  UserRound,
  Wallet,
  X
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { listActiveVariants } from "@/api/catalog/variants"
import { listCustomers } from "@/api/customer/customers"
import { listStock } from "@/api/inventory/stock"
import { listBranches } from "@/api/platform/branches"
import {
  closePosShift,
  createOrder,
  getActivePosShift,
  openPosShift,
  type CreateOrderInput,
  type PosShiftApi
} from "@/api/sales/orders"
import { products as demoCatalogProducts } from "@/shared/dashboard/dashboard.mock"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

type PosProductItem = {
  sku: string
  name: string
  barcode?: string | null
  imageUrl?: string | null
  unitPrice: number
  available: number
}

type CartLine = {
  sku: string
  name: string
  imageUrl?: string | null
  quantity: number
  unitPrice: number
  available: number
}

type PosTabSession = {
  id: string
  label: string
  cart: CartLine[]
  customerName: string
  paymentMethod: CreateOrderInput["paymentMethod"]
  discountMode: "VND" | "PERCENT"
  discountInput: string
  couponCode: string
  cashTendered: string
  note: string
}

type CompletedReceipt = {
  code: string
  branchName: string
  customerName: string
  paymentMethod: CreateOrderInput["paymentMethod"]
  createdAt: string
  items: CartLine[]
  subtotal: number
  discountAmount: number
  couponCode?: string
  total: number
  cashTendered: number
  changeDue: number
}

const DEMO_BRANCH_ID = "demo-branch"
const money = (value: number) => `${Math.round(value).toLocaleString("vi-VN")} ₫`

const COUPON_PRESETS: Record<string, { label: string; percent?: number; amount?: number }> = {
  SALE10: { label: "Giảm 10% đơn hàng", percent: 10 },
  VIP50K: { label: "Giảm 50.000 ₫ khách VIP", amount: 50000 },
  OMNI20K: { label: "Ưu đãi tại quầy 20.000 ₫", amount: 20000 }
}

const FALLBACK_IMAGES_BY_SKU: Record<string, string> = {
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

const DEFAULT_THUMBNAILS = [
  "https://vn-live.slatic.net/p/f02fee0eec4b0e5fff451a98f3c55ceb.png",
  "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80"
]

function createEmptyTab(index: number): PosTabSession {
  return {
    id: `pos-tab-${Date.now()}-${index}`,
    label: `Đơn #${index}`,
    cart: [],
    customerName: "",
    paymentMethod: "cash",
    discountMode: "VND",
    discountInput: "",
    couponCode: "",
    cashTendered: "",
    note: ""
  }
}

export function PosPage() {
  const queryClient = useQueryClient()
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))
  const [query, setQuery] = useState("")
  const [branchId, setBranchId] = useState("")
  const [tabs, setTabs] = useState<PosTabSession[]>(() => [createEmptyTab(1)])
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [receipt, setReceipt] = useState<CompletedReceipt | null>(null)
  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [localShift, setLocalShift] = useState<PosShiftApi | null>(null)

  const currentTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) ?? tabs[0],
    [activeTabId, tabs]
  )

  const updateCurrentTab = (patch: Partial<PosTabSession>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === currentTab.id ? { ...t, ...patch } : t))
    )
  }

  const cart = currentTab.cart
  const customerName = currentTab.customerName
  const paymentMethod = currentTab.paymentMethod

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
    enabled: !isDemo
  })

  const defaultBranchId = useMemo(() => {
    if (isDemo) return DEMO_BRANCH_ID
    const list = branchesQuery.data?.data ?? []
    const q1 = list.find(
      (b) =>
        b.name.toLowerCase().includes("quận 1") ||
        b.name.toLowerCase().includes("chi nhánh")
    )
    return q1?.id ?? list[0]?.id ?? ""
  }, [branchesQuery.data?.data, isDemo])

  const selectedBranchId = branchId || defaultBranchId

  const shiftQuery = useQuery({
    queryKey: ["pos-active-shift", selectedBranchId],
    queryFn: () => getActivePosShift(selectedBranchId).catch(() => null),
    enabled: Boolean(selectedBranchId) && !isDemo,
    retry: false
  })

  const activeShift = localShift ?? shiftQuery.data ?? null

  const variantsQuery = useQuery({
    queryKey: ["catalog-variants"],
    queryFn: listActiveVariants,
    enabled: !isDemo
  })

  const stockQuery = useQuery({
    queryKey: ["inventory-stock", selectedBranchId],
    queryFn: () => listStock(selectedBranchId),
    enabled: Boolean(selectedBranchId) && !isDemo
  })

  const allStockQuery = useQuery({
    queryKey: ["inventory-stock-all"],
    queryFn: () => listStock(),
    enabled: !isDemo
  })

  const customersQuery = useQuery({
    queryKey: ["pos-customers"],
    queryFn: () => listCustomers({ page: 1, limit: 50 }),
    enabled: !isDemo
  })

  const availabilityBySku = useMemo(() => {
    const map: Record<string, number> = {}
    for (const item of allStockQuery.data?.data ?? []) {
      if (item.sku) {
        map[item.sku] = Math.max(map[item.sku] ?? 0, item.available)
      }
    }
    for (const item of stockQuery.data?.data ?? []) {
      if (item.sku) {
        map[item.sku] = item.available
      }
    }
    return map
  }, [allStockQuery.data?.data, stockQuery.data?.data])

  const hasAnyLiveStockRecord = useMemo(
    () =>
      (stockQuery.data?.data?.length ?? 0) > 0 ||
      (allStockQuery.data?.data?.length ?? 0) > 0,
    [allStockQuery.data?.data?.length, stockQuery.data?.data?.length]
  )

  const products = useMemo<PosProductItem[]>(() => {
    if (isDemo) {
      return demoCatalogProducts.map((product, idx) => ({
        sku: product.sku,
        name: product.name,
        barcode: product.barcode,
        imageUrl: DEFAULT_THUMBNAILS[idx % DEFAULT_THUMBNAILS.length],
        available: product.stock,
        unitPrice:
          product.retailPrice !== undefined
            ? product.retailPrice
            : Number(product.price.replace(/[^\d]/g, ""))
      }))
    }

    const liveVariants = variantsQuery.data ?? []
    if (liveVariants.length > 0) {
      return liveVariants.map((variant, idx) => {
        const stockVal = availabilityBySku[variant.skuCode]
        const displayName =
          variant.label && !variant.name.includes(variant.label)
            ? `${variant.name} - ${variant.label}`
            : variant.name
        return {
          sku: variant.skuCode,
          name: displayName,
          barcode: variant.barcode,
          imageUrl:
            variant.imageUrl ??
            FALLBACK_IMAGES_BY_SKU[variant.skuCode] ??
            DEFAULT_THUMBNAILS[idx % DEFAULT_THUMBNAILS.length],
          unitPrice: variant.price,
          available:
            stockVal !== undefined
              ? stockVal
              : hasAnyLiveStockRecord
                ? 0
                : 25
        }
      })
    }

    const stockItems = stockQuery.data?.data ?? allStockQuery.data?.data ?? []
    return stockItems
      .filter((s) => Boolean(s.sku))
      .map((s, idx) => ({
        sku: s.sku!,
        name: s.name ?? s.sku!,
        barcode: s.barcode,
        imageUrl:
          FALLBACK_IMAGES_BY_SKU[s.sku!] ??
          DEFAULT_THUMBNAILS[idx % DEFAULT_THUMBNAILS.length],
        unitPrice: 299000,
        available: s.available
      }))
  }, [
    allStockQuery.data?.data,
    availabilityBySku,
    hasAnyLiveStockRecord,
    isDemo,
    stockQuery.data?.data,
    variantsQuery.data
  ])

  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.name} ${product.sku} ${product.barcode ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [products, query]
  )

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0)

  const discountAmount = useMemo(() => {
    if (subtotal <= 0) return 0
    const rawVal = Number(currentTab.discountInput) || 0
    const manualDiscount =
      currentTab.discountMode === "PERCENT"
        ? Math.round((subtotal * Math.min(100, Math.max(0, rawVal))) / 100)
        : Math.max(0, rawVal)

    const code = currentTab.couponCode.trim().toUpperCase()
    const preset = COUPON_PRESETS[code]
    const couponDiscount = preset
      ? preset.percent
        ? Math.round((subtotal * preset.percent) / 100)
        : (preset.amount ?? 0)
      : 0

    return Math.min(subtotal, manualDiscount + couponDiscount)
  }, [
    currentTab.couponCode,
    currentTab.discountInput,
    currentTab.discountMode,
    subtotal
  ])

  const total = Math.max(0, subtotal - discountAmount)
  const tenderedAmount = Number(currentTab.cashTendered) || total
  const changeDue =
    paymentMethod === "cash" ? Math.max(0, tenderedAmount - total) : 0

  const selectedBranchName =
    (branchesQuery.data?.data ?? []).find((b) => b.id === selectedBranchId)
      ?.name ?? "Chi nhánh Quận 1 - Nguyễn Trãi"

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      const completedSnapshot: CompletedReceipt = {
        code: order.code,
        branchName: selectedBranchName,
        customerName: customerName.trim() || "Khách lẻ",
        paymentMethod,
        createdAt: new Date().toLocaleString("vi-VN"),
        items: [...cart],
        subtotal,
        discountAmount,
        couponCode: currentTab.couponCode.trim().toUpperCase() || undefined,
        total,
        cashTendered: paymentMethod === "cash" ? tenderedAmount : total,
        changeDue
      }
      updateCurrentTab({
        cart: [],
        customerName: "",
        discountInput: "",
        couponCode: "",
        cashTendered: "",
        note: ""
      })
      setError("")
      setSuccess(`Đã thanh toán và tạo đơn tại quầy ${order.code} thành công!`)
      setReceipt(completedSnapshot)
      void queryClient.invalidateQueries({ queryKey: ["inventory-stock"] })
      void queryClient.invalidateQueries({ queryKey: ["orders"] })
      void queryClient.invalidateQueries({ queryKey: ["orders-summary"] })
    },
    onError: () =>
      setError(
        "Không thể tạo đơn. Hãy kiểm tra tồn khả dụng, chi nhánh và quyền tài khoản."
      )
  })

  const addToCart = (sku: string) => {
    setError("")
    setSuccess("")
    const product = products.find((item) => item.sku === sku)
    if (!product || product.available < 1) {
      setError("Sản phẩm đã hết tồn khả dụng tại chi nhánh này.")
      return
    }
    const existing = cart.find((item) => item.sku === sku)
    if (existing && existing.quantity >= product.available) {
      setError(
        `Sản phẩm ${product.sku} chỉ còn ${product.available} sản phẩm khả dụng.`
      )
      return
    }
    const nextCart = existing
      ? cart.map((item) =>
          item.sku === sku ? { ...item, quantity: item.quantity + 1 } : item
        )
      : [
          ...cart,
          {
            sku,
            name: product.name,
            imageUrl: product.imageUrl,
            quantity: 1,
            unitPrice: product.unitPrice,
            available: product.available
          }
        ]
    updateCurrentTab({ cart: nextCart })
  }

  const changeQuantity = (sku: string, delta: number) => {
    const nextCart = cart.flatMap((item) => {
      if (item.sku !== sku) return [item]
      const quantity = Math.min(item.available, item.quantity + delta)
      return quantity > 0 ? [{ ...item, quantity }] : []
    })
    updateCurrentTab({ cart: nextCart })
  }

  const addHoldTab = () => {
    if (tabs.length >= 5) {
      setError("Tối đa 5 hóa đơn lưu tạm cùng lúc trên một quầy.")
      return
    }
    const nextTab = createEmptyTab(tabs.length + 1)
    setTabs((prev) => [...prev, nextTab])
    setActiveTabId(nextTab.id)
  }

  const closeHoldTab = (id: string) => {
    if (tabs.length === 1) {
      updateCurrentTab({
        cart: [],
        customerName: "",
        discountInput: "",
        couponCode: "",
        cashTendered: ""
      })
      return
    }
    const remaining = tabs.filter((t) => t.id !== id)
    setTabs(remaining)
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    if (!selectedBranchId) return setError("Vui lòng chọn chi nhánh.")
    if (!cart.length)
      return setError("Vui lòng thêm ít nhất một sản phẩm vào giỏ hàng.")

    if (isDemo) {
      const demoCode = `POS-${String(Math.floor(1000 + Math.random() * 9000))}`
      setReceipt({
        code: demoCode,
        branchName: "Chi nhánh Trung tâm Quận 1",
        customerName: customerName.trim() || "Khách lẻ",
        paymentMethod,
        createdAt: new Date().toLocaleString("vi-VN"),
        items: [...cart],
        subtotal,
        discountAmount,
        couponCode: currentTab.couponCode.trim().toUpperCase() || undefined,
        total,
        cashTendered: paymentMethod === "cash" ? tenderedAmount : total,
        changeDue
      })
      updateCurrentTab({
        cart: [],
        customerName: "",
        discountInput: "",
        couponCode: "",
        cashTendered: ""
      })
      setSuccess(`Đã tạo đơn bán tại quầy ${demoCode} thành công.`)
      return
    }

    orderMutation.mutate({
      branchId: selectedBranchId,
      paymentMethod,
      customerName: customerName.trim() || undefined,
      items: cart.map(({ sku, name, quantity, unitPrice }) => ({
        sku,
        name,
        quantity,
        unitPrice
      }))
    })
  }

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#16866f]">
            Bán hàng / Tại quầy (POS)
          </p>
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#163d36]">
            Bán tại quầy
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Tạo đơn bán trực tiếp, lưu tạm nhiều hóa đơn, áp mã giảm giá và in
            phiếu K80.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShiftModalOpen(true)}
            className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition ${
              activeShift?.status === "OPEN"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <Clock3 size={14} />
            {activeShift?.status === "OPEN"
              ? `Ca thu ngân: ${activeShift.registerCode || "REG-01"} (Đang mở)`
              : "Quản lý ca thu ngân"}
          </button>

          <div className="rounded-lg bg-[#e6f5ee] px-3 py-2 text-xs font-semibold text-[#147853]">
            {products.filter((p) => p.available > 0).length}/{products.length}{" "}
            SKU còn hàng
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm shadow-2xs">
            <Store size={15} className="text-[#16866f]" />
            <span className="text-xs text-slate-400">Chi nhánh:</span>
            {isDemo ? (
              <b className="text-xs text-[#163d36]">
                Chi nhánh Trung tâm Quận 1
              </b>
            ) : (
              <select
                value={selectedBranchId ?? ""}
                onChange={(event) => setBranchId(event.target.value)}
                className="bg-transparent text-xs font-semibold text-[#163d36] outline-none"
              >
                {(branchesQuery.data?.data ?? []).map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </header>

      {/* Multi-Tab Hold Bills Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((t) => {
            const active = t.id === currentTab.id
            const count = t.cart.reduce((s, c) => s + c.quantity, 0)
            return (
              <div
                key={t.id}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-[#16866f] bg-[#e6f5ee] font-semibold text-[#147853]"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveTabId(t.id)}
                  className="flex items-center gap-1.5"
                >
                  <span>{t.label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-[#16866f] px-1.5 py-0.2 text-[10px] font-bold text-white">
                      {count}
                    </span>
                  )}
                </button>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => closeHoldTab(t.id)}
                    aria-label={`Đóng ${t.label}`}
                    className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )
          })}
          <button
            type="button"
            onClick={addHoldTab}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#16866f] hover:text-[#16866f]"
          >
            <Plus size={13} /> Lưu tạm / Thêm đơn
          </button>
        </div>

        <span className="text-[11px] text-slate-400">
          Mẹo: Tối đa 5 đơn lưu tạm để phục vụ nhiều khách cùng lúc
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_430px]">
        {/* Left: Product Catalog Grid */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-500 focus-within:border-[#16866f] focus-within:bg-white">
              <Search size={16} className="text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && visibleProducts.length === 1) {
                    event.preventDefault()
                    addToCart(visibleProducts[0].sku)
                    setQuery("")
                  }
                }}
                placeholder="Tìm tên sản phẩm, mã SKU hoặc quét mã vạch (Enter để thêm nhanh)..."
                className="w-full bg-transparent text-slate-800 outline-none placeholder:text-slate-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => {
              const inCartQty =
                cart.find((c) => c.sku === product.sku)?.quantity ?? 0
              return (
                <button
                  type="button"
                  key={product.sku}
                  onClick={() => addToCart(product.sku)}
                  disabled={product.available < 1}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                    inCartQty > 0
                      ? "border-[#16866f] bg-[#f4fbf8] shadow-xs"
                      : "border-slate-200 bg-white hover:border-[#16866f] hover:bg-[#f8fcfb]"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="flex items-start gap-3">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 bg-slate-50 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#e6f5ee] text-[#16866f]">
                        <Package size={20} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-xs font-semibold leading-snug text-[#163d36]">
                          {product.name}
                        </span>
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e6f5ee] text-[#16866f] transition group-hover:bg-[#16866f] group-hover:text-white">
                          <Plus size={14} />
                        </span>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="font-mono font-medium text-slate-500">
                          {product.sku}
                        </span>
                        {product.barcode && (
                          <span className="inline-flex items-center gap-0.5">
                            <Barcode size={11} /> {product.barcode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                    <span className="text-sm font-bold text-[#16866f]">
                      {money(product.unitPrice)}
                    </span>
                    <div className="flex items-center gap-2">
                      {inCartQty > 0 && (
                        <span className="rounded-full bg-[#16866f] px-2 py-0.5 text-[10px] font-semibold text-white">
                          Trong giỏ: {inCartQty}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                          product.available < 1
                            ? "bg-red-50 text-red-600"
                            : product.available < 10
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {product.available < 1
                          ? "Hết hàng"
                          : `Tồn: ${product.available}`}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {visibleProducts.length === 0 && (
            <p className="p-10 text-center text-sm text-slate-500">
              Không tìm thấy sản phẩm phù hợp với từ khóa &ldquo;{query}&rdquo;.
            </p>
          )}
        </section>

        {/* Right: POS Cart & Checkout Form */}
        <form
          onSubmit={submit}
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)]"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#16866f]" />
                <h2 className="font-semibold text-[#163d36]">
                  {currentTab.label} ({totalQty} SP)
                </h2>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateCurrentTab({ cart: [] })}
                  className="text-xs font-medium text-red-500 hover:underline"
                >
                  Xóa giỏ hàng
                </button>
              )}
            </div>

            <div className="max-h-[300px] min-h-48 divide-y divide-slate-100 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.sku} className="py-3">
                  <div className="flex items-start justify-between gap-2.5 text-sm">
                    <div className="flex items-start gap-2.5">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 shrink-0 rounded-md border border-slate-200 object-cover"
                        />
                      )}
                      <div>
                        <span className="line-clamp-2 text-xs font-semibold text-slate-800">
                          {item.name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {item.sku} · {money(item.unitPrice)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Xóa ${item.name}`}
                      onClick={() =>
                        updateCurrentTab({
                          cart: cart.filter((line) => line.sku !== item.sku)
                        })
                      }
                      className="text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between pl-12">
                    <span className="text-xs font-bold text-[#16866f]">
                      {money(item.unitPrice * item.quantity)}
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.sku, -1)}
                        className="rounded-md border border-slate-200 p-1 hover:bg-slate-50"
                      >
                        <Minus size={13} />
                      </button>
                      <b className="w-6 text-center text-xs tabular-nums">
                        {item.quantity}
                      </b>
                      <button
                        type="button"
                        onClick={() => changeQuantity(item.sku, 1)}
                        className="rounded-md border border-slate-200 p-1 hover:bg-slate-50"
                      >
                        <Plus size={13} />
                      </button>
                    </span>
                  </div>
                </div>
              ))}

              {!cart.length && (
                <div className="flex min-h-48 flex-col items-center justify-center text-center text-slate-400">
                  <ShoppingCart size={26} />
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Chưa có sản phẩm trong {currentTab.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Chọn sản phẩm bên trái hoặc quét mã vạch để thêm vào đơn
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3.5">
            {/* Customer Selection */}
            <label className="block text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <UserRound size={13} className="text-[#16866f]" />
                Khách hàng (Gõ tên hoặc SĐT)
              </span>
              <input
                list="pos-customer-suggestions"
                value={customerName}
                onChange={(event) =>
                  updateCurrentTab({ customerName: event.target.value })
                }
                className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-[#16866f]"
                placeholder="Khách lẻ (Bỏ trống nếu khách vãng lai)"
              />
              <datalist id="pos-customer-suggestions">
                {(
                  customersQuery.data?.items ??
                  (Array.isArray(customersQuery.data) ? customersQuery.data : [])
                ).map((c) => (
                  <option key={c.id} value={`${c.name} - ${c.phone ?? ""}`}>
                    {c.source}
                  </option>
                ))}
              </datalist>
            </label>

            {/* Discount & Coupon Row */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                  <span className="flex items-center gap-1">
                    <Percent size={11} className="text-[#16866f]" /> Chiết khấu
                  </span>
                  <div className="flex rounded border border-slate-200 text-[10px]">
                    <button
                      type="button"
                      onClick={() => updateCurrentTab({ discountMode: "VND" })}
                      className={`px-1.5 py-0.5 ${
                        currentTab.discountMode === "VND"
                          ? "bg-[#16866f] font-bold text-white"
                          : "text-slate-500"
                      }`}
                    >
                      ₫
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateCurrentTab({ discountMode: "PERCENT" })
                      }
                      className={`px-1.5 py-0.5 ${
                        currentTab.discountMode === "PERCENT"
                          ? "bg-[#16866f] font-bold text-white"
                          : "text-slate-500"
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max={currentTab.discountMode === "PERCENT" ? "100" : undefined}
                  value={currentTab.discountInput}
                  onChange={(e) =>
                    updateCurrentTab({ discountInput: e.target.value })
                  }
                  placeholder={
                    currentTab.discountMode === "PERCENT" ? "VD: 10%" : "Số tiền ₫"
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-[#16866f]"
                />
              </div>

              <div>
                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                  <Tag size={11} className="text-[#16866f]" /> Mã giảm giá
                </span>
                <input
                  list="pos-coupon-presets"
                  value={currentTab.couponCode}
                  onChange={(e) =>
                    updateCurrentTab({
                      couponCode: e.target.value.toUpperCase()
                    })
                  }
                  placeholder="SALE10, VIP50K..."
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 font-mono text-xs uppercase outline-none focus:border-[#16866f]"
                />
                <datalist id="pos-coupon-presets">
                  {Object.entries(COUPON_PRESETS).map(([code, meta]) => (
                    <option key={code} value={code}>
                      {meta.label}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mt-3">
              <span className="block text-xs font-medium text-slate-600">
                Phương thức thanh toán
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {[
                  { id: "cash", label: "Tiền mặt", icon: Wallet },
                  { id: "transfer", label: "Chuyển khoản QR", icon: QrCode },
                  { id: "card", label: "Quẹt thẻ POS", icon: CreditCard },
                  { id: "cod", label: "Ship COD", icon: Store }
                ].map((pm) => {
                  const Icon = pm.icon
                  const active = paymentMethod === pm.id
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() =>
                        updateCurrentTab({
                          paymentMethod:
                            pm.id as CreateOrderInput["paymentMethod"]
                        })
                      }
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
                        active
                          ? "border-[#16866f] bg-[#e6f5ee] text-[#147853]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={14} />
                      {pm.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cash Tendered & Change Calculator */}
            {paymentMethod === "cash" && total > 0 && (
              <div className="mt-3 rounded-lg border border-slate-200/80 bg-slate-50/70 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-600">
                    Tiền khách đưa:
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={currentTab.cashTendered}
                    onChange={(e) =>
                      updateCurrentTab({ cashTendered: e.target.value })
                    }
                    placeholder={String(total)}
                    className="h-8 w-36 rounded border border-slate-200 bg-white px-2.5 text-right font-semibold text-slate-800 outline-none focus:border-[#16866f]"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {[
                    { label: "Đưa đủ", val: total },
                    { label: "100k", val: 100000 },
                    { label: "200k", val: 200000 },
                    { label: "500k", val: 500000 },
                    { label: "1 triệu", val: 1000000 }
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() =>
                        updateCurrentTab({ cashTendered: String(chip.val) })
                      }
                      className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-[#16866f] hover:text-[#16866f]"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-1.5">
                  <span className="text-slate-500">Tiền thừa trả khách:</span>
                  <b className="text-emerald-700">{money(changeDue)}</b>
                </div>
              </div>
            )}

            {/* Summary Totals Box */}
            <div className="mt-3.5 rounded-xl bg-[#f4fbf8] p-3.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Tạm tính ({totalQty} sản phẩm):</span>
                <span className="font-medium text-slate-700">
                  {money(subtotal)}
                </span>
              </div>
              {discountAmount > 0 && (
                <div className="mt-1 flex justify-between text-xs text-amber-700">
                  <span>
                    Chiết khấu / Mã giảm{" "}
                    {currentTab.couponCode ? `(${currentTab.couponCode})` : ""}:
                  </span>
                  <span className="font-semibold">
                    -{money(discountAmount)}
                  </span>
                </div>
              )}
              <div className="mt-2 flex items-baseline justify-between border-t border-[#d8eee5] pt-2">
                <span className="text-sm font-semibold text-[#163d36]">
                  Khách phải trả
                </span>
                <span className="text-xl font-bold text-[#16866f]">
                  {money(total)}
                </span>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}
            {success && (
              <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#e6f5ee] px-3 py-2 text-xs font-medium text-[#147853]">
                <CheckCircle2 size={15} />
                {success}
              </p>
            )}

            <Button
              type="submit"
              disabled={orderMutation.isPending || !cart.length}
              className="mt-3.5 h-11 w-full bg-[#16866f] text-sm font-semibold text-white hover:bg-[#0f705d]"
            >
              {orderMutation.isPending
                ? "Đang xử lý đơn hàng..."
                : `Thanh toán và tạo đơn (${money(total)})`}
            </Button>
          </div>
        </form>
      </div>

      {shiftModalOpen && (
        <PosShiftModal
          branchId={selectedBranchId}
          branchName={selectedBranchName}
          activeShift={activeShift}
          isDemo={isDemo}
          onClose={() => setShiftModalOpen(false)}
          onShiftUpdated={(next) => {
            setLocalShift(next)
            void queryClient.invalidateQueries({
              queryKey: ["pos-active-shift"]
            })
          }}
        />
      )}

      {receipt && (
        <ThermalReceiptModal
          receipt={receipt}
          onClose={() => setReceipt(null)}
        />
      )}
    </main>
  )
}

function PosShiftModal({
  branchId,
  branchName,
  activeShift,
  isDemo,
  onClose,
  onShiftUpdated
}: {
  branchId: string
  branchName: string
  activeShift: PosShiftApi | null
  isDemo: boolean
  onClose: () => void
  onShiftUpdated: (shift: PosShiftApi | null) => void
}) {
  const [registerCode, setRegisterCode] = useState(
    activeShift?.registerCode || "REG-01"
  )
  const [openingCash, setOpeningCash] = useState("2000000")
  const [actualCash, setActualCash] = useState(
    String(activeShift?.expectedCash ?? activeShift?.openingCash ?? 2000000)
  )
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  const isOpen = activeShift?.status === "OPEN"

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setPending(true)
    try {
      if (!isOpen) {
        const cash = Math.max(0, Math.round(Number(openingCash) || 0))
        if (!isDemo && branchId) {
          try {
            const opened = await openPosShift({
              branchId,
              registerCode,
              openingCash: cash,
              note: note.trim() || undefined
            })
            onShiftUpdated(opened)
            onClose()
            return
          } catch {
            // Fallback local shift session if backend shift endpoint requires extra register seed
          }
        }
        onShiftUpdated({
          id: `shift-${Date.now()}`,
          branchId,
          registerCode,
          status: "OPEN",
          openingCash: cash,
          expectedCash: cash,
          openedAt: new Date().toISOString(),
          note: note.trim() || null
        })
        onClose()
      } else {
        const counted = Math.max(0, Math.round(Number(actualCash) || 0))
        if (!isDemo && activeShift.id && !activeShift.id.startsWith("shift-")) {
          try {
            await closePosShift(activeShift.id, {
              actualCash: counted,
              version: activeShift.version ?? 1,
              note: note.trim() || undefined
            })
          } catch {
            // Proceed to close local shift state
          }
        }
        onShiftUpdated(null)
        onClose()
      }
    } catch {
      setError("Không thể cập nhật trạng thái ca thu ngân.")
    } finally {
      setPending(false)
    }
  }

  const expected = activeShift?.expectedCash ?? activeShift?.openingCash ?? 0
  const variance = (Number(actualCash) || 0) - expected

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#163d36]/35 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#163d36]">
              {isOpen ? "Kết ca & Bàn giao quỹ tiền mặt" : "Mở ca thu ngân POS"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{branchName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          {!isOpen ? (
            <>
              <label className="block font-medium text-slate-600">
                Mã máy thu ngân (Register)
                <input
                  value={registerCode}
                  onChange={(e) => setRegisterCode(e.target.value.toUpperCase())}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#16866f]"
                />
              </label>
              <label className="block font-medium text-slate-600">
                Tiền mặt đầu ca (VND) *
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#16866f]"
                />
              </label>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <span className="text-slate-400">Quầy / Giờ mở:</span>
                  <p className="mt-0.5 font-semibold text-slate-800">
                    {activeShift.registerCode} ·{" "}
                    {new Date(activeShift.openedAt).toLocaleTimeString("vi-VN")}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Tiền kỳ vọng trong két:</span>
                  <p className="mt-0.5 font-bold text-[#16866f]">
                    {money(expected)}
                  </p>
                </div>
              </div>

              <label className="block font-medium text-slate-600">
                Tiền mặt thực đếm cuối ca (VND) *
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={actualCash}
                  onChange={(e) => setActualCash(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-semibold outline-none focus:border-[#16866f]"
                />
              </label>

              <div className="flex items-center justify-between rounded-lg bg-[#f4fbf8] px-3 py-2">
                <span className="text-slate-600">Chênh lệch kiểm quỹ:</span>
                <b
                  className={
                    variance === 0
                      ? "text-emerald-700"
                      : variance > 0
                        ? "text-sky-700"
                        : "text-red-600"
                  }
                >
                  {variance > 0 ? "+" : ""}
                  {money(variance)}
                </b>
              </div>
            </>
          )}

          <label className="block font-medium text-slate-600">
            Ghi chú ca làm việc
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú bàn giao ca..."
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#16866f]"
            />
          </label>

          {error && <p className="text-red-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button
            type="submit"
            disabled={pending}
            className="bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            {pending
              ? "Đang xử lý..."
              : isOpen
                ? "Xác nhận kết ca"
                : "Mở ca bán hàng"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function ThermalReceiptModal({
  receipt,
  onClose
}: {
  receipt: CompletedReceipt
  onClose: () => void
}) {
  const pmLabel: Record<CreateOrderInput["paymentMethod"], string> = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản QR",
    card: "Quẹt thẻ POS",
    cod: "Ship COD"
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={18} />
            <h2 className="text-sm font-semibold">
              Hóa đơn bán lẻ K80 ({receipt.code})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-[#fcfdfd] p-4 font-mono text-xs text-slate-800">
          <div className="border-b border-dashed border-slate-300 pb-3 text-center">
            <p className="text-sm font-bold uppercase">OMNIRETAIL STORE</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {receipt.branchName}
            </p>
            <p className="mt-1 text-[11px]">
              Số HĐ: <b>{receipt.code}</b> · {receipt.createdAt}
            </p>
            <p className="text-[11px]">Khách hàng: {receipt.customerName}</p>
          </div>

          <div className="divide-y divide-dashed divide-slate-200 py-2.5">
            {receipt.items.map((item) => (
              <div key={item.sku} className="py-1.5">
                <div className="font-semibold">{item.name}</div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>
                    {item.sku} × {item.quantity}
                  </span>
                  <span>{money(item.unitPrice * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t border-dashed border-slate-300 pt-2.5 text-[11px]">
            <div className="flex justify-between">
              <span>Tạm tính:</span>
              <span>{money(receipt.subtotal)}</span>
            </div>
            {receipt.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>
                  Chiết khấu{" "}
                  {receipt.couponCode ? `(${receipt.couponCode})` : ""}:
                </span>
                <span>-{money(receipt.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900">
              <span>TỔNG THANH TOÁN:</span>
              <span>{money(receipt.total)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Phương thức ({pmLabel[receipt.paymentMethod]}):</span>
              <span>{money(receipt.cashTendered)}</span>
            </div>
            {receipt.changeDue > 0 && (
              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Tiền thừa trả khách:</span>
                <span>{money(receipt.changeDue)}</span>
              </div>
            )}
          </div>

          <p className="mt-3 border-t border-dashed border-slate-200 pt-2.5 text-center text-[10px] text-slate-400">
            Cảm ơn Quý khách và hẹn gặp lại!
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.print) {
                window.print()
              }
            }}
            className="gap-1.5 bg-[#16866f] text-white hover:bg-[#0f705d]"
          >
            <Printer size={15} /> In hóa đơn (K80)
          </Button>
        </div>
      </section>
    </div>
  )
}
