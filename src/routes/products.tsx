import { FileRoute, useRouterState } from "@tanstack/react-router"
import { ProductsPage } from "@/features/products/ProductsPage"

function ProductsRouteView() {
  const requestedTab = useRouterState({
    select: (state) => new URLSearchParams(state.location.searchStr).get("tab")
  })
  return <ProductsPage requestedTab={requestedTab} />
}

export const Route = new FileRoute("/products").createRoute({
  component: ProductsRouteView
})
