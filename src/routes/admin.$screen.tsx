import { FileRoute, redirect } from "@tanstack/react-router"
import { AdminApp, type AdminScreenName } from "@/admin/AdminApp"
import { requireAuthentication } from "./auth-guards"

const validScreens = new Set<AdminScreenName>([
  "businesses", "business-detail", "business-new", "business-edit", "business-lock",
  "users", "user-detail", "plans", "plan-config", "subscriptions", "subscription-detail",
  "change-plan", "limits", "monitoring", "integrations", "jobs", "job-detail", "audit",
  "notifications", "notification-new", "notification-detail", "support", "settings"
])

export const Route = new FileRoute("/admin/$screen").createRoute({
  beforeLoad: () => {
    requireAuthentication()
  },
  component: AdminScreen
})

function AdminScreen() {
  const { screen } = Route.useParams()
  if (!validScreens.has(screen as AdminScreenName)) {
    throw redirect({ to: "/" })
  }

  return <AdminApp screen={screen as AdminScreenName} />
}
