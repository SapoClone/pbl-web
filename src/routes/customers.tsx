import { FileRoute, useRouterState } from "@tanstack/react-router"
import { CustomersPage } from "@/features/customers/CustomersPage"

function CustomersRouteView() {
  const requestedTab = useRouterState({
    select: (state) => new URLSearchParams(state.location.searchStr).get("tab")
  })
  return <CustomersPage requestedTab={requestedTab} />
}

export const Route = new FileRoute("/customers").createRoute({
  component: CustomersRouteView
})
