import { DashboardHeader } from "@/shared/dashboard/DashboardHeader"
import { ProductsTable } from "./ProductsTable"
import { ProductCreateForm } from "./ProductCreateForm"
import { useState } from "react"
import { products as initialProducts } from "@/shared/dashboard/dashboard.mock"
import type { Product } from "@/shared/dashboard/dashboard.types"

export function ProductsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const closeForm = () => {
    setShowCreate(false)
    setEditingProduct(null)
  }
  const handleCreated = (product: Product) => {
    setProducts((current) => editingProduct
      ? current.map((item) => item.sku === editingProduct.sku ? product : item)
      : [product, ...current])
    closeForm()
  }

  return <main className="mx-auto max-w-[1520px] py-7"><DashboardHeader section="products" onCreate={() => { setEditingProduct(null); setShowCreate(true) }} /><ProductsTable section="products" products={products} onEdit={(product) => { setEditingProduct(product); setShowCreate(true) }} />{showCreate && <ProductCreateForm product={editingProduct ?? undefined} onClose={closeForm} onCreated={handleCreated} />}</main>
}
