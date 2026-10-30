import { FileRoute } from "@tanstack/react-router"
import { AdminApp } from "@/admin/AdminApp"
import { ADMIN_SCREENS, type AdminScreen } from "@/admin/types"

const validScreens = new Set<AdminScreen>(ADMIN_SCREENS)

export const Route = new FileRoute("/admin/$screen").createRoute({
  component: AdminScreen
})

function AdminScreen() {
  const { screen } = Route.useParams()
  const selected = validScreens.has(screen as AdminScreen)
    ? (screen as AdminScreen)
    : "dashboard"

  return <AdminApp screen={selected} />
}
