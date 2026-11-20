import { gatewayClient } from "@/api/axios"

export type CatalogVariant = {
  variantId: string
  productId: string
  name: string
  label: string | null
  skuCode: string
  barcode: string | null
  price: number
  imageUrl?: string | null
  status: "active" | "inactive" | "archived"
}

type VariantPage = {
  data: CatalogVariant[]
  pagination: {
    currentPage: number
    totalPages: number
    totalRecords: number
  }
}

type ProductImageSummary = {
  items?: Array<{
    id: string
    images?: Array<{ url: string }>
  }>
}

export const listActiveVariants = async () => {
  const [variantsRes, productsRes] = await Promise.all([
    gatewayClient.get<VariantPage>("/catalog/api/v1/variants", {
      params: {
        page: 1,
        limit: 100,
        status: "active",
        sort: "name",
        order: "ASC"
      }
    }),
    gatewayClient
      .get<ProductImageSummary>("/catalog/api/v1/products", {
        params: { limit: 100 }
      })
      .catch(() => null)
  ])

  const rows = variantsRes.data?.data ?? []
  if (rows.length > 0 && productsRes?.data?.items) {
    const imgByProduct = new Map<string, string>()
    for (const p of productsRes.data.items) {
      const firstUrl = p.images?.[0]?.url
      if (firstUrl) imgByProduct.set(p.id, firstUrl)
    }
    return rows.map((r) => ({
      ...r,
      imageUrl: r.imageUrl ?? imgByProduct.get(r.productId) ?? null
    }))
  }
  return rows
}
