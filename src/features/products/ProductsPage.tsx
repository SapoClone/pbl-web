import { useEffect, useMemo, useState } from "react"
import { Boxes, Layers, Package, Tag } from "lucide-react"
import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"
import { products as demoDefaultProducts } from "@/shared/dashboard/dashboard.mock"
import { ProductsTable } from "./ProductsTable"
import { ProductCreateForm } from "./ProductCreateForm"
import { ProductCatalogManagement } from "./ProductCatalogManagement"
import { ProductEditForm } from "./ProductEditForm"
import { ProductVariantCreateForm } from "./ProductVariantCreateForm"
import { ProductVariantList } from "./ProductVariantList"
import { PriceListsPanel } from "./PriceListsPanel"
import { ProductCombosPanel } from "./ProductCombosPanel"
import { Button } from "@/components/ui/button"
import { KpiStatCard } from "@/components/ui/micro-ux"
import type { Product } from "@/shared/dashboard/dashboard.types"
import {
  createCatalogProduct,
  createCatalogVariant,
  listCatalogProductVariants,
  createCatalogAttribute,
  createCatalogAttributeValue,
  createCatalogBrand,
  createCatalogCategory,
  deleteCatalogProduct,
  deleteCatalogVariant,
  deleteCatalogBrand,
  deleteCatalogCategory,
  listBrands,
  listCategories,
  listCatalogAttributes,
  listCatalogProducts,
  listProductVariants,
  type CatalogVariantRow,
  listCatalogProductAttributes,
  replaceCatalogProductAttributes,
  updateCatalogProduct,
  updateCatalogProductStatus,
  updateCatalogVariant,
  updateCatalogVariantStatus,
  updateCatalogBrand,
  updateCatalogCategory,
  type CatalogBrand,
  type CatalogCategory,
  type CatalogProductAttribute,
  type CatalogVariant,
  type CreateCatalogBrandInput,
  type CreateCatalogCategoryInput,
  type CreateCatalogProductInput
} from "@/api/catalog/products"
import { listSkuMappings } from "@/api/integration"
import { queryClient } from "@/api/tanstack-query"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

const normalizeWeight = (weight: string) => {
  const trimmedWeight = weight.trim()
  return trimmedWeight.includes(".")
    ? trimmedWeight.replace(/0+$/, "").replace(/\.$/, "")
    : trimmedWeight
}

const normalizeAttributeName = (name: string) => name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase()

const catalogErrorMessage = (error: unknown): string | null => {
  if (typeof error !== "object" || error === null) return null
  const response = (error as { response?: unknown }).response
  if (typeof response !== "object" || response === null) return null
  const data = (response as { data?: unknown }).data
  if (typeof data !== "object" || data === null) return null
  const message = (data as { message?: unknown }).message
  if (typeof message === "string") return message
  return Array.isArray(message) ? message.filter((item): item is string => typeof item === "string").join(" ") || null : null
}

const VARIANT_PAGE_SIZE = 100

// The product list API carries no variant data, and its `q` only matches the product name. Variants are
// fetched page by page (limit max 100) so SKU/barcode search and the price work on any catalog size.
const fetchAllVariantRows = async (): Promise<CatalogVariantRow[]> => {
  const params = { limit: VARIANT_PAGE_SIZE, sort: "createdAt", order: "ASC" } as const
  const first = await listProductVariants({ ...params, page: 1 })
  const totalPages = first.pagination?.totalPages ?? 1
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => listProductVariants({ ...params, page: index + 2 }))
  )
  return [first, ...rest].flatMap((page) => page.data ?? [])
}

const fetchAllProducts = async () => {
  const first = await listCatalogProducts({ limit: VARIANT_PAGE_SIZE, page: 1 })
  const totalPages = Math.ceil((first.total ?? 0) / VARIANT_PAGE_SIZE)
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) =>
      listCatalogProducts({ limit: VARIANT_PAGE_SIZE, page: index + 2 })
    )
  )
  return [first, ...rest].flatMap((page) => page.items ?? [])
}

type ProductsBundle = {
  categories: CatalogCategory[]
  brands: CatalogBrand[]
  products: Product[]
}

export const fetchProductsBundle = async (): Promise<ProductsBundle> => {
  const [loadedCategories, loadedBrands, response, skuMappings, variantRows] = await Promise.all([
    listCategories().catch(() => [] as CatalogCategory[]),
    listBrands().catch(() => [] as CatalogBrand[]),
    fetchAllProducts(),
    queryClient.fetchQuery({ queryKey: ["integration-sku-mappings", ""], queryFn: () => listSkuMappings() }).catch(() => []),
    fetchAllVariantRows().catch(() => [] as CatalogVariantRow[])
  ])

  const variantsByProductId = new Map<string, CatalogVariantRow[]>()
  for (const variant of variantRows) {
    variantsByProductId.set(variant.productId, [...(variantsByProductId.get(variant.productId) ?? []), variant])
  }

  const categoryNames = new Map(loadedCategories.map((item) => [item.id, item.name]))
  const brandNames = new Map(loadedBrands.map((item) => [item.id, item.name]))

  const lazadaByProduct = new Map<string, number>()
  const shopeeByProduct = new Map<string, number>()
  for (const m of skuMappings) {
    if (!m.internalProductId) continue
    if (m.provider === "LAZADA") {
      lazadaByProduct.set(m.internalProductId, (lazadaByProduct.get(m.internalProductId) ?? 0) + 1)
    } else if (m.provider === "SHOPEE") {
      shopeeByProduct.set(m.internalProductId, (shopeeByProduct.get(m.internalProductId) ?? 0) + 1)
    }
  }

  const mappedProducts: Product[] = response.map((row) => {
    const variants = variantsByProductId.get(row.id) ?? []
    const defaultVariant = variants[0]
    return {
      id: row.id,
      name: row.name,
      sku: defaultVariant?.skuCode ?? "",
      skuCodes: variants.map((variant) => variant.skuCode),
      barcodes: variants.flatMap((variant) => (variant.barcode ? [variant.barcode] : [])),
      retailPrice: defaultVariant?.price,
      costPrice: defaultVariant?.avgCostPrice ?? undefined,
      category: row.categoryId ? categoryNames.get(row.categoryId) ?? "Chưa phân loại" : "Chưa phân loại",
      categoryId: row.categoryId ?? undefined,
      brand: row.brandId ? brandNames.get(row.brandId) : undefined,
      brandId: row.brandId ?? undefined,
      description: row.description ?? undefined,
      version: row.version,
      isCombo: Boolean(row.isCombo),
      catalogStatus: row.status,
      unit: row.baseUnit,
      images: row.images,
      imageUrls: row.images.map((image) => image.url),
      variantCount: variants.length,
      lazadaSkuCount: lazadaByProduct.get(row.id) ?? 0,
      shopeeSkuCount: shopeeByProduct.get(row.id) ?? 0,
      stock: 0,
      price: "—",
      state: row.status === "ACTIVE" ? "Đang bán" : row.status === "DRAFT" ? "Lưu nháp" : row.status === "INACTIVE" ? "Ngừng kinh doanh" : "Đã lưu trữ"
    }
  })

  return {
    categories: loadedCategories,
    brands: loadedBrands,
    products: mappedProducts
  }
}

export function ProductsPage({
  requestedTab
}: {
  requestedTab?: string | null
} = {}) {
  void requestedTab
  const isDemo = useStoreAuth((s) => Boolean(s.tokens?.isDemo))
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const cachedBundle = queryClient.getQueryData<ProductsBundle>(["catalog-products-bundle"])
  const [showCreate, setShowCreate] = useState(false)
  const [showCatalogManagement, setShowCatalogManagement] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [variantProduct, setVariantProduct] = useState<Product | null>(null)
  const [variantsByProduct, setVariantsByProduct] = useState<Record<string, CatalogVariant[] | null>>({})
  const [products, setProducts] = useState<Product[]>(
    cachedBundle?.products ?? (isDemo ? demoDefaultProducts : [])
  )
  const [categories, setCategories] = useState<CatalogCategory[]>(cachedBundle?.categories ?? [])
  const [brands, setBrands] = useState<CatalogBrand[]>(cachedBundle?.brands ?? [])
  const [attributes, setAttributes] = useState<CatalogProductAttribute[]>([])
  const [loading, setLoading] = useState(!cachedBundle && !isDemo)
  const [error, setError] = useState("")

  const loadProducts = async (forceRefresh = false) => {
    if (forceRefresh) {
      await queryClient.invalidateQueries({ queryKey: ["catalog-products-bundle"] })
    }
    const bundle = await queryClient.fetchQuery({
      queryKey: ["catalog-products-bundle"],
      queryFn: fetchProductsBundle
    })
    setCategories(bundle.categories)
    setBrands(bundle.brands)
    setProducts(bundle.products)
  }

  const handleUpdated = async (id: string, input: Parameters<typeof updateCatalogProduct>[1], status: Product["catalogStatus"]): Promise<void> => {
    const updated = await updateCatalogProduct(id, input)
    const result = status && status !== updated.status
      ? await updateCatalogProductStatus(id, status, updated.version)
      : updated
    await loadProducts(true)
    setEditingProduct(null)
    void result
  }

  useEffect(() => {
    if (isDemo) {
      setLoading(false)
      return
    }
    let active = true
    if (!cachedBundle) setLoading(true)
    loadProducts()
      .catch(() => {
        if (active) setError("Không thể tải dữ liệu sản phẩm.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [isDemo])

  const handleCreated = async (input: CreateCatalogProductInput) => {
    try {
      await createCatalogProduct(input)
      await loadProducts()
      setError("")
    } catch {
      throw new Error("Không thể tạo sản phẩm. Vui lòng kiểm tra quyền và dữ liệu nhập.")
    }
  }

  const handleVariantCreated = async (productId: string, input: Parameters<typeof createCatalogVariant>[1]) => {
    try {
      const created = await createCatalogVariant(productId, input)
      setVariantProduct(null)
      setVariantsByProduct((current) => ({
        ...current,
        [productId]: [...(current[productId] ?? []), created]
      }))
      setError("")
    } catch (error) {
      const message = catalogErrorMessage(error)
      if (message) throw new Error(message)
      throw new Error("Không thể tạo biến thể. Vui lòng kiểm tra SKU, mã vạch và dữ liệu nhập.")
    }

  }

  const handleVariantUpdated = async (variant: CatalogVariant, input: {
    name: string
    skuCode: string
    barcode: string
    basePrice: number
    weight: string
    imageUrl: string
    attributeValues: Record<string, string>
    status: CatalogVariant["status"]
  }) => {
    try {
      const updated = await updateCatalogVariant(variant.id, {
        name: input.name.trim(),
        skuCode: input.skuCode.trim(),
        barcode: input.barcode.trim() || null,
        basePrice: input.basePrice,
        weight: normalizeWeight(input.weight) || null,
        imageUrl: input.imageUrl.trim() || null,
        version: variant.version
      })
      const result = input.status === updated.status
        ? updated
        : await updateCatalogVariantStatus(updated.id, input.status, updated.version)
      setVariantsByProduct((current) => ({
        ...current,
        [variant.productId]: (current[variant.productId] ?? []).map((item) => item.id === result.id ? result : item)
      }))
    } catch (error) {
      throw new Error(catalogErrorMessage(error) ?? "Không thể cập nhật biến thể.")
    }
  }

  const handleVariantDeleted = async (variant: CatalogVariant) => {
    try {
      await deleteCatalogVariant(variant.id)
      setVariantsByProduct((current) => ({
        ...current,
        [variant.productId]: (current[variant.productId] ?? []).filter((item) => item.id !== variant.id)
      }))
    } catch (error) {
      throw new Error(catalogErrorMessage(error) ?? "Không thể xóa biến thể.")
    }
  }

  const handleProductDeleted = async (product: Product) => {
    if (!product.id) return
    try {
      await deleteCatalogProduct(product.id)
      setProducts((current) => current.filter((item) => item.id !== product.id))
      setEditingProduct((current) => current?.id === product.id ? null : current)
      setVariantsByProduct((current) => {
        const next = { ...current }
        delete next[product.id!]
        return next
      })
      setError("")
    } catch (error) {
      setError(catalogErrorMessage(error) ?? "Không thể xóa sản phẩm.")
    }
  }

  const handleOpenVariantForm = async (product: Product) => {
    if (!product.id) {
      setError("Không xác định được sản phẩm.")
      return
    }
    try {
      setAttributes(await listCatalogProductAttributes(product.id))
      setVariantProduct(product)
      setError("")
    } catch {
      setError("Không thể tải thuộc tính của sản phẩm.")
    }
  }

  useEffect(() => {
    const productIds = products.flatMap((product) => product.id ? [product.id] : [])
    const missingIds = productIds.filter((id) => !(id in variantsByProduct))
    if (missingIds.length === 0) return
    setVariantsByProduct((current) => Object.fromEntries([
      ...Object.entries(current),
      ...missingIds.map((id) => [id, null])
    ]))
    void Promise.all(missingIds.map(async (productId) => {
      try {
        const variants = await listCatalogProductVariants(productId)
        setVariantsByProduct((current) => ({ ...current, [productId]: variants }))
        setProducts((current) => current.map((product) => product.id === productId
          ? { ...product, variantCount: variants.length }
          : product))
      } catch (error) {
        setVariantsByProduct((current) => ({ ...current, [productId]: [] }))
        setError(catalogErrorMessage(error) ?? "Không thể tải danh sách biến thể của sản phẩm.")
      }
    }))
    // The map is intentionally read as a snapshot; adding it as a dependency would
    // restart this loader after every individual product response.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products])

  const handleCreateAttribute = async (productId: string, name: string) => {
    const normalizedName = normalizeAttributeName(name)
    const existingProductAttribute = attributes.find((item) => normalizeAttributeName(item.name) === normalizedName)
    if (existingProductAttribute) return existingProductAttribute

    const tenantAttributes = await listCatalogAttributes()
    const attribute = tenantAttributes.find((item) => normalizeAttributeName(item.name) === normalizedName)
      ?? await createCatalogAttribute({ name })
    const updatedAttributes = await replaceCatalogProductAttributes(productId, [
      ...attributes.map((item) => item.id),
      attribute.id
    ])
    setAttributes(updatedAttributes)
    const productAttribute = updatedAttributes.find((item) => item.id === attribute.id)
    if (!productAttribute) throw new Error("Không thể gắn thuộc tính vào sản phẩm.")
    return productAttribute
  }

  const handleCreateAttributeValue = async (attributeId: string, value: string) => {
    const created = await createCatalogAttributeValue(attributeId, { value })
    setAttributes((current) => current.map((attribute) => attribute.id === attributeId
      ? { ...attribute, values: [...attribute.values, { ...created, usedByVariants: 0 }].sort((a, b) => a.value.localeCompare(b.value)) }
      : attribute))
  }

  const handleCreateCategory = async (input: CreateCatalogCategoryInput) => {
    const category = await createCatalogCategory(input)
    setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))
    return category
  }

  const handleCreateBrand = async (input: CreateCatalogBrandInput) => {
    const brand = await createCatalogBrand(input)
    setBrands((current) => [...current, brand].sort((a, b) => a.name.localeCompare(b.name)))
    return brand
  }

  const handleUpdateCategory = async (id: string, name: string) => {
    const category = await updateCatalogCategory(id, { name })
    setCategories((current) => current.map((item) => item.id === id ? category : item))
    return category
  }

  const handleDeleteCategory = async (id: string) => {
    await deleteCatalogCategory(id)
    setCategories((current) => current.filter((item) => item.id !== id))
  }

  const handleUpdateBrand = async (id: string, input: { name: string; description?: string }) => {
    const brand = await updateCatalogBrand(id, input)
    setBrands((current) => current.map((item) => item.id === id ? brand : item))
    return brand
  }

  const handleDeleteBrand = async (id: string) => {
    await deleteCatalogBrand(id)
    setBrands((current) => current.filter((item) => item.id !== id))
  }

  const stats = useMemo(() => {
    const activeCount = products.filter((p) => p.state === "Đang bán").length
    const comboCount = products.filter((p) => Boolean(p.isCombo)).length
    const mappedCount = products.filter(
      (p) => (p.lazadaSkuCount ?? 0) > 0 || (p.shopeeSkuCount ?? 0) > 0
    ).length
    return { activeCount, comboCount, mappedCount }
  }, [products])

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <DashboardHeader
        section="products"
        onCreate={() => setShowCreate(true)}
      />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          label="Tổng sản phẩm danh mục"
          value={products.length}
          hint={`${stats.activeCount} sản phẩm đang mở bán`}
          icon={Package}
          tone="emerald"
          loading={loading}
          onClick={() => scrollToSection("product-catalog")}
        />
        <KpiStatCard
          label="Đã đồng bộ Sàn TMĐT"
          value={stats.mappedCount}
          hint="Sản phẩm đã liên kết SKU Lazada / Shopee"
          icon={Layers}
          tone="sky"
          loading={loading}
          onClick={() => scrollToSection("product-catalog")}
        />
        <KpiStatCard
          label="Bảng giá Đa kênh"
          value="POS · Sàn · Web"
          hint="Tách giá bán lẻ & giá bù chiết khấu sàn"
          icon={Tag}
          tone="amber"
          onClick={() => scrollToSection("product-price-lists")}
        />
        <KpiStatCard
          label="Gói sản phẩm Combo"
          value={isDemo ? 2 : stats.comboCount}
          hint="Bán theo bộ giúp tăng giá trị giỏ hàng"
          icon={Boxes}
          tone="indigo"
          loading={loading}
          onClick={() => scrollToSection("product-combos")}
        />
      </section>

      <section id="product-catalog" className="scroll-mt-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#163d36]">Danh mục sản phẩm</h2>
            <p className="mt-1 text-xs text-slate-500">Quản lý sản phẩm, biến thể, danh mục và thương hiệu.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCatalogManagement(true)}
            className="shadow-2xs rounded-xl border-slate-200 bg-white text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            Quản lý danh mục &amp; thương hiệu
          </Button>
        </div>

      {error && (
        <p
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

        <ProductsTable
          section="products"
          products={products}
          loading={loading}
          onEdit={setEditingProduct}
          renderVariants={(product) => (
            <ProductVariantList
              embedded
              product={product}
              variants={product.id ? variantsByProduct[product.id] ?? null : []}
              attributes={[]}
              onClose={() => undefined}
              onAddVariant={() => void handleOpenVariantForm(product)}
              onUpdateVariant={handleVariantUpdated}
              onDeleteVariant={handleVariantDeleted}
            />
          )}
          onDelete={handleProductDeleted}
        />
      </section>

      <section id="product-price-lists" className="mt-10 scroll-mt-6 border-t border-slate-200 pt-8">
        <h2 className="mb-1 text-lg font-bold text-[#163d36]">Bảng giá theo kênh bán</h2>
        <p className="mb-5 text-xs text-slate-500">Thiết lập giá bán cho POS, sàn thương mại điện tử và website.</p>
        <PriceListsPanel />
      </section>

      <section id="product-combos" className="mt-10 scroll-mt-6 border-t border-slate-200 pt-8">
        <h2 className="mb-1 text-lg font-bold text-[#163d36]">Sản phẩm Combo</h2>
        <p className="mb-5 text-xs text-slate-500">Tạo và quản lý các gói sản phẩm bán theo bộ.</p>
        <ProductCombosPanel
          products={products}
          categories={categories}
          brands={brands}
          onReloadProducts={() => loadProducts(true)}
        />
      </section>

      {showCreate && (
        <ProductCreateForm
          categories={categories}
          brands={brands}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {editingProduct && (
        <ProductEditForm
          product={editingProduct}
          categories={categories}
          brands={brands}
          onClose={() => setEditingProduct(null)}
          onUpdated={handleUpdated}
        />
      )}
      {variantProduct && (
        <ProductVariantCreateForm
          product={variantProduct}
          attributes={attributes}
          onCreateAttribute={handleCreateAttribute}
          onCreateAttributeValue={handleCreateAttributeValue}
          onClose={() => setVariantProduct(null)}
          onCreated={handleVariantCreated}
        />
      )}
      {showCatalogManagement && (
        <ProductCatalogManagement
          categories={categories}
          brands={brands}
          onClose={() => setShowCatalogManagement(false)}
          onCreateCategory={handleCreateCategory}
          onCreateBrand={handleCreateBrand}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onUpdateBrand={handleUpdateBrand}
          onDeleteBrand={handleDeleteBrand}
        />
      )}
    </main>
  )
}
