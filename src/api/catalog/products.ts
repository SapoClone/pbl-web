import { gatewayClient } from "@/api/axios"

export type CatalogStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED"

export type CatalogProduct = {
  id: string
  categoryId: string | null
  brandId: string | null
  name: string
  description: string | null
  baseUnit: string
  status: CatalogStatus
  images: Array<{ key: string; url: string; altText?: string | null; sortOrder: number }>
  version: number
  createdAt: string
  updatedAt: string
}

export type CatalogProductListResponse = {
  items: CatalogProduct[]
  page: number
  limit: number
  total: number
  nextCursor: string | null
}

export type CatalogVariantRow = {
  variantId: string
  productId: string
  name: string
  label: string | null
  skuCode: string
  barcode: string | null
  imageUrl: string | null
  category: { id: string; name: string } | null
  price: number
  avgCostPrice: number | null
  status: "active" | "inactive" | "archived"
}

export type CatalogVariant = {
  id: string
  productId: string
  skuCode: string
  barcode: string | null
  name: string
  basePrice: number
  weight: string | null
  imageUrl: string | null
  isDefault: boolean
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED"
  version: number
  combinationSignature: string
  createdAt: string
  updatedAt: string
  attributes: Array<{
    attributeId: string
    attributeName: string
    attributeValueId: string
    value: string
  }>
}

export type CreateCatalogVariantInput = {
  skuCode: string
  barcode?: string | null
  name?: string
  basePrice?: number
  weight?: string | null
  imageUrl?: string | null
  isDefault?: boolean
  attributes?: Array<{ attributeId: string; attributeValueId: string }>
}

export type UpdateCatalogVariantInput = {
  skuCode?: string
  barcode?: string | null
  name?: string
  basePrice?: number
  weight?: string | null
  imageUrl?: string | null
  version?: number
}

type VariantListResponse = {
  data: CatalogVariantRow[]
  pagination: {
    currentPage: number
    totalPages: number
    totalRecords: number
  }
}

export type CatalogCategory = {
  id: string
  name: string
  status: "ACTIVE" | "INACTIVE"
}

export type CatalogBrand = {
  id: string
  name: string
  description: string | null
  status: "ACTIVE" | "INACTIVE"
}

export type CatalogAttributeValue = {
  id: string
  attributeId: string
  value: string
  createdAt: string
  updatedAt: string
}

export type CatalogAttribute = {
  id: string
  name: string
  values: CatalogAttributeValue[]
  createdAt: string
  updatedAt: string
}

export type CatalogProductAttribute = {
  id: string
  name: string
  position: number
  values: Array<{
    id: string
    value: string
    usedByVariants: number
  }>
}

type CatalogProductAttributesResponse = {
  productId: string
  attributes: Array<{
    attributeId: string
    name: string
    position: number
    values: Array<{
      id: string
      value: string
      usedByVariants: number
    }>
  }>
}

export type CreateCatalogAttributeInput = {
  name: string
}

export type CreateCatalogAttributeValueInput = {
  value: string
}

export type CreateCatalogCategoryInput = {
  name: string
  slug?: string
}

export type UpdateCatalogCategoryInput = {
  name?: string
  slug?: string
}

export type CreateCatalogBrandInput = {
  name: string
  description?: string
}

export type UpdateCatalogBrandInput = {
  name?: string
  description?: string
  status?: "ACTIVE" | "INACTIVE"
}

type PaginatedResponse<T> = {
  items: T[]
  page: number
  limit: number
  total: number
}

export type CreateCatalogProductInput = {
  name: string
  description?: string
  categoryId?: string
  brandId?: string
  baseUnit?: string
  status?: Exclude<CatalogStatus, "ARCHIVED">
}

export type UpdateCatalogProductInput = {
  name?: string
  description?: string | null
  categoryId?: string | null
  brandId?: string | null
  baseUnit?: string
  version?: number
}

export const listProductVariants = async (params?: { q?: string; page?: number; limit?: number }) => {
  const { data } = await gatewayClient.get<VariantListResponse>("/catalog/api/v1/variants", {
    params: { page: 1, limit: 100, ...params }
  })
  return data
}

export const listCatalogProductVariants = async (productId: string) => {
  const { data } = await gatewayClient.get<CatalogVariant[]>(`/catalog/api/v1/products/${productId}/variants`)
  return data
}

export const listCatalogProducts = async (params?: {
  q?: string
  page?: number
  limit?: number
  status?: CatalogStatus
  categoryId?: string
  brandId?: string
}) => {
  const { data } = await gatewayClient.get<CatalogProductListResponse>("/catalog/api/v1/products", {
    params: { page: 1, limit: 100, ...params }
  })
  return data
}

export const listCategories = async () => {
  const { data } = await gatewayClient.get<PaginatedResponse<CatalogCategory>>("/catalog/api/v1/categories", {
    params: { page: 1, limit: 100 }
  })
  return data.items
}

export const listBrands = async () => {
  const { data } = await gatewayClient.get<PaginatedResponse<CatalogBrand>>("/catalog/api/v1/brands", {
    params: { page: 1, limit: 100, status: "ACTIVE" }
  })
  return data.items
}

export const listCatalogAttributes = async () => {
  const { data } = await gatewayClient.get<CatalogAttribute[]>("/catalog/api/v1/attributes")
  return data
}

export const listCatalogProductAttributes = async (productId: string) => {
  const { data } = await gatewayClient.get<CatalogProductAttributesResponse>(`/catalog/api/v1/products/${productId}/attributes`)
  return data.attributes.map(({ attributeId, ...attribute }) => ({ id: attributeId, ...attribute }))
}

export const replaceCatalogProductAttributes = async (productId: string, attributeIds: string[]) => {
  const { data } = await gatewayClient.put<CatalogProductAttributesResponse>(`/catalog/api/v1/products/${productId}/attributes`, { attributeIds })
  return data.attributes.map(({ attributeId, ...attribute }) => ({ id: attributeId, ...attribute }))
}

export const createCatalogAttribute = async (input: CreateCatalogAttributeInput) => {
  const { data } = await gatewayClient.post<CatalogAttribute>("/catalog/api/v1/attributes", input)
  return data
}

export const createCatalogAttributeValue = async (attributeId: string, input: CreateCatalogAttributeValueInput) => {
  const { data } = await gatewayClient.post<CatalogAttributeValue>(`/catalog/api/v1/attributes/${attributeId}/values`, input)
  return data
}

export const createCatalogCategory = async (input: CreateCatalogCategoryInput) => {
  const { data } = await gatewayClient.post<CatalogCategory>("/catalog/api/v1/categories", input)
  return data
}

export const updateCatalogCategory = async (id: string, input: UpdateCatalogCategoryInput) => {
  const { data } = await gatewayClient.patch<CatalogCategory>(`/catalog/api/v1/categories/${id}`, input)
  return data
}

export const deleteCatalogCategory = async (id: string) => {
  await gatewayClient.delete(`/catalog/api/v1/categories/${id}`)
}

export const createCatalogBrand = async (input: CreateCatalogBrandInput) => {
  const { data } = await gatewayClient.post<CatalogBrand>("/catalog/api/v1/brands", input)
  return data
}

export const updateCatalogBrand = async (id: string, input: UpdateCatalogBrandInput) => {
  const { data } = await gatewayClient.patch<CatalogBrand>(`/catalog/api/v1/brands/${id}`, input)
  return data
}

export const deleteCatalogBrand = async (id: string) => {
  await gatewayClient.delete(`/catalog/api/v1/brands/${id}`)
}

export const createCatalogProduct = async (input: CreateCatalogProductInput) => {
  const { data } = await gatewayClient.post<CatalogProduct>("/catalog/api/v1/products", input)
  return data
}

export const updateCatalogProduct = async (id: string, input: UpdateCatalogProductInput) => {
  const { data } = await gatewayClient.patch<CatalogProduct>(`/catalog/api/v1/products/${id}`, input)
  return data
}

export const updateCatalogProductStatus = async (id: string, status: CatalogStatus, version?: number) => {
  const { data } = await gatewayClient.patch<CatalogProduct>(`/catalog/api/v1/products/${id}/status`, {
    status,
    ...(version === undefined ? {} : { version })
  })
  return data
}

export const deleteCatalogProduct = async (id: string) => {
  await gatewayClient.delete(`/catalog/api/v1/products/${id}`)
}

export const createCatalogVariant = async (productId: string, input: CreateCatalogVariantInput) => {
  const { data } = await gatewayClient.post<CatalogVariant>(`/catalog/api/v1/products/${productId}/variants`, input)
  return data
}

export const updateCatalogVariant = async (variantId: string, input: UpdateCatalogVariantInput) => {
  const { data } = await gatewayClient.patch<CatalogVariant>(`/catalog/api/v1/variants/${variantId}`, input)
  return data
}

export const updateCatalogVariantStatus = async (variantId: string, status: CatalogVariant["status"], version: number) => {
  const { data } = await gatewayClient.patch<CatalogVariant>(`/catalog/api/v1/variants/${variantId}/status`, { status, version })
  return data
}

export const deleteCatalogVariant = async (variantId: string) => {
  await gatewayClient.delete(`/catalog/api/v1/variants/${variantId}`)
}
