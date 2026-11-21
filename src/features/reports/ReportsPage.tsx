import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Calendar,
  Coins,
  Download,
  Package,
  Percent,
  RefreshCw,
  Search,
  Share2,
  ShoppingCart,
  TrendingUp,
  Warehouse
} from "lucide-react"
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  ChannelBadge,
  CopyCodeBadge,
  KpiStatCard,
  SegmentedTabs
} from "@/components/ui/micro-ux"
import { useToast } from "@/components/ui/toast"
import {
  getGrossProfitSummaryReport,
  getInventoryMovementsReport,
  getInventoryValuationReport,
  getRevenueTrendReport,
  getSalesByChannelReport,
  getSalesByProductReport,
  getSlowMovingInventoryReport,
  type ProductSalesReportItem
} from "@/api/insight/reports"
import { listWarehouses } from "@/api/inventory/warehouses"
import { listBranches } from "@/api/platform/branches"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"
import {
  buildDemoBranchProfitability,
  buildDemoChannelBreakdown,
  buildDemoInventoryMovements,
  buildDemoInventoryValuation,
  buildDemoProductSales,
  buildDemoRevenueTrend,
  buildDemoSlowMovingSkus,
  DEMO_REPORT_BRANCHES,
  DEMO_WAREHOUSE_NAMES
} from "./reports.demo"

export type OmnichannelReportTab =
  | "channels"
  | "products"
  | "inventory"
  | "finance"

type DatePreset = "7d" | "30d" | "month" | "custom"
type ProductReportMode = "top" | "slow"
type ProductSortBy = "REVENUE" | "PROFIT" | "UNITS"

const CHANNEL_COLORS: Record<string, string> = {
  POS: "#16866f",
  IN_STORE: "#16866f",
  LAZADA: "#0f146d",
  SHOPEE: "#ee4d2d",
  WEBSITE: "#0284c7",
  WEB: "#0284c7",
  TIKTOK_SHOP: "#0f172a"
}

const CHANNEL_NAMES: Record<string, string> = {
  POS: "POS Tại cửa hàng",
  IN_STORE: "POS Tại cửa hàng",
  LAZADA: "Lazada Mall",
  SHOPEE: "Shopee Mall",
  WEBSITE: "Website Thương hiệu",
  WEB: "Website Thương hiệu",
  TIKTOK_SHOP: "TikTok Shop"
}

const formatMoney = (value: number | string | null | undefined) =>
  `${Math.round(Number(value ?? 0)).toLocaleString("vi-VN")}đ`

const formatCompactVnd = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}tỷ`
  if (abs >= 1_000_000) return `${Math.round(value / 1_000_000)}tr`
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k`
  return String(Math.round(value))
}

const toDateInput = (date: Date) => date.toISOString().slice(0, 10)

function computePresetRange(preset: Exclude<DatePreset, "custom">) {
  const today = new Date()
  const to = toDateInput(today)
  if (preset === "month") {
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    return { from: toDateInput(first), to }
  }
  const days = preset === "30d" ? 29 : 6
  const fromDate = new Date(today)
  fromDate.setDate(today.getDate() - days)
  return { from: toDateInput(fromDate), to }
}

function readInitialReportTab(propTab?: string | null): OmnichannelReportTab {
  const candidate =
    propTab ??
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab")
      : null)
  if (
    candidate === "channels" ||
    candidate === "products" ||
    candidate === "inventory" ||
    candidate === "finance"
  ) {
    return candidate
  }
  return "channels"
}

export function ReportsPage({
  requestedTab
}: {
  requestedTab?: string | null
} = {}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const isDemo = Boolean(useStoreAuth((state) => state.tokens?.isDemo))

  const [tab, setTab] = useState<OmnichannelReportTab>(() =>
    readInitialReportTab(requestedTab)
  )
  const [preset, setPreset] = useState<DatePreset>("7d")
  const initialRange = useMemo(() => computePresetRange("7d"), [])
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [appliedRange, setAppliedRange] = useState(initialRange)
  const [branchId, setBranchId] = useState<string>("")
  const [rangeError, setRangeError] = useState("")

  // Sub-controls for Product & Inventory tabs
  const [productMode, setProductMode] = useState<ProductReportMode>("top")
  const [productSort, setProductSort] = useState<ProductSortBy>("REVENUE")
  const [skuSearch, setSkuSearch] = useState("")
  const [daysWindow, setDaysWindow] = useState<number>(30)
  const [maxUnitsSold, setMaxUnitsSold] = useState<number>(2)
  const [movementFilter, setMovementFilter] = useState<string>("ALL")

  useEffect(() => {
    if (
      requestedTab === "channels" ||
      requestedTab === "products" ||
      requestedTab === "inventory" ||
      requestedTab === "finance"
    ) {
      setTab(requestedTab)
    }
  }, [requestedTab])

  useEffect(() => {
    const onPop = () => setTab(readInitialReportTab())
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [])

  const handleTabChange = (next: OmnichannelReportTab) => {
    setTab(next)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("tab", next)
      window.history.replaceState({}, "", url.toString())
    }
  }

  const selectPreset = (nextPreset: Exclude<DatePreset, "custom">) => {
    setPreset(nextPreset)
    const range = computePresetRange(nextPreset)
    setFrom(range.from)
    setTo(range.to)
    setRangeError("")
    setAppliedRange(range)
  }

  const applyCustomRange = () => {
    if (!from || !to || from > to) {
      setRangeError("Ngày bắt đầu không được lớn hơn ngày kết thúc.")
      return
    }
    setRangeError("")
    setPreset("custom")
    setAppliedRange({ from, to })
  }

  // Reference metadata queries
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: listBranches,
    enabled: !isDemo
  })
  const warehousesQuery = useQuery({
    queryKey: ["inventory-warehouses"],
    queryFn: () => listWarehouses(),
    enabled: !isDemo
  })

  const branches = isDemo
    ? DEMO_REPORT_BRANCHES
    : (branchesQuery.data?.data ?? [])

  const warehouseNameMap = useMemo(() => {
    const map = new Map<string, string>(Object.entries(DEMO_WAREHOUSE_NAMES))
    for (const wh of warehousesQuery.data ?? []) {
      map.set(wh.id, wh.name)
    }
    return map
  }, [warehousesQuery.data])

  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of branches) {
      map.set(b.id, b.name)
    }
    return map
  }, [branches])

  // Live Insight Analytics Queries
  const channelQuery = useQuery({
    queryKey: ["report-by-channel", appliedRange.from, appliedRange.to, branchId],
    queryFn: () =>
      getSalesByChannelReport({
        from: appliedRange.from,
        to: appliedRange.to,
        ...(branchId ? { branchId } : {})
      }),
    enabled: !isDemo
  })

  const trendQuery = useQuery({
    queryKey: ["report-trend", appliedRange.from, appliedRange.to, branchId],
    queryFn: () =>
      getRevenueTrendReport({
        from: appliedRange.from,
        to: appliedRange.to,
        granularity: "DAY",
        ...(branchId ? { branchId } : {})
      }),
    enabled: !isDemo
  })

  const productSalesQuery = useQuery({
    queryKey: ["report-by-product", appliedRange.from, appliedRange.to, branchId],
    queryFn: () =>
      getSalesByProductReport({
        from: appliedRange.from,
        to: appliedRange.to,
        limit: 50,
        ...(branchId ? { branchId } : {})
      }),
    enabled: !isDemo && (tab === "products" || tab === "finance")
  })

  const slowMovingQuery = useQuery({
    queryKey: ["report-slow-moving", daysWindow, maxUnitsSold, branchId],
    queryFn: () =>
      getSlowMovingInventoryReport({
        daysWindow,
        maxUnitsSold,
        limit: 50,
        ...(branchId ? { branchId } : {})
      }),
    enabled: !isDemo && tab === "products" && productMode === "slow"
  })

  const valuationQuery = useQuery({
    queryKey: ["report-valuation", appliedRange.to, branchId],
    queryFn: () =>
      getInventoryValuationReport({
        date: appliedRange.to,
        ...(branchId ? { branchId } : {})
      }),
    enabled: !isDemo && tab === "inventory"
  })

  const movementsQuery = useQuery({
    queryKey: [
      "report-movements",
      appliedRange.from,
      appliedRange.to,
      branchId,
      movementFilter
    ],
    queryFn: () =>
      getInventoryMovementsReport({
        from: appliedRange.from,
        to: appliedRange.to,
        ...(branchId ? { branchId } : {}),
        ...(movementFilter !== "ALL" ? { movementType: movementFilter } : {}),
        limit: 60
      }),
    enabled: !isDemo && tab === "inventory"
  })

  const grossProfitQuery = useQuery({
    queryKey: ["report-gross-profit", appliedRange.from, appliedRange.to, branchId],
    queryFn: () =>
      getGrossProfitSummaryReport({
        from: appliedRange.from,
        to: appliedRange.to,
        ...(branchId ? { branchId } : {})
      }),
    enabled: !isDemo && tab === "finance"
  })

  // Computed Demo + Live Normalized Data
  const demoTrend = useMemo(
    () => buildDemoRevenueTrend(appliedRange.from, appliedRange.to, branchId || undefined),
    [appliedRange.from, appliedRange.to, branchId]
  )

  const trendSeries = useMemo(() => {
    const raw = isDemo ? demoTrend : (trendQuery.data ?? [])
    return raw.map((pt) => {
      const d = pt.date || pt.bucket || pt.dateBucket || ""
      return {
        ...pt,
        date: d,
        shortDate: d.length >= 10 ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : d,
        netSalesRevenue: Number(pt.netSalesRevenue ?? 0),
        grossProfit: Number(pt.grossProfit ?? 0),
        orderCount: Number(pt.orderCount ?? 0)
      }
    })
  }, [isDemo, demoTrend, trendQuery.data])

  const channelRows = useMemo(() => {
    const raw = isDemo
      ? buildDemoChannelBreakdown(demoTrend)
      : (channelQuery.data?.data ?? [])
    return raw.map((row) => {
      const code = String(row.channelType || "POS").toUpperCase()
      return {
        ...row,
        channelType: code,
        channelLabel: CHANNEL_NAMES[code] ?? code,
        fill: CHANNEL_COLORS[code] ?? "#64748b",
        netSalesRevenue: Number(row.netSalesRevenue ?? 0),
        grossProfit: Number(row.grossProfit ?? 0),
        orderCount: Number(row.orderCount ?? 0),
        completedOrderCount: Number(row.completedOrderCount ?? 0),
        cancelledOrderCount: Number(row.cancelledOrderCount ?? 0),
        aovNum: Number(row.aov ?? 0),
        shareNum: Number(row.revenueSharePct ?? 0)
      }
    })
  }, [isDemo, demoTrend, channelQuery.data?.data])

  const sortedProducts = useMemo(() => {
    const base: ProductSalesReportItem[] = isDemo
      ? buildDemoProductSales(branchId || undefined)
      : (productSalesQuery.data?.data ?? [])
    const q = skuSearch.trim().toLowerCase()
    const filtered = q
      ? base.filter((p) =>
          `${p.skuCode} ${p.productName}`.toLowerCase().includes(q)
        )
      : base
    return [...filtered].sort((a, b) => {
      if (productSort === "PROFIT") {
        return Number(b.grossProfit ?? 0) - Number(a.grossProfit ?? 0)
      }
      if (productSort === "UNITS") {
        return Number(b.unitsSold ?? 0) - Number(a.unitsSold ?? 0)
      }
      return Number(b.netSalesRevenue ?? 0) - Number(a.netSalesRevenue ?? 0)
    })
  }, [isDemo, branchId, productSalesQuery.data?.data, skuSearch, productSort])

  const slowMovingRows = useMemo(() => {
    const base = isDemo
      ? buildDemoSlowMovingSkus(daysWindow, maxUnitsSold)
      : (slowMovingQuery.data?.data ?? [])
    const q = skuSearch.trim().toLowerCase()
    return q
      ? base.filter((item) =>
          `${item.skuCode} ${item.productName}`.toLowerCase().includes(q)
        )
      : base
  }, [isDemo, daysWindow, maxUnitsSold, slowMovingQuery.data?.data, skuSearch])

  const valuationData = useMemo(() => {
    const base = isDemo
      ? buildDemoInventoryValuation(branchId || undefined)
      : (valuationQuery.data ?? {
          totals: {
            onHandValuation: 0,
            inTransitValuation: 0,
            totalValuation: 0
          },
          warehouses: []
        })
    return {
      totals: base.totals,
      warehouses: base.warehouses.map((w) => ({
        ...w,
        warehouseLabel:
          w.warehouseName ||
          warehouseNameMap.get(w.warehouseId) ||
          `Kho ${String(w.warehouseId).slice(0, 8)}`
      }))
    }
  }, [isDemo, branchId, valuationQuery.data, warehouseNameMap])

  const movementRows = useMemo(() => {
    const base = isDemo
      ? buildDemoInventoryMovements()
      : (movementsQuery.data?.data ?? [])
    if (movementFilter === "ALL") return base
    return base.filter((m) =>
      String(m.movementType).toUpperCase().includes(movementFilter)
    )
  }, [isDemo, movementsQuery.data?.data, movementFilter])

  const financeData = useMemo(() => {
    if (!isDemo && grossProfitQuery.data) {
      const s = grossProfitQuery.data.summary
      const gross = Number(s.grossSalesRevenue ?? 0)
      const discount = Number(s.discountTotal ?? 0)
      const returns = Number(s.returnsAmount ?? 0)
      const net = Number(s.netSalesRevenue ?? 0)
      const profit = Number(s.grossProfit ?? 0)
      const cogs = Math.max(0, net - profit)
      return {
        grossSalesRevenue: gross,
        discountTotal: discount,
        returnsAmount: returns,
        netSalesRevenue: net,
        netCogsAmount: cogs,
        grossProfit: profit,
        grossMarginPct: Number(s.grossMarginPct ?? 0),
        isProfitProvisional: Boolean(s.isProfitProvisional),
        pendingCostLinesCount: Number(s.pendingCostLinesCount ?? 0),
        branches: grossProfitQuery.data.branches.map((b) => ({
          ...b,
          branchLabel:
            b.branchName ||
            branchNameMap.get(b.branchId) ||
            `Chi nhánh ${String(b.branchId).slice(0, 8)}`
        }))
      }
    }

    const demoBranches = buildDemoBranchProfitability(demoTrend)
    const filteredBranches = branchId
      ? demoBranches.filter((b) => b.branchId === branchId)
      : demoBranches
    const gross = filteredBranches.reduce((s, b) => s + b.grossSalesRevenue, 0)
    const discount = filteredBranches.reduce((s, b) => s + b.discountTotal, 0)
    const returns = filteredBranches.reduce((s, b) => s + b.returnsAmount, 0)
    const net = filteredBranches.reduce((s, b) => s + b.netSalesRevenue, 0)
    const cogs = filteredBranches.reduce((s, b) => s + b.netCogsAmount, 0)
    const profit = filteredBranches.reduce((s, b) => s + b.grossProfit, 0)
    const margin = net > 0 ? Number(((profit / net) * 100).toFixed(1)) : 0

    return {
      grossSalesRevenue: gross,
      discountTotal: discount,
      returnsAmount: returns,
      netSalesRevenue: net,
      netCogsAmount: cogs,
      grossProfit: profit,
      grossMarginPct: margin,
      isProfitProvisional: false,
      pendingCostLinesCount: 0,
      branches: filteredBranches.map((b) => ({
        ...b,
        branchLabel: b.branchName || b.branchId
      }))
    }
  }, [isDemo, grossProfitQuery.data, demoTrend, branchId, branchNameMap])

  const handleRefreshAll = async () => {
    await queryClient.invalidateQueries({
      predicate: (q) => String(q.queryKey[0] ?? "").startsWith("report-")
    })
    toast({
      title: "Đã làm mới số liệu phân tích đa kênh",
      variant: "info"
    })
  }

  const handleExportCurrentTabCsv = () => {
    let lines: string[] = []
    let filename = `bao-cao-${tab}-${appliedRange.from}-${appliedRange.to}.csv`

    if (tab === "channels") {
      lines = [
        "Kênh bán,Số đơn,Đơn hoàn tất,Đơn hủy,Doanh thu gộp,Chiết khấu,Doanh thu thuần,Lợi nhuận gộp,AOV,Tỷ trọng (%)",
        ...channelRows.map(
          (r) =>
            `"${r.channelLabel}",${r.orderCount},${r.completedOrderCount},${r.cancelledOrderCount},${r.grossSalesRevenue},${r.discountTotal},${r.netSalesRevenue},${r.grossProfit},${r.aovNum},${r.shareNum}`
        )
      ]
    } else if (tab === "products" && productMode === "top") {
      filename = `bao-cao-top-sku-${appliedRange.from}-${appliedRange.to}.csv`
      lines = [
        "Mã SKU,Tên sản phẩm,SL Bán,SL Trả,Doanh thu thuần,Giá vốn (COGS),Lợi nhuận gộp,Biên lãi gộp (%)",
        ...sortedProducts.map(
          (p) =>
            `"${p.skuCode}","${p.productName}",${p.unitsSold},${p.unitsReturned},${p.netSalesRevenue},${p.netCogsAmount},${p.grossProfit},${p.grossMarginPct}`
        )
      ]
    } else if (tab === "products" && productMode === "slow") {
      filename = `bao-cao-sku-ton-dong-${daysWindow}d.csv`
      lines = [
        "Mã SKU,Tên sản phẩm,Tồn thực tế,SL bán trong kỳ,Giá vốn BQ,Giá trị vốn tồn đọng",
        ...slowMovingRows.map(
          (s) =>
            `"${s.skuCode}","${s.productName}",${s.onHandQty},${s.unitsSoldInWindow},${s.avgUnitCost},${s.inventoryValuation}`
        )
      ]
    } else if (tab === "inventory") {
      lines = [
        "Kho hàng,Số SKU,Tồn tại kho,Đang giữ chỗ,Khả dụng,Giá trị tại kho,Giá trị đang chuyển,Tổng giá trị",
        ...valuationData.warehouses.map(
          (w) =>
            `"${w.warehouseLabel}",${w.skuCount},${w.totalOnHandQty},${w.totalReservedQty},${w.totalAvailableQty},${w.onHandValuation},${w.inTransitValuation},${w.totalValuation}`
        )
      ]
    } else {
      lines = [
        "Chi nhánh,Số đơn hoàn tất,Doanh thu gộp,Chiết khấu,Trả hàng,Doanh thu thuần,Giá vốn COGS,Lợi nhuận gộp,Biên lợi nhuận (%)",
        ...financeData.branches.map(
          (b) =>
            `"${b.branchLabel}",${b.completedOrderCount},${b.grossSalesRevenue},${b.discountTotal},${b.returnsAmount},${b.netSalesRevenue},${b.netCogsAmount},${b.grossProfit},${b.grossMarginPct}`
        )
      ]
    }

    const blob = new Blob([`\uFEFF${lines.join("\n")}`], {
      type: "text/csv;charset=utf-8"
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Đã xuất báo cáo CSV (UTF-8)",
      description: `Tệp ${filename} đã được tải xuống.`,
      variant: "success"
    })
  }

  // Channel Tab Aggregates
  const totalChannelNetRev = channelRows.reduce(
    (s, r) => s + r.netSalesRevenue,
    0
  )
  const totalChannelOrders = channelRows.reduce(
    (s, r) => s + r.completedOrderCount,
    0
  )
  const totalChannelAov =
    totalChannelOrders > 0 ? totalChannelNetRev / totalChannelOrders : 0
  const topChannel = [...channelRows].sort(
    (a, b) => b.netSalesRevenue - a.netSalesRevenue
  )[0]

  const totalSlowCapital = slowMovingRows.reduce(
    (s, r) => s + Number(r.inventoryValuation ?? 0),
    0
  )

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      {/* Header */}
      <header className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#147853]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#16866f] animate-pulse" />
            <span>Insight BI · Phân tích Kinh doanh Đa kênh</span>
          </div>
          <h1 className="truncate text-2xl font-bold tracking-tight text-[#163d36] sm:text-3xl">
            Báo cáo Điều hành Đa kênh
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Đối chiếu tỷ trọng doanh thu các sàn TMĐT, hiệu suất SKU, giá trị tồn
            kho và biên lợi nhuận gộp thực tế theo thời gian thực.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:shrink-0">
          <span className="rounded-xl border border-emerald-200/80 bg-[#e6f5ee] px-3 py-2 text-xs font-semibold text-[#147853] shadow-2xs">
            {isDemo
              ? "Dữ liệu phân tích mẫu"
              : "Đồng bộ từ Insight Read-Model"}
          </span>
          {!isDemo ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleRefreshAll()}
              className="gap-2 rounded-xl border-slate-200/90 text-xs shadow-2xs hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              <span>Làm mới</span>
            </Button>
          ) : null}
          <button
            type="button"
            onClick={handleExportCurrentTabCsv}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#16866f] to-[#126b58] px-4 py-2 text-xs font-semibold text-white shadow-[0_2px_12px_rgba(22,134,111,0.25)] hover:shadow-[0_4px_18px_rgba(22,134,111,0.35)] hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            <Download size={15} />
            <span>Xuất CSV tab hiện tại</span>
          </button>
        </div>
      </header>

      {/* Global Filter Bar */}
      <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_4px_20px_-4px_rgba(20,50,45,0.04)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Calendar size={14} className="text-[#16866f]" />
              Kỳ phân tích:
            </span>
            {(
              [
                { id: "7d", label: "7 ngày qua" },
                { id: "30d", label: "30 ngày qua" },
                { id: "month", label: "Tháng này" }
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  preset === p.id
                    ? "bg-[#16866f] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="flex flex-wrap items-center gap-1.5 pl-1">
              <input
                type="date"
                aria-label="Từ ngày"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-[#16866f]"
              />
              <span className="text-xs text-slate-400">→</span>
              <input
                type="date"
                aria-label="Đến ngày"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:border-[#16866f]"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={applyCustomRange}
                className="h-9 text-xs font-semibold text-[#16866f]"
              >
                Áp dụng
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Chi nhánh:</span>
            <select
              aria-label="Chọn chi nhánh báo cáo"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-[#163d36] outline-none focus:border-[#16866f]"
            >
              <option value="">Toàn chuỗi cửa hàng</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {rangeError ? (
          <p className="mt-2 text-xs font-medium text-red-600">{rangeError}</p>
        ) : null}
      </section>

      {/* 4 Segmented Report Tabs */}
      <div className="mb-6">
        <SegmentedTabs<OmnichannelReportTab>
          value={tab}
          onChange={handleTabChange}
          ariaLabel="Chuyển loại báo cáo điều hành"
          tabs={[
            {
              value: "channels",
              label: "Bán hàng theo Kênh",
              icon: Share2,
              badge: channelRows.length
            },
            {
              value: "products",
              label: "Báo cáo theo Sản phẩm (SKU)",
              icon: Package,
              badge: sortedProducts.length
            },
            {
              value: "inventory",
              label: "Giá trị Tồn kho & Xuất nhập tồn",
              icon: Boxes,
              badge: valuationData.warehouses.length
            },
            {
              value: "finance",
              label: "Tài chính & Lợi nhuận gộp",
              icon: Coins,
              badge: `${financeData.grossMarginPct}%`
            }
          ]}
        />
      </div>

      {/* ============================================================ */}
      {/* TAB 1: BÁO CÁO BÁN HÀNG THEO KÊNH                            */}
      {/* ============================================================ */}
      {tab === "channels" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiStatCard
              label="Doanh thu thuần đa kênh"
              value={formatMoney(totalChannelNetRev)}
              hint={`Từ ${appliedRange.from} đến ${appliedRange.to}`}
              icon={TrendingUp}
              tone="emerald"
            />
            <KpiStatCard
              label="Tổng đơn hoàn tất"
              value={totalChannelOrders.toLocaleString("vi-VN")}
              hint="Đã đối soát giao thành công"
              icon={ShoppingCart}
              tone="sky"
            />
            <KpiStatCard
              label="Giá trị đơn trung bình (AOV)"
              value={formatMoney(totalChannelAov)}
              hint="Bình quân trên mỗi đơn hoàn tất"
              icon={BarChart3}
              tone="indigo"
            />
            <KpiStatCard
              label="Kênh dẫn đầu doanh số"
              value={topChannel ? topChannel.channelLabel : "—"}
              hint={
                topChannel
                  ? `Chiếm ${topChannel.shareNum}% tổng doanh thu kỳ`
                  : "Chưa có dữ liệu"
              }
              icon={Share2}
              tone="amber"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Donut Share Chart */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)] lg:col-span-5">
              <h2 className="text-base font-semibold text-[#163d36]">
                Cơ cấu tỷ trọng doanh thu theo Kênh bán
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                So sánh đóng góp của POS, Lazada, Shopee và Website.
              </p>

              <div className="relative mt-4 h-[290px] w-full">
                <div className="pointer-events-none absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Tổng DT
                  </p>
                  <p className="text-sm font-bold tabular-nums text-[#163d36]">
                    {formatCompactVnd(totalChannelNetRev)}
                  </p>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelRows}
                      dataKey="netSalesRevenue"
                      nameKey="channelLabel"
                      innerRadius={68}
                      outerRadius={104}
                      paddingAngle={3}
                    >
                      {channelRows.map((entry) => (
                        <Cell key={entry.channelType} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) => [
                        formatMoney(Number(val ?? 0)),
                        "Doanh thu thuần"
                      ]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      wrapperStyle={{ fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Revenue vs Profit & Orders Bar Chart */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)] lg:col-span-7">
              <h2 className="text-base font-semibold text-[#163d36]">
                Đối chiếu Doanh thu thuần & Lợi nhuận gộp giữa các Kênh
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Phân tích hiệu quả sinh lời sau chiết khấu sàn & voucher khuyến mãi.
              </p>

              <div className="mt-4 h-[290px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={channelRows}
                    margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="channelLabel"
                      tick={{ fontSize: 11, fill: "#475569" }}
                    />
                    <YAxis
                      tickFormatter={formatCompactVnd}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        formatMoney(Number(val ?? 0)),
                        String(name)
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar
                      dataKey="netSalesRevenue"
                      name="Doanh thu thuần"
                      fill="#16866f"
                      radius={[6, 6, 0, 0]}
                    />
                    <Bar
                      dataKey="grossProfit"
                      name="Lợi nhuận gộp"
                      fill="#0284c7"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Channel Detailed Table */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-[#163d36]">
                Bảng chi tiết hiệu suất kinh doanh theo Kênh bán hàng
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Kênh bán</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Số đơn hoàn tất
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Đơn hủy
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Doanh thu gộp
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Chiết khấu KM
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Doanh thu thuần
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Lợi nhuận gộp
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">AOV</th>
                    <th className="px-5 py-3 font-semibold">Tỷ trọng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {channelRows.map((row) => (
                    <tr key={row.channelType} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5">
                        <ChannelBadge channel={row.channelType} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-[#163d36]">
                        {row.completedOrderCount.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-500">
                        {row.cancelledOrderCount}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                        {formatMoney(row.grossSalesRevenue)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-rose-600">
                        -{formatMoney(row.discountTotal)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums text-[#163d36]">
                        {formatMoney(row.netSalesRevenue)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-[#147853]">
                        {formatMoney(row.grossProfit)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                        {formatMoney(row.aovNum)}
                      </td>
                      <td className="w-40 px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, row.shareNum)}%`,
                                backgroundColor: row.fill
                              }}
                            />
                          </div>
                          <span className="w-11 text-right text-xs font-semibold tabular-nums text-slate-600">
                            {row.shareNum}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* TAB 2: BÁO CÁO THEO SẢN PHẨM (TOP SKU & SKU TỒN ĐỌNG)        */}
      {/* ============================================================ */}
      {tab === "products" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setProductMode("top")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  productMode === "top"
                    ? "bg-[#16866f] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <TrendingUp size={14} />
                Top SKU Doanh thu & Lợi nhuận ({sortedProducts.length})
              </button>
              <button
                type="button"
                onClick={() => setProductMode("slow")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                  productMode === "slow"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                <AlertTriangle size={14} />
                SKU Tồn đọng / Bán chậm ({slowMovingRows.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-400">
                <Search size={14} />
                <input
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  placeholder="Lọc mã SKU hoặc tên sản phẩm..."
                  className="w-48 text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              {productMode === "top" ? (
                <select
                  aria-label="Tiêu chí xếp hạng Top SKU"
                  value={productSort}
                  onChange={(e) =>
                    setProductSort(e.target.value as ProductSortBy)
                  }
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-[#163d36] outline-none"
                >
                  <option value="REVENUE">Xếp theo Doanh thu thuần</option>
                  <option value="PROFIT">Xếp theo Lợi nhuận gộp</option>
                  <option value="UNITS">Xếp theo Số lượng bán</option>
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    aria-label="Khung ngày đánh giá tồn đọng"
                    value={daysWindow}
                    onChange={(e) => setDaysWindow(Number(e.target.value))}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                  >
                    <option value={15}>Trong 15 ngày</option>
                    <option value={30}>Trong 30 ngày</option>
                    <option value={60}>Trong 60 ngày</option>
                    <option value={90}>Trong 90 ngày</option>
                  </select>
                  <select
                    aria-label="Ngưỡng số lượng bán chậm"
                    value={maxUnitsSold}
                    onChange={(e) => setMaxUnitsSold(Number(e.target.value))}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700"
                  >
                    <option value={0}>Không bán được (0 SP)</option>
                    <option value={2}>Bán ≤ 2 sản phẩm</option>
                    <option value={5}>Bán ≤ 5 sản phẩm</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {productMode === "top" ? (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
                <h2 className="text-base font-semibold text-[#163d36]">
                  Biểu đồ Top SKU mang lại giá trị cao nhất (ProductSalesSummary)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  So sánh Doanh thu thuần và Lợi nhuận gộp thực thu trên từng mặt hàng chủ lực.
                </p>

                <div className="mt-4 h-[310px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sortedProducts.slice(0, 8)}
                      layout="vertical"
                      margin={{ top: 6, right: 24, left: 24, bottom: 6 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        type="number"
                        tickFormatter={formatCompactVnd}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="skuCode"
                        width={125}
                        tick={{ fontSize: 11, fill: "#163d36" }}
                      />
                      <Tooltip
                        formatter={(val: unknown, name: unknown) => [
                          formatMoney(Number(val ?? 0)),
                          String(name)
                        ]}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar
                        dataKey="netSalesRevenue"
                        name="Doanh thu thuần"
                        fill="#16866f"
                        radius={[0, 6, 6, 0]}
                      />
                      <Bar
                        dataKey="grossProfit"
                        name="Lợi nhuận gộp"
                        fill="#0f766e"
                        radius={[0, 6, 6, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                      <tr>
                        <th className="px-5 py-3 font-semibold">#</th>
                        <th className="px-5 py-3 font-semibold">
                          SKU & Tên sản phẩm
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          SL Bán
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          SL Trả
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Doanh thu thuần
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Giá vốn (COGS)
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Lợi nhuận gộp
                        </th>
                        <th className="px-5 py-3 text-right font-semibold">
                          Biên lãi gộp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedProducts.map((item, idx) => (
                        <tr key={item.skuCode} className="hover:bg-slate-50/80">
                          <td className="px-5 py-3.5 font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="px-5 py-3.5">
                            <CopyCodeBadge code={item.skuCode} variant="mono" />
                            <p className="mt-1 font-medium text-[#163d36]">
                              {item.productName}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-800">
                            {Number(item.unitsSold).toLocaleString("vi-VN")}
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums text-slate-400">
                            {Number(item.unitsReturned)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold tabular-nums text-[#163d36]">
                            {formatMoney(item.netSalesRevenue)}
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums text-slate-500">
                            {formatMoney(item.netCogsAmount)}
                          </td>
                          <td className="px-5 py-3.5 text-right font-bold tabular-nums text-[#147853]">
                            {formatMoney(item.grossProfit)}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="rounded-full bg-[#e6f5ee] px-2.5 py-0.5 text-xs font-bold tabular-nums text-[#147853]">
                              {item.grossMarginPct}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <section className="overflow-hidden rounded-xl border border-amber-200/80 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/50 px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-amber-950">
                    Danh mục SKU Tồn đọng vốn cần xả kho / tạo Combo khuyến mãi
                  </h3>
                  <p className="mt-0.5 text-xs text-amber-800/80">
                    Các mặt hàng còn tồn dương nhưng bán ≤ {maxUnitsSold} đơn vị
                    trong {daysWindow} ngày gần nhất.
                  </p>
                </div>
                <div className="rounded-xl bg-white px-3.5 py-2 text-right shadow-sm">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Tổng vốn giam trong tồn đọng
                  </span>
                  <b className="text-base tabular-nums text-amber-900">
                    {formatMoney(totalSlowCapital)}
                  </b>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">SKU / Sản phẩm</th>
                      <th className="px-5 py-3 font-semibold">Kho lưu trữ</th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Tồn thực tế
                      </th>
                      <th className="px-5 py-3 text-right font-semibold">
                        SL bán ({daysWindow} ngày)
                      </th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Giá vốn bình quân
                      </th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Giá trị vốn tồn đọng
                      </th>
                      <th className="px-5 py-3 font-semibold">
                        Ngày bán gần nhất
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {slowMovingRows.map((row) => (
                      <tr
                        key={`${row.warehouseId}-${row.skuCode}`}
                        className="hover:bg-amber-50/30"
                      >
                        <td className="px-5 py-3.5">
                          <CopyCodeBadge code={row.skuCode} variant="mono" />
                          <p className="mt-1 font-medium text-[#163d36]">
                            {row.productName}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-600">
                          {warehouseNameMap.get(row.warehouseId) ||
                            row.warehouseId}
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-800">
                          {Number(row.onHandQty).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-amber-900">
                            {Number(row.unitsSoldInWindow)} SP
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                          {formatMoney(row.avgUnitCost)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-bold tabular-nums text-amber-800">
                          {formatMoney(row.inventoryValuation)}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {row.lastSaleAt
                            ? new Date(row.lastSaleAt).toLocaleDateString(
                                "vi-VN"
                              )
                            : "Chưa phát sinh bán"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {slowMovingRows.length === 0 ? (
                  <p className="p-8 text-center text-xs text-slate-500">
                    Tuyệt vời! Không có SKU tồn đọng nào vượt ngưỡng lọc hiện tại.
                  </p>
                ) : null}
              </div>
            </section>
          )}
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* TAB 3: GIÁ TRỊ TỒN KHO (SNAPSHOT) & XUẤT NHẬP TỒN KỲ         */}
      {/* ============================================================ */}
      {tab === "inventory" ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiStatCard
              label="Tổng giá trị tài sản kho"
              value={formatMoney(valuationData.totals.totalValuation)}
              hint="Tính theo giá vốn bình quân gia quyền"
              icon={Warehouse}
              tone="emerald"
            />
            <KpiStatCard
              label="Giá trị hàng tại kho (On-Hand)"
              value={formatMoney(valuationData.totals.onHandValuation)}
              hint="Hàng vật lý đang nằm tại kệ"
              icon={Boxes}
              tone="sky"
            />
            <KpiStatCard
              label="Giá trị đang điều chuyển"
              value={formatMoney(valuationData.totals.inTransitValuation)}
              hint="Phiếu chuyển kho đang trên đường"
              icon={TrendingUp}
              tone="indigo"
            />
            <KpiStatCard
              label="Bút toán Xuất Nhập Tồn kỳ"
              value={`${movementRows.length} giao dịch`}
              hint="Ghi nhận bất biến từ sổ kho"
              icon={BarChart3}
              tone="amber"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Stacked Bar Valuation by Warehouse */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)] lg:col-span-6">
              <h2 className="text-base font-semibold text-[#163d36]">
                Phân bổ Giá trị Tồn kho theo Kho hàng (InventoryValueSnapshot)
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                So sánh vốn tồn tại chỗ và hàng đang luân chuyển nội bộ.
              </p>

              <div className="mt-4 h-[270px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={valuationData.warehouses}
                    margin={{ top: 10, right: 16, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="warehouseLabel"
                      tick={{ fontSize: 11, fill: "#475569" }}
                    />
                    <YAxis
                      tickFormatter={formatCompactVnd}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      formatter={(val: unknown, name: unknown) => [
                        formatMoney(Number(val ?? 0)),
                        String(name)
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar
                      dataKey="onHandValuation"
                      stackId="val"
                      name="Tồn tại kho"
                      fill="#16866f"
                    />
                    <Bar
                      dataKey="inTransitValuation"
                      stackId="val"
                      name="Đang điều chuyển"
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Warehouse Snapshot Table */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)] lg:col-span-6">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-[#163d36]">
                  Tổng hợp Tồn kho & Định giá theo Kho
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Kho hàng</th>
                      <th className="px-4 py-3 text-right">Số SKU</th>
                      <th className="px-4 py-3 text-right">SL Khả dụng</th>
                      <th className="px-4 py-3 text-right">Tổng giá trị vốn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {valuationData.warehouses.map((w) => (
                      <tr key={w.warehouseId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3.5 font-medium text-[#163d36]">
                          {w.warehouseLabel}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums text-slate-600">
                          {w.skuCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-800">
                          {Number(w.totalAvailableQty).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-[#147853]">
                          {formatMoney(w.totalValuation)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Period Stock Movements Ledger */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-[#163d36]">
                  Sổ Xuất Nhập Tồn trong kỳ ({appliedRange.from} →{" "}
                  {appliedRange.to})
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Theo dõi chi tiết lượng tăng/giảm tồn kho và biến động giá trị vốn.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "ALL", label: "Tất cả" },
                  { id: "RECEIPT", label: "Nhập mua" },
                  { id: "SALE", label: "Xuất bán" },
                  { id: "TRANSFER", label: "Điều chuyển" },
                  { id: "RETURN", label: "Nhập trả" },
                  { id: "ADJUST", label: "Kiểm kê" }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setMovementFilter(f.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      movementFilter === f.id
                        ? "bg-[#16866f] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Thời gian</th>
                    <th className="px-5 py-3 font-semibold">Nghiệp vụ</th>
                    <th className="px-5 py-3 font-semibold">Mã SKU</th>
                    <th className="px-5 py-3 font-semibold">Kho hàng</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Biến động SL
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Biến động Giá trị
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Tồn sau GD
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movementRows.map((mov) => {
                    const qty = Number(mov.qtyDelta ?? 0)
                    const val = Number(mov.valueDelta ?? 0)
                    return (
                      <tr key={mov.id} className="hover:bg-slate-50/80">
                        <td className="px-5 py-3 text-xs text-slate-500">
                          {new Date(mov.occurredAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                              qty >= 0
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {qty >= 0 ? (
                              <ArrowUpRight size={12} />
                            ) : (
                              <ArrowDownRight size={12} />
                            )}
                            {mov.movementType}
                          </span>
                          {mov.referenceId ? (
                            <span className="ml-2 font-mono text-[11px] text-slate-400">
                              #{mov.referenceId}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-3">
                          <CopyCodeBadge code={mov.skuCode} variant="mono" />
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-600">
                          {warehouseNameMap.get(mov.warehouseId) ||
                            mov.warehouseId}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-bold tabular-nums ${
                            qty >= 0 ? "text-[#147853]" : "text-rose-600"
                          }`}
                        >
                          {qty >= 0 ? `+${qty}` : qty}
                        </td>
                        <td
                          className={`px-5 py-3 text-right font-semibold tabular-nums ${
                            val >= 0 ? "text-[#147853]" : "text-rose-600"
                          }`}
                        >
                          {val >= 0
                            ? `+${formatMoney(val)}`
                            : `-${formatMoney(Math.abs(val))}`}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-700">
                          {Number(mov.onHandAfter).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {movementRows.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-500">
                  Không có giao dịch xuất nhập tồn nào trong kỳ này.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {/* ============================================================ */}
      {/* TAB 4: BÁO CÁO TÀI CHÍNH / LỢI NHUẬN GỘP (P&L)              */}
      {/* ============================================================ */}
      {tab === "finance" ? (
        <div className="space-y-6">
          {/* P&L Waterfall Strip */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KpiStatCard
              label="1. Doanh thu bán hàng gộp"
              value={formatMoney(financeData.grossSalesRevenue)}
              hint="Trước chiết khấu & trả hàng"
              icon={TrendingUp}
              tone="sky"
            />
            <KpiStatCard
              label="2. Trừ Chiết khấu & Trả hàng"
              value={`-${formatMoney(financeData.discountTotal + financeData.returnsAmount)}`}
              hint={`CK: ${formatMoney(financeData.discountTotal)} · Trả: ${formatMoney(financeData.returnsAmount)}`}
              icon={Percent}
              tone="rose"
            />
            <KpiStatCard
              label="3. Doanh thu thuần (Net Sales)"
              value={formatMoney(financeData.netSalesRevenue)}
              hint="Doanh thu thực ghi nhận"
              icon={Coins}
              tone="indigo"
            />
            <KpiStatCard
              label="4. Giá vốn hàng bán (COGS)"
              value={`-${formatMoney(financeData.netCogsAmount)}`}
              hint="Bình quân gia quyền thực xuất"
              icon={Boxes}
              tone="amber"
            />
            <KpiStatCard
              label="5. Lợi nhuận gộp & Biên lãi"
              value={formatMoney(financeData.grossProfit)}
              hint={
                <span className="font-semibold text-[#147853]">
                  Biên lãi gộp: {financeData.grossMarginPct}%
                  {financeData.isProfitProvisional ? " (Tạm tính)" : ""}
                </span>
              }
              icon={BarChart3}
              tone="emerald"
            />
          </div>

          {/* Composed Area + Line Chart: Daily Net Revenue vs Gross Profit */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-[#163d36]">
                  Xu hướng Doanh thu thuần & Lợi nhuận gộp theo ngày
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Giám sát tốc độ tăng trưởng lợi nhuận thực tế song song với lưu lượng đơn hàng.
                </p>
              </div>
              {financeData.isProfitProvisional ? (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                  Có {financeData.pendingCostLinesCount} dòng đơn đang chờ chốt giá vốn
                </span>
              ) : null}
            </div>

            <div className="mt-4 h-[310px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={trendSeries}
                  margin={{ top: 10, right: 20, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="netRevFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16866f" stopOpacity={0.26} />
                      <stop offset="95%" stopColor="#16866f" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortDate"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <YAxis
                    tickFormatter={formatCompactVnd}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                  />
                  <Tooltip
                    formatter={(val: unknown, name: unknown) => [
                      formatMoney(Number(val ?? 0)),
                      String(name)
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Area
                    type="monotone"
                    dataKey="netSalesRevenue"
                    name="Doanh thu thuần"
                    stroke="#16866f"
                    strokeWidth={2.5}
                    fill="url(#netRevFill)"
                  />
                  <Line
                    type="monotone"
                    dataKey="grossProfit"
                    name="Lợi nhuận gộp"
                    stroke="#0284c7"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Branch Profitability Breakdown Table */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_15px_rgba(20,50,45,0.04)]">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-[#163d36]">
                Báo cáo Kết quả Kinh doanh & Biên lợi nhuận gộp theo Chi nhánh
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="bg-[#fbfcfc] text-[10px] uppercase tracking-[0.12em] text-slate-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Chi nhánh</th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Đơn hoàn tất
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Doanh thu gộp
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Chiết khấu & Trả
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Doanh thu thuần
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Giá vốn (COGS)
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Lợi nhuận gộp
                    </th>
                    <th className="px-5 py-3 text-right font-semibold">
                      Gross Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financeData.branches.map((b) => (
                    <tr key={b.branchId} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-semibold text-[#163d36]">
                        {b.branchLabel}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">
                        {b.completedOrderCount.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                        {formatMoney(b.grossSalesRevenue)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-rose-600">
                        -{formatMoney(b.discountTotal + b.returnsAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums text-[#163d36]">
                        {formatMoney(b.netSalesRevenue)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-500">
                        {formatMoney(b.netCogsAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold tabular-nums text-[#147853]">
                        {formatMoney(b.grossProfit)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="rounded-full bg-[#e6f5ee] px-2.5 py-0.5 text-xs font-bold tabular-nums text-[#147853]">
                          {b.grossMarginPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
