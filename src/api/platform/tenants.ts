import { axiosClient } from "@/api/axios"
import type { AuthTokens } from "@/api/auth.types"

export type CreateTenantInput = {
  name: string
  subdomain: string
  phone?: string
  email?: string
  address?: string
}

export type Tenant = {
  id: string
  name: string
  subdomain: string
  phone: string | null
  email: string | null
  address: string | null
  status: string
}

export type CreateTenantResponse = {
  tenant: Tenant
  auth: AuthTokens
}

export const createTenant = async (input: CreateTenantInput) => {
  const { data } = await axiosClient.post<CreateTenantResponse>("/tenants", {
    name: input.name.trim(),
    subdomain: input.subdomain.trim().toLowerCase(),
    ...(input.phone?.trim() ? { phone: input.phone.trim() } : {}),
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    ...(input.address?.trim() ? { address: input.address.trim() } : {})
  })
  return data
}
