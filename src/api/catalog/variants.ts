import { gatewayClient } from "@/api/axios"

export type CatalogVariant = { variantId: string; productId: string; name: string; label: string | null; skuCode: string; barcode: string | null; price: number; status: "active" | "inactive" | "archived" }
type VariantPage = { data: CatalogVariant[]; pagination: { currentPage: number; totalPages: number; totalRecords: number } }

export const listActiveVariants = async () => {
  const { data } = await gatewayClient.get<VariantPage>("/catalog/api/v1/variants", { params: { page: 1, limit: 100, status: "active", sort: "name", order: "ASC" } })
  return data.data
}
