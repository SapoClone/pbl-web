import { FileRoute, useRouterState } from "@tanstack/react-router"
import { PromotionsPage } from "@/features/promotions/PromotionsPage"

function PromotionsRouteView() {
  const requestedTab = useRouterState({
    select: (state) => new URLSearchParams(state.location.searchStr).get("tab")
  })
  return <PromotionsPage requestedTab={requestedTab} />
}

export const Route = new FileRoute("/promotions").createRoute({
  component: PromotionsRouteView
})
