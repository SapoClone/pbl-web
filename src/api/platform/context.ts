import { axiosClient } from "@/api/axios"

/** What the global chrome needs, in one call (`GET /tenants/current/context`) */
export type TenantContext = {
  tenant: { id: string; code: string; name: string; status: string }
  plan: { code: string; name: string; isExpiringSoon: boolean; expiresAt: string | null }
  branchCount: number
  me: { accountId: string; name: string; initials: string; roleId: string; roleName: string; isOwner: boolean }
  branches: Array<{ id: string; name: string; city?: string | null; isWarehouse: boolean }>
  permissions: string[]
  timezone: string
}

export const getTenantContext = async () => {
  const { data } = await axiosClient.get<TenantContext>("/tenants/current/context")
  return data
}
