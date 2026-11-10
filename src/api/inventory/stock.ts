import { gatewayClient } from "@/api/axios"

const INVENTORY = "/inventory/api/v1"

export type Warehouse = { id: string; branchId: string | null; code: string; name: string; kind: "BRANCH" | "CENTRAL" | "QUARANTINE"; address: string | null; isDefault: boolean; status: "ACTIVE" | "INACTIVE"; createdAt: string; updatedAt: string }
export type StockLevel = { branchId: string; variantId: string; sku: string | null; name: string | null; variantLabel: string | null; barcode: string | null; onHand: number; reserved: number; available: number; minQuantity: number | null; maxQuantity: number | null; level: "ok" | "below_min" | "out_of_stock" }
export type StockSummary = { branchId: string | null; skuCount: number; onHand: number; reserved: number; available: number; belowMinCount: number; outOfStockCount: number; stockValue: number }
export type InventoryLine = { id?: string; lineNo?: number; skuId: string; qty?: string; unitCost?: number; transferQty?: string; dispatchedQty?: string; receivedQty?: string; discrepancyQty?: string; inTransitRemainingQty?: string; snapshotOnHandQty?: string; snapshotReservedQty?: string; countedQty?: string | null; varianceQty?: string | null; reason?: string | null }
export type StockReceipt = { id: string; code: string; warehouseId: string; sourceType: string; status: string; note: string | null; createdAt: string; postedAt: string | null; items: InventoryLine[] }
export type StockIssue = { id: string; code: string; warehouseId: string; reasonCode: string; status: string; note: string | null; createdAt: string; postedAt: string | null; items: InventoryLine[] }
export type StockTransfer = { id: string; code: string; fromWarehouseId: string; toWarehouseId: string; status: string; note: string | null; createdAt: string; dispatchedAt: string | null; receivedAt: string | null; overdue?: boolean; items: InventoryLine[] }
export type Stocktake = { id: string; code: string; warehouseId: string; status: string; note: string | null; createdAt: string; approvedAt: string | null; items: InventoryLine[] }
export type Page<T> = { data: T[]; pagination: { currentPage: number; totalPages: number; totalRecords: number; limit?: number; nextPage?: number } }
export type WarehouseStock = { id: string; warehouseId: string; warehouseCode: string; warehouseName: string; skuId: string; onHandQty: string; reservedQty: string; availableQty: string; inTransitQty: string; avgUnitCost: number; valuationAmount: number; version: number; minQty: string | null; maxQty: string | null; belowThreshold: boolean; updatedAt: string }
export type SkuStock = { skuId: string; totalOnHandQty: string; totalReservedQty: string; totalAvailableQty: string; totalInTransitQty: string; totalValuationAmount: number; warehouses: WarehouseStock[] }
export type StockMovement = { id: string; warehouseId: string; skuId: string; movementType: string; qtyBefore: string; qtyDelta: string; onHandAfter: string; reservedAfter: string; unitCost: number; avgCostAfter: number; referenceType: string | null; referenceId: string | null; reason: string | null; occurredAt: string; createdAt: string }
export type StockThreshold = { id: string; warehouseId: string; skuId: string; minQty: string; maxQty: string | null; onHandQty: string; reservedQty: string; availableQty: string; isAlert: boolean; updatedAt: string }
export type StockLookup = { variantId: string; sku: string; barcode: string | null; name: string; variantLabel: string | null; price: number | null; onHand: number; reserved: number; available: number }
export type LedgerRefType = "receipt" | "issue" | "transfer_out" | "transfer_in" | "stock_take" | "sale" | "sale_shortfall" | "reservation_release"
export type LedgerEntry = { id: string; branchId: string | null; variantId: string; sku: string | null; changeQty: number; balanceAfter: number; refType: LedgerRefType; refId: string | null; refCode: string | null; actor: { id: string; name: string | null } | null; createdAt: string }
export type ReconciliationReport = { checkedAt: string; checkedBalancesCount: number; consistent: boolean; mismatchesCount: number; mismatches: Array<{ warehouseId: string; skuId: string; kind: "ON_HAND_VS_LEDGER" | "RESERVED_VS_HELD_LINES" | "IN_TRANSIT_VS_TRANSFERS"; balanceValue: string; expectedValue: string; delta: string }> }
const idempotency = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } })

export const listStockLevels = async (branchId?: string) => {
  const { data } = await gatewayClient.get<Page<StockLevel>>(`${INVENTORY}/stock-levels`, { params: { page: 1, limit: 100, sort: "name", order: "asc", ...(branchId ? { branchId } : {}) } })
  return data
}
export const listStock = listStockLevels
export const getStockSummary = async (branchId?: string) => (await gatewayClient.get<StockSummary>(`${INVENTORY}/stock/summary`, { params: branchId ? { branchId } : undefined })).data
export const listWarehouses = async (branchId?: string) => (await gatewayClient.get<Warehouse[]>(`${INVENTORY}/warehouses`, { params: branchId ? { branchId } : undefined })).data
export const createWarehouse = async (input: { code: string; name: string; kind: Warehouse["kind"]; branchId?: string | null; isDefault?: boolean; address?: string }) => (await gatewayClient.post<Warehouse>(`${INVENTORY}/warehouses`, input)).data
export const getWarehouse = async (id: string) => (await gatewayClient.get<Warehouse>(`${INVENTORY}/warehouses/${id}`)).data
export const updateWarehouse = async (id: string, input: Partial<Pick<Warehouse, "name" | "kind" | "branchId" | "isDefault" | "address" | "status">>) => (await gatewayClient.patch<Warehouse>(`${INVENTORY}/warehouses/${id}`, input)).data

export const listStockReceipts = async (warehouseId?: string) => (await gatewayClient.get<StockReceipt[]>(`${INVENTORY}/stock-receipts`, { params: warehouseId ? { warehouseId } : undefined })).data
export const getStockReceipt = async (id: string) => (await gatewayClient.get<StockReceipt>(`${INVENTORY}/stock-receipts/${id}`)).data
export type StockReceiptInput = { warehouseId: string; note?: string; autoPost?: boolean; items: Array<{ skuId: string; qty: string; unitCost?: number }> }
export const createStockReceipt = async (input: StockReceiptInput) => (await gatewayClient.post<StockReceipt>(`${INVENTORY}/stock-receipts`, input, idempotency())).data
export const receiveStock = async (input: StockReceiptInput | { branchId: string; items: Array<{ sku: string; quantity: number }> }) => {
  if ("warehouseId" in input) return createStockReceipt(input)
  const [branchWarehouses, lines] = await Promise.all([
    listWarehouses(input.branchId),
    Promise.all(input.items.map(async (item) => {
      const { data } = await gatewayClient.get<{ variant: { id: string } }>("/catalog/api/v1/products/lookup", { params: { sku: item.sku } })
      return { skuId: data.variant.id, qty: item.quantity.toFixed(3) }
    }))
  ])
  const warehouse = branchWarehouses.find((item) => item.isDefault) ?? branchWarehouses[0]
  if (!warehouse) throw new Error("Chi nhánh chưa có kho hoạt động")
  return createStockReceipt({ warehouseId: warehouse.id, autoPost: true, items: lines })
}
export const postStockReceipt = async (id: string) => (await gatewayClient.post<StockReceipt>(`${INVENTORY}/stock-receipts/${id}/post`, undefined, idempotency())).data
export const submitStockReceipt = async (id: string) => (await gatewayClient.post<StockReceipt>(`${INVENTORY}/stock-receipts/${id}/submit`)).data
export const approveStockReceipt = async (id: string) => (await gatewayClient.post<StockReceipt>(`${INVENTORY}/stock-receipts/${id}/approve`, undefined, idempotency())).data
export const rejectStockReceipt = async (id: string, reason?: string) => (await gatewayClient.post<StockReceipt>(`${INVENTORY}/stock-receipts/${id}/reject`, { reason })).data
export const cancelStockReceipt = async (id: string) => (await gatewayClient.post<StockReceipt>(`${INVENTORY}/stock-receipts/${id}/cancel`)).data

export const listStockIssues = async (warehouseId?: string) => (await gatewayClient.get<StockIssue[]>(`${INVENTORY}/stock-issues`, { params: warehouseId ? { warehouseId } : undefined })).data
export const getStockIssue = async (id: string) => (await gatewayClient.get<StockIssue>(`${INVENTORY}/stock-issues/${id}`)).data
export const createStockIssue = async (input: { warehouseId: string; reasonCode: "MANUAL_WITHDRAWAL" | "DAMAGED" | "DISPOSAL" | "SAMPLE" | "SUPPLIER_RETURN"; note?: string; autoPost?: boolean; items: Array<{ skuId: string; qty: string }> }) => (await gatewayClient.post<StockIssue>(`${INVENTORY}/stock-issues`, input, idempotency())).data
export const postStockIssue = async (id: string) => (await gatewayClient.post<StockIssue>(`${INVENTORY}/stock-issues/${id}/post`, undefined, idempotency())).data
export const cancelStockIssue = async (id: string) => (await gatewayClient.post<StockIssue>(`${INVENTORY}/stock-issues/${id}/cancel`)).data

export const listStockTransfers = async (warehouseId?: string) => (await gatewayClient.get<StockTransfer[]>(`${INVENTORY}/stock-transfers`, { params: warehouseId ? { warehouseId } : undefined })).data
export const getStockTransfer = async (id: string) => (await gatewayClient.get<StockTransfer>(`${INVENTORY}/stock-transfers/${id}`)).data
export const createStockTransfer = async (input: { fromWarehouseId: string; toWarehouseId: string; note?: string; items: Array<{ skuId: string; qty: string }> }) => (await gatewayClient.post<StockTransfer>(`${INVENTORY}/stock-transfers`, input)).data
export const dispatchStockTransfer = async (id: string) => (await gatewayClient.post<StockTransfer>(`${INVENTORY}/stock-transfers/${id}/dispatch`)).data
export type ReceiveTransferInput = { items?: Array<{ skuId: string; receivedQty: string; discrepancyQty?: string; discrepancyReason?: string }>; resolveDiscrepancy?: boolean }
export const receiveStockTransfer = async (id: string, input: ReceiveTransferInput = {}) => (await gatewayClient.post<StockTransfer>(`${INVENTORY}/stock-transfers/${id}/receive`, input)).data
export const cancelStockTransfer = async (id: string) => (await gatewayClient.post<StockTransfer>(`${INVENTORY}/stock-transfers/${id}/cancel`, {})).data

export const listStocktakes = async (warehouseId?: string) => (await gatewayClient.get<Stocktake[]>(`${INVENTORY}/stocktakes`, { params: warehouseId ? { warehouseId } : undefined })).data
export const getStocktake = async (id: string) => (await gatewayClient.get<Stocktake>(`${INVENTORY}/stocktakes/${id}`)).data
export const createStocktake = async (input: { warehouseId: string; note?: string; skuIds?: string[] }) => (await gatewayClient.post<Stocktake>(`${INVENTORY}/stocktakes`, input)).data
export const recordStocktakeCounts = async (id: string, counts: Array<{ skuId: string; countedQty: string; reason?: string }>) => (await gatewayClient.post<Stocktake>(`${INVENTORY}/stocktakes/${id}/counts`, { counts })).data
export const approveStocktake = async (id: string) => (await gatewayClient.post<Stocktake>(`${INVENTORY}/stocktakes/${id}/approve`, {})).data
export const cancelStocktake = async (id: string) => (await gatewayClient.post<Stocktake>(`${INVENTORY}/stocktakes/${id}/cancel`)).data

export const listWarehouseStocks = async (warehouseId?: string) => (await gatewayClient.get<Page<WarehouseStock>>(`${INVENTORY}/stocks`, { params: { page: 1, limit: 100, ...(warehouseId ? { warehouseId } : {}) } })).data
export const getStockBySku = async (skuId: string) => (await gatewayClient.get<SkuStock>(`${INVENTORY}/stocks/${skuId}`)).data
export const listStockMovements = async (warehouseId?: string, skuId?: string) => (await gatewayClient.get<Page<StockMovement>>(`${INVENTORY}/stock-movements`, { params: { page: 1, limit: 100, ...(warehouseId ? { warehouseId } : {}), ...(skuId ? { skuId } : {}) } })).data
export const listStockThresholds = async (warehouseId?: string, onlyAlerts = false) => (await gatewayClient.get<StockThreshold[]>(`${INVENTORY}/stock-thresholds`, { params: { ...(warehouseId ? { warehouseId } : {}), ...(onlyAlerts ? { onlyAlerts: "true" } : {}) } })).data
export const upsertStockThreshold = async (input: { warehouseId: string; skuId: string; minQty: string; maxQty?: string | null }) => (await gatewayClient.put<StockThreshold>(`${INVENTORY}/stock-thresholds`, input)).data
export const lookupStock = async (branchId: string, code: string) => (await gatewayClient.get<StockLookup>(`${INVENTORY}/stock/lookup`, { params: { branchId, code } })).data
export const listLedgerEntries = async (params: { branchId?: string; variantId?: string; refType?: LedgerRefType; from?: string; to?: string } = {}) => (await gatewayClient.get<Page<LedgerEntry>>(`${INVENTORY}/ledger-entries`, { params: { page: 1, limit: 100, ...params } })).data
export const upsertBranchStockThreshold = async (input: { branchId: string; variantId: string; minQuantity: number; maxQuantity?: number | null }) => (await gatewayClient.post<StockThreshold>(`${INVENTORY}/stock-thresholds`, input)).data
export const exportStock = async (branchId?: string) => (await gatewayClient.get<Blob>(`${INVENTORY}/stock/export`, { params: branchId ? { branchId } : undefined, responseType: "blob" })).data
export const reconcileStocks = async () => (await gatewayClient.post<ReconciliationReport>(`${INVENTORY}/stocks/reconcile`)).data
