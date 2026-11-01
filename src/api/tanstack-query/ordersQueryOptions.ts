import { queryOptions } from "@tanstack/react-query"
import { listOrders, type ListOrdersParams } from "@/api/sales/orders"

export const ordersQueryOptions = (params: ListOrdersParams = {}) =>
  queryOptions({
    queryKey: ["orders", params],
    queryFn: () => listOrders(params)
  })
