import { useEffect, useRef, useState } from "react"
import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"
import { ProductsTable } from "./ProductsTable"
import { ProductCreateForm } from "./ProductCreateForm"
import { ProductCatalogManagement } from "./ProductCatalogManagement"
import { ProductEditForm } from "./ProductEditForm"
import { ProductVariantCreateForm } from "./ProductVariantCreateForm"
import { ProductVariantList } from "./ProductVariantList"
import { Button } from "@/components/ui/button"
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

export function ProductsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [showCatalogManagement, setShowCatalogManagement] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [variantProduct, setVariantProduct] = useState<Product | null>(null)
  const [viewingVariants, setViewingVariants] = useState<{ product: Product; variants: CatalogVariant[] | null } | null>(null)
  const variantListRequestId = useRef(0)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<CatalogCategory[]>([])
  const [brands, setBrands] = useState<CatalogBrand[]>([])
  const [attributes, setAttributes] = useState<CatalogProductAttribute[]>([])
  const [error, setError] = useState("")

  const loadProducts = async (loadedCategories = categories, loadedBrands = brands) => {
    const response = await listCatalogProducts({ limit: 100 })
    const categoryNames = new Map(loadedCategories.map((item) => [item.id, item.name]))
    const brandNames = new Map(loadedBrands.map((item) => [item.id, item.name]))
    setProducts(response.items.map((row) => ({
      id: row.id,
      name: row.name,
      sku: "",
      category: row.categoryId ? categoryNames.get(row.categoryId) ?? "Chưa phân loại" : "Chưa phân loại",
      categoryId: row.categoryId ?? undefined,
      brand: row.brandId ? brandNames.get(row.brandId) : undefined,
      brandId: row.brandId ?? undefined,
      description: row.description ?? undefined,
      version: row.version,
      catalogStatus: row.status,
      unit: row.baseUnit,
      imageUrls: row.images.map((image) => image.url),
      stock: 0,
      price: "—",
      state: row.status === "ACTIVE" ? "Đang bán" : row.status === "DRAFT" ? "Lưu nháp" : row.status === "INACTIVE" ? "Ngừng kinh doanh" : "Đã lưu trữ"
    })))
  }

  const handleUpdated = async (id: string, input: Parameters<typeof updateCatalogProduct>[1], status: Product["catalogStatus"]): Promise<void> => {
    const updated = await updateCatalogProduct(id, input)
    const result = status && status !== updated.status
      ? await updateCatalogProductStatus(id, status, updated.version)
      : updated
    await loadProducts()
    setEditingProduct(null)
    void result
  }

  useEffect(() => {
    Promise.all([listCategories(), listBrands()])
      .then(async ([loadedCategories, loadedBrands]) => {
        setCategories(loadedCategories)
        setBrands(loadedBrands)
        await loadProducts(loadedCategories, loadedBrands)
      })
      .catch(() => setError("Không thể tải dữ liệu sản phẩm."))
  }, [])

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
    status: CatalogVariant["status"]
  }) => {
    try {
      const updated = await updateCatalogVariant(variant.id, {
        name: input.name.trim(),
        skuCode: input.skuCode.trim(),
        barcode: input.barcode.trim() || null,
        basePrice: input.basePrice,
        weight: normalizeWeight(input.weight) || null,
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
      const variants = await listCatalogProductVariants(product.id)
      if (requestId !== variantListRequestId.current) return
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

  return (
    <main className="mx-auto max-w-[1520px] py-7">
      <DashboardHeader section="products" onCreate={() => setShowCreate(true)} />
      <div className="mb-5 flex justify-end">
        <Button type="button" variant="outline" onClick={() => setShowCatalogManagement(true)}>Quản lý danh mục & thương hiệu</Button>
      </div>
      {error && <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <ProductsTable section="products" products={products} onEdit={setEditingProduct} onViewVariants={(product) => void handleViewVariants(product)} onDelete={handleProductDeleted} />
      {showCreate && <ProductCreateForm categories={categories} brands={brands} onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {editingProduct && <ProductEditForm product={editingProduct} categories={categories} brands={brands} onClose={() => setEditingProduct(null)} onUpdated={handleUpdated} />}
      {viewingVariants && <ProductVariantList product={viewingVariants.product} variants={viewingVariants.variants} onAddVariant={() => void handleOpenVariantForm(viewingVariants.product)} onUpdateVariant={handleVariantUpdated} onDeleteVariant={handleVariantDeleted} onClose={() => { variantListRequestId.current += 1; setViewingVariants(null) }} />}
      {variantProduct && <ProductVariantCreateForm product={variantProduct} attributes={attributes} onCreateAttribute={handleCreateAttribute} onCreateAttributeValue={handleCreateAttributeValue} onClose={() => setVariantProduct(null)} onCreated={handleVariantCreated} />}
      {showCatalogManagement && <ProductCatalogManagement categories={categories} brands={brands} onClose={() => setShowCatalogManagement(false)} onCreateCategory={handleCreateCategory} onCreateBrand={handleCreateBrand} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onUpdateBrand={handleUpdateBrand} onDeleteBrand={handleDeleteBrand} />}
    </main>
  )
}
