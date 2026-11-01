import { FileRoute } from "@tanstack/react-router"
import { ProductsPage } from "@/features/products/ProductsPage"

export const Route = new FileRoute('/products').createRoute({
  component: ProductsPage
})
