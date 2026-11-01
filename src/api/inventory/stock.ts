import { gatewayClient } from "@/api/axios"

export type StockItem = {
  branchId: string
  sku: string
  onHand: number
  reserved: number
  available: number
}

type StockResponse = {
  data: StockItem[]
  pagination: {
    currentPage: number
    totalPages: number
    totalRecords: number
  }
}

export type StockReceiptInput = {
  branchId: string
  items: Array<{ sku: string; quantity: number }>
}

export const listStock = async (branchId?: string) => {
  const { data } = await gatewayClient.get<StockResponse>("/inventory/api/v1/stock", {
    params: { page: 1, limit: 100, ...(branchId ? { branchId } : {}) }
  })
  return data
}

export const receiveStock = async (input: StockReceiptInput) => {
  const { data } = await gatewayClient.post<StockItem[]>(
    "/inventory/api/v1/stock-receipts",
    input
  )
  return data
}
