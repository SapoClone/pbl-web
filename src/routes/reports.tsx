import { FileRoute, useRouterState } from "@tanstack/react-router"
import { ReportsPage } from "@/features/reports/ReportsPage"

function ReportsRouteView() {
  const requestedTab = useRouterState({
    select: (state) => new URLSearchParams(state.location.searchStr).get("tab")
  })
  return <ReportsPage requestedTab={requestedTab} />
}

export const Route = new FileRoute("/reports").createRoute({
  component: ReportsRouteView
})
