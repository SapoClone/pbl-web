import { axiosClient } from "./axios"
import type { AuthTokens } from "./auth.types"

export type { AuthTokens } from "./auth.types"

export type Credentials = {
  email: string
  password: string
}

export const isDemoCredentials = ({ email, password }: Credentials) =>
  email.trim().toLowerCase() === "admin@gmail.com" &&
  password === "admin@gmail.com"

export const createDemoTokens = (): AuthTokens => ({
  userId: "demo-admin",
  accessToken: "demo-access-token",
  refreshToken: "demo-refresh-token",
  tokenExpires: Date.now() + 24 * 60 * 60 * 1000,
  isDemo: true
})

export const login = async (credentials: Credentials) => {
  const { data } = await axiosClient.post<AuthTokens>(
    "/auth/email/login",
    credentials
  )
  return data
}

export const register = async (credentials: Credentials) => {
  const { data } = await axiosClient.post<{ userId: string }>(
    "/auth/email/register",
    credentials
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
