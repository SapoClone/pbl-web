import { gatewayClient } from "@/api/axios"

const PLATFORM = "/platform/api/v1"

export type StorePlan = {
  id: string
  code: string
  name: string
  description: string | null
  priceMonthly: number
  isFeatured: boolean
  quotas: { branches: number; users: number; products: number; storageGb: number }
}

export type QuotaUsage = {
  key: "branches" | "users" | "products" | "storageGb"
  used: number
  limit: number
  ok: boolean
}

export type CurrentSubscription = {
  id: string
  code: string
  status: "trialing" | "active" | "past_due"
  billingCycle: "monthly" | "yearly"
  startedAt: string
  expiresAt: string | null
  plan: StorePlan
  usage: QuotaUsage[]
  warning: "normal" | "near_limit" | "at_limit"
}

export const listStorePlans = async () =>
  (await gatewayClient.get<{ data: StorePlan[] }>(`${PLATFORM}/plans`)).data.data

export const getCurrentSubscription = async () =>
  (await gatewayClient.get<CurrentSubscription>(`${PLATFORM}/subscription/current`)).data
