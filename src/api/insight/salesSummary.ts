import { gatewayClient } from "@/api/axios"

export type DailySales = {
  date: string
  branchId: string
  orderCount: number
  revenue: number
}

export type DailySalesResponse = {
  data: DailySales[]
  totals: {
    orderCount: number
    revenue: number
  }
  from: string
  to: string
}

export type DailySalesParams = {
  from?: string
  to?: string
  branchId?: string
}

export const getDailySales = async (params: DailySalesParams = {}) => {
  const { data } = await gatewayClient.get<DailySalesResponse>(
    "/insight/api/v1/sales-summary/daily",
    { params }
  )
  return data
}
