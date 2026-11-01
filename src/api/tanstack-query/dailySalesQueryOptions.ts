import { queryOptions } from "@tanstack/react-query"
import { getDailySales, type DailySalesParams } from "@/api/insight/salesSummary"

export const dailySalesQueryOptions = (params: DailySalesParams = {}) =>
  queryOptions({
    queryKey: ["daily-sales", params],
    queryFn: () => getDailySales(params)
  })
