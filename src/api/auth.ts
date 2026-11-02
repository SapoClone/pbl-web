import { axiosClient } from "./axios"
import { isDemoLoginEnabled } from "@/config/env-config"
import type { AuthTokens } from "./auth.types"

export type { AuthTokens } from "./auth.types"

export type Credentials = {
  email: string
  password: string
}

export type Registration = Credentials & {
  name?: string
}

export const isDemoCredentials = ({ email, password }: Credentials) =>
  isDemoLoginEnabled() &&
  email.trim().toLowerCase() === "admin@gmail.com" &&
  password === "admin@gmail.com"

export const createDemoTokens = (): AuthTokens => ({
  userId: "demo-admin",
  accessToken: "demo-access-token",
  refreshToken: "demo-refresh-token",
  tokenExpires: Date.now() + 24 * 60 * 60 * 1000,
  isDemo: true,
  tenantId: "demo-tenant",
  tenants: [{ id: "demo-tenant", name: "Cửa hàng demo", role: "owner" }]
})

export const login = async (
  credentials: Credentials & { tenantId?: string }
) => {
  const { data } = await axiosClient.post<AuthTokens>("/auth/email/login", {
    email: credentials.email.trim(),
    password: credentials.password,
    tenantId: credentials.tenantId
  })
  return data
}

export const register = async (credentials: Registration) => {
  const { data } = await axiosClient.post<{ userId: string }>(
    "/auth/email/register",
    {
      email: credentials.email.trim(),
      password: credentials.password,
      ...(credentials.name?.trim() ? { name: credentials.name.trim() } : {})
    }
  )
  return data
}

export const requestPasswordReset = async (email: string) => {
  const { data } = await axiosClient.post<string>("/auth/forgot-password", {
    email
  })
  return data
}

export const logout = async () => {
  await axiosClient.post("/auth/logout")
}

export const switchTenant = async (tenantId: string) => {
  const { data } = await axiosClient.post<AuthTokens>("/auth/switch-tenant", {
    tenantId
  })
  return data
}
