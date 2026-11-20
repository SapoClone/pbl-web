import { gatewayClient } from "@/api/axios"

export type ChannelSalesReportItem = {
  channelType: string
  gmv: number
  grossSalesRevenue: number
  discountTotal: number
  returnsAmount: number
  netSalesRevenue: number
  grossProfit: number
  orderCount: number
  completedOrderCount: number
  cancelledOrderCount: number
  unitsSold: string | number
  aov: number | string
  revenueSharePct: string | number
}

export type ChannelSalesReportResponse = {
  period: { from: string; to: string }
  totalNetSalesRevenue: number
  data: ChannelSalesReportItem[]
}

export type RevenueTrendPoint = {
  bucket?: string
  date?: string
  dateBucket?: string
  gmv?: number
  grossSalesRevenue?: number
  discountTotal?: number
  returnsAmount?: number
  netSalesRevenue: number
  grossProfit: number
  orderCount: number
  completedOrderCount?: number
}

export type RevenueTrendResponse = {
  period: { from: string; to: string }
  granularity?: string
  series?: RevenueTrendPoint[]
  data?: RevenueTrendPoint[]
}

export type ProductSalesReportItem = {
  skuCode: string
  variantId?: string | null
  productId?: string | null
  productName: string
  categoryId?: string | null
  brandId?: string | null
  unitsSold: string | number
  unitsReturned: string | number
  grossSalesRevenue: number
  discountTotal: number
  returnsAmount: number
  netSalesRevenue: number
  cogsAmount?: number
  netCogsAmount: number
  grossProfit: number
  grossMarginPct: string | number
  orderCount: number
  isProfitProvisional?: boolean
}

export type ProductSalesReportResponse = {
  period: { from: string; to: string }
  data: ProductSalesReportItem[]
}

export type SlowMovingSkuItem = {
  warehouseId: string
  branchId?: string | null
  skuCode: string
  productName: string
  onHandQty: string | number
  availableQty: string | number
  avgUnitCost: number
  inventoryValuation: number
  unitsSoldInWindow: string | number
  daysWindow: number
  lastSaleAt?: string | null
}

export type SlowMovingReportResponse = {
  daysWindow: number
  maxUnitsSold: number
  data: SlowMovingSkuItem[]
}

export type WarehouseValuationItem = {
  warehouseId: string
  warehouseName?: string
  branchId?: string | null
  skuCount: number
  totalOnHandQty: string | number
  totalReservedQty: string | number
  totalAvailableQty: string | number
  totalInTransitQty: string | number
  onHandValuation: number
  inTransitValuation: number
  totalValuation: number
}

export type InventoryValuationResponse = {
  totals: {
    onHandValuation: number
    inTransitValuation: number
    totalValuation: number
  }
  warehouses: WarehouseValuationItem[]
}

export type InventoryMovementItem = {
  id: string
  date: string
  warehouseId: string
  branchId?: string | null
  skuCode: string
  movementType: string
  qtyDelta: string | number
  unitCost: number
  valueDelta: number
  onHandAfter: string | number
  referenceType?: string | null
  referenceId?: string | null
  occurredAt: string
}

export type InventoryMovementsResponse = {
  period: { from: string; to: string }
  data: InventoryMovementItem[]
}

export type BranchProfitabilityItem = {
  branchId: string
  branchName?: string
  gmv: number
  grossSalesRevenue: number
  discountTotal: number
  returnsAmount: number
  netSalesRevenue: number
  netCogsAmount: number
  grossProfit: number
  grossMarginPct: string | number
  orderCount: number
  completedOrderCount: number
  aov: number | string
}

export type GrossProfitSummaryResponse = {
  period: { from: string; to: string }
  summary: {
    grossSalesRevenue: number | string
    discountTotal: number | string
    returnsAmount: number | string
    netSalesRevenue: number | string
    grossProfit: number | string
    grossMarginPct: number | string
    isProfitProvisional?: boolean
    pendingCostLinesCount?: number
  }
  branches: BranchProfitabilityItem[]
}

export const getSalesByChannelReport = async (params: {
  from?: string
  to?: string
  branchId?: string
  channelType?: string
}): Promise<ChannelSalesReportResponse> => {
  const { data } = await gatewayClient.get<ChannelSalesReportResponse>(
    "/insight/api/v1/insight/reports/sales/by-channel",
    { params }
  )
  return data
}

export const getRevenueTrendReport = async (params: {
  from?: string
  to?: string
  granularity?: "DAY" | "WEEK" | "MONTH"
  branchId?: string
}): Promise<RevenueTrendPoint[]> => {
  const { data } = await gatewayClient.get<RevenueTrendResponse>(
    "/insight/api/v1/insight/dashboard/revenue-trend",
    { params }
  )
  return data.series ?? data.data ?? []
}

export const getSalesByProductReport = async (params: {
  from?: string
  to?: string
  branchId?: string
  skuCode?: string
  limit?: number
}): Promise<ProductSalesReportResponse> => {
  const { data } = await gatewayClient.get<ProductSalesReportResponse>(
    "/insight/api/v1/insight/reports/sales/by-product",
    { params: { limit: 50, ...params } }
  )
  return data
}

export const getSlowMovingInventoryReport = async (params: {
  daysWindow?: number
  maxUnitsSold?: number
  warehouseId?: string
  branchId?: string
  limit?: number
}): Promise<SlowMovingReportResponse> => {
  const { data } = await gatewayClient.get<SlowMovingReportResponse>(
    "/insight/api/v1/insight/reports/inventory/slow-moving",
    {
      params: {
        daysWindow: params.daysWindow ?? 30,
        maxUnitsSold: params.maxUnitsSold ?? 2,
        limit: params.limit ?? 50,
        ...(params.warehouseId ? { warehouseId: params.warehouseId } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {})
      }
    }
  )
  return data
}

export const getInventoryValuationReport = async (params?: {
  date?: string
  warehouseId?: string
  branchId?: string
}): Promise<InventoryValuationResponse> => {
  const { data } = await gatewayClient.get<InventoryValuationResponse>(
    "/insight/api/v1/insight/reports/inventory/valuation",
    { params }
  )
  return data
}

export const getInventoryMovementsReport = async (params: {
  from?: string
  to?: string
  warehouseId?: string
  branchId?: string
  skuCode?: string
  movementType?: string
  limit?: number
}): Promise<InventoryMovementsResponse> => {
  const { data } = await gatewayClient.get<InventoryMovementsResponse>(
    "/insight/api/v1/insight/reports/inventory/movements",
    { params: { limit: 60, ...params } }
  )
  return data
}

export const getGrossProfitSummaryReport = async (params: {
  from?: string
  to?: string
  branchId?: string
}): Promise<GrossProfitSummaryResponse> => {
  const { data } = await gatewayClient.get<GrossProfitSummaryResponse>(
    "/insight/api/v1/insight/reports/gross-profit",
    { params }
  )
  return data
}
