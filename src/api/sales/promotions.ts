import { gatewayClient } from "@/api/axios"

export type PromotionDiscountType = "FIXED" | "PERCENT"
export type PromotionStatus = "ACTIVE" | "INACTIVE"

export type PromotionApi = {
  id: string
  tenantId?: string
  code: string
  name: string
  description?: string | null
  discountType: PromotionDiscountType
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount: number | null
  branchId: string | null
  channelTypes?: string[]
  customerGroupIds?: string[]
  startsAt: string | null
  endsAt: string | null
  status: PromotionStatus | string
  createdAt: string
  updatedAt?: string
}

export type CouponApi = {
  id: string
  tenantId?: string
  promotionId: string
  code: string
  maxUses: number | null
  maxUsesPerCustomer: number | null
  usedCount: number
  status: PromotionStatus | string
  createdAt: string
}

export type CreatePromotionInput = {
  code: string
  name: string
  description?: string
  discountType: PromotionDiscountType
  discountValue: number
  minOrderAmount?: number
  maxDiscountAmount?: number | null
  branchId?: string | null
  channelTypes?: string[]
  customerGroupIds?: string[]
  startsAt?: string | null
  endsAt?: string | null
  status?: PromotionStatus
}

export type UpdatePromotionInput = Partial<Omit<CreatePromotionInput, "code">>

export type CreateCouponInput = {
  promotionId: string
  code: string
  maxUses?: number | null
  maxUsesPerCustomer?: number | null
  status?: PromotionStatus
}

export type UpdateCouponInput = {
  maxUses?: number | null
  maxUsesPerCustomer?: number | null
  status?: PromotionStatus
}

export type EvaluateCouponInput = {
  code: string
  orderAmount: number
  branchId: string
  customerId?: string | null
  channelType?: string
  customerGroupId?: string | null
}

export type EvaluateCouponResult = {
  couponId: string
  promotionId: string
  promotionCode: string
  promotionName: string
  couponCode: string
  discountType: PromotionDiscountType | string
  discountValue: number
  minOrderAmount: number
  maxDiscountAmount: number | null
  orderAmountVnd: number
  discountAmountVnd: number
  finalAmountVnd: number
}

export const listPromotions = async (): Promise<PromotionApi[]> => {
  const { data } = await gatewayClient.get<PromotionApi[]>(
    "/sales/api/v1/promotions"
  )
  return Array.isArray(data) ? data : []
}

export const createPromotion = async (
  input: CreatePromotionInput
): Promise<PromotionApi> => {
  const { data } = await gatewayClient.post<PromotionApi>(
    "/sales/api/v1/promotions",
    input
  )
  return data
}

export const updatePromotion = async (
  id: string,
  input: UpdatePromotionInput
): Promise<PromotionApi> => {
  const { data } = await gatewayClient.patch<PromotionApi>(
    `/sales/api/v1/promotions/${id}`,
    input
  )
  return data
}

export const listCoupons = async (): Promise<CouponApi[]> => {
  const { data } = await gatewayClient.get<CouponApi[]>(
    "/sales/api/v1/coupons"
  )
  return Array.isArray(data) ? data : []
}

export const createCoupon = async (
  input: CreateCouponInput
): Promise<CouponApi> => {
  const { data } = await gatewayClient.post<CouponApi>(
    "/sales/api/v1/coupons",
    input
  )
  return data
}

export const updateCoupon = async (
  id: string,
  input: UpdateCouponInput
): Promise<CouponApi> => {
  const { data } = await gatewayClient.patch<CouponApi>(
    `/sales/api/v1/coupons/${id}`,
    input
  )
  return data
}

export const evaluateCoupon = async (
  input: EvaluateCouponInput
): Promise<EvaluateCouponResult> => {
  const { data } = await gatewayClient.post<EvaluateCouponResult>(
    "/sales/api/v1/coupons/evaluate",
    input
  )
  return data
}
