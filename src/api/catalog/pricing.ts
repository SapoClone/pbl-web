import { gatewayClient } from "@/api/axios"

export type PriceListStatus = "ACTIVE" | "INACTIVE"

export type PriceListItemApi = {
  id: string
  priceListId: string
  variantId: string
  skuCode?: string
  price: number
  version: number
  updatedAt: string
}

export type PriceListApi = {
  id: string
  name: string
  currency: string
  isDefault: boolean
  status: PriceListStatus
  startDate: string | null
  endDate: string | null
  version: number
  branchIds: string[]
  channelTypes?: string[]
  items?: PriceListItemApi[]
  createdAt: string
  updatedAt: string
}

export type CreatePriceListInput = {
  name: string
  currency?: string
  isDefault?: boolean
  status?: PriceListStatus
  startDate?: string | null
  endDate?: string | null
  branchIds?: string[]
  channelTypes?: string[]
}

export type UpdatePriceListInput = Partial<CreatePriceListInput> & {
  expectedVersion?: number
}

export type UpsertPriceListItemInput = {
  variantId: string
  price: number
}

export const listPriceLists = async (): Promise<PriceListApi[]> => {
  const { data } = await gatewayClient.get<PriceListApi[]>(
    "/catalog/api/v1/price-lists"
  )
  return Array.isArray(data) ? data : []
}

export const getPriceListById = async (id: string): Promise<PriceListApi> => {
  const { data } = await gatewayClient.get<PriceListApi>(
    `/catalog/api/v1/price-lists/${id}`
  )
  return data
}

export const createPriceList = async (
  input: CreatePriceListInput
): Promise<PriceListApi> => {
  const { data } = await gatewayClient.post<PriceListApi>(
    "/catalog/api/v1/price-lists",
    input
  )
  return data
}

export const updatePriceList = async (
  id: string,
  input: UpdatePriceListInput
): Promise<PriceListApi> => {
  const { data } = await gatewayClient.patch<PriceListApi>(
    `/catalog/api/v1/price-lists/${id}`,
    input
  )
  return data
}

export const upsertPriceListItems = async (
  priceListId: string,
  items: UpsertPriceListItemInput[]
): Promise<PriceListApi> => {
  const { data } = await gatewayClient.put<PriceListApi>(
    `/catalog/api/v1/price-lists/${priceListId}/items`,
    { items }
  )
  return data
}
