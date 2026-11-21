import type {
  BranchProfitabilityItem,
  ChannelSalesReportItem,
  InventoryMovementItem,
  InventoryValuationResponse,
  ProductSalesReportItem,
  RevenueTrendPoint,
  SlowMovingSkuItem
} from "@/api/insight/reports"

export const DEMO_REPORT_BRANCHES = [
  { id: "br-q1", name: "Cửa hàng Flagship Quận 1 (TP.HCM)" },
  { id: "br-hn", name: "Showroom Hoàn Kiếm (Hà Nội)" },
  { id: "br-dn", name: "Chi nhánh Hải Châu (Đà Nẵng)" }
]

export const DEMO_WAREHOUSE_NAMES: Record<string, string> = {
  "wh-central-hcm": "Kho Trung tâm Quận 7 (Fulfillment)",
  "wh-pos-q1": "Kho Cửa hàng Flagship Quận 1",
  "wh-north-hn": "Kho Miền Bắc — Long Biên"
}

function daysBetweenInclusive(from: string, to: string): string[] {
  const out: string[] = []
  const start = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [new Date().toISOString().slice(0, 10)]
  }
  const cursor = new Date(start)
  let guard = 0
  while (cursor <= end && guard < 92) {
    out.push(cursor.toISOString().slice(0, 10))
    cursor.setDate(cursor.getDate() + 1)
    guard += 1
  }
  return out
}

function branchMultiplier(branchId?: string): number {
  if (!branchId) return 1
  if (branchId === "br-q1") return 0.52
  if (branchId === "br-hn") return 0.31
  if (branchId === "br-dn") return 0.17
  return 0.45
}

export function buildDemoRevenueTrend(
  from: string,
  to: string,
  branchId?: string
): RevenueTrendPoint[] {
  const dates = daysBetweenInclusive(from, to)
  const mult = branchMultiplier(branchId)

  return dates.map((date, idx) => {
    const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
    const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.28 : 1
    const wave = 1 + ((idx * 7 + 3) % 5) * 0.08
    const gross = Math.round(14500000 * mult * weekendBoost * wave)
    const discount = Math.round(gross * 0.065)
    const returns = idx % 4 === 0 ? Math.round(gross * 0.025) : 0
    const net = gross - discount - returns
    const profit = Math.round(net * 0.385)
    const orders = Math.max(4, Math.round((net / 485000) * 1))

    return {
      date,
      bucket: date,
      gmv: gross,
      grossSalesRevenue: gross,
      discountTotal: discount,
      returnsAmount: returns,
      netSalesRevenue: net,
      grossProfit: profit,
      orderCount: orders,
      completedOrderCount: Math.max(3, orders - (idx % 5 === 0 ? 1 : 0))
    }
  })
}

export function buildDemoChannelBreakdown(
  trend: RevenueTrendPoint[]
): ChannelSalesReportItem[] {
  const totalNet = trend.reduce((s, d) => s + d.netSalesRevenue, 0) || 98000000
  const totalOrders = trend.reduce((s, d) => s + d.orderCount, 0) || 195

  const specs = [
    {
      channelType: "POS",
      share: 0.38,
      orderShare: 0.34,
      margin: 0.43,
      discountRate: 0.045,
      cancelRate: 0.01
    },
    {
      channelType: "LAZADA",
      share: 0.34,
      orderShare: 0.37,
      margin: 0.35,
      discountRate: 0.085,
      cancelRate: 0.04
    },
    {
      channelType: "SHOPEE",
      share: 0.19,
      orderShare: 0.21,
      margin: 0.33,
      discountRate: 0.09,
      cancelRate: 0.05
    },
    {
      channelType: "WEBSITE",
      share: 0.09,
      orderShare: 0.08,
      margin: 0.45,
      discountRate: 0.05,
      cancelRate: 0.02
    }
  ]

  return specs.map((sp) => {
    const net = Math.round(totalNet * sp.share)
    const discount = Math.round(net * sp.discountRate)
    const returns = Math.round(net * 0.018)
    const gross = net + discount + returns
    const orders = Math.max(2, Math.round(totalOrders * sp.orderShare))
    const cancelled = Math.floor(orders * sp.cancelRate)
    const completed = Math.max(1, orders - cancelled)
    const profit = Math.round(net * sp.margin)

    return {
      channelType: sp.channelType,
      gmv: gross,
      grossSalesRevenue: gross,
      discountTotal: discount,
      returnsAmount: returns,
      netSalesRevenue: net,
      grossProfit: profit,
      orderCount: orders,
      completedOrderCount: completed,
      cancelledOrderCount: cancelled,
      unitsSold: Math.round(completed * 2.1),
      aov: Math.round(net / completed),
      revenueSharePct: (sp.share * 100).toFixed(1)
    }
  })
}

export function buildDemoProductSales(
  branchId?: string
): ProductSalesReportItem[] {
  const mult = branchMultiplier(branchId)
  const items = [
    {
      skuCode: "TERRA-500-GRN",
      productName: "Bình giữ nhiệt Terra 500ml Xanh Rừng",
      units: 148,
      price: 495000,
      cost: 275000
    },
    {
      skuCode: "COMBO-TRA-THU",
      productName: "Combo Quà Trà Ô Long & Bình Terra 500ml",
      units: 74,
      price: 890000,
      cost: 510000
    },
    {
      skuCode: "TEA-OOLONG-250",
      productName: "Trà Ô Long Thượng Hạng Mộc Châu 250g",
      units: 192,
      price: 285000,
      cost: 148000
    },
    {
      skuCode: "CERAMIC-SET-04",
      productName: "Bộ ấm chén gốm Bát Tràng men mộc 6 món",
      units: 52,
      price: 780000,
      cost: 430000
    },
    {
      skuCode: "BAMBOO-TRAY-L",
      productName: "Khay trà tre ép thủ công chống nước cỡ L",
      units: 86,
      price: 360000,
      cost: 205000
    },
    {
      skuCode: "MATCHA-UJI-100",
      productName: "Bột Matcha Uji Ceremonial lon thiếc 100g",
      units: 110,
      price: 340000,
      cost: 215000
    },
    {
      skuCode: "GLASS-INFUSER-350",
      productName: "Bình ủ trà thủy tinh hai lớp lõi Inox 304",
      units: 95,
      price: 245000,
      cost: 138000
    },
    {
      skuCode: "LINEN-TOTE-ECO",
      productName: "Túi vải Linen thêu tay Mộc Store phiên bản giới hạn",
      units: 134,
      price: 165000,
      cost: 79000
    }
  ]

  return items.map((it, idx) => {
    const units = Math.max(4, Math.round(it.units * mult))
    const returned = idx % 3 === 0 ? Math.max(0, Math.round(units * 0.02)) : 0
    const gross = units * it.price
    const discount = Math.round(gross * 0.055)
    const returnsAmt = returned * it.price
    const net = gross - discount - returnsAmt
    const netCogs = (units - returned) * it.cost
    const profit = net - netCogs
    const margin = net > 0 ? ((profit / net) * 100).toFixed(1) : "0.0"

    return {
      skuCode: it.skuCode,
      productName: it.productName,
      unitsSold: units,
      unitsReturned: returned,
      grossSalesRevenue: gross,
      discountTotal: discount,
      returnsAmount: returnsAmt,
      netSalesRevenue: net,
      netCogsAmount: netCogs,
      grossProfit: profit,
      grossMarginPct: margin,
      orderCount: Math.max(3, Math.round(units * 0.68)),
      isProfitProvisional: false
    }
  })
}

export function buildDemoSlowMovingSkus(
  daysWindow: number,
  maxUnitsSold: number
): SlowMovingSkuItem[] {
  const raw: SlowMovingSkuItem[] = [
    {
      warehouseId: "wh-central-hcm",
      skuCode: "WINTER-GIFT-2025",
      productName: "Hộp quà Gỗ Thông Khắc Laser Mùa Đông",
      onHandQty: 46,
      availableQty: 46,
      avgUnitCost: 380000,
      inventoryValuation: 17480000,
      unitsSoldInWindow: 0,
      daysWindow,
      lastSaleAt: "2026-08-19T10:20:00.000Z"
    },
    {
      warehouseId: "wh-central-hcm",
      skuCode: "CAST-IRON-POT-900",
      productName: "Ấm gang đúc thủ công Nhật Bản 900ml",
      onHandQty: 14,
      availableQty: 14,
      avgUnitCost: 1150000,
      inventoryValuation: 16100000,
      unitsSoldInWindow: 1,
      daysWindow,
      lastSaleAt: "2026-09-28T15:00:00.000Z"
    },
    {
      warehouseId: "wh-north-hn",
      skuCode: "COPPER-CANISTER-S",
      productName: "Hũ đựng trà đồng đỏ gò tay cỡ nhỏ",
      onHandQty: 28,
      availableQty: 26,
      avgUnitCost: 420000,
      inventoryValuation: 11760000,
      unitsSoldInWindow: 2,
      daysWindow,
      lastSaleAt: "2026-10-04T11:45:00.000Z"
    },
    {
      warehouseId: "wh-pos-q1",
      skuCode: "SILK-WRAP-GOLD",
      productName: "Khăn lụa gói quà Furoshiki Vàng Hoàng Kim",
      onHandQty: 65,
      availableQty: 65,
      avgUnitCost: 125000,
      inventoryValuation: 8125000,
      unitsSoldInWindow: 0,
      daysWindow,
      lastSaleAt: "2026-08-02T09:15:00.000Z"
    },
    {
      warehouseId: "wh-north-hn",
      skuCode: "PORCELAIN-TRAY-WHT",
      productName: "Đĩa sứ trắng kê ấm tối giản kiểu Nhật",
      onHandQty: 38,
      availableQty: 38,
      avgUnitCost: 160000,
      inventoryValuation: 6080000,
      unitsSoldInWindow: 3,
      daysWindow,
      lastSaleAt: "2026-10-18T16:30:00.000Z"
    }
  ]

  return raw.filter((item) => Number(item.unitsSoldInWindow) <= maxUnitsSold)
}

export function buildDemoInventoryValuation(
  branchId?: string
): InventoryValuationResponse {
  const allWarehouses = [
    {
      warehouseId: "wh-central-hcm",
      warehouseName: "Kho Trung tâm Quận 7 (Fulfillment)",
      branchId: "br-q1",
      skuCount: 64,
      totalOnHandQty: 1840,
      totalReservedQty: 92,
      totalAvailableQty: 1748,
      totalInTransitQty: 120,
      onHandValuation: 412500000,
      inTransitValuation: 28400000,
      totalValuation: 440900000
    },
    {
      warehouseId: "wh-pos-q1",
      warehouseName: "Kho Cửa hàng Flagship Quận 1",
      branchId: "br-q1",
      skuCount: 48,
      totalOnHandQty: 620,
      totalReservedQty: 18,
      totalAvailableQty: 602,
      totalInTransitQty: 35,
      onHandValuation: 148200000,
      inTransitValuation: 9600000,
      totalValuation: 157800000
    },
    {
      warehouseId: "wh-north-hn",
      warehouseName: "Kho Miền Bắc — Hoàn Kiếm & Long Biên",
      branchId: "br-hn",
      skuCount: 52,
      totalOnHandQty: 980,
      totalReservedQty: 44,
      totalAvailableQty: 936,
      totalInTransitQty: 60,
      onHandValuation: 226800000,
      inTransitValuation: 15200000,
      totalValuation: 242000000
    }
  ]

  const warehouses = branchId
    ? allWarehouses.filter((w) => w.branchId === branchId)
    : allWarehouses

  const effective = warehouses.length > 0 ? warehouses : allWarehouses
  const onHandValuation = effective.reduce((s, w) => s + w.onHandValuation, 0)
  const inTransitValuation = effective.reduce(
    (s, w) => s + w.inTransitValuation,
    0
  )

  return {
    totals: {
      onHandValuation,
      inTransitValuation,
      totalValuation: onHandValuation + inTransitValuation
    },
    warehouses: effective
  }
}

export function buildDemoInventoryMovements(): InventoryMovementItem[] {
  return [
    {
      id: "mov-01",
      date: "2026-11-18",
      warehouseId: "wh-central-hcm",
      skuCode: "TERRA-500-GRN",
      movementType: "RECEIPT",
      qtyDelta: 120,
      unitCost: 275000,
      valueDelta: 33000000,
      onHandAfter: 340,
      referenceType: "PURCHASE_RECEIPT",
      referenceId: "GRN-202611-0048",
      occurredAt: "2026-11-18T09:15:00.000Z"
    },
    {
      id: "mov-02",
      date: "2026-11-18",
      warehouseId: "wh-central-hcm",
      skuCode: "TERRA-500-GRN",
      movementType: "SALE",
      qtyDelta: -18,
      unitCost: 275000,
      valueDelta: -4950000,
      onHandAfter: 322,
      referenceType: "LAZADA_ORDER_BATCH",
      referenceId: "SO-LZD-889920",
      occurredAt: "2026-11-18T13:40:00.000Z"
    },
    {
      id: "mov-03",
      date: "2026-11-17",
      warehouseId: "wh-pos-q1",
      skuCode: "TEA-OOLONG-250",
      movementType: "TRANSFER_IN",
      qtyDelta: 40,
      unitCost: 148000,
      valueDelta: 5920000,
      onHandAfter: 95,
      referenceType: "STOCK_TRANSFER",
      referenceId: "TRF-202611-0019",
      occurredAt: "2026-11-17T16:10:00.000Z"
    },
    {
      id: "mov-04",
      date: "2026-11-17",
      warehouseId: "wh-north-hn",
      skuCode: "CERAMIC-SET-04",
      movementType: "SALE",
      qtyDelta: -6,
      unitCost: 430000,
      valueDelta: -2580000,
      onHandAfter: 24,
      referenceType: "POS_ORDER",
      referenceId: "SO-202611-0188",
      occurredAt: "2026-11-17T11:25:00.000Z"
    },
    {
      id: "mov-05",
      date: "2026-11-16",
      warehouseId: "wh-central-hcm",
      skuCode: "MATCHA-UJI-100",
      movementType: "RETURN",
      qtyDelta: 3,
      unitCost: 215000,
      valueDelta: 645000,
      onHandAfter: 78,
      referenceType: "SALES_RETURN",
      referenceId: "SRN-202611-0007",
      occurredAt: "2026-11-16T15:05:00.000Z"
    },
    {
      id: "mov-06",
      date: "2026-11-15",
      warehouseId: "wh-pos-q1",
      skuCode: "SILK-WRAP-GOLD",
      movementType: "ADJUSTMENT",
      qtyDelta: -2,
      unitCost: 125000,
      valueDelta: -250000,
      onHandAfter: 65,
      referenceType: "STOCK_COUNT",
      referenceId: "ADJ-202611-0004",
      occurredAt: "2026-11-15T18:30:00.000Z"
    }
  ]
}

export function buildDemoBranchProfitability(
  trend: RevenueTrendPoint[]
): BranchProfitabilityItem[] {
  const totalNet = trend.reduce((s, d) => s + d.netSalesRevenue, 0) || 98000000
  const totalOrders = trend.reduce((s, d) => s + d.orderCount, 0) || 195

  const rows = [
    {
      branchId: "br-q1",
      branchName: "Cửa hàng Flagship Quận 1 (TP.HCM)",
      share: 0.52,
      margin: 0.41
    },
    {
      branchId: "br-hn",
      branchName: "Showroom Hoàn Kiếm (Hà Nội)",
      share: 0.31,
      margin: 0.375
    },
    {
      branchId: "br-dn",
      branchName: "Chi nhánh Hải Châu (Đà Nẵng)",
      share: 0.17,
      margin: 0.36
    }
  ]

  return rows.map((r) => {
    const net = Math.round(totalNet * r.share)
    const discount = Math.round(net * 0.06)
    const returns = Math.round(net * 0.015)
    const gross = net + discount + returns
    const profit = Math.round(net * r.margin)
    const cogs = net - profit
    const orders = Math.max(5, Math.round(totalOrders * r.share))

    return {
      branchId: r.branchId,
      branchName: r.branchName,
      gmv: gross,
      grossSalesRevenue: gross,
      discountTotal: discount,
      returnsAmount: returns,
      netSalesRevenue: net,
      netCogsAmount: cogs,
      grossProfit: profit,
      grossMarginPct: (r.margin * 100).toFixed(1),
      orderCount: orders,
      completedOrderCount: Math.max(4, orders - 1),
      aov: Math.round(net / Math.max(1, orders - 1))
    }
  })
}
