import { FileRoute } from "@tanstack/react-router"
import { AdminApp, type AdminScreenName } from "@/admin/AdminApp"

const validScreens = new Set<AdminScreenName>([
  "businesses", "business-detail", "business-new", "business-edit", "business-lock",
  "users", "user-detail", "plans", "plan-config", "subscriptions", "subscription-detail",
  "change-plan", "limits", "monitoring", "integrations", "jobs", "job-detail", "audit",
  "notifications", "notification-new", "support", "settings"
])

export const Route = new FileRoute("/admin/$screen").createRoute({
  component: AdminScreen
})

function AdminScreen() {
  const { screen } = Route.useParams()
  const selected = validScreens.has(screen as AdminScreenName)
    ? (screen as AdminScreenName)
    : "dashboard"

  return <AdminApp screen={selected} />
}
