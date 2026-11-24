import { fireEvent, render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import * as productsApi from "@/api/catalog/products"
import type { CatalogProduct, CatalogVariantRow } from "@/api/catalog/products"
import { ProductCombosPanel } from "./ProductCombosPanel"
import { fetchProductsBundle } from "./ProductsPage"
import { ProductsTable } from "./ProductsTable"

vi.mock("@/api/catalog/products", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/api/catalog/products")>()
  return {
    ...original,
    listCategories: vi.fn(),
    listBrands: vi.fn(),
    listCatalogProducts: vi.fn(),
    listProductVariants: vi.fn(),
    listComboItems: vi.fn()
  }
})
vi.mock("@/api/catalog/variants", () => ({ listActiveVariants: vi.fn().mockResolvedValue([]) }))
vi.mock("@/api/integration", () => ({ listSkuMappings: vi.fn().mockResolvedValue([]) }))

const product = (id: string, name: string, isCombo = false): CatalogProduct => ({
  id,
  categoryId: null,
  brandId: null,
  name,
  description: null,
  baseUnit: "Cái",
  isCombo,
  status: "ACTIVE",
  images: [],
  version: 1,
  createdAt: "2026-11-01T00:00:00Z",
  updatedAt: "2026-11-01T00:00:00Z"
})

const variant = (productId: string, skuCode: string, price: number, barcode: string | null = null): CatalogVariantRow => ({
  variantId: `v-${skuCode}`,
  productId,
  name: skuCode,
  label: null,
  skuCode,
  barcode,
  imageUrl: null,
  category: null,
  price,
  avgCostPrice: null,
  status: "active"
})

const variantPage = (data: CatalogVariantRow[], currentPage: number, totalPages: number) => ({
  data,
  pagination: { currentPage, totalPages, totalRecords: data.length }
})

describe("products bundle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(productsApi.listCategories).mockResolvedValue([])
    vi.mocked(productsApi.listBrands).mockResolvedValue([])
    vi.mocked(productsApi.listCatalogProducts).mockResolvedValue({
      items: [product("p1", "Cà phê Arabica"), product("p2", "Trà đào")],
      page: 1,
      limit: 100,
      total: 2,
      nextCursor: null
    })
  })

  it("fills sku, variant count and price from the variants of every page", async () => {
    vi.mocked(productsApi.listProductVariants).mockImplementation(async (params) =>
      params?.page === 2
        ? variantPage([variant("p1", "CF-ARA-1000", 350000, "893001"), variant("p2", "TEA-01", 58500)], 2, 2)
        : variantPage([variant("p1", "CF-ARA-250", 190500)], 1, 2)
    )

    const { products } = await fetchProductsBundle()
    const coffee = products.find((p) => p.id === "p1")!

    expect(coffee.sku).toBe("CF-ARA-250")
    expect(coffee.skuCodes).toEqual(["CF-ARA-250", "CF-ARA-1000"])
    expect(coffee.barcodes).toEqual(["893001"])
    expect(coffee.variantCount).toBe(2)
    expect(coffee.retailPrice).toBe(190500)
    expect(products.find((p) => p.id === "p2")?.retailPrice).toBe(58500)
  })

  it("searches the table by any variant SKU or barcode", async () => {
    vi.mocked(productsApi.listProductVariants).mockResolvedValue(
      variantPage([variant("p1", "CF-ARA-250", 190000), variant("p1", "CF-ARA-1000", 350000, "893001"), variant("p2", "TEA-01", 58500)], 1, 1)
    )
    const { products } = await fetchProductsBundle()
    render(<ProductsTable section="products" products={products} />)
    const search = screen.getByPlaceholderText("Tìm tên sản phẩm, mã SKU...")

    fireEvent.change(search, { target: { value: "cf-ara-1000" } })
    expect(screen.getByText("Cà phê Arabica")).toBeTruthy()
    expect(screen.queryByText("Trà đào")).toBeNull()

    fireEvent.change(search, { target: { value: "893001" } })
    expect(screen.getByText("Cà phê Arabica")).toBeTruthy()
    expect(screen.queryByText("Trà đào")).toBeNull()
  })
})

describe("combo panel", () => {
  const renderPanel = (retailPrice?: number) => {
    vi.mocked(productsApi.listComboItems).mockResolvedValue([
      {
        id: "i1",
        comboProductId: "c1",
        childVariantId: "v1",
        childProductId: "p1",
        skuCode: "CF-ARA-250",
        variantName: "Cà phê 250g",
        basePrice: 190000,
        imageUrl: null,
        quantity: 1,
        lineTotal: 190000,
        sortOrder: 0
      }
    ])
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
          <ProductCombosPanel
            products={[{ id: "c1", name: "Combo quà", isCombo: true, category: "Khác", retailPrice, stock: 0, price: "—", state: "Đang bán" }]}
            categories={[]}
            brands={[]}
            onReloadProducts={async () => {}}
          />
      </QueryClientProvider>
    )
  }

  it("shows the combo price taken from the bundle, not 0", async () => {
    vi.mocked(productsApi.listCatalogProducts).mockResolvedValue({ items: [product("c1", "Combo quà", true)], page: 1, limit: 100, total: 1, nextCursor: null })
    vi.mocked(productsApi.listCategories).mockResolvedValue([])
    vi.mocked(productsApi.listBrands).mockResolvedValue([])
    vi.mocked(productsApi.listProductVariants).mockResolvedValue(variantPage([variant("c1", "CB-1", 190000)], 1, 1))
    const { products } = await fetchProductsBundle()
    expect(products[0].retailPrice).toBe(190000)
    renderPanel(products[0].retailPrice)
    expect(await screen.findByText(/Giá Combo: 190\.000/)).toBeTruthy()
    expect(screen.queryByText(/-100%/)).toBeNull()
  })
})
