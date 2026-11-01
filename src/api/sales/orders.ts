import { gatewayClient } from "@/api/axios"

export type OrderApiItem = {
  sku: string
  name: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type OrderApi = {
  id: string
  code: string
  branchId: string
  status: string
  paymentMethod: string
  customerName: string | null
  totalAmount: number
  itemCount: number
  createdBy: string
  createdAt: string
  items: OrderApiItem[]
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

export const listOrders = async (params: ListOrdersParams = {}) => {
  const { data } = await gatewayClient.get<OrdersPage>("/sales/api/v1/orders", { params })
  return data
}

export const getOrder = async (orderId: string) => {
  const { data } = await gatewayClient.get<OrderApi>(`/sales/api/v1/orders/${orderId}`)
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
