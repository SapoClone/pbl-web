import { gatewayClient } from "@/api/axios"

const INVENTORY = "/inventory/api/v1"
const idempotency = () => ({ headers: { "Idempotency-Key": crypto.randomUUID() } })

export type Supplier = { id: string; code: string; name: string; phone: string | null; email: string | null; address: string | null; taxCode?: string | null; note?: string | null; status: "ACTIVE" | "INACTIVE"; createdAt: string; updatedAt: string }
export type PurchaseOrderLine = { id: string; lineNo: number; skuId: string; orderedQty: string; receivedQty: string; remainingQty: string; unitCost: number; unitName: string; conversionFactor: string }
export type PurchaseOrder = { id: string; code: string; supplierId: string; warehouseId: string; status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED"; totalAmount: number; expectedDate: string | null; note: string | null; approvedAt: string | null; createdAt: string; updatedAt: string; items: PurchaseOrderLine[] }
export type Page<T> = { data: T[]; pagination: { currentPage: number; totalPages: number; totalRecords: number; limit: number; nextPage?: number } }
export type SupplierDirectoryItem = Pick<Supplier, "id" | "code" | "name" | "phone"> & { openPurchaseOrderCount: number; debtBalance: number }
export type PurchaseOrderDirectoryItem = { id: string; code: string; createdAt: string; supplier: { id: string; name: string }; branchId: string | null; quantityOrdered: number; quantityReceived: number; totalAmount: number; remainingAmount: number; status: Lowercase<PurchaseOrder["status"]>; expectedDate: string | null }
export type PurchaseOrderSummary = { openCount: number; partiallyReceivedCount: number; awaitingDeliveryCount: number; dueThisWeekCount: number; payableAmount: number }

export const listSuppliers = async (q?: string) => (await gatewayClient.get<Supplier[]>(`${INVENTORY}/suppliers`, { params: q ? { q } : undefined })).data
export const listSupplierDirectory = async (q?: string) => (await gatewayClient.get<Page<SupplierDirectoryItem>>(`${INVENTORY}/suppliers/directory`, { params: { page: 1, limit: 100, ...(q ? { q } : {}) } })).data
export const getSupplier = async (id: string) => (await gatewayClient.get<Supplier>(`${INVENTORY}/suppliers/${id}`)).data
export const createSupplier = async (input: { code: string; name: string; phone?: string; email?: string; address?: string; taxCode?: string; note?: string }) => (await gatewayClient.post<Supplier>(`${INVENTORY}/suppliers`, input)).data
export const updateSupplier = async (id: string, input: Partial<Pick<Supplier, "name" | "phone" | "email" | "address" | "taxCode" | "note" | "status">>) => (await gatewayClient.patch<Supplier>(`${INVENTORY}/suppliers/${id}`, input)).data
export const deleteSupplier = async (id: string) => gatewayClient.delete(`${INVENTORY}/suppliers/${id}`)

export const listPurchaseOrders = async (supplierId?: string, status?: string) => (await gatewayClient.get<PurchaseOrder[]>(`${INVENTORY}/purchase-orders`, { params: { ...(supplierId ? { supplierId } : {}), ...(status ? { status } : {}) } })).data
export const listPurchaseOrderDirectory = async (params: { q?: string; status?: string; supplierId?: string; branchId?: string } = {}) => (await gatewayClient.get<Page<PurchaseOrderDirectoryItem>>(`${INVENTORY}/purchase-orders/directory`, { params: { page: 1, limit: 100, ...params } })).data
export const getPurchaseOrderSummary = async (branchId?: string) => (await gatewayClient.get<PurchaseOrderSummary>(`${INVENTORY}/purchase-orders/summary`, { params: branchId ? { branchId } : undefined })).data
export const exportPurchaseOrders = async (params: { q?: string; status?: string; supplierId?: string; branchId?: string } = {}) => (await gatewayClient.get<Blob>(`${INVENTORY}/purchase-orders/export`, { params, responseType: "blob" })).data
export const getPurchaseOrder = async (id: string) => (await gatewayClient.get<PurchaseOrder>(`${INVENTORY}/purchase-orders/${id}`)).data
export const createPurchaseOrder = async (input: { supplierId: string; warehouseId: string; code?: string; expectedDate?: string; note?: string; items: Array<{ skuId: string; orderedQty: string; unitCost: number; unitName?: string; conversionFactor?: string }> }) => (await gatewayClient.post<PurchaseOrder>(`${INVENTORY}/purchase-orders`, input)).data
export const approvePurchaseOrder = async (id: string) => (await gatewayClient.post<PurchaseOrder>(`${INVENTORY}/purchase-orders/${id}/approve`)).data
export const receivePurchaseOrder = async (id: string, input?: { items?: Array<{ skuId: string; qty: string; unitCost?: number }>; note?: string }) => (await gatewayClient.post<PurchaseOrder>(`${INVENTORY}/purchase-orders/${id}/receive`, input ?? {}, idempotency())).data
export const cancelPurchaseOrder = async (id: string, reason?: string) => (await gatewayClient.post<PurchaseOrder>(`${INVENTORY}/purchase-orders/${id}/cancel`, { reason })).data
