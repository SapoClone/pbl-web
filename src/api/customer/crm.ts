import { gatewayClient } from "@/api/axios"
import type { CustomerAddressItem } from "./customers"

export type CustomerGroupItem = {
  id: string
  code: string
  name: string
  description?: string | null
  defaultDiscountRate: number | string
  status: "ACTIVE" | "INACTIVE"
  customerCount?: number
  isSeeded?: boolean
  createdAt?: string
  updatedAt?: string
}

export type CreateCustomerGroupInput = {
  code?: string
  name: string
  description?: string
  defaultDiscountRate?: number
}

export type UpdateCustomerGroupInput = {
  name?: string
  description?: string
  defaultDiscountRate?: number
  status?: "ACTIVE" | "INACTIVE"
  forceDeactivate?: boolean
}

export type MembershipTierBenefits = {
  freeShipping?: boolean
  birthdayVoucherVnd?: number
  prioritySupport?: boolean
  note?: string
  [key: string]: unknown
}

export type MembershipTierItem = {
  id: string
  code: string
  name: string
  minPoints: number
  discountRate: number | string
  benefitsJson?: MembershipTierBenefits | null
  status: "ACTIVE" | "INACTIVE"
  createdAt?: string
  updatedAt?: string
}

export type CreateMembershipTierInput = {
  code?: string
  name: string
  minPoints: number
  discountRate?: number
  benefits?: MembershipTierBenefits
}

export type UpdateMembershipTierInput = {
  name?: string
  minPoints?: number
  discountRate?: number
  benefits?: MembershipTierBenefits
  status?: "ACTIVE" | "INACTIVE"
}

export type CustomerMembershipProgress = {
  customerId: string
  qualifyingPoints: number
  currentTier: MembershipTierItem | null
  nextTier: MembershipTierItem | null
  pointsToNextTier: number | null
}

export type LoyaltySettingsConfig = {
  enabled: boolean
  earnAmountPerPoint: number
  redeemValuePerPoint: number
  pointsExpireMonths: number | null
  pointsExpirationDays?: number | null
  minRedeemPoints: number
  maxRedeemPointsPerOrder: number | null
  holdTtlSeconds?: number
  version?: number
}

export type PatchLoyaltySettingsInput = {
  enabled?: boolean
  earnAmountPerPoint?: number
  redeemValuePerPoint?: number
  pointsExpireMonths?: number | null
  minRedeemPoints?: number
  maxRedeemPointsPerOrder?: number | null
  holdTtlSeconds?: number
}

export type CustomerLoyaltyAccount = {
  id?: string
  customerId: string
  postedPointsBalance: number
  heldPoints: number
  availablePoints: number
  lifetimeEarnedPoints: number
  lifetimeRedeemedPoints: number
  qualifyingPoints: number
  status: string
}

export type LoyaltyTransactionType =
  | "earn"
  | "redeem"
  | "adjust"
  | "expire"
  | "reverse"
  | "EARN"
  | "REDEEM"
  | "MANUAL_ADJUST"
  | "EXPIRE"
  | "EARN_REVERSAL"
  | "REDEMPTION_REVERSAL"

export type LoyaltyTransactionItem = {
  id: string
  type?: "earn" | "redeem" | "adjust" | "expire" | "reverse"
  transactionType?: string
  points?: number
  pointsDelta?: number
  balanceAfter?: number
  orderId?: string | null
  orderCode?: string | null
  referenceId?: string | null
  reason?: string | null
  createdAt: string
}

export type LoyaltyTransactionsPage = {
  data: LoyaltyTransactionItem[]
  pagination?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

export type AdjustLoyaltyPointsResult = {
  transaction: LoyaltyTransactionItem
  balance: number
  availablePoints: number
  replayed?: boolean
}

export const listCustomerGroups = async (): Promise<CustomerGroupItem[]> => {
  const { data } = await gatewayClient.get<
    CustomerGroupItem[] | { data?: CustomerGroupItem[]; items?: CustomerGroupItem[] }
  >("/customer/api/v1/customer-groups")
  if (Array.isArray(data)) return data
  return data.data ?? data.items ?? []
}

export const createCustomerGroup = async (
  input: CreateCustomerGroupInput
): Promise<CustomerGroupItem> => {
  const { data } = await gatewayClient.post<CustomerGroupItem>(
    "/customer/api/v1/customer-groups",
    input
  )
  return data
}

export const updateCustomerGroup = async (
  id: string,
  input: UpdateCustomerGroupInput
): Promise<CustomerGroupItem> => {
  const { data } = await gatewayClient.patch<CustomerGroupItem>(
    `/customer/api/v1/customer-groups/${id}`,
    input
  )
  return data
}

export const deleteCustomerGroup = async (id: string): Promise<void> => {
  await gatewayClient.delete(`/customer/api/v1/customer-groups/${id}`)
}

export const assignCustomerGroup = async (
  customerId: string,
  customerGroupId: string | null
) => {
  const { data } = await gatewayClient.post(
    `/customer/api/v1/customers/${customerId}/assign-group`,
    { customerGroupId }
  )
  return data
}

export const listMembershipTiers = async (): Promise<MembershipTierItem[]> => {
  const { data } = await gatewayClient.get<
    MembershipTierItem[] | { data?: MembershipTierItem[]; items?: MembershipTierItem[] }
  >("/customer/api/v1/membership-tiers")
  if (Array.isArray(data)) return data
  return data.data ?? data.items ?? []
}

export const createMembershipTier = async (
  input: CreateMembershipTierInput
): Promise<MembershipTierItem> => {
  const { data } = await gatewayClient.post<MembershipTierItem>(
    "/customer/api/v1/membership-tiers",
    input
  )
  return data
}

export const updateMembershipTier = async (
  id: string,
  input: UpdateMembershipTierInput
): Promise<MembershipTierItem> => {
  const { data } = await gatewayClient.patch<MembershipTierItem>(
    `/customer/api/v1/membership-tiers/${id}`,
    input
  )
  return data
}

export const getCustomerMembership = async (
  customerId: string
): Promise<CustomerMembershipProgress> => {
  const { data } = await gatewayClient.get<CustomerMembershipProgress>(
    `/customer/api/v1/customers/${customerId}/membership`
  )
  return data
}

export const getLoyaltySettings = async (): Promise<LoyaltySettingsConfig> => {
  const { data } = await gatewayClient.get<LoyaltySettingsConfig>(
    "/customer/api/v1/loyalty-settings"
  )
  return data
}

export const patchLoyaltySettings = async (
  input: PatchLoyaltySettingsInput
): Promise<LoyaltySettingsConfig> => {
  const { data } = await gatewayClient.patch<LoyaltySettingsConfig>(
    "/customer/api/v1/loyalty-settings",
    input
  )
  return data
}

export const reconcileLoyaltyProgram = async (): Promise<{
  accountsChecked?: number
  expiredHolds?: number
  status?: string
}> => {
  const { data } = await gatewayClient.post("/customer/api/v1/loyalty/reconcile")
  return data
}

export const getCustomerLoyaltyAccount = async (
  customerId: string
): Promise<CustomerLoyaltyAccount> => {
  const { data } = await gatewayClient.get<CustomerLoyaltyAccount>(
    `/customer/api/v1/customers/${customerId}/loyalty`
  )
  return data
}

export const listCustomerLoyaltyTransactions = async (
  customerId: string,
  params?: { page?: number; limit?: number; type?: string }
): Promise<LoyaltyTransactionsPage> => {
  const { data } = await gatewayClient.get<
    LoyaltyTransactionsPage | LoyaltyTransactionItem[]
  >(`/customer/api/v1/customers/${customerId}/loyalty-transactions`, {
    params: {
      page: params?.page ?? 1,
      limit: params?.limit ?? 30,
      ...(params?.type ? { type: params.type } : {})
    }
  })
  if (Array.isArray(data)) {
    return { data }
  }
  return {
    data: data.data ?? [],
    pagination: data.pagination
  }
}

export const adjustCustomerLoyaltyPoints = async (
  customerId: string,
  input: { points: number; reason: string }
): Promise<AdjustLoyaltyPointsResult> => {
  const { data } = await gatewayClient.post<AdjustLoyaltyPointsResult>(
    `/customer/api/v1/customers/${customerId}/loyalty-adjustments`,
    input,
    {
      headers: {
        "Idempotency-Key": crypto.randomUUID()
      }
    }
  )
  return data
}

export const updateCustomerAddress = async (
  customerId: string,
  addressId: string,
  payload: {
    recipientName?: string
    phone?: string
    addressLine?: string
    ward?: string
    district?: string
    province?: string
    isDefault?: boolean
  }
): Promise<CustomerAddressItem> => {
  const { data } = await gatewayClient.patch<CustomerAddressItem>(
    `/customer/api/v1/customers/${customerId}/addresses/${addressId}`,
    payload
  )
  return data
}

export const deleteCustomerAddress = async (
  customerId: string,
  addressId: string
): Promise<void> => {
  await gatewayClient.delete(
    `/customer/api/v1/customers/${customerId}/addresses/${addressId}`
  )
}

export const setDefaultCustomerAddress = async (
  customerId: string,
  addressId: string
): Promise<CustomerAddressItem> => {
  const { data } = await gatewayClient.post<CustomerAddressItem>(
    `/customer/api/v1/customers/${customerId}/addresses/${addressId}/set-default`
  )
  return data
}
