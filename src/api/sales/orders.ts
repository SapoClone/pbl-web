import { gatewayClient } from "@/api/axios"

export type OrderApiItem = {
  id?: string
  sku: string
  skuCode?: string
  name: string
  productName?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  variantId?: string | null
  variantName?: string | null
  discountAmount?: number
}

export type OrderChannelInfo = {
  id: string | null
  type: string
  name: string
  environment?: string | null
}

export type OrderShippingInfo = {
  method?: string | null
  addressText?: string | null
  providerName?: string | null
  trackingCode?: string | null
  status?: string | null
}

export type OrderApi = {
  id: string
  code: string
  branchId: string
  version?: number
  status: string
  paymentMethod: string
  customerName: string | null
  totalAmount: number
  itemCount: number
  createdBy: string
  createdAt: string
  items: OrderApiItem[]
  externalOrderCode?: string | null
  channel?: OrderChannelInfo
  shipping?: OrderShippingInfo | null
  customer?: {
    id?: string
    name?: string | null
    phoneMasked?: string | null
  } | null
  orderStatus?: string
  fulfillmentStatus?: string
  paymentStatus?: string
  exceptionCode?: string | null
  shippingFee?: number
  discountAmount?: number
  note?: string | null
}

export type OrdersSummaryApi = {
  today: { total: number; completed: number }
  awaitingConfirmation: number
  inFulfillment: { packing: number; shipping: number }
  needsAction: {
    total: number
    skuUnmapped: number
    stockShortage: number
  }
  tabCounts: {
    all: number
    new: number
    confirmed: number
    packing: number
    shipping: number
    completed: number
    needsAction: number
  }
  latestException: {
    orderId: string
    code: string
    exceptionCode: string
    externalSku: string | null
    channelName: string | null
  } | null
}

export type OrdersPage = {
  data: OrderApi[]
  pagination: {
    currentPage: number
    totalPages: number
    totalRecords: number
    nextPage?: number
    previousPage?: number
  }
}

export type ListOrdersParams = {
  page?: number
  limit?: number
  branchId?: string
  customerId?: string
  q?: string
  tab?: string
  channel?: string[]
}

export type CreateOrderInput = {
  branchId: string
  paymentMethod: "cash" | "card" | "transfer" | "cod"
  customerName?: string
  items: Array<{
    sku: string
    name: string
    quantity: number
    unitPrice: number
  }>
}

export type PosShiftApi = {
  id: string
  code?: string
  branchId: string
  registerCode: string
  status: "OPEN" | "COUNTED" | "CLOSED"
  version?: number
  openingCash: number
  expectedCash?: number
  actualCash?: number | null
  varianceAmount?: number | null
  openedAt: string
  closedAt?: string | null
  note?: string | null
}

export const listOrders = async (params: ListOrdersParams = {}) => {
  const { data } = await gatewayClient.get<OrdersPage>("/sales/api/v1/orders", {
    params
  })
  return data
}

export const getOrdersSummary = async (branchId?: string) => {
  const { data } = await gatewayClient.get<OrdersSummaryApi>(
    "/sales/api/v1/orders/summary",
    { params: branchId ? { branchId } : undefined }
  )
  return data
}

export const getOrder = async (orderId: string) => {
  const { data } = await gatewayClient.get<OrderApi>(
    `/sales/api/v1/orders/${orderId}`
  )
  return data
}

export const createOrder = async (input: CreateOrderInput) => {
  const { data } = await gatewayClient.post<OrderApi>(
    "/sales/api/v1/orders",
    input,
    { headers: { "Idempotency-Key": crypto.randomUUID() } }
  )
  return data
}

export const confirmOrder = async (
  orderId: string,
  input: { warehouseId?: string; version?: number } = {}
) => {
  const { data } = await gatewayClient.post<OrderApi>(
    `/sales/api/v1/orders/${orderId}/confirm`,
    input
  )
  return data
}

export const packOrder = async (orderId: string, version = 1) => {
  const { data } = await gatewayClient.post<OrderApi>(
    `/sales/api/v1/orders/${orderId}/pack`,
    { version }
  )
  return data
}

export const shipOrder = async (
  orderId: string,
  input: {
    version: number
    trackingCode?: string | null
    shippingProviderId?: string
  }
) => {
  const { data } = await gatewayClient.post<OrderApi>(
    `/sales/api/v1/orders/${orderId}/ship`,
    input
  )
  return data
}

export const completeOrder = async (orderId: string, version = 1) => {
  const { data } = await gatewayClient.post<OrderApi>(
    `/sales/api/v1/orders/${orderId}/complete`,
    { version }
  )
  return data
}

export const cancelOrder = async (
  orderId: string,
  input: { reason?: string; version?: number } = {}
) => {
  const { data } = await gatewayClient.post<OrderApi>(
    `/sales/api/v1/orders/${orderId}/cancel`,
    input
  )
  return data
}

export const createOrderReturn = async (
  orderId: string,
  input: {
    items: Array<{ orderItemId: string; quantity: number }>
    reason?: string
    restock?: boolean
    refund?: {
      method: "cash" | "transfer" | "card" | "e_wallet"
      amount: number
    }
  }
) => {
  const { data } = await gatewayClient.post(
    `/sales/api/v1/orders/${orderId}/returns`,
    input
  )
  return data
}

export const exportOrdersCsv = async (params: ListOrdersParams = {}) => {
  const { data } = await gatewayClient.get<Blob>(
    "/sales/api/v1/orders/export",
    {
      params,
      responseType: "blob"
    }
  )
  return data
}

export const getActivePosShift = async (branchId?: string) => {
  const { data } = await gatewayClient.get<PosShiftApi | null>(
    "/sales/api/v1/pos/shifts/active",
    { params: branchId ? { branchId } : undefined }
  )
  return data
}

export const openPosShift = async (input: {
  branchId: string
  registerCode?: string
  openingCash: number
  note?: string
}) => {
  const { data } = await gatewayClient.post<PosShiftApi>(
    "/sales/api/v1/pos/shifts/open",
    {
      registerCode: "REG-01",
      ...input
    }
  )
  return data
}

export const closePosShift = async (
  shiftId: string,
  input: {
    actualCash: number
    version?: number
    reason?: string
    note?: string
  }
) => {
  const { data } = await gatewayClient.post<PosShiftApi>(
    `/sales/api/v1/pos/shifts/${shiftId}/close`,
    input
  )
  return data
}
