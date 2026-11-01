import { gatewayClient } from "@/api/axios"

export type CustomerHealth = {
  status: "ok"
  service: "customer"
}

export const getCustomerHealth = async () => {
  const { data } = await gatewayClient.get<CustomerHealth>("/customer/health")
  return data
}
