import { gatewayClient } from "@/api/axios"

export type InventoryWarehouse = {
  id: string
  branchId: string | null
  code: string
  name: string
  kind: "BRANCH" | "CENTRAL" | "QUARANTINE"
  status: "ACTIVE" | "INACTIVE"
  isDefault: boolean
}

export const listWarehouses = async (branchId?: string) => {
  const { data } = await gatewayClient.get<InventoryWarehouse[]>("/inventory/api/v1/warehouses", {
    params: branchId ? { branchId } : {}
  })
  return data
}
