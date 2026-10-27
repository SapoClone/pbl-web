import { axiosClient } from "./axios"
import type { AuthTokens } from "./auth.types"

export type { AuthTokens } from "./auth.types"

export type Credentials = {
  email: string
  password: string
}

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
