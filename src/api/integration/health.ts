import { gatewayClient } from "@/api/axios"

export type IntegrationHealth = {
  status: "ok"
  service: "integration"
}

export const getIntegrationHealth = async () => {
  const { data } = await gatewayClient.get<IntegrationHealth>("/integration/health")
  return data
}
