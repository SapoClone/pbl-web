import { axiosClient } from "@/api/axios"

export type TenantStatus = "active" | "suspended" | "inactive"

export type Tenant = {
  id: string
  name: string
  subdomain: string
  phone: string | null
  email: string | null
  address: string | null
  status: TenantStatus
  createdAt: string
}

export type UpdateTenantInput = {
  name?: string
  phone?: string | null
  email?: string | null
  address?: string | null
}

export const getCurrentTenant = async () => {
  const { data } = await axiosClient.get<Tenant>("/tenants/current")
  return data
}

export const updateCurrentTenant = async (input: UpdateTenantInput) => {
  const { data } = await axiosClient.patch<Tenant>("/tenants/current", input)
  return data
}
