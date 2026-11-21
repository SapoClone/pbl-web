import { useEffect, useMemo, useRef, useState } from "react"
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
import { KpiStatCard, SegmentedTabs } from "@/components/ui/micro-ux"
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
import { listActiveVariants } from "@/api/catalog/variants"
import { listSkuMappings } from "@/api/integration"
import { queryClient } from "@/api/tanstack-query"
import { useStoreAuth } from "@/store/zustand/useStoreAuth"

type ProductsTab = "catalog" | "price-lists" | "combos"

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

type ProductsBundle = {
  categories: CatalogCategory[]
  brands: CatalogBrand[]
  products: Product[]
}

export const fetchProductsBundle = async (): Promise<ProductsBundle> => {
  const [loadedCategories, loadedBrands, response, activeVariants, skuMappings] = await Promise.all([
    listCategories().catch(() => [] as CatalogCategory[]),
    listBrands().catch(() => [] as CatalogBrand[]),
    listCatalogProducts({ limit: 100 }),
    queryClient.fetchQuery({ queryKey: ["catalog-variants"], queryFn: listActiveVariants }).catch(() => []),
    queryClient.fetchQuery({ queryKey: ["integration-sku-mappings", ""], queryFn: () => listSkuMappings() }).catch(() => [])
  ])

  const categoryNames = new Map(loadedCategories.map((item) => [item.id, item.name]))
  const brandNames = new Map(loadedBrands.map((item) => [item.id, item.name]))

  const variantsByProduct = new Map<string, typeof activeVariants>()
  for (const v of activeVariants) {
    const list = variantsByProduct.get(v.productId) ?? []
    list.push(v)
    variantsByProduct.set(v.productId, list)
  }

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

  const mappedProducts: Product[] = response.items.map((row) => {
    const pVariants = variantsByProduct.get(row.id) ?? []
    const primaryVariant = pVariants[0]
    const imageUrls = row.images.length > 0
      ? row.images.map((image) => image.url)
      : primaryVariant?.imageUrl
        ? [primaryVariant.imageUrl]
        : []
    const retailPrice = primaryVariant?.price
    return {
      id: row.id,
      name: row.name,
      sku: primaryVariant?.skuCode ?? "",
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
      imageUrls,
      variantCount: pVariants.length,
      lazadaSkuCount: lazadaByProduct.get(row.id) ?? 0,
      shopeeSkuCount: shopeeByProduct.get(row.id) ?? 0,
      retailPrice,
      stock: 0,
      price: retailPrice !== undefined ? `${retailPrice.toLocaleString("vi-VN")} ₫` : "—",
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
  const isDemo = useStoreAuth((s) => Boolean(s.tokens?.isDemo))
  const [tab, setTab] = useState<ProductsTab>(() => {
    const raw =
      requestedTab ??
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("tab")
        : null)
    return raw === "catalog" || raw === "price-lists" || raw === "combos"
      ? raw
      : "catalog"
  })
  useEffect(() => {
    if (
      requestedTab === "catalog" ||
      requestedTab === "price-lists" ||
      requestedTab === "combos"
    ) {
      setTab(requestedTab)
    }
  }, [requestedTab])

  const handleChangeTab = (next: ProductsTab) => {
    setTab(next)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", next)
    window.history.replaceState({}, "", url.toString())
  }

  const cachedBundle = queryClient.getQueryData<ProductsBundle>(["catalog-products-bundle"])
  const [showCreate, setShowCreate] = useState(false)
  const [showCatalogManagement, setShowCatalogManagement] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [variantProduct, setVariantProduct] = useState<Product | null>(null)
  const [viewingVariants, setViewingVariants] = useState<{ product: Product; variants: CatalogVariant[] | null } | null>(null)
  const variantListRequestId = useRef(0)
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
      setViewingVariants((current) => current && current.product.id === productId && current.variants
        ? { ...current, variants: [...current.variants, created] }
        : current)
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
      setViewingVariants((current) => current && current.product.id === variant.productId && current.variants
        ? { ...current, variants: current.variants.map((item) => item.id === result.id ? result : item) }
        : current)
    } catch (error) {
      throw new Error(catalogErrorMessage(error) ?? "Không thể cập nhật biến thể.")
    }
  }

  const handleVariantDeleted = async (variant: CatalogVariant) => {
    try {
      await deleteCatalogVariant(variant.id)
      setViewingVariants((current) => current && current.product.id === variant.productId && current.variants
        ? { ...current, variants: current.variants.filter((item) => item.id !== variant.id) }
        : current)
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
      setViewingVariants((current) => current?.product.id === product.id ? null : current)
      setError("")
    } catch (error) {
      setError(catalogErrorMessage(error) ?? "Không thể xóa sản phẩm.")
    }
  }

  const handleViewVariants = async (product: Product) => {
    if (!product.id) {
      setError("Không xác định được sản phẩm.")
      return
    }
    const requestId = ++variantListRequestId.current
    setViewingVariants({ product, variants: null })
    try {
      const [variants, productAttributes] = await Promise.all([
        listCatalogProductVariants(product.id),
        listCatalogProductAttributes(product.id)
      ])
      if (requestId !== variantListRequestId.current) return
      setAttributes(productAttributes)
      setViewingVariants({ product, variants })
      setError("")
    } catch (error) {
      if (requestId !== variantListRequestId.current) return
      setViewingVariants(null)
      setError(catalogErrorMessage(error) ?? "Không thể tải danh sách biến thể của sản phẩm.")
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
        onCreate={tab === "catalog" ? () => setShowCreate(true) : undefined}
      />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiStatCard
          label="Tổng sản phẩm danh mục"
          value={products.length}
          hint={`${stats.activeCount} sản phẩm đang mở bán`}
          icon={Package}
          tone="emerald"
          onClick={() => handleChangeTab("catalog")}
        />
        <KpiStatCard
          label="Đã đồng bộ Sàn TMĐT"
          value={stats.mappedCount}
          hint="Sản phẩm đã liên kết SKU Lazada / Shopee"
          icon={Layers}
          tone="sky"
          onClick={() => handleChangeTab("catalog")}
        />
        <KpiStatCard
          label="Bảng giá Đa kênh"
          value="POS · Sàn · Web"
          hint="Tách giá bán lẻ & giá bù chiết khấu sàn"
          icon={Tag}
          tone="amber"
          onClick={() => handleChangeTab("price-lists")}
        />
        <KpiStatCard
          label="Gói sản phẩm Combo"
          value={isDemo ? 2 : stats.comboCount}
          hint="Bán theo bộ giúp tăng giá trị giỏ hàng"
          icon={Boxes}
          tone="indigo"
          onClick={() => handleChangeTab("combos")}
        />
      </section>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs<ProductsTab>
          value={tab}
          onChange={handleChangeTab}
          ariaLabel="Phân mục quản lý Sản phẩm"
          tabs={[
            {
              value: "catalog",
              label: "Danh mục Sản phẩm",
              icon: Package,
              badge: products.length
            },
            {
              value: "price-lists",
              label: "Bảng giá theo Kênh bán",
              icon: Tag
            },
            {
              value: "combos",
              label: "Sản phẩm Combo (Bundle)",
              icon: Boxes,
              badge: isDemo ? 2 : stats.comboCount
            }
          ]}
        />

        {tab === "catalog" && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowCatalogManagement(true)}
            className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            Quản lý danh mục &amp; thương hiệu
          </Button>
        )}
      </div>

      {error && tab === "catalog" && (
        <p
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {tab === "catalog" && (
        <ProductsTable
          section="products"
          products={products}
          loading={loading}
          onEdit={setEditingProduct}
          onViewVariants={(product) => void handleViewVariants(product)}
          onDelete={handleProductDeleted}
        />
      )}

      {tab === "price-lists" && <PriceListsPanel />}

      {tab === "combos" && (
        <ProductCombosPanel
          products={products}
          categories={categories}
          brands={brands}
          onReloadProducts={() => loadProducts(true)}
        />
      )}

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
      {viewingVariants && (
        <ProductVariantList
          product={viewingVariants.product}
          variants={viewingVariants.variants}
          attributes={attributes}
          onAddVariant={() => void handleOpenVariantForm(viewingVariants.product)}
          onUpdateVariant={handleVariantUpdated}
          onDeleteVariant={handleVariantDeleted}
          onClose={() => {
            variantListRequestId.current += 1
            setViewingVariants(null)
          }}
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
