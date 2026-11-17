import { gatewayClient } from "@/api/axios"

const API = "/customer/api/v1"

export type CustomerGroup = {
  id: string
  code: string
  name: string
  description: string | null
  defaultDiscountRate: string | number
  status: "ACTIVE" | "INACTIVE"
  isSeeded: boolean
  customerCount: number
}

export type CustomerTag = { id: string; name: string }
export type CustomerOrder = {
  id: string
  orderId: string
  orderCode: string
  branchId: string | null
  channelType: string
  orderStatus: string
  originalOrderTotal: number
  eligibleNetSpend: number
  returnedAmount: number
  earnedPoints: number
  reversedPoints: number
  completedAt: string
}

export type CustomerOrdersResponse = { customerId: string; items: CustomerOrder[]; total: number; page: number; limit: number }
export type LoyaltyAccount = {
  id: string
  postedPointsBalance: number
  heldPoints: number
  availablePoints: number
  pointsDebt: number
  qualifyingPoints: number
  lifetimeEarnedPoints: number
  lifetimeRedeemedPoints: number
  status: string
}
export type LoyaltyTransaction = {
  id: string
  type: string
  points: number
  orderId: string | null
  orderCode: string | null
  balanceAfter: number
  reason: string | null
  createdAt: string
}
export type LoyaltyTransactionsResponse = {
  data: LoyaltyTransaction[]
  pagination: { currentPage: number; totalPages: number; totalRecords: number; nextPage: number | null }
}
export type DuplicateGroup = { matchType: string; matchValue: string; customerIds: string[]; count: number }
export type DuplicateResponse = { items: DuplicateGroup[]; total: number }
export type ImportResult = { total: number; created: number; updated: number; failed: number; errors: Array<{ row: number; field: string; code: string }> }

export const listCustomerGroups = async () => (await gatewayClient.get<CustomerGroup[]>(`${API}/customer-groups`)).data
export const createCustomerGroup = async (input: { name: string; description?: string; defaultDiscountRate?: number }) =>
  (await gatewayClient.post<CustomerGroup>(`${API}/customer-groups`, input)).data
export const updateCustomerGroup = async (id: string, input: { name?: string; description?: string; defaultDiscountRate?: number; status?: "ACTIVE" | "INACTIVE"; forceDeactivate?: boolean }) =>
  (await gatewayClient.patch<CustomerGroup>(`${API}/customer-groups/${id}`, input)).data
export const deleteCustomerGroup = async (id: string) => gatewayClient.delete(`${API}/customer-groups/${id}`)
export const assignCustomerGroup = async (customerId: string, customerGroupId: string | null) =>
  (await gatewayClient.post(`${API}/customers/${customerId}/assign-group`, { customerGroupId })).data

export const listCustomerTags = async () =>
  (await gatewayClient.get<{ data: CustomerTag[] }>(`${API}/customer-tags`)).data.data
export const createCustomerTag = async (name: string) =>
  (await gatewayClient.post<CustomerTag>(`${API}/customer-tags`, { name })).data

export const listCustomerOrders = async (customerId: string, page = 1) =>
  (await gatewayClient.get<CustomerOrdersResponse>(`${API}/customers/${customerId}/orders`, { params: { page, limit: 10 } })).data
export const getCustomerLoyalty = async (customerId: string) =>
  (await gatewayClient.get<LoyaltyAccount>(`${API}/customers/${customerId}/loyalty`)).data
export const listCustomerLoyaltyTransactions = async (customerId: string, page = 1) =>
  (await gatewayClient.get<LoyaltyTransactionsResponse>(`${API}/customers/${customerId}/loyalty-transactions`, { params: { page, limit: 10 } })).data
export const adjustCustomerLoyalty = async (customerId: string, points: number, reason: string) =>
  (await gatewayClient.post(`${API}/customers/${customerId}/loyalty-adjustments`, { points, reason }, { headers: { "Idempotency-Key": crypto.randomUUID() } })).data

export const findDuplicateCustomers = async () => (await gatewayClient.get<DuplicateResponse>(`${API}/customers/duplicates`)).data
export const mergeCustomers = async (sourceCustomerId: string, targetCustomerId: string, reason: string) =>
  (await gatewayClient.post(`${API}/customers/merge`, { sourceCustomerId, targetCustomerId, reason }, { headers: { "Idempotency-Key": crypto.randomUUID() } })).data
export const importCustomersCsv = async (file: File, dryRun = false) => {
  const form = new FormData()
  form.append("file", file)
  form.append("dryRun", String(dryRun))
  return (await gatewayClient.post<ImportResult>(`${API}/customers/import`, form)).data
}
export const exportCustomersCsv = async (params: { q?: string; group?: string; tagId?: string } = {}) =>
  (await gatewayClient.get<Blob>(`${API}/customers/export`, { params, responseType: "blob" })).data
export const getCustomerImportTemplate = async () =>
  (await gatewayClient.get<Blob>(`${API}/customers/import-template`, { responseType: "blob" })).data
