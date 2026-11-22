import { gatewayClient } from "@/api/axios"
import { apiErrorCode } from "@/api/error-code"

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
  /** `PENDING_APPROVAL`: counted with a variance above the tolerance, waiting for a manager (pos.approve) */
  status: "OPEN" | "COUNTED" | "PENDING_APPROVAL" | "CLOSED"
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
  try {
    const { data } = await gatewayClient.get<PosShiftApi | null>(
      "/sales/api/v1/pos/shifts/active",
      { params: branchId ? { branchId } : undefined }
    )
    return data
  } catch (error) {
    // the cashier has no open shift: the API answers 404 SHIFT_NOT_OPEN
    if (apiErrorCode(error) === "SHIFT_NOT_OPEN") return null
    throw error
  }
}

/** An open shift of a branch (the drawer is shared: any cashier may sell into it) */
export type AvailablePosShift = {
  id: string
  code: string
  branchId: string
  register: { id: string | null; code: string }
  opener: { id: string }
  openedAt: string
  plannedEndAt: string | null
}

export const listAvailablePosShifts = async (branchId?: string) => {
  const { data } = await gatewayClient.get<{ data: AvailablePosShift[] }>(
    "/sales/api/v1/pos/shifts/available",
    { params: branchId ? { branchId } : undefined }
  )
  return data.data
}

export type PosCheckoutInput = {
  branchId: string
  /** A POS sale belongs to an open shift of its branch */
  shiftId: string
  customerName?: string
  lines: Array<{ variantId: string; qty: number }>
  orderDiscountType?: "FIXED" | "PERCENT"
  orderDiscountValue?: number
  couponCode?: string
  /** One payment settles the whole sale: the server prices it (discounts, coupon) and takes the exact total */
  paymentMethod: "CASH" | "CARD" | "BANK_TRANSFER" | "COD"
  /** Cash handed over (at least the total): the answer carries the change */
  tenderedCash?: number
  note?: string
}

export type PosCheckoutResult = {
  checkoutId: string
  orderId: string
  orderCode: string
  state: string
  paymentStatus: string
  fulfillmentStatus: string
  shiftId: string
  tenders?: {
    tenders: Array<{ method: string; amount: number; tenderedCash?: number; changeDue?: number }>
  }
}

/** The POS sale: stock, payment and the drawer in one call (a retry with the same key returns the first sale) */
export const posCheckout = async (input: PosCheckoutInput) => {
  const { data } = await gatewayClient.post<PosCheckoutResult>(
    "/sales/api/v1/pos/checkout",
    input,
    { headers: { "Idempotency-Key": crypto.randomUUID() } }
  )
  return data
}

const salesErrorMessages: Record<string, string> = {
  SHIFT_REQUIRED: "Chưa có ca thu ngân đang mở ở chi nhánh này. Hãy mở ca trước khi bán.",
  SHIFT_NOT_OPEN: "Bạn chưa có ca thu ngân đang mở.",
  SHIFT_NOT_FOUND: "Ca thu ngân không còn tồn tại hoặc đã đóng. Hãy chọn lại ca.",
  SHIFT_ALREADY_OPEN: "Quầy này đã có ca đang mở. Hãy bán vào ca đó hoặc kết ca trước.",
  INSUFFICIENT_STOCK: "Không đủ tồn khả dụng ở kho bán hàng của chi nhánh.",
  COUPON_INVALID: "Mã giảm giá không hợp lệ hoặc đã hết hiệu lực.",
  VARIANCE_REASON_REQUIRED: "Chênh lệch kiểm quỹ vượt dung sai: hãy chọn lý do chênh lệch."
}

/** A message for a failed sales call: the known codes in Vietnamese, else the server's message, else `fallback` */
export const salesErrorMessage = (error: unknown, fallback: string): string => {
  const code = apiErrorCode(error)
  if (code && salesErrorMessages[code]) return salesErrorMessages[code]
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  return typeof message === "string" && message ? message : fallback
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
